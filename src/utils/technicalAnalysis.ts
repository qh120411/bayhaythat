// Technical Indicators Analysis Engine for "Bẫy Hay Thật ?"
// Prioritized technical scan: Phone -> URL/Domain -> Content -> Identity Mismatch -> Scoring

import { RiskLevel, CanonicalRiskLevel } from "../types";
import {
  maxRisk,
  mapStringToCanonicalRisk,
  mapCanonicalToLegacyVietnamese,
  CANONICAL_RISK_UI,
} from "./riskConfig";

export interface ExtractedPhone {
  raw: string;
  normalized: string;
  countryCode?: string;
  countryName?: string;
  isVietnam: boolean;
  isForeign: boolean;
  isSuspicious: boolean;
  suspicionReason?: string;
}

export interface ExtractedUrl {
  raw: string;
  normalized: string;
  protocol: string;
  hostname: string;
  subdomain: string;
  registrableDomain: string; // Tên miền đăng ký thật (e.g. eu.cc, dichvucong.gov.vn)
  tld: string;
  pathname: string;
  fullPath: string;
  hasDeceptivePath: boolean; // e.g. path contains 'dichvucong.gov', 'gov.vn', 'vietcombank'
  deceptiveKeywordsInPath: string[];
  isSuspiciousTld: boolean;
  isDirectIp: boolean;
  isShortenedUrl: boolean;
  explanation: string;
}

export interface ClaimedIdentity {
  name: string;
  type: "government" | "bank" | "telecom" | "ecommerce" | "other";
  normalizedOrgName: string;
  expectedDomainSuffixes: string[];
  expectedCountryCode: string;
}

export interface PhoneAnalysisResult {
  hasPhone: boolean;
  phones: ExtractedPhone[];
  isForeignSenderWithVnIdentity: boolean;
  summary: string;
  details: string[];
}

export interface UrlAnalysisResult {
  hasUrl: boolean;
  urls: ExtractedUrl[];
  hasDomainMismatch: boolean;
  hasPathDeception: boolean;
  summary: string;
  details: string[];
}

export interface ContentAnalysisResult {
  hasUrgencyOrThreat: boolean;
  urgencyDetails?: string;
  hasPaymentOrMoneyDemand: boolean;
  paymentDetails?: string;
  hasOtpOrCredentialsDemand: boolean;
  otpDetails?: string;
  hasAppDownloadOrRemoteAccess: boolean;
  appDetails?: string;
  hasLureToReplyForNewLink: boolean;
  lureDetails?: string;
  hasSecrecyDemand: boolean;
  hasFakeRewardOrInvestment: boolean;
  detectedSignals: string[];
}

export interface IdentityMismatchResult {
  hasConflict: boolean;
  claimedIdentity: string | null;
  claimedType?: string;
  senderPhoneCountry?: string;
  actualRegistrableDomain?: string;
  demandedAction?: string;
  conflictDescription?: string;
}

export interface ScoreItem {
  id: string;
  sign: string;
  points: number;
  evidence: string;
}

export interface RuleScoreResult {
  totalScore: number;
  riskLevel: RiskLevel;
  canonicalRiskLevel: CanonicalRiskLevel;
  scoreBreakdown: ScoreItem[];
  verdictSummary: string;
}

export interface FullTechnicalAnalysis {
  phoneAnalysis: PhoneAnalysisResult;
  urlAnalysis: UrlAnalysisResult;
  contentAnalysis: ContentAnalysisResult;
  identityMismatch: IdentityMismatchResult;
  scoring: RuleScoreResult;
  skipFollowUpQuestions: boolean;
}

// -----------------------------------------------------------------------------
// Country code map for common phone origins
// -----------------------------------------------------------------------------
const COUNTRY_CODES: Record<string, string> = {
  "+84": "Việt Nam",
  "+212": "Morocco (Ma-rốc)",
  "+1": "Mỹ / Canada",
  "+44": "Vương quốc Anh",
  "+855": "Campuchia",
  "+856": "Lào",
  "+63": "Philippines",
  "+86": "Trung Quốc",
  "+91": "Ấn Độ",
  "+234": "Nigeria",
  "+7": "Nga",
  "+49": "Đức",
  "+33": "Pháp",
  "+81": "Nhật Bản",
  "+82": "Hàn Quốc",
  "+66": "Thái Lan",
  "+65": "Singapore",
  "+60": "Malaysia",
  "+62": "Indonesia",
  "+880": "Bangladesh",
  "+92": "Pakistan",
  "+20": "Ai Cập",
  "+971": "UAE",
  "+27": "Nam Phi",
};

// Common suspicious / free / high-risk TLDs
const SUSPICIOUS_TLDS = new Set([
  "cc",
  "top",
  "xyz",
  "tk",
  "ga",
  "ml",
  "cf",
  "gq",
  "vip",
  "icu",
  "work",
  "click",
  "buzz",
  "fit",
  "rest",
  "cn",
  "ru",
  "to",
  "pw",
  "space",
  "club",
  "online",
  "site",
]);

// URL shortener domains
const SHORTENER_DOMAINS = new Set([
  "bit.ly",
  "tinyurl.com",
  "t.co",
  "is.gd",
  "buff.ly",
  "ow.ly",
  "goo.gl",
  "rebrand.ly",
  "cutt.ly",
  "shorturl.at",
  "t.me",
]);

// Government & Bank keywords for deception check in path/subdomain
const BRAND_OR_GOV_KEYWORDS = [
  { keyword: "dichvucong", label: "Cổng Dịch vụ công" },
  { keyword: "gov.vn", label: "Cơ quan Nhà nước (.gov.vn)" },
  { keyword: "gov", label: "Cơ quan Nhà nước (gov)" },
  { keyword: "congan", label: "Công an" },
  { keyword: "bocongan", label: "Bộ Công An" },
  { keyword: "toaan", label: "Tòa án" },
  { keyword: "vneid", label: "Ứng dụng VNeID" },
  { keyword: "vietcombank", label: "Ngân hàng Vietcombank" },
  { keyword: "techcombank", label: "Ngân hàng Techcombank" },
  { keyword: "mbbank", label: "Ngân hàng MB Bank" },
  { keyword: "bidv", label: "Ngân hàng BIDV" },
  { keyword: "agribank", label: "Ngân hàng Agribank" },
  { keyword: "vpbank", label: "Ngân hàng VPBank" },
  { keyword: "acb", label: "Ngân hàng ACB" },
  { keyword: "sacombank", label: "Ngân hàng Sacombank" },
  { keyword: "tpbank", label: "Ngân hàng TPBank" },
  { keyword: "vib", label: "Ngân hàng VIB" },
  { keyword: "viettel", label: "Viettel" },
  { keyword: "vnpt", label: "VNPT" },
  { keyword: "mobifone", label: "Mobifone" },
  { keyword: "shopee", label: "Shopee" },
  { keyword: "lazada", label: "Lazada" },
  { keyword: "tiki", label: "Tiki" },
  { keyword: "bhxh", label: "Bảo hiểm xã hội" },
  { keyword: "gdt.gov.vn", label: "Tổng cục Thuế" },
  { keyword: "evn", label: "Tập đoàn Điện lực EVN" },
];

// =============================================================================
// 1. extractAndNormalizePhoneNumbers()
// =============================================================================
export function extractAndNormalizePhoneNumbers(input: string): ExtractedPhone[] {
  if (!input) return [];

  const results: ExtractedPhone[] = [];
  const seenNormalized = new Set<string>();

  // Regex to match international format (+xxx...) and VN domestic format (03x, 05x, 07x, 08x, 09x, 1900, 1800, 02x)
  const phoneRegex = /(?:\+[\d\s\-().]{8,20})|(?:\b(?:00[\d\s\-().]{8,20}))|(?:\b(?:0[35789]\d[\s\-().]?\d{3}[\s\-().]?\d{3,4})\b)|(?:\b(?:02\d{1,2}[\s\-().]?\d{3,4}[\s\-().]?\d{3,4})\b)|(?:\b(?:1[89]00[\s\-().]?\d{3,5})\b)/gi;

  const matches = input.match(phoneRegex) || [];

  for (const raw of matches) {
    // Remove space, dash, dots, parentheses
    let clean = raw.replace(/[\s\-\(\)\.]/g, "");

    // Convert 00 prefix to +
    if (clean.startsWith("00")) {
      clean = "+" + clean.substring(2);
    }

    if (seenNormalized.has(clean)) continue;
    seenNormalized.add(clean);

    let countryCode: string | undefined;
    let countryName: string | undefined;
    let isVietnam = false;
    let isForeign = false;
    let isSuspicious = false;
    let suspicionReason: string | undefined;

    if (clean.startsWith("+")) {
      // Check 4-digit, 3-digit, 2-digit, 1-digit country prefixes
      for (const prefix of ["+855", "+856", "+971", "+880", "+212", "+234", "+84", "+44", "+49", "+33", "+81", "+82", "+66", "+65", "+60", "+62", "+86", "+91", "+92", "+20", "+27", "+1", "+7"]) {
        if (clean.startsWith(prefix)) {
          countryCode = prefix;
          countryName = COUNTRY_CODES[prefix] || `Mã quốc gia ${prefix}`;
          break;
        }
      }

      if (!countryCode) {
        // Fallback prefix extraction
        const genericMatch = clean.match(/^(\+\d{1,4})/);
        if (genericMatch) {
          countryCode = genericMatch[1];
          countryName = `Quốc tế (${countryCode})`;
        }
      }

      if (countryCode === "+84") {
        isVietnam = true;
      } else if (countryCode) {
        isForeign = true;
        isSuspicious = true;
        suspicionReason = `Số điện thoại nước ngoài (${countryName} - ${countryCode}) gửi cho người dùng Việt Nam.`;
      }
    } else if (clean.startsWith("0") || clean.startsWith("1800") || clean.startsWith("1900")) {
      isVietnam = true;
    }

    results.push({
      raw: raw.trim(),
      normalized: clean,
      countryCode,
      countryName,
      isVietnam,
      isForeign,
      isSuspicious,
      suspicionReason,
    });
  }

  return results;
}

// =============================================================================
// 2. analyzeSenderIdentity()
// =============================================================================
export function analyzeSenderIdentity(input: {
  phones: ExtractedPhone[];
  text: string;
}): PhoneAnalysisResult {
  const { phones, text } = input;
  const lower = text.toLowerCase();

  const details: string[] = [];
  let isForeignSenderWithVnIdentity = false;

  // Identify claimed organization in text
  const claimedOrg = identifyClaimedOrganization(text);

  if (phones.length > 0) {
    phones.forEach((phone) => {
      if (phone.isForeign) {
        const countryInfo = phone.countryName ? `${phone.countryName} (${phone.countryCode})` : phone.countryCode || "Quốc tế";
        details.push(`Phát hiện số điện thoại nước ngoài: "${phone.raw}" (Mã vùng: ${countryInfo}).`);

        if (claimedOrg) {
          isForeignSenderWithVnIdentity = true;
          details.push(
            `MÂU THUẪN NGHIÊM TRỌNG: Người gửi tự xưng là "${claimedOrg.name}" tại Việt Nam nhưng lại liên hệ từ đầu số nước ngoài ${countryInfo}.`
          );
        } else if (lower.includes("việt nam") || lower.includes("dịch vụ công") || lower.includes("phạt") || lower.includes("công an") || lower.includes("ngân hàng")) {
          isForeignSenderWithVnIdentity = true;
          details.push(`Số điện thoại nước ngoài (${countryInfo}) nhắn tin liên quan đến thủ tục/tổ chức tại Việt Nam.`);
        }
      } else {
        details.push(`Số điện thoại ghi nhận: "${phone.raw}". Lưu ý: Kẻ gian có thể dùng công nghệ VoIP để giả lập Brandname hoặc số hiển thị.`);
      }
    });
  } else {
    // Check if text mentions sender info like "Brandname: ...", "Từ: +212..."
    const foreignPattern = /(?:\+212|\+1|\+44|\+855|\+856|\+63|\+86|\+91|\+234|\+7|\+49|\+33)\s*[\d\s\-]{6,15}/i;
    const match = text.match(foreignPattern);
    if (match) {
      const extracted = extractAndNormalizePhoneNumbers(match[0]);
      if (extracted.length > 0) {
        phones.push(...extracted);
        const p = extracted[0];
        isForeignSenderWithVnIdentity = true;
        details.push(`Phát hiện số người gửi nước ngoài: "${p.raw}" (${p.countryName || p.countryCode}).`);
      }
    }
  }

  // Summary statement
  let summary = "";
  if (isForeignSenderWithVnIdentity) {
    const foreignPhones = phones.filter((p) => p.isForeign);
    const country = foreignPhones[0]?.countryName || "nước ngoài";
    summary = `Người gửi dùng số điện thoại từ ${country}, hoàn toàn mâu thuẫn với danh tính ${claimedOrg ? claimedOrg.name : "cơ quan/tổ chức Việt Nam"}.`;
  } else if (phones.some((p) => p.isForeign)) {
    summary = `Tin nhắn gửi từ số điện thoại nước ngoài (${phones.find((p) => p.isForeign)?.countryName}).`;
  } else if (phones.length > 0) {
    summary = `Ghi nhận số điện thoại liên hệ: ${phones.map((p) => p.raw).join(", ")}.`;
  } else {
    summary = "Không phát hiện số điện thoại rõ ràng trong nội dung.";
  }

  return {
    hasPhone: phones.length > 0,
    phones,
    isForeignSenderWithVnIdentity,
    summary,
    details,
  };
}

// =============================================================================
// Helper: identifyClaimedOrganization()
// =============================================================================
export function identifyClaimedOrganization(text: string): ClaimedIdentity | null {
  const lower = text.toLowerCase();

  // Government & Police
  if (
    lower.includes("bộ công an") ||
    lower.includes("ttdlqg") ||
    lower.includes("trung tâm dữ liệu quốc gia") ||
    lower.includes("công an") ||
    lower.includes("cảnh sát") ||
    lower.includes("dịch vụ công") ||
    lower.includes("vneid") ||
    lower.includes("tổng cục thuế") ||
    lower.includes("cục thuế") ||
    lower.includes("tòa án") ||
    lower.includes("viện kiểm sát") ||
    lower.includes("bảo hiểm xã hội") ||
    lower.includes("bhxh") ||
    lower.includes("bộ thông tin") ||
    lower.includes("cục an toàn thông tin")
  ) {
    let name = "Cơ quan Nhà nước / Công an Việt Nam";
    if (lower.includes("ttdlqg") || lower.includes("trung tâm dữ liệu quốc gia")) name = "TTDLQG - Bộ Công an";
    else if (lower.includes("bộ công an")) name = "Bộ Công an";
    else if (lower.includes("dịch vụ công")) name = "Cổng Dịch vụ công Quốc gia";
    else if (lower.includes("vneid")) name = "Hệ thống định danh VNeID";
    else if (lower.includes("cục thuế") || lower.includes("tổng cục thuế")) name = "Cơ quan Thuế";
    else if (lower.includes("tòa án")) name = "Tòa án Nhân dân";
    else if (lower.includes("viện kiểm sát")) name = "Viện Kiểm sát Nhân dân";

    return {
      name,
      type: "government",
      normalizedOrgName: "gov_vn",
      expectedDomainSuffixes: [".gov.vn", "dichvucong.gov.vn", "vneid.gov.vn", "bocongan.gov.vn", "gdt.gov.vn", "baohiemxahoi.gov.vn"],
      expectedCountryCode: "+84",
    };
  }

  // Banks
  const bankNames: Array<{ key: string; name: string; domains: string[] }> = [
    { key: "vietcombank", name: "Ngân hàng Vietcombank", domains: ["vietcombank.com.vn"] },
    { key: "techcombank", name: "Ngân hàng Techcombank", domains: ["techcombank.com", "techcombank.com.vn"] },
    { key: "mbbank", name: "Ngân hàng MB Bank", domains: ["mbbank.com.vn"] },
    { key: "bidv", name: "Ngân hàng BIDV", domains: ["bidv.com.vn"] },
    { key: "agribank", name: "Ngân hàng Agribank", domains: ["agribank.com.vn"] },
    { key: "vpbank", name: "Ngân hàng VPBank", domains: ["vpbank.com.vn"] },
    { key: "acb", name: "Ngân hàng ACB", domains: ["acb.com.vn"] },
    { key: "sacombank", name: "Ngân hàng Sacombank", domains: ["sacombank.com.vn"] },
    { key: "tpbank", name: "Ngân hàng TPBank", domains: ["tpb.vn", "tpbank.com.vn"] },
    { key: "vib", name: "Ngân hàng VIB", domains: ["vib.com.vn"] },
  ];

  for (const b of bankNames) {
    if (lower.includes(b.key)) {
      return {
        name: b.name,
        type: "bank",
        normalizedOrgName: b.key,
        expectedDomainSuffixes: b.domains,
        expectedCountryCode: "+84",
      };
    }
  }

  if (lower.includes("ngân hàng") || lower.includes("bank")) {
    return {
      name: "Ngân hàng / Tổ chức Tài chính",
      type: "bank",
      normalizedOrgName: "generic_bank",
      expectedDomainSuffixes: [".com.vn", ".vn", ".com"],
      expectedCountryCode: "+84",
    };
  }

  // Telecom / E-commerce
  if (lower.includes("viettel")) {
    return { name: "Tập đoàn Viettel", type: "telecom", normalizedOrgName: "viettel", expectedDomainSuffixes: ["viettel.vn", "vietteltelecom.vn"], expectedCountryCode: "+84" };
  }
  if (lower.includes("vnpt") || lower.includes("vinaphone")) {
    return { name: "VNPT / VinaPhone", type: "telecom", normalizedOrgName: "vnpt", expectedDomainSuffixes: ["vnpt.com.vn", "vinaphone.com.vn"], expectedCountryCode: "+84" };
  }
  if (lower.includes("shopee")) {
    return { name: "Sàn TMĐT Shopee", type: "ecommerce", normalizedOrgName: "shopee", expectedDomainSuffixes: ["shopee.vn"], expectedCountryCode: "+84" };
  }

  return null;
}

// =============================================================================
// 3. getRegistrableDomain() & extractAndNormalizeUrls()
// =============================================================================
/**
 * Accurately extracts the registrable domain (SLD + TLD) from a hostname
 * e.g. "500001.eu.cc" -> "eu.cc"
 *      "dichvucong.gov.vn" -> "dichvucong.gov.vn"
 *      "login.vietcombank.com.vn" -> "vietcombank.com.vn"
 *      "sub.example.co.uk" -> "example.co.uk"
 */
export function getRegistrableDomain(hostname: string): {
  registrableDomain: string;
  subdomain: string;
  tld: string;
} {
  const host = hostname.toLowerCase().trim().replace(/:\d+$/, ""); // Strip port

  // Multi-part country TLDs: .gov.vn, .com.vn, .edu.vn, .org.vn, .net.vn, .co.uk, .com.au, etc.
  const multiPartTlds = [
    "gov.vn",
    "com.vn",
    "edu.vn",
    "org.vn",
    "net.vn",
    "ac.vn",
    "co.uk",
    "gov.uk",
    "com.au",
    "co.jp",
    "com.sg",
    "co.th",
    "com.ph",
  ];

  const parts = host.split(".");
  if (parts.length <= 1) {
    return { registrableDomain: host, subdomain: "", tld: "" };
  }

  // Check multi-part TLD
  for (const m of multiPartTlds) {
    if (host.endsWith("." + m) || host === m) {
      const tldParts = m.split(".").length; // e.g. 2
      const hostParts = parts.length;
      if (hostParts >= tldParts + 1) {
        const regDomain = parts.slice(hostParts - (tldParts + 1)).join(".");
        const sub = parts.slice(0, hostParts - (tldParts + 1)).join(".");
        return { registrableDomain: regDomain, subdomain: sub, tld: m };
      }
      return { registrableDomain: host, subdomain: "", tld: m };
    }
  }

  // Standard 2-part domain (e.g. eu.cc, example.com, test.xyz, 500001.eu.cc)
  if (parts.length >= 2) {
    const tld = parts[parts.length - 1];
    const regDomain = parts.slice(-2).join(".");
    const sub = parts.slice(0, -2).join(".");
    return { registrableDomain: regDomain, subdomain: sub, tld };
  }

  return { registrableDomain: host, subdomain: "", tld: parts[parts.length - 1] || "" };
}

export function extractAndNormalizeUrls(input: string): ExtractedUrl[] {
  if (!input) return [];

  const results: ExtractedUrl[] = [];
  const seenUrls = new Set<string>();

  // Regex to extract full URLs (http/https) and bare domains with path (e.g. 500001.eu.cc/dichvucong.gov/vn)
  const urlRegex = /(?:https?:\/\/|www\.)[^\s<>"'{}|\\^`[\]]+|(?:[a-zA-Z0-9-]+\.)+[a-zA-Z]{2,}(?:\/[^\s<>"'{}|\\^`[\]]*)?/gi;

  const matches = input.match(urlRegex) || [];

  for (let raw of matches) {
    // Strip trailing punctuation like ., ), ,, ;
    raw = raw.replace(/[.,;:!?\)]+$/, "").trim();
    if (!raw || raw.length < 4) continue;

    let fullUrlString = raw;
    let protocol = "https://";

    if (raw.startsWith("http://") || raw.startsWith("https://")) {
      protocol = raw.startsWith("https://") ? "https://" : "http://";
    } else {
      fullUrlString = "https://" + raw;
    }

    if (seenUrls.has(fullUrlString.toLowerCase())) continue;
    seenUrls.add(fullUrlString.toLowerCase());

    try {
      const parsed = new URL(fullUrlString);
      const hostname = parsed.hostname.toLowerCase();
      const pathname = parsed.pathname || "/";
      const fullPath = pathname + (parsed.search || "");

      const { registrableDomain, subdomain, tld } = getRegistrableDomain(hostname);

      const isDirectIp = /^(\d{1,3}\.){3}\d{1,3}$/.test(hostname);
      const isShortenedUrl = SHORTENER_DOMAINS.has(registrableDomain) || SHORTENER_DOMAINS.has(hostname);
      const isSuspiciousTld = SUSPICIOUS_TLDS.has(tld.toLowerCase()) || isDirectIp;

      // Check if government or bank brands appear in path or subdomain while actual domain is NOT gov/bank
      const pathAndSub = (subdomain + "/" + fullPath).toLowerCase();
      const deceptiveKeywordsInPath: string[] = [];

      for (const brand of BRAND_OR_GOV_KEYWORDS) {
        if (pathAndSub.includes(brand.keyword.toLowerCase())) {
          // If the registrable domain does NOT actually contain this brand
          if (!registrableDomain.includes(brand.keyword.toLowerCase())) {
            deceptiveKeywordsInPath.push(brand.label);
          }
        }
      }

      const hasDeceptivePath = deceptiveKeywordsInPath.length > 0;

      // Build crystal-clear educational explanation of the actual domain
      let explanation = `Tên miền đăng ký thật là "${registrableDomain}".`;
      if (hasDeceptivePath) {
        explanation += ` Chú ý: Đoạn "${pathname}" chỉ là đường dẫn do kẻ gian tự đặt trên máy chủ ${registrableDomain} để đánh lừa người dùng tưởng là trang chính thống.`;
      }
      if (protocol === "https://") {
        explanation += ` (Lưu ý: Biểu tượng ổ khóa/HTTPS chỉ mã hóa đường truyền, KHÔNG chứng minh website an toàn hay hợp pháp).`;
      }

      results.push({
        raw,
        normalized: fullUrlString,
        protocol,
        hostname,
        subdomain,
        registrableDomain,
        tld,
        pathname,
        fullPath,
        hasDeceptivePath,
        deceptiveKeywordsInPath,
        isSuspiciousTld,
        isDirectIp,
        isShortenedUrl,
        explanation,
      });
    } catch {
      // Ignore unparseable fragments
    }
  }

  return results;
}

// =============================================================================
// 4. analyzeDomainMismatch()
// =============================================================================
export function analyzeDomainMismatch(input: {
  urls: ExtractedUrl[];
  claimedOrg: ClaimedIdentity | null;
  text: string;
}): UrlAnalysisResult {
  const { urls, claimedOrg, text } = input;
  const details: string[] = [];

  let hasDomainMismatch = false;
  let hasPathDeception = false;

  urls.forEach((url) => {
    // Explanation of anatomy
    details.push(
      `Đường link: "${url.raw}" -> Giao thức: ${url.protocol.replace("://", "")} | Subdomain: ${url.subdomain || "(không có)"} | TÊN MIỀN THẬT: "${url.registrableDomain}" | Đường dẫn: "${url.pathname}".`
    );

    // Deceptive path warning (e.g. /dichvucong.gov/vn on eu.cc)
    if (url.hasDeceptivePath) {
      hasPathDeception = true;
      hasDomainMismatch = true;
      details.push(
        `DẤU HIỆU LỪA ĐẢO TÊN MIỀN: Tên miền đăng ký thật là "${url.registrableDomain}", KHÔNG PHẢI cổng thông tin chính phủ (.gov.vn). Từ khóa "${url.deceptiveKeywordsInPath.join(", ")}" chỉ xuất hiện trong đường dẫn phía sau để ngụy trang giả mạo.`
      );
    }

    // Check mismatch against claimed organization
    if (claimedOrg) {
      const isMatchingExpected = claimedOrg.expectedDomainSuffixes.some((suffix) =>
        url.hostname.endsWith(suffix) || url.registrableDomain === suffix
      );

      if (!isMatchingExpected) {
        hasDomainMismatch = true;
        details.push(
          `MÂU THUẪN DANH TÍNH VÀ TÊN MIỀN: Tự xưng "${claimedOrg.name}" nhưng dẫn tới tên miền "${url.registrableDomain}". Trang chính thức phải thuộc tên miền ${claimedOrg.expectedDomainSuffixes.join(" hoặc ")}.`
        );
      }
    } else {
      // General check for Gov/Bank claims in text
      const lower = text.toLowerCase();
      if ((lower.includes("dịch vụ công") || lower.includes("bộ công an") || lower.includes("nộp phạt")) && !url.registrableDomain.endsWith(".gov.vn")) {
        hasDomainMismatch = true;
        details.push(
          `Tên miền "${url.registrableDomain}" không phải tên miền cơ quan nhà nước Việt Nam (.gov.vn). Mọi dịch vụ công và nộp phạt trực tuyến bắt buộc phải có đuôi .gov.vn.`
        );
      }
    }

    // Suspicious TLD / IP
    if (url.isSuspiciousTld) {
      details.push(
        `Tên miền sử dụng phần mở rộng rủi ro cao/miễn phí (.${url.tld}), thường được tội phạm mạng sử dụng để tạo trang lừa đảo ngắn hạn.`
      );
    }

    if (url.isShortenedUrl) {
      details.push(`Sử dụng dịch vụ rút gọn liên kết (${url.registrableDomain}) để che giấu trang đích thực sự.`);
    }
  });

  let summary = "";
  if (hasPathDeception || hasDomainMismatch) {
    const firstUrl = urls[0];
    summary = `Đường link dẫn tới tên miền giả mạo "${firstUrl ? firstUrl.registrableDomain : "lạ"}" (chứa đường dẫn ngụy trang thương hiệu).`;
  } else if (urls.length > 0) {
    summary = `Phát hiện ${urls.length} liên kết với tên miền: ${urls.map((u) => u.registrableDomain).join(", ")}.`;
  } else {
    summary = "Không phát hiện liên kết website trong nội dung.";
  }

  return {
    hasUrl: urls.length > 0,
    urls,
    hasDomainMismatch,
    hasPathDeception,
    summary,
    details,
  };
}

// =============================================================================
// 5. analyzeContentSignals()
// =============================================================================
export function analyzeContentSignals(text: string): ContentAnalysisResult {
  const lower = text.toLowerCase();
  const detectedSignals: string[] = [];

  // Urgency & Threats
  const urgencyPattern = /(?:trong vòng\s+\d+\s*(?:giờ|tiếng|phút|ngày)|trong\s+\d+\s*h|hạn chót|khẩn cấp|ngay lập tức|ngay bây giờ|ngay\b|trước\s+\d+h|bắt giữ|tạm giam|khởi tố|phong tỏa tài khoản|cắt điện|khóa sim|tăng mức phạt|hủy quà|hết hạn|lệnh triệu tập|điều tra|truy nã|hầu tòa|viện kiểm sát|rửa tiền|đường dây tội phạm)/i;
  const hasUrgencyOrThreat = urgencyPattern.test(text) || lower.includes("trong 48 giờ") || lower.includes("trong 24 giờ") || lower.includes("48h") || lower.includes("24h") || lower.includes("bắt giam") || lower.includes("triệu tập") || lower.includes("rửa tiền");

  let urgencyDetails: string | undefined;
  if (hasUrgencyOrThreat) {
    const match = text.match(urgencyPattern);
    urgencyDetails = match ? `Gây áp lực thời hạn / đe dọa: "${match[0]}"` : "Gây áp lực thời hạn gấp rút (48 giờ/24 giờ).";
    detectedSignals.push("Gây áp lực thời gian, đe dọa tăng phạt hoặc phong tỏa tài khoản.");
  }

  // Payment / Money demand
  const paymentPattern = /(?:thanh toán|nộp phạt|chuyển tiền|nộp tiền|đóng phí|chuyển khoản|thanh toán phạt|phí mở khóa|tiền cọc|phí bảo lưu|phí ship|tiền bảo hiểm|nạp tiền|bảo lãnh|tiền bảo lãnh|nộp\s+\d+|chuyển\s+\d+)/i;
  const hasPaymentOrMoneyDemand = paymentPattern.test(text) || lower.includes("thanh toán phạt") || lower.includes("chuyển tiền") || lower.includes("nộp phạt") || lower.includes("bảo lãnh");

  let paymentDetails: string | undefined;
  if (hasPaymentOrMoneyDemand) {
    paymentDetails = "Yêu cầu thanh toán tiền / nộp phạt trực tuyến.";
    detectedSignals.push("Yêu cầu chuyển tiền / nộp phạt tài chính.");
  }

  // OTP / Credentials demand
  const otpPattern = /(?:mã otp|otp|mật khẩu|mã pin|số thẻ|thông tin thẻ|smart otp|cvv)/i;
  const hasOtpOrCredentialsDemand = otpPattern.test(text) || lower.includes("nhập otp") || lower.includes("cung cấp mật khẩu");

  let otpDetails: string | undefined;
  if (hasOtpOrCredentialsDemand) {
    otpDetails = "Yêu cầu cung cấp mã OTP, mật khẩu hoặc số thẻ ngân hàng.";
    detectedSignals.push("Đòi mã OTP / thông tin bảo mật tài khoản.");
  }

  // APK / Remote access
  const appPattern = /(?:\.apk|cài app|tải ứng dụng|chia sẻ màn hình|bật trợ năng|cài đặt phần mềm)/i;
  const hasAppDownloadOrRemoteAccess = appPattern.test(text) || lower.includes(".apk") || lower.includes("tải app");

  let appDetails: string | undefined;
  if (hasAppDownloadOrRemoteAccess) {
    appDetails = "Yêu cầu tải file APK hoặc cài ứng dụng lạ.";
    detectedSignals.push("Yêu cầu cài file .APK hoặc phần mềm lạ.");
  }

  // Lure to reply to receive new link (e.g. "trả lời 1 hoặc Y để nhận link mới")
  const lurePattern = /(?:trả lời\s+["'“”]?([1-9]|y|yes|ok|dong y|đồng ý)["'“”]?\s+để\s+(?:nhận|tiếp tục|xác nhận|gửi)|nhắn\s+["'“”]?(?:1|y)["'“”]?\s+để|soạn\s+["'“”]?(?:1|y)["'“”]?|reply\s+(?:1|y))/i;
  const hasLureToReplyForNewLink =
    lurePattern.test(text) ||
    (lower.includes("trả lời") && (lower.includes("để nhận link") || lower.includes("nhận link mới") || lower.includes("“1”") || lower.includes('"1"') || lower.includes("“y”") || lower.includes('"y"')));

  let lureDetails: string | undefined;
  if (hasLureToReplyForNewLink) {
    lureDetails = "Dụ dỗ người dùng trả lời tin nhắn (ví dụ: soạn '1' hoặc 'Y') để qua mặt bộ lọc tin nhắn rác của nhà mạng và gửi link lừa đảo.";
    detectedSignals.push("Dụ trả lời '1' hoặc 'Y' để kích hoạt liên kết mới.");
  }

  // Secrecy demand
  const hasSecrecyDemand = lower.includes("giữ bí mật") || lower.includes("không nói cho ai") || lower.includes("một mình vào phòng kín");
  if (hasSecrecyDemand) {
    detectedSignals.push("Yêu cầu giữ bí mật và cô lập nạn nhân với người thân.");
  }

  // Fake Reward / Guaranteed Investment
  const hasFakeRewardOrInvestment = lower.includes("nhận quà") || lower.includes("trúng thưởng") || lower.includes("cam kết lợi nhuận") || lower.includes("hoa hồng");
  if (hasFakeRewardOrInvestment) {
    detectedSignals.push("Mồi chài nhận quà, trúng thưởng hoặc đầu tư siêu lợi nhuận.");
  }

  return {
    hasUrgencyOrThreat,
    urgencyDetails,
    hasPaymentOrMoneyDemand,
    paymentDetails,
    hasOtpOrCredentialsDemand,
    otpDetails,
    hasAppDownloadOrRemoteAccess,
    appDetails,
    hasLureToReplyForNewLink,
    lureDetails,
    hasSecrecyDemand,
    hasFakeRewardOrInvestment,
    detectedSignals,
  };
}

// =============================================================================
// 6. calculateRuleBasedRisk()
// =============================================================================
export function calculateRuleBasedRisk(params: {
  phoneAnalysis: PhoneAnalysisResult;
  urlAnalysis: UrlAnalysisResult;
  contentAnalysis: ContentAnalysisResult;
  claimedOrg: ClaimedIdentity | null;
  rawText: string;
}): RuleScoreResult {
  const { phoneAnalysis, urlAnalysis, contentAnalysis, claimedOrg, rawText = "" } = params;
  const scoreBreakdown: ScoreItem[] = [];

  // 1. Số nước ngoài không phù hợp danh tính tự xưng: +25 điểm
  if (phoneAnalysis.isForeignSenderWithVnIdentity) {
    const foreignPhone = phoneAnalysis.phones.find((p) => p.isForeign);
    scoreBreakdown.push({
      id: "foreign_phone_mismatch",
      sign: "Số điện thoại nước ngoài mạo danh cơ quan/tổ chức Việt Nam",
      points: 25,
      evidence: `Người gửi dùng đầu số ${foreignPhone ? foreignPhone.countryName : "nước ngoài"} (${foreignPhone ? foreignPhone.raw : ""}) tự xưng là "${claimedOrg ? claimedOrg.name : "cơ quan Việt Nam"}".`,
    });
  }

  // 2. Tên miền không khớp tổ chức: +40 điểm
  if (urlAnalysis.hasDomainMismatch) {
    const mismatchUrl = urlAnalysis.urls[0];
    scoreBreakdown.push({
      id: "domain_mismatch",
      sign: "Tên miền đăng ký thật không khớp với tổ chức tự xưng",
      points: 40,
      evidence: `Tên miền thật là "${mismatchUrl ? mismatchUrl.registrableDomain : "không chính thống"}", hoàn toàn không phải website của ${claimedOrg ? claimedOrg.name : "cơ quan chức năng"}.`,
    });
  }

  // 3. Giả danh cơ quan nhà nước/ngân hàng: +25 điểm
  if (claimedOrg && (phoneAnalysis.isForeignSenderWithVnIdentity || urlAnalysis.hasDomainMismatch || urlAnalysis.hasPathDeception)) {
    scoreBreakdown.push({
      id: "impersonation_authority",
      sign: `Giả mạo danh tính ${claimedOrg.name}`,
      points: 25,
      evidence: `Tự xưng danh tính "${claimedOrg.name}" nhưng sử dụng các kênh liên lạc giả mạo và đường dẫn không chính thống.`,
    });
  }

  // 4. Yêu cầu thanh toán hoặc cung cấp OTP: +40 điểm
  if (contentAnalysis.hasPaymentOrMoneyDemand || contentAnalysis.hasOtpOrCredentialsDemand) {
    scoreBreakdown.push({
      id: "payment_or_otp_demand",
      sign: "Yêu cầu thanh toán tiền, nộp phí hoặc cung cấp mã OTP/thông tin thẻ",
      points: 40,
      evidence: contentAnalysis.paymentDetails || contentAnalysis.otpDetails || "Yêu cầu nộp phạt/thanh toán tiền từ xa.",
    });
  }

  // 5. Thúc ép, đe dọa hoặc tạo thời hạn: +20 điểm
  if (contentAnalysis.hasUrgencyOrThreat) {
    scoreBreakdown.push({
      id: "urgency_threat_deadline",
      sign: "Thúc ép thời gian gấp rút hoặc đe dọa chế tài",
      points: 20,
      evidence: contentAnalysis.urgencyDetails || "Đặt thời hạn thanh toán gấp (48h/24h) nhằm gây hoảng loạn tâm lý.",
    });
  }

  // 6. Dụ trả lời để nhận link khác: +15 điểm
  if (contentAnalysis.hasLureToReplyForNewLink) {
    scoreBreakdown.push({
      id: "lure_reply_for_link",
      sign: "Dụ dỗ trả lời tin nhắn (ví dụ: '1' hoặc 'Y') để nhận liên kết mới",
      points: 15,
      evidence: "Thủ đoạn lách bộ lọc tin nhắn rác của nhà mạng bằng cách yêu cầu nạn nhân tương tác hai chiều trước khi gửi link độc.",
    });
  }

  // 7. Link chứa tên thương hiệu trong path/subdomain nhưng domain thật không liên quan: +30 điểm
  if (urlAnalysis.hasPathDeception) {
    const deceptiveUrl = urlAnalysis.urls.find((u) => u.hasDeceptivePath);
    scoreBreakdown.push({
      id: "deceptive_path_brand",
      sign: "Chèn từ khóa cơ quan nhà nước vào đường dẫn trên tên miền lạ",
      points: 30,
      evidence: `Đường dẫn chứa "${deceptiveUrl ? deceptiveUrl.pathname : "dichvucong.gov/vn"}" trên tên miền thật "${deceptiveUrl ? deceptiveUrl.registrableDomain : "lạ"}".`,
    });
  }

  // Additional severe factors
  if (contentAnalysis.hasAppDownloadOrRemoteAccess) {
    scoreBreakdown.push({
      id: "apk_app_download",
      sign: "Yêu cầu cài đặt ứng dụng APK / phần mềm lạ",
      points: 35,
      evidence: contentAnalysis.appDetails || "Dấu hiệu cài mã độc điều khiển thiết bị.",
    });
  }

  // 8. Ambiguous / Self-proclaimed caller requiring verification
  const lowerRaw = rawText.toLowerCase();
  const isAmbiguousCaller =
    (lowerRaw.includes("tự xưng") || lowerRaw.includes("shipper") || lowerRaw.includes("gọi điện")) &&
    scoreBreakdown.length === 0;

  if (isAmbiguousCaller) {
    scoreBreakdown.push({
      id: "ambiguous_caller_verify",
      sign: "Người lạ tự xưng danh tính cần làm rõ thông tin",
      points: 20,
      evidence: "Thông tin chưa đủ để kết luận ngay, cần đặt câu hỏi làm rõ để tránh phán đoán vội vàng.",
    });
  }

  const totalScore = scoreBreakdown.reduce((sum, item) => sum + item.points, 0);

  // Canonical Scoring Thresholds:
  // 0–19: SAFE ("Chưa thấy dấu hiệu nguy hiểm rõ ràng")
  // 20–39: VERIFY ("Cần thận trọng và xác minh")
  // 40–69: HIGH ("Rủi ro cao")
  // >= 70: CRITICAL ("Nguy hiểm — dấu hiệu lừa đảo rõ ràng")
  let canonicalRiskLevel: CanonicalRiskLevel = "SAFE";
  let riskLevel: RiskLevel = "Chưa thấy dấu hiệu rõ ràng";

  if (totalScore >= 70) {
    canonicalRiskLevel = "CRITICAL";
    riskLevel = "Rủi ro rất cao";
  } else if (totalScore >= 40) {
    canonicalRiskLevel = "HIGH";
    riskLevel = "Rủi ro cao";
  } else if (totalScore >= 20) {
    canonicalRiskLevel = "VERIFY";
    riskLevel = "Cần thận trọng";
  }

  let verdictSummary = "";
  if (canonicalRiskLevel === "CRITICAL") {
    verdictSummary = "Nguy hiểm — phát hiện nhiều dấu hiệu giả mạo danh tính, tên miền lừa đảo và thúc ép chuyển tiền rõ ràng.";
  } else if (canonicalRiskLevel === "HIGH") {
    verdictSummary = "Rủi ro cao — phát hiện các dấu hiệu lừa đảo nguy hiểm trực tiếp.";
  } else if (canonicalRiskLevel === "VERIFY") {
    verdictSummary = "Cần thận trọng — tình huống có dấu hiệu bất thường, cần xác minh độc lập.";
  } else {
    verdictSummary = "Chưa thấy dấu hiệu rủi ro rõ ràng dựa trên dữ liệu hiện tại.";
  }

  return {
    totalScore,
    riskLevel,
    canonicalRiskLevel,
    scoreBreakdown,
    verdictSummary,
  };
}

// =============================================================================
// Comprehensive Technical Scanner Pipeline
// =============================================================================
export function runTechnicalAnalysis(input: {
  text: string;
  linkUrl?: string;
}): FullTechnicalAnalysis {
  const combinedText = `${input.text || ""} ${input.linkUrl || ""}`.trim();

  // 1. SENDER AND PHONE NUMBER
  const phones = extractAndNormalizePhoneNumbers(combinedText);
  const phoneAnalysis = analyzeSenderIdentity({ phones, text: combinedText });

  // 2. URL AND ACTUAL REGISTRABLE DOMAIN
  const urls = extractAndNormalizeUrls(combinedText);
  const claimedOrg = identifyClaimedOrganization(combinedText);
  const urlAnalysis = analyzeDomainMismatch({ urls, claimedOrg, text: combinedText });

  // 3. CONTENT AND ACTIONS
  const contentAnalysis = analyzeContentSignals(combinedText);

  // 4. IDENTITY MISMATCH
  const identityMismatch: IdentityMismatchResult = {
    hasConflict: phoneAnalysis.isForeignSenderWithVnIdentity || urlAnalysis.hasDomainMismatch || urlAnalysis.hasPathDeception,
    claimedIdentity: claimedOrg ? claimedOrg.name : null,
    claimedType: claimedOrg ? claimedOrg.type : undefined,
    senderPhoneCountry: phones.find((p) => p.isForeign)?.countryName,
    actualRegistrableDomain: urls[0]?.registrableDomain,
    demandedAction: contentAnalysis.hasPaymentOrMoneyDemand
      ? "Thanh toán tiền / nộp phạt"
      : contentAnalysis.hasOtpOrCredentialsDemand
      ? "Cung cấp OTP / thông tin thẻ"
      : undefined,
    conflictDescription:
      phoneAnalysis.isForeignSenderWithVnIdentity || urlAnalysis.hasDomainMismatch
        ? `Tự xưng "${claimedOrg ? claimedOrg.name : "Cơ quan Nhà nước"}" nhưng liên hệ từ ${
            phones.find((p) => p.isForeign)?.countryName || "số nước ngoài"
          } và dẫn tới tên miền "${urls[0]?.registrableDomain || "lạ"}".`
        : undefined,
  };

  // 5. SCORING
  const scoring = calculateRuleBasedRisk({
    phoneAnalysis,
    urlAnalysis,
    contentAnalysis,
    claimedOrg,
    rawText: combinedText,
  });

  // If score >= 40 (HIGH or CRITICAL), DO NOT ask follow-up questions to delay the warning
  const skipFollowUpQuestions = scoring.totalScore >= 40 || scoring.canonicalRiskLevel === "HIGH" || scoring.canonicalRiskLevel === "CRITICAL";

  return {
    phoneAnalysis,
    urlAnalysis,
    contentAnalysis,
    identityMismatch,
    scoring,
    skipFollowUpQuestions,
  };
}

// =============================================================================
// 7. mergeRuleRiskWithAiResult()
// =============================================================================
export function mergeRuleRiskWithAiResult(
  techAnalysis: FullTechnicalAnalysis,
  aiResult: any
): any {
  const ruleBasedRiskLevel: CanonicalRiskLevel = techAnalysis.scoring.canonicalRiskLevel;
  let aiRiskLevel: CanonicalRiskLevel = mapStringToCanonicalRisk(aiResult?.aiRiskLevel || aiResult?.muc_rui_ro);

  // 1. Structured detection of severe threats (Non-downgrade rule)
  const hasSevereThreatSignals =
    techAnalysis.scoring.totalScore >= 20 ||
    techAnalysis.phoneAnalysis.isForeignSenderWithVnIdentity ||
    techAnalysis.urlAnalysis.hasDomainMismatch ||
    techAnalysis.urlAnalysis.hasPathDeception ||
    techAnalysis.urlAnalysis.urls.some((u) => u.isSuspiciousTld || u.isDirectIp || u.isShortenedUrl || u.hasDeceptivePath) ||
    techAnalysis.contentAnalysis.hasPaymentOrMoneyDemand ||
    techAnalysis.contentAnalysis.hasOtpOrCredentialsDemand ||
    techAnalysis.contentAnalysis.hasAppDownloadOrRemoteAccess ||
    techAnalysis.identityMismatch.hasConflict;

  // 2. Structured detection of truly benign inputs (SAFE rule)
  // All conditions must be satisfied:
  // - technicalScore < 20
  // - no suspicious signals (scoreBreakdown is empty)
  // - no payment, OTP, password, or app installation demand
  // - no urgency or threat
  // - no lure to reply for link
  // - no suspicious URL or phone
  // - no identity conflict
  const isTrulyBenign =
    techAnalysis.scoring.totalScore < 20 &&
    techAnalysis.scoring.scoreBreakdown.length === 0 &&
    !techAnalysis.contentAnalysis.hasPaymentOrMoneyDemand &&
    !techAnalysis.contentAnalysis.hasOtpOrCredentialsDemand &&
    !techAnalysis.contentAnalysis.hasAppDownloadOrRemoteAccess &&
    !techAnalysis.contentAnalysis.hasUrgencyOrThreat &&
    !techAnalysis.contentAnalysis.hasLureToReplyForNewLink &&
    !techAnalysis.identityMismatch.hasConflict &&
    (!techAnalysis.urlAnalysis.hasUrl ||
      (!techAnalysis.urlAnalysis.hasDomainMismatch &&
        !techAnalysis.urlAnalysis.hasPathDeception &&
        !techAnalysis.urlAnalysis.urls.some((u) => u.isSuspiciousTld || u.isDirectIp || u.isShortenedUrl || u.hasDeceptivePath))) &&
    (!techAnalysis.phoneAnalysis.hasPhone ||
      (!techAnalysis.phoneAnalysis.isForeignSenderWithVnIdentity &&
        !techAnalysis.phoneAnalysis.phones.some((p) => p.isSuspicious || p.isForeign)));

  let finalRiskLevel: CanonicalRiskLevel;
  if (isTrulyBenign) {
    // Force SAFE/LOW when all technical and content criteria confirm benign nature
    finalRiskLevel = "SAFE";
  } else if (hasSevereThreatSignals && aiRiskLevel === "SAFE") {
    // Never allow AI to downgrade when severe threats are detected
    finalRiskLevel = ruleBasedRiskLevel !== "SAFE" ? ruleBasedRiskLevel : "HIGH";
  } else {
    finalRiskLevel = maxRisk(ruleBasedRiskLevel, aiRiskLevel);
  }

  // Canonical UI metadata from single source of truth
  const canonicalUI = CANONICAL_RISK_UI[finalRiskLevel];

  // Disable follow-up questions if high or critical
  const shouldSkipQuestions =
    techAnalysis.skipFollowUpQuestions ||
    finalRiskLevel === "CRITICAL" ||
    finalRiskLevel === "HIGH";

  // Build high-priority immediate actions
  let primaryActions: string[] = [...(canonicalUI.defaultActions)];

  if (finalRiskLevel === "SAFE") {
    primaryActions = ["Nếu nội dung hoặc yêu cầu thay đổi, hãy kiểm tra lại trước khi thực hiện giao dịch."];
  } else if (techAnalysis.contentAnalysis.hasLureToReplyForNewLink) {
    primaryActions.unshift("KHÔNG trả lời tin nhắn (không soạn '1', 'Y' hay bất kỳ ký tự nào) để tránh bị gửi thêm liên kết độc hại.");
  }

  // Merge evidence from technical indicators
  const mergedEvidence: Array<{ noi_dung: string; nguon: "tinh_huong_ban_dau" | "cau_tra_loi_bo_sung"; y_nghia: string }> = [
    ...(aiResult?.bang_chung_da_co || []),
  ];

  // Add phone evidence if foreign or mismatched
  if (techAnalysis.phoneAnalysis.isForeignSenderWithVnIdentity) {
    const foreignP = techAnalysis.phoneAnalysis.phones.find((p) => p.isForeign);
    mergedEvidence.unshift({
      noi_dung: `Người gửi dùng số điện thoại nước ngoài: "${foreignP ? foreignP.raw : ""}" (${foreignP ? foreignP.countryName : "Quốc tế"}).`,
      nguon: "tinh_huong_ban_dau",
      y_nghia: "Số điện thoại nước ngoài mạo danh cơ quan / tổ chức tại Việt Nam.",
    });
  }

  // Add domain mismatch evidence
  if (techAnalysis.urlAnalysis.hasDomainMismatch || techAnalysis.urlAnalysis.hasPathDeception) {
    const mismatchUrl = techAnalysis.urlAnalysis.urls[0];
    mergedEvidence.unshift({
      noi_dung: `Đường link dẫn tới tên miền thật: "${mismatchUrl ? mismatchUrl.registrableDomain : ""}" (Đường dẫn: "${mismatchUrl ? mismatchUrl.pathname : ""}").`,
      nguon: "tinh_huong_ban_dau",
      y_nghia: mismatchUrl?.hasDeceptivePath
        ? `Tên miền thật là ${mismatchUrl.registrableDomain}, từ khóa cơ quan nhà nước chỉ nằm trong đường dẫn phía sau để lừa đảo.`
        : "Tên miền không thuộc quyền quản trị của cơ quan/tổ chức được xưng danh.",
    });
  }

  // Add luring reply evidence
  if (techAnalysis.contentAnalysis.hasLureToReplyForNewLink) {
    mergedEvidence.push({
      noi_dung: "Yêu cầu trả lời '1' hoặc 'Y' để nhận đường link mới.",
      nguon: "tinh_huong_ban_dau",
      y_nghia: "Thủ đoạn kích hoạt liên kết hai chiều nhằm vượt bộ lọc tin nhắn rác của nhà mạng viễn thông.",
    });
  }

  // Add urgency / payment evidence
  if (techAnalysis.contentAnalysis.hasUrgencyOrThreat) {
    mergedEvidence.push({
      noi_dung: techAnalysis.contentAnalysis.urgencyDetails || "Đặt thời hạn thanh toán trong 48 giờ/24 giờ.",
      nguon: "tinh_huong_ban_dau",
      y_nghia: "Tạo tâm lý gấp gáp, đe dọa để nạn nhân không kịp suy nghĩ và xác minh.",
    });
  }

  return {
    finalRiskLevel,
    ruleBasedRiskLevel,
    aiRiskLevel,
    muc_rui_ro: mapCanonicalToLegacyVietnamese(finalRiskLevel) as RiskLevel,
    ket_luan_ngan: canonicalUI.fixedTitle,
    title: canonicalUI.fixedTitle,
    badgeLabel: canonicalUI.badgeLabel,
    riskReasons: aiResult?.riskReasons || techAnalysis.scoring.scoreBreakdown.map((s) => s.sign),
    cac_dau_hieu: aiResult?.cac_dau_hieu || techAnalysis.scoring.scoreBreakdown.map((s) => s.sign),
    immediateActions: primaryActions,
    hanh_dong_an_toan: primaryActions,
    needsMoreInformation: shouldSkipQuestions ? false : Boolean(aiResult?.needsMoreInformation || aiResult?.co_can_hoi_them),
    co_can_hoi_them: shouldSkipQuestions ? false : Boolean(aiResult?.co_can_hoi_them || aiResult?.needsMoreInformation),
    cau_hoi_bo_sung: shouldSkipQuestions ? [] : aiResult?.cau_hoi_bo_sung || aiResult?.followUpQuestions || [],
    bang_chung_da_co: mergedEvidence,
    viec_can_lam_ngay: primaryActions,
    viec_khong_nen_lam: canonicalUI.defaultAvoidActions,
    giai_thich: aiResult?.giai_thich || techAnalysis.scoring.verdictSummary,
    canh_bao_phong_ngua: canonicalUI.corePrinciple,
    canh_bao_an_toan: canonicalUI.corePrinciple,
    tin_nhan_tu_choi_goi_y: aiResult?.tin_nhan_tu_choi_goi_y || "Tôi sẽ trực tiếp liên hệ cơ quan chính thống để làm việc theo quy định. Xin cảm ơn.",
    cau_hoi_xac_minh_goi_y: aiResult?.cau_hoi_xac_minh_goi_y || "Đề nghị gửi văn bản chính thức có dấu đỏ về địa chỉ cư trú của tôi.",
    noi_dung_gui_nguoi_than: aiResult?.noi_dung_gui_nguoi_than || "Tôi vừa nhận được thông tin có dấu hiệu mạo danh/lừa đảo, gửi gia đình lưu ý đề phòng.",
    technicalAnalysis: {
      phoneAnalysis: techAnalysis.phoneAnalysis,
      urlAnalysis: techAnalysis.urlAnalysis,
      contentAnalysis: techAnalysis.contentAnalysis,
      identityMismatch: techAnalysis.identityMismatch,
      scoring: techAnalysis.scoring,
    },
  };
}

