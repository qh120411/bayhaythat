import { ShieldCheck, AlertTriangle, ShieldAlert, AlertOctagon, LucideIcon } from "lucide-react";

export type CanonicalRiskLevel = "SAFE" | "VERIFY" | "HIGH" | "CRITICAL";

export const RISK_RANK: Record<CanonicalRiskLevel, number> = {
  SAFE: 0,
  VERIFY: 1,
  HIGH: 2,
  CRITICAL: 3,
};

export function compareRisk(a: CanonicalRiskLevel, b: CanonicalRiskLevel): number {
  return RISK_RANK[a] - RISK_RANK[b];
}

export function maxRisk(a: CanonicalRiskLevel, b: CanonicalRiskLevel): CanonicalRiskLevel {
  return RISK_RANK[a] >= RISK_RANK[b] ? a : b;
}

export function mapStringToCanonicalRisk(input: string | undefined | null): CanonicalRiskLevel {
  if (!input) return "VERIFY";
  const normalized = input.trim().toUpperCase();

  if (normalized === "CRITICAL" || normalized.includes("RẤT CAO") || normalized.includes("RAT CAO") || normalized.includes("NGUY HIỂM")) {
    return "CRITICAL";
  }
  if (normalized === "HIGH" || normalized.includes("RỦI RO CAO") || normalized.includes("RUI RO CAO")) {
    return "HIGH";
  }
  if (normalized === "VERIFY" || normalized.includes("XÁC MINH") || normalized.includes("XAC MINH") || normalized.includes("THẬN TRỌNG") || normalized.includes("THAN TRONG")) {
    return "VERIFY";
  }
  if (normalized === "SAFE" || normalized.includes("CHƯA THẤY") || normalized.includes("AN TOÀN") || normalized.includes("AN TOAN")) {
    return "SAFE";
  }

  return "VERIFY";
}

export function mapCanonicalToLegacyVietnamese(canonical: CanonicalRiskLevel): string {
  switch (canonical) {
    case "CRITICAL":
      return "Rủi ro rất cao";
    case "HIGH":
      return "Rủi ro cao";
    case "VERIFY":
      return "Cần thận trọng và xác minh";
    case "SAFE":
    default:
      return "Chưa thấy dấu hiệu rõ ràng";
  }
}

export interface CanonicalRiskUIDefinition {
  level: CanonicalRiskLevel;
  badgeLabel: string;
  fixedTitle: string;
  vietnameseLevel: string;
  statusLine: string;
  themeColor: "emerald" | "amber" | "orange" | "rose";
  bannerBg: string;
  containerBg: string;
  containerBorder: string;
  badgeBg: string;
  badgeText: string;
  badgeBorder: string;
  icon: LucideIcon;
  iconColor: string;
  cardBorder: string;
  corePrinciple: string;
  defaultActions: string[];
  defaultAvoidActions: string[];
}

export const CANONICAL_RISK_UI: Record<CanonicalRiskLevel, CanonicalRiskUIDefinition> = {
  SAFE: {
    level: "SAFE",
    badgeLabel: "Chưa thấy dấu hiệu rủi ro rõ ràng",
    fixedTitle: "Chưa phát hiện dấu hiệu lừa đảo trong nội dung được cung cấp",
    vietnameseLevel: "Chưa thấy dấu hiệu rõ ràng",
    statusLine: "Mức độ an toàn: Chưa thấy dấu hiệu bất thường",
    themeColor: "emerald",
    bannerBg: "bg-emerald-50 border-2 border-emerald-300 text-emerald-950 shadow-sm",
    containerBg: "bg-emerald-50",
    containerBorder: "border-2 border-emerald-300 text-emerald-950 shadow-sm",
    badgeBg: "bg-emerald-100",
    badgeText: "text-emerald-900 font-bold",
    badgeBorder: "border-emerald-300",
    icon: ShieldCheck,
    iconColor: "text-emerald-600",
    cardBorder: "border-emerald-200",
    corePrinciple: "Nếu nội dung hoặc yêu cầu thay đổi, hãy kiểm tra lại trước khi thực hiện giao dịch.",
    defaultActions: [
      "Nếu nội dung hoặc yêu cầu thay đổi, hãy kiểm tra lại trước khi thực hiện giao dịch.",
    ],
    defaultAvoidActions: [],
  },
  VERIFY: {
    level: "VERIFY",
    badgeLabel: "Cần thận trọng và xác minh",
    fixedTitle: "Cần thận trọng và xác minh trước khi tiếp tục",
    vietnameseLevel: "Cần thận trọng và xác minh",
    statusLine: "Mức độ rủi ro: Cần xác minh độc lập qua kênh chính thống",
    themeColor: "amber",
    bannerBg: "bg-amber-50 border-2 border-amber-300 text-amber-950 shadow-sm",
    containerBg: "bg-amber-50",
    containerBorder: "border-2 border-amber-300 text-amber-950 shadow-sm",
    badgeBg: "bg-amber-100",
    badgeText: "text-amber-900 font-bold",
    badgeBorder: "border-amber-300",
    icon: AlertTriangle,
    iconColor: "text-amber-600",
    cardBorder: "border-amber-200",
    corePrinciple: "Chủ động ngắt liên lạc và tự gọi lại số điện thoại chính thức được công bố trên website .gov.vn hoặc của ngân hàng.",
    defaultActions: [
      "Tạm dừng phản hồi, không thực hiện ngay bất kỳ thao tác bấm link hay gửi tiền.",
      "Tự tra cứu số tổng đài chính thức của đơn vị liên quan để gọi đối chứng trực tiếp.",
      "Hỏi ý kiến người thân hoặc người am hiểu công nghệ trong gia đình.",
    ],
    defaultAvoidActions: [
      "Không gọi lại số điện thoại lạ vừa liên lạc với bạn.",
      "Không bấm vào đường link nhận được qua tin nhắn/chat.",
      "Không cung cấp mã OTP hoặc thông tin bảo mật tài khoản.",
    ],
  },
  HIGH: {
    level: "HIGH",
    badgeLabel: "Rủi ro cao",
    fixedTitle: "Có nhiều dấu hiệu đáng ngờ — không làm theo yêu cầu",
    vietnameseLevel: "Rủi ro cao",
    statusLine: "Mức độ rủi ro: Rủi ro cao — Dấu hiệu lừa đảo nguy hiểm",
    themeColor: "orange",
    bannerBg: "bg-rose-50 border-2 border-rose-300 text-rose-950 shadow-sm",
    containerBg: "bg-rose-50",
    containerBorder: "border-2 border-rose-300 text-rose-950 shadow-sm",
    badgeBg: "bg-rose-100",
    badgeText: "text-rose-900 font-bold",
    badgeBorder: "border-rose-300",
    icon: ShieldAlert,
    iconColor: "text-rose-600",
    cardBorder: "border-rose-200",
    corePrinciple: "Cơ quan nhà nước và ngân hàng không bao giờ yêu cầu chuyển tiền vào tài khoản cá nhân hay đòi mã OTP qua mạng.",
    defaultActions: [
      "Dừng ngay mọi trao đổi và chặn số/chặn tài khoản đối phương.",
      "Không mở đường link, không cài bất kỳ ứng dụng nào (.apk).",
      "Nếu đã lỡ thao tác: Gọi ngay hotline ngân hàng để tạm khóa tài khoản/thẻ khẩn cấp.",
    ],
    defaultAvoidActions: [
      "Tuyệt đối không chuyển tiền nộp phạt, phí dịch vụ hay tiền đảm bảo.",
      "Không chia sẻ mã OTP, mật khẩu hoặc màn hình điện thoại.",
      "Không làm theo yêu cầu 'giữ bí mật không nói với ai'.",
    ],
  },
  CRITICAL: {
    level: "CRITICAL",
    badgeLabel: "Nguy hiểm — dấu hiệu lừa đảo rõ ràng",
    fixedTitle: "Dừng lại ngay — không chuyển tiền, cung cấp OTP hoặc mở liên kết",
    vietnameseLevel: "Rủi ro rất cao",
    statusLine: "Mức độ nguy hiểm: RẤT CAO — Dấu hiệu lừa đảo và phishing rõ ràng",
    themeColor: "rose",
    bannerBg: "bg-rose-100 border-2 border-rose-500 text-rose-950 shadow-md",
    containerBg: "bg-rose-100",
    containerBorder: "border-2 border-rose-500 text-rose-950 shadow-md",
    badgeBg: "bg-rose-600",
    badgeText: "text-white font-black tracking-wide",
    badgeBorder: "border-rose-700",
    icon: AlertOctagon,
    iconColor: "text-rose-700",
    cardBorder: "border-rose-300",
    corePrinciple: "ĐÂY LÀ KỊCH BẢN LỪA ĐẢO TỐI NGUY HIỂM. DỪNG MỌI THAO TÁC NGAY LẬP TỨC ĐỂ BẢO VỆ TÀI SẢN!",
    defaultActions: [
      "DỪNG NGAY TẤT CẢ LIÊN LẠC — KHÔNG CHUYỂN TIỀN, KHÔNG BẤM LINK, KHÔNG TRẢ LỜI TIN NHẮN!",
      "Khóa thẻ / khóa tài khoản ngân hàng ngay lập tức nếu đã cung cấp thông tin hoặc chuyển tiền.",
      "Thông báo ngay cho người thân và liên hệ Công an xã/phường gần nhất hoặc gọi tổng đài 156.",
    ],
    defaultAvoidActions: [
      "TUYỆT ĐỐI KHÔNG CHUYỂN TIỀN vào bất kỳ tài khoản cá nhân hay tài khoản tạm giữ nào.",
      "KHÔNG bấm vào đường link giả mạo và KHÔNG trả lời tin nhắn (không soạn '1' hoặc 'Y').",
      "KHÔNG cài ứng dụng lạ hay cấp quyền trợ năng/chia sẻ màn hình.",
    ],
  },
};

export function getCanonicalRiskUI(level: CanonicalRiskLevel | undefined | null): CanonicalRiskUIDefinition {
  if (!level || !CANONICAL_RISK_UI[level]) {
    return CANONICAL_RISK_UI.VERIFY;
  }
  return CANONICAL_RISK_UI[level];
}
