import React from "react";
import { X, ShieldCheck, Lock, EyeOff, ServerOff, CheckCircle2, FileText, Calendar, ExternalLink, ShieldAlert } from "lucide-react";

interface PrivacyPolicyModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const PrivacyPolicyModal: React.FC<PrivacyPolicyModalProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto animate-in fade-in duration-200">
      <div className="bg-white border border-slate-200 w-full max-w-3xl rounded-3xl p-6 sm:p-8 shadow-2xl text-slate-900 space-y-6 relative my-8">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 text-slate-400 hover:text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-full transition-colors cursor-pointer"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Header */}
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="px-3 py-1 rounded-full bg-emerald-50 text-emerald-800 text-xs font-black border border-emerald-200 uppercase tracking-wider">
              Chính Sách Bảo Mật & Quyền Riêng Tư
            </span>
            <span className="text-xs text-slate-500 font-bold flex items-center gap-1">
              <Calendar className="w-3.5 h-3.5 text-slate-400" /> Cập nhật: Q1/2026
            </span>
          </div>
          <h2 className="text-xl sm:text-2xl font-black text-slate-900">
            Cam Kết Minh Bạch Về Dữ Liệu & An Toàn Người Dùng
          </h2>
          <p className="text-xs text-slate-600 font-medium">
            Nguyên tắc xử lý dữ liệu và trách nhiệm bảo vệ thông tin cá nhân của người dân khi sử dụng trợ lý "Bẫy Hay Thật ?"
          </p>
        </div>

        {/* Core Privacy Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {/* 1. Dữ liệu gửi tới AI */}
          <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-2">
            <div className="flex items-center gap-2 text-blue-700 font-bold text-sm">
              <FileText className="w-4 h-4" />
              <span>1. Dữ liệu nào được gửi tới AI?</span>
            </div>
            <p className="text-xs text-slate-600 font-medium leading-relaxed">
              Chỉ có văn bản, liên kết, ảnh chụp màn hình hoặc âm thanh mà người dùng <strong>chủ động cung cấp</strong> trong ô kiểm tra mới được gửi tới mô hình AI để phân tích dấu hiệu rủi ro. Hệ thống không thu thập vị trí GPS hay danh bạ thiết bị.
            </p>
          </div>

          {/* 2. Lưu trữ máy chủ */}
          <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-2">
            <div className="flex items-center gap-2 text-emerald-700 font-bold text-sm">
              <ServerOff className="w-4 h-4" />
              <span>2. Chính sách lưu trữ & Nhật ký máy chủ</span>
            </div>
            <p className="text-xs text-slate-600 font-medium leading-relaxed">
              Mọi yêu cầu phân tích được xử lý <strong>tức thời trong bộ nhớ RAM</strong> (transient processing). Máy chủ <strong>KHÔNG lưu trữ</strong> cơ sở dữ liệu về lịch sử tin nhắn, số điện thoại hay thông tin tài khoản của bạn.
            </p>
          </div>

          {/* 3. Cơ chế che giấu dữ liệu nhạy cảm */}
          <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-2">
            <div className="flex items-center gap-2 text-amber-700 font-bold text-sm">
              <EyeOff className="w-4 h-4" />
              <span>3. Cơ chế tự động che CCCD & OTP</span>
            </div>
            <p className="text-xs text-slate-600 font-medium leading-relaxed">
              Thuật toán client-side tự động nhận diện và ẩn chuỗi 12 số CCCD, mã OTP 4-6 số, số thẻ ngân hàng 16 số và số tài khoản trước khi hiển thị trên màn hình nhằm ngăn ngừa lộ lọt dữ liệu khi người khác nhìn vào màn hình.
            </p>
          </div>

          {/* 4. Không dùng huấn luyện */}
          <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-2">
            <div className="flex items-center gap-2 text-purple-700 font-bold text-sm">
              <Lock className="w-4 h-4" />
              <span>4. Bảo vệ phiên làm việc</span>
            </div>
            <p className="text-xs text-slate-600 font-medium leading-relaxed">
              Không yêu cầu đăng nhập tài khoản. Kết quả phân tích chỉ tồn tại trên trình duyệt của bạn trong phiên làm việc hiện tại và tự xóa khi bạn đóng tab hoặc bấm nút "Kiểm tra tình huống mới".
            </p>
          </div>
        </div>

        {/* Nguồn tài liệu & Căn cứ pháp lý */}
        <div className="p-4 rounded-2xl bg-slate-100/90 border border-slate-200/90 space-y-3">
          <div className="flex items-center gap-2 text-slate-900 font-black text-xs uppercase tracking-wider">
            <ShieldAlert className="w-4 h-4 text-emerald-600" />
            <span>Nguồn Dữ Liệu & Căn Cứ Cảnh Báo Chính Thống (Cập nhật Q1/2026):</span>
          </div>
          <div className="space-y-2 text-xs text-slate-700 font-medium">
            <div className="flex items-start justify-between gap-2 border-b border-slate-200/70 pb-2">
              <div>
                <strong className="text-slate-900">1. Cục An toàn thông tin - Bộ Thông tin và Truyền thông</strong>
                <p className="text-slate-500 mt-0.5">Cơ sở dữ liệu 24 hình thức lừa đảo trên không gian mạng và cổng cảnh báo an toàn thông tin quốc gia.</p>
              </div>
              <a
                href="https://khonggianmang.vn"
                target="_blank"
                rel="noopener noreferrer"
                className="text-emerald-700 font-bold hover:underline flex items-center gap-1 shrink-0"
              >
                <span>khonggianmang.vn</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
            </div>

            <div className="flex items-start justify-between gap-2 border-b border-slate-200/70 pb-2">
              <div>
                <strong className="text-slate-900">2. Cục An ninh mạng và phòng, chống tội phạm công nghệ cao (A05) - Bộ Công An</strong>
                <p className="text-slate-500 mt-0.5">Khuyến cáo quy chuẩn làm việc của cơ quan điều tra (chỉ tống đạt văn bản giấy trực tiếp, không làm việc hay yêu cầu nộp tiền qua điện thoại).</p>
              </div>
              <a
                href="https://bocongan.gov.vn"
                target="_blank"
                rel="noopener noreferrer"
                className="text-emerald-700 font-bold hover:underline flex items-center gap-1 shrink-0"
              >
                <span>bocongan.gov.vn</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
            </div>

            <div className="flex items-start justify-between gap-2">
              <div>
                <strong className="text-slate-900">3. Tổng đài Quốc gia 156</strong>
                <p className="text-slate-500 mt-0.5">Tổng đài tiếp nhận và xử lý phản ánh cuộc gọi rác, tin nhắn rác và dấu hiệu lừa đảo trực tuyến tại Việt Nam.</p>
              </div>
              <span className="font-black text-rose-700 px-2 py-0.5 rounded-md bg-rose-50 border border-rose-200 shrink-0">
                Hotline: 156
              </span>
            </div>
          </div>
        </div>

        {/* Footer acknowledgment */}
        <div className="flex items-center justify-between gap-3 pt-2">
          <span className="text-xs text-slate-500 font-medium">
            Bản quyền ứng dụng cộng đồng vì an toàn số của người Việt.
          </span>
          <button
            onClick={onClose}
            className="px-6 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold transition-colors cursor-pointer"
          >
            Đã hiểu & Đóng
          </button>
        </div>
      </div>
    </div>
  );
};
