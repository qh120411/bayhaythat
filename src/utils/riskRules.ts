// Rule-based Danger Detection System for "Bẫy Hay Thật ?"
// Prioritized pre-scan layer for severe danger signs before calling AI or fallback

export interface DetectedSign {
  id: string;
  category:
    | "gift_fee"
    | "advance_fee"
    | "otp_credentials"
    | "apk_remote_access"
    | "authority_money_demand"
    | "guaranteed_investment"
    | "urgency_threat_secrecy";
  title: string;
  evidence: string;
  signDesc: string;
  actionGuidance: string;
}

export interface RuleScanResult {
  hasSevereDanger: boolean;
  detectedSigns: DetectedSign[];
  summaryConclusion?: string;
}

/**
 * Scans text and metadata for 7 severe danger signs defined by Vietnamese Cyber Security authorities (A05 - Bộ Công An & Cục An toàn thông tin).
 */
export function scanSevereDangerSigns(input: {
  text?: string;
  linkUrl?: string;
  newAnswers?: Array<{ question: string; answer: string }>;
  extraNote?: string;
}): RuleScanResult {
  const { text = "", linkUrl = "", newAnswers = [], extraNote = "" } = input;

  // Build combined text for scanning while preserving original segments
  const answerPairs = newAnswers.map((a) => `${a.question} -> ${a.answer}`).join(" | ");
  const combinedRaw = `${text} ${linkUrl} ${answerPairs} ${extraNote}`.trim();
  const lower = combinedRaw.toLowerCase();

  const detectedSigns: DetectedSign[] = [];

  // Helper to extract matching phrase context for truthful citation
  const extractSnippet = (pattern: RegExp, defaultText: string): string => {
    const match = combinedRaw.match(pattern);
    if (match && match[0]) {
      return match[0].trim();
    }
    return defaultText;
  };

  // 1. Chuyển tiền để nhận quà hoặc nhận thưởng
  // "Người lạ nhắn tôi chuyển 10 triệu đồng để nhận quà", "trúng thưởng nộp tiền", "nhận quà chuyển tiền"
  const giftFeePattern =
    /(?:(?:chuyển|gửi|nộp|đóng|nạp|chuyển khoản|bắt chuyển|yêu cầu chuyển)\s+(?:tiền|\d+[\s\w]*|triệu|nghìn|k|usd|vnd|phí|cọc).*?(?:để|khi|mới được)?\s*(?:nhận|lấy|rút|lĩnh|trúng|nhận lại)?\s*(?:quà|thưởng|phần thưởng|quà tặng|hiện vật|xe|iphone|tiền thưởng))|(?:(?:trúng|nhận|tặng|tri ân|trúng thưởng)\s+(?:quà|thưởng|xe|iphone|điện thoại|hiện vật|tiền).*?(?:chuyển|nộp|đóng|nạp|thanh toán|mất|yêu cầu)\s+(?:tiền|phí|cọc|thuế|\d+))/i;

  if (giftFeePattern.test(combinedRaw) || (lower.includes("nhận quà") && (lower.includes("chuyển") || lower.includes("nộp") || lower.includes("tiền")))) {
    const matchText = extractSnippet(giftFeePattern, text || "Yêu cầu chuyển tiền để nhận quà/thưởng");
    detectedSigns.push({
      id: "gift_fee",
      category: "gift_fee",
      title: "Chuyển tiền để nhận quà hoặc nhận thưởng",
      evidence: `Nội dung ghi nhận: "${matchText}".`,
      signDesc: "Thủ đoạn lừa đảo tặng quà/trúng thưởng nhưng bắt nạn nhân đóng tiền trước (phí vận chuyển, thuế, tiền cọc).",
      actionGuidance: "Tuyệt đối KHÔNG chuyển tiền. Không có chương trình tặng quà hay trúng thưởng hợp pháp nào bắt nộp tiền trước.",
    });
  }

  // 2. Đóng phí, thuế, phí mở khóa hoặc phí vận chuyển để nhận tiền / mở tài khoản / nhận bưu phẩm
  const advanceFeePattern =
    /(?:(?:đóng|nộp|chuyển|thanh toán|nạp)\s+(?:phí|thuế|tiền cọc|tiền bảo hiểm|phí vận chuyển|phí ship|phí hải quan|phí giải ngân|phí mở khóa|phí kích hoạt|phí xử lý|phí rút tiền|tiền nâng hạn mức|phí hồ sơ).*?(?:để|mới được)?\s*(?:nhận|rút|mở|giải ngân|nhận tiền|lấy tiền|nhận hàng|khoản vay|trợ cấp|bưu kiện|tài khoản))|(?:(?:phí mở khóa|phí thông quan|phí xác minh|phí bảo lưu|phí đổi tiền|phí giải ngân)\s*[:=]?\s*(?:bắt buộc|yêu cầu|đóng|nộp|\d+))/i;

  if (advanceFeePattern.test(combinedRaw)) {
    const matchText = extractSnippet(advanceFeePattern, text || "Đóng phí/thuế để nhận tiền hoặc mở khóa");
    detectedSigns.push({
      id: "advance_fee",
      category: "advance_fee",
      title: "Yêu cầu đóng phí, thuế hoặc phí mở khóa để nhận tiền",
      evidence: `Nội dung ghi nhận: "${matchText}".`,
      signDesc: "Thủ đoạn tạo lý do treo tiền/treo gói hàng để ép nạn nhân nộp các loại phí giả mạo.",
      actionGuidance: "Không chuyển tiền nộp phí mở khóa hay tiền bảo hiểm khoản vay dưới mọi hình thức.",
    });
  }

  // 3. Yêu cầu OTP, mật khẩu, mã PIN hoặc thông tin thẻ ngân hàng
  const otpPattern =
    /(?:(?:yêu cầu|đọc|gửi|nhập|cung cấp|hỏi|xin|chia sẻ|điền)\s+(?:mã\s+)?(?:otp|mật khẩu|mã pin|mã xác thực|mã xác minh|mật mã|thông tin thẻ|số thẻ|mã smart otp|cvv|mặt sau thẻ))|(?:(?:mã\s+otp|mã\s+xác\s+thực|smart\s+otp|mật\s+khẩu)\s*[:=]?\s*[\d\w]+)|(?:cung cấp.*?(?:otp|mật khẩu|mã pin))/i;

  if (otpPattern.test(combinedRaw) || lower.includes("mã otp") || lower.includes("đọc otp") || lower.includes("gửi otp") || lower.includes("cung cấp mật khẩu")) {
    const matchText = extractSnippet(otpPattern, text || "Yêu cầu cung cấp mã OTP/mật khẩu");
    detectedSigns.push({
      id: "otp_credentials",
      category: "otp_credentials",
      title: "Yêu cầu cung cấp mã OTP, mật khẩu hoặc thông tin thẻ",
      evidence: `Nội dung ghi nhận: "${matchText}".`,
      signDesc: "Dấu hiệu đánh cắp trực tiếp quyền kiểm soát tài khoản ngân hàng và ví điện tử.",
      actionGuidance: "Ngân hàng và cơ quan quản lý KHÔNG BAO GIỜ yêu cầu bạn cung cấp mã OTP hay mật khẩu.",
    });
  }

  // 4. Yêu cầu cài APK, ứng dụng lạ hoặc chia sẻ màn hình
  const apkRemotePattern =
    /(?:(?:cài|tải|download|cài đặt|mở|chạy|gửi)\s+(?:file\s+|tệp\s+|đường dẫn\s+)?(?:\.apk|apk|app lạ|ứng dụng lạ|phần mềm|dịch vụ công giả|vneid giả|bộ công an giả|anydesk|teamviewer|rustdesk|ultraviewer|airmirror))|(?:chia sẻ màn hình|bật trợ năng|cấp quyền trợ năng|quyền accessibility|cấp quyền truy cập cho app)/i;

  if (apkRemotePattern.test(combinedRaw) || lower.includes(".apk") || lower.includes("tải app") || lower.includes("cài app") || lower.includes("chia sẻ màn hình")) {
    const matchText = extractSnippet(apkRemotePattern, text || "Yêu cầu cài đặt file .apk / ứng dụng lạ");
    detectedSigns.push({
      id: "apk_remote_access",
      category: "apk_remote_access",
      title: "Yêu cầu tải file APK, ứng dụng lạ hoặc chia sẻ màn hình",
      evidence: `Nội dung ghi nhận: "${matchText}".`,
      signDesc: "Cài đặt mã độc nhằm chiếm quyền điều khiển điện thoại từ xa và tự động rút tiền trong tài khoản.",
      actionGuidance: "Tuyệt đối KHÔNG tải file có đuôi .apk ngoài kho ứng dụng Google Play/App Store và không chia sẻ màn hình.",
    });
  }

  // 5. Công an, tòa án, viện kiểm sát hoặc ngân hàng yêu cầu chuyển tiền
  const authorityDemandPattern =
    /(?:(?:công an|cảnh sát|viện kiểm sát|tòa án|điều tra viên|cán bộ điều tra|thanh tra|ngân hàng|bộ công an)\s*.*?(?:yêu cầu|bắt|bảo|buộc|chuyển|nộp)\s+(?:tiền|vào tài khoản|tài khoản tạm giữ|tài khoản thanh tra|tiền bảo lãnh|chứng minh tài sản|bảo toàn|khắc phục))|(?:tài khoản tạm giữ|tài khoản thanh tra|tài khoản an toàn|chứng minh tài chính cho cơ quan điều tra)/i;

  if (authorityDemandPattern.test(combinedRaw) || ((lower.includes("công an") || lower.includes("viện kiểm sát") || lower.includes("tòa án")) && (lower.includes("chuyển tiền") || lower.includes("nộp tiền") || lower.includes("tài khoản tạm giữ")))) {
    const matchText = extractSnippet(authorityDemandPattern, text || "Cơ quan chức năng yêu cầu chuyển tiền từ xa");
    detectedSigns.push({
      id: "authority_money_demand",
      category: "authority_money_demand",
      title: "Công an, Tòa án hoặc Ngân hàng yêu cầu chuyển tiền",
      evidence: `Nội dung ghi nhận: "${matchText}".`,
      signDesc: "Mạo danh cơ quan công quyền đe dọa nạn nhân dính líu đến án phạm tội để ép chuyển tiền vào tài khoản riêng của kẻ lừa đảo.",
      actionGuidance: "Cơ quan Công an KHÔNG làm việc qua điện thoại và KHÔNG BAO GIỜ yêu cầu công dân chuyển tiền vào bất kỳ tài khoản nào.",
    });
  }

  // 6. Đầu tư cam kết lợi nhuận, giật đơn hoa hồng khủng
  const investmentPattern =
    /(?:(?:đầu tư|nạp tiền|làm nhiệm vụ|giật đơn|thả tim|xem video|đánh giá|tiền ảo|chứng khoán quốc tế|sàn giao dịch|giao dịch forex|nhận hoa hồng)\s*.*?(?:cam kết\s+(?:lãi|lợi nhuận|lãi suất)|lợi nhuận\s+(?:khủng|cao|100%|50%|30%|gấp đôi|x2|x5|x10)|bao lỗ|bao lợi nhuận|hoàn tiền 100%|lãi suất\s+\d+%|(?:thu nhập|kiếm)\s+\d+[\s\w]*(?:ngày|giờ)))/i;

  if (investmentPattern.test(combinedRaw) || (lower.includes("cam kết lợi nhuận") || lower.includes("bao lỗ") || (lower.includes("làm nhiệm vụ") && lower.includes("hoa hồng")))) {
    const matchText = extractSnippet(investmentPattern, text || "Cam kết lợi nhuận cao / bao lỗ");
    detectedSigns.push({
      id: "guaranteed_investment",
      category: "guaranteed_investment",
      title: "Mời gọi đầu tư cam kết lợi nhuận cao hoặc nhiệm vụ nhận hoa hồng",
      evidence: `Nội dung ghi nhận: "${matchText}".`,
      signDesc: "Mô hình lừa đảo tài chính / bẫy việc làm online với cam kết phi thực tế nhằm chiếm đoạt tiền nạp của nạn nhân.",
      actionGuidance: "Cảnh giác với mọi lời hứa 'việc nhẹ lương cao' hay đầu tư siêu lợi nhuận không rủi ro.",
    });
  }

  // 7. Tạo áp lực thời gian, đe dọa bắt giam hoặc yêu cầu giữ bí mật
  const pressureSecrecyPattern =
    /(?:(?:bắt giam|lệnh bắt|khởi tố|đi tù|phong tỏa tài sản|cắt điện|khóa sim|khóa tài khoản)\s*.*?(?:trong vòng\s+\d+\s*(?:phút|giờ|tiếng)|ngay lập tức|khẩn cấp|ngay hôm nay))|(?:(?:tuyệt đối\s+)?(?:giữ bí mật|không được kể|không nói cho ai|không cho người thân biết|một mình vào phòng kín|đóng cửa phòng|không tắt máy))/i;

  if (pressureSecrecyPattern.test(combinedRaw) || lower.includes("giữ bí mật") || lower.includes("không được kể cho ai") || lower.includes("bắt giam trong 2 giờ")) {
    const matchText = extractSnippet(pressureSecrecyPattern, text || "Gây áp lực khẩn cấp và yêu cầu cô lập bí mật");
    detectedSigns.push({
      id: "urgency_threat_secrecy",
      category: "urgency_threat_secrecy",
      title: "Gây áp lực thời gian, đe dọa hoặc ép buộc giữ bí mật",
      evidence: `Nội dung ghi nhận: "${matchText}".`,
      signDesc: "Thao túng tâm lý làm nạn nhân hoảng loạn, không kịp kiểm tra lại với người thân hoặc cơ quan chức năng.",
      actionGuidance: "Dừng lại 1 phút và nói chuyện ngay với người thân trong gia đình. Kẻ lừa đảo luôn sợ bạn hỏi ý kiến người khác.",
    });
  }

  // Also check answers from follow-up questions
  newAnswers.forEach((ans) => {
    const aLower = ans.answer.toLowerCase();
    const qLower = ans.question.toLowerCase();

    if (aLower === "có" || aLower.includes("có,") || aLower.includes("có ")) {
      if (qLower.includes("chuyển tiền") || qLower.includes("nộp tiền") || qLower.includes("quà") || qLower.includes("thưởng")) {
        if (!detectedSigns.some((s) => s.id === "gift_fee" || s.id === "advance_fee")) {
          detectedSigns.push({
            id: "gift_fee_answer",
            category: "gift_fee",
            title: "Xác nhận có yêu cầu chuyển tiền/tài chính",
            evidence: `Người dùng xác nhận câu hỏi: "${ans.question}" -> Đáp: "${ans.answer}".`,
            signDesc: "Yêu cầu tài chính đã được người dùng xác nhận trực tiếp.",
            actionGuidance: "Dừng mọi giao dịch chuyển tiền ngay lập tức.",
          });
        }
      }
      if (qLower.includes("otp") || qLower.includes("mật khẩu") || qLower.includes("mã pin")) {
        if (!detectedSigns.some((s) => s.id === "otp_credentials")) {
          detectedSigns.push({
            id: "otp_answer",
            category: "otp_credentials",
            title: "Xác nhận có yêu cầu cung cấp OTP/mật khẩu",
            evidence: `Người dùng xác nhận câu hỏi: "${ans.question}" -> Đáp: "${ans.answer}".`,
            signDesc: "Hành vi đòi mã bảo mật tài khoản đã được xác nhận.",
            actionGuidance: "Tuyệt đối không gửi hay đọc mã OTP cho người khác.",
          });
        }
      }
      if (qLower.includes("app") || qLower.includes("ứng dụng") || qLower.includes("tải") || qLower.includes("màn hình")) {
        if (!detectedSigns.some((s) => s.id === "apk_remote_access")) {
          detectedSigns.push({
            id: "app_answer",
            category: "apk_remote_access",
            title: "Xác nhận có yêu cầu tải ứng dụng/chia sẻ màn hình",
            evidence: `Người dùng xác nhận câu hỏi: "${ans.question}" -> Đáp: "${ans.answer}".`,
            signDesc: "Hành vi yêu cầu cài phần mềm lạ đã được xác nhận.",
            actionGuidance: "Không tải ứng dụng và không chia sẻ màn hình.",
          });
        }
      }
    }
  });

  const hasSevereDanger = detectedSigns.length > 0;

  return {
    hasSevereDanger,
    detectedSigns,
    summaryConclusion: hasSevereDanger
      ? `Phát hiện ${detectedSigns.length} dấu hiệu rủi ro lừa đảo nghiêm trọng trong nội dung được cung cấp.`
      : undefined,
  };
}
