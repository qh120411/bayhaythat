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
  Info,
  FileCheck2,
  ChevronDown,
  ChevronUp,
  UserCheck,
  Globe,
  Smartphone,
  Flame,
  AlertOctagon,
  Scale,
  ExternalLink,
  Loader2,
} from "lucide-react";
import { AnalysisResponse, RiskLevel, CanonicalRiskLevel, TraceCheckResult } from "../types";
import { getCanonicalRiskUI, mapStringToCanonicalRisk } from "../utils/riskConfig";
import { TraceCheckCard } from "./TraceCheckCard";

interface AnalysisResultProps {
  result: AnalysisResponse;
  originalInputText?: string;
  isLargeFont: boolean;
  onReset: () => void;
  onOpenHotline: () => void;
  userAnswerHistory?: Array<{ question: string; answer: string; round?: number }>;
  onOpenFollowUpFlow?: () => void;
  traceResult?: TraceCheckResult | null;
  isTraceLoading?: boolean;
}

export const AnalysisResult: React.FC<AnalysisResultProps> = ({
  result,
  originalInputText,
  isLargeFont,
  onReset,
  onOpenHotline,
  userAnswerHistory = [],
  onOpenFollowUpFlow,
  traceResult,
  isTraceLoading = false,
}) => {
  const [isPlayingAudio, setIsPlayingAudio] = useState(false);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [copiedShare, setCopiedShare] = useState(false);
  const [isTechDetailsOpen, setIsTechDetailsOpen] = useState(false);
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);

  // Derive Canonical Single Source of Truth for Risk Level
  const canonicalLevel: CanonicalRiskLevel =
    result.finalRiskLevel || mapStringToCanonicalRisk(result.muc_rui_ro);
  const canonicalUI = getCanonicalRiskUI(canonicalLevel);

  // Clean up Text-To-Speech Synthesis on unmount
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
      const topActions = result.viec_can_lam_ngay?.slice(0, 3).join(". ") || "";
      const textToRead = `Đánh giá rủi ro: ${canonicalUI.vietnameseLevel}. ${canonicalUI.fixedTitle}. Việc cần làm ngay: ${topActions}. ${result.giai_thich || ""}`;
      const utterance = new SpeechSynthesisUtterance(textToRead);
      utterance.lang = "vi-VN";
      utterance.rate = 0.92;

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
    const summaryText = `⚠️ [CẢNH BÁO TỪ 'BẪY HAY THẬT ?']\n\n📌 Mức độ: ${canonicalUI.badgeLabel.toUpperCase()}\n📝 Khuyến cáo: ${canonicalUI.fixedTitle}\n\n🛑 VIỆC CẦN LÀM NGAY:\n${result.viec_can_lam_ngay?.map((a, i) => `${i + 1}. ${a}`).join("\n") || "Tuyệt đối không chuyển tiền!"}\n\n💡 Bản chất: ${result.giai_thich || ""}\n\nChi tiết kiểm tra an toàn tại: ${window.location.href}`;
    navigator.clipboard.writeText(summaryText);
    setCopiedShare(true);
    setTimeout(() => setCopiedShare(false), 3000);
  };

  // Icon selector based on canonical level
  const getRiskIcon = () => {
    switch (canonicalLevel) {
      case "CRITICAL":
        return AlertOctagon;
      case "HIGH":
        return ShieldAlert;
      case "VERIFY":
        return AlertTriangle;
      case "SAFE":
      default:
        return ShieldCheck;
    }
  };

  const RiskIcon = getRiskIcon();

  return (
    <section className="py-6 sm:py-8 px-4 max-w-5xl mx-auto space-y-6 animate-in fade-in duration-300">
      {/* Preliminary Notice if this is Stage 1 instant warning */}
      {result.isPreliminary && (
        <div className="p-4 rounded-2xl bg-amber-500 text-slate-950 font-black flex items-center justify-between gap-3 shadow-lg animate-pulse">
          <div className="flex items-center gap-2.5">
            <AlertTriangle className="w-5 h-5 shrink-0" />
            <span className="text-sm sm:text-base">
              Đã phát hiện dấu hiệu nguy hiểm. Không làm theo yêu cầu trong lúc hệ thống phân tích chi tiết.
            </span>
          </div>
          <Loader2 className="w-5 h-5 animate-spin shrink-0" />
        </div>
      )}

      {/* Top Action Toolbar */}
      <div className="flex items-center justify-between gap-3 bg-white p-3.5 rounded-2xl border border-slate-200 shadow-sm flex-wrap">
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
            aria-label="Đọc to kết quả phân tích"
            className={`px-3.5 py-2 rounded-xl text-xs sm:text-sm font-bold flex items-center gap-2 transition-all border cursor-pointer ${
              isPlayingAudio
                ? "bg-emerald-600 text-white border-emerald-600 shadow-md animate-pulse"
                : "bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border-emerald-200"
            }`}
          >
            {isPlayingAudio ? (
              <>
                <VolumeX className="w-4 h-4" />
                <span>Đang đọc... (Bấm để dừng)</span>
              </>
            ) : (
              <>
                <Volume2 className="w-4 h-4" />
                <span>Đọc to cho tôi nghe 🔊</span>
              </>
            )}
          </button>

          {/* Share to Zalo / Message */}
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

          {/* Hotline Quick Call Button */}
          <button
            id="btn-open-hotline-top"
            onClick={onOpenHotline}
            className="px-3.5 py-2 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-800 border border-rose-200 text-xs sm:text-sm font-bold flex items-center gap-2 transition-colors cursor-pointer"
          >
            <PhoneCall className="w-4 h-4 text-rose-600" />
            <span>Gọi hỗ trợ</span>
          </button>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 1. TOP PRIORITY: CANONICAL RISK BANNER (SINGLE SOURCE OF TRUTH)           */}
      {/* ========================================================================= */}
      <div
        id="canonical-risk-banner"
        className={`p-6 sm:p-8 rounded-3xl ${canonicalUI.containerBg} ${canonicalUI.containerBorder} space-y-6 relative overflow-hidden`}
      >
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div className="flex items-start gap-4">
            <div className="w-14 h-14 rounded-2xl bg-white flex items-center justify-center shrink-0 shadow-sm border border-slate-200/80 mt-1">
              <RiskIcon className={`w-8 h-8 ${canonicalUI.iconColor}`} />
            </div>
            <div className="space-y-1.5">
              <div className="flex items-center gap-2 flex-wrap">
                <span
                  id="canonical-badge-label"
                  className={`px-3 py-1 rounded-full text-xs font-black border uppercase tracking-wider ${canonicalUI.badgeBg} ${canonicalUI.badgeText} ${canonicalUI.badgeBorder}`}
                >
                  {canonicalUI.badgeLabel}
                </span>
                <span className="text-xs font-bold text-slate-700">
                  Mức độ: <strong>{canonicalUI.vietnameseLevel}</strong>
                </span>
              </div>
              <h2
                id="canonical-fixed-title"
                className={`font-black text-slate-900 ${isLargeFont ? "text-2xl sm:text-3xl" : "text-xl sm:text-2xl"}`}
              >
                {canonicalUI.fixedTitle}
              </h2>
            </div>
          </div>
        </div>

        {/* Change Reason Note from previous turns */}
        {result.ly_do_thay_doi_muc_rui_ro && (
          <div className="p-4 rounded-2xl bg-indigo-50 border border-indigo-200 text-indigo-950 space-y-1">
            <span className="text-xs font-bold text-indigo-900 uppercase tracking-wider flex items-center gap-1.5">
              <Sparkles className="w-4 h-4 text-indigo-600" /> Cập nhật đánh giá từ dữ kiện bạn vừa trả lời:
            </span>
            <p className={`font-semibold text-slate-800 leading-relaxed ${isLargeFont ? "text-base" : "text-xs sm:text-sm"}`}>
              {result.ly_do_thay_doi_muc_rui_ro}
            </p>
          </div>
        )}

        {/* IMMEDIATE ACTION LIST ("Việc cần làm ngay") - DISPLAYED PROMINENTLY AT TOP */}
        {result.viec_can_lam_ngay && result.viec_can_lam_ngay.length > 0 && (
          <div className="p-5 sm:p-6 rounded-2xl bg-white/95 border-2 border-emerald-400 text-emerald-950 shadow-sm space-y-3.5">
            <div className="flex items-center gap-2 text-emerald-900">
              <CheckCircle2 className="w-6 h-6 text-emerald-600 shrink-0" />
              <h3 className={`font-black uppercase tracking-tight ${isLargeFont ? "text-xl" : "text-lg"}`}>
                VIỆC CẦN LÀM NGAY (HÀNH ĐỘNG BẢO VỆ)
              </h3>
            </div>
            <ul className="space-y-2.5">
              {result.viec_can_lam_ngay.map((act, idx) => (
                <li
                  key={idx}
                  className={`flex items-start gap-3 text-slate-900 font-bold leading-relaxed ${
                    isLargeFont ? "text-lg" : "text-sm sm:text-base"
                  }`}
                >
                  <span className="w-6 h-6 rounded-lg bg-emerald-600 text-white font-black text-xs flex items-center justify-center shrink-0 mt-0.5 shadow-xs">
                    {idx + 1}
                  </span>
                  <span>{act}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Actionable Safety Advice Rule Banner */}
        {result.canh_bao_an_toan && (
          <div className="p-4 sm:p-5 rounded-2xl bg-slate-900 text-white space-y-1 shadow-md">
            <span className="text-xs font-black text-emerald-400 uppercase tracking-wider flex items-center gap-1.5">
              <ShieldCheck className="w-4 h-4" /> Nguyên tắc an toàn cốt lõi:
            </span>
            <p className={`font-bold text-white leading-relaxed ${isLargeFont ? "text-xl" : "text-base sm:text-lg"}`}>
              {result.canh_bao_an_toan}
            </p>
          </div>
        )}
      </div>

      {/* ========================================================================= */}
      {/* CARD: KIỂM TRA DẤU VẾT (PARALLEL FOOTPRINT & THREAT REPUTATION LOOKUP)    */}
      {/* ========================================================================= */}
      <TraceCheckCard
        traceResult={traceResult || result.traceCheckResult}
        isLoading={isTraceLoading}
        isLargeFont={isLargeFont}
        fallbackText={originalInputText || (result.bang_chung ? result.bang_chung.join(" ") : "")}
      />

      {/* ========================================================================= */}
      {/* 2. CHUỖI 4 BƯỚC PHÂN TÍCH DẤU HIỆU KỸ THUẬT BẮT BUỘC                     */}
      {/* ========================================================================= */}
      {result.technicalAnalysis && (
        <div className="p-6 sm:p-7 rounded-3xl bg-white border border-slate-200 shadow-sm space-y-5">
          <div className="flex items-center justify-between gap-3 flex-wrap border-b border-slate-100 pb-3.5">
            <div className="flex items-center gap-2.5">
              <Scale className="w-6 h-6 text-indigo-600" />
              <div>
                <h3 className={`font-black text-slate-900 ${isLargeFont ? "text-2xl" : "text-xl"}`}>
                  4 Lớp Kiểm Tra Kỹ Thuật (Phát Hiện Thủ Đoạn Mới)
                </h3>
                <p className="text-xs text-slate-500 font-medium">
                  Phân tích độc lập theo thứ tự chuẩn hóa: Người gửi ➔ Tên miền thật ➔ Hành vi đòi hỏi ➔ Mâu thuẫn danh tính
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-slate-600">Tổng điểm rủi ro:</span>
              <span
                className={`px-3 py-1 rounded-full text-xs font-black border ${
                  result.technicalAnalysis.scoring.totalScore >= 70
                    ? "bg-rose-100 text-rose-800 border-rose-300"
                    : result.technicalAnalysis.scoring.totalScore >= 40
                    ? "bg-rose-50 text-rose-700 border-rose-200"
                    : result.technicalAnalysis.scoring.totalScore >= 20
                    ? "bg-amber-50 text-amber-800 border-amber-200"
                    : "bg-emerald-50 text-emerald-800 border-emerald-200"
                }`}
              >
                +{result.technicalAnalysis.scoring.totalScore} điểm ({result.technicalAnalysis.scoring.riskLevel})
              </span>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* STEP 1: SENDER & PHONE */}
            <div className="p-4 sm:p-5 rounded-2xl bg-slate-50 border border-slate-200 space-y-2.5">
              <div className="flex items-center gap-2 text-slate-900">
                <span className="w-6 h-6 rounded-lg bg-indigo-600 text-white font-black text-xs flex items-center justify-center shrink-0">
                  1
                </span>
                <Smartphone className="w-4 h-4 text-indigo-600" />
                <h4 className="font-bold text-sm sm:text-base">Người gửi & Số điện thoại</h4>
              </div>

              {result.technicalAnalysis.phoneAnalysis.hasPhone ? (
                <div className="space-y-2 text-xs sm:text-sm">
                  {result.technicalAnalysis.phoneAnalysis.phones.map((p, idx) => (
                    <div key={idx} className="p-3 rounded-xl bg-white border border-slate-200 space-y-1">
                      <div className="flex items-center justify-between gap-2 flex-wrap">
                        <span className="font-mono font-bold text-slate-900 text-sm">
                          {p.normalized || p.raw}
                        </span>
                        <span
                          className={`px-2 py-0.5 rounded-md text-[11px] font-bold ${
                            !p.isVietnam
                              ? "bg-rose-100 text-rose-800 border border-rose-200"
                              : "bg-emerald-50 text-emerald-800 border border-emerald-200"
                          }`}
                        >
                          {p.countryName} ({p.countryCode})
                        </span>
                      </div>
                      {p.riskFlags.map((flag, fIdx) => (
                        <p key={fIdx} className="text-rose-700 font-semibold text-xs flex items-start gap-1">
                          <span>⚠️</span>
                          <span>{flag}</span>
                        </p>
                      ))}
                    </div>
                  ))}
                  <p className="text-[11px] text-slate-500 italic">
                    * Lưu ý: Tên hiển thị (Brandname) và số điện thoại hoàn toàn có thể bị giả mạo bằng công nghệ VoIP/Caller ID Spoofing.
                  </p>
                </div>
              ) : (
                <p className="text-xs text-slate-600 italic bg-white p-3 rounded-xl border border-slate-200">
                  Không trích xuất được số điện thoại cụ thể trong nội dung (Lưu ý: Không có số không đồng nghĩa với an toàn).
                </p>
              )}
            </div>

            {/* STEP 2: LINK & REGISTRABLE DOMAIN */}
            <div className="p-4 sm:p-5 rounded-2xl bg-slate-50 border border-slate-200 space-y-2.5">
              <div className="flex items-center gap-2 text-slate-900">
                <span className="w-6 h-6 rounded-lg bg-indigo-600 text-white font-black text-xs flex items-center justify-center shrink-0">
                  2
                </span>
                <Globe className="w-4 h-4 text-indigo-600" />
                <h4 className="font-bold text-sm sm:text-base">Đường link & Tên miền thật</h4>
              </div>

              {result.technicalAnalysis.urlAnalysis.hasUrl ? (
                <div className="space-y-2 text-xs sm:text-sm">
                  {result.technicalAnalysis.urlAnalysis.urls.map((u, idx) => (
                    <div key={idx} className="p-3 rounded-xl bg-white border border-slate-200 space-y-1.5">
                      <div className="space-y-1">
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-[11px] font-bold text-slate-500 uppercase">Tên miền thực tế:</span>
                          <span className="font-mono font-black text-rose-700 bg-rose-50 px-2 py-0.5 rounded border border-rose-200 text-xs">
                            {u.registrableDomain}
                          </span>
                        </div>
                        <div className="p-2 rounded-lg bg-slate-50 border border-slate-100 font-mono text-[11px] text-slate-700 break-all">
                          {u.raw}
                        </div>
                      </div>

                      {u.isGovOrBankKeywordInPath && (
                        <div className="p-2 rounded-lg bg-rose-50 border border-rose-200 text-rose-900 text-xs font-bold space-y-0.5">
                          <span>🚨 Thủ đoạn ngụy trang đường dẫn (Path Deception):</span>
                          <p className="text-[11px] font-normal text-rose-800">
                            Kẻ gian cố tình đặt từ khóa "gov/dichvucong/nganhang" vào phần đường dẫn phía sau để đánh lừa mắt thường. Máy chủ thực sự là <strong>{u.registrableDomain}</strong>.
                          </p>
                        </div>
                      )}

                      {u.explanation && (
                        <p className="text-xs text-slate-700 leading-snug">
                          💡 <strong>Phân tích:</strong> {u.explanation}
                        </p>
                      )}
                    </div>
                  ))}
                  <p className="text-[11px] text-slate-500 italic">
                    * Biểu tượng ổ khóa (HTTPS) chỉ mã hóa đường truyền, hoàn toàn KHÔNG chứng minh website là của cơ quan chính thống.
                  </p>
                </div>
              ) : (
                <p className="text-xs text-slate-600 italic bg-white p-3 rounded-xl border border-slate-200">
                  Không phát hiện đường link URL trong văn bản.
                </p>
              )}
            </div>

            {/* STEP 3: CONTENT SIGNALS */}
            <div className="p-4 sm:p-5 rounded-2xl bg-slate-50 border border-slate-200 space-y-2.5">
              <div className="flex items-center gap-2 text-slate-900">
                <span className="w-6 h-6 rounded-lg bg-indigo-600 text-white font-black text-xs flex items-center justify-center shrink-0">
                  3
                </span>
                <Flame className="w-4 h-4 text-indigo-600" />
                <h4 className="font-bold text-sm sm:text-base">Hành vi & Tín hiệu nội dung</h4>
              </div>

              {result.technicalAnalysis.contentAnalysis.detectedSignals.length > 0 ? (
                <ul className="space-y-1.5 text-xs sm:text-sm">
                  {result.technicalAnalysis.contentAnalysis.detectedSignals.map((sig, idx) => (
                    <li key={idx} className="p-2.5 rounded-xl bg-white border border-slate-200 font-semibold text-slate-800 flex items-start gap-2">
                      <span className="text-rose-600 font-bold">⚡</span>
                      <span>{sig}</span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-xs text-slate-600 italic bg-white p-3 rounded-xl border border-slate-200">
                  Chưa phát hiện hành vi ép buộc tài chính hay thúc ép thời gian điển hình.
                </p>
              )}
            </div>

            {/* STEP 4: IDENTITY CONFLICT */}
            <div className="p-4 sm:p-5 rounded-2xl bg-slate-50 border border-slate-200 space-y-2.5">
              <div className="flex items-center gap-2 text-slate-900">
                <span className="w-6 h-6 rounded-lg bg-indigo-600 text-white font-black text-xs flex items-center justify-center shrink-0">
                  4
                </span>
                <AlertOctagon className="w-4 h-4 text-indigo-600" />
                <h4 className="font-bold text-sm sm:text-base">Mâu thuẫn danh tính tự xưng</h4>
              </div>

              <div className="p-3 rounded-xl bg-white border border-slate-200 space-y-2 text-xs sm:text-sm">
                <div className="flex items-center justify-between gap-2 flex-wrap">
                  <span className="text-[11px] font-bold text-slate-500 uppercase">Tổ chức tự xưng:</span>
                  <span className="font-bold text-slate-900">
                    {result.technicalAnalysis.identityMismatch.claimedOrg || "Không xưng danh cụ thể"}
                  </span>
                </div>

                {result.technicalAnalysis.identityMismatch.hasConflict ? (
                  <div className="p-2.5 rounded-lg bg-rose-50 border border-rose-200 text-rose-950 font-bold text-xs space-y-1">
                    <span className="flex items-center gap-1 text-rose-700">
                      <span>🚨</span>
                      <span>Xung đột kỹ thuật nghiêm trọng:</span>
                    </span>
                    <p className="font-normal text-rose-900 leading-snug">
                      {result.technicalAnalysis.identityMismatch.conflictDescription}
                    </p>
                  </div>
                ) : (
                  <p className="text-xs text-slate-600 italic">
                    Chưa phát hiện sự mâu thuẫn trực diện về mã quốc gia và tổ chức.
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* Rule-based Scoring Breakdown Table */}
          {result.technicalAnalysis.scoring.scoreBreakdown.length > 0 && (
            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-2.5 pt-3">
              <span className="text-xs font-bold text-slate-700 uppercase tracking-wider block">
                Bảng phân rã điểm số quy tắc an toàn số:
              </span>
              <div className="space-y-1.5">
                {result.technicalAnalysis.scoring.scoreBreakdown.map((sb, idx) => (
                  <div
                    key={idx}
                    className="p-2.5 rounded-xl bg-white border border-slate-200 flex items-center justify-between gap-3 text-xs flex-wrap"
                  >
                    <div className="space-y-0.5 max-w-xl">
                      <span className="font-bold text-slate-900 block">{sb.sign}</span>
                      <span className="text-slate-600 text-[11px]">Trích xuất: "{sb.evidence}"</span>
                    </div>
                    <span className="font-black text-rose-700 px-2 py-0.5 rounded bg-rose-50 border border-rose-200 shrink-0">
                      +{sb.points} điểm
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* 2. EXPLANATION & PREVENTIVE WARNINGS                                      */}
      {/* ========================================================================= */}
      <div className="space-y-4">
        {/* Psychological & Logic Explainer */}
        {result.giai_thich && (
          <div className="p-6 sm:p-7 rounded-3xl bg-white border border-slate-200 shadow-sm space-y-2.5">
            <h3 className="font-bold text-xs uppercase tracking-wider text-slate-600 flex items-center gap-1.5">
              <Sparkles className="w-4 h-4 text-amber-600" />
              Bản chất tình huống & Phân tích logic:
            </h3>
            <p className={`font-medium text-slate-800 leading-relaxed ${isLargeFont ? "text-lg" : "text-sm sm:text-base"}`}>
              {result.giai_thich}
            </p>
          </div>
        )}

        {/* Preventive Warning for Future Steps */}
        {result.canh_bao_phong_ngua && (
          <div className="p-5 sm:p-6 rounded-3xl bg-amber-50 border border-amber-200 text-amber-950 space-y-1.5 shadow-xs">
            <span className="text-xs font-bold text-amber-800 uppercase tracking-wider flex items-center gap-1.5">
              <Info className="w-4 h-4 text-amber-600" /> Cảnh báo phòng ngừa (Các dấu hiệu cần cảnh giác tiếp theo):
            </span>
            <p className={`font-semibold text-slate-800 leading-relaxed ${isLargeFont ? "text-base" : "text-xs sm:text-sm"}`}>
              {result.canh_bao_phong_ngua}
            </p>
          </div>
        )}
      </div>

      {/* ========================================================================= */}
      {/* 3. DO & DON'T COMPARISON GRID                                             */}
      {/* ========================================================================= */}
      {result.viec_khong_nen_lam && result.viec_khong_nen_lam.length > 0 && (
        <div className="p-6 sm:p-7 rounded-3xl bg-rose-50/70 border-2 border-rose-300 space-y-4 shadow-sm">
          <div className="flex items-center gap-2.5 text-rose-900">
            <XCircle className="w-6 h-6 text-rose-600 shrink-0" />
            <h3 className={`font-black uppercase tracking-tight ${isLargeFont ? "text-xl" : "text-lg"}`}>
              TUYỆT ĐỐI CẤM (RỦI RO MẤT TIỀN HOẶC MẤT TÀI KHOẢN)
            </h3>
          </div>
          <ul className="space-y-2.5">
            {result.viec_khong_nen_lam.map((avoid, idx) => (
              <li key={idx} className="flex items-start gap-2.5 text-slate-800 text-xs sm:text-sm font-bold leading-relaxed">
                <span className="w-5 h-5 rounded-md bg-rose-200 text-rose-900 font-black text-xs flex items-center justify-center shrink-0 mt-0.5">
                  ✕
                </span>
                <span>{avoid}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 4. VERIFIED EVIDENCES FROM USER INPUT                                     */}
      {/* ========================================================================= */}
      {result.bang_chung_da_co && result.bang_chung_da_co.length > 0 && (
        <div className="p-6 sm:p-7 rounded-3xl bg-white border border-slate-200 shadow-sm space-y-4">
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <h3 className={`font-black text-slate-900 flex items-center gap-2.5 ${isLargeFont ? "text-2xl" : "text-xl"}`}>
              <FileCheck2 className="w-6 h-6 text-indigo-600" />
              <span>Bằng Chứng Đã Ghi Nhận ({result.bang_chung_da_co.length})</span>
            </h3>
            <span className="text-[11px] font-bold px-2.5 py-1 rounded-full bg-slate-100 text-slate-700 border border-slate-200">
              Dựa trên thông tin bạn cung cấp
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
                    💡 <strong>Ý nghĩa:</strong> {item.y_nghia}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 5. REVIEW USER'S PAST ANSWERS (If user answered guided questions)         */}
      {/* ========================================================================= */}
      {userAnswerHistory.length > 0 && (
        <div className="p-5 sm:p-6 rounded-3xl bg-white border border-slate-200 shadow-sm space-y-3">
          <button
            onClick={() => setIsHistoryOpen((prev) => !prev)}
            className="w-full flex items-center justify-between text-left cursor-pointer"
          >
            <div className="flex items-center gap-2.5">
              <UserCheck className="w-5 h-5 text-emerald-600" />
              <span className="font-bold text-sm sm:text-base text-slate-900">
                Xem lại các câu trả lời bạn đã chọn ({userAnswerHistory.length})
              </span>
            </div>
            {isHistoryOpen ? (
              <ChevronUp className="w-5 h-5 text-slate-500" />
            ) : (
              <ChevronDown className="w-5 h-5 text-slate-500" />
            )}
          </button>

          {isHistoryOpen && (
            <div className="space-y-2.5 pt-2 border-t border-slate-100">
              {userAnswerHistory.map((h, i) => (
                <div key={i} className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 text-xs sm:text-sm space-y-1">
                  <p className="font-bold text-slate-800">
                    Câu hỏi: {h.question}
                  </p>
                  <p className="text-emerald-800 font-semibold flex items-center gap-1.5">
                    <Check className="w-4 h-4 text-emerald-600" />
                    <span>Lựa chọn của bạn: <strong>{h.answer}</strong></span>
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* 6. COLLAPSIBLE TECHNICAL BREAKDOWN & SCRIPTS                              */}
      {/* ========================================================================= */}
      <div className="rounded-3xl border border-slate-200 bg-white overflow-hidden shadow-sm">
        <button
          onClick={() => setIsTechDetailsOpen((prev) => !prev)}
          className="w-full p-5 sm:p-6 flex items-center justify-between text-left bg-slate-50/80 hover:bg-slate-100 transition-colors cursor-pointer"
        >
          <div className="flex items-center gap-2.5">
            <Info className="w-5 h-5 text-slate-600" />
            <div>
              <span className="font-bold text-sm sm:text-base text-slate-900 block">
                Mẫu tin nhắn từ chối & Câu hỏi đối chứng
              </span>
              <span className="text-xs text-slate-500">
                Bấm để xem các mẫu văn bản hữu ích và chi tiết phân tích bổ sung
              </span>
            </div>
          </div>
          {isTechDetailsOpen ? (
            <ChevronUp className="w-5 h-5 text-slate-600" />
          ) : (
            <ChevronDown className="w-5 h-5 text-slate-600" />
          )}
        </button>

        {isTechDetailsOpen && (
          <div className="p-6 space-y-6 border-t border-slate-200">
            {/* Quick Refusal Script */}
            {result.tin_nhan_tu_choi_goi_y && (
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <MessageCircle className="w-5 h-5 text-blue-600" />
                  <h4 className="font-bold text-slate-900 text-sm sm:text-base">
                    Mẫu Tin Nhắn Phản Hồi Từ Chối An Toàn
                  </h4>
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

            {/* Safe Cross-Verification Questions */}
            {result.cau_hoi_xac_minh_goi_y && (
              <div className="space-y-3">
                <div className="flex items-center gap-2 text-amber-900">
                  <HelpCircle className="w-5 h-5 text-amber-600" />
                  <h4 className="font-bold text-sm sm:text-base">
                    Câu Hỏi Đối Chứng Để Vạch Trần Kẻ Gian
                  </h4>
                </div>
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
          </div>
        )}
      </div>

      {/* ========================================================================= */}
      {/* 7. EMERGENCY ASSISTANCE ACTION CARD                                       */}
      {/* ========================================================================= */}
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
