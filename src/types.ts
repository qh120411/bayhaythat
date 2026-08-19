export type RiskLevel = "Chưa thấy dấu hiệu rõ ràng" | "Cần xác minh" | "Rủi ro cao" | "Chưa rõ";

export interface EvidenceItem {
  noi_dung: string;
  nguon: "tinh_huong_ban_dau" | "cau_tra_loi_bo_sung";
  y_nghia: string;
}

export interface FollowUpQuestion {
  id: string;
  cau_hoi: string;
  loai_tra_loi: "co_khong" | "van_ban";
  cac_lua_chon?: string[];
}

export interface AnalysisResponse {
  muc_rui_ro: RiskLevel;
  ket_luan_ngan: string;
  bang_chung_da_co?: EvidenceItem[];
  thong_tin_con_thieu?: string[];
  cau_hoi_bo_sung?: FollowUpQuestion[];
  ly_do_thay_doi_muc_rui_ro?: string;
  hanh_dong_an_toan?: string[];
  co_can_hoi_them?: boolean;
  so_luot_da_hoi?: number;

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

export type InputMode = "text" | "image" | "link" | "audio" | "story" | "police_call";

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
