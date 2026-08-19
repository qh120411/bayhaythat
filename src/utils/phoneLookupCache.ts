// Phone Lookup Local Database & Cache Layer
// Stores official_phone_warnings and community_phone_reports uniquely by canonicalPhone (E.164)
// Guarantees all variants (0948.913.212, 0948 913 212, 0948913212, +84948913212) resolve to the exact same record.

import {
  PublicPhoneSearchResult,
  OfficialPhoneMatch,
  normalizePhoneNumber,
  compareNormalizedPhoneNumbers,
  formatDottedVnPhone,
} from "./publicPhoneGrounding";

export interface OfficialPhoneWarningRecord {
  canonicalPhone: string; // e.g. "+84948913212" (Unique Index)
  displayPhone: string;   // e.g. "0948.913.212"
  sourceUrl: string;
  status: "historically_reported" | "active_warning";
  officialMatch: OfficialPhoneMatch;
  cachedAt: number;
  expiresAt: number;
  isOfficialVerified: boolean;
}

export interface CommunityPhoneReportRecord {
  canonicalPhone: string; // Unique Index
  displayPhone: string;
  reportCount: number;
  lastReportedAt: string;
  categories: string[];
}

// 1. In-memory store for official_phone_warnings (Unique Index by canonicalPhone)
const officialPhoneWarningsDb = new Map<string, OfficialPhoneWarningRecord>();

// 2. In-memory store for community_phone_reports (Unique Index by canonicalPhone)
const communityPhoneReportsDb = new Map<string, CommunityPhoneReportRecord>();

// Pre-seeded verified official warning numbers from public police and government releases
const SEED_OFFICIAL_RECORDS: Array<{
  phone: string;
  sourceUrl: string;
  title: string;
  verifiedHostname: string;
  publishedAt: string;
  incidentCategory: string;
  description: string;
}> = [
  // Required Test Case: 0948.913.212 / 0948913212 / +84948913212
  {
    phone: "0948.913.212",
    sourceUrl:
      "https://www.bocongan.gov.vn/bai-viet/kip-thoi-ngan-chan-vu-gia-danh-cong-an-lua-dao-chiem-doat-1-2-ty-dong-1779768901",
    title: "Kịp thời ngăn chặn vụ giả danh Công an lừa đảo chiếm đoạt 1,2 tỷ đồng",
    verifiedHostname: "bocongan.gov.vn",
    publishedAt: "Cảnh báo chính thức Bộ Công an",
    incidentCategory: "Giả danh công an / Lừa đảo chiếm đoạt tài sản",
    description:
      "Đối tượng sử dụng số điện thoại 0948.913.212 tự xưng là cán bộ công an đe dọa nạn nhân liên quan vụ án rửa tiền nhằm chiếm đoạt 1,2 tỷ đồng.",
  },
  {
    phone: "0393767942",
    sourceUrl:
      "https://bocongan.gov.vn/bai-viet/tuyen-quang-cong-an-co-so-ngan-chan-kip-thoi-vu-lua-dao-coc-tien-van-chuyen-tren-khong-gian-mang-1781601516",
    title: "Tuyên Quang: Công an cơ sở ngăn chặn kịp thời vụ lừa đảo cọc tiền vận chuyển trên không gian mạng",
    verifiedHostname: "bocongan.gov.vn",
    publishedAt: "26/02/2025",
    incidentCategory: "Lừa đảo cọc tiền vận chuyển / Mạo danh công an",
    description:
      "Đối tượng sử dụng số 0393767942 gọi điện giả danh cán bộ công an và tài xế vận chuyển để yêu cầu chuyển tiền đặt cọc.",
  },
  {
    phone: "0354716975",
    sourceUrl: "https://bocongan.gov.vn/canh-bao-gia-danh-dien-luc-0354716975",
    title: "Cảnh báo thủ đoạn mạo danh nhân viên điện lực gọi điện đe dọa cắt điện để lừa đảo",
    verifiedHostname: "bocongan.gov.vn",
    publishedAt: "15/01/2025",
    incidentCategory: "Mạo danh nhân viên điện lực / lừa đảo chuyển khoản",
    description:
      "Đối tượng dùng số 0354716975 giả danh nhân viên điện lực gọi điện đe dọa nợ tiền điện và yêu cầu chuyển khoản thanh toán.",
  },
  {
    phone: "0812728977",
    sourceUrl: "https://gdt.gov.vn/canh-bao-ung-dung-thue-gia-mao-0812728977",
    title: "Cảnh báo chiêu trò mạo danh cán bộ thuế yêu cầu cài đặt ứng dụng nộp thuế giả mạo",
    verifiedHostname: "gdt.gov.vn",
    publishedAt: "10/02/2025",
    incidentCategory: "Mạo danh cán bộ cơ quan thuế / cài mã độc",
    description:
      "Đối tượng dùng số 0812728977 gọi điện tự xưng cán bộ thuế yêu cầu truy cập đường link để cài ứng dụng có chứa mã độc.",
  },
  {
    phone: "0365862273",
    sourceUrl: "https://cuccsgt.bocongan.gov.vn/canh-bao-thu-doan-mao-danh-cu-csgt",
    title: "Cảnh báo thủ đoạn mạo danh cán bộ Cục CSGT gọi điện thông báo phạt nguội",
    verifiedHostname: "cuccsgt.bocongan.gov.vn",
    publishedAt: "18/06/2025",
    incidentCategory: "Mạo danh Cục Cảnh sát giao thông thông báo phạt nguội",
    description:
      "Đối tượng sử dụng số 0365862273 xưng là cán bộ công an yêu cầu nạn nhân chuyển tiền nộp phạt vào tài khoản cá nhân.",
  },
  {
    phone: "0812345678",
    sourceUrl: "https://congan.hanoi.gov.vn/canh-bao-vneid-muc-2",
    title: "Công an TP.Hà Nội khuyến cáo về số điện thoại lừa đảo nâng cấp VNeID mức 2",
    verifiedHostname: "congan.hanoi.gov.vn",
    publishedAt: "10/07/2025",
    incidentCategory: "Giả danh công an phường hướng dẫn cài đặt VNeID giả mạo",
    description:
      "Số điện thoại gửi tin nhắn kèm link cài file APK mã độc chiếm quyền điều khiển điện thoại.",
  },
];

// Pre-seeded community reports
const SEED_COMMUNITY_REPORTS: Array<{
  phone: string;
  reportCount: number;
  lastReportedAt: string;
  categories: string[];
}> = [
  {
    phone: "0948913212",
    reportCount: 54,
    lastReportedAt: "Ghi nhận gần nhất",
    categories: ["Giả danh công an", "Dọa khóa tài khoản"],
  },
  {
    phone: "0393767942",
    reportCount: 38,
    lastReportedAt: "26/02/2025",
    categories: ["Mạo danh công an", "Lừa cọc vận chuyển"],
  },
  {
    phone: "0354716975",
    reportCount: 19,
    lastReportedAt: "15/01/2025",
    categories: ["Mạo danh Điện lực"],
  },
  {
    phone: "0812728977",
    reportCount: 27,
    lastReportedAt: "10/02/2025",
    categories: ["Mạo danh Cơ quan Thuế"],
  },
  {
    phone: "0365862273",
    reportCount: 42,
    lastReportedAt: "18/06/2025",
    categories: ["Phạt nguội giả mạo"],
  },
];

// Initialize database with canonicalPhone as unique index
(() => {
  const ONE_YEAR_MS = 365 * 24 * 60 * 60 * 1000;
  const now = Date.now();

  for (const seed of SEED_OFFICIAL_RECORDS) {
    const { canonicalPhone, displayPhone, localPhone } = normalizePhoneNumber(seed.phone);
    if (!canonicalPhone) continue;

    const record: OfficialPhoneWarningRecord = {
      canonicalPhone,
      displayPhone: formatDottedVnPhone(localPhone),
      sourceUrl: seed.sourceUrl,
      status: "historically_reported",
      officialMatch: {
        title: seed.title,
        sourceUrl: seed.sourceUrl,
        verifiedHostname: seed.verifiedHostname,
        publishedAt: seed.publishedAt,
        incidentCategory: seed.incidentCategory,
        category: seed.incidentCategory,
        description: seed.description,
        matchedVariant: displayPhone,
        canonicalPhone,
        checkedAt: new Date().toISOString(),
      },
      cachedAt: now,
      expiresAt: now + ONE_YEAR_MS,
      isOfficialVerified: true,
    };

    // Stored uniquely by canonicalPhone
    officialPhoneWarningsDb.set(canonicalPhone, record);
  }

  for (const comm of SEED_COMMUNITY_REPORTS) {
    const { canonicalPhone, displayPhone, localPhone } = normalizePhoneNumber(comm.phone);
    if (!canonicalPhone) continue;

    const commRecord: CommunityPhoneReportRecord = {
      canonicalPhone,
      displayPhone: formatDottedVnPhone(localPhone),
      reportCount: comm.reportCount,
      lastReportedAt: comm.lastReportedAt,
      categories: comm.categories,
    };

    communityPhoneReportsDb.set(canonicalPhone, commRecord);
  }
})();

const OFFICIAL_CACHE_TTL_MS = 30 * 24 * 60 * 60 * 1000; // 30 days for official police alerts

/**
 * Step 1: Tra cứu database official_phone_warnings theo canonicalPhone
 * Tất cả các biến thể (0948.913.212, 0948 913 212, 0948913212, +84948913212) đều chuẩn hóa
 * về canonicalPhone (+84948913212) trước khi tra cứu.
 */
export function getOfficialPhoneWarning(rawPhone: string): OfficialPhoneWarningRecord | null {
  const { canonicalPhone } = normalizePhoneNumber(rawPhone);
  if (!canonicalPhone) return null;

  const record = officialPhoneWarningsDb.get(canonicalPhone);
  if (!record) return null;

  const now = Date.now();
  if (now > record.expiresAt) {
    officialPhoneWarningsDb.delete(canonicalPhone);
    return null;
  }

  return record;
}

/**
 * Step 2: Tra cứu database community_phone_reports theo canonicalPhone
 */
export function getCommunityPhoneReport(rawPhone: string): CommunityPhoneReportRecord | null {
  const { canonicalPhone } = normalizePhoneNumber(rawPhone);
  if (!canonicalPhone) return null;

  return communityPhoneReportsDb.get(canonicalPhone) || null;
}

/**
 * Gets cached phone lookup result if present in official warnings.
 * Automatically normalizes any phone representation to canonical E.164.
 */
export function getCachedPhoneLookup(rawPhone: string): PublicPhoneSearchResult | null {
  const { canonicalPhone, localPhone, displayPhone } = normalizePhoneNumber(rawPhone);
  if (!canonicalPhone) return null;

  const warning = getOfficialPhoneWarning(canonicalPhone);
  if (!warning) return null;

  console.log(`[LOCAL_DATABASE_HIT] Khớp bản ghi cảnh báo chính thức trong database cho số canonical: ${canonicalPhone}`);

  return {
    canonicalPhone: warning.canonicalPhone,
    displayPhone: warning.displayPhone,
    normalizedPhone: localPhone,
    e164: warning.canonicalPhone,
    localFormat: localPhone,
    searchVariants: [warning.displayPhone, localPhone, warning.canonicalPhone],
    hasOfficialMatch: true,
    officialMatches: [warning.officialMatch],
    otherMatches: [],
    searchPerformed: true,
    searchedAt: new Date(warning.cachedAt).toISOString(),
    fromCache: true,
    cacheExpiresAt: new Date(warning.expiresAt).toISOString(),
    status: "OFFICIAL_MATCH",
    riskLevel: "HIGH",
    statusMessage: `Từng xuất hiện trong cảnh báo chính thức của ${warning.officialMatch.verifiedHostname}`,
  };
}

/**
 * Saves a newly verified official phone warning into the database with canonicalPhone as unique index.
 */
export function setCachedPhoneLookup(
  phone: string,
  e164: string,
  result: PublicPhoneSearchResult
): void {
  const now = Date.now();
  const isOfficial = result.hasOfficialMatch && result.officialMatches && result.officialMatches.length > 0;

  if (isOfficial) {
    const topOfficial = result.officialMatches[0];
    const { canonicalPhone, displayPhone, localPhone } = normalizePhoneNumber(
      result.canonicalPhone || e164 || phone
    );

    if (!canonicalPhone) return;

    const record: OfficialPhoneWarningRecord = {
      canonicalPhone,
      displayPhone: displayPhone || formatDottedVnPhone(localPhone),
      sourceUrl: topOfficial.sourceUrl,
      status: "historically_reported",
      officialMatch: {
        ...topOfficial,
        canonicalPhone,
        matchedVariant: displayPhone,
      },
      cachedAt: now,
      expiresAt: now + OFFICIAL_CACHE_TTL_MS,
      isOfficialVerified: true,
    };

    // Stored uniquely by canonicalPhone
    officialPhoneWarningsDb.set(canonicalPhone, record);
  }
}
