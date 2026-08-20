import express, { Request, Response, NextFunction } from "express";
import path from "path";
import fs from "fs";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI, Type } from "@google/genai";
import dotenv from "dotenv";
import { scanSevereDangerSigns, RuleScanResult } from "./src/utils/riskRules";
import {
  runTechnicalAnalysis,
  mergeRuleRiskWithAiResult,
  FullTechnicalAnalysis,
} from "./src/utils/technicalAnalysis";
import { performTraceCheck } from "./src/utils/reputationService";
import {
  checkIndicator,
  enrichIndicatorWithGrounding,
} from "./src/utils/indicatorLookup";
import {
  sanitizeSensitiveData,
  getRedactionSummary,
} from "./src/utils/privacySanitizer";
import {
  searchPhoneWithGoogleGrounding,
  normalizePhoneToE164,
  normalizePhoneNumber,
  generatePhoneSearchVariants,
  isStrictOfficialGovDomain,
} from "./src/utils/publicPhoneGrounding";
import {
  getCachedPhoneLookup,
  setCachedPhoneLookup,
} from "./src/utils/phoneLookupCache";

dotenv.config();

const app = express();
const PORT = Number(process.env.PORT) || 3000;

// Disable Express X-Powered-By header
app.disable("x-powered-by");

// Trust first proxy hop (Cloud Run / NGINX reverse proxy) so req.ip and rate-limiter obtain real client IP
app.set("trust proxy", 1);

// Block direct access to sensitive system, source, and environment files
app.use((req: Request, res: Response, next: NextFunction) => {
  const normalizedPath = req.path.toLowerCase();

  // Sensitive root configs, server code, environment files, and tests are always blocked
  if (
    normalizedPath.includes(".env") ||
    normalizedPath.includes("server.ts") ||
    normalizedPath.includes("server.cjs") ||
    normalizedPath.endsWith(".map") ||
    normalizedPath.includes("package.json") ||
    normalizedPath.includes("tsconfig") ||
    normalizedPath.includes("dockerfile") ||
    normalizedPath.startsWith("/tests/") ||
    normalizedPath.startsWith("/e2e/")
  ) {
    return res.status(404).send("Not Found");
  }

  // In production mode, also block any direct requests to /src/
  if (process.env.NODE_ENV === "production" && normalizedPath.startsWith("/src/")) {
    return res.status(404).send("Not Found");
  }

  next();
});

// Security Headers Middleware
app.use((_req: Request, res: Response, next: NextFunction) => {
  // Content Security Policy compatible with AI Studio iframe preview, fonts, media, and scripts
  res.setHeader(
    "Content-Security-Policy",
    "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval' https://fonts.googleapis.com; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com data:; img-src 'self' data: blob: https:; media-src 'self' data: blob:; connect-src 'self' https://generativelanguage.googleapis.com; frame-ancestors 'self' https://*.google.com https://*.googleusercontent.com https://*.aistudio.google.com https://*.run.app;"
  );
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("X-Frame-Options", "SAMEORIGIN");
  res.setHeader("Strict-Transport-Security", "max-age=31536000; includeSubDomains");
  res.setHeader("Referrer-Policy", "strict-origin-when-cross-origin");
  res.setHeader("Permissions-Policy", "camera=(self), microphone=(self), geolocation=()");
  next();
});

// JSON & URL-encoded body parsing with strict 10MB payload size limits
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));

// Helper to validate MIME and magic bytes for base64 uploads
function isValidBase64Media(
  base64Data: string,
  declaredMimeType: string,
  allowedMimes: string[]
): boolean {
  if (!base64Data || !declaredMimeType) return false;
  const normalizedMime = declaredMimeType.toLowerCase().trim();
  if (!allowedMimes.includes(normalizedMime)) return false;

  try {
    const cleanBase64 = base64Data.replace(/^data:[^;]+;base64,/, "");
    // Check max size: Image max 5MB (~6.8MB base64), Audio max 8MB (~10.9MB base64)
    if (normalizedMime.startsWith("image/") && cleanBase64.length > 5 * 1024 * 1024 * 1.37) return false;
    if (normalizedMime.startsWith("audio/") && cleanBase64.length > 8 * 1024 * 1024 * 1.37) return false;

    // Read first 64 bytes for deep magic byte inspection
    let headerBuffer: Buffer | null = Buffer.from(cleanBase64.substring(0, 88), "base64");
    if (headerBuffer.length < 12) {
      headerBuffer = null;
      return false;
    }

    const hex = headerBuffer.toString("hex").toLowerCase();
    const ascii = headerBuffer.toString("latin1");

    let isValid = false;

    if (normalizedMime.startsWith("image/")) {
      // JPEG: ffd8ff
      if (normalizedMime === "image/jpeg" && hex.startsWith("ffd8ff")) isValid = true;
      // PNG: 89504e470d0a1a0a
      else if (normalizedMime === "image/png" && hex.startsWith("89504e47")) isValid = true;
      // WebP: RIFF at offset 0 (hex 52494646) and WEBP at offset 8 (hex 57454250)
      else if (
        normalizedMime === "image/webp" &&
        hex.startsWith("52494646") &&
        ascii.substring(8, 12) === "WEBP"
      ) {
        isValid = true;
      }
      // GIF: GIF87a or GIF89a (47494638)
      else if (normalizedMime === "image/gif" && hex.startsWith("47494638")) isValid = true;
    } else if (normalizedMime.startsWith("audio/")) {
      // WAV: RIFF at offset 0 (hex 52494646) and WAVE at offset 8 (hex 57415645)
      if (
        normalizedMime === "audio/wav" &&
        hex.startsWith("52494646") &&
        ascii.substring(8, 12) === "WAVE"
      ) {
        isValid = true;
      }
      // MP3: ID3 (494433) or MPEG sync frame (fffb / fff3 / fff2)
      else if (
        (normalizedMime === "audio/mpeg" || normalizedMime === "audio/mp3") &&
        (hex.startsWith("494433") || hex.startsWith("fff"))
      ) {
        isValid = true;
      }
      // OGG: OggS at offset 0 (hex 4f676753)
      else if (normalizedMime === "audio/ogg" && hex.startsWith("4f676753")) {
        isValid = true;
      }
      // M4A / MP4 / AAC: contains 'ftyp' box signature at offset 4..8 (hex 66747970)
      else if (
        (normalizedMime === "audio/mp4" || normalizedMime === "audio/x-m4a" || normalizedMime === "audio/aac") &&
        ascii.includes("ftyp")
      ) {
        isValid = true;
      }
      // WebM audio: 1a45dfa3 (EBML ID)
      else if (normalizedMime === "audio/webm" && hex.startsWith("1a45dfa3")) {
        isValid = true;
      }
    }

    // Explicitly nullify buffer reference to assist V8 garbage collection
    headerBuffer = null;
    return isValid;
  } catch {
    return false;
  }
}

/**
 * In-memory rate limiter for API endpoints (30 requests per minute per client IP)
 * NOTE: For multi-instance Cloud Run deployments with independent scaling containers,
 * in-memory rate limiting applies per instance. For cluster-wide global rate limiting,
 * integrate a central Redis/Memcached or Cloud Armor policy.
 */
interface RateLimitRecord {
  count: number;
  resetTime: number;
}
const rateLimitMap = new Map<string, RateLimitRecord>();

function checkRateLimit(req: Request, res: Response, next: NextFunction) {
  const ip = (req.headers["x-forwarded-for"] as string)?.split(",")[0]?.trim() || req.ip || req.socket.remoteAddress || "unknown-ip";
  const now = Date.now();
  const windowMs = 60 * 1000; // 1 minute
  const maxRequests = 30;

  const record = rateLimitMap.get(ip);
  if (!record || now > record.resetTime) {
    rateLimitMap.set(ip, { count: 1, resetTime: now + windowMs });
    return next();
  }

  if (record.count >= maxRequests) {
    return res.status(429).json({
      error: "Quá nhiều yêu cầu phân tích trong thời gian ngắn. Vui lòng chờ 1 phút trước khi thử lại.",
    });
  }

  record.count += 1;
  next();
}

// Liveness & Readiness Healthcheck Endpoints for Cloud Run & Container Orchestration
app.get("/health", (_req: Request, res: Response) => {
  res.status(200).json({ status: "ok" });
});

app.get("/api/health", (_req: Request, res: Response) => {
  res.status(200).json({ status: "ok" });
});

// Clean up stale rate limit entries periodically
setInterval(() => {
  const now = Date.now();
  for (const [ip, record] of rateLimitMap.entries()) {
    if (now > record.resetTime) {
      rateLimitMap.delete(ip);
    }
  }
}, 5 * 60 * 1000);

// Server-side Gemini API client (lazy initialization)
let aiClient: GoogleGenAI | null = null;

function getAiClient(): GoogleGenAI {
  if (!aiClient) {
    const apiKey = process.env.GEMINI_API_KEY;
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

// Explicit Static Routes for SEO & PWA files
const publicDir = path.join(process.cwd(), "public");

app.get("/robots.txt", (_req: Request, res: Response) => {
  const filePath = path.join(publicDir, "robots.txt");
  if (fs.existsSync(filePath)) {
    res.setHeader("Content-Type", "text/plain; charset=utf-8");
    res.setHeader("Cache-Control", "public, max-age=86400");
    return res.sendFile(filePath);
  }
  res.type("text/plain").send("User-agent: *\nAllow: /\nSitemap: https://bayhaythat.ai.studio/sitemap.xml\n");
});

app.get("/sitemap.xml", (_req: Request, res: Response) => {
  const filePath = path.join(publicDir, "sitemap.xml");
  if (fs.existsSync(filePath)) {
    res.setHeader("Content-Type", "application/xml; charset=utf-8");
    res.setHeader("Cache-Control", "public, max-age=86400");
    return res.sendFile(filePath);
  }
  res.type("application/xml").send(`<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"><url><loc>https://bayhaythat.ai.studio/</loc><priority>1.0</priority></url></urlset>`);
});

app.get("/manifest.webmanifest", (_req: Request, res: Response) => {
  const filePath = path.join(publicDir, "manifest.webmanifest");
  if (fs.existsSync(filePath)) {
    res.setHeader("Content-Type", "application/manifest+json; charset=utf-8");
    res.setHeader("Cache-Control", "public, max-age=86400");
    return res.sendFile(filePath);
  }
  res.status(404).send("Not Found");
});

app.get("/favicon.svg", (_req: Request, res: Response) => {
  const filePath = path.join(publicDir, "favicon.svg");
  if (fs.existsSync(filePath)) {
    res.setHeader("Content-Type", "image/svg+xml");
    res.setHeader("Cache-Control", "public, max-age=31536000, immutable");
    return res.sendFile(filePath);
  }
  res.status(404).send("Not Found");
});

app.get("/favicon.ico", (_req: Request, res: Response) => {
  const filePath = path.join(publicDir, "favicon.svg");
  if (fs.existsSync(filePath)) {
    res.setHeader("Content-Type", "image/svg+xml");
    res.setHeader("Cache-Control", "public, max-age=31536000, immutable");
    return res.sendFile(filePath);
  }
  res.status(204).end();
});

// Main AI & Rule-based Analysis Endpoint
app.post("/api/analyze", checkRateLimit, async (req: Request, res: Response) => {
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
      newAnswers = [],
      extraNote = "",
      so_luot_da_hoi = 0,
    } = req.body;

    const effectiveText = text || (initialInput && initialInput.text) || "";
    const effectiveLink = linkUrl || (initialInput && initialInput.linkUrl) || "";
    const effectiveType = type || (initialInput && initialInput.type) || "text";

    // Sanitized server log (Never log sensitive user content, credentials, or phone numbers)
    console.log(
      `[API /api/analyze] Received request. Type: ${effectiveType}, TextLength: ${effectiveText.length}, HasLink: ${Boolean(
        effectiveLink
      )}, HasImage: ${Boolean(imageBase64)}, HasAudio: ${Boolean(audioBase64)}, Turn: ${so_luot_da_hoi}`
    );

    if (!effectiveText && !imageBase64 && !audioBase64 && !effectiveLink && (!newAnswers || newAnswers.length === 0)) {
      return res.status(400).json({ error: "Vui lòng cung cấp nội dung, hình ảnh, liên kết hoặc câu trả lời cần phân tích." });
    }

    // Input length limit check (prevent Denial-of-Service or buffer exhaustion)
    if (effectiveText.length > 10000 || effectiveLink.length > 2000 || (extraNote && extraNote.length > 3000)) {
      return res.status(400).json({ error: "Nội dung cung cấp vượt quá độ dài tối đa cho phép." });
    }

    // Validate image format & magic bytes if image provided
    if (imageBase64 && imageMimeType) {
      const allowedImageMimes = ["image/jpeg", "image/png", "image/webp", "image/gif"];
      if (!isValidBase64Media(imageBase64, imageMimeType, allowedImageMimes)) {
        return res.status(400).json({ error: "Định dạng hình ảnh không hợp lệ hoặc kích thước vượt quá giới hạn." });
      }
    }

    // Validate audio format & magic bytes if audio provided
    if (audioBase64 && audioMimeType) {
      const allowedAudioMimes = ["audio/mpeg", "audio/mp3", "audio/wav", "audio/ogg", "audio/mp4", "audio/x-m4a", "audio/aac", "audio/webm"];
      if (!isValidBase64Media(audioBase64, audioMimeType, allowedAudioMimes)) {
        return res.status(400).json({ error: "Định dạng âm thanh không hợp lệ hoặc kích thước vượt quá giới hạn." });
      }
    }

    // 1. GIAI ĐOẠN 1: SYSTEMATIC TECHNICAL SCAN (Instant Rule-based Guardrails)
    const techAnalysis: FullTechnicalAnalysis = runTechnicalAnalysis({
      text: effectiveText,
      linkUrl: effectiveLink,
    });

    // 2. Severe danger rule scan
    const ruleScan: RuleScanResult = scanSevereDangerSigns({
      text: effectiveText,
      linkUrl: effectiveLink,
      newAnswers,
      extraNote,
    });

    const isApiKeyMissing = !process.env.GEMINI_API_KEY || process.env.GEMINI_API_KEY === "MY_GEMINI_API_KEY";

    // If API key is missing, use deterministic fallback engine immediately
    if (isApiKeyMissing) {
      console.log("[Engine] Running deterministic fallback analysis with technical indicators.");
      const fallbackResult = generateFallbackAnalysis({
        text: effectiveText,
        linkUrl: effectiveLink,
        type: effectiveType,
        techAnalysis,
        ruleScan,
        existingEvidence: existingEvidence || [],
        previousQuestionsAndAnswers: previousQuestionsAndAnswers || [],
        newAnswers: newAnswers || [],
        extraNote: extraNote || "",
        so_luot_da_hoi: Number(so_luot_da_hoi) || 0,
      });
      return res.json(fallbackResult);
    }

    const ai = getAiClient();
    const currentTurn = Number(so_luot_da_hoi) || 0;

    // Build system instructions with strict technical indicator priorities
    const techSummaryLines: string[] = [];
    if (techAnalysis.phoneAnalysis.hasPhone) {
      techAnalysis.phoneAnalysis.details.forEach((d) => techSummaryLines.push(`  - SỐ ĐIỆN THOẠI: ${d}`));
    }
    if (techAnalysis.urlAnalysis.hasUrl) {
      techAnalysis.urlAnalysis.details.forEach((d) => techSummaryLines.push(`  - ĐƯỜNG LINK & TÊN MIỀN: ${d}`));
    }
    if (techAnalysis.contentAnalysis.detectedSignals.length > 0) {
      techAnalysis.contentAnalysis.detectedSignals.forEach((s) => techSummaryLines.push(`  - HÀNH VI / NỘI DUNG: ${s}`));
    }
    if (techAnalysis.identityMismatch.hasConflict && techAnalysis.identityMismatch.conflictDescription) {
      techSummaryLines.push(`  - MÂU THUẪN DANH TÍNH: ${techAnalysis.identityMismatch.conflictDescription}`);
    }
    techSummaryLines.push(`  - ĐIỂM SỐ QUY TẮC: ${techAnalysis.scoring.totalScore} điểm -> Canonical Level: "${techAnalysis.scoring.canonicalRiskLevel}"`);

    const systemInstruction = `
Bạn là chuyên gia phân tích an ninh mạng "Bẫy Hay Thật ?" tại Việt Nam.
Phân tích kỹ thuật theo 4 lớp bắt buộc:
1. NGƯỜI GỬI / SỐ ĐIỆN THOẠI (+212 Morocco, +84 VN, v.v., cảnh báo VoIP/Caller ID Spoofing).
2. ĐƯỜNG LINK / TÊN MIỀN THẬT (Tách Registrable Domain SLD+TLD. Vạch trần Path Deception, e.g. 500001.eu.cc/dichvucong.gov/vn có domain thật là eu.cc).
3. HÀNH VI / NỘI DUNG (Thúc ép 48h, đòi tiền/nộp phạt, đòi OTP, dụ soạn '1' hoặc 'Y' lấy link mới).
4. MÂU THUẪN DANH TÍNH (Tự xưng Bộ Công An nhưng gửi từ số +212 và link eu.cc -> CRITICAL).

QUY TẮC PHÒNG VỆ (RULE-BASED GUARDRAIL):
- Canonical risk levels: SAFE | VERIFY | HIGH | CRITICAL
- Không được hạ mức rủi ro thấp hơn mức do hệ thống quy tắc xác định (${techAnalysis.scoring.canonicalRiskLevel} - ${techAnalysis.scoring.totalScore} điểm).
- Nếu có một trong các dấu hiệu: Tên miền giả mạo, số nước ngoài, giả danh cơ quan, chuyển tiền, OTP, cài app lạ -> TUYỆT ĐỐI KHÔNG TRẢ VỀ SAFE!
- Trả về JSON đúng cấu trúc.
`;

    const contentsParts: any[] = [];

    // GIAI ĐOẠN 2 OPTIMIZATION:
    // Only include image if text is empty or very short (< 10 chars), to avoid massive payload & slow latency
    const hasRichText = effectiveText.trim().length >= 10;
    if (!hasRichText && imageBase64 && imageMimeType) {
      const cleanBase64 = imageBase64.replace(/^data:[^;]+;base64,/, "");
      contentsParts.push({
        inlineData: {
          mimeType: imageMimeType,
          data: cleanBase64,
        },
      });
    }

    // Add audio only if no text
    if (!hasRichText && audioBase64 && audioMimeType) {
      const cleanAudioBase64 = audioBase64.replace(/^data:[^;]+;base64,/, "");
      contentsParts.push({
        inlineData: {
          mimeType: audioMimeType,
          data: cleanAudioBase64,
        },
      });
    }

    // Sanitize user inputs to protect CCCD, OTP, bank account, and card numbers from raw AI exposure
    const { sanitizedText, redactionCount, redactedItems } = sanitizeSensitiveData(effectiveText);
    const sanitizedExtraNote = extraNote ? sanitizeSensitiveData(extraNote).sanitizedText : "";

    // Build lightweight prompt context with pre-extracted facts
    let promptContext = `PHÂN TÍCH TÌNH HUỐNG (Lượt ${currentTurn}/2):\n`;
    if (effectiveLink) promptContext += `- Link: ${effectiveLink}\n`;
    if (sanitizedText) promptContext += `- Nội dung: ${sanitizedText}\n`;

    if (techSummaryLines.length > 0) {
      promptContext += `\n[DỮ LIỆU KỸ THUẬT ĐÃ TRÍCH XUẤT]:\n${techSummaryLines.join("\n")}\n`;
    }

    if (newAnswers && newAnswers.length > 0) {
      promptContext += `\n[CÂU TRẢ LỜI MỚI]:\n`;
      newAnswers.forEach((ans: any, idx: number) => {
        const sanitizedAns = sanitizeSensitiveData(ans.answer || "").sanitizedText;
        promptContext += `${idx + 1}. ${ans.question} -> ${sanitizedAns}\n`;
      });
    }

    if (sanitizedExtraNote) {
      promptContext += `\n[GHI CHÚ]: ${sanitizedExtraNote}\n`;
    }

    promptContext += `\nTrả về JSON với aiRiskLevel: SAFE | VERIFY | HIGH | CRITICAL.`;
    contentsParts.push({ text: promptContext });

    const hasValidApiKey = Boolean(
      process.env.GEMINI_API_KEY &&
      process.env.GEMINI_API_KEY !== "MY_GEMINI_API_KEY" &&
      process.env.GEMINI_API_KEY !== "dummy-key" &&
      process.env.GEMINI_API_KEY.trim().length > 5
    );

    let parsedAiResult: any = null;

    if (hasValidApiKey) {
      const responseSchema = {
        type: Type.OBJECT,
        properties: {
          aiRiskLevel: {
            type: Type.STRING,
            description: "SAFE | VERIFY | HIGH | CRITICAL",
          },
          muc_rui_ro: {
            type: Type.STRING,
            description: "Mức rủi ro tiếng Việt tương ứng",
          },
          riskReasons: {
            type: Type.ARRAY,
            items: { type: Type.STRING },
            description: "Danh sách lý do và dấu hiệu rủi ro",
          },
          immediateActions: {
            type: Type.ARRAY,
            items: { type: Type.STRING },
            description: "Hành động an toàn tức thì",
          },
          needsMoreInformation: {
            type: Type.BOOLEAN,
            description: "Có cần hỏi thêm thông tin hay không",
          },
          followUpQuestions: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                id: { type: Type.STRING },
                cau_hoi: { type: Type.STRING },
                loai_tra_loi: { type: Type.STRING },
                cac_lua_chon: {
                  type: Type.ARRAY,
                  items: { type: Type.STRING },
                },
              },
              required: ["id", "cau_hoi", "loai_tra_loi"],
            },
          },
          giai_thich: {
            type: Type.STRING,
            description: "Giải thích bản chất thủ đoạn",
          },
          canh_bao_phong_ngua: {
            type: Type.STRING,
            description: "Khuyến cáo phòng ngừa",
          },
          tin_nhan_tu_choi_goi_y: {
            type: Type.STRING,
            description: "Tin nhắn từ chối",
          },
          cau_hoi_xac_minh_goi_y: {
            type: Type.STRING,
            description: "Câu hỏi đối chứng",
          },
          noi_dung_gui_nguoi_than: {
            type: Type.STRING,
            description: "Nội dung gửi người thân",
          },
        },
        required: ["aiRiskLevel", "riskReasons", "immediateActions", "needsMoreInformation"],
      };

      // Model priority list: try fast, high-quota gemini-2.5-flash first, then flash-lite / 3.7-flash
      const candidateModels = ["gemini-2.5-flash", "gemini-2.5-flash-lite", "gemini-3.7-flash"];
      for (const modelName of candidateModels) {
        try {
          const generateAiPromise = ai.models.generateContent({
            model: modelName,
            contents: { parts: contentsParts },
            config: {
              systemInstruction,
              responseMimeType: "application/json",
              maxOutputTokens: 1200,
              responseSchema,
            },
          });

          const timeoutPromise = new Promise((_, reject) =>
            setTimeout(() => reject(new Error("AI_TIMEOUT")), 5000)
          );

          const aiResponse: any = await Promise.race([generateAiPromise, timeoutPromise]);
          const responseText = aiResponse?.text;
          if (responseText) {
            parsedAiResult = JSON.parse(responseText);
            break; // Success!
          }
        } catch (aiErr: any) {
          const rawMsg = aiErr?.message || String(aiErr);
          const isQuota = rawMsg.includes("429") || rawMsg.includes("RESOURCE_EXHAUSTED") || rawMsg.includes("quota");
          if (isQuota) {
            console.warn(`[AI Note] Model ${modelName} rate limit/quota reached. Checking fallback model...`);
            continue;
          }
          console.warn(`[AI Note] Model ${modelName} error or timeout: ${rawMsg.slice(0, 120)}`);
          continue;
        }
      }

      if (!parsedAiResult) {
        console.warn("[AI Note] Using deterministic multi-layer rule engine fallback.");
      }
    } else {
      console.log("[Server] GEMINI_API_KEY not present or placeholder. Using deterministic multi-layer rule engine.");
      parsedAiResult = null;
    }

    // Merge rule-based engine with AI result and enforce canonical single source of risk
    const finalResult = mergeRuleRiskWithAiResult(techAnalysis, parsedAiResult || {});
    return res.json({
      ...finalResult,
      isSanitized: redactionCount > 0,
      redactionSummary: getRedactionSummary(redactedItems),
    });
  } catch (error: any) {
    console.error("[API Error] Analysis error:", error.message || error);
    const techAnalysis = runTechnicalAnalysis({
      text: req.body.text || (req.body.initialInput && req.body.initialInput.text) || "",
      linkUrl: req.body.linkUrl || (req.body.initialInput && req.body.initialInput.linkUrl) || "",
    });
    const ruleScan = scanSevereDangerSigns({
      text: req.body.text || (req.body.initialInput && req.body.initialInput.text) || "",
      linkUrl: req.body.linkUrl || (req.body.initialInput && req.body.initialInput.linkUrl) || "",
      newAnswers: req.body.newAnswers || [],
      extraNote: req.body.extraNote || "",
    });

    const fallback = generateFallbackAnalysis({
      text: req.body.text || (req.body.initialInput && req.body.initialInput.text) || "",
      linkUrl: req.body.linkUrl || (req.body.initialInput && req.body.initialInput.linkUrl) || "",
      type: req.body.type || (req.body.initialInput && req.body.initialInput.type) || "text",
      techAnalysis,
      ruleScan,
      existingEvidence: req.body.existingEvidence || [],
      previousQuestionsAndAnswers: req.body.previousQuestionsAndAnswers || [],
      newAnswers: req.body.newAnswers || [],
      extraNote: req.body.extraNote || "",
      so_luot_da_hoi: Number(req.body.so_luot_da_hoi) || 0,
    });

    return res.json({
      ...fallback,
      warning: "Kết quả phân tích dựa trên bộ quy tắc an toàn số chuẩn hóa.",
    });
  }
});

// Dedicated parallel endpoint for "Kiểm tra dấu vết"
app.post("/api/trace-check", async (req: Request, res: Response) => {
  try {
    const text = req.body.text || (req.body.initialInput && req.body.initialInput.text) || "";
    const linkUrl = req.body.linkUrl || (req.body.initialInput && req.body.initialInput.linkUrl) || "";
    const traceResult = await performTraceCheck({ text, linkUrl });
    return res.json(traceResult);
  } catch (error: any) {
    console.error("[API Error] Trace check error:", error.message || error);
    return res.status(500).json({
      error: "Không thể hoàn thành kiểm tra dấu vết",
      status: "error",
    });
  }
});

// Dedicated fast indicator lookup endpoint ("Tra số & đường link")
// Returns deterministic rule-based analysis immediately (<50ms), enriched with cached verified data if available
app.post("/api/check-indicator", (req: Request, res: Response) => {
  try {
    const input = (req.body.input || req.body.text || req.body.linkUrl || "").toString();
    const result = checkIndicator(input);

    // If input contains a phone number, check cache/database by canonical phone for instant enrichment
    if (result.phones && result.phones.length > 0) {
      const primaryPhone = result.phones[0];
      const { canonicalPhone } = normalizePhoneNumber(primaryPhone.raw || primaryPhone.normalized);
      const cached = getCachedPhoneLookup(canonicalPhone);
      if (cached) {
        const enriched = enrichIndicatorWithGrounding(result, cached);
        return res.json(enriched);
      }
    }

    return res.json(result);
  } catch (error: any) {
    console.error("[API Error] Check indicator error:", error.message || error);
    return res.status(500).json({
      error: "Lỗi xử lý tra cứu số & đường link",
      status: "error",
    });
  }
});

// Secondary async endpoint: Public Phone Grounding with Google Search & Strict Server Verification
// Runs asynchronously in background without blocking initial rule-based rendering
app.post("/api/check-indicator/search-phone", async (req: Request, res: Response) => {
  try {
    const rawPhone = (req.body.phone || req.body.input || "").toString().trim();
    if (!rawPhone) {
      return res.status(400).json({
        error: "Vui lòng cung cấp số điện thoại cần tra cứu",
        status: "invalid",
      });
    }

    const { canonicalPhone, localPhone, displayPhone } = normalizePhoneNumber(rawPhone);

    // 1. Tra cứu Database theo canonicalPhone (+84948913212) trước
    const cached = getCachedPhoneLookup(canonicalPhone);
    if (cached) {
      return res.json({
        status: "success",
        fromCache: true,
        grounding: cached,
      });
    }

    // 2. Nếu chưa có dữ liệu trong Database, dùng Gemini API với công cụ Google Search Grounding
    const ai = new GoogleGenAI({
      apiKey: process.env.GEMINI_API_KEY,
      httpOptions: { headers: { "User-Agent": "aistudio-build" } },
    });

    const searchResult = await searchPhoneWithGoogleGrounding(rawPhone, ai);

    // 3. Cache kết quả theo canonicalPhone
    if (searchResult.hasOfficialMatch || searchResult.status === "OFFICIAL_MATCH") {
      setCachedPhoneLookup(localPhone, canonicalPhone, searchResult);
    }

    return res.json({
      status: "success",
      fromCache: false,
      grounding: searchResult,
    });
  } catch (error: any) {
    console.warn("[API Catch] Phone grounding search fallback:", error.message || error);
    const rawPhone = (req.body.phone || req.body.input || "").toString().trim();
    const { canonicalPhone, localPhone, displayPhone } = normalizePhoneNumber(rawPhone);
    return res.json({
      status: "success",
      fromCache: false,
      grounding: {
        canonicalPhone,
        displayPhone,
        normalizedPhone: localPhone,
        e164: canonicalPhone,
        localFormat: localPhone,
        searchVariants: [localPhone, canonicalPhone],
        hasOfficialMatch: false,
        officialMatches: [],
        otherMatches: [],
        searchPerformed: false,
        searchedAt: new Date().toISOString(),
        status: "SEARCH_ERROR",
        statusMessage: "Hệ thống đang phục vụ lượng truy cập cao, tạm thời sử dụng đối soát dữ liệu nội bộ.",
      },
    });
  }
});

// Intelligent Fallback Analysis Engine
export function generateFallbackAnalysis(params: {
  text: string;
  linkUrl: string;
  type: string;
  techAnalysis?: FullTechnicalAnalysis;
  ruleScan: RuleScanResult;
  existingEvidence?: Array<{ noi_dung: string; nguon: string; y_nghia: string }>;
  previousQuestionsAndAnswers?: Array<{ round: number; question: string; answer: string }>;
  newAnswers?: Array<{ questionId: string; question: string; answer: string }>;
  extraNote?: string;
  so_luot_da_hoi: number;
}) {
  const { text, linkUrl, ruleScan, newAnswers = [], extraNote = "", so_luot_da_hoi = 0 } = params;
  const techAnalysis = params.techAnalysis || runTechnicalAnalysis({ text, linkUrl });

  // CASE 1: High/Very High Risk from Technical Analysis or Severe Danger
  if (techAnalysis.scoring.totalScore >= 40 || ruleScan.hasSevereDanger) {
    const defaultRisk = techAnalysis.scoring.totalScore >= 70 || ruleScan.hasSevereDanger ? "Rủi ro rất cao" : "Rủi ro cao";
    const rawFallback = {
      muc_rui_ro: techAnalysis.scoring.totalScore >= 40 ? techAnalysis.scoring.riskLevel : defaultRisk,
      ket_luan_ngan: techAnalysis.scoring.totalScore >= 70
        ? "Rủi ro rất cao — có nhiều dấu hiệu giả mạo và phishing rõ ràng."
        : "Phát hiện dấu hiệu lừa đảo với mức độ rủi ro cao. Tuyệt đối không làm theo yêu cầu của đối phương.",
      bang_chung_da_co: [],
      thong_tin_con_thieu: [],
      cau_hoi_bo_sung: [],
      ly_do_thay_doi_muc_rui_ro: "Nội dung và dấu hiệu kỹ thuật chứa các yếu tố nguy hiểm nghiêm trọng (mạo danh cơ quan, tên miền giả mạo, đầu số nước ngoài, đòi tiền/OTP).",
      hanh_dong_an_toan: [
        "Dừng ngay mọi liên lạc hoặc trao đổi với đối phương.",
        "Tuyệt đối không mở đường link, không chuyển tiền và không cung cấp mã OTP.",
        "Thông báo ngay cho người thân hoặc liên hệ cơ quan chức năng qua kênh chính thống (.gov.vn).",
      ],
      co_can_hoi_them: false,
      so_luot_da_hoi: so_luot_da_hoi,
      cac_dau_hieu: techAnalysis.scoring.scoreBreakdown.map((s) => s.sign),
      bang_chung: techAnalysis.scoring.scoreBreakdown.map((s) => s.evidence),
      giai_thich: "Phân tích kỹ thuật phát hiện sự mâu thuẫn giữa danh tính tự xưng và đầu số liên hệ/tên miền đăng ký thật, kèm theo hành vi đòi tiền hoặc thúc ép thời gian.",
      canh_bao_phong_ngua: "Cơ quan nhà nước Việt Nam không làm việc qua đầu số quốc tế hay đường link lạ không có đuôi .gov.vn.",
      viec_can_lam_ngay: [
        "Dừng trao đổi và chặn số đối phương ngay lập tức.",
        "Không mở đường link và không trả lời tin nhắn.",
        "Nếu đã lỡ chuyển tiền hoặc cung cấp OTP: Gọi ngay tổng đài ngân hàng để khóa tài khoản khẩn cấp.",
      ],
      viec_khong_nen_lam: [
        "Không nhấp vào liên kết lạ.",
        "Không trả lời tin nhắn (không soạn '1' hoặc 'Y').",
        "Không chuyển tiền nộp phạt qua tài khoản cá nhân.",
      ],
      thong_tin_can_xac_minh: [
        "Liên hệ trực tiếp cơ quan qua Cổng thông tin chính thức (.gov.vn).",
      ],
      tin_nhan_tu_choi_goi_y: "Tôi sẽ trực tiếp đến cơ quan chức năng có thẩm quyền để làm việc theo đúng quy định pháp luật. Xin cảm ơn.",
      cau_hoi_xac_minh_goi_y: "Đề nghị cung cấp số quyết định và văn bản chính thức gửi về địa phương.",
      noi_dung_gui_nguoi_than: "Tôi vừa nhận được thông tin có dấu hiệu giả mạo cơ quan/lừa đảo, gửi người nhà lưu ý cảnh giác.",
      canh_bao_an_toan: "Mọi thủ tục hành chính công và nộp phạt trực tuyến chỉ thực hiện tại Cổng Dịch vụ công Quốc gia (.gov.vn).",
    };

    return mergeRuleRiskWithAiResult(techAnalysis, rawFallback);
  }

  // Check for normal benign messages
  const lowerText = text.toLowerCase();
  const isBenignMessage =
    (lowerText.includes("họp") || lowerText.includes("cơm") || lowerText.includes("về trễ") || lowerText.includes("ăn tối") || lowerText.includes("chúc mừng sinh nhật") || lowerText.includes("đi chơi") || lowerText.includes("mai gặp")) &&
    !lowerText.includes("tiền") &&
    !lowerText.includes("link") &&
    !lowerText.includes("otp") &&
    !lowerText.includes("ngân hàng") &&
    !lowerText.includes("công an");

  if (
    isBenignMessage ||
    (techAnalysis.scoring.totalScore < 20 &&
      techAnalysis.scoring.scoreBreakdown.length === 0 &&
      !ruleScan.hasSevereDanger &&
      !lowerText.includes("công an") &&
      !lowerText.includes("tiền") &&
      !lowerText.includes("otp") &&
      !lowerText.includes("tài khoản"))
  ) {
    const rawFallback = {
      aiRiskLevel: "SAFE",
      muc_rui_ro: "Chưa thấy dấu hiệu rõ ràng" as const,
      ket_luan_ngan: "Chưa phát hiện dấu hiệu lừa đảo trong nội dung được cung cấp",
      giai_thich: "Nội dung là trao đổi sinh hoạt/công việc thông thường, chưa thấy dấu hiệu lừa đảo hay rủi ro tài chính.",
      bang_chung_da_co: [
        {
          noi_dung: text ? `Trích dẫn: "${text}"` : "Tin nhắn thông thường.",
          nguon: "tinh_huong_ban_dau" as const,
          y_nghia: "Không có yêu cầu về tài chính, chuyển tiền, mã OTP hay liên kết độc hại.",
        },
      ],
      thong_tin_con_thieu: [],
      cau_hoi_bo_sung: [],
      ly_do_thay_doi_muc_rui_ro: "Không phát hiện yếu tố bất thường hay dấu hiệu trục lợi nào.",
      co_can_hoi_them: false,
      so_luot_da_hoi: so_luot_da_hoi,
      cac_dau_hieu: [],
      bang_chung: [text || "Tin nhắn thông thường."],
      canh_bao_phong_ngua: "Nếu nội dung hoặc yêu cầu thay đổi, hãy kiểm tra lại trước khi thực hiện giao dịch.",
      viec_can_lam_ngay: ["Nếu nội dung hoặc yêu cầu thay đổi, hãy kiểm tra lại trước khi thực hiện giao dịch."],
      viec_khong_nen_lam: [],
      thong_tin_can_xac_minh: [],
      tin_nhan_tu_choi_goi_y: "",
      cau_hoi_xac_minh_goi_y: "",
      noi_dung_gui_nguoi_than: "",
      canh_bao_an_toan: "Nếu nội dung hoặc yêu cầu thay đổi, hãy kiểm tra lại trước khi thực hiện giao dịch.",
    };
    return mergeRuleRiskWithAiResult(techAnalysis, rawFallback);
  }

  // Police Inquiry with no explicit money demand yet
  const hasPoliceMention =
    lowerText.includes("công an") ||
    lowerText.includes("viện kiểm sát") ||
    lowerText.includes("tòa án") ||
    lowerText.includes("triệu tập") ||
    lowerText.includes("vụ án");

  if (hasPoliceMention && so_luot_da_hoi < 2) {
    return {
      muc_rui_ro: "Cần xác minh" as const,
      ket_luan_ngan: "Cần xác minh danh tính người gọi và thủ tục mời làm việc; chưa đủ căn cứ để kết luận đây là lừa đảo chắc chắn.",
      bang_chung_da_co: [
        {
          noi_dung: text ? `Trích dẫn lời kể: "${text.substring(0, 120)}..."` : "Cuộc gọi xưng danh cơ quan chức năng.",
          nguon: "tinh_huong_ban_dau" as const,
          y_nghia: "Thủ tục mời làm việc qua điện thoại cần được đối chiếu văn bản chính thức.",
        },
      ],
      thong_tin_con_thieu: [
        "Chưa rõ người gọi có đưa ra yêu cầu về tài chính, chuyển tiền bảo lãnh hay không.",
        "Chưa rõ có Giấy mời/Giấy triệu tập gửi về Công an phường nơi cư trú hay không.",
      ],
      cau_hoi_bo_sung: [
        {
          id: "q_money_check",
          cau_hoi: "Người gọi có yêu cầu bạn chuyển tiền, nộp tiền bảo lãnh hoặc cung cấp thông tin tài khoản/OTP không?",
          loai_tra_loi: "co_khong" as const,
          cac_lua_chon: ["Có", "Không", "Tôi không nhớ"],
        },
        {
          id: "q_official_paper",
          cau_hoi: "Bạn đã nhận được Giấy mời hoặc Giấy triệu tập bằng văn bản giấy có dấu đỏ gửi về địa phương chưa?",
          loai_tra_loi: "co_khong" as const,
          cac_lua_chon: ["Có", "Không", "Tôi không nhớ"],
        },
        {
          id: "q_app_video",
          cau_hoi: "Người gọi có yêu cầu gọi video qua Zalo, tải ứng dụng lạ hoặc yêu cầu giữ bí mật không?",
          loai_tra_loi: "co_khong" as const,
          cac_lua_chon: ["Có", "Không", "Tôi không nhớ"],
        },
      ],
      ly_do_thay_doi_muc_rui_ro: "Chưa có bằng chứng về hành vi đòi tiền hay chiếm đoạt dữ liệu, nhưng việc làm việc án qua điện thoại là bất thường.",
      hanh_dong_an_toan: [
        "Yêu cầu gửi giấy mời chính thức về Công an phường nơi bạn cư trú.",
        "Không chuyển tiền từ xa dưới mọi hình thức.",
      ],
      co_can_hoi_them: true,
      so_luot_da_hoi: so_luot_da_hoi,
      cac_dau_hieu: [
        "Thông báo làm việc và yêu cầu triệu tập diễn ra qua điện thoại thay vì văn bản giấy chính thức.",
      ],
      bang_chung: [text ? `Trích dẫn: "${text.substring(0, 120)}..."` : "Cuộc gọi xưng công an."],
      giai_thich: "Theo quy định của Bộ Công An, cơ quan công an không làm việc qua điện thoại và không tống đạt lệnh triệu tập qua Zalo. Tuy nhiên, nếu chưa có yêu cầu chuyển tiền hay đòi OTP, hệ thống chưa kết luận chắc chắn lừa đảo mà khuyến cáo xác minh đúng thủ tục.",
      canh_bao_phong_ngua: "Nếu sau đó người gọi yêu cầu chuyển tiền vào tài khoản tạm giữ hoặc tải app để khai báo online, đó là lừa đảo 100%.",
      viec_can_lam_ngay: [
        "Đến trực tiếp Công an phường nơi bạn đang cư trú để nhờ xác minh.",
        "Giữ bình tĩnh và không thực hiện bất kỳ giao dịch tài chính nào.",
      ],
      viec_khong_nen_lam: [
        "Không chuyển tiền nộp phạt hay đóng bảo lãnh từ xa.",
        "Không tải app hoặc làm theo yêu cầu qua điện thoại.",
      ],
      thong_tin_can_xac_minh: [
        "Liên hệ Cảnh sát khu vực hoặc Công an phường nơi cư trú để kiểm tra.",
      ],
      tin_nhan_tu_choi_goi_y: "Đề nghị quý cơ quan gửi Giấy triệu tập chính thức về Công an phường nơi tôi đang cư trú để tôi phối hợp theo đúng quy định.",
      cau_hoi_xac_minh_goi_y: "Xin cho biết số công văn và đơn vị công tác cụ thể gửi về địa phương?",
      noi_dung_gui_nguoi_than: "Tôi vừa nhận cuộc gọi tự xưng công an. Tôi đang đến Công an phường để kiểm tra tính chính xác.",
      canh_bao_an_toan: "Cơ quan công an không làm việc, không thẩm vấn và không thu tiền qua điện thoại.",
    };
  }

  // After 2 turns or ambiguous cases
  if (so_luot_da_hoi >= 2) {
    return {
      muc_rui_ro: "Chưa rõ" as const,
      ket_luan_ngan: "Chưa đủ thông tin để xác định mức rủi ro. Bạn nên xác minh qua một kênh độc lập.",
      bang_chung_da_co: [
        {
          noi_dung: text ? `Lời kể: "${text.substring(0, 100)}..."` : "Thông tin người dùng cung cấp.",
          nguon: "tinh_huong_ban_dau" as const,
          y_nghia: "Chưa xuất hiện các yêu cầu tiền bạc hay dữ liệu nhạy cảm.",
        },
      ],
      thong_tin_con_thieu: [
        "Chưa thể kiểm chứng độc lập danh tính người gửi và tính xác thực của thông tin.",
      ],
      cau_hoi_bo_sung: [],
      ly_do_thay_doi_muc_rui_ro: "Sau 2 lượt hỏi, không phát hiện bằng chứng nguy hiểm rõ ràng nhưng chưa đủ dữ kiện để đưa ra kết luận an toàn hoàn toàn.",
      hanh_dong_an_toan: [
        "Chủ động liên hệ cơ quan/tổ chức liên quan qua số tổng đài chính thức.",
        "Không thực hiện chuyển tiền hay cung cấp thông tin bảo mật.",
      ],
      co_can_hoi_them: false,
      so_luot_da_hoi: 2,
      cac_dau_hieu: ["Chưa đủ dữ kiện để đánh giá nguy cơ."],
      bang_chung: [text ? `Trích dẫn: "${text.substring(0, 100)}"` : "Dữ liệu người dùng cung cấp."],
      giai_thich: "Do chưa phát hiện các yêu cầu nguy hiểm rõ ràng, bạn nên chủ động kiểm chứng độc lập trước khi có bất kỳ hành động nào tiếp theo.",
      canh_bao_phong_ngua: "Nếu đối phương yêu cầu chuyển tiền hoặc gửi mã OTP, hãy dừng lại ngay.",
      viec_can_lam_ngay: [
        "Chủ động liên hệ qua kênh chính thức nếu có nghi ngờ.",
        "Giữ bình tĩnh và không vội vàng làm theo hướng dẫn từ số lạ.",
      ],
      viec_khong_nen_lam: [
        "Không chuyển tiền hoặc chia sẻ thông tin bảo mật.",
      ],
      thong_tin_can_xac_minh: [
        "Xác minh danh tính người liên hệ qua nguồn độc lập tin cậy.",
      ],
      tin_nhan_tu_choi_goi_y: "Tôi cần thời gian kiểm tra lại thông tin và sẽ liên hệ sau.",
      cau_hoi_xac_minh_goi_y: "Vui lòng cung cấp văn bản hoặc thông tin xác thực từ đơn vị của bạn.",
      noi_dung_gui_nguoi_than: "Tôi vừa nhận được thông tin này, nhờ người nhà xem giúp xem có điểm gì bất thường không.",
      canh_bao_an_toan: "Luôn kiểm chứng độc lập trước mọi yêu cầu từ người lạ trên không gian mạng.",
    };
  }

  // General unresolved inquiry (Round 0 / 1)
  return {
    muc_rui_ro: "Cần xác minh" as const,
    ket_luan_ngan: "Thông tin hiện tại chưa đủ để đưa ra kết luận chắc chắn, cần đối chiếu thêm.",
    bang_chung_da_co: [
      {
        noi_dung: text ? `Nội dung cung cấp: "${text.substring(0, 100)}"` : "Dữ liệu được người dùng cung cấp.",
        nguon: "tinh_huong_ban_dau" as const,
        y_nghia: "Thông tin nhận được từ kênh liên lạc chưa được xác thực danh tính.",
      },
    ],
    thong_tin_con_thieu: [
      "Chưa rõ người liên hệ có yêu cầu về tài chính hay dữ liệu bảo mật không.",
    ],
    cau_hoi_bo_sung: [
      {
        id: "q_money_ask",
        cau_hoi: "Đối phương có yêu cầu bạn chuyển tiền, thanh toán phí hoặc nạp tiền không?",
        loai_tra_loi: "co_khong" as const,
        cac_lua_chon: ["Có", "Không", "Tôi không nhớ"],
      },
      {
        id: "q_otp_ask",
        cau_hoi: "Đối phương có hỏi mã OTP, mật khẩu tài khoản hoặc gửi đường link lạ không?",
        loai_tra_loi: "co_khong" as const,
        cac_lua_chon: ["Có", "Không", "Tôi không nhớ"],
      },
      {
        id: "q_who_ask",
        cau_hoi: "Người liên hệ tự giới thiệu là ai và từ đơn vị nào?",
        loai_tra_loi: "van_ban" as const,
      },
    ],
    ly_do_thay_doi_muc_rui_ro: "Dữ liệu ban đầu chưa đủ bằng chứng để xác định mức rủi ro chính xác.",
    hanh_dong_an_toan: [
      "Chủ động liên hệ qua kênh chính thức nếu nghi ngờ về danh tính người gửi.",
      "Trao đổi thêm với người thân để có thêm góc nhìn khách quan.",
    ],
    co_can_hoi_them: true,
    so_luot_da_hoi: so_luot_da_hoi,
    cac_dau_hieu: ["Kênh liên lạc chưa được xác thực danh tính."],
    bang_chung: [text ? `Nội dung: "${text.substring(0, 100)}"` : "Dữ liệu người dùng cung cấp."],
    giai_thich: "Chưa có đủ bằng chứng về các hành vi nguy hiểm, nhưng bạn cần cẩn trọng xác minh trước khi tương tác sâu.",
    canh_bao_phong_ngua: "Nếu đối phương yêu cầu chuyển tiền hay cung cấp OTP, hãy dừng lại ngay.",
    viec_can_lam_ngay: [
      "Trao đổi thêm với người thân hoặc người có chuyên môn.",
      "Không vội vàng làm theo yêu cầu.",
    ],
    viec_khong_nen_lam: [
      "Không chuyển tiền hoặc nhấp vào liên kết lạ.",
      "Không chia sẻ thông tin cá nhân nhạy cảm.",
    ],
    thong_tin_can_xac_minh: ["Kiểm tra thông tin qua kênh chính thống."],
    tin_nhan_tu_choi_goi_y: "Tôi sẽ kiểm tra lại thông tin và phản hồi sau.",
    cau_hoi_xac_minh_goi_y: "Vui lòng cung cấp văn bản xác thực từ cơ quan/tổ chức.",
    noi_dung_gui_nguoi_than: "Tôi vừa nhận được thông tin này, nhờ gia đình kiểm tra giúp.",
    canh_bao_an_toan: "Luôn kiểm chứng độc lập trước mọi lời mời chào trên mạng.",
  };
}

// 404 handler for API routes
app.all("/api/*", (_req: Request, res: Response) => {
  res.status(404).json({ error: "API endpoint not found" });
});

// Vite & Static Asset Handling with Optimized Cache-Control
async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    // Development mode: Vite middleware
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    // Production mode: Serve static assets with long cache for hashed files
    const distPath = path.join(process.cwd(), "dist");

    app.use(
      express.static(distPath, {
        setHeaders: (res, filePath) => {
          if (filePath.includes("/assets/") || filePath.match(/\.[0-9a-f]{8,}\.(js|css|png|jpg|svg|woff2)$/i)) {
            // Immutable cache for fingerprinted / hashed static files
            res.setHeader("Cache-Control", "public, max-age=31536000, immutable");
          } else if (filePath.endsWith("index.html")) {
            // No cache for index.html
            res.setHeader("Cache-Control", "no-cache, no-store, must-revalidate");
          } else {
            res.setHeader("Cache-Control", "public, max-age=86400");
          }
        },
      })
    );

    // SPA fallback: serve index.html for navigation routes
    app.get("*", (req: Request, res: Response) => {
      // If it looks like a missing file (has extension like .png, .js, .xyz), return 404 instead of index.html
      if (req.path.includes(".") && !req.path.endsWith(".html")) {
        return res.status(404).send("File not found");
      }
      res.setHeader("Cache-Control", "no-cache, no-store, must-revalidate");
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`[Server] "Bẫy Hay Thật ?" running securely on port ${PORT}`);
  });
}

startServer();
