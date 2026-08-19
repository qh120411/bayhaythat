import React, { useState } from "react";
import {
  BookOpen,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Sparkles,
  ArrowRight,
  RotateCcw,
  ShieldCheck,
  Award,
  Zap,
} from "lucide-react";
import { PRACTICE_QUIZZES } from "../data/quiz";

interface PracticeModeProps {
  isLargeFont: boolean;
  onBackToCheck: () => void;
}

export const PracticeMode: React.FC<PracticeModeProps> = ({ isLargeFont, onBackToCheck }) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [userAnswers, setUserAnswers] = useState<Record<number, boolean>>({});
  const [showResultForCurrent, setShowResultForCurrent] = useState(false);
  const [score, setScore] = useState(0);

  const currentQuiz = PRACTICE_QUIZZES[currentIndex];
  const isCompleted = Object.keys(userAnswers).length === PRACTICE_QUIZZES.length;

  const handleSelectAnswer = (isScamChoice: boolean) => {
    if (showResultForCurrent) return;

    const isCorrect = isScamChoice === currentQuiz.isScam;
    if (isCorrect) {
      setScore((prev) => prev + 1);
    }
    setUserAnswers((prev) => ({
      ...prev,
      [currentQuiz.id]: isScamChoice,
    }));
    setShowResultForCurrent(true);
  };

  const handleNext = () => {
    if (currentIndex < PRACTICE_QUIZZES.length - 1) {
      setCurrentIndex((prev) => prev + 1);
      setShowResultForCurrent(false);
    }
  };

  const handleRestart = () => {
    setCurrentIndex(0);
    setUserAnswers({});
    setShowResultForCurrent(false);
    setScore(0);
  };

  return (
    <div className="py-6 sm:py-8 px-4 max-w-4xl mx-auto space-y-6 animate-in fade-in duration-300">
      {/* Header */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-3 py-1 rounded-full bg-amber-50 text-amber-800 text-xs font-black border border-amber-200 uppercase tracking-wider">
              Luyện Tập Thực Tế
            </span>
            <span className="text-xs text-slate-500 font-bold">
              Câu hỏi {currentIndex + 1} / {PRACTICE_QUIZZES.length}
            </span>
          </div>
          <h2 className={`font-black text-slate-900 mt-1.5 ${isLargeFont ? "text-2xl sm:text-3xl" : "text-xl sm:text-2xl"}`}>
            Tập Nhận Diện Bẫy Lừa Đảo
          </h2>
          <p className="text-xs text-slate-600 mt-0.5 font-medium">
            Rèn luyện phản xạ cảnh giác trước các thủ đoạn tinh vi trong đời sống hàng ngày
          </p>
        </div>

        <button
          onClick={onBackToCheck}
          className="px-4 py-2 rounded-xl bg-white hover:bg-slate-50 text-slate-700 text-xs font-bold border border-slate-200 shadow-xs transition-colors cursor-pointer"
        >
          Quay lại Kiểm tra
        </button>
      </div>

      {/* Modern Progress Bar */}
      <div className="w-full bg-slate-200 rounded-full h-3 p-0.5 border border-slate-300/80 overflow-hidden shadow-inner">
        <div
          className="bg-gradient-to-r from-amber-500 via-orange-500 to-emerald-500 h-full rounded-full transition-all duration-500 ease-out"
          style={{ width: `${((currentIndex + (showResultForCurrent ? 1 : 0)) / PRACTICE_QUIZZES.length) * 100}%` }}
        />
      </div>

      {!isCompleted || !showResultForCurrent ? (
        /* Active Quiz Card */
        <div className="p-6 sm:p-8 rounded-3xl bg-white border border-slate-200/90 shadow-xl shadow-slate-200/50 space-y-6 relative overflow-hidden">
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <span className="px-3 py-1 rounded-xl bg-slate-100 border border-slate-200 text-amber-800 text-xs font-bold">
              Chủ đề: {currentQuiz.tag}
            </span>
            <span className="text-xs text-slate-500 font-medium italic">
              Nguồn tình huống: {currentQuiz.sourceContext}
            </span>
          </div>

          {/* Scenario Text Card */}
          <div className="p-6 rounded-2xl bg-slate-50 border border-slate-200 shadow-inner">
            <p className={`text-slate-900 font-semibold leading-relaxed ${isLargeFont ? "text-xl" : "text-base sm:text-lg"}`}>
              "{currentQuiz.scenarioText}"
            </p>
          </div>

          <div className="text-center font-bold text-slate-800 text-sm sm:text-base">
            Theo bác/anh chị, tình huống này có dấu hiệu lừa đảo nguy hiểm không?
          </div>

          {/* Action Choice Buttons */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <button
              id="quiz-btn-scam"
              disabled={showResultForCurrent}
              onClick={() => handleSelectAnswer(true)}
              className={`p-5 rounded-2xl border-2 font-black text-sm sm:text-base transition-all flex items-center justify-center gap-3 cursor-pointer ${
                showResultForCurrent
                  ? currentQuiz.isScam
                    ? "bg-rose-50 border-rose-500 text-rose-900 ring-2 ring-rose-500/30 shadow-md"
                    : "bg-slate-50 border-slate-200 text-slate-400 opacity-50"
                  : "bg-rose-50/50 hover:bg-rose-100/80 border-rose-300 hover:border-rose-500 text-rose-900 shadow-xs active:scale-98"
              }`}
            >
              <AlertTriangle className="w-5 h-5 text-rose-600" />
              <span>🚨 CÓ RỦI RO / BẪY LỪA ĐẢO</span>
            </button>

            <button
              id="quiz-btn-safe"
              disabled={showResultForCurrent}
              onClick={() => handleSelectAnswer(false)}
              className={`p-5 rounded-2xl border-2 font-black text-sm sm:text-base transition-all flex items-center justify-center gap-3 cursor-pointer ${
                showResultForCurrent
                  ? !currentQuiz.isScam
                    ? "bg-emerald-50 border-emerald-500 text-emerald-900 ring-2 ring-emerald-500/30 shadow-md"
                    : "bg-slate-50 border-slate-200 text-slate-400 opacity-50"
                  : "bg-emerald-50/50 hover:bg-emerald-100/80 border-emerald-300 hover:border-emerald-500 text-emerald-900 shadow-xs active:scale-98"
              }`}
            >
              <CheckCircle2 className="w-5 h-5 text-emerald-600" />
              <span>✅ AN TOÀN / BÌNH THƯỜNG</span>
            </button>
          </div>

          {/* Explanation Box */}
          {showResultForCurrent && (
            <div className="p-6 rounded-2xl bg-slate-50 border border-slate-200 space-y-4 animate-in fade-in duration-200">
              <div className="flex items-center gap-2">
                {userAnswers[currentQuiz.id] === currentQuiz.isScam ? (
                  <span className="flex items-center gap-1.5 text-emerald-700 font-black text-base">
                    <CheckCircle2 className="w-5 h-5 text-emerald-600" /> CHÍNH XÁC!
                  </span>
                ) : (
                  <span className="flex items-center gap-1.5 text-amber-700 font-black text-base">
                    <AlertTriangle className="w-5 h-5 text-amber-600" /> CẦN CHÚ Ý THÊM!
                  </span>
                )}
                <span className="text-xs text-slate-600 font-medium">
                  (Đáp án: <strong>{currentQuiz.correctAnswerText}</strong>)
                </span>
              </div>

              <p className="text-slate-800 text-sm leading-relaxed font-medium">
                {currentQuiz.explanation}
              </p>

              {/* Golden Rule Highlight */}
              <div className="p-4 rounded-xl bg-amber-50 border border-amber-200 text-amber-950 text-xs font-bold flex items-center gap-2.5">
                <Sparkles className="w-4 h-4 text-amber-600 shrink-0" />
                <span>{currentQuiz.goldenRule}</span>
              </div>

              <div className="pt-2 flex justify-end">
                {currentIndex < PRACTICE_QUIZZES.length - 1 ? (
                  <button
                    onClick={handleNext}
                    className="px-6 py-3 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white font-bold text-sm flex items-center gap-2 shadow-md cursor-pointer transition-all"
                  >
                    <span>Sang câu tiếp theo</span>
                    <ArrowRight className="w-4 h-4" />
                  </button>
                ) : (
                  <button
                    onClick={() => setShowResultForCurrent(true)}
                    className="px-6 py-3 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white font-bold text-sm flex items-center gap-2 shadow-md cursor-pointer transition-all"
                  >
                    <span>Xem tổng kết điểm số</span>
                    <Award className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>
          )}
        </div>
      ) : (
        /* Summary Score View */
        <div className="p-8 sm:p-10 rounded-3xl bg-white border border-slate-200 shadow-xl text-center space-y-6 animate-in zoom-in-95 duration-300">
          <div className="w-20 h-20 rounded-3xl bg-amber-50 border border-amber-200 text-amber-600 mx-auto flex items-center justify-center shadow-sm">
            <Award className="w-10 h-10" />
          </div>

          <div>
            <h3 className="font-black text-slate-900 text-2xl sm:text-3xl">
              Hoàn Thành Bài Tập Nhận Diện!
            </h3>
            <p className="text-slate-600 text-sm mt-1.5 font-medium">
              Bạn đã trả lời đúng <strong className="text-amber-700 text-xl font-black">{score}</strong> / {PRACTICE_QUIZZES.length} tình huống thực tế.
            </p>
          </div>

          <div className="p-5 rounded-2xl bg-slate-50 border border-slate-200 text-left space-y-2.5 max-w-xl mx-auto shadow-inner">
            <h4 className="font-black text-emerald-800 text-sm flex items-center gap-2">
              <ShieldCheck className="w-5 h-5 text-emerald-600" /> 3 NGUYÊN TẮC VÀNG BẢO VỆ GIA ĐÌNH BẠN:
            </h4>
            <ul className="space-y-2 text-xs sm:text-sm text-slate-700 font-medium list-disc list-inside">
              <li><strong>KHÔNG TIN</strong>: Bất kỳ ai gọi điện/nhắn tin tự xưng công an, ngân hàng, bác sĩ đòi tiền gấp.</li>
              <li><strong>KHÔNG CUNG CẤP</strong>: Mã OTP, mật khẩu, thông tin thẻ tín dụng cho bất kỳ ai.</li>
              <li><strong>KHÔNG BẤM LINK LẠ</strong>: Mọi liên kết gửi qua SMS/Zalo đều có nguy cơ chứa mã độc chiếm máy.</li>
            </ul>
          </div>

          <div className="flex items-center justify-center gap-3 flex-wrap">
            <button
              onClick={handleRestart}
              className="px-5 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-sm font-bold flex items-center gap-2 cursor-pointer transition-colors"
            >
              <RotateCcw className="w-4 h-4" />
              <span>Luyện tập lại</span>
            </button>
            <button
              onClick={onBackToCheck}
              className="px-6 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-bold flex items-center gap-2 cursor-pointer shadow-md transition-colors"
            >
              <span>Về màn hình kiểm tra</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
