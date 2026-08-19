import React, { useState, useEffect } from "react";
import { X, HeartHandshake, ShieldAlert, Sparkles, Check } from "lucide-react";

interface CalmBreathingModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const CalmBreathingModal: React.FC<CalmBreathingModalProps> = ({ isOpen, onClose }) => {
  const [seconds, setSeconds] = useState(60);
  const [phase, setPhase] = useState<"Hít vào thật sâu" | "Giữ hơi thở" | "Thở ra từ từ">("Hít vào thật sâu");

  useEffect(() => {
    if (!isOpen) {
      setSeconds(60);
      return;
    }

    const timer = setInterval(() => {
      setSeconds((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    const phaseTimer = setInterval(() => {
      setPhase((prev) => {
        if (prev === "Hít vào thật sâu") return "Giữ hơi thở";
        if (prev === "Giữ hơi thở") return "Thở ra từ từ";
        return "Hít vào thật sâu";
      });
    }, 4000);

    return () => {
      clearInterval(timer);
      clearInterval(phaseTimer);
    };
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200">
      <div className="bg-white border border-slate-200 w-full max-w-lg rounded-3xl p-6 sm:p-8 shadow-2xl text-slate-900 space-y-6 relative overflow-hidden text-center">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 text-slate-400 hover:text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-full transition-colors cursor-pointer"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Breathing Icon and Pulse */}
        <div className="flex flex-col items-center justify-center pt-2">
          <div className="relative flex items-center justify-center">
            <div className="w-32 h-32 rounded-full bg-indigo-100 border-2 border-indigo-200 flex items-center justify-center animate-ping opacity-60" />
            <div className="w-28 h-28 rounded-full bg-gradient-to-tr from-indigo-600 to-teal-500 flex items-center justify-center absolute shadow-xl shadow-indigo-500/20">
              <HeartHandshake className="w-12 h-12 text-white" />
            </div>
          </div>
          <span className="text-3xl font-black text-indigo-700 mt-6 tracking-tight">
            {seconds}s
          </span>
          <span className="text-base font-bold text-slate-700 mt-1">
            {phase}
          </span>
        </div>

        {/* 3 Vital Truths Box */}
        <div className="p-4 rounded-2xl bg-indigo-50/70 border border-indigo-200/80 text-left space-y-2.5">
          <h4 className="font-extrabold text-xs uppercase tracking-wider text-indigo-900 flex items-center gap-1.5">
            <Sparkles className="w-4 h-4 text-indigo-600" />
            3 SỰ THẬT GIÚP BẠN YÊN TÂM:
          </h4>
          <ul className="text-xs text-slate-700 font-medium space-y-1.5 list-disc list-inside">
            <li>Kẻ gian luôn tạo cảm giác <strong>"Cực kỳ gấp gáp"</strong> để bạn không kịp suy nghĩ.</li>
            <li>Cơ quan nhà nước, ngân hàng và bệnh viện <strong>không bao giờ</strong> bắt chuyển tiền qua điện thoại trong 10-15 phút.</li>
            <li>Tiền của bạn vẫn đang an toàn. Việc bạn dừng lại kiểm chứng sẽ cứu lấy tài sản gia đình!</li>
          </ul>
        </div>

        {/* Dismiss Button */}
        <button
          onClick={onClose}
          className="w-full py-3.5 rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold text-sm transition-all shadow-md cursor-pointer active:scale-98"
        >
          Tôi đã bình tĩnh hơn, tiếp tục kiểm tra
        </button>
      </div>
    </div>
  );
};
