import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI, Type } from "@google/genai";
import dotenv from "dotenv";

dotenv.config();

const app = express();
const PORT = 3000;

// Increase JSON payload limit for base64 images and audio
app.use(express.json({ limit: "25mb" }));
app.use(express.urlencoded({ extended: true, limit: "25mb" }));

// Server-side Gemini API client
let aiClient: GoogleGenAI | null = null;

function getAiClient(): GoogleGenAI {
  if (!aiClient) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      console.warn("GEMINI_API_KEY is not set. Mock/Demo fallback will be available.");
    }
    aiClient = new GoogleGenAI({
      apiKey: apiKey || "dummy-key",
      httpOptions: {
        headers: {
          "User-Agent": "aistudio-build",
        },
      },
    });
  }
  return aiClient;
}

// Health check endpoint
app.get("/api/health", (_req, res) => {
  res.json({
    status: "ok",
    timestamp: new Date().toISOString(),
    aiConfigured: !!process.env.GEMINI_API_KEY,
  });
});

// Main AI Analysis Endpoint
app.post("/api/analyze", async (req, res) => {
  try {
    const {
      text,
      type,
      imageBase64,
      imageMimeType,
      audioBase64,
      audioMimeType,
      linkUrl,
      initialInput,
      existingEvidence,
      previousQuestionsAndAnswers,
      newAnswers,
      extraNote,
      so_luot_da_hoi = 0,
    } = req.body;

    const effectiveText = text || (initialInput && initialInput.text) || "";
    const effectiveLink = linkUrl || (initialInput && initialInput.linkUrl) || "";
    const effectiveType = type || (initialInput && initialInput.type) || "text";

    if (!effectiveText && !imageBase64 && !audioBase64 && !effectiveLink && (!newAnswers || newAnswers.length === 0)) {
      return res.status(400).json({ error: "Vui lòng cung cấp nội dung, hình ảnh, liên kết hoặc câu trả lời cần phân tích." });
    }

    const ai = getAiClient();
    const isApiKeyMissing = !process.env.GEMINI_API_KEY || process.env.GEMINI_API_KEY === "MY_GEMINI_API_KEY";

    // If API key is not yet set or in offline preview, provide structured rule-based analysis
    if (isApiKeyMissing) {
      console.log("No valid GEMINI_API_KEY found, running fallback expert engine.");
      const fallbackResult = generateFallbackAnalysis({
        text: effectiveText,
        linkUrl: effectiveLink,
        type: effectiveType,
        existingEvidence: existingEvidence || [],
        previousQuestionsAndAnswers: previousQuestionsAndAnswers || [],
        newAnswers: newAnswers || [],
        extraNote: extraNote || "",
        so_luot_da_hoi: Number(so_luot_da_hoi) || 0,
      });
      return res.json(fallbackResult);
    }

    const currentTurn = Number(so_luot_da_hoi) || 0;

    const systemInstruction = `
Bạn là chuyên gia phân tích rủi ro an toàn số "Bẫy Hay Thật ?" tại Việt Nam.

NGUYÊN TẮC BẮT BUỘC: CHỈ KẾT LUẬN DỰA TRÊN BẰNG CHỨNG NGƯỜI DÙNG ĐÃ CUNG CẤP.

1. KHÔNG ĐƯỢC TỰ THÊM TÌNH TIẾT KHÔNG CÓ TRONG NỘI DUNG ĐẦU VÀO:
   - Nếu người dùng KHÔNG đề cập đến chuyển tiền, nộp tiền, mã OTP, mật khẩu, tài khoản ngân hàng, đường liên kết, cài ứng dụng, đe dọa hoặc yêu cầu giữ bí mật, thì TUYỆT ĐỐI KHÔNG ĐƯỢC viết rằng những hành vi đó đã xảy ra.
   - Tuyệt đối không bịa ra "tài khoản tạm giữ", "đòi tiền", "bắt nộp phạt" nếu người dùng chưa nói rõ.

2. PHÂN BIỆT RÕ BA LOẠI THÔNG TIN:
   - "Đã xảy ra": Được người dùng nói rõ trong tình huống ban đầu hoặc trong câu trả lời bổ sung (ghi vào 'bang_chung_da_co' với nguồn tương ứng).
   - "Chưa rõ, cần hỏi thêm": Thông tin quan trọng còn thiếu (ghi vào 'thong_tin_con_thieu').
   - "Cảnh báo phòng ngừa": Hành vi có thể xuất hiện về sau (ghi vào 'canh_bao_phong_ngua' dưới dạng giả định "Nếu đối phương yêu cầu..."). KHÔNG ĐƯỢC trình bày cảnh báo phòng ngừa như một bằng chứng đã xảy ra.

3. MỖI DẤU HIỆU BẤT THƯỜNG PHẢI KÈM BẰNG CHỨNG:
   - Mỗi mục trong 'bang_chung_da_co' phải có trích dẫn hoặc diễn giải sát từ lời kể hoặc câu trả lời mới của người dùng. Nếu không tìm được bằng chứng, KHÔNG ĐƯỢC hiển thị.

4. QUY TẮC CÂU TRẢ LỜI MỚI & SUY LUẬN:
   - Câu trả lời "Tôi không nhớ" PHẢI được xem là "Chưa có dữ kiện", TUYỆT ĐỐI KHÔNG ĐƯỢC coi là "Có".
   - CHỈ chuyển sang mức "Rủi ro cao" khi câu trả lời mới cung cấp bằng chứng nguy hiểm rõ ràng (như: đối phương yêu cầu chuyển tiền, đòi mã OTP, gửi link lạ, bắt tải app .apk, đe dọa bắt giữ khẩn cấp, bắt giữ bí mật với người thân).
   - Nếu câu trả lời mới xác nhận thông tin an toàn (ví dụ: đã nhận giấy mời văn bản có dấu đỏ tại công an phường, không có yêu cầu tiền bạc), hãy giữ mức "Cần xác minh" hoặc hạ xuống "Chưa thấy dấu hiệu rõ ràng".
   - Luôn giải thích rõ trong 'ly_do_thay_doi_muc_rui_ro' vì sao đánh giá rủi ro thay đổi hoặc giữ nguyên.

5. QUY TẮC KHÔNG HỎI VÔ HẠN (TỐI ĐA 2 LƯỢT):
   - Số lượt đã hỏi hiện tại: ${currentTurn}.
   - Mỗi lượt chỉ hỏi tối đa 3 câu trong 'cau_hoi_bo_sung'.
   - KHÔNG hỏi lại câu đã được người dùng trả lời.
   - KHÔNG hỏi lại cùng một ý bằng cách diễn đạt khác.
   - NẾU SỐ LƯỢT ĐÃ HỎI >= 2 (hoặc sau lượt này là lượt thứ 2 mà vẫn chưa có bằng chứng nguy hiểm):
     + BẮT BUỘC đặt 'co_can_hoi_them': false
     + Đặt 'cau_hoi_bo_sung': []
     + Đưa ra kết luận: "Chưa đủ thông tin để xác định mức rủi ro. Bạn nên xác minh qua một kênh độc lập."
     + Luôn cung cấp hướng xử lý an toàn và danh sách việc cần làm.
   - NẾU mức rủi ro là "Rủi ro cao" hoặc "Chưa thấy dấu hiệu rõ ràng":
     + Đặt 'co_can_hoi_them': false
     + Đặt 'cau_hoi_bo_sung': []

6. TIÊU CHÍ XẾP MỨC ĐỘ RỦI RO (chỉ dùng: 'Rủi ro cao', 'Cần xác minh', 'Chưa thấy dấu hiệu rõ ràng', hoặc 'Chưa rõ'):
   - "Rủi ro cao": Khi có ít nhất một bằng chứng nguy hiểm đã xảy ra.
   - "Cần xác minh": Khi có bất thường (như gọi điện thoại từ xa xưng công an) nhưng chưa có yêu cầu tiền bạc/dữ liệu nhạy cảm.
   - "Chưa thấy dấu hiệu rõ ràng": Khi đối phương làm việc đúng quy chuẩn pháp luật, không có dấu hiệu bất thường.
   - "Chưa rõ": Khi thông tin quá ít hoặc chưa thể kiểm chứng sau 2 lượt hỏi.
`;

    const contentsParts: any[] = [];

    // Add image if present
    if (imageBase64 && imageMimeType) {
      const cleanBase64 = imageBase64.replace(/^data:[^;]+;base64,/, "");
      contentsParts.push({
        inlineData: {
          mimeType: imageMimeType,
          data: cleanBase64,
        },
      });
    }

    // Add audio if present
    if (audioBase64 && audioMimeType) {
      const cleanAudioBase64 = audioBase64.replace(/^data:[^;]+;base64,/, "");
      contentsParts.push({
        inlineData: {
          mimeType: audioMimeType,
          data: cleanAudioBase64,
        },
      });
    }

    // Build comprehensive context
    let promptContext = `HÃY PHÂN TÍCH TÌNH HUỐNG DƯỚI ĐÂY (Lượt hỏi bổ sung số: ${currentTurn}/2):\n\n`;
    promptContext += `--- 1. TÌNH HUỐNG BAN ĐẦU ---\n`;
    if (effectiveType) promptContext += `- Phương thức gửi: ${effectiveType}\n`;
    if (effectiveLink) promptContext += `- Đường link: ${effectiveLink}\n`;
    if (effectiveText) promptContext += `- Nội dung/Lời kể: ${effectiveText}\n`;

    if (previousQuestionsAndAnswers && previousQuestionsAndAnswers.length > 0) {
      promptContext += `\n--- 2. LỊCH SỬ CÂU HỎI VÀ TRẢ LỜI CÁC LƯỢT TRƯỚC ---\n`;
      previousQuestionsAndAnswers.forEach((item: any, idx: number) => {
        promptContext += `${idx + 1}. [Lượt ${item.round || 1}] Hỏi: "${item.question}" -> Trả lời: "${item.answer}"\n`;
      });
    }

    if (newAnswers && newAnswers.length > 0) {
      promptContext += `\n--- 3. CÂU TRẢ LỜI MỚI CỦA NGƯỜI DÙNG TRONG LƯỢT NÀY ---\n`;
      newAnswers.forEach((ans: any, idx: number) => {
        promptContext += `${idx + 1}. Câu hỏi: "${ans.question}"\n   => Người dùng chọn/trả lời: "${ans.answer}"\n`;
      });
    }

    if (extraNote) {
      promptContext += `\n--- 4. THÔNG TIN BỔ SUNG KHÁC DO NGƯỜI DÙNG TỰ ĐIỀN ---\n"${extraNote}"\n`;
    }

    promptContext += `\nHãy phân tích lại toàn bộ tình huống trên theo đúng các nguyên tắc và xuất ra định dạng JSON tuân thủ schema.`;

    contentsParts.push({ text: promptContext });

    const response = await ai.models.generateContent({
      model: "gemini-3.7-flash",
      contents: { parts: contentsParts },
      config: {
        systemInstruction,
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            muc_rui_ro: {
              type: Type.STRING,
              description: "Một trong các mức: 'Rủi ro cao', 'Cần xác minh', 'Chưa thấy dấu hiệu rõ ràng', 'Chưa rõ'",
            },
            ket_luan_ngan: {
              type: Type.STRING,
              description: "1 câu kết luận ngắn gọn, trung thực theo đúng bằng chứng",
            },
            bang_chung_da_co: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  noi_dung: { type: Type.STRING, description: "Nội dung bằng chứng được ghi nhận" },
                  nguon: { type: Type.STRING, description: "'tinh_huong_ban_dau' hoặc 'cau_tra_loi_bo_sung'" },
                  y_nghia: { type: Type.STRING, description: "Ý nghĩa tác động của bằng chứng này" },
                },
                required: ["noi_dung", "nguon", "y_nghia"],
              },
              description: "Danh sách bằng chứng thực tế đã phát hiện",
            },
            thong_tin_con_thieu: {
              type: Type.ARRAY,
              items: { type: Type.STRING },
              description: "Các thông tin quan trọng còn thiếu hoặc chưa rõ",
            },
            cau_hoi_bo_sung: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  id: { type: Type.STRING, description: "ID câu hỏi (q1, q2, q3)" },
                  cau_hoi: { type: Type.STRING, description: "Nội dung câu hỏi cụ thể, dễ hiểu" },
                  loai_tra_loi: { type: Type.STRING, description: "'co_khong' hoặc 'van_ban'" },
                  cac_lua_chon: {
                    type: Type.ARRAY,
                    items: { type: Type.STRING },
                    description: "['Có', 'Không', 'Tôi không nhớ'] nếu là co_khong",
                  },
                },
                required: ["id", "cau_hoi", "loai_tra_loi"],
              },
              description: "Tối đa 3 câu hỏi bổ sung nếu co_can_hoi_them = true. Rỗng nếu false.",
            },
            ly_do_thay_doi_muc_rui_ro: {
              type: Type.STRING,
              description: "Giải thích dữ kiện mới nào làm thay đổi hoặc giữ nguyên đánh giá rủi ro",
            },
            hanh_dong_an_toan: {
              type: Type.ARRAY,
              items: { type: Type.STRING },
              description: "Danh sách các hành động an toàn cần thực hiện",
            },
            co_can_hoi_them: {
              type: Type.BOOLEAN,
              description: "true nếu cần hỏi thêm và số lượt < 2; false nếu đã đủ hoặc đã đạt 2 lượt",
            },
            so_luot_da_hoi: {
              type: Type.INTEGER,
              description: "Số lượt đã hỏi tính đến hiện tại",
            },
            cac_dau_hieu: {
              type: Type.ARRAY,
              items: { type: Type.STRING },
              description: "Danh sách các dấu hiệu bất thường ghi nhận được",
            },
            bang_chung: {
              type: Type.ARRAY,
              items: { type: Type.STRING },
              description: "Trích dẫn bằng chứng tương ứng",
            },
            thong_tin_chua_ro_can_hoi: {
              type: Type.ARRAY,
              items: { type: Type.STRING },
              description: "Câu hỏi dạng chuỗi văn bản nếu cần hiển thị",
            },
            giai_thich: {
              type: Type.STRING,
              description: "Giải thích chi tiết",
            },
            canh_bao_phong_ngua: {
              type: Type.STRING,
              description: "Cảnh báo phòng ngừa dưới dạng giả định (Nếu đối phương yêu cầu...)",
            },
            viec_can_lam_ngay: {
              type: Type.ARRAY,
              items: { type: Type.STRING },
              description: "Việc cần làm ngay",
            },
            viec_khong_nen_lam: {
              type: Type.ARRAY,
              items: { type: Type.STRING },
              description: "Việc không nên làm",
            },
            thong_tin_can_xac_minh: {
              type: Type.ARRAY,
              items: { type: Type.STRING },
              description: "Các kênh kiểm chứng",
            },
            tin_nhan_tu_choi_goi_y: {
              type: Type.STRING,
              description: "Mẫu câu phản hồi an toàn",
            },
            cau_hoi_xac_minh_goi_y: {
              type: Type.STRING,
              description: "Câu hỏi đối chứng",
            },
            noi_dung_gui_nguoi_than: {
              type: Type.STRING,
              description: "Nội dung gửi người thân",
            },
            canh_bao_an_toan: {
              type: Type.STRING,
              description: "Khuyến cáo an toàn quy chuẩn",
            },
          },
          required: [
            "muc_rui_ro",
            "ket_luan_ngan",
            "bang_chung_da_co",
            "thong_tin_con_thieu",
            "cau_hoi_bo_sung",
            "ly_do_thay_doi_muc_rui_ro",
            "hanh_dong_an_toan",
            "co_can_hoi_them",
            "so_luot_da_hoi",
          ],
        },
      },
    });

    const responseText = response.text;
    if (!responseText) {
      throw new Error("Không nhận được phản hồi từ mô hình AI.");
    }

    const parsed = JSON.parse(responseText);

    // Ensure backwards compatibility mappings
    if (!parsed.cac_dau_hieu || parsed.cac_dau_hieu.length === 0) {
      parsed.cac_dau_hieu = parsed.bang_chung_da_co?.map((b: any) => b.y_nghia || b.noi_dung) || [];
    }
    if (!parsed.bang_chung || parsed.bang_chung.length === 0) {
      parsed.bang_chung = parsed.bang_chung_da_co?.map((b: any) => b.noi_dung) || [];
    }
    if (!parsed.viec_can_lam_ngay || parsed.viec_can_lam_ngay.length === 0) {
      parsed.viec_can_lam_ngay = parsed.hanh_dong_an_toan || [
        "Kiểm tra lại qua kênh chính thức của cơ quan có thẩm quyền.",
        "Thông báo cho người thân trong gia đình.",
      ];
    }
    if (!parsed.viec_khong_nen_lam || parsed.viec_khong_nen_lam.length === 0) {
      parsed.viec_khong_nen_lam = [
        "Không chuyển tiền vào tài khoản cá nhân của người lạ.",
        "Không chia sẻ mã OTP hoặc mật khẩu cho bất kỳ ai.",
      ];
    }

    return res.json(parsed);
  } catch (error: any) {
    console.error("Error analyzing content:", error);
    // Return gracefully with an intelligent fallback if an API error occurs
    const fallback = generateFallbackAnalysis({
      text: req.body.text || (req.body.initialInput && req.body.initialInput.text) || "",
      linkUrl: req.body.linkUrl || (req.body.initialInput && req.body.initialInput.linkUrl) || "",
      type: req.body.type || (req.body.initialInput && req.body.initialInput.type) || "text",
      existingEvidence: req.body.existingEvidence || [],
      previousQuestionsAndAnswers: req.body.previousQuestionsAndAnswers || [],
      newAnswers: req.body.newAnswers || [],
      extraNote: req.body.extraNote || "",
      so_luot_da_hoi: Number(req.body.so_luot_da_hoi) || 0,
    });
    return res.json({
      ...fallback,
      warning: "Phân tích được tạo qua bộ lọc chuyên gia dự phòng do kết nối mạng hoặc định dạng dữ liệu.",
    });
  }
});

// Fallback intelligent heuristic analyzer for instant reliability & offline mode
function generateFallbackAnalysis(params: {
  text: string;
  linkUrl: string;
  type: string;
  existingEvidence?: Array<{ noi_dung: string; nguon: string; y_nghia: string }>;
  previousQuestionsAndAnswers?: Array<{ round: number; question: string; answer: string; extraNote?: string }>;
  newAnswers?: Array<{ questionId: string; question: string; answer: string }>;
  extraNote?: string;
  so_luot_da_hoi: number;
}) {
  const { text, linkUrl, type, newAnswers = [], extraNote = "", so_luot_da_hoi = 0 } = params;

  // Combine all user inputs for thorough scanning
  const answersText = newAnswers.map((a) => `${a.question}: ${a.answer}`).join(" ");
  const allText = `${text} ${linkUrl} ${answersText} ${extraNote}`.toLowerCase();

  // Check if any new answer explicitly answered "Có" to high-risk triggers
  let answeredYesToMoney = false;
  let answeredYesToOtp = false;
  let answeredYesToApp = false;
  let answeredYesToLink = false;
  let answeredYesToThreat = false;
  let answeredNoToAllDanger = true;

  newAnswers.forEach((ans) => {
    const qLower = ans.question.toLowerCase();
    const aLower = ans.answer.toLowerCase();

    if (aLower === "có" || aLower.includes("có,") || aLower.includes("có ")) {
      if (qLower.includes("chuyển tiền") || qLower.includes("nộp tiền") || qLower.includes("phí") || qLower.includes("tài khoản")) {
        answeredYesToMoney = true;
        answeredNoToAllDanger = false;
      }
      if (qLower.includes("otp") || qLower.includes("mật khẩu") || qLower.includes("mã xác thực")) {
        answeredYesToOtp = true;
        answeredNoToAllDanger = false;
      }
      if (qLower.includes("tải") || qLower.includes("app") || qLower.includes("ứng dụng") || qLower.includes("màn hình")) {
        answeredYesToApp = true;
        answeredNoToAllDanger = false;
      }
      if (qLower.includes("link") || qLower.includes("đường dẫn") || qLower.includes("liên kết")) {
        answeredYesToLink = true;
        answeredNoToAllDanger = false;
      }
      if (qLower.includes("đe dọa") || qLower.includes("bắt giam") || qLower.includes("bí mật")) {
        answeredYesToThreat = true;
        answeredNoToAllDanger = false;
      }
    } else if (aLower !== "không") {
      answeredNoToAllDanger = false;
    }
  });

  const hasMoneyDemand =
    answeredYesToMoney ||
    allText.includes("chuyển tiền") ||
    allText.includes("nộp tiền") ||
    allText.includes("tài khoản tạm giữ") ||
    allText.includes("chuyển khoản") ||
    allText.includes("nộp phạt") ||
    allText.includes("viện phí") ||
    allText.includes("phí lưu kho");

  const hasOtpOrPassword =
    answeredYesToOtp ||
    allText.includes("otp") ||
    allText.includes("mật khẩu") ||
    allText.includes("mã xác thực") ||
    allText.includes("số thẻ");

  const hasAppOrScreenShare =
    answeredYesToApp ||
    allText.includes("tải app") ||
    allText.includes("tải ứng dụng") ||
    allText.includes(".apk") ||
    allText.includes("cài đặt") ||
    allText.includes("chia sẻ màn hình") ||
    allText.includes("anydesk") ||
    allText.includes("teamviewer");

  const hasSuspiciousLink =
    answeredYesToLink ||
    Boolean(linkUrl) ||
    allText.includes("http://") ||
    allText.includes("https://") ||
    allText.includes(".xyz") ||
    allText.includes(".top") ||
    allText.includes("bấm vào link") ||
    allText.includes("nhấp vào liên kết");

  const hasIsolationOrThreat =
    answeredYesToThreat ||
    allText.includes("giữ bí mật") ||
    allText.includes("không được kể") ||
    allText.includes("không nói cho ai") ||
    allText.includes("một mình");

  const hasPoliceMention =
    allText.includes("công an") ||
    allText.includes("viện kiểm sát") ||
    allText.includes("vụ án") ||
    allText.includes("điều tra") ||
    allText.includes("trụ sở") ||
    allText.includes("triệu tập");

  // CASE 1: High risk with explicit dangerous signs
  if (hasMoneyDemand || hasOtpOrPassword || hasAppOrScreenShare || hasSuspiciousLink || hasIsolationOrThreat) {
    const evidenceList: Array<{ noi_dung: string; nguon: "tinh_huong_ban_dau" | "cau_tra_loi_bo_sung"; y_nghia: string }> = [];

    if (hasMoneyDemand) {
      evidenceList.push({
        noi_dung: answeredYesToMoney ? "Người dùng xác nhận đối phương có yêu cầu chuyển/nộp tiền." : "Có đề cập đến việc chuyển tiền hoặc nộp tiền.",
        nguon: answeredYesToMoney ? "cau_tra_loi_bo_sung" : "tinh_huong_ban_dau",
        y_nghia: "Dấu hiệu lừa đảo chiếm đoạt tài sản rõ ràng.",
      });
    }
    if (hasOtpOrPassword) {
      evidenceList.push({
        noi_dung: answeredYesToOtp ? "Người dùng xác nhận bị hỏi mã OTP/mật khẩu." : "Có yêu cầu mã xác thực OTP hoặc mật khẩu.",
        nguon: answeredYesToOtp ? "cau_tra_loi_bo_sung" : "tinh_huong_ban_dau",
        y_nghia: "Dấu hiệu đánh cắp tài khoản ngân hàng.",
      });
    }
    if (hasAppOrScreenShare) {
      evidenceList.push({
        noi_dung: answeredYesToApp ? "Người dùng xác nhận bị yêu cầu tải ứng dụng/chia sẻ màn hình." : "Có yêu cầu cài ứng dụng từ xa.",
        nguon: answeredYesToApp ? "cau_tra_loi_bo_sung" : "tinh_huong_ban_dau",
        y_nghia: "Dấu hiệu cài mã độc để chiếm quyền kiểm soát thiết bị.",
      });
    }
    if (hasSuspiciousLink) {
      evidenceList.push({
        noi_dung: linkUrl ? `Đường liên kết cung cấp: ${linkUrl}` : "Có yêu cầu bấm vào đường link lạ.",
        nguon: "tinh_huong_ban_dau",
        y_nghia: "Nguy cơ dẫn tới trang web giả mạo hoặc lừa đảo.",
      });
    }

    return {
      muc_rui_ro: "Rủi ro cao" as const,
      ket_luan_ngan: "Phát hiện dấu hiệu rủi ro cao với các yêu cầu nguy hiểm đã được xác nhận.",
      bang_chung_da_co: evidenceList,
      thong_tin_con_thieu: [],
      cau_hoi_bo_sung: [],
      ly_do_thay_doi_muc_rui_ro: newAnswers.length > 0
        ? "Câu trả lời bổ sung của bạn đã xác nhận sự xuất hiện của các yêu cầu nguy hiểm (tiền bạc/OTP/app lạ), nâng mức đánh giá lên Rủi ro cao."
        : "Nội dung ban đầu đã chứa các yêu cầu nguy hiểm rõ ràng.",
      hanh_dong_an_toan: [
        "Dừng trao đổi với đối phương ngay lập tức.",
        "Tuyệt đối không chuyển tiền và không cung cấp mã OTP.",
        "Thông báo ngay cho người thân hoặc liên hệ Công an xã/phường nơi cư trú.",
      ],
      co_can_hoi_them: false,
      so_luot_da_hoi: so_luot_da_hoi,
      cac_dau_hieu: evidenceList.map((e) => e.y_nghia),
      bang_chung: evidenceList.map((e) => e.noi_dung),
      giai_thich: "Các dấu hiệu đòi tiền, đòi OTP hoặc cài app từ xa là phương thức tấn công trực diện của các đối tượng lừa đảo qua mạng nhằm chiếm đoạt tài sản.",
      canh_bao_phong_ngua: "Tuyệt đối không làm theo bất kỳ hướng dẫn nào tiếp theo của đối phương.",
      viec_can_lam_ngay: [
        "Dừng trao đổi với đối phương ngay lập tức.",
        "Nếu đã lỡ chuyển tiền hoặc cung cấp OTP: Khóa tài khoản ngân hàng ngay và gọi tổng đài 156.",
        "Thông báo cho người thân trong gia đình.",
      ],
      viec_khong_nen_lam: [
        "Không chuyển tiền vào bất kỳ tài khoản nào.",
        "Không cung cấp mã OTP hoặc mật khẩu.",
        "Không nhấp vào đường link hoặc tải ứng dụng lạ.",
      ],
      thong_tin_can_xac_minh: [
        "Xác minh qua cơ quan công an phường nơi cư trú.",
      ],
      tin_nhan_tu_choi_goi_y: "Tôi sẽ trực tiếp đến cơ quan chức năng có thẩm quyền tại địa phương để làm việc. Xin cảm ơn.",
      cau_hoi_xac_minh_goi_y: "Đề nghị cung cấp văn bản chính thức có dấu đỏ gửi về địa chỉ cư trú của tôi.",
      noi_dung_gui_nguoi_than: "Tôi vừa nhận được thông tin này có dấu hiệu lừa đảo nguy hiểm. Nhờ người thân hỗ trợ kiểm tra.",
      canh_bao_an_toan: "Cơ quan chức năng và ngân hàng không bao giờ yêu cầu chuyển tiền hay đòi mã OTP qua điện thoại.",
    };
  }

  // If user reached max 2 rounds or answers confirm safety
  if (so_luot_da_hoi >= 2) {
    return {
      muc_rui_ro: "Chưa rõ" as const,
      ket_luan_ngan: "Chưa đủ thông tin để xác định mức rủi ro. Bạn nên xác minh qua một kênh độc lập.",
      bang_chung_da_co: [
        {
          noi_dung: text ? `Lời kể ban đầu: "${text.substring(0, 100)}..."` : "Thông tin người dùng cung cấp.",
          nguon: "tinh_huong_ban_dau",
          y_nghia: "Chưa xuất hiện các yêu cầu tiền bạc hay dữ liệu nhạy cảm.",
        },
      ],
      thong_tin_con_thieu: [
        "Chưa thể kiểm chứng độc lập danh tính người gọi và văn bản làm việc chính thức.",
      ],
      cau_hoi_bo_sung: [],
      ly_do_thay_doi_muc_rui_ro: "Sau 2 lượt thu thập thông tin, không phát hiện bằng chứng nguy hiểm rõ ràng nhưng danh tính nguồn gửi vẫn chưa thể kiểm chứng đầy đủ.",
      hanh_dong_an_toan: [
        "Chủ động liên hệ Công an phường/xã nơi cư trú để được hướng dẫn xác minh.",
        "Không chuyển tiền hay cung cấp thông tin cá nhân qua điện thoại.",
      ],
      co_can_hoi_them: false,
      so_luot_da_hoi: 2,
      cac_dau_hieu: [
        "Chưa có bằng chứng về hành vi phạm tội hoặc đòi tiền.",
        "Cần kiểm chứng danh tính qua kênh độc lập.",
      ],
      bang_chung: [
        text ? `Trích dẫn: "${text.substring(0, 100)}"` : "Dữ liệu người dùng cung cấp.",
      ],
      giai_thich: "Do người gọi chưa đưa ra yêu cầu về tiền bạc hay mã OTP, chưa đủ căn cứ kết luận lừa đảo, nhưng bạn cần cẩn trọng vì việc triệu tập qua điện thoại không đúng quy trình chuẩn.",
      canh_bao_phong_ngua: "Nếu đối phương sau đó yêu cầu chuyển tiền hoặc tải phần mềm, hãy dừng lại ngay.",
      viec_can_lam_ngay: [
        "Đến Công an phường nơi cư trú để hỏi rõ thông tin.",
        "Giữ bình tĩnh và không thực hiện bất kỳ giao dịch nào từ xa.",
      ],
      viec_khong_nen_lam: [
        "Không chuyển tiền hoặc nộp tiền phạt từ xa.",
        "Không hoang mang lo lắng.",
      ],
      thong_tin_can_xac_minh: [
        "Xác minh tại Công an phường nơi đang tạm trú hoặc thường trú.",
      ],
      tin_nhan_tu_choi_goi_y: "Đề nghị gửi giấy tờ chính thức về Công an phường nơi tôi đang tạm trú để tôi phối hợp.",
      cau_hoi_xac_minh_goi_y: "Xin cho biết số công văn và đơn vị công tác cụ thể gửi về địa phương?",
      noi_dung_gui_nguoi_than: "Tôi vừa nhận được thông tin mời làm việc qua điện thoại. Tôi sẽ đến công an phường để hỏi lại.",
      canh_bao_an_toan: "Cơ quan công an làm việc theo giấy tờ văn bản tống đạt trực tiếp qua địa phương.",
    };
  }

  // CASE 2: Police Inquiry - Need Verification (Round 0 or 1, needs follow-up questions)
  if (hasPoliceMention) {
    const nextRound = so_luot_da_hoi + 1;
    return {
      muc_rui_ro: "Cần xác minh" as const,
      ket_luan_ngan: "Cần xác minh danh tính người gọi và thủ tục mời làm việc; chưa đủ căn cứ để kết luận đây là lừa đảo.",
      bang_chung_da_co: [
        {
          noi_dung: text ? `Trích dẫn lời kể: "${text.substring(0, 100)}..."` : "Cuộc gọi tự xưng công an mời làm việc qua điện thoại.",
          nguon: "tinh_huong_ban_dau",
          y_nghia: "Yêu cầu làm việc qua điện thoại ở tỉnh xa cần được kiểm chứng thủ tục.",
        },
      ],
      thong_tin_con_thieu: [
        "Chưa rõ người gọi có yêu cầu chuyển tiền hoặc cung cấp thông tin bảo mật hay không.",
        "Chưa rõ có giấy triệu tập/giấy mời chính thức gửi về địa phương hay không.",
      ],
      cau_hoi_bo_sung: [
        {
          id: "q_money",
          cau_hoi: "Người gọi có yêu cầu bạn chuyển tiền, nộp tiền 'bảo lãnh', hoặc cung cấp thông tin tài khoản ngân hàng/OTP không?",
          loai_tra_loi: "co_khong" as const,
          cac_lua_chon: ["Có", "Không", "Tôi không nhớ"],
        },
        {
          id: "q_paper",
          cau_hoi: "Bạn đã nhận được Giấy mời hoặc Giấy triệu tập bằng văn bản có dấu đỏ gửi về địa chỉ cư trú chưa?",
          loai_tra_loi: "co_khong" as const,
          cac_lua_chon: ["Có", "Không", "Tôi không nhớ"],
        },
        {
          id: "q_app_video",
          cau_hoi: "Người gọi có yêu cầu kết bạn Zalo gọi video call, tải ứng dụng lạ hoặc chia sẻ màn hình không?",
          loai_tra_loi: "co_khong" as const,
          cac_lua_chon: ["Có", "Không", "Tôi không nhớ"],
        },
      ],
      ly_do_thay_doi_muc_rui_ro: "Chưa phát hiện yêu cầu về tài chính hay dữ liệu nhạy cảm. Cần thêm thông tin để đánh giá chính xác.",
      hanh_dong_an_toan: [
        "Yêu cầu gửi giấy mời chính thức về Công an phường nơi bạn đang cư trú.",
        "Chưa vội di chuyển xa và không nộp tiền từ xa.",
      ],
      co_can_hoi_them: true,
      so_luot_da_hoi: so_luot_da_hoi,
      cac_dau_hieu: [
        "Thông báo vụ án và yêu cầu đến trụ sở được thực hiện qua điện thoại thay vì gửi giấy triệu tập chính thức về địa phương.",
        "Yêu cầu làm việc tại tỉnh khác trong khi đang học tập/sinh sống ở nơi khác.",
      ],
      bang_chung: [
        text ? `Trích dẫn lời kể: "${text.substring(0, 100)}..."` : "Cuộc gọi tự xưng công an thông báo liên quan vụ án.",
      ],
      giai_thich: "Khoảng cách địa lý và danh tính người gọi qua điện thoại cần được kiểm chứng cẩn thận. Tuy nhiên, bản thân yêu cầu mời đến trụ sở cơ quan công an để làm việc chưa có yếu tố đòi tiền hay đánh cắp dữ liệu, do đó chưa đủ bằng chứng để kết luận đây là hành vi lừa đảo.",
      canh_bao_phong_ngua: "Nếu trong các cuộc gọi tiếp theo, đối phương yêu cầu chuyển tiền vào tài khoản tạm giữ, đòi mã OTP, hoặc yêu cầu tải ứng dụng để làm việc online, đó là dấu hiệu lừa đảo nguy hiểm.",
      viec_can_lam_ngay: [
        "Yêu cầu người gọi gửi Giấy mời hoặc Giấy triệu tập chính thức bằng văn bản về Công an phường nơi bạn đang tạm trú hoặc thường trú.",
        "Liên hệ Công an phường nơi bạn đang cư trú hoặc Cảnh sát khu vực để nhờ hướng dẫn và hỗ trợ xác minh thông tin.",
        "Chưa vội di chuyển xa khi chưa có văn bản giấy hợp lệ từ cơ quan có thẩm quyền.",
      ],
      viec_khong_nen_lam: [
        "Không chuyển bất kỳ khoản tiền nào nếu sau này người gọi gợi ý nộp phạt hoặc đóng tiền bảo lãnh từ xa.",
        "Không cung cấp mật khẩu, mã OTP hoặc tải các phần mềm lạ theo hướng dẫn qua điện thoại.",
        "Không vội hoang mang lo sợ khi chưa nhận được văn bản giấy có dấu đỏ hợp lệ.",
      ],
      thong_tin_can_xac_minh: [
        "Kiểm tra tại Công an phường nơi đang tạm trú hoặc thường trú.",
        "Xác minh danh tính cán bộ qua đường dây nóng công an địa phương.",
      ],
      tin_nhan_tu_choi_goi_y: "Tôi hiện đang sinh sống/học tập tại địa phương khác. Đề nghị quý cơ quan gửi Giấy triệu tập hoặc Giấy mời chính thức về Công an phường nơi tôi đang tạm trú để tôi phối hợp làm việc theo đúng quy định pháp luật.",
      cau_hoi_xac_minh_goi_y: "Xin cho biết họ tên, cấp bậc, đơn vị công tác cụ thể của cán bộ và số công văn/giấy triệu tập gửi về địa phương là gì?",
      noi_dung_gui_nguoi_than: "Vừa có người tự xưng công an gọi bảo vướng vụ án và yêu cầu đến trụ sở làm việc. Tôi chưa nhận được giấy tờ gì và đang kiểm tra lại với công an phường.",
      canh_bao_an_toan: "Theo quy định pháp luật: Cơ quan Công an khi làm việc phải có Giấy triệu tập/Giấy mời bằng văn bản tống đạt trực tiếp qua địa phương, không làm việc hay yêu cầu nộp tiền qua điện thoại.",
    };
  }

  // CASE 3: General / other inquiries
  return {
    muc_rui_ro: "Cần xác minh" as const,
    ket_luan_ngan: "Thông tin hiện tại chưa đủ để đưa ra kết luận rõ ràng, cần xác minh thêm.",
    bang_chung_da_co: [
      {
        noi_dung: text ? `Nội dung cung cấp: "${text.substring(0, 100)}"` : "Dữ liệu được người dùng cung cấp.",
        nguon: "tinh_huong_ban_dau",
        y_nghia: "Thông tin qua kênh liên lạc chưa được xác thực danh tính.",
      },
    ],
    thong_tin_con_thieu: [
      "Chưa rõ mục đích cụ thể của người liên hệ.",
      "Chưa rõ có yêu cầu về tiền bạc, dữ liệu cá nhân hay đường link hay không.",
    ],
    cau_hoi_bo_sung: [
      {
        id: "q_gen_money",
        cau_hoi: "Đối phương có yêu cầu bạn chuyển tiền, thanh toán phí hoặc cung cấp thông tin ngân hàng không?",
        loai_tra_loi: "co_khong" as const,
        cac_lua_chon: ["Có", "Không", "Tôi không nhớ"],
      },
      {
        id: "q_gen_link",
        cau_hoi: "Đối phương có gửi kèm đường link lạ hoặc yêu cầu bạn tải ứng dụng không?",
        loai_tra_loi: "co_khong" as const,
        cac_lua_chon: ["Có", "Không", "Tôi không nhớ"],
      },
      {
        id: "q_gen_desc",
        cau_hoi: "Người liên hệ tự giới thiệu là ai và từ đơn vị/cơ quan nào?",
        loai_tra_loi: "van_ban" as const,
      },
    ],
    ly_do_thay_doi_muc_rui_ro: "Dữ liệu ban đầu chưa đủ để đánh giá nguy cơ. Cần thêm thông tin đối chứng.",
    hanh_dong_an_toan: [
      "Chủ động liên hệ qua kênh chính thức nếu nghi ngờ về danh tính người gửi.",
      "Trao đổi thêm với người thân để có thêm góc nhìn khách quan.",
    ],
    co_can_hoi_them: true,
    so_luot_da_hoi: so_luot_da_hoi,
    cac_dau_hieu: [
      "Nội dung nhận được từ kênh liên lạc chưa được xác thực danh tính người gửi.",
    ],
    bang_chung: [
      text ? `Nội dung cung cấp: "${text.substring(0, 100)}"` : "Dữ liệu được người dùng cung cấp.",
    ],
    giai_thich: "Dữ liệu hiện tại chưa có đủ bằng chứng về các hành vi nguy hiểm hoặc gian lận. Cần bổ sung thêm thông tin về diễn biến cuộc trò chuyện để đánh giá chính xác.",
    canh_bao_phong_ngua: "Nếu đối phương sau đó yêu cầu chuyển tiền, cung cấp mã OTP, hoặc yêu cầu bấm vào đường link lạ, bạn không nên thực hiện trước khi xác minh.",
    viec_can_lam_ngay: [
      "Chủ động liên hệ qua kênh chính thức nếu nghi ngờ về danh tính người gửi.",
      "Trao đổi thêm với người thân để có thêm góc nhìn khách quan.",
    ],
    viec_khong_nen_lam: [
      "Không vội vàng thực hiện các yêu cầu tài chính hoặc nhấp vào liên kết chưa rõ nguồn gốc.",
      "Không chia sẻ thông tin nhạy cảm của bản thân.",
    ],
    thong_tin_can_xac_minh: [
      "Kiểm tra lại số điện thoại hoặc tài khoản gửi tin qua các nguồn tin cậy.",
    ],
    tin_nhan_tu_choi_goi_y: "Tôi cần thời gian kiểm tra lại thông tin và sẽ phản hồi sau.",
    cau_hoi_xac_minh_goi_y: "Vui lòng cung cấp thêm thông tin rõ ràng về mục đích và danh tính của bạn.",
    noi_dung_gui_nguoi_than: "Tôi vừa nhận được thông tin này, nhờ người nhà xem giúp xem có điểm gì bất thường không.",
    canh_bao_an_toan: "Luôn cẩn trọng và kiểm chứng độc lập trước mọi lời mời chào hoặc yêu cầu từ người lạ trên không gian mạng.",
  };
}

async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (_req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server "Bẫy Hay Thật ?" running on http://localhost:${PORT}`);
  });
}

startServer();
