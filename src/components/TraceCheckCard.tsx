import React from "react";
import {
  Search,
  ShieldAlert,
  Globe,
  Smartphone,
  History,
  AlertTriangle,
  FileSearch,
  CheckCircle2,
  Info,
  Clock,
  Radio,
  Loader2,
} from "lucide-react";
import { TraceCheckResult, PhoneTraceItem, DomainTraceItem } from "../types";
import { CanonicalRiskLevel } from "../utils/riskConfig";
import { performTraceCheckSync } from "../utils/reputationService";

interface TraceCheckCardProps {
  traceResult?: TraceCheckResult | null;
  isLoading?: boolean;
  isLargeFont?: boolean;
  fallbackText?: string;
  fallbackUrl?: string;
}

export const TraceCheckCard: React.FC<TraceCheckCardProps> = ({
  traceResult,
  isLoading = false,
  isLargeFont = false,
  fallbackText = "",
  fallbackUrl = "",
}) => {
  // If no trace result passed, compute instant synchronous fallback from text
  const activeTrace =
    traceResult ||
    performTraceCheckSync({
      text: fallbackText,
      linkUrl: fallbackUrl,
    });

  const hasReports = !!(activeTrace && activeTrace.hasReports && activeTrace.totalReportCount > 0);
  const totalReports = activeTrace?.totalReportCount || 0;
  const lastReported = activeTrace?.lastReportedText || "Chưa có";
  const searchedPhone = activeTrace?.searchedPhone || "Không có số điện thoại";
  const searchedCountry = activeTrace?.searchedCountryOrArea || "Không áp dụng";
  const searchedDomain = activeTrace?.searchedRealDomain || "Không có đường link";
  const lookupStatus = activeTrace?.lookupStatusText || (isLoading ? "Đang truy vấn mạng lưới cảnh báo an toàn số..." : "Đã đối soát với cơ sở dữ liệu vi phạm.");

  return (
    <div
      id="trace-check-card"
      className="p-6 sm:p-7 rounded-3xl bg-white border-2 border-slate-200 shadow-sm space-y-5 transition-all"
    >
      {/* Header */}
      <div className="flex items-center justify-between gap-3 flex-wrap border-b border-slate-100 pb-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-slate-900 text-white flex items-center justify-center shadow-xs">
            <FileSearch className="w-5 h-5 text-amber-400" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className={`font-black text-slate-900 ${isLargeFont ? "text-2xl" : "text-xl"}`}>
                Kiểm tra dấu vết
              </h3>
              {isLoading && (
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-indigo-50 border border-indigo-200 text-indigo-700 text-xs font-bold animate-pulse">
                  <Loader2 className="w-3 h-3 animate-spin" />
                  Đang đối soát song song...
                </span>
              )}
            </div>
            <p className="text-xs text-slate-500 font-medium">
              Tra cứu dấu vết số điện thoại, đầu số quốc tế, tên miền thật & dữ liệu phản ánh cộng đồng
            </p>
          </div>
        </div>

        {/* Reputation Badge */}
        {traceResult && (
          <div>
            {hasReports ? (
              <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-rose-100 border border-rose-300 text-rose-900 font-black text-xs sm:text-sm">
                <ShieldAlert className="w-4 h-4 text-rose-600" />
                <span>{totalReports} lượt báo cáo vi phạm</span>
              </span>
            ) : (
              /* CRITICAL: Neutral gray / slate badge, NEVER green */
              <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-100 border border-slate-300 text-slate-700 font-bold text-xs sm:text-sm">
                <Info className="w-4 h-4 text-slate-500" />
                <span>Chưa ghi nhận báo cáo</span>
              </span>
            )}
          </div>
        )}
      </div>

      {/* Grid of Core Metadata */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
        {/* 1. Số điện thoại / Người gửi */}
        <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 space-y-1">
          <div className="flex items-center gap-1.5 text-slate-500 text-xs font-bold uppercase tracking-wider">
            <Smartphone className="w-3.5 h-3.5 text-slate-600" />
            <span>Số điện thoại / Người gửi</span>
          </div>
          <p className="font-mono font-bold text-slate-900 text-sm break-all">
            {searchedPhone}
          </p>
        </div>

        {/* 2. Quốc gia hoặc đầu số */}
        <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 space-y-1">
          <div className="flex items-center gap-1.5 text-slate-500 text-xs font-bold uppercase tracking-wider">
            <Radio className="w-3.5 h-3.5 text-slate-600" />
            <span>Quốc gia hoặc đầu số</span>
          </div>
          <p className="font-bold text-slate-900 text-sm">
            {searchedCountry}
          </p>
        </div>

        {/* 3. Tên miền thật */}
        <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 space-y-1">
          <div className="flex items-center gap-1.5 text-slate-500 text-xs font-bold uppercase tracking-wider">
            <Globe className="w-3.5 h-3.5 text-slate-600" />
            <span>Tên miền thật</span>
          </div>
          <p className="font-mono font-bold text-indigo-900 text-sm break-all">
            {searchedDomain}
          </p>
        </div>

        {/* 4. Số lượt báo cáo */}
        <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 space-y-1">
          <div className="flex items-center gap-1.5 text-slate-500 text-xs font-bold uppercase tracking-wider">
            <ShieldAlert className="w-3.5 h-3.5 text-slate-600" />
            <span>Số lượt báo cáo</span>
          </div>
          <p className={`font-bold text-sm ${hasReports ? "text-rose-700 font-black text-base" : "text-slate-700"}`}>
            {hasReports ? `${totalReports} lượt cảnh báo` : "0 lượt"}
          </p>
        </div>

        {/* 5. Lần báo cáo gần nhất */}
        <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 space-y-1">
          <div className="flex items-center gap-1.5 text-slate-500 text-xs font-bold uppercase tracking-wider">
            <Clock className="w-3.5 h-3.5 text-slate-600" />
            <span>Lần báo cáo gần nhất</span>
          </div>
          <p className="font-semibold text-slate-800 text-sm">
            {lastReported}
          </p>
        </div>

        {/* 6. Trạng thái tra cứu */}
        <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 space-y-1 sm:col-span-2 lg:col-span-1">
          <div className="flex items-center gap-1.5 text-slate-500 text-xs font-bold uppercase tracking-wider">
            <History className="w-3.5 h-3.5 text-slate-600" />
            <span>Trạng thái tra cứu</span>
          </div>
          <p className="font-semibold text-slate-800 text-xs leading-snug">
            {lookupStatus}
          </p>
        </div>
      </div>

      {/* No Data Notice or Active Threat Warning */}
      {!hasReports ? (
        /* MANDATORY REQUIREMENT: If no data, display exact text:
           "Chưa có báo cáo cộng đồng — điều này không chứng minh đối tượng an toàn."
           Never use green color! Use neutral gray / amber. */
        <div
          id="trace-no-data-notice"
          className="p-4 rounded-2xl bg-slate-100 border border-slate-300 text-slate-800 flex items-start gap-3 text-xs sm:text-sm font-semibold"
        >
          <AlertTriangle className="w-5 h-5 text-slate-600 shrink-0 mt-0.5" />
          <div className="space-y-0.5">
            <p className="font-bold text-slate-900">
              Chưa có báo cáo cộng đồng — điều này không chứng minh đối tượng an toàn.
            </p>
            <p className="text-[11px] text-slate-600 font-normal">
              Các đối tượng lừa đảo thường xuyên thay đổi số điện thoại mới và tạo tên miền phụ liên tục chỉ trong vài giờ. Hãy luôn tuân thủ nguyên tắc bảo mật không cung cấp OTP hay chuyển tiền.
            </p>
          </div>
        </div>
      ) : (
        /* Active Threat Summary */
        <div
          id="trace-active-threat-warning"
          className="p-4 rounded-2xl bg-rose-50 border-2 border-rose-300 text-rose-950 space-y-2.5 text-xs sm:text-sm"
        >
          <div className="flex items-center gap-2 font-black text-rose-900">
            <ShieldAlert className="w-5 h-5 text-rose-600 shrink-0" />
            <span>CẢNH BÁO TRÙNG KHỚP CƠ SỞ DỮ LIỆU ĐỐI TƯỢNG BỊ BÁO CÁO NHIỀU LẦN:</span>
          </div>

          <div className="space-y-1.5 text-slate-800">
            {activeTrace.phoneItems
              .filter((p) => p.reportCount > 0)
              .map((p, idx) => (
                <div key={idx} className="p-2.5 rounded-xl bg-white border border-rose-200 flex items-center justify-between gap-2 flex-wrap">
                  <div>
                    <span className="font-bold text-slate-900">{p.phoneNumber}</span>
                    <span className="text-slate-600 text-xs ml-2">({p.countryName})</span>
                    {p.reputationCategory && (
                      <p className="text-[11px] text-rose-700 font-semibold">{p.reputationCategory}</p>
                    )}
                  </div>
                  <span className="px-2 py-0.5 rounded bg-rose-100 text-rose-900 font-black text-xs">
                    {p.reportCount} lượt báo cáo
                  </span>
                </div>
              ))}

            {activeTrace.domainItems
              .filter((d) => d.reportCount > 0)
              .map((d, idx) => (
                <div key={idx} className="p-2.5 rounded-xl bg-white border border-rose-200 flex items-center justify-between gap-2 flex-wrap">
                  <div>
                    <span className="font-mono font-bold text-slate-900">{d.registrableDomain}</span>
                    <span className="text-slate-600 text-xs ml-2">(Đuôi .{d.tld})</span>
                    {d.reputationCategory && (
                      <p className="text-[11px] text-rose-700 font-semibold">{d.reputationCategory}</p>
                    )}
                  </div>
                  <span className="px-2 py-0.5 rounded bg-rose-100 text-rose-900 font-black text-xs">
                    {d.reportCount} lượt báo cáo
                  </span>
                </div>
              ))}
          </div>
        </div>
      )}
    </div>
  );
};
