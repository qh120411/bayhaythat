import React from "react";
import { X, Layers, Cpu, ShieldCheck, Database, Zap, FileCode, CheckCircle2 } from "lucide-react";

interface ArchitectureModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ArchitectureModal: React.FC<ArchitectureModalProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto animate-in fade-in duration-200">
      <div className="bg-white border border-slate-200 w-full max-w-3xl rounded-3xl p-6 sm:p-8 shadow-2xl text-slate-900 space-y-6 relative my-8">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 text-slate-400 hover:text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-full transition-colors cursor-pointer"
        >
          <X className="w-5 h-5" />
        </button>

        <div>
          <span className="px-3 py-1 rounded-full bg-emerald-50 text-emerald-800 text-xs font-black border border-emerald-200 uppercase tracking-wider">
            Báo Cáo Kiến Trúc Kỹ Thuật
          </span>
          <h2 className="text-xl sm:text-2xl font-black text-slate-900 mt-1">
            Hệ Thống Phân Tích & Xác Minh Lừa Đảo Trực Tuyến
          </h2>
          <p className="text-xs text-slate-600 font-medium mt-0.5">
            Mô hình xử lý đa phương thức (Multimodal AI) kết hợp tri thức phòng chống tội phạm công nghệ cao tại Việt Nam
          </p>
        </div>

        {/* 4 Pillars Architecture */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-2">
            <div className="flex items-center gap-2 text-emerald-700 font-bold text-sm">
              <Cpu className="w-4 h-4" />
              <span>1. Multimodal AI Engine</span>
            </div>
            <p className="text-xs text-slate-600 font-medium leading-relaxed">
              Sử dụng mô hình Gemini xử lý đồng thời văn bản tiếng Việt, hình ảnh chụp màn hình Zalo/SMS/QR, và tệp âm thanh cuộc gọi với độ chính xác cao.
            </p>
          </div>

          <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-2">
            <div className="flex items-center gap-2 text-blue-700 font-bold text-sm">
              <ShieldCheck className="w-4 h-4" />
              <span>2. Local Privacy Protection</span>
            </div>
            <p className="text-xs text-slate-600 font-medium leading-relaxed">
              Tự động phát hiện và che giấu các trường thông tin nhạy cảm (Số CCCD, OTP ngân hàng, số thẻ tín dụng) trước khi phân tích.
            </p>
          </div>

          <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-2">
            <div className="flex items-center gap-2 text-purple-700 font-bold text-sm">
              <Database className="w-4 h-4" />
              <span>3. Scam Pattern Knowledge Base</span>
            </div>
            <p className="text-xs text-slate-600 font-medium leading-relaxed">
              Cơ sở dữ liệu liên tục cập nhật 24 hình thức lừa đảo phổ biến nhất được Bộ Công An & Cục An toàn thông tin cảnh báo.
            </p>
          </div>

          <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-2">
            <div className="flex items-center gap-2 text-amber-700 font-bold text-sm">
              <Zap className="w-4 h-4" />
              <span>4. Elderly-First Accessibility</span>
            </div>
            <p className="text-xs text-slate-600 font-medium leading-relaxed">
              Giao diện tương phản cao, chế độ Chữ Lớn 1 chạm, nút đọc to kết quả bằng giọng nói (Voice Synthesis) và tính năng Bình tĩnh 1 phút.
            </p>
          </div>
        </div>

        {/* Privacy Note */}
        <div className="p-4 rounded-2xl bg-emerald-50/70 border border-emerald-200 text-xs text-emerald-950 flex items-start gap-2.5 font-medium">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
          <span>
            Hệ thống tuân thủ nghiêm ngặt nguyên tắc bảo mật: Không yêu cầu đăng nhập, không lưu trữ dữ liệu cá nhân hay lịch sử tin nhắn của người dùng trên máy chủ trung gian.
          </span>
        </div>
      </div>
    </div>
  );
};
