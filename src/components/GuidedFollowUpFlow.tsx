import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  ShieldAlert,
  ShieldCheck,
  AlertTriangle,
  Volume2,
  VolumeX,
  ArrowRight,
  ArrowLeft,
  Check,
  PhoneCall,
  Sparkles,
  SkipForward,
  CreditCard,
  KeyRound,
  Smartphone,
  Gift,
  Building2,
  TrendingUp,
  HelpCircle,
  Loader2,
  RotateCcw,
  Info,
} from "lucide-react";
import { AnalysisResponse, FollowUpQuestion } from "../types";

export interface GuidedAnswer {
  questionId: string;
  question: string;
  answer: string;
}

interface GuidedFollowUpFlowProps {
  initialResult: AnalysisResponse;
  originalInputText?: string;
  isLargeFont: boolean;
  onComplete: (answers: GuidedAnswer[], extraNote: string) => Promise<void> | void;
  onOpenHotline: () => void;
  onCancel: () => void;
  isReanalyzing?: boolean;
}

export const GuidedFollowUpFlow: React.FC<GuidedFollowUpFlowProps> = ({
  initialResult,
  originalInputText = "",
  isLargeFont,
  onComplete,
  onOpenHotline,
  onCancel,
  isReanalyzing = false,
}) => {
  // Step index: 0 is mandatory emergency check, 1+ are branching/AI questions
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [direction, setDirection] = useState<number>(1);
  const [isPlayingAudio, setIsPlayingAudio] = useState(false);

  // Store answers by question key
  const [step1Selected, setStep1Selected] = useState<string[]>([]);
  const [branchAnswers, setBranchAnswers] = useState<Record<string, string>>({});
  const [extraNote, setExtraNote] = useState("");

  // Clean up audio on unmount
  useEffect(() => {
    return () => {
      if (window.speechSynthesis) {
        window.speechSynthesis.cancel();
      }
    };
  }, []);

  // Stop speech when step changes
  useEffect(() => {
    if (window.speechSynthesis) {
      window.speechSynthesis.cancel();
      setIsPlayingAudio(false);
    }
  }, [currentStepIndex]);

  // Build the list of conversational questions
  // 1. Mandatory Question 1: Have you performed any dangerous action?
  // 2. Branching question: If money/transfer involved or reason unclear -> "Đối phương nói bạn cần chuyển tiền vì lý do gì?"
  // 3. Additional specific questions from initialResult.cau_hoi_bo_sung (deduplicated against original text)
  const inputLower = originalInputText.toLowerCase();

  const generatedQuestions: Array<{
    id: string;
    question: string;
    description?: string;
    isMulti?: boolean;
    options: Array<{ label: string; icon?: React.ElementType; isDangerTrigger?: boolean }>;
    isOptional?: boolean;
  }> = [
    // Step 0: MANDATORY EMERGENCY ACTION CHECK
    {
      id: "q_emergency_actions",
      question: "Bạn đã thực hiện việc nào dưới đây chưa?",
      description: "Hãy chọn tất cả những gì bạn đã lỡ làm (hoặc chọn 'Chưa làm gì'):",
      isMulti: true,
      options: [
        {
          label: "Chưa làm gì",
          icon: ShieldCheck,
        },
        {
          label: "Đã chuyển tiền",
          icon: CreditCard,
          isDangerTrigger: true,
        },
        {
          label: "Đã cung cấp OTP, mật khẩu hoặc thông tin thẻ",
          icon: KeyRound,
          isDangerTrigger: true,
        },
        {
          label: "Đã mở đường link hoặc cài ứng dụng",
          icon: Smartphone,
          isDangerTrigger: true,
        },
        {
          label: "Tôi không chắc",
          icon: HelpCircle,
        },
      ],
    },
  ];

  // Check if we should add the "Lý do chuyển tiền / đòi tiền" branching question
  const hasMoneyInInput =
    inputLower.includes("tiền") ||
    inputLower.includes("chuyển khoản") ||
    inputLower.includes("nộp") ||
    inputLower.includes("phí") ||
    inputLower.includes("quà");

  if (hasMoneyInInput || (!inputLower.includes("chuyển 10 triệu để nhận quà") && !inputLower.includes("văn bản"))) {
    generatedQuestions.push({
      id: "q_reason_money",
      question: "Đối phương nói bạn cần chuyển tiền vì lý do gì?",
      description: "Chọn lý do gần nhất với tình huống của bạn:",
      isMulti: false,
      options: [
        { label: "Nhận quà hoặc giải thưởng", icon: Gift, isDangerTrigger: true },
        { label: "Đóng phí hoặc thuế", icon: Building2, isDangerTrigger: true },
        { label: "Công an, tòa án hoặc ngân hàng yêu cầu", icon: ShieldAlert, isDangerTrigger: true },
        { label: "Đầu tư kiếm lợi nhuận", icon: TrendingUp, isDangerTrigger: true },
        { label: "Lý do khác", icon: Info },
        { label: "Tôi không nhớ", icon: HelpCircle },
      ],
    });
  }

  // Append any specific AI questions that don't repeat what was already asked or stated
  if (initialResult.cau_hoi_bo_sung && initialResult.cau_hoi_bo_sung.length > 0) {
    initialResult.cau_hoi_bo_sung.forEach((aiQ, idx) => {
      // Avoid adding more than 3 questions in total to keep it friendly and short
      if (generatedQuestions.length >= 3) return;

      const aiQLower = aiQ.cau_hoi.toLowerCase();
      // Skip if question asks about money transfer when we already have that in step 1 or 2
      if (
        (aiQLower.includes("chuyển tiền") || aiQLower.includes("nộp tiền")) &&
        generatedQuestions.some((g) => g.id === "q_reason_money")
      ) {
        return;
      }

      generatedQuestions.push({
        id: aiQ.id || `ai_q_${idx}`,
        question: aiQ.cau_hoi,
        isMulti: false,
        isOptional: true,
        options: (aiQ.cac_lua_chon && aiQ.cac_lua_chon.length > 0
          ? aiQ.cac_lua_chon
          : ["Có", "Không", "Tôi không nhớ"]
        ).map((opt) => ({
          label: opt,
          icon: opt === "Có" ? AlertTriangle : opt === "Không" ? ShieldCheck : HelpCircle,
        })),
      });
    });
  }

  const totalSteps = generatedQuestions.length;
  const currentQ = generatedQuestions[currentStepIndex];

  // Friendly progress text
  const getFriendlyProgress = () => {
    const remaining = totalSteps - 1 - currentStepIndex;
    if (remaining === 0) return "Câu hỏi cuối cùng";
    if (remaining === 1) return "Còn 1 câu ngắn";
    return `Còn ${remaining} câu ngắn`;
  };

  // TTS Read current question out loud
  const handleToggleAudio = () => {
    if (!window.speechSynthesis) {
      alert("Trình duyệt này chưa hỗ trợ đọc to giọng nói.");
      return;
    }

    if (isPlayingAudio) {
      window.speechSynthesis.cancel();
      setIsPlayingAudio(false);
    } else {
      const optionsText = currentQ.options.map((o) => o.label).join(". Hoặc: ");
      const textToRead = `${currentQ.question}. Các lựa chọn là: ${optionsText}`;
      const utterance = new SpeechSynthesisUtterance(textToRead);
      utterance.lang = "vi-VN";
      utterance.rate = 0.92;

      utterance.onend = () => setIsPlayingAudio(false);
      utterance.onerror = () => setIsPlayingAudio(false);

      window.speechSynthesis.speak(utterance);
      setIsPlayingAudio(true);
    }
  };

  // Handle Step 1 Multi-select
  const handleToggleStep1Option = (label: string) => {
    if (label === "Chưa làm gì") {
      setStep1Selected(["Chưa làm gì"]);
      return;
    }
    if (label === "Tôi không chắc") {
      setStep1Selected(["Tôi không chắc"]);
      return;
    }

    setStep1Selected((prev) => {
      const filtered = prev.filter((item) => item !== "Chưa làm gì" && item !== "Tôi không chắc");
      if (filtered.includes(label)) {
        return filtered.filter((item) => item !== label);
      } else {
        return [...filtered, label];
      }
    });
  };

  // Handle Single Select for Branch Questions
  const handleSelectBranchOption = (qId: string, label: string) => {
    setBranchAnswers((prev) => ({
      ...prev,
      [qId]: label,
    }));
  };

  // Check if current question has an answer
  const isCurrentStepAnswered = () => {
    if (currentStepIndex === 0) {
      return step1Selected.length > 0;
    }
    const ans = branchAnswers[currentQ.id];
    return Boolean(ans && ans.trim().length > 0);
  };

  // Navigation handlers
  const handleNext = () => {
    if (currentStepIndex < totalSteps - 1) {
      setDirection(1);
      setCurrentStepIndex((prev) => prev + 1);
    } else {
      handleSubmitAll();
    }
  };

  const handleBack = () => {
    if (currentStepIndex > 0) {
      setDirection(-1);
      setCurrentStepIndex((prev) => prev - 1);
    } else {
      onCancel();
    }
  };

  const handleSkip = () => {
    if (currentStepIndex < totalSteps - 1) {
      setDirection(1);
      setCurrentStepIndex((prev) => prev + 1);
    } else {
      handleSubmitAll();
    }
  };

  // Submit all accumulated answers
  const handleSubmitAll = () => {
    const formatted: GuidedAnswer[] = [];

    // Step 0 answer
    if (step1Selected.length > 0) {
      formatted.push({
        questionId: "q_emergency_actions",
        question: "Bạn đã thực hiện việc nào dưới đây chưa?",
        answer: step1Selected.join(", "),
      });
    }

    // Branching answers
    generatedQuestions.slice(1).forEach((q) => {
      const val = branchAnswers[q.id];
      if (val) {
        formatted.push({
          questionId: q.id,
          question: q.question,
          answer: val,
        });
      }
    });

    onComplete(formatted, extraNote);
  };

  // Instant Emergency Alerts detection for Step 0
  const hasTransferredMoney = step1Selected.includes("Đã chuyển tiền");
  const hasSharedOtp = step1Selected.includes("Đã cung cấp OTP, mật khẩu hoặc thông tin thẻ");
  const hasClickedLinkOrApp = step1Selected.includes("Đã mở đường link hoặc cài ứng dụng");

  // Animation variants
  const slideVariants = {
    enter: (direction: number) => ({
      x: direction > 0 ? 30 : -30,
      opacity: 0,
    }),
    center: {
      x: 0,
      opacity: 1,
      transition: { duration: 0.28, ease: "easeOut" },
    },
    exit: (direction: number) => ({
      x: direction > 0 ? -30 : 30,
      opacity: 0,
      transition: { duration: 0.2, ease: "easeIn" },
    }),
  };

  return (
    <section
      className="py-6 sm:py-8 px-4 max-w-4xl mx-auto space-y-6 animate-in fade-in duration-300"
      aria-label="Luồng hội thoại hỗ trợ xác minh rủi ro"
    >
      {/* Empathetic Reassurance Header Card */}
      <div className="p-6 sm:p-7 rounded-3xl bg-gradient-to-r from-emerald-900 via-teal-900 to-slate-900 text-white shadow-xl space-y-3 relative overflow-hidden">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div className="space-y-1">
            <span className="px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-xs font-black uppercase tracking-wider flex items-center gap-1.5 w-fit">
              <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
              Đang đồng hành cùng bạn
            </span>
            <h2 className={`font-black text-white ${isLargeFont ? "text-2xl sm:text-3xl" : "text-xl sm:text-2xl"}`}>
              Mình hỏi thêm vài điều để bảo vệ bạn tốt hơn
            </h2>
          </div>

          {/* Voice Read Button */}
          <button
            id="btn-voice-read-guided-question"
            onClick={handleToggleAudio}
            aria-label="Đọc to câu hỏi cho tôi nghe"
            className={`px-3.5 py-2 rounded-xl text-xs sm:text-sm font-bold flex items-center gap-2 transition-all border cursor-pointer ${
              isPlayingAudio
                ? "bg-emerald-500 text-slate-900 border-emerald-400 shadow-md animate-pulse"
                : "bg-white/10 hover:bg-white/20 text-white border-white/20"
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
                <span>Đọc to câu này 🔊</span>
              </>
            )}
          </button>
        </div>

        {/* Reassurance text shown before and alongside questions */}
        <p className={`text-emerald-100 font-medium leading-relaxed ${isLargeFont ? "text-base sm:text-lg" : "text-xs sm:text-sm"}`}>
          Bạn đã làm đúng khi dừng lại để kiểm tra. Trong lúc xác minh, đừng chuyển tiền, cung cấp OTP hoặc mở liên kết lạ. Mình chỉ hỏi thêm vài câu ngắn.
        </p>
      </div>

      {/* Main Guided Question Card */}
      <div className="bg-white rounded-3xl border-2 border-slate-200 shadow-lg p-6 sm:p-8 space-y-6 relative overflow-hidden">
        {/* Friendly Progress Indicator Bar */}
        <div className="flex items-center justify-between gap-4 border-b border-slate-100 pb-4">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1.5">
              {generatedQuestions.map((_, idx) => (
                <div
                  key={idx}
                  className={`h-2 rounded-full transition-all duration-300 ${
                    idx === currentStepIndex
                      ? "w-8 bg-emerald-600"
                      : idx < currentStepIndex
                      ? "w-4 bg-emerald-300"
                      : "w-4 bg-slate-200"
                  }`}
                  aria-hidden="true"
                />
              ))}
            </div>
            <span
              className="text-xs sm:text-sm font-extrabold text-slate-700"
              aria-live="polite"
            >
              {getFriendlyProgress()}
            </span>
          </div>

          <button
            onClick={onCancel}
            className="text-xs font-bold text-slate-500 hover:text-slate-800 transition-colors cursor-pointer flex items-center gap-1"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Thoát</span>
          </button>
        </div>

        {/* Dynamic Animated Question Screen */}
        <AnimatePresence mode="wait" custom={direction}>
          <motion.div
            key={currentStepIndex}
            custom={direction}
            variants={slideVariants}
            initial="enter"
            animate="center"
            exit="exit"
            className="space-y-6"
          >
            {/* Question Text */}
            <div className="space-y-1.5">
              <h3
                className={`font-black text-slate-900 leading-snug ${
                  isLargeFont ? "text-2xl sm:text-3xl" : "text-xl sm:text-2xl"
                }`}
                tabIndex={0}
              >
                {currentQ.question}
              </h3>
              {currentQ.description && (
                <p className="text-xs sm:text-sm text-slate-600 font-medium">
                  {currentQ.description}
                </p>
              )}
            </div>

            {/* Step 0: Options for Emergency Check */}
            {currentStepIndex === 0 ? (
              <div
                className="grid grid-cols-1 gap-3 sm:gap-3.5 pt-1"
                role="group"
                aria-label="Danh sách các hành động bạn đã làm"
              >
                {currentQ.options.map((opt) => {
                  const isSelected = step1Selected.includes(opt.label);
                  const Icon = opt.icon || HelpCircle;

                  return (
                    <button
                      key={opt.label}
                      type="button"
                      onClick={() => handleToggleStep1Option(opt.label)}
                      aria-pressed={isSelected}
                      className={`w-full min-h-[56px] p-4 sm:p-5 rounded-2xl border-2 text-left font-bold transition-all duration-200 cursor-pointer flex items-center justify-between gap-4 select-none ${
                        isSelected
                          ? opt.label === "Chưa làm gì"
                            ? "bg-emerald-50 border-emerald-600 text-emerald-950 shadow-md ring-2 ring-emerald-500/20"
                            : opt.isDangerTrigger
                            ? "bg-rose-50 border-rose-600 text-rose-950 shadow-md ring-2 ring-rose-500/20"
                            : "bg-slate-100 border-slate-600 text-slate-900 shadow-md ring-2 ring-slate-400/20"
                          : "bg-slate-50/70 hover:bg-slate-100 border-slate-200 text-slate-800 hover:border-slate-300"
                      } ${isLargeFont ? "text-xl" : "text-base sm:text-lg"}`}
                    >
                      <div className="flex items-center gap-3.5">
                        <div
                          className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 border ${
                            isSelected
                              ? opt.label === "Chưa làm gì"
                                ? "bg-emerald-600 text-white border-emerald-600"
                                : opt.isDangerTrigger
                                ? "bg-rose-600 text-white border-rose-600"
                                : "bg-slate-700 text-white border-slate-700"
                              : "bg-white text-slate-600 border-slate-200"
                          }`}
                        >
                          <Icon className="w-5 h-5" />
                        </div>
                        <span className="leading-snug">{opt.label}</span>
                      </div>

                      <div
                        className={`w-6 h-6 rounded-lg border-2 flex items-center justify-center shrink-0 transition-colors ${
                          isSelected
                            ? opt.label === "Chưa làm gì"
                              ? "bg-emerald-600 border-emerald-600 text-white"
                              : opt.isDangerTrigger
                              ? "bg-rose-600 border-rose-600 text-white"
                              : "bg-slate-700 border-slate-700 text-white"
                            : "border-slate-300 bg-white"
                        }`}
                      >
                        {isSelected && <Check className="w-4 h-4 stroke-[3]" />}
                      </div>
                    </button>
                  );
                })}
              </div>
            ) : (
              /* Step 1+: Branching single-choice options */
              <div
                className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-3.5 pt-1"
                role="radiogroup"
                aria-label={currentQ.question}
              >
                {currentQ.options.map((opt) => {
                  const isSelected = branchAnswers[currentQ.id] === opt.label;
                  const Icon = opt.icon || HelpCircle;

                  return (
                    <button
                      key={opt.label}
                      type="button"
                      role="radio"
                      aria-checked={isSelected}
                      onClick={() => handleSelectBranchOption(currentQ.id, opt.label)}
                      className={`w-full min-h-[56px] p-4 sm:p-5 rounded-2xl border-2 text-left font-bold transition-all duration-200 cursor-pointer flex items-center justify-between gap-3.5 select-none ${
                        isSelected
                          ? "bg-emerald-50 border-emerald-600 text-emerald-950 shadow-md ring-2 ring-emerald-500/20"
                          : "bg-slate-50/70 hover:bg-slate-100 border-slate-200 text-slate-800 hover:border-slate-300"
                      } ${isLargeFont ? "text-xl" : "text-base sm:text-lg"}`}
                    >
                      <div className="flex items-center gap-3">
                        <div
                          className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 border ${
                            isSelected
                              ? "bg-emerald-600 text-white border-emerald-600"
                              : "bg-white text-slate-600 border-slate-200"
                          }`}
                        >
                          <Icon className="w-5 h-5" />
                        </div>
                        <span className="leading-snug">{opt.label}</span>
                      </div>

                      <div
                        className={`w-6 h-6 rounded-full border-2 flex items-center justify-center shrink-0 transition-colors ${
                          isSelected
                            ? "bg-emerald-600 border-emerald-600 text-white"
                            : "border-slate-300 bg-white"
                        }`}
                      >
                        {isSelected && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                      </div>
                    </button>
                  );
                })}
              </div>
            )}

            {/* REAL-TIME EMERGENCY ALERTS FOR STEP 0 (Instant, no waiting for AI) */}
            {currentStepIndex === 0 && (
              <div className="space-y-3 pt-2" aria-live="assertive">
                {/* 1. Đã chuyển tiền */}
                {hasTransferredMoney && (
                  <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="p-5 rounded-2xl bg-rose-50 border-2 border-rose-400 text-rose-950 space-y-3 shadow-md"
                  >
                    <div className="flex items-start gap-3">
                      <ShieldAlert className="w-6 h-6 text-rose-600 shrink-0 mt-0.5" />
                      <div className="space-y-1">
                        <strong className="block text-rose-900 font-extrabold text-sm sm:text-base">
                          HƯỚNG DẪN KHẨN CẤP: BẠN ĐÃ CHUYỂN TIỀN
                        </strong>
                        <p className={`font-semibold text-rose-950 leading-relaxed ${isLargeFont ? "text-base" : "text-xs sm:text-sm"}`}>
                          Hãy liên hệ ngay với ngân hàng qua số điện thoại chính thức để yêu cầu hỗ trợ khóa hoặc thu hồi giao dịch. Không chuyển thêm tiền cho đối phương.
                        </p>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={onOpenHotline}
                      className="px-4 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs sm:text-sm font-bold flex items-center gap-2 shadow-sm cursor-pointer transition-colors"
                    >
                      <PhoneCall className="w-4 h-4" />
                      <span>Xem danh bạ hotline ngân hàng & Tổng đài 156</span>
                    </button>
                  </motion.div>
                )}

                {/* 2. Đã cung cấp OTP/mật khẩu */}
                {hasSharedOtp && (
                  <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="p-5 rounded-2xl bg-amber-50 border-2 border-amber-400 text-amber-950 space-y-2 shadow-md"
                  >
                    <div className="flex items-start gap-3">
                      <KeyRound className="w-6 h-6 text-amber-600 shrink-0 mt-0.5" />
                      <div className="space-y-1">
                        <strong className="block text-amber-900 font-extrabold text-sm sm:text-base">
                          HƯỚNG DẪN KHẨN CẤP: ĐÃ CUNG CẤP OTP / MẬT KHẨU
                        </strong>
                        <p className={`font-semibold text-amber-950 leading-relaxed ${isLargeFont ? "text-base" : "text-xs sm:text-sm"}`}>
                          Hãy khóa tài khoản hoặc thẻ ngay qua ứng dụng hay tổng đài chính thức của ngân hàng. Đổi mật khẩu từ một thiết bị an toàn.
                        </p>
                      </div>
                    </div>
                  </motion.div>
                )}

                {/* 3. Đã bấm link hoặc cài app lạ */}
                {hasClickedLinkOrApp && (
                  <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="p-5 rounded-2xl bg-indigo-50 border-2 border-indigo-400 text-indigo-950 space-y-2 shadow-md"
                  >
                    <div className="flex items-start gap-3">
                      <Smartphone className="w-6 h-6 text-indigo-600 shrink-0 mt-0.5" />
                      <div className="space-y-1">
                        <strong className="block text-indigo-900 font-extrabold text-sm sm:text-base">
                          HƯỚNG DẪN KHẨN CẤP: ĐÃ MỞ LINK HOẶC CÀI ỨNG DỤNG LẠ
                        </strong>
                        <p className={`font-semibold text-indigo-950 leading-relaxed ${isLargeFont ? "text-base" : "text-xs sm:text-sm"}`}>
                          Ngắt kết nối mạng nếu thiết bị có dấu hiệu bất thường. Không đăng nhập ngân hàng trên thiết bị đó và nhờ người tin cậy hỗ trợ kiểm tra.
                        </p>
                      </div>
                    </div>
                  </motion.div>
                )}
              </div>
            )}

            {/* Optional extra note on the last question step */}
            {currentStepIndex === totalSteps - 1 && (
              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-1.5">
                <label className="font-bold text-xs sm:text-sm text-slate-800 flex items-center gap-1.5">
                  <span>Bạn muốn bổ sung thêm lời kể nào khác không? (Không bắt buộc)</span>
                </label>
                <textarea
                  value={extraNote}
                  onChange={(e) => setExtraNote(e.target.value)}
                  placeholder="Ví dụ: Đối phương bảo tôi không được nói cho người nhà, hứa hoàn tiền trong 30 phút..."
                  rows={2}
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-300 bg-white focus:border-emerald-600 focus:outline-none text-xs sm:text-sm text-slate-900 resize-none"
                />
              </div>
            )}
          </motion.div>
        </AnimatePresence>

        {/* Bottom Navigation Buttons */}
        <div className="flex items-center justify-between gap-3 pt-4 border-t border-slate-100 flex-wrap">
          <div className="flex items-center gap-2">
            {currentStepIndex > 0 && (
              <button
                type="button"
                onClick={handleBack}
                className="px-4 sm:px-5 py-3 rounded-2xl bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold text-xs sm:text-sm flex items-center gap-2 transition-colors cursor-pointer"
              >
                <ArrowLeft className="w-4 h-4" />
                <span>Câu trước</span>
              </button>
            )}

            {/* Skip Button for optional steps */}
            {currentQ.isOptional && (
              <button
                type="button"
                onClick={handleSkip}
                className="px-4 py-3 rounded-2xl text-slate-500 hover:text-slate-800 hover:bg-slate-100 font-bold text-xs sm:text-sm flex items-center gap-1.5 transition-colors cursor-pointer"
              >
                <SkipForward className="w-4 h-4" />
                <span>Bỏ qua câu này</span>
              </button>
            )}
          </div>

          {/* Primary Action Button */}
          <button
            id="btn-next-guided-question"
            type="button"
            disabled={!isCurrentStepAnswered() || isReanalyzing}
            onClick={handleNext}
            className={`px-6 sm:px-8 py-3.5 rounded-2xl font-black text-sm sm:text-base text-white flex items-center gap-2.5 shadow-lg transition-all cursor-pointer ${
              !isCurrentStepAnswered() || isReanalyzing
                ? "bg-slate-300 text-slate-500 cursor-not-allowed shadow-none"
                : "bg-emerald-600 hover:bg-emerald-700 active:scale-98 shadow-emerald-600/25"
            }`}
          >
            {isReanalyzing ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                <span>Đang hoàn tất phân tích...</span>
              </>
            ) : currentStepIndex < totalSteps - 1 ? (
              <>
                <span>Tiếp tục</span>
                <ArrowRight className="w-5 h-5" />
              </>
            ) : (
              <>
                <Check className="w-5 h-5" />
                <span>Hoàn tất & Xem kết quả an toàn</span>
              </>
            )}
          </button>
        </div>
      </div>
    </section>
  );
};
