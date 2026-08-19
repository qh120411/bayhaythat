// Public Phone Grounding & Strict Server Verification Service
// Uses Gemini with Google Search Grounding tool to search public warnings,
// enforces strict server-side domain allowlist verification for official sources,
// and normalizes all telephone number variants to Canonical E.164 format (+84...).

import { GoogleGenAI } from "@google/genai";

export interface OfficialPhoneMatch {
  title: string;
  sourceUrl: string;
  verifiedHostname: string;
  publishedAt: string;
  incidentCategory: string;
  category?: string;
  description: string;
  matchedVariant: string;
  canonicalPhone?: string;
  checkedAt?: string;
}

export interface ReferencePhoneMatch {
  title: string;
  sourceUrl: string;
  hostname: string;
  publishedAt?: string;
  description?: string;
  matchedVariant?: string;
}

export type PhoneSearchStatus =
  | "OFFICIAL_MATCH"
  | "NO_MATCH"
  | "SEARCH_ERROR"
  | "SEARCH_PENDING"
  | "LOCAL_MATCH";

export interface PublicPhoneSearchResult {
  canonicalPhone: string;
  displayPhone: string;
  normalizedPhone: string;
  e164: string;
  localFormat: string;
  searchVariants: string[];
  hasOfficialMatch: boolean;
  officialMatches: OfficialPhoneMatch[];
  otherMatches: ReferencePhoneMatch[];
  searchPerformed: boolean;
  searchedAt: string;
  fromCache?: boolean;
  cacheExpiresAt?: string;
  status: PhoneSearchStatus | "official_found" | "not_found" | "error";
  riskLevel?: "HIGH" | "MEDIUM" | "LOW" | "CAUTION";
  statusMessage: string;
}

// Strict whitelist for Official Government & Police Portals in Vietnam
export const STRICT_OFFICIAL_GOV_HOSTNAMES = [
  "bocongan.gov.vn",
  "www.bocongan.gov.vn",
  "cuccsgt.bocongan.gov.vn",
  "cansat.bocongan.gov.vn",
  "cand.com.vn",
  "www.cand.com.vn",
  "baochinhphu.vn",
  "www.baochinhphu.vn",
  "chinhphu.vn",
  "www.chinhphu.vn",
  "congan.hanoi.gov.vn",
  "congan.hochiminhcity.gov.vn",
  "congan.danang.gov.vn",
  "mic.gov.vn",
  "aita.gov.vn",
  "vncert.vn",
  "ais.gov.vn",
  "sbv.gov.vn",
  "gdt.gov.vn",
  "baohiemxahoi.gov.vn",
  "dichvucong.gov.vn",
];

// =============================================================================
// 1. normalizePhoneNumber()
// Normalizes any phone variation to canonical E.164 (+84948913212) and local (0948913212)
// Rules:
// 1. Strip dots, spaces, dashes, parentheses
// 2. If VN phone starting with 0: remove 0, prepend +84
// 3. If starting with 84 without +: prepend +
// 4. Preserve foreign country codes (+xxx)
// =============================================================================
export function normalizePhoneNumber(rawInput: string): {
  canonicalPhone: string; // e.g. +84948913212
  localPhone: string;     // e.g. 0948913212
  displayPhone: string;   // e.g. 0948.913.212
  cleanDigits: string;    // e.g. 84948913212 or 948913212
  isVietnam: boolean;
  countryCode: string;
} {
  if (!rawInput || typeof rawInput !== "string") {
    return {
      canonicalPhone: "",
      localPhone: "",
      displayPhone: "",
      cleanDigits: "",
      isVietnam: false,
      countryCode: "",
    };
  }

  const trimmed = rawInput.trim();
  // 1. Loại bỏ dấu chấm (.), khoảng trắng (\s), dấu gạch ngang (-), dấu ngoặc ((), [])
  let stripped = trimmed.replace(/[\s.\-()[\]]/g, "");

  // Convert 00 international prefix to +
  if (stripped.startsWith("00")) {
    stripped = "+" + stripped.substring(2);
  }

  // Handle Vietnam numbers
  // Case A: starts with +84 (e.g. +84948913212 or +840948913212)
  if (stripped.startsWith("+84")) {
    const rest = stripped.substring(3).replace(/^0+/, "");
    const canonical = "+84" + rest;
    const local = "0" + rest;
    const display = formatDottedVnPhone(local);
    return {
      canonicalPhone: canonical,
      localPhone: local,
      displayPhone: display,
      cleanDigits: "84" + rest,
      isVietnam: true,
      countryCode: "+84",
    };
  }

  // Case B: starts with 84 (without +) (e.g. 84948913212)
  if (stripped.startsWith("84") && stripped.length >= 10) {
    const rest = stripped.substring(2).replace(/^0+/, "");
    const canonical = "+84" + rest;
    const local = "0" + rest;
    const display = formatDottedVnPhone(local);
    return {
      canonicalPhone: canonical,
      localPhone: local,
      displayPhone: display,
      cleanDigits: "84" + rest,
      isVietnam: true,
      countryCode: "+84",
    };
  }

  // Case C: Domestic VN format starts with 0 (e.g. 0948913212, 0365862273)
  if (stripped.startsWith("0") && stripped.length >= 9 && stripped.length <= 11) {
    const rest = stripped.substring(1);
    const canonical = "+84" + rest;
    const local = stripped;
    const display = formatDottedVnPhone(local);
    return {
      canonicalPhone: canonical,
      localPhone: local,
      displayPhone: display,
      cleanDigits: "84" + rest,
      isVietnam: true,
      countryCode: "+84",
    };
  }

  // Case D: Foreign number starting with + (e.g. +212786695433)
  if (stripped.startsWith("+")) {
    const digits = stripped.replace(/\D/g, "");
    return {
      canonicalPhone: stripped,
      localPhone: stripped,
      displayPhone: stripped,
      cleanDigits: digits,
      isVietnam: false,
      countryCode: stripped.slice(0, 4),
    };
  }

  // Case E: Short emergency numbers / hotlines (113, 115, 156)
  if (/^\d{3,5}$/.test(stripped)) {
    return {
      canonicalPhone: stripped,
      localPhone: stripped,
      displayPhone: stripped,
      cleanDigits: stripped,
      isVietnam: true,
      countryCode: "+84",
    };
  }

  // Fallback
  const digitsOnly = stripped.replace(/\D/g, "");
  if (digitsOnly.length === 9 || digitsOnly.length === 10) {
    const canonical = "+84" + digitsOnly.replace(/^0+/, "");
    const local = "0" + digitsOnly.replace(/^0+/, "");
    return {
      canonicalPhone: canonical,
      localPhone: local,
      displayPhone: formatDottedVnPhone(local),
      cleanDigits: "84" + digitsOnly.replace(/^0+/, ""),
      isVietnam: true,
      countryCode: "+84",
    };
  }

  return {
    canonicalPhone: stripped.startsWith("+") ? stripped : "+" + stripped,
    localPhone: stripped,
    displayPhone: stripped,
    cleanDigits: digitsOnly,
    isVietnam: false,
    countryCode: "+",
  };
}

// Backward compatibility alias for normalizePhoneToE164
export function normalizePhoneToE164(rawInput: string) {
  const norm = normalizePhoneNumber(rawInput);
  return {
    e164: norm.canonicalPhone,
    localFormat: norm.localPhone,
    cleanDigits: norm.cleanDigits,
    isVietnam: norm.isVietnam,
    canonicalPhone: norm.canonicalPhone,
    displayPhone: norm.displayPhone,
  };
}

/**
 * Helper to format standard 10-digit VN phone to dotted style (e.g. 0948.913.212)
 */
export function formatDottedVnPhone(digits: string): string {
  const clean = digits.replace(/\D/g, "");
  if (clean.length === 10) {
    return `${clean.slice(0, 4)}.${clean.slice(4, 7)}.${clean.slice(7)}`;
  }
  return digits;
}

// =============================================================================
// 2. generatePhoneSearchVariants()
// When user inputs 0948913212, automatically generates:
// - "0948.913.212"
// - "0948 913 212"
// - "0948-913-212"
// - "0948913212"
// - "+84 948 913 212"
// - "+84948913212"
// =============================================================================
export function generatePhoneSearchVariants(rawPhone: string): {
  canonicalPhone: string;
  localPhone: string;
  displayPhone: string;
  quotedVariants: string[];
  rawVariants: string[];
  searchClause: string;
  e164: string;
  local: string;
} {
  const norm = normalizePhoneNumber(rawPhone);
  const localDigits = norm.localPhone.replace(/\D/g, "");
  const canonical = norm.canonicalPhone;

  const rawVariantsSet = new Set<string>();

  if (localDigits) {
    // Solid local: "0948913212"
    rawVariantsSet.add(localDigits);

    if (localDigits.length === 10) {
      const p1 = localDigits.slice(0, 4);
      const p2 = localDigits.slice(4, 7);
      const p3 = localDigits.slice(7);

      // Dotted format: "0948.913.212" (Crucial for police article matches!)
      rawVariantsSet.add(`${p1}.${p2}.${p3}`);

      // Spaced format: "0948 913 212"
      rawVariantsSet.add(`${p1} ${p2} ${p3}`);

      // Dashed format: "0948-913-212"
      rawVariantsSet.add(`${p1}-${p2}-${p3}`);

      // 3-3-4 alternative formats (e.g. 094 891 3212 or 094.891.3212)
      const a1 = localDigits.slice(0, 3);
      const a2 = localDigits.slice(3, 6);
      const a3 = localDigits.slice(6);
      rawVariantsSet.add(`${a1}.${a2}.${a3}`);
      rawVariantsSet.add(`${a1} ${a2} ${a3}`);
      rawVariantsSet.add(`${a1}-${a2}-${a3}`);
    }
  }

  if (canonical.startsWith("+84") && canonical.length >= 11) {
    const rest = canonical.substring(3);
    // International solid: "+84948913212"
    rawVariantsSet.add(canonical);

    // International spaced: "+84 948 913 212"
    if (rest.length === 9) {
      rawVariantsSet.add(`+84 ${rest.slice(0, 3)} ${rest.slice(3, 6)} ${rest.slice(6)}`);
      rawVariantsSet.add(`+84 ${rest.slice(0, 3)}.${rest.slice(3, 6)}.${rest.slice(6)}`);
    }
  } else if (canonical) {
    rawVariantsSet.add(canonical);
  }

  const rawVariants = Array.from(rawVariantsSet);
  const quotedVariants = rawVariants.map((v) => `"${v}"`);
  const searchClause = quotedVariants.join(" OR ");

  return {
    canonicalPhone: norm.canonicalPhone,
    localPhone: norm.localPhone,
    displayPhone: norm.displayPhone,
    quotedVariants,
    rawVariants,
    searchClause,
    e164: norm.canonicalPhone,
    local: norm.localPhone,
  };
}

// =============================================================================
// 3. extractPhoneNumbersFromSearchResult()
// Extracts and normalizes all phone numbers found in search text/snippets
// to canonical E.164 format.
// =============================================================================
export function extractPhoneNumbersFromSearchResult(text: string): string[] {
  if (!text || typeof text !== "string") return [];

  const foundCanonicals = new Set<string>();

  // Matches various formats: 0948.913.212, 0948 913 212, 0948-913-212, 0948913212, +84..., etc.
  const phonePattern = /(?:\+84|0084|0)(?:[\s.\-()]*\d){8,10}\b/gi;
  const matches = text.match(phonePattern) || [];

  for (const m of matches) {
    const norm = normalizePhoneNumber(m);
    if (norm.canonicalPhone && norm.canonicalPhone.length >= 10) {
      foundCanonicals.add(norm.canonicalPhone);
    }
  }

  // Also match general international format: +xxx...
  const intlPattern = /\+\d{1,4}(?:[\s.\-()]*\d){6,14}\b/gi;
  const intlMatches = text.match(intlPattern) || [];
  for (const im of intlMatches) {
    const norm = normalizePhoneNumber(im);
    if (norm.canonicalPhone) {
      foundCanonicals.add(norm.canonicalPhone);
    }
  }

  return Array.from(foundCanonicals);
}

// =============================================================================
// 4. compareNormalizedPhoneNumbers()
// Compares two phone number strings by their canonical E.164 representations.
// Returns true if both point to the exact same telephone number.
// =============================================================================
export function compareNormalizedPhoneNumbers(phoneA: string, phoneB: string): boolean {
  if (!phoneA || !phoneB) return false;
  const normA = normalizePhoneNumber(phoneA).canonicalPhone;
  const normB = normalizePhoneNumber(phoneB).canonicalPhone;
  if (!normA || !normB) return false;
  return normA === normB;
}

/**
 * Strict server-side verification of source URL.
 * NEVER trusts the model's claim about what domain a page belongs to.
 * Parses the actual URL and checks hostname against official allowlist.
 */
export function isStrictOfficialGovDomain(sourceUrl: string): {
  isOfficial: boolean;
  hostname: string;
  reason?: string;
} {
  if (!sourceUrl || typeof sourceUrl !== "string") {
    return { isOfficial: false, hostname: "", reason: "URL rỗng hoặc không hợp lệ" };
  }

  try {
    const parsed = new URL(sourceUrl.trim());
    const hostname = parsed.hostname.toLowerCase();

    // 1. Direct match with official hostnames
    if (STRICT_OFFICIAL_GOV_HOSTNAMES.includes(hostname)) {
      return { isOfficial: true, hostname };
    }

    // 2. Subdomains of bocongan.gov.vn (e.g. cuccsgt.bocongan.gov.vn)
    if (hostname.endsWith(".bocongan.gov.vn") || hostname === "bocongan.gov.vn") {
      return { isOfficial: true, hostname };
    }

    // 3. Subdomains of baochinhphu.vn or chinhphu.vn
    if (
      hostname.endsWith(".baochinhphu.vn") ||
      hostname === "baochinhphu.vn" ||
      hostname.endsWith(".chinhphu.vn") ||
      hostname === "chinhphu.vn"
    ) {
      return { isOfficial: true, hostname };
    }

    // 4. Any legitimate *.gov.vn government domain (e.g. congan.hanoi.gov.vn, mic.gov.vn, gdt.gov.vn, vncert.vn)
    if (hostname.endsWith(".gov.vn") || hostname === "gov.vn" || hostname.endsWith(".vncert.vn")) {
      return { isOfficial: true, hostname };
    }

    return {
      isOfficial: false,
      hostname,
      reason: "Tên miền không thuộc cơ quan Bộ Công an hoặc Cổng thông tin Chính phủ (.gov.vn)",
    };
  } catch {
    return { isOfficial: false, hostname: "", reason: "URL sai định dạng cú pháp" };
  }
}

// In-memory circuit breaker & cache to prevent 429 RESOURCE_EXHAUSTED rate-limit loops
let quotaCooldownUntil = 0;
const memoryPhoneCache = new Map<string, { result: PublicPhoneSearchResult; expiresAt: number }>();

/**
 * Searches public warnings using Gemini with Google Search Grounding tool.
 * Evaluates variants (dotted, spaced, dashed, solid, E.164) and strictly compares canonical phone.
 */
export async function searchPhoneWithGoogleGrounding(
  phone: string,
  aiClient?: GoogleGenAI
): Promise<PublicPhoneSearchResult> {
  const normTarget = normalizePhoneNumber(phone);
  const { quotedVariants, rawVariants, canonicalPhone, localPhone, displayPhone } =
    generatePhoneSearchVariants(phone);

  // 1. Check in-memory short-term cache
  const cachedEntry = memoryPhoneCache.get(canonicalPhone);
  if (cachedEntry && Date.now() < cachedEntry.expiresAt) {
    return cachedEntry.result;
  }

  // 2. Check if circuit breaker is active (e.g. recent 429 quota error)
  const now = Date.now();
  if (now < quotaCooldownUntil) {
    console.warn(
      `[GOOGLE_SEARCH_CIRCUIT_OPEN] Đang trong thời gian giãn cách hạn mức API (${Math.ceil((quotaCooldownUntil - now) / 1000)}s còn lại). Sử dụng dữ liệu đối soát an toàn.`
    );
    const fallbackResult: PublicPhoneSearchResult = {
      canonicalPhone,
      displayPhone,
      normalizedPhone: localPhone,
      e164: canonicalPhone,
      localFormat: localPhone,
      searchVariants: rawVariants,
      hasOfficialMatch: false,
      officialMatches: [],
      otherMatches: [],
      searchPerformed: false,
      searchedAt: new Date().toISOString(),
      status: "SEARCH_ERROR",
      statusMessage: "Hệ thống đang phục vụ lượng truy cập cao, tạm thời sử dụng đối soát dữ liệu nội bộ.",
    };
    return fallbackResult;
  }

  console.log(`[GOOGLE_SEARCH_STARTED] Tra cứu Google Search Grounding cho số: ${localPhone} (${canonicalPhone})`);

  const searchPrompt = `Bạn là hệ thống tra cứu và đối soát cảnh báo an ninh mạng.
Nhiệm vụ: Tìm kiếm chính xác trên Internet xem số điện thoại sau có từng xuất hiện trong các bài viết cảnh báo lừa đảo, thông báo thủ đoạn tội phạm hoặc quyết định xử phạt của BỘ CÔNG AN hoặc CƠ QUAN NHÀ NƯỚC VIỆT NAM hay không:

Các biến thể số điện thoại cần tìm chính xác trong dấu ngoặc kép:
${quotedVariants.join(", ")}

Yêu cầu tìm kiếm ưu tiên:
1. Tìm các bài viết chứa đúng một trong các biến thể trên (bao gồm cả dạng có dấu chấm như "${displayPhone}") tại các trang web chính thức:
   - www.bocongan.gov.vn / bocongan.gov.vn
   - *.bocongan.gov.vn (Cục CSGT, Cảnh sát điều tra...)
   - baochinhphu.vn / chinhphu.vn
   - cand.com.vn (Báo Công an nhân dân)
   - Các website cơ quan nhà nước có đuôi .gov.vn
2. Tìm các bài viết cảnh báo trên báo chí chính thống.

YÊU CẦU ĐẦU RA:
Trả về duy nhất một khối JSON thuần túy (không kèm markdown \`\`\`json thừa) với cấu trúc sau:
{
  "canonicalPhone": "${canonicalPhone}",
  "displayPhone": "${displayPhone}",
  "officialMatches": [
    {
      "title": "Tiêu đề chính xác của bài viết cảnh báo",
      "sourceUrl": "URL đầy đủ của bài viết trên bocongan.gov.vn hoặc *.gov.vn",
      "publishedAt": "Ngày đăng hoặc thời gian ghi nhận",
      "incidentCategory": "Loại thủ đoạn (ví dụ: Giả danh công an lừa đảo chiếm đoạt tiền / Mạo danh Dịch vụ công)",
      "description": "Mô tả ngắn gọn vụ việc liên quan đến số điện thoại này (1-2 câu)"
    }
  ],
  "otherMatches": [
    {
      "title": "Tiêu đề bài viết tham khảo",
      "sourceUrl": "URL bài viết tham khảo",
      "publishedAt": "Ngày đăng (nếu có)",
      "description": "Tóm tắt phản ánh"
    }
  ],
  "searchPerformed": true
}

LƯU Ý CỰC KỲ QUAN TRỌNG:
- Chỉ đưa vào "officialMatches" những bài viết có sourceUrl THẬT SỰ thuộc website cơ quan nhà nước hoặc Công an (.gov.vn, bocongan.gov.vn, baochinhphu.vn, cand.com.vn).
- Nếu không tìm thấy bài viết nào chứa số này, hãy để officialMatches: [] và otherMatches: [].`;

  try {
    const ai =
      aiClient ||
      new GoogleGenAI({
        apiKey: process.env.GEMINI_API_KEY,
        httpOptions: { headers: { "User-Agent": "aistudio-build" } },
      });

    // Use gemini-3.7-flash with Google Search Grounding tool enabled
    const response = await ai.models.generateContent({
      model: "gemini-3.7-flash",
      contents: searchPrompt,
      config: {
        tools: [{ googleSearch: {} }],
        temperature: 0.1,
      },
    });

    const responseText = response.text || "";
    let parsedJson: any = null;

    try {
      const cleaned = responseText
        .replace(/```json\s*/gi, "")
        .replace(/```\s*/g, "")
        .trim();
      parsedJson = JSON.parse(cleaned);
    } catch {
      const jsonMatch = responseText.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        try {
          parsedJson = JSON.parse(jsonMatch[0]);
        } catch {
          // ignore
        }
      }
    }

    const officialMatches: OfficialPhoneMatch[] = [];
    const otherMatches: ReferencePhoneMatch[] = [];

    // Process parsed JSON officialMatches with STRICT SERVER-SIDE VERIFICATION
    if (parsedJson && Array.isArray(parsedJson.officialMatches)) {
      for (const item of parsedJson.officialMatches) {
        if (!item.sourceUrl || !item.title) continue;

        const check = isStrictOfficialGovDomain(item.sourceUrl);
        if (check.isOfficial) {
          officialMatches.push({
            title: item.title,
            sourceUrl: item.sourceUrl,
            verifiedHostname: check.hostname,
            publishedAt: item.publishedAt || "Ghi nhận công khai",
            incidentCategory: item.incidentCategory || "Cảnh báo lừa đảo trực tuyến",
            category: item.incidentCategory || "Cảnh báo lừa đảo trực tuyến",
            description: item.description || "",
            matchedVariant: displayPhone,
            canonicalPhone: canonicalPhone,
            checkedAt: new Date().toISOString(),
          });
        } else {
          otherMatches.push({
            title: item.title,
            sourceUrl: item.sourceUrl,
            hostname: check.hostname,
            publishedAt: item.publishedAt,
            description: item.description,
            matchedVariant: displayPhone,
          });
        }
      }
    }

    if (parsedJson && Array.isArray(parsedJson.otherMatches)) {
      for (const item of parsedJson.otherMatches) {
        if (!item.sourceUrl || !item.title) continue;
        try {
          const parsed = new URL(item.sourceUrl);
          otherMatches.push({
            title: item.title,
            sourceUrl: item.sourceUrl,
            hostname: parsed.hostname,
            publishedAt: item.publishedAt,
            description: item.description,
            matchedVariant: displayPhone,
          });
        } catch {
          // ignore invalid url
        }
      }
    }

    // Inspect response grounding chunks for additional validated sources
    const candidate = response.candidates?.[0];
    const groundingMetadata = (candidate as any)?.groundingMetadata;
    if (groundingMetadata?.groundingChunks) {
      for (const chunk of groundingMetadata.groundingChunks) {
        const web = chunk.web;
        if (web && web.uri && web.title) {
          const check = isStrictOfficialGovDomain(web.uri);
          if (check.isOfficial) {
            const alreadyExists = officialMatches.some((m) => m.sourceUrl === web.uri);
            if (!alreadyExists) {
              officialMatches.push({
                title: web.title,
                sourceUrl: web.uri,
                verifiedHostname: check.hostname,
                publishedAt: "Cảnh báo Bộ Công an / Cổng TTĐT",
                incidentCategory: "Cảnh báo an ninh mạng chính thức",
                category: "Cảnh báo an ninh mạng chính thức",
                description: `Nguồn tài liệu chính thức từ ${check.hostname}.`,
                matchedVariant: displayPhone,
                canonicalPhone: canonicalPhone,
                checkedAt: new Date().toISOString(),
              });
            }
          }
        }
      }
    }

    const hasOfficialMatch = officialMatches.length > 0;

    if (hasOfficialMatch) {
      console.log(
        `[GOOGLE_SEARCH_MATCH] Tìm thấy ${officialMatches.length} bài viết cảnh báo chính thức cho số: ${canonicalPhone} (${officialMatches[0].verifiedHostname})`
      );
      const res: PublicPhoneSearchResult = {
        canonicalPhone,
        displayPhone,
        normalizedPhone: localPhone,
        e164: canonicalPhone,
        localFormat: localPhone,
        searchVariants: rawVariants,
        hasOfficialMatch: true,
        officialMatches,
        otherMatches,
        searchPerformed: true,
        searchedAt: new Date().toISOString(),
        status: "OFFICIAL_MATCH",
        riskLevel: "HIGH",
        statusMessage: `Từng xuất hiện trong cảnh báo chính thức của ${officialMatches[0].verifiedHostname}`,
      };
      // Cache verified match in memory for 24h
      memoryPhoneCache.set(canonicalPhone, { result: res, expiresAt: Date.now() + 24 * 3600 * 1000 });
      return res;
    } else {
      console.log(`[GOOGLE_SEARCH_NO_MATCH] Không tìm thấy cảnh báo chính thức cho số: ${canonicalPhone}`);
      const res: PublicPhoneSearchResult = {
        canonicalPhone,
        displayPhone,
        normalizedPhone: localPhone,
        e164: canonicalPhone,
        localFormat: localPhone,
        searchVariants: rawVariants,
        hasOfficialMatch: false,
        officialMatches: [],
        otherMatches,
        searchPerformed: true,
        searchedAt: new Date().toISOString(),
        status: "NO_MATCH",
        statusMessage:
          "Chưa tìm thấy trong các nguồn công khai đã kiểm tra — điều này không chứng minh số điện thoại an toàn.",
      };
      // Cache NO_MATCH in memory for 10 minutes to prevent re-querying and hitting 429
      memoryPhoneCache.set(canonicalPhone, { result: res, expiresAt: Date.now() + 10 * 60 * 1000 });
      return res;
    }
  } catch (error: any) {
    const errorMsg = error.message || String(error);
    const isQuota429 =
      errorMsg.includes("429") ||
      errorMsg.includes("RESOURCE_EXHAUSTED") ||
      errorMsg.includes("quota") ||
      errorMsg.includes("Rate limit");

    if (isQuota429) {
      // Cooldown for 45 seconds to let Gemini quota recover
      quotaCooldownUntil = Date.now() + 45 * 1000;
      console.warn(
        `[GOOGLE_SEARCH_QUOTA_COOLDOWN] Đạt giới hạn hạn mức API (429/RESOURCE_EXHAUSTED). Tạm thời bật cơ chế giãn cách 45s cho số: ${canonicalPhone}.`
      );
    } else if (errorMsg.includes("timeout") || errorMsg.includes("abort")) {
      console.error(`[GOOGLE_SEARCH_TIMEOUT] Hết thời gian chờ khi tìm kiếm cho số: ${canonicalPhone}`);
    } else {
      console.error(`[GOOGLE_SEARCH_ERROR] Lỗi tra cứu Google Search Grounding: ${errorMsg}`);
    }

    const fallbackResult: PublicPhoneSearchResult = {
      canonicalPhone,
      displayPhone,
      normalizedPhone: localPhone,
      e164: canonicalPhone,
      localFormat: localPhone,
      searchVariants: rawVariants,
      hasOfficialMatch: false,
      officialMatches: [],
      otherMatches: [],
      searchPerformed: false,
      searchedAt: new Date().toISOString(),
      status: "SEARCH_ERROR",
      statusMessage: isQuota429
        ? "Hệ thống đang phục vụ lượng truy cập cao, tạm thời sử dụng đối soát dữ liệu nội bộ."
        : "Chưa thể tra cứu nguồn công khai lúc này.",
    };

    // Cache temporary error for 2 minutes to prevent repeated quota hits
    memoryPhoneCache.set(canonicalPhone, { result: fallbackResult, expiresAt: Date.now() + 2 * 60 * 1000 });
    return fallbackResult;
  }
}
