import React from "react";
import { ShieldCheck, Eye, PhoneCall, HelpCircle, HeartHandshake, Sparkles, BookOpen } from "lucide-react";

interface HeaderProps {
  isLargeFont: boolean;
  onToggleLargeFont: () => void;
  onOpenHotline: () => void;
  onOpenBreathing: () => void;
  onOpenArchitecture: () => void;
  activeTab: "check" | "practice";
  onSelectTab: (tab: "check" | "practice") => void;
}

export const Header: React.FC<HeaderProps> = ({
  isLargeFont,
  onToggleLargeFont,
  onOpenHotline,
  onOpenBreathing,
  onOpenArchitecture,
  activeTab,
  onSelectTab,
}) => {
  return (
    <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-slate-200/90 text-slate-900 transition-all shadow-sm">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-3 flex items-center justify-between gap-3 flex-wrap">
        {/* App Logo & Branding */}
        <div
          id="app-brand-logo"
          onClick={() => onSelectTab("check")}
          className="flex items-center gap-3 cursor-pointer select-none group"
        >
          <div className="relative">
            <div className="w-11 h-11 rounded-2xl bg-gradient-to-tr from-emerald-600 via-teal-600 to-emerald-500 flex items-center justify-center shadow-md shadow-emerald-600/20 group-hover:scale-105 transition-all duration-300">
              <ShieldCheck className="w-6 h-6 text-white stroke-[2.5]" />
            </div>
            <span className="absolute -bottom-1 -right-1 w-3.5 h-3.5 bg-emerald-500 border-2 border-white rounded-full animate-pulse" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className={`font-black tracking-tight text-slate-900 ${isLargeFont ? "text-2xl" : "text-xl"}`}>
                Bẫy Hay Thật ?
              </span>
              <span className="px-2.5 py-0.5 text-[11px] font-extrabold rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200 tracking-wide uppercase">
                Trợ lý AI
              </span>
            </div>
            <p className="text-xs text-slate-500 font-medium hidden sm:block">
              Nhận diện dấu hiệu rủi ro và hướng dẫn xử lý an toàn
            </p>
          </div>
        </div>

        {/* Center Navigation Tabs */}
        <div className="flex items-center gap-1.5 bg-slate-100 p-1.5 rounded-2xl border border-slate-200/80 shadow-inner">
          <button
            id="tab-check-situation"
            onClick={() => onSelectTab("check")}
            className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all duration-200 flex items-center gap-2 cursor-pointer ${
              activeTab === "check"
                ? "bg-white text-emerald-700 shadow-sm border border-slate-200 font-extrabold scale-102"
                : "text-slate-600 hover:text-slate-900 hover:bg-slate-200/60"
            }`}
          >
            <Sparkles className="w-4 h-4 text-emerald-600" />
            <span>Kiểm Tra Nhanh</span>
          </button>
          <button
            id="tab-practice-mode"
            onClick={() => onSelectTab("practice")}
            className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all duration-200 flex items-center gap-2 cursor-pointer ${
              activeTab === "practice"
                ? "bg-white text-amber-800 shadow-sm border border-slate-200 font-extrabold scale-102"
                : "text-slate-600 hover:text-slate-900 hover:bg-slate-200/60"
            }`}
          >
            <BookOpen className="w-4 h-4 text-amber-600" />
            <span>Tập Nhận Diện</span>
          </button>
        </div>

        {/* Right Action Utility Buttons */}
        <div className="flex items-center gap-2">
          {/* Calm Breathing SOS */}
          <button
            id="btn-calm-sos"
            onClick={onOpenBreathing}
            className="px-3.5 py-2 rounded-xl bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 text-xs font-bold flex items-center gap-1.5 transition-all shadow-sm active:scale-95 cursor-pointer"
            title="Dừng lại 1 phút để bình tĩnh"
          >
            <HeartHandshake className="w-4 h-4 text-indigo-600 shrink-0" />
            <span className="hidden md:inline">Bình tĩnh 1 phút</span>
          </button>

          {/* Large Font Mode Toggle */}
          <button
            id="btn-toggle-elderly-font"
            onClick={onToggleLargeFont}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all border cursor-pointer ${
              isLargeFont
                ? "bg-amber-400 text-slate-950 border-amber-500 font-extrabold shadow-sm scale-105"
                : "bg-amber-50 hover:bg-amber-100 text-amber-900 border-amber-200"
            }`}
            title="Bật/Tắt chế độ chữ lớn cho người cao tuổi"
          >
            <Eye className="w-4 h-4 text-inherit shrink-0" />
            <span>{isLargeFont ? "Chữ Vừa" : "Chữ Lớn 👁️"}</span>
          </button>

          {/* Hotline Quick Call */}
          <button
            id="btn-open-hotline-list"
            onClick={onOpenHotline}
            className="px-3.5 py-2 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 text-xs font-bold flex items-center gap-1.5 transition-all shadow-sm active:scale-95 cursor-pointer"
            title="Danh bạ đường dây nóng khẩn cấp 156 / 113"
          >
            <PhoneCall className="w-4 h-4 text-rose-600 shrink-0" />
            <span className="hidden sm:inline">Tổng đài 156</span>
          </button>

          {/* System Architecture info button */}
          <button
            id="btn-open-architecture-info"
            onClick={onOpenArchitecture}
            className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-600 border border-slate-200 transition-colors cursor-pointer"
            title="Hồ sơ kiến trúc kỹ thuật & Báo cáo hệ thống"
          >
            <HelpCircle className="w-4 h-4 text-slate-600" />
          </button>
        </div>
      </div>
    </header>
  );
};
