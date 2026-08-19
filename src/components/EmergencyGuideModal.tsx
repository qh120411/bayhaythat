import React from "react";
import { X, PhoneCall, AlertTriangle, ExternalLink } from "lucide-react";
import { OFFICIAL_HOTLINES } from "../data/hotlines";

interface EmergencyGuideModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const EmergencyGuideModal: React.FC<EmergencyGuideModalProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto animate-in fade-in duration-200">
      <div className="bg-white border border-slate-200 w-full max-w-2xl rounded-3xl p-6 sm:p-8 shadow-2xl text-slate-900 space-y-6 relative my-8">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 text-slate-400 hover:text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-full transition-colors cursor-pointer"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Header */}
        <div className="space-y-1">
          <span className="px-3 py-1 rounded-full bg-rose-50 text-rose-800 text-xs font-black border border-rose-200 uppercase tracking-wider">
            Cẩm Nang Xử Lý Sự Cố
          </span>
          <h2 className="text-xl sm:text-2xl font-black text-slate-900">
            Danh Bạ Khẩn Cấp & Hướng Dẫn Cứu Vãn Tài Sản
          </h2>
          <p className="text-xs text-slate-600 font-medium">
            Các số điện thoại chính thống của cơ quan quản lý và quy trình chặn giao dịch lừa đảo
          </p>
        </div>

        {/* 3 Steps in 15 mins */}
        <div className="p-4 rounded-2xl bg-amber-50/80 border border-amber-200 space-y-2">
          <h3 className="font-extrabold text-xs text-amber-900 uppercase tracking-wider flex items-center gap-1.5">
            <AlertTriangle className="w-4 h-4 text-amber-600" />
            3 BƯỚC KHẨN CẤP TRONG 15 PHÚT ĐẦU:
          </h3>
          <ol className="text-xs text-slate-700 font-medium space-y-1.5 list-decimal list-inside">
            <li><strong>Khóa ngay thẻ và tài khoản ngân hàng</strong>: Vào app ngân hàng bật tính năng khóa thẻ hoặc gọi tổng đài yêu cầu chặn giao dịch ra.</li>
            <li><strong>Đổi mật khẩu & Đăng xuất tất cả thiết bị</strong>: Đổi mật khẩu Zalo, Facebook, Email, VNeID.</li>
            <li><strong>Gọi Tổng đài 156</strong>: Phản ánh cuộc gọi/tin nhắn có dấu hiệu lừa đảo để nhà mạng ngăn chặn số thuê bao kẻ gian.</li>
          </ol>
        </div>

        {/* Emergency Hotline Contact Cards */}
        <div className="space-y-3">
          <h3 className="font-extrabold text-sm text-slate-800">
            Danh bạ đường dây nóng quốc gia (Miễn phí cước):
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-72 overflow-y-auto pr-1">
            {OFFICIAL_HOTLINES.map((item) => (
              <div
                key={item.id}
                className="p-4 rounded-2xl bg-slate-50 border border-slate-200 flex flex-col justify-between gap-3 shadow-xs hover:border-emerald-500 transition-colors"
              >
                <div>
                  <div className="flex items-center justify-between">
                    <span className="font-black text-sm text-slate-900">{item.name}</span>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-800 border border-emerald-200">
                      {item.hours}
                    </span>
                  </div>
                  <p className="text-xs text-slate-600 mt-1 font-medium">{item.desc}</p>
                </div>

                <a
                  href={`tel:${item.phone.replace(/[^0-9]/g, "")}`}
                  className="w-full py-2.5 px-3 rounded-xl bg-slate-900 hover:bg-emerald-600 text-white font-extrabold text-xs flex items-center justify-center gap-2 transition-colors shadow-sm"
                >
                  <PhoneCall className="w-3.5 h-3.5" />
                  <span>Gọi {item.phone}</span>
                </a>
              </div>
            ))}
          </div>
        </div>

        {/* Portal reference link */}
        <div className="p-4 rounded-2xl bg-slate-100 border border-slate-200 text-xs text-slate-700 flex items-center justify-between gap-3 flex-wrap font-medium">
          <span>Tra cứu website giả mạo tại Cổng An Toàn Không Gian Mạng Quốc Gia</span>
          <a
            href="https://tinnhiemmang.vn"
            target="_blank"
            rel="noopener noreferrer"
            className="text-emerald-700 font-bold hover:underline flex items-center gap-1"
          >
            <span>tinnhiemmang.vn</span>
            <ExternalLink className="w-3.5 h-3.5" />
          </a>
        </div>
      </div>
    </div>
  );
};
