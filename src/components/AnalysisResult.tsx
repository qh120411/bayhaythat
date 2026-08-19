import React, { useState, useEffect } from "react";
import {
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Volume2,
  VolumeX,
  Share2,
  Copy,
  Check,
  RotateCcw,
  ShieldAlert,
  ShieldCheck,
  PhoneCall,
  MessageCircle,
  HelpCircle,
  Sparkles,
  ArrowRight,
  Info,
  Send,
  Loader2,
  RefreshCw,
  FileCheck2,
} from "lucide-react";
import { AnalysisResponse, RiskLevel } from "../types";

interface AnalysisResultProps {
  result: AnalysisResponse;
  originalInputText?: string;
  isLargeFont: boolean;
  onReset: () => void;
  onOpenHotline: () => void;
  onSubmitFollowUpAnswers?: (
    answers: Array<{ questionId: string; question: string; answer: string }>,
    extraNote: string
  ) => Promise<void> | void;
  isReanalyzing?: boolean;
  currentTurn?: number;
}

export const AnalysisResult: React.FC<AnalysisResultProps> = ({
  result,
  originalInputText,
  isLargeFont,
  onReset,
  onOpenHotline,
  onSubmitFollowUpAnswers,
  isReanalyzing = false,
  currentTurn = 0,
}) => {
  const [isPlayingAudio, setIsPlayingAudio] = useState(false);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [copiedShare, setCopiedShare] = useState(false);

  // State for interactive follow-up answers
  const [answersState, setAnswersState] = useState<Record<string, string>>({});
  const [extraNoteText, setExtraNoteText] = useState("");
  const [formValidationWarning, setFormValidationWarning] = useState<string | null>(null);

  // Reset form when result changes
  useEffect(() => {
    setAnswersState({});
    setExtraNoteText("");
    setFormValidationWarning(null);
  }, [result]);

  // Text-To-Speech Synthesis in Vietnamese
  useEffect(() => {
    return () => {
      if (window.speechSynthesis) {
        window.speechSynthesis.cancel();
      }
    };
  }, []);

  const handleToggleAudio = () => {
    if (!window.speechSynthesis) {
      alert("Trình duyệt này chưa hỗ trợ đọc to giọng nói.");
      return;
    }

    if (isPlayingAudio) {
      window.speechSynthesis.cancel();
      setIsPlayingAudio(false);
    } else {
      const textToRead = `${result.ket_luan_ngan}. ${result.giai_thich || ""}. Những việc cần làm ngay: ${result.viec_can_lam_ngay?.slice(0, 2).join(". ") || ""}`;
      const utterance = new SpeechSynthesisUtterance(textToRead);
      utterance.lang = "vi-VN";
      utterance.rate = 0.95; // Clear natural speed

      utterance.onend = () => setIsPlayingAudio(false);
      utterance.onerror = () => setIsPlayingAudio(false);

      window.speechSynthesis.speak(utterance);
      setIsPlayingAudio(true);
    }
  };

  const handleCopyText = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2500);
  };

  const handleShareZalo = () => {
    const summaryText = `⚠️ [CẢNH BÁO TỪ 'BẪY HAY THẬT ?']\n\n📌 Đánh giá: ${result.muc_rui_ro.toUpperCase()}\n📝 Kết luận: ${result.ket_luan_ngan}\n💡 Bản chất: ${result.giai_thich || ""}\n\n🛑 LƯU Ý QUAN TRỌNG: TUYỆT ĐỐI KHÔNG CHUYỂN TIỀN, KHÔNG ĐỌC MÃ OTP, KHÔNG BẤM LINK LẠ!\n\nChi tiết kiểm tra an toàn tại: ${window.location.href}`;
    navigator.clipboard.writeText(summaryText);
    setCopiedShare(true);
    setTimeout(() => setCopiedShare(false), 3000);
  };

  // Color config based on risk level
  const getRiskConfig = (level: RiskLevel) => {
    switch (level) {
      case "Rủi ro cao":
        return {
          bannerBg: "bg-rose-50 border-2 border-rose-300 text-rose-950 shadow-sm",
          badgeBg: "bg-rose-100 text-rose-900 border-rose-300",
          icon: ShieldAlert,
          iconColor: "text-rose-600",
          statusText: "🚨 RỦI RO LỪA ĐẢO CAO",
        };
      case "Cần xác minh":
        return {
          bannerBg: "bg-amber-50 border-2 border-amber-300 text-amber-950 shadow-sm",
          badgeBg: "bg-amber-100 text-amber-900 border-amber-300",
          icon: AlertTriangle,
          iconColor: "text-amber-600",
          statusText: "⚠️ CỰC KỲ ĐÁNG NGỜ - CẦN XÁC MINH",
        };
      case "Chưa rõ":
        return {
          bannerBg: "bg-slate-100 border-2 border-slate-300 text-slate-900 shadow-sm",
          badgeBg: "bg-slate-200 text-slate-800 border-slate-300",
          icon: HelpCircle,
          iconColor: "text-slate-600",
          statusText: "❓ CHƯA ĐỦ THÔNG TIN KẾT LUẬN",
        };
      case "Chưa thấy dấu hiệu rõ ràng":
      default:
        return {
          bannerBg: "bg-emerald-50 border-2 border-emerald-300 text-emerald-950 shadow-sm",
          badgeBg: "bg-emerald-100 text-emerald-900 border-emerald-300",
          icon: ShieldCheck,
          iconColor: "text-emerald-600",
          statusText: "✅ CHƯA THẤY DẤU HIỆU RÕ RÀNG",
        };
    }
  };

  const riskConfig = getRiskConfig(result.muc_rui_ro);
  const RiskIcon = riskConfig.icon;

  // Handle setting answer for a question
  const handleSelectAnswer = (qId: string, val: string) => {
    setAnswersState((prev) => ({
      ...prev,
      [qId]: val,
    }));
    setFormValidationWarning(null);
  };

  // Handle submit follow-up answers
  const handleSubmitAnswers = () => {
    if (!onSubmitFollowUpAnswers || !result.cau_hoi_bo_sung) return;

    const formattedAnswers = result.cau_hoi_bo_sung.map((q) => ({
      questionId: q.id,
      question: q.cau_hoi,
      answer: answersState[q.id]?.trim() || "Tôi không nhớ",
    }));

    // Check if at least one question has been answered or extra note filled
    const hasAnyResponse = Object.keys(answersState).length > 0 || extraNoteText.trim().length > 0;
    if (!hasAnyResponse) {
      setFormValidationWarning("Vui lòng chọn hoặc nhập câu trả lời cho ít nhất một câu hỏi để AI phân tích lại.");
      return;
    }

    onSubmitFollowUpAnswers(formattedAnswers, extraNoteText.trim());
  };

  const hasFollowUpQuestions =
    Boolean(result.co_can_hoi_them) &&
    Array.isArray(result.cau_hoi_bo_sung) &&
    result.cau_hoi_bo_sung.length > 0;

  return (
    <section className="py-6 sm:py-8 px-4 max-w-5xl mx-auto space-y-6 animate-in fade-in duration-300">
      {/* Top Toolbar Action Bar */}
      <div className="flex items-center justify-between gap-3 bg-white p-3 rounded-2xl border border-slate-200 shadow-sm flex-wrap">
        <button
          id="btn-back-to-input"
          onClick={onReset}
          className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs sm:text-sm font-bold flex items-center gap-2 transition-colors cursor-pointer"
        >
          <RotateCcw className="w-4 h-4" />
          <span>Kiểm tra trường hợp khác</span>
        </button>

        <div className="flex items-center gap-2">
          {/* Read out loud audio */}
          <button
            id="btn-voice-read-result"
            onClick={handleToggleAudio}
            className={`px-3.5 py-2 rounded-xl text-xs sm:text-sm font-bold flex items-center gap-2 transition-all border cursor-pointer ${
              isPlayingAudio
                ? "bg-emerald-600 text-white border-emerald-600 shadow-md animate-pulse"
                : "bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border-emerald-200"
            }`}
          >
            {isPlayingAudio ? (
              <>
                <VolumeX className="w-4 h-4" />
                <span>Đang đọc to... (Bấm để dừng)</span>
              </>
            ) : (
              <>
                <Volume2 className="w-4 h-4" />
                <span>Đọc to cho tôi nghe 🔊</span>
              </>
            )}
          </button>

          {/* Share to Zalo/Family */}
          <button
            id="btn-share-to-family"
            onClick={handleShareZalo}
            className="px-3.5 py-2 rounded-xl bg-blue-50 hover:bg-blue-100 text-blue-800 border border-blue-200 text-xs sm:text-sm font-bold flex items-center gap-2 transition-colors cursor-pointer"
            title="Sao chép bản tóm tắt để gửi sang Zalo cho người thân"
          >
            {copiedShare ? (
              <>
                <Check className="w-4 h-4 text-blue-600" />
                <span>Đã sao chép gửi Zalo!</span>
              </>
            ) : (
              <>
                <Share2 className="w-4 h-4" />
                <span>Gửi cảnh báo sang Zalo</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Main Big Verdict Banner Card */}
      <div className={`p-6 sm:p-8 rounded-3xl ${riskConfig.bannerBg} space-y-5 relative overflow-hidden`}>
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-3.5">
            <div className="w-14 h-14 rounded-2xl bg-white flex items-center justify-center shrink-0 shadow-sm border border-slate-200/80">
              <RiskIcon className={`w-8 h-8 ${riskConfig.iconColor}`} />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <span className={`px-3 py-1 rounded-full text-xs font-black border uppercase tracking-wider ${riskConfig.badgeBg}`}>
                  {riskConfig.statusText}
                </span>
                <span className="text-xs font-bold text-slate-700">
                  Mức độ: <strong>{result.muc_rui_ro}</strong>
                </span>
                {result.so_luot_da_hoi !== undefined && result.so_luot_da_hoi > 0 && (
                  <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-slate-200 text-slate-800 border border-slate-300">
                    Lượt đối chiếu: {result.so_luot_da_hoi}/2
                  </span>
                )}
              </div>
              <h2 className={`font-black text-slate-900 mt-1.5 ${isLargeFont ? "text-2xl sm:text-3xl" : "text-xl sm:text-2xl"}`}>
                {result.ket_luan_ngan}
              </h2>
            </div>
          </div>
        </div>

        {/* Change Reason Note from previous turns */}
        {result.ly_do_thay_doi_muc_rui_ro && (
          <div className="p-4 rounded-2xl bg-indigo-50 border border-indigo-200 text-indigo-950 space-y-1">
            <span className="text-xs font-bold text-indigo-900 uppercase tracking-wider flex items-center gap-1.5">
              <Sparkles className="w-4 h-4 text-indigo-600" /> Cập nhật đánh giá từ dữ kiện mới:
            </span>
            <p className={`font-semibold text-slate-800 leading-relaxed ${isLargeFont ? "text-base" : "text-xs sm:text-sm"}`}>
              {result.ly_do_thay_doi_muc_rui_ro}
            </p>
          </div>
        )}

        {/* Psychological Tactic Explainer */}
        {result.giai_thich && (
          <div className="p-5 rounded-2xl bg-white/95 border border-slate-200/90 shadow-sm space-y-2">
            <h3 className="font-bold text-xs uppercase tracking-wider text-slate-600 flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-amber-600" />
              Bản chất tình huống & Phân tích logic:
            </h3>
            <p className={`font-medium text-slate-800 leading-relaxed ${isLargeFont ? "text-lg" : "text-sm sm:text-base"}`}>
              {result.giai_thich}
            </p>
          </div>
        )}

        {/* Preventive Warning for Future Steps (Clear Distinction: Not happened yet) */}
        {result.canh_bao_phong_ngua && (
          <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-950 space-y-1">
            <span className="text-xs font-bold text-amber-800 uppercase tracking-wider flex items-center gap-1.5">
              <Info className="w-4 h-4 text-amber-600" /> Cảnh báo phòng ngừa (Các dấu hiệu cần cảnh giác tiếp theo):
            </span>
            <p className={`font-semibold text-slate-800 leading-relaxed ${isLargeFont ? "text-base" : "text-xs sm:text-sm"}`}>
              {result.canh_bao_phong_ngua}
            </p>
          </div>
        )}

        {/* Actionable Safety Advice Banner */}
        {result.canh_bao_an_toan && (
          <div className="p-5 rounded-2xl bg-slate-900 text-white space-y-1.5 shadow-lg">
            <span className="text-xs font-black text-emerald-400 uppercase tracking-wider flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4" /> Nguyên tắc an toàn cốt lõi:
            </span>
            <p className={`font-bold text-white leading-relaxed ${isLargeFont ? "text-xl" : "text-base sm:text-lg"}`}>
              {result.canh_bao_an_toan}
            </p>
          </div>
        )}
      </div>

      {/* ========================================================================= */}
      {/* INTERACTIVE FOLLOW-UP SECTION: "AI cần hỏi bạn thêm"                      */}
      {/* ========================================================================= */}
      {hasFollowUpQuestions && (
        <div
          id="follow-up-questions-section"
          className="p-6 sm:p-8 rounded-3xl bg-blue-50 border-2 border-blue-300 shadow-md space-y-6 animate-in slide-in-from-bottom-3 duration-300"
        >
          <div className="flex items-start justify-between gap-4 flex-wrap">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-blue-600 text-white flex items-center justify-center font-black">
                  <HelpCircle className="w-5 h-5" />
                </div>
                <h3 className={`font-black text-blue-950 ${isLargeFont ? "text-2xl" : "text-xl"}`}>
                  AI cần hỏi bạn thêm
                </h3>
              </div>
              <p className="text-xs sm:text-sm text-blue-900/80 font-medium">
                Để không vội vàng kết luận sai lệch và bảo vệ quyền lợi của bạn, vui lòng trả lời nhanh các câu hỏi dưới đây (Tối đa 2 lượt hỏi):
              </p>
            </div>

            <div className="px-3 py-1 rounded-full bg-blue-100 text-blue-900 border border-blue-200 text-xs font-bold shrink-0">
              Lượt hỏi: {(result.so_luot_da_hoi || 0) + 1}/2
            </div>
          </div>

          {/* List of follow-up questions */}
          <div className="space-y-4">
            {result.cau_hoi_bo_sung!.map((item, idx) => {
              const currentVal = answersState[item.id] || "";
              const isBinary = item.loai_tra_loi === "co_khong";

              return (
                <div
                  key={item.id || idx}
                  className="p-5 rounded-2xl bg-white border border-blue-200 shadow-xs space-y-3"
                >
                  <div className="flex items-start gap-3">
                    <span className="w-6 h-6 rounded-full bg-blue-600 text-white font-bold text-xs flex items-center justify-center shrink-0 mt-0.5">
                      {idx + 1}
                    </span>
                    <p className={`font-bold text-slate-900 leading-snug ${isLargeFont ? "text-lg" : "text-sm sm:text-base"}`}>
                      {item.cau_hoi}
                    </p>
                  </div>

                  {/* Option buttons for Yes / No / Don't Remember */}
                  {isBinary ? (
                    <div className="flex items-center gap-2 sm:gap-3 flex-wrap pl-9">
                      {["Có", "Không", "Tôi không nhớ"].map((opt) => {
                        const isSelected = currentVal === opt;
                        let btnStyle = "bg-slate-100 hover:bg-slate-200 text-slate-800 border-slate-200";

                        if (isSelected) {
                          if (opt === "Có") {
                            btnStyle = "bg-rose-600 text-white border-rose-600 shadow-md ring-2 ring-rose-300";
                          } else if (opt === "Không") {
                            btnStyle = "bg-emerald-600 text-white border-emerald-600 shadow-md ring-2 ring-emerald-300";
                          } else {
                            btnStyle = "bg-amber-600 text-white border-amber-600 shadow-md ring-2 ring-amber-300";
                          }
                        }

                        return (
                          <button
                            key={opt}
                            type="button"
                            onClick={() => handleSelectAnswer(item.id, opt)}
                            className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-bold border transition-all cursor-pointer flex items-center gap-1.5 ${btnStyle}`}
                          >
                            {isSelected && <Check className="w-3.5 h-3.5" />}
                            <span>{opt}</span>
                          </button>
                        );
                      })}
                    </div>
                  ) : (
                    /* Text input for descriptive questions */
                    <div className="pl-9">
                      <input
                        type="text"
                        value={currentVal}
                        onChange={(e) => handleSelectAnswer(item.id, e.target.value)}
                        placeholder="Nhập câu trả lời ngắn gọn của bạn..."
                        className="w-full px-4 py-2.5 rounded-xl border border-slate-300 bg-slate-50 focus:bg-white focus:border-blue-500 focus:outline-none text-xs sm:text-sm text-slate-900"
                      />
                    </div>
                  )}
                </div>
              );
            })}

            {/* Extra context input box */}
            <div className="p-5 rounded-2xl bg-white border border-blue-200 shadow-xs space-y-2">
              <label className="font-bold text-xs sm:text-sm text-slate-800 flex items-center gap-2">
                <span>Bạn muốn bổ sung thêm điều gì khác? (Không bắt buộc)</span>
              </label>
              <textarea
                value={extraNoteText}
                onChange={(e) => setExtraNoteText(e.target.value)}
                placeholder="Ví dụ: Đối phương gọi từ số di động 09..., nói giọng miền Bắc, bảo tôi phải kết bạn Zalo..."
                rows={2}
                className="w-full px-4 py-2.5 rounded-xl border border-slate-300 bg-slate-50 focus:bg-white focus:border-blue-500 focus:outline-none text-xs sm:text-sm text-slate-900 resize-none"
              />
            </div>
          </div>

          {/* Validation message if user attempts to submit empty form */}
          {formValidationWarning && (
            <div className="p-3 rounded-xl bg-rose-100 border border-rose-300 text-rose-900 text-xs font-semibold flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
              <span>{formValidationWarning}</span>
            </div>
          )}

          {/* Re-analyze Action Button */}
          <div className="flex items-center justify-end gap-3 pt-2">
            <button
              id="btn-submit-follow-up-answers"
              type="button"
              disabled={isReanalyzing}
              onClick={handleSubmitAnswers}
              className={`px-6 py-3.5 rounded-2xl font-black text-sm text-white flex items-center gap-2.5 shadow-lg transition-all cursor-pointer ${
                isReanalyzing
                  ? "bg-blue-400 cursor-not-allowed"
                  : "bg-blue-600 hover:bg-blue-700 active:scale-98 shadow-blue-500/25"
              }`}
            >
              {isReanalyzing ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Đang tổng hợp dữ liệu & phân tích lại...</span>
                </>
              ) : (
                <>
                  <RefreshCw className="w-4 h-4" />
                  <span>Gửi câu trả lời và phân tích lại</span>
                </>
              )}
            </button>
          </div>
        </div>
      )}

      {/* Structured Evidences from user inputs */}
      {result.bang_chung_da_co && result.bang_chung_da_co.length > 0 && (
        <div className="p-6 sm:p-8 rounded-3xl bg-white border border-slate-200 shadow-sm space-y-4">
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <h3 className={`font-black text-slate-900 flex items-center gap-2.5 ${isLargeFont ? "text-2xl" : "text-xl"}`}>
              <FileCheck2 className="w-6 h-6 text-indigo-600" />
              <span>Bằng Chứng Đã Xác Thực ({result.bang_chung_da_co.length})</span>
            </h3>
            <span className="text-[11px] font-bold px-2.5 py-1 rounded-full bg-slate-100 text-slate-700 border border-slate-200">
              Chỉ dựa trên dữ liệu người dùng cung cấp
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 pt-1">
            {result.bang_chung_da_co.map((item, idx) => (
              <div
                key={idx}
                className="p-4 rounded-2xl bg-slate-50 border border-slate-200 flex flex-col justify-between gap-2.5 shadow-xs"
              >
                <div className="space-y-1.5">
                  <div className="flex items-center gap-2">
                    <span
                      className={`text-[10px] font-black px-2 py-0.5 rounded-full border uppercase ${
                        item.nguon === "cau_tra_loi_bo_sung"
                          ? "bg-indigo-100 text-indigo-800 border-indigo-200"
                          : "bg-slate-200 text-slate-800 border-slate-300"
                      }`}
                    >
                      {item.nguon === "cau_tra_loi_bo_sung" ? "Từ câu trả lời bổ sung" : "Từ lời kể ban đầu"}
                    </span>
                  </div>
                  <p className={`text-slate-900 font-bold leading-snug ${isLargeFont ? "text-base" : "text-xs sm:text-sm"}`}>
                    {item.noi_dung}
                  </p>
                </div>

                {item.y_nghia && (
                  <div className="p-2.5 rounded-xl bg-white border border-slate-200 text-slate-700 text-xs font-medium">
                    💡 <strong>Tác động:</strong> {item.y_nghia}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Red Flags & Actual Evidences From User Input (Legacy compatibility) */}
      {(!result.bang_chung_da_co || result.bang_chung_da_co.length === 0) &&
        result.cac_dau_hieu &&
        result.cac_dau_hieu.length > 0 && (
          <div className="p-6 sm:p-8 rounded-3xl bg-white border border-slate-200 shadow-sm space-y-4">
            <div className="flex items-center justify-between gap-3 flex-wrap">
              <h3 className={`font-black text-slate-900 flex items-center gap-2.5 ${isLargeFont ? "text-2xl" : "text-xl"}`}>
                <AlertTriangle className="w-6 h-6 text-rose-500" />
                <span>Dấu Hiệu Đã Ghi Nhận Kèm Bằng Chứng ({result.cac_dau_hieu.length})</span>
              </h3>
              <span className="text-[11px] font-bold px-2.5 py-1 rounded-full bg-slate-100 text-slate-700 border border-slate-200">
                Chỉ dựa trên dữ liệu bạn cung cấp
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 pt-1">
              {result.cac_dau_hieu.map((flag, idx) => (
                <div
                  key={idx}
                  className="p-4 rounded-2xl bg-slate-50 border border-slate-200 flex flex-col justify-between gap-2.5 shadow-xs hover:border-slate-300 transition-colors"
                >
                  <div className="flex items-start gap-3">
                    <div className="w-6 h-6 rounded-full bg-rose-100 border border-rose-300 text-rose-800 font-black text-xs flex items-center justify-center shrink-0 mt-0.5">
                      {idx + 1}
                    </div>
                    <p className={`text-slate-900 font-bold leading-snug ${isLargeFont ? "text-base" : "text-xs sm:text-sm"}`}>
                      {flag}
                    </p>
                  </div>

                  {result.bang_chung && result.bang_chung[idx] && (
                    <div className="p-2.5 rounded-xl bg-white border border-slate-200 text-slate-600 text-xs italic font-medium">
                      📌 <strong>Bằng chứng:</strong> {result.bang_chung[idx]}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

      {/* DO & DON'T Comparison Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {/* DO LIST */}
        {result.viec_can_lam_ngay && result.viec_can_lam_ngay.length > 0 && (
          <div className="p-6 rounded-3xl bg-emerald-50/70 border-2 border-emerald-300/80 space-y-4 shadow-sm">
            <div className="flex items-center gap-2.5 text-emerald-900">
              <CheckCircle2 className="w-6 h-6 text-emerald-600" />
              <h3 className={`font-black uppercase tracking-tight ${isLargeFont ? "text-xl" : "text-lg"}`}>
                NÊN LÀM NGAY (AN TOÀN)
              </h3>
            </div>
            <ul className="space-y-3">
              {result.viec_can_lam_ngay.map((act, idx) => (
                <li key={idx} className="flex items-start gap-2.5 text-slate-800 text-xs sm:text-sm font-semibold leading-relaxed">
                  <span className="w-5 h-5 rounded-md bg-emerald-200 text-emerald-900 font-bold text-xs flex items-center justify-center shrink-0 mt-0.5">
                    ✓
                  </span>
                  <span>{act}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* DON'T LIST */}
        {result.viec_khong_nen_lam && result.viec_khong_nen_lam.length > 0 && (
          <div className="p-6 rounded-3xl bg-rose-50/70 border-2 border-rose-300/80 space-y-4 shadow-sm">
            <div className="flex items-center gap-2.5 text-rose-900">
              <XCircle className="w-6 h-6 text-rose-600" />
              <h3 className={`font-black uppercase tracking-tight ${isLargeFont ? "text-xl" : "text-lg"}`}>
                TUYỆT ĐỐI CẤM (RỦI RO MẤT TIỀN)
              </h3>
            </div>
            <ul className="space-y-3">
              {result.viec_khong_nen_lam.map((avoid, idx) => (
                <li key={idx} className="flex items-start gap-2.5 text-slate-800 text-xs sm:text-sm font-semibold leading-relaxed">
                  <span className="w-5 h-5 rounded-md bg-rose-200 text-rose-900 font-bold text-xs flex items-center justify-center shrink-0 mt-0.5">
                    ✗
                  </span>
                  <span>{avoid}</span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>

      {/* QUICK RESPONSE SCRIPT TEMPLATES */}
      {result.tin_nhan_tu_choi_goi_y && (
        <div className="p-6 sm:p-8 rounded-3xl bg-white border border-slate-200 shadow-sm space-y-4">
          <div>
            <div className="flex items-center gap-2">
              <MessageCircle className="w-5 h-5 text-blue-600" />
              <h3 className={`font-black text-slate-900 ${isLargeFont ? "text-xl" : "text-lg"}`}>
                Mẫu Tin Nhắn Phản Hồi Từ Chối An Toàn
              </h3>
            </div>
            <p className="text-xs text-slate-600 mt-1 font-medium">
              Bạn có thể sao chép câu này để nhắn lại cho đối phương nhằm chấm dứt ngay sự thúc ép:
            </p>
          </div>

          <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 flex items-center justify-between gap-4 flex-wrap">
            <p className={`font-semibold text-slate-800 ${isLargeFont ? "text-base" : "text-xs sm:text-sm"}`}>
              "{result.tin_nhan_tu_choi_goi_y}"
            </p>
            <button
              onClick={() => handleCopyText(result.tin_nhan_tu_choi_goi_y!, "refusal")}
              className="px-3.5 py-2 rounded-xl bg-white hover:bg-emerald-50 text-slate-800 hover:text-emerald-800 text-xs font-bold border border-slate-200 flex items-center gap-1.5 transition-all cursor-pointer shrink-0 shadow-xs"
            >
              {copiedKey === "refusal" ? (
                <>
                  <Check className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Đã sao chép!</span>
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5" />
                  <span>Sao chép câu này</span>
                </>
              )}
            </button>
          </div>
        </div>
      )}

      {/* SAFE CROSS-VERIFICATION QUESTIONS */}
      {result.cau_hoi_xac_minh_goi_y && (
        <div className="p-6 sm:p-8 rounded-3xl bg-amber-50/70 border border-amber-200 space-y-4 shadow-sm">
          <div className="flex items-center gap-2 text-amber-900">
            <HelpCircle className="w-5 h-5 text-amber-600" />
            <h3 className={`font-black ${isLargeFont ? "text-xl" : "text-lg"}`}>
              Câu Hỏi Đối Chứng Để Vạch Trần Kẻ Gian
            </h3>
          </div>
          <p className="text-xs text-amber-950/80 font-medium">
            Hỏi câu này, kẻ giả mạo sẽ lập tức ấp úng, né tránh hoặc dập máy:
          </p>

          <div className="p-4 rounded-2xl bg-white border border-amber-200 text-xs sm:text-sm font-semibold text-slate-900 flex items-center justify-between gap-4 flex-wrap shadow-xs">
            <span>"{result.cau_hoi_xac_minh_goi_y}"</span>
            <button
              onClick={() => handleCopyText(result.cau_hoi_xac_minh_goi_y!, "question")}
              className="px-3.5 py-2 rounded-xl bg-amber-50 hover:bg-amber-100 text-amber-900 text-xs font-bold border border-amber-200 flex items-center gap-1.5 transition-all cursor-pointer shrink-0"
            >
              {copiedKey === "question" ? (
                <>
                  <Check className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Đã sao chép!</span>
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5" />
                  <span>Sao chép</span>
                </>
              )}
            </button>
          </div>
        </div>
      )}

      {/* Emergency Help Hotlines Card */}
      <div className="p-6 sm:p-8 rounded-3xl bg-white border border-slate-200 text-slate-900 space-y-5 shadow-md">
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div>
            <span className="px-3 py-0.5 rounded-full bg-rose-100 text-rose-800 text-xs font-black uppercase tracking-wider">
              Đường Dây Nóng Khẩn Cấp
            </span>
            <h3 className={`font-black mt-1 text-slate-900 ${isLargeFont ? "text-2xl" : "text-xl"}`}>
              Bạn Đã Lỡ Chuyển Tiền Hoặc Cung Cấp Mã OTP?
            </h3>
            <p className="text-xs text-slate-600 mt-0.5 font-medium">
              Hãy thực hiện ngay 2 việc khẩn cấp sau đây trong vòng 15 phút đầu tiên:
            </p>
          </div>

          <button
            onClick={onOpenHotline}
            className="px-5 py-3 rounded-2xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs sm:text-sm flex items-center gap-2 shadow-md cursor-pointer active:scale-95 transition-all"
          >
            <PhoneCall className="w-4 h-4" />
            <span>Mở danh bạ khẩn cấp</span>
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 pt-1">
          <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-1.5">
            <span className="text-xs font-black text-rose-700 flex items-center gap-1.5">
              <span className="w-5 h-5 rounded-full bg-rose-100 text-rose-800 flex items-center justify-center text-xs">1</span>
              KHÓA TÀI KHOẢN NGÂN HÀNG
            </span>
            <p className="text-xs text-slate-700 leading-relaxed font-medium">
              Gọi ngay hotline ngân hàng của bạn hoặc dùng ứng dụng Mobile Banking để bấm nút "Khóa thẻ / Khóa dịch vụ tạm thời".
            </p>
          </div>

          <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-1.5">
            <span className="text-xs font-black text-blue-700 flex items-center gap-1.5">
              <span className="w-5 h-5 rounded-full bg-blue-100 text-blue-800 flex items-center justify-center text-xs">2</span>
              TRÌNH BÁO TỔNG ĐÀI 156 / CÔNG AN
            </span>
            <p className="text-xs text-slate-700 leading-relaxed font-medium">
              Gọi 156 (miễn phí) để báo cáo số điện thoại lừa đảo và liên hệ Công an Phường gần nhất để lập biên bản phong tỏa dòng tiền.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
};

