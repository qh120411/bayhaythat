import type { CanonicalRiskLevel } from "./utils/riskConfig";
import type { TraceCheckResult, PhoneTraceItem, DomainTraceItem } from "./utils/reputationService";
import type {
  IndicatorCheckResult,
  IndicatorWarningLevel,
  IndicatorPhoneDetail,
  IndicatorUrlDetail,
} from "./utils/indicatorLookup";
import type {
  OfficialPhoneMatch,
  ReferencePhoneMatch,
  PublicPhoneSearchResult,
} from "./utils/publicPhoneGrounding";

export type {
  CanonicalRiskLevel,
  TraceCheckResult,
  PhoneTraceItem,
  DomainTraceItem,
  IndicatorCheckResult,
  IndicatorWarningLevel,
  IndicatorPhoneDetail,
  IndicatorUrlDetail,
  OfficialPhoneMatch,
  ReferencePhoneMatch,
  PublicPhoneSearchResult,
};

export interface EvidenceSource {
  type: "technical_rule" | "ai_inference" | "external_verified";
  label: string;
  sourceUrl?: string;
  checkedAt?: string;
  confidence: "low" | "medium" | "high";
}

export type CommunityStatus = "verified" | "not_found" | "unavailable";

export interface CommunityReportResult {
  status: CommunityStatus;
  reportCount: number | null;
  lastReportedAt: string | null;
  sourceUrl: string | null;
  checkedAt: string | null;
}

export interface ExtractedEvidence {
  quote: string;
  signal: string;
  source: "user_input" | "technical_analysis" | "external_source";
}

export type RiskLevel =
  | "Chưa thấy dấu hiệu rõ ràng"
  | "Cần thận trọng"
  | "Cần xác minh"
  | "Rủi ro cao"
  | "Rủi ro rất cao"
  | "Chưa rõ";

export interface EvidenceItem {
  noi_dung: string;
  nguon: "tinh_huong_ban_dau" | "cau_tra_loi_bo_sung";
  y_nghia: string;
}

export interface TechnicalPhoneInfo {
  raw: string;
  normalized: string;
  countryCode?: string;
  countryName?: string;
  isVietnam: boolean;
  isForeign: boolean;
  isSuspicious: boolean;
  suspicionReason?: string;
}

export interface TechnicalUrlInfo {
  raw: string;
  normalized: string;
  protocol: string;
  hostname: string;
  subdomain: string;
  registrableDomain: string; // Tên miền đăng ký thật (e.g. eu.cc, dichvucong.gov.vn)
  tld: string;
  pathname: string;
  fullPath: string;
  hasDeceptivePath: boolean;
  deceptiveKeywordsInPath: string[];
  isSuspiciousTld: boolean;
  isDirectIp: boolean;
  isShortenedUrl: boolean;
  explanation: string;
}

export interface TechnicalScoreBreakdown {
  id: string;
  sign: string;
  points: number;
  evidence: string;
}

export interface TechnicalAnalysisData {
  phoneAnalysis?: {
    hasPhone: boolean;
    phones: TechnicalPhoneInfo[];
    isForeignSenderWithVnIdentity: boolean;
    summary: string;
    details: string[];
  };
  urlAnalysis?: {
    hasUrl: boolean;
    urls: TechnicalUrlInfo[];
    hasDomainMismatch: boolean;
    hasPathDeception: boolean;
    summary: string;
    details: string[];
  };
  contentAnalysis?: {
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
  };
  identityMismatch?: {
    hasConflict: boolean;
    claimedIdentity: string | null;
    claimedType?: string;
    senderPhoneCountry?: string;
    actualRegistrableDomain?: string;
    demandedAction?: string;
    conflictDescription?: string;
  };
  scoring?: {
    totalScore: number;
    riskLevel: RiskLevel;
    scoreBreakdown: TechnicalScoreBreakdown[];
    verdictSummary: string;
  };
}

export interface FollowUpQuestion {
  id: string;
  cau_hoi: string;
  loai_tra_loi: "co_khong" | "van_ban";
  cac_lua_chon?: string[];
}

export interface AnalysisResponse {
  // CANONICAL SINGLE SOURCE OF RISK TRUTH
  finalRiskLevel: CanonicalRiskLevel;
  ruleBasedRiskLevel?: CanonicalRiskLevel;
  aiRiskLevel?: CanonicalRiskLevel;
  reputationRiskLevel?: CanonicalRiskLevel;
  traceCheckResult?: TraceCheckResult;

  // Canonical structured fields
  badgeLabel?: string;
  riskReasons?: string[];
  immediateActions?: string[];
  needsMoreInformation?: boolean;
  title?: string;
  isPreliminary?: boolean;

  // Legacy compatibility fields
  muc_rui_ro: RiskLevel;
  ket_luan_ngan: string;
  bang_chung_da_co?: EvidenceItem[];
  thong_tin_con_thieu?: string[];
  cau_hoi_bo_sung?: FollowUpQuestion[];
  followUpQuestions?: FollowUpQuestion[];
  ly_do_thay_doi_muc_rui_ro?: string;
  hanh_dong_an_toan?: string[];
  co_can_hoi_them?: boolean;
  so_luot_da_hoi?: number;

  // Structured Evidence & Grounding
  confidence?: "low" | "medium" | "high";
  extractedEvidence?: ExtractedEvidence[];
  uncertainClaims?: string[];
  limitations?: string[];
  evidenceSources?: EvidenceSource[];
  communityReportResult?: CommunityReportResult;
  isSanitized?: boolean;
  sanitizedPreview?: string;

  // Systematic Technical Indicators Result
  technicalAnalysis?: TechnicalAnalysisData;

  // Additional fields for rich guidance and action cards
  cac_dau_hieu?: string[];
  bang_chung?: string[];
  thong_tin_chua_ro_can_hoi?: string[];
  giai_thich?: string;
  canh_bao_phong_ngua?: string;
  viec_can_lam_ngay?: string[];
  viec_khong_nen_lam?: string[];
  thong_tin_can_xac_minh?: string[];
  tin_nhan_tu_choi_goi_y?: string;
  cau_hoi_xac_minh_goi_y?: string;
  noi_dung_gui_nguoi_than?: string;
  canh_bao_an_toan?: string;
  warning?: string;
}

export interface InitialAnalysisInput {
  type: InputMode;
  text?: string;
  linkUrl?: string;
  imageBase64?: string;
  imageMimeType?: string;
  audioBase64?: string;
  audioMimeType?: string;
}

export interface ConversationTurn {
  turnIndex: number;
  timestamp: string;
  result: AnalysisResponse;
  userAnswers?: Array<{
    questionId: string;
    question: string;
    answer: string;
  }>;
  extraNote?: string;
}

export type InputMode = "text" | "indicator" | "image" | "link" | "audio" | "story" | "police_call";

export interface DemoScenario {
  id: string;
  title: string;
  tag: string;
  shortDesc: string;
  senderName: string;
  avatarIcon: string;
  inputData: {
    type: InputMode;
    text: string;
    linkUrl?: string;
    imagePreviewUrl?: string;
    audioDesc?: string;
  };
  mockResult: AnalysisResponse;
  highlightWords: string[];
  psychologicalTactic: string;
  quickRefusal: string;
  victimScenario: string;
}

export interface QuizItem {
  id: number;
  scenarioText: string;
  sourceContext: string;
  tag: string;
  isScam: boolean;
  correctAnswerText: string;
  explanation: string;
  goldenRule: string;
  keySigns: string[];
}

export interface HotlineContact {
  id: string;
  name: string;
  category: "authority" | "telecom" | "bank";
  phone: string;
  hours: string;
  desc: string;
  badge: string;
}

export interface OfficialSourceEntry {
  id: string;
  name: string;
  domain: string;
  url: string;
  authority: string;
  description: string;
  isPrimaryPolicePortal?: boolean;
}


