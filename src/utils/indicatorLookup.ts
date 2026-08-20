// Fast Rule-based Indicator Lookup Service ("Tra số & đường link")
// Prioritizes deterministic TypeScript rule-based analysis for phone numbers & URLs
// and checks local/Firestore databases (official_phone_warnings & community_phone_reports) before AI Grounding.

import {
  extractAndNormalizePhoneNumbers,
  extractAndNormalizeUrls,
  getRegistrableDomain,
  ExtractedPhone,
  ExtractedUrl,
} from "./technicalAnalysis";
import { performTraceCheckSync, THREAT_DATABASE } from "./reputationService";
import { CanonicalRiskLevel } from "./riskConfig";
import { CommunityStatus } from "../types";
import {
  PublicPhoneSearchResult,
  OfficialPhoneMatch,
  ReferencePhoneMatch,
  normalizePhoneNumber,
  compareNormalizedPhoneNumbers,
  generatePhoneSearchVariants,
} from "./publicPhoneGrounding";
import {
  getCachedPhoneLookup,
  setCachedPhoneLookup,
  getOfficialPhoneWarning,
  getCommunityPhoneReport,
} from "./phoneLookupCache";

// Whitelist of officially verified public domains & emergency hotlines for GREEN status
// NOTE: "gov.vn" is a generic ccSLD, NOT a domain - NEVER whitelist "gov.vn" as a whole!
export const VERIFIED_OFFICIAL_DOMAINS = [
  "bocongan.gov.vn",
  "cuccsgt.bocongan.gov.vn",
  "dichvucong.gov.vn",
  "chinhphu.vn",
  "baochinhphu.vn",
  "cand.com.vn",
  "congan.hanoi.gov.vn",
  "congan.hochiminhcity.gov.vn",
  "vneid.gov.vn",
  "gdt.gov.vn",
  "mic.gov.vn",
  "aita.gov.vn",
  "vncert.vn",
  "ais.gov.vn",
  "tinnhiemmang.vn",
  "khonggianmang.vn",
  "sbv.gov.vn",
  "moj.gov.vn",
  "toaan.gov.vn",
  "vksndtc.gov.vn",
  "baohiemxahoi.gov.vn",
  "vietnamnet.vn",
  "vtv.vn",
  "vnexpress.net",
  "tuoitre.vn",
  "thanhnien.vn",
];

export const VERIFIED_OFFICIAL_HOTLINES = [
  "111", // Tổng đài Quốc gia Bảo vệ Trẻ em
  "112", // Yêu cầu trợ giúp và tìm kiếm cứu nạn
  "113", // Công an
  "114", // Cứu hỏa
  "115", // Cấp cứu y tế
  "156", // Tổng đài tiếp nhận phản ánh cuộc gọi, tin nhắn rác, lừa đảo
  "0692345860", // Đường dây nóng Cục An ninh mạng A05
];

export type IndicatorWarningLevel = "RED" | "ORANGE" | "YELLOW" | "GRAY" | "GREEN";

export interface IndicatorPhoneDetail {
  raw: string;
  normalized: string;
  countryCode: string;
  countryName: string;
  isVietnam: boolean;
  isForeign: boolean;
  isOfficialVerified: boolean;
  hasReports: boolean;
  reportCount: number | null;
  lastReportedAt: string | null;
  reputationCategory?: string;
  warningNote: string;
  groundingResult?: PublicPhoneSearchResult;
  hasOfficialWarningMatch?: boolean;
  officialWarningMatch?: OfficialPhoneMatch;
  referenceMatches?: ReferencePhoneMatch[];
}

export interface IndicatorUrlDetail {
  rawUrl: string;
  normalized: string;
  protocol: string;
  hostname: string;
  subdomain: string;
  registrableDomain: string;
  tld: string;
  isOfficialVerified: boolean;
  isTyposquatting?: boolean;
  typosquattingTarget?: string;
  typosquattingReason?: string;
  hasDeceptivePath: boolean;
  deceptiveKeywordsInPath: string[];
  isSuspiciousTld: boolean;
  isDirectIp: boolean;
  isShortenedUrl: boolean;
  hasReports: boolean;
  reportCount: number | null;
  lastReportedAt: string | null;
  reputationCategory?: string;
  explanation: string;
}

export interface IndicatorCheckResult {
  status: "success" | "invalid" | "OFFICIAL_MATCH";
  input: string;
  warningLevel: IndicatorWarningLevel;
  riskBadgeLabel: string;
  riskTitle: string;
  themeColor: "rose" | "orange" | "amber" | "slate" | "emerald";
  dataType: "phone" | "url" | "both" | "unknown";
  dataTypeLabel: string;
  primaryTarget: string;
  realDomainOrPrefix: string;
  notableSigns: string[];
  communityReports: {
    status: CommunityStatus;
    hasReports: boolean;
    reportCount: number | null;
    lastReportText: string;
    message: string;
    sourceUrl: string | null;
    checkedAt: string | null;
  };
  recommendedActions: string[];
  explanation: string;
  phones: IndicatorPhoneDetail[];
  urls: IndicatorUrlDetail[];
  hasOfficialWarningMatch?: boolean;
  officialWarningMatch?: OfficialPhoneMatch;
  referenceMatches?: ReferencePhoneMatch[];
  groundingSearchState?: "idle" | "searching" | "completed" | "error";
  groundingSearchMessage?: string;
}

// -----------------------------------------------------------------------------
// Typosquatting / Lookalike Detection Engine
// -----------------------------------------------------------------------------
function levenshteinDistance(a: string, b: string): number {
  const matrix: number[][] = [];
  for (let i = 0; i <= b.length; i++) matrix[i] = [i];
  for (let j = 0; j <= a.length; j++) matrix[0][j] = j;

  for (let i = 1; i <= b.length; i++) {
    for (let j = 1; j <= a.length; j++) {
      if (b.charAt(i - 1) === a.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1,
          matrix[i][j - 1] + 1,
          matrix[i - 1][j] + 1
        );
      }
    }
  }
  return matrix[b.length][a.length];
}

const HIGH_PROFILE_TARGETS = [
  { domain: "bocongan.gov.vn", name: "Cổng Thông tin điện tử Bộ Công an (bocongan.gov.vn)", base: "bocongan" },
  { domain: "dichvucong.gov.vn", name: "Cổng Dịch vụ công Quốc gia (dichvucong.gov.vn)", base: "dichvucong" },
  { domain: "vneid.gov.vn", name: "Định danh điện tử VNeID (vneid.gov.vn)", base: "vneid" },
  { domain: "chinhphu.vn", name: "Cổng Thông tin Chính phủ (chinhphu.vn)", base: "chinhphu" },
  { domain: "baochinhphu.vn", name: "Báo Điện tử Chính phủ (baochinhphu.vn)", base: "baochinhphu" },
  { domain: "cand.com.vn", name: "Báo Công an Nhân dân (cand.com.vn)", base: "cand" },
  { domain: "gdt.gov.vn", name: "Tổng cục Thuế (gdt.gov.vn)", base: "gdt" },
  { domain: "vietcombank.com.vn", name: "Ngân hàng Vietcombank", base: "vietcombank" },
  { domain: "techcombank.com.vn", name: "Ngân hàng Techcombank", base: "techcombank" },
  { domain: "mbbank.com.vn", name: "Ngân hàng MB Bank", base: "mbbank" },
  { domain: "bidv.com.vn", name: "Ngân hàng BIDV", base: "bidv" },
  { domain: "agribank.com.vn", name: "Ngân hàng Agribank", base: "agribank" },
  { domain: "vpbank.com.vn", name: "Ngân hàng VPBank", base: "vpbank" },
];

/**
 * Detects whether a domain is an intentional typosquatting or lookalike of official agencies.
 */
export function detectTyposquatting(hostname: string, registrableDomain: string): {
  isTyposquatting: boolean;
  targetOfficialDomain: string;
  targetOrgName: string;
  reason: string;
} {
  const normHost = hostname.toLowerCase().trim().replace(/:\d+$/, "");
  const normDom = registrableDomain.toLowerCase().trim();

  // If it's already an exact verified official domain or subdomain, not typosquatting
  if (isVerifiedOfficialDomain(normDom, normHost)) {
    return { isTyposquatting: false, targetOfficialDomain: "", targetOrgName: "", reason: "" };
  }

  const hostParts = normHost.split(".");
  const domParts = normDom.split(".");
  const hostMainLabel = domParts[0] || hostParts[0] || "";

  for (const target of HIGH_PROFILE_TARGETS) {
    const targetMainLabel = target.base;

    // 1. Check exact base label with different non-official TLD (e.g., bocongan.vn, bocongan.com, bocongan.net)
    if (
      (hostMainLabel === targetMainLabel || normDom.includes(target.base)) &&
      normDom !== target.domain &&
      normHost !== target.domain &&
      !normHost.endsWith("." + target.domain)
    ) {
      return {
        isTyposquatting: true,
        targetOfficialDomain: target.domain,
        targetOrgName: target.name,
        reason: `Tên miền '${normHost}' chứa từ khóa '${target.base}' nhưng không thuộc hệ thống tên miền chính thức '${target.domain}'.`,
      };
    }

    // 2. Check Levenshtein distance on main label (e.g., "bocongann" vs "bocongan", "dichvucongg" vs "dichvucong")
    const labelDist = levenshteinDistance(hostMainLabel, targetMainLabel);
    if (labelDist >= 1 && labelDist <= 2 && Math.abs(hostMainLabel.length - targetMainLabel.length) <= 2) {
      return {
        isTyposquatting: true,
        targetOfficialDomain: target.domain,
        targetOrgName: target.name,
        reason: `Tên miền '${normHost}' viết sai chính tả (cố ý thêm/đổi ký tự '${hostMainLabel}' so với '${targetMainLabel}') nhái theo ${target.name}.`,
      };
    }

    // 3. Check Levenshtein distance on full hostname vs official domain
    const fullDist = levenshteinDistance(normHost, target.domain);
    if (fullDist >= 1 && fullDist <= 2) {
      return {
        isTyposquatting: true,
        targetOfficialDomain: target.domain,
        targetOrgName: target.name,
        reason: `Tên miền '${normHost}' viết sai chính tả gần giống Cổng thông tin chính thức '${target.domain}'.`,
      };
    }
  }

  return { isTyposquatting: false, targetOfficialDomain: "", targetOrgName: "", reason: "" };
}

/**
 * Checks if a domain is officially verified as authentic Government or Top News portal.
 */
export function isVerifiedOfficialDomain(registrableDomain: string, hostname?: string): boolean {
  const normDom = registrableDomain.toLowerCase().trim();
  const normHost = (hostname || "").toLowerCase().trim();

  return VERIFIED_OFFICIAL_DOMAINS.some(
    (official) =>
      normDom === official ||
      normHost === official ||
      normHost.endsWith("." + official)
  );
}

/**
 * Checks if a phone number is officially verified public hotline.
 */
export function isVerifiedOfficialPhone(normalizedPhone: string, rawPhone?: string): boolean {
  const cleanNorm = normalizedPhone.replace(/[^\d+]/g, "");
  const cleanRaw = (rawPhone || "").replace(/[^\d+]/g, "");

  return VERIFIED_OFFICIAL_HOTLINES.some(
    (h) => cleanNorm === h || cleanRaw === h || cleanNorm === `+84${h.replace(/^0+/, "")}`
  );
}

/**
 * Analyzes a single phone number deterministically.
 * Checks Step 1: official_phone_warnings and Step 2: community_phone_reports.
 */
export function analyzePhoneNumber(phoneInput: string): IndicatorPhoneDetail {
  const norm = normalizePhoneNumber(phoneInput);
  const extracted = extractAndNormalizePhoneNumbers(phoneInput);
  const phone = extracted[0] || {
    raw: phoneInput,
    normalized: norm.localPhone || phoneInput.replace(/[\s().-]/g, ""),
    countryCode: norm.countryCode || (phoneInput.startsWith("+") ? phoneInput.slice(0, 4) : "+84"),
    countryName: norm.isVietnam ? "Việt Nam" : "Quốc tế",
    isVietnam: norm.isVietnam,
    isForeign: !norm.isVietnam && norm.canonicalPhone.startsWith("+") && !norm.canonicalPhone.startsWith("+84"),
    isSuspicious: !norm.isVietnam && norm.canonicalPhone.startsWith("+") && !norm.canonicalPhone.startsWith("+84"),
  };

  const isOfficial = isVerifiedOfficialPhone(norm.canonicalPhone, norm.localPhone);

  // Step 1: Check official_phone_warnings database by canonicalPhone
  const officialWarning =
    getOfficialPhoneWarning(norm.canonicalPhone) ||
    getOfficialPhoneWarning(norm.localPhone) ||
    getOfficialPhoneWarning(phone.normalized) ||
    getOfficialPhoneWarning(phone.raw);

  // Step 2: Check community_phone_reports database by canonicalPhone
  const communityReport =
    getCommunityPhoneReport(norm.canonicalPhone) ||
    getCommunityPhoneReport(norm.localPhone) ||
    getCommunityPhoneReport(phone.normalized) ||
    getCommunityPhoneReport(phone.raw);

  // Threat database pattern match
  const exactMatch = THREAT_DATABASE.find(
    (t) =>
      t.type === "phone" &&
      (compareNormalizedPhoneNumbers(t.pattern, norm.canonicalPhone) ||
        t.pattern === norm.localPhone ||
        t.pattern === norm.canonicalPhone ||
        t.pattern === phone.normalized ||
        t.pattern === phone.raw)
  );
  const prefixMatch = THREAT_DATABASE.find(
    (t) =>
      t.type === "prefix" &&
      (norm.localPhone.startsWith(t.pattern) ||
        norm.canonicalPhone.startsWith(t.pattern) ||
        phone.normalized.startsWith(t.pattern) ||
        phone.raw.startsWith(t.pattern) ||
        (phone.countryCode && phone.countryCode === t.pattern))
  );

  const match = exactMatch || prefixMatch;
  let reportCount: number | null = match ? match.reports : null;
  let lastReport: string | null = match ? match.lastReport : null;
  let category = match ? match.category : undefined;

  if (communityReport) {
    reportCount = Math.max(reportCount || 0, communityReport.reportCount);
    lastReport = communityReport.lastReportedAt || lastReport;
    category = communityReport.categories.join(", ") || category;
  }

  if (officialWarning) {
    reportCount = Math.max(reportCount || 0, 1);
    lastReport = officialWarning.officialMatch.publishedAt || "Cảnh báo chính thức";
    category = officialWarning.officialMatch.incidentCategory || category;
  }

  if (!match && !communityReport && !officialWarning && phone.isForeign) {
    // Technical rule signal only - reportCount is null
    reportCount = null;
    lastReport = null;
    category = "Đầu số quốc tế không rõ danh tính gọi đến Việt Nam";
  }

  let warningNote = "";
  if (officialWarning) {
    warningNote = `Số này từng xuất hiện trong cảnh báo chính thức của ${officialWarning.officialMatch.verifiedHostname} (${officialWarning.officialMatch.publishedAt}).`;
  } else if (isOfficial) {
    warningNote = "Số điện thoại thuộc danh sách tổng đài / cơ quan nhà nước chính thức đã được xác minh.";
  } else if (reportCount !== null && reportCount > 0) {
    warningNote = `Đã có ${reportCount} lượt báo cáo phản ánh số này liên quan đến thủ đoạn lừa đảo / quấy rối.`;
  } else if (phone.isForeign) {
    warningNote = `Đầu số quốc tế (${phone.countryName}). Thận trọng cao độ nếu người gọi tự xưng cơ quan công quyền Việt Nam.`;
  } else {
    warningNote = "Chưa có báo cáo cộng đồng về số này. Điều đó không chứng minh số điện thoại an toàn.";
  }

  return {
    raw: phone.raw,
    normalized: phone.normalized,
    countryCode: phone.countryCode || (phone.isVietnam ? "+84" : "Quốc tế"),
    countryName: phone.countryName || (phone.isVietnam ? "Việt Nam" : "Quốc tế"),
    isVietnam: phone.isVietnam,
    isForeign: phone.isForeign,
    isOfficialVerified: isOfficial,
    hasReports: reportCount !== null && reportCount > 0,
    reportCount,
    lastReportedAt: lastReport,
    reputationCategory: category,
    warningNote,
    hasOfficialWarningMatch: !!officialWarning,
    officialWarningMatch: officialWarning ? officialWarning.officialMatch : undefined,
  };
}

/**
 * Analyzes a single URL deterministically.
 */
export function analyzeUrl(urlStr: string): IndicatorUrlDetail {
  const extracted = extractAndNormalizeUrls(urlStr);
  const rawHostname = urlStr.replace(/^https?:\/\//, "").split("/")[0];
  const domainInfo = getRegistrableDomain(rawHostname);

  const u = extracted[0] || {
    raw: urlStr,
    normalized: urlStr.startsWith("http") ? urlStr : `https://${urlStr}`,
    protocol: urlStr.startsWith("http://") ? "http:" : "https:",
    hostname: rawHostname,
    subdomain: domainInfo.subdomain,
    registrableDomain: domainInfo.registrableDomain,
    tld: domainInfo.tld || "unknown",
    pathname: "/",
    fullPath: "/",
    hasDeceptivePath: false,
    deceptiveKeywordsInPath: [],
    isSuspiciousTld: false,
    isDirectIp: false,
    isShortenedUrl: false,
    explanation: "",
  };

  const isOfficial = isVerifiedOfficialDomain(u.registrableDomain, u.hostname);
  const typosquatting = !isOfficial ? detectTyposquatting(u.hostname, u.registrableDomain) : { isTyposquatting: false, targetOfficialDomain: "", targetOrgName: "", reason: "" };

  // Match with verified threat database
  const match = THREAT_DATABASE.find(
    (t) =>
      t.type === "domain" &&
      (t.pattern === u.registrableDomain ||
        t.pattern === u.hostname ||
        u.hostname.endsWith("." + t.pattern))
  );

  let reportCount: number | null = match ? match.reports : null;
  let lastReport: string | null = match ? match.lastReport : null;
  let category = match ? match.category : undefined;

  if (typosquatting.isTyposquatting) {
    category = `Giả mạo tên miền (Typosquatting) nhái ${typosquatting.targetOrgName}`;
  } else if (!match) {
    if (u.hasDeceptivePath) {
      category = "Tên miền ngụy trang đường dẫn cơ quan nhà nước (.gov/dichvucong)";
    } else if (u.isSuspiciousTld) {
      category = "Tên miền có đuôi thường bị lạm dụng trong các chiến dịch ngắn hạn. Đây là tín hiệu kỹ thuật, không phải bằng chứng tên miền đã bị báo cáo.";
    }
  }

  let explanation = u.explanation;
  if (isOfficial) {
    explanation = `Tên miền ${u.registrableDomain} thuộc cổng thông tin / dịch vụ của cơ quan chính thức đã được xác minh.`;
  } else if (typosquatting.isTyposquatting) {
    explanation = typosquatting.reason;
  } else if (u.hasDeceptivePath) {
    explanation = `Tên miền thật là '${u.registrableDomain}'. Phần '${u.deceptiveKeywordsInPath.join("/")}' chỉ là đường dẫn ngụy trang trong thư mục web để đánh lừa người dùng.`;
  } else if (u.isDirectIp) {
    explanation = "Đường dẫn sử dụng địa chỉ IP trực tiếp thay vì tên miền chuẩn, thường được dùng để che giấu danh tính máy chủ lừa đảo.";
  } else if (u.isShortenedUrl) {
    explanation = "Đường dẫn rút gọn ẩn đích đến thực sự. Kẻ xấu thường dùng link rút gọn để né bộ lọc an toàn.";
  } else if (!explanation) {
    explanation = `Tên miền đăng ký thật: ${u.registrableDomain}. Lưu ý: Giao thức HTTPS chỉ mã hóa đường truyền, không chứng minh website an toàn hay chính thống.`;
  }

  return {
    rawUrl: u.raw,
    normalized: u.normalized,
    protocol: u.protocol,
    hostname: u.hostname,
    subdomain: u.subdomain,
    registrableDomain: u.registrableDomain,
    tld: u.tld,
    isOfficialVerified: isOfficial,
    isTyposquatting: typosquatting.isTyposquatting,
    typosquattingTarget: typosquatting.targetOfficialDomain,
    typosquattingReason: typosquatting.reason,
    hasDeceptivePath: u.hasDeceptivePath,
    deceptiveKeywordsInPath: u.deceptiveKeywordsInPath,
    isSuspiciousTld: u.isSuspiciousTld,
    isDirectIp: u.isDirectIp,
    isShortenedUrl: u.isShortenedUrl,
    hasReports: reportCount !== null && reportCount > 0,
    reportCount,
    lastReportedAt: lastReport,
    reputationCategory: category,
    explanation,
  };
}

/**
 * Main fast indicator check handler (POST /api/check-indicator).
 * Priority order:
 * 1. Firestore / Local official_phone_warnings
 * 2. Firestore / Local community_phone_reports
 * 3. Technical heuristic analysis
 */
export function checkIndicator(input: string): IndicatorCheckResult {
  const trimmed = (input || "").trim();

  if (!trimmed) {
    return {
      status: "invalid",
      input: "",
      warningLevel: "GRAY",
      riskBadgeLabel: "Chưa có dữ liệu",
      riskTitle: "Vui lòng nhập số điện thoại hoặc đường link cần kiểm tra",
      themeColor: "slate",
      dataType: "unknown",
      dataTypeLabel: "Không xác định",
      primaryTarget: "Chưa nhập",
      realDomainOrPrefix: "Chưa có",
      notableSigns: ["Chưa cung cấp thông tin đầu vào."],
      communityReports: {
        status: "unavailable",
        hasReports: false,
        reportCount: null,
        lastReportText: "Chưa có",
        message: "Chưa có dữ liệu tra cứu.",
        sourceUrl: null,
        checkedAt: null,
      },
      recommendedActions: ["Nhập số điện thoại (ví dụ: 0393767942) hoặc đường link để tra cứu."],
      explanation: "Hệ thống hỗ trợ tra cứu số điện thoại đối soát với cảnh báo Bộ Công an và cơ quan nhà nước.",
      phones: [],
      urls: [],
    };
  }

  // Extract phone numbers and URLs
  const extractedPhones = extractAndNormalizePhoneNumbers(trimmed);
  const extractedUrls = extractAndNormalizeUrls(trimmed);

  if (extractedPhones.length === 0 && extractedUrls.length === 0) {
    if (/^[+0-9\s().-]{6,20}$/.test(trimmed)) {
      extractedPhones.push({
        raw: trimmed,
        normalized: trimmed.replace(/[\s().-]/g, ""),
        countryCode: trimmed.startsWith("+") ? trimmed.slice(0, 4) : undefined,
        countryName: trimmed.startsWith("+84") || trimmed.startsWith("0") ? "Việt Nam" : "Quốc tế",
        isVietnam: trimmed.startsWith("+84") || trimmed.startsWith("0"),
        isForeign: trimmed.startsWith("+") && !trimmed.startsWith("+84"),
        isSuspicious: trimmed.startsWith("+") && !trimmed.startsWith("+84"),
      });
    } else if (trimmed.includes(".") && !trimmed.includes(" ")) {
      const parsedUrl = analyzeUrl(trimmed);
      extractedUrls.push({
        raw: trimmed,
        normalized: parsedUrl.normalized,
        protocol: parsedUrl.protocol,
        hostname: parsedUrl.hostname,
        subdomain: parsedUrl.subdomain,
        registrableDomain: parsedUrl.registrableDomain,
        tld: parsedUrl.tld,
        pathname: "/",
        fullPath: "/",
        hasDeceptivePath: parsedUrl.hasDeceptivePath,
        deceptiveKeywordsInPath: parsedUrl.deceptiveKeywordsInPath,
        isSuspiciousTld: parsedUrl.isSuspiciousTld,
        isDirectIp: parsedUrl.isDirectIp,
        isShortenedUrl: parsedUrl.isShortenedUrl,
        explanation: parsedUrl.explanation,
      });
    }
  }

  const phoneDetails: IndicatorPhoneDetail[] = extractedPhones.map((p) => analyzePhoneNumber(p.raw));
  const urlDetails: IndicatorUrlDetail[] = extractedUrls.map((u) => analyzeUrl(u.raw));

  let dataType: "phone" | "url" | "both" | "unknown" = "unknown";
  if (phoneDetails.length > 0 && urlDetails.length > 0) {
    dataType = "both";
  } else if (phoneDetails.length > 0) {
    dataType = "phone";
  } else if (urlDetails.length > 0) {
    dataType = "url";
  }

  const dataTypeLabel =
    dataType === "both"
      ? "Số điện thoại & Đường link"
      : dataType === "phone"
      ? "Số điện thoại / Đầu số"
      : dataType === "url"
      ? "Liên kết trang web"
      : "Dữ liệu văn bản";

  // Primary Target & Real Domain / Prefix
  let primaryTarget = "";
  let realDomainOrPrefix = "";

  if (dataType === "both") {
    primaryTarget = `${phoneDetails[0]?.normalized} và ${urlDetails[0]?.rawUrl}`;
    realDomainOrPrefix = `Đầu số: ${phoneDetails[0]?.countryCode} | Tên miền thật: ${urlDetails[0]?.registrableDomain}`;
  } else if (dataType === "phone") {
    primaryTarget = phoneDetails.map((p) => p.normalized || p.raw).join(", ");
    realDomainOrPrefix = phoneDetails
      .map((p) => `${p.countryCode} (${p.countryName})`)
      .join(", ");
  } else if (dataType === "url") {
    primaryTarget = urlDetails.map((u) => u.rawUrl).join(", ");
    realDomainOrPrefix = urlDetails.map((u) => u.registrableDomain).join(", ");
  } else {
    primaryTarget = trimmed;
    realDomainOrPrefix = "Không nhận diện được SĐT hoặc URL";
  }

  const hasOfficialWarningMatch = phoneDetails.some((p) => p.hasOfficialWarningMatch);
  const topOfficialPhone = phoneDetails.find((p) => p.hasOfficialWarningMatch)?.officialWarningMatch;

  let warningLevel: IndicatorWarningLevel = "GRAY";
  let riskBadgeLabel = "Chưa có báo cáo";
  let riskTitle = "Chưa ghi nhận phản ánh — Cần tự bảo vệ";
  let themeColor: "rose" | "orange" | "amber" | "slate" | "emerald" = "slate";

  const hasOfficialDomain = urlDetails.some((u) => u.isOfficialVerified);
  const hasOfficialPhone = phoneDetails.some((p) => p.isOfficialVerified);
  const hasTyposquatting = urlDetails.some((u) => u.isTyposquatting);
  const isEntirelyOfficial =
    (hasOfficialDomain || hasOfficialPhone) &&
    !hasOfficialWarningMatch &&
    !hasTyposquatting &&
    !urlDetails.some((u) => u.hasDeceptivePath || u.hasReports) &&
    !phoneDetails.some((p) => p.isForeign || p.hasReports);

  const hasCriticalUrl = urlDetails.some(
    (u) => u.isTyposquatting || u.hasDeceptivePath || (u.hasReports && (u.reportCount || 0) >= 50) || u.isDirectIp
  );
  const hasCriticalPhone = phoneDetails.some(
    (p) => p.hasReports && (p.reportCount || 0) >= 50
  );
  const hasForeignPhone = phoneDetails.some((p) => p.isForeign);
  const hasSuspiciousUrl = urlDetails.some((u) => u.isSuspiciousTld || u.isShortenedUrl || u.hasReports);
  const hasAnyReports = phoneDetails.some((p) => p.hasReports) || urlDetails.some((u) => u.hasReports);

  const hasAnyKnownReport = phoneDetails.some((p) => p.reportCount !== null) || urlDetails.some((u) => u.reportCount !== null);
  const totalReports = hasAnyKnownReport
    ? phoneDetails.reduce((sum, p) => sum + (p.reportCount || 0), 0) +
      urlDetails.reduce((sum, u) => sum + (u.reportCount || 0), 0)
    : null;

  const notableSigns: string[] = [];
  const recommendedActions: string[] = [];

  if (hasOfficialWarningMatch && topOfficialPhone) {
    // 🚨 OFFICIAL WARNING MATCH (RED)
    warningLevel = "RED";
    riskBadgeLabel = "Từng xuất hiện trong cảnh báo chính thức";
    riskTitle = `Số điện thoại từng bị cơ quan chức năng (${topOfficialPhone.verifiedHostname}) cảnh báo`;
    themeColor = "rose";

    notableSigns.push(
      `🚨 CẢNH BÁO CHÍNH THỨC: Số điện thoại này từng xuất hiện trong bài viết "${topOfficialPhone.title}" (Ngày ghi nhận: ${topOfficialPhone.publishedAt}).`
    );
    notableSigns.push(`Thủ đoạn ghi nhận: ${topOfficialPhone.incidentCategory}.`);
    notableSigns.push(
      "Số này từng xuất hiện trong một vụ việc được nguồn chính thức công bố tại thời điểm nêu trên. Số điện thoại có thể bị giả mạo hoặc được cấp lại; kết quả không khẳng định danh tính chủ thuê bao hiện tại."
    );

    recommendedActions.push("Không gọi lại, không trả lời, không mở đường link và không cung cấp thông tin cá nhân.");
    recommendedActions.push("Chặn ngay số điện thoại này trên ứng dụng Danh bạ / Cuộc gọi của bạn.");
    recommendedActions.push("Tuyệt đối không chuyển tiền, không đọc mã OTP và không cài đặt ứng dụng theo lời yêu cầu.");
    recommendedActions.push("Xem chi tiết bài viết cảnh báo gốc tại nút [Xem nguồn] bên dưới để nắm rõ thủ đoạn.");
  } else if (hasTyposquatting) {
    // 🚨 TYPOSQUATTING / LOOKALIKE DOMAIN (RED)
    const typoDetail = urlDetails.find((u) => u.isTyposquatting);
    warningLevel = "RED";
    riskBadgeLabel = "Nguy hiểm rõ ràng";
    riskTitle = "Phát hiện tên miền giả mạo / Nhái cơ quan chính thức (Typosquatting)";
    themeColor = "rose";

    notableSigns.push(
      `🚨 DẤU HIỆU GIẢ MẠO TÊN MIỀN (Typosquatting): ${typoDetail?.typosquattingReason || "Tên miền viết sai chính tả nhái theo cơ quan chính thức."}`
    );
    notableSigns.push(
      `Tên miền thật bạn nhập là "${typoDetail?.registrableDomain}", hoàn toàn KHÔNG PHẢI là cổng thông tin chính thức "${typoDetail?.typosquattingTarget}".`
    );
    notableSigns.push("Kẻ gian cố tình đăng ký tên miền gần giống (sai 1-2 ký tự) để lừa người dùng đăng nhập tài khoản hoặc cài mã độc.");

    recommendedActions.push("Không truy cập, không mở đường link và không điền bất kỳ thông tin nào.");
    recommendedActions.push("Nếu đã nhập mật khẩu/mã OTP trên trang này: Hãy lập tức đổi mật khẩu và liên hệ cơ quan/ngân hàng để tạm khóa tài khoản.");
    recommendedActions.push("Chỉ truy cập cổng thông tin chính thức đã được công bố trên các phương tiện truyền thông của Nhà nước.");
  } else if (isEntirelyOfficial && !hasCriticalUrl && !hasForeignPhone) {
    // 🟢 GREEN
    warningLevel = "GREEN";
    riskBadgeLabel = "Đã xác minh chính thống";
    riskTitle = "Kênh liên lạc / Cổng thông tin chính thức đã được xác thực";
    themeColor = "emerald";

    notableSigns.push("Tên miền / Số điện thoại thuộc cơ quan nhà nước, báo chí chính thống hoặc tổng đài khẩn cấp.");
    notableSigns.push("Đường truyền được bảo vệ và đã xác thực chứng thư số chính chủ.");
    recommendedActions.push("Có thể sử dụng bình thường.");
  } else if (hasCriticalUrl || hasCriticalPhone) {
    // 🔴 RED (Nguy hiểm rõ ràng)
    warningLevel = "RED";
    riskBadgeLabel = "Nguy hiểm rõ ràng";
    riskTitle = "Phát hiện dấu hiệu lừa đảo / giả mạo nghiêm trọng";
    themeColor = "rose";

    if (urlDetails.some((u) => u.hasDeceptivePath)) {
      const deceptive = urlDetails.find((u) => u.hasDeceptivePath);
      notableSigns.push(
        `Giả mạo đường dẫn: Tên miền thật là '${deceptive?.registrableDomain}', nhưng cố tình chèn '${deceptive?.deceptiveKeywordsInPath.join("/")}' vào sau để giả danh cơ quan nhà nước.`
      );
    }
    if (urlDetails.some((u) => u.isDirectIp)) {
      notableSigns.push("Đường link dùng địa chỉ IP trần, hành vi điển hình của máy chủ phát tán mã độc / phishing.");
    }
    if (totalReports !== null && totalReports > 0) {
      notableSigns.push(`Cơ sở dữ liệu cộng đồng ghi nhận ${totalReports} lượt báo cáo lừa đảo liên quan.`);
    }

    recommendedActions.push("Không gọi lại, không trả lời, không mở đường link và không cung cấp thông tin cá nhân.");
    recommendedActions.push("Chặn ngay số điện thoại / người gửi tin nhắn này trên thiết bị.");
    recommendedActions.push("Nếu đã bấm vào link và nhập thông tin: Lập tức đổi mật khẩu và liên hệ ngân hàng khóa thẻ.");
  } else if (hasForeignPhone || hasSuspiciousUrl || (totalReports !== null && totalReports >= 15)) {
    // 🟠 ORANGE (Rủi ro cao)
    warningLevel = "ORANGE";
    riskBadgeLabel = "Rủi ro cao";
    riskTitle = "Dấu hiệu bất thường — Nguy cơ lừa đảo cao";
    themeColor = "orange";

    if (hasForeignPhone) {
      const fPhone = phoneDetails.find((p) => p.isForeign);
      notableSigns.push(
        `Đầu số quốc tế: ${fPhone?.countryCode} (${fPhone?.countryName}). Các cơ quan chức năng Việt Nam (Công an, Tòa án, Viện kiểm sát) KHÔNG BAO GIỜ dùng số quốc tế để liên hệ người dân.`
      );
    }
    if (urlDetails.some((u) => u.isSuspiciousTld)) {
      const sUrl = urlDetails.find((u) => u.isSuspiciousTld);
      notableSigns.push(`Tên miền đuôi rủi ro cao (.${sUrl?.tld}), thường được đăng ký ẩn danh với giá rẻ để lừa đảo ngắn hạn.`);
    }
    if (urlDetails.some((u) => u.isShortenedUrl)) {
      notableSigns.push("Đường link rút gọn che giấu trang đích thực tế.");
    }

    recommendedActions.push("Không gọi lại, không trả lời, không mở đường link và không cung cấp thông tin cá nhân.");
    recommendedActions.push("Tuyệt đối không chuyển tiền hoặc bấm xác nhận bất kỳ giao dịch nào.");
  } else if (dataType === "unknown") {
    // ⚪ GRAY (Không nhận diện được)
    warningLevel = "GRAY";
    riskBadgeLabel = "Không nhận diện được";
    riskTitle = "Dữ liệu không chứa số điện thoại hoặc đường link hợp lệ";
    themeColor = "slate";
    notableSigns.push("Không tìm thấy định dạng số điện thoại hoặc URL trong nội dung vừa nhập.");
    recommendedActions.push("Kiểm tra lại cú pháp và dán đúng số điện thoại (VD: 0393767942, +212...) hoặc link (VD: https://...)");
  } else {
    // 🟡 YELLOW (Chưa có báo cáo cộng đồng — Cần thận trọng)
    warningLevel = "YELLOW";
    riskBadgeLabel = "Cần thận trọng";
    riskTitle = "Chưa có báo cáo cộng đồng — Cần thận trọng";
    themeColor = "amber";

    notableSigns.push("Số điện thoại / tên miền chưa có trong danh sách đen, nhưng chưa được xác minh danh tính chính thức.");
    notableSigns.push("Chưa có báo cáo cộng đồng về số này. Điều đó không chứng minh số điện thoại / website an toàn.");
    notableSigns.push("Kẻ lừa đảo thường xuyên mua sim rác mới và tạo tên miền mới liên tục chỉ trong vài giờ.");

    recommendedActions.push("Tự liên hệ qua kênh chính thức (tổng đài 156 hoặc số hotline niêm yết trên cổng thông tin nhà nước).");
    recommendedActions.push("Không cung cấp mã OTP, thông tin tài khoản ngân hàng hoặc CCCD.");
    recommendedActions.push("Không tải file ứng dụng lạ (.apk) được gửi qua tin nhắn.");
  }

  // Explanation compilation
  let explanation = "";
  if (urlDetails.length > 0) {
    explanation += urlDetails.map((u) => u.explanation).join(" ");
  }
  if (phoneDetails.length > 0) {
    explanation += " " + phoneDetails.map((p) => p.warningNote).join(" ");
  }
  explanation = explanation.trim();

  // Community Reports summary
  const lastReportText =
    phoneDetails.find((p) => p.lastReportedAt)?.lastReportedAt ||
    urlDetails.find((u) => u.lastReportedAt)?.lastReportedAt ||
    "Chưa có";

  const communityStatus: CommunityStatus =
    totalReports !== null && totalReports > 0
      ? "verified"
      : totalReports === 0
      ? "not_found"
      : "unavailable";

  const communityMessage =
    communityStatus === "verified"
      ? `Phát hiện ${totalReports} lượt phản ánh vi phạm từ mạng lưới an toàn thông tin.`
      : communityStatus === "not_found"
      ? "Nguồn dữ liệu đã được kiểm tra và chưa ghi nhận báo cáo."
      : "Chưa kết nối nguồn dữ liệu phản ánh cộng đồng đã được xác thực.";

  const threatMatch = THREAT_DATABASE.find(
    (t) =>
      (urlDetails.length > 0 && t.type === "domain" && urlDetails.some((u) => u.registrableDomain.toLowerCase() === t.pattern.toLowerCase())) ||
      (phoneDetails.length > 0 && t.type === "phone" && phoneDetails.some((p) => p.raw.includes(t.pattern) || p.normalized.includes(t.pattern)))
  );

  return {
    status: hasOfficialWarningMatch
      ? "OFFICIAL_MATCH"
      : dataType === "unknown"
      ? "invalid"
      : "success",
    input: trimmed,
    warningLevel,
    riskBadgeLabel,
    riskTitle,
    themeColor,
    dataType,
    dataTypeLabel,
    primaryTarget,
    realDomainOrPrefix,
    notableSigns,
    communityReports: {
      status: communityStatus,
      hasReports: communityStatus === "verified",
      reportCount: totalReports,
      lastReportText,
      message: communityMessage,
      sourceUrl: threatMatch?.sourceUrl || null,
      checkedAt: threatMatch ? (threatMatch.lastReport || "2026-03-01") : null,
    },
    recommendedActions,
    explanation,
    phones: phoneDetails,
    urls: urlDetails,
    hasOfficialWarningMatch: !!hasOfficialWarningMatch,
    officialWarningMatch: topOfficialPhone,
  };
}

/**
 * Enriches a base IndicatorCheckResult with Google Search Grounding & Official Verification results.
 */
export function enrichIndicatorWithGrounding(
  baseResult: IndicatorCheckResult,
  grounding: PublicPhoneSearchResult
): IndicatorCheckResult {
  const enriched = { ...baseResult };

  if (
    (grounding.status === "OFFICIAL_MATCH" || grounding.hasOfficialMatch) &&
    grounding.officialMatches &&
    grounding.officialMatches.length > 0
  ) {
    const topOfficial = grounding.officialMatches[0];

    enriched.status = "OFFICIAL_MATCH";
    enriched.warningLevel = "RED";
    enriched.riskBadgeLabel = "Từng xuất hiện trong cảnh báo chính thức";
    enriched.riskTitle = `Số điện thoại từng bị cơ quan chức năng (${topOfficial.verifiedHostname}) cảnh báo`;
    enriched.themeColor = "rose";
    enriched.hasOfficialWarningMatch = true;
    enriched.officialWarningMatch = topOfficial;
    enriched.referenceMatches = grounding.otherMatches || [];
    enriched.groundingSearchState = "completed";
    enriched.groundingSearchMessage = `Đã tìm thấy bài viết cảnh báo chính thức trên ${topOfficial.verifiedHostname}`;

    // Prepend critical findings to notable signs
    const newSigns: string[] = [
      `🚨 CẢNH BÁO CHÍNH THỨC: Số điện thoại này từng xuất hiện trong bài viết "${topOfficial.title}" (Ngày ghi nhận: ${topOfficial.publishedAt}).`,
      `Thủ đoạn ghi nhận: ${topOfficial.incidentCategory || topOfficial.category}.`,
      "Số này từng xuất hiện trong một vụ việc được nguồn chính thức công bố tại thời điểm nêu trên. Số điện thoại có thể bị giả mạo hoặc được cấp lại; kết quả không khẳng định danh tính chủ thuê bao hiện tại.",
      ...baseResult.notableSigns.filter(
        (s) => !s.includes("Chưa có báo cáo") && !s.includes("Chưa tìm thấy") && !s.includes("Chưa thể")
      ),
    ];
    enriched.notableSigns = newSigns;

    // Strict high risk action mandates
    enriched.recommendedActions = [
      "Không gọi lại, không trả lời, không mở đường link và không cung cấp thông tin cá nhân.",
      "Chặn ngay số điện thoại này trên ứng dụng Danh bạ / Cuộc gọi của bạn.",
      "Tuyệt đối không chuyển tiền, không đọc mã OTP và không cài đặt ứng dụng theo lời yêu cầu.",
      "Xem chi tiết bài viết cảnh báo gốc tại nút [Xem nguồn] bên dưới để nắm rõ thủ đoạn.",
    ];

    enriched.communityReports = {
      status: "verified",
      hasReports: true,
      reportCount: Math.max(baseResult.communityReports.reportCount || 0, 1),
      lastReportText: topOfficial.publishedAt || "Cảnh báo chính thức",
      message: `Từng xuất hiện trong cảnh báo chính thức của ${topOfficial.verifiedHostname}.`,
      sourceUrl: topOfficial.sourceUrl || `https://${topOfficial.verifiedHostname}`,
      checkedAt: topOfficial.publishedAt || new Date().toISOString(),
    };

    if (enriched.phones && enriched.phones.length > 0) {
      enriched.phones = enriched.phones.map((p) => ({
        ...p,
        hasOfficialWarningMatch: true,
        officialWarningMatch: topOfficial,
        referenceMatches: grounding.otherMatches,
        groundingResult: grounding,
        warningNote: `Số này từng xuất hiện trong cảnh báo chính thức của ${topOfficial.verifiedHostname} (${topOfficial.publishedAt}).`,
      }));
    }
  } else if (grounding.status === "SEARCH_ERROR") {
    // ⚠️ Grounding failed / quota error
    enriched.groundingSearchState = "error";
    enriched.groundingSearchMessage = "Chưa thể tra cứu nguồn công khai";
    // Keep technical warning level, do NOT set to green or "chưa có báo cáo"
  } else {
    // ℹ️ Grounding finished, no official match found
    enriched.hasOfficialWarningMatch = false;
    enriched.referenceMatches = grounding.otherMatches || [];
    enriched.groundingSearchState = "completed";
    enriched.groundingSearchMessage =
      "Chưa tìm thấy trong các nguồn công khai đã kiểm tra — điều này không chứng minh số điện thoại an toàn.";

    if (enriched.warningLevel !== "GREEN") {
      if (!enriched.notableSigns.some((s) => s.includes("không chứng minh số điện thoại an toàn"))) {
        enriched.notableSigns.push(
          "Chưa tìm thấy trong các nguồn công khai đã kiểm tra — điều này không chứng minh số điện thoại an toàn."
        );
      }
      enriched.communityReports.message =
        "Chưa tìm thấy trong các nguồn công khai đã kiểm tra — điều này không chứng minh số điện thoại an toàn.";
    }

    if (enriched.phones && enriched.phones.length > 0) {
      enriched.phones = enriched.phones.map((p) => ({
        ...p,
        groundingResult: grounding,
        referenceMatches: grounding.otherMatches,
      }));
    }
  }

  return enriched;
}
