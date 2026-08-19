import React from "react";
import {
  ShieldAlert,
  ShieldCheck,
  AlertTriangle,
  FileSearch,
  Globe,
  Smartphone,
  CheckCircle2,
  XCircle,
  HelpCircle,
  Copy,
  Check,
  ArrowRight,
  RotateCcw,
  ExternalLink,
  Info,
  Layers,
  Lock,
  Search,
  Loader2,
  Building2,
  Calendar,
  AlertOctagon,
} from "lucide-react";
import { IndicatorCheckResult, IndicatorWarningLevel } from "../types";

interface IndicatorLookupResultCardProps {
  result: IndicatorCheckResult;
  isLargeFont?: boolean;
  isSearchingGrounding?: boolean;
  onReset: () => void;
  onAnalyzeFull?: (input: string) => void;
}

export const IndicatorLookupResultCard: React.FC<IndicatorLookupResultCardProps> = ({
  result,
  isLargeFont = false,
  isSearchingGrounding = false,
  onReset,
  onAnalyzeFull,
}) => {
  const [copied, setCopied] = React.useState(false);

  const handleCopy = () => {
    const textToCopy = `[Kết quả tra cứu nhanh - Bẫy Hay Thật ?]
Mức độ: ${result.riskBadgeLabel} (${result.riskTitle})
Đối tượng: ${result.primaryTarget}
${result.realDomainOrPrefix}
Dấu hiệu: ${result.notableSigns.join(" | ")}
Báo cáo: ${result.communityReports.message}
${
  result.hasOfficialWarningMatch && result.officialWarningMatch
    ? `Cảnh báo chính thức: ${result.officialWarningMatch.title} (${result.officialWarningMatch.verifiedHostname} - ${result.officialWarningMatch.publishedAt})`
    : ""
}
Khuyến nghị: ${result.recommendedActions.join(" | ")}`;

    navigator.clipboard.writeText(textToCopy);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Color config based on warningLevel
  const getThemeConfig = (level: IndicatorWarningLevel) => {
    switch (level) {
      case "RED":
        return {
          bg: "bg-rose-50/70",
          border: "border-rose-300",
          badgeBg: "bg-rose-600 text-white border-rose-700",
          iconColor: "text-rose-600",
          iconBg: "bg-rose-100",
          headerTitleColor: "text-rose-950",
          accentBorder: "border-rose-200",
          boxBg: "bg-white",
          Icon: ShieldAlert,
        };
      case "ORANGE":
        return {
          bg: "bg-orange-50/70",
          border: "border-orange-300",
          badgeBg: "bg-orange-500 text-white border-orange-600",
          iconColor: "text-orange-600",
          iconBg: "bg-orange-100",
          headerTitleColor: "text-orange-950",
          accentBorder: "border-orange-200",
          boxBg: "bg-white",
          Icon: AlertTriangle,
        };
      case "YELLOW":
        return {
          bg: "bg-amber-50/70",
          border: "border-amber-300",
          badgeBg: "bg-amber-500 text-white border-amber-600",
          iconColor: "text-amber-600",
          iconBg: "bg-amber-100",
          headerTitleColor: "text-amber-950",
          accentBorder: "border-amber-200",
          boxBg: "bg-white",
          Icon: AlertTriangle,
        };
      case "GREEN":
        return {
          bg: "bg-emerald-50/70",
          border: "border-emerald-300",
          badgeBg: "bg-emerald-600 text-white border-emerald-700",
          iconColor: "text-emerald-600",
          iconBg: "bg-emerald-100",
          headerTitleColor: "text-emerald-950",
          accentBorder: "border-emerald-200",
          boxBg: "bg-white",
          Icon: ShieldCheck,
        };
      case "GRAY":
      default:
        return {
          bg: "bg-slate-50",
          border: "border-slate-300",
          badgeBg: "bg-slate-700 text-white border-slate-800",
          iconColor: "text-slate-600",
          iconBg: "bg-slate-200",
          headerTitleColor: "text-slate-900",
          accentBorder: "border-slate-200",
          boxBg: "bg-white",
          Icon: HelpCircle,
        };
    }
  };

  const theme = getThemeConfig(result.warningLevel);
  const StatusIcon = theme.Icon;

  const isHighOrCriticalRisk =
    result.warningLevel === "RED" ||
    result.warningLevel === "ORANGE" ||
    result.hasOfficialWarningMatch;

  const officialMatch = result.officialWarningMatch;
  const referenceMatches = result.referenceMatches || [];

  return (
    <div
      id="indicator-lookup-result-card"
      className={`rounded-3xl border-2 ${theme.border} ${theme.bg} p-6 sm:p-8 shadow-lg space-y-6 transition-all`}
    >
      {/* Background Grounding Search Live Banner */}
      {isSearchingGrounding && (
        <div className="flex items-center gap-2.5 px-4 py-2.5 rounded-2xl bg-indigo-50 border border-indigo-200 text-indigo-900 text-xs sm:text-sm font-semibold animate-pulse shadow-2xs">
          <Loader2 className="w-4 h-4 text-indigo-600 animate-spin shrink-0" />
          <span>
            Đang tìm trong các cảnh báo công khai của Bộ Công an và cơ quan nhà nước...
          </span>
        </div>
      )}

      {/* Grounding Search Graceful Notice when API is busy */}
      {result.groundingSearchState === "error" && !isSearchingGrounding && (
        <div className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-slate-100/90 border border-slate-200 text-slate-700 text-xs font-medium">
          <Info className="w-3.5 h-3.5 text-slate-500 shrink-0" />
          <span>
            {result.groundingSearchMessage || "Hệ thống đang phục vụ lượng truy cập cao. Kết quả phân tích hiện dựa trên cơ sở dữ liệu Bộ Công an và quy tắc đầu số kỹ thuật."}
          </span>
        </div>
      )}

      {/* 1. Header Banner */}
      <div className="flex items-start justify-between gap-4 flex-wrap pb-2 border-b border-slate-200/70">
        <div className="flex items-start gap-4">
          <div
            className={`w-14 h-14 rounded-2xl ${theme.iconBg} flex items-center justify-center shrink-0 shadow-xs`}
          >
            <StatusIcon className={`w-8 h-8 ${theme.iconColor}`} />
          </div>
          <div className="space-y-1">
            <div className="flex items-center gap-2 flex-wrap">
              <span
                id="indicator-warning-badge"
                className={`px-3 py-1 rounded-full text-xs font-black border uppercase tracking-wider ${theme.badgeBg}`}
              >
                {result.riskBadgeLabel}
              </span>
              <span className="text-xs font-bold text-slate-700 bg-white/80 px-2.5 py-1 rounded-md border border-slate-200">
                Loại dữ liệu: <strong>{result.dataTypeLabel}</strong>
              </span>
              {result.hasOfficialWarningMatch && (
                <span className="px-2.5 py-0.5 rounded-md bg-rose-600 text-white font-extrabold text-xs flex items-center gap-1 shadow-2xs">
                  <AlertOctagon className="w-3.5 h-3.5" />
                  <span>Khớp dữ liệu cảnh báo Công an</span>
                </span>
              )}
            </div>
            <h2
              className={`font-black ${theme.headerTitleColor} ${
                isLargeFont ? "text-2xl sm:text-3xl" : "text-xl sm:text-2xl"
              }`}
            >
              {result.riskTitle}
            </h2>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2">
          <button
            onClick={handleCopy}
            className="px-3.5 py-2 rounded-xl bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 font-bold text-xs flex items-center gap-1.5 shadow-2xs transition-all cursor-pointer"
            title="Sao chép kết quả"
          >
            {copied ? (
              <Check className="w-3.5 h-3.5 text-emerald-600" />
            ) : (
              <Copy className="w-3.5 h-3.5 text-slate-600" />
            )}
            <span>{copied ? "Đã chép" : "Sao chép"}</span>
          </button>
          <button
            onClick={onReset}
            className="px-3.5 py-2 rounded-xl bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 font-bold text-xs flex items-center gap-1.5 shadow-2xs transition-all cursor-pointer"
          >
            <RotateCcw className="w-3.5 h-3.5 text-slate-600" />
            <span>Tra số/link khác</span>
          </button>
        </div>
      </div>

      {/* SPECIAL MANDATED CARD: OFFICIAL WARNING RECORD FOUND */}
      {officialMatch && (
        <div
          id="official-warning-match-card"
          className="rounded-2xl border-2 border-rose-400 bg-rose-50/95 p-5 sm:p-6 shadow-md space-y-4 text-rose-950"
        >
          <div className="flex items-start justify-between gap-3 flex-wrap border-b border-rose-200 pb-3">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-rose-600 text-white flex items-center justify-center font-bold shrink-0 shadow-xs">
                <AlertOctagon className="w-5 h-5" />
              </div>
              <div>
                <span className="text-xs font-black uppercase tracking-wider text-rose-700 block">
                  Từng xuất hiện trong cảnh báo chính thức
                </span>
                <h3 className="font-extrabold text-base sm:text-lg text-rose-950">
                  {officialMatch.title}
                </h3>
              </div>
            </div>

            <a
              href={officialMatch.sourceUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs flex items-center gap-1.5 shadow-xs transition-colors cursor-pointer"
            >
              <span>Xem nguồn</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </a>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
            <div className="bg-white/80 p-3 rounded-xl border border-rose-200 space-y-1">
              <div className="flex items-center gap-1.5 font-bold text-slate-700">
                <Building2 className="w-4 h-4 text-rose-600" />
                <span>Cơ quan công bố:</span>
              </div>
              <p className="font-mono font-extrabold text-rose-900 text-sm">
                {officialMatch.verifiedHostname}
              </p>
            </div>

            <div className="bg-white/80 p-3 rounded-xl border border-rose-200 space-y-1">
              <div className="flex items-center gap-1.5 font-bold text-slate-700">
                <Calendar className="w-4 h-4 text-rose-600" />
                <span>Ngày ghi nhận:</span>
              </div>
              <p className="font-bold text-rose-900 text-sm">
                {officialMatch.publishedAt}
              </p>
            </div>
          </div>

          {officialMatch.incidentCategory && (
            <div className="bg-white/80 p-3 rounded-xl border border-rose-200 text-xs">
              <span className="font-bold text-slate-700 block">Loại thủ đoạn:</span>
              <p className="font-semibold text-rose-950 mt-0.5">
                {officialMatch.incidentCategory}
              </p>
            </div>
          )}

          {officialMatch.description && (
            <p className="text-xs text-rose-900 leading-relaxed font-medium bg-rose-100/60 p-3 rounded-xl border border-rose-200">
              {officialMatch.description}
            </p>
          )}

          {/* MANDATORY DISCLAIMER FOOTNOTE */}
          <div className="p-3.5 rounded-xl bg-white border border-rose-300 text-xs text-rose-900 leading-relaxed font-medium shadow-2xs">
            ⚠️ <strong>LƯU Ý QUAN TRỌNG:</strong> Số này từng xuất hiện trong một vụ việc
            được nguồn chính thức công bố tại thời điểm nêu trên. Số điện thoại có thể bị giả
            mạo hoặc được cấp lại; kết quả không khẳng định danh tính chủ thuê bao hiện tại.
          </div>
        </div>
      )}

      {/* 2. Structured Quick Indicator Overview */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Target & Real Identity */}
        <div
          className={`p-4 sm:p-5 rounded-2xl ${theme.boxBg} border ${theme.accentBorder} shadow-2xs space-y-3`}
        >
          <div className="flex items-center gap-2 text-slate-500 text-xs font-bold uppercase tracking-wider">
            <Layers className="w-4 h-4 text-indigo-600" />
            <span>Thông tin nhận diện đối tượng</span>
          </div>

          <div className="space-y-2">
            <div>
              <span className="text-xs text-slate-500 font-medium block">
                Dữ liệu bạn đã nhập:
              </span>
              <p className="font-mono font-bold text-slate-900 break-all text-sm bg-slate-50 px-2.5 py-1 rounded border border-slate-200 inline-block mt-0.5">
                {result.primaryTarget}
              </p>
            </div>

            <div>
              <span className="text-xs text-slate-500 font-medium block">
                Đầu số / Tên miền thật:
              </span>
              <p className="font-bold text-indigo-900 text-sm sm:text-base mt-0.5">
                {result.realDomainOrPrefix}
              </p>
            </div>

            {/* Explanation Note */}
            {result.explanation && (
              <p className="text-xs text-slate-700 leading-relaxed font-medium bg-indigo-50/50 p-2.5 rounded-xl border border-indigo-100">
                {result.explanation}
              </p>
            )}
          </div>
        </div>

        {/* Community Database Report */}
        <div
          className={`p-4 sm:p-5 rounded-2xl ${theme.boxBg} border ${theme.accentBorder} shadow-2xs space-y-3`}
        >
          <div className="flex items-center gap-2 text-slate-500 text-xs font-bold uppercase tracking-wider">
            <FileSearch className="w-4 h-4 text-slate-700" />
            <span>Dữ liệu báo cáo cộng đồng & Cảnh báo</span>
          </div>

          <div className="space-y-2.5">
            <div className="flex items-center justify-between gap-2 border-b border-slate-100 pb-2">
              <span className="text-xs text-slate-600 font-medium">Số lượt phản ánh:</span>
              <span
                className={`px-2 py-0.5 rounded font-black text-xs ${
                  result.communityReports.hasReports
                    ? "bg-rose-100 text-rose-800"
                    : "bg-slate-100 text-slate-800"
                }`}
              >
                {result.communityReports.reportCount} lượt
              </span>
            </div>

            <div className="flex items-center justify-between gap-2 border-b border-slate-100 pb-2">
              <span className="text-xs text-slate-600 font-medium">Ghi nhận gần nhất:</span>
              <span className="text-xs font-bold text-slate-800">
                {result.communityReports.lastReportText}
              </span>
            </div>

            <p className="text-xs font-semibold text-slate-800 leading-relaxed">
              {result.communityReports.message}
            </p>
          </div>
        </div>
      </div>

      {/* 3. Notable Signs & Red Flags */}
      <div
        className={`p-5 rounded-2xl ${theme.boxBg} border ${theme.accentBorder} space-y-3 shadow-2xs`}
      >
        <h4 className="font-extrabold text-slate-900 text-sm sm:text-base flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 text-amber-500" />
          <span>Các dấu hiệu đáng chú ý:</span>
        </h4>
        <ul className="space-y-2">
          {result.notableSigns.map((sign, idx) => (
            <li
              key={idx}
              className="flex items-start gap-2.5 text-xs sm:text-sm text-slate-800"
            >
              <span className="w-1.5 h-1.5 rounded-full bg-slate-400 mt-1.5 shrink-0" />
              <span className="font-medium leading-relaxed">{sign}</span>
            </li>
          ))}
        </ul>
      </div>

      {/* 4. Reference Matches (if any news/community matches) */}
      {referenceMatches.length > 0 && !officialMatch && (
        <div className="p-4 sm:p-5 rounded-2xl bg-white border border-slate-200 space-y-3 shadow-2xs">
          <div className="flex items-center justify-between gap-2">
            <span className="text-xs font-extrabold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
              <Globe className="w-4 h-4 text-slate-500" />
              <span>Nguồn tham khảo (Báo chí & Diễn đàn)</span>
            </span>
            <span className="text-2xs text-slate-500 bg-slate-100 px-2 py-0.5 rounded">
              Chỉ dùng để tham khảo, không kết luận rủi ro cao một mình
            </span>
          </div>

          <div className="space-y-2">
            {referenceMatches.map((ref, idx) => (
              <div
                key={idx}
                className="p-2.5 rounded-xl bg-slate-50 border border-slate-200 flex items-start justify-between gap-2 text-xs"
              >
                <div className="space-y-0.5">
                  <span className="font-bold text-slate-900 block">{ref.title}</span>
                  <span className="text-2xs font-mono text-slate-500 block">
                    {ref.hostname} {ref.publishedAt ? `• ${ref.publishedAt}` : ""}
                  </span>
                  {ref.description && (
                    <p className="text-2xs text-slate-600 mt-0.5">{ref.description}</p>
                  )}
                </div>
                {ref.sourceUrl && (
                  <a
                    href={ref.sourceUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="p-1 text-slate-500 hover:text-slate-900 shrink-0"
                    title="Mở nguồn tham khảo"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 5. Recommended Actions (Việc nên làm) */}
      <div
        className={`p-5 rounded-2xl ${
          isHighOrCriticalRisk
            ? "bg-rose-100/80 border-2 border-rose-400"
            : "bg-slate-100 border border-slate-300"
        } space-y-3`}
      >
        <div className="flex items-center gap-2">
          <ShieldAlert
            className={`w-5 h-5 ${
              isHighOrCriticalRisk ? "text-rose-700" : "text-slate-700"
            }`}
          />
          <h4
            className={`font-black text-sm sm:text-base ${
              isHighOrCriticalRisk ? "text-rose-950" : "text-slate-900"
            }`}
          >
            Việc bạn nên làm ngay:
          </h4>
        </div>

        {/* High Risk Critical Warning Phrase Required by Prompt */}
        {isHighOrCriticalRisk && (
          <div className="p-3 rounded-xl bg-white border border-rose-300 text-rose-900 font-extrabold text-xs sm:text-sm shadow-2xs">
            👉 Không gọi lại, không trả lời, không mở đường link và không cung cấp thông tin cá
            nhân.
          </div>
        )}

        <ul className="space-y-1.5">
          {result.recommendedActions.map((act, idx) => (
            <li
              key={idx}
              className="flex items-start gap-2 text-xs sm:text-sm font-semibold text-slate-800"
            >
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
              <span className="leading-relaxed">{act}</span>
            </li>
          ))}
        </ul>
      </div>

      {/* 6. Footer Actions */}
      <div className="flex items-center justify-between gap-3 flex-wrap pt-2">
        <div className="flex items-center gap-2 text-xs text-slate-500">
          <Info className="w-3.5 h-3.5 text-slate-400" />
          <span>
            Tra cứu kết hợp thuật toán kỹ thuật đầu số, cơ sở dữ liệu cảnh báo và đối soát
            nguồn công khai.
          </span>
        </div>

        {onAnalyzeFull && (
          <button
            onClick={() => onAnalyzeFull(result.input)}
            className="px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs flex items-center gap-2 transition-all cursor-pointer ml-auto"
          >
            <span>Phân tích toàn diện tình huống với AI</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        )}
      </div>
    </div>
  );
};
