import React, { useState } from "react";
import { Header } from "./components/Header";
import { HeroInput } from "./components/HeroInput";
import { AnalysisResult } from "./components/AnalysisResult";
import { GuidedFollowUpFlow, GuidedAnswer } from "./components/GuidedFollowUpFlow";
import { PracticeMode } from "./components/PracticeMode";
import { IndicatorLookupResultCard } from "./components/IndicatorLookupResultCard";
import { DemoScenariosModal } from "./components/DemoScenariosModal";
import { CalmBreathingModal } from "./components/CalmBreathingModal";
import { EmergencyGuideModal } from "./components/EmergencyGuideModal";
import { ArchitectureModal } from "./components/ArchitectureModal";
import { PrivacyPolicyModal } from "./components/PrivacyPolicyModal";
import { AnalysisResponse, DemoScenario, InputMode, TraceCheckResult, IndicatorCheckResult } from "./types";
import { runTechnicalAnalysis, mergeRuleRiskWithAiResult } from "./utils/technicalAnalysis";
import { performTraceCheck } from "./utils/reputationService";
import { checkIndicator, enrichIndicatorWithGrounding } from "./utils/indicatorLookup";
import { maxRisk, mapCanonicalToLegacyVietnamese } from "./utils/riskConfig";
import { AlertTriangle, ShieldCheck, Lock, RotateCcw } from "lucide-react";

interface InitialInputState {
  type: InputMode;
  text?: string;
  linkUrl?: string;
  imageBase64?: string;
  imageMimeType?: string;
  audioBase64?: string;
  audioMimeType?: string;
}

export default function App() {
  const [isLargeFont, setIsLargeFont] = useState(false);
  const [activeTab, setActiveTab] = useState<"check" | "practice">("check");
  const [analysisResult, setAnalysisResult] = useState<AnalysisResponse | null>(null);
  const [traceResult, setTraceResult] = useState<TraceCheckResult | null>(null);
  const [indicatorResult, setIndicatorResult] = useState<IndicatorCheckResult | null>(null);
  const [isSearchingGrounding, setIsSearchingGrounding] = useState(false);
  const [isTraceLoading, setIsTraceLoading] = useState(false);
  const [initialInput, setInitialInput] = useState<InitialInputState | null>(null);
  const [showGuidedFlow, setShowGuidedFlow] = useState(false);
  const [accumulatedQA, setAccumulatedQA] = useState<
    Array<{ question: string; answer: string; round?: number }>
  >([]);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isReanalyzing, setIsReanalyzing] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Modals state
  const [isHotlineOpen, setIsHotlineOpen] = useState(false);
  const [isBreathingOpen, setIsBreathingOpen] = useState(false);
  const [isArchitectureOpen, setIsArchitectureOpen] = useState(false);
  const [isPrivacyOpen, setIsPrivacyOpen] = useState(false);
  const [isDemoModalOpen, setIsDemoModalOpen] = useState(false);

  // Call Parallel Analysis: Main Task (/api/analyze) + Secondary Task ("Kiểm tra dấu vết")
  const handleAnalyze = async (data: InitialInputState) => {
    setIsAnalyzing(true);
    setErrorMessage(null);
    setInitialInput(data);
    setAccumulatedQA([]);
    setTraceResult(null);
    setIsTraceLoading(true);

    // GIAI ĐOẠN 1: Quét tức thì dấu hiệu nguy hiểm bằng bộ quy tắc (chạy ngay trong < 2ms)
    try {
      const localTech = runTechnicalAnalysis({
        text: data.text || "",
        linkUrl: data.linkUrl || "",
      });

      // Nếu phát hiện dấu hiệu nguy hiểm (HIGH hoặc CRITICAL), hiển thị cảnh báo tức thì ngay lập tức
      if (
        localTech.scoring.canonicalRiskLevel === "HIGH" ||
        localTech.scoring.canonicalRiskLevel === "CRITICAL"
      ) {
        const instantPreScan = mergeRuleRiskWithAiResult(localTech, {});
        setAnalysisResult({
          ...instantPreScan,
          isPreliminary: true,
        });
      }
    } catch (e) {
      console.warn("Client pre-scan exception:", e);
    }

    // GIAI ĐOẠN 2: Khởi động song song 2 tác vụ độc lập:
    // Tác vụ Chính: Phân tích nội dung, quy tắc và ngữ cảnh (/api/analyze)
    // Tác vụ Phụ: "Kiểm tra dấu vết" trích xuất SĐT, mã quốc gia, tên miền thật & dữ liệu báo cáo (/api/trace-check)
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 20000); // 20s max timeout

    // Tác vụ 1 (Chính)
    const mainTaskPromise = (async () => {
      const response = await fetch("/api/analyze", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          ...data,
          so_luot_da_hoi: 0,
        }),
        signal: controller.signal,
      });

      if (!response.ok) {
        if (response.status === 429) {
          throw new Error("Bạn đã thực hiện quá nhiều yêu cầu trong thời gian ngắn. Vui lòng chờ 1 phút trước khi thử lại.");
        }
        throw new Error(`Máy chủ phản hồi mã lỗi ${response.status}`);
      }

      const resultData: AnalysisResponse = await response.json();
      return resultData;
    })().then((resultData) => {
      // HIỂN THỊ KẾT QUẢ CHÍNH NGAY KHI HOÀN THÀNH, KHÔNG CHỜ TÁC VỤ PHỤ
      setAnalysisResult((prev) => {
        const currentReputationRisk = traceResult?.reputationRisk || "SAFE";
        // finalRiskLevel = max(ruleBasedRisk, reputationRisk, geminiRisk)
        const finalLevel = maxRisk(resultData.finalRiskLevel, currentReputationRisk);
        return {
          ...resultData,
          finalRiskLevel: finalLevel,
          muc_rui_ro: mapCanonicalToLegacyVietnamese(finalLevel),
          reputationRiskLevel: currentReputationRisk,
          traceCheckResult: traceResult || undefined,
          isPreliminary: false,
        };
      });
      setIsAnalyzing(false);

      const isSevere =
        resultData.finalRiskLevel === "CRITICAL" ||
        resultData.finalRiskLevel === "HIGH" ||
        resultData.muc_rui_ro === "Rủi ro cao" ||
        resultData.muc_rui_ro === "Rủi ro rất cao";

      if (
        (resultData.co_can_hoi_them || resultData.needsMoreInformation) &&
        !isSevere
      ) {
        setShowGuidedFlow(true);
      } else {
        setShowGuidedFlow(false);
      }

      return resultData;
    });

    // Tác vụ 2 (Phụ): "Kiểm tra dấu vết" chạy song song, trả kết quả độc lập
    const traceTaskPromise = (async () => {
      try {
        const res = await fetch("/api/trace-check", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ text: data.text || "", linkUrl: data.linkUrl || "" }),
        });
        if (res.ok) {
          return (await res.json()) as TraceCheckResult;
        }
      } catch (err) {
        console.warn("Trace check fetch error, running local fallback:", err);
      }
      return await performTraceCheck({ text: data.text || "", linkUrl: data.linkUrl || "" });
    })()
      .then((traceData) => {
        setTraceResult(traceData);
        setIsTraceLoading(false);

        // NGUYÊN TẮC: Mức cuối cùng = max(ruleBasedRisk, reputationRisk, geminiRisk)
        // Tác vụ phụ chỉ được tăng mức cảnh báo, không được hạ mức do tác vụ chính xác định
        setAnalysisResult((prev) => {
          if (!prev) return prev;
          const upgradedLevel = maxRisk(prev.finalRiskLevel, traceData.reputationRisk);
          return {
            ...prev,
            finalRiskLevel: upgradedLevel,
            reputationRiskLevel: traceData.reputationRisk,
            traceCheckResult: traceData,
            muc_rui_ro: mapCanonicalToLegacyVietnamese(upgradedLevel),
          };
        });
        return traceData;
      })
      .catch((err) => {
        console.warn("Trace task failed silently without affecting main task:", err);
        setIsTraceLoading(false);
        return null;
      });

    try {
      // Quản lý đồng thời bằng Promise.allSettled
      const [mainSettled] = await Promise.allSettled([mainTaskPromise, traceTaskPromise]);
      clearTimeout(timeoutId);

      if (mainSettled.status === "rejected") {
        throw mainSettled.reason;
      }
    } catch (err: any) {
      clearTimeout(timeoutId);
      console.error("Analysis error:", err);
      if (err.name === "AbortError") {
        setErrorMessage("Quá trình phân tích mất nhiều thời gian hơn dự kiến. Vui lòng thử lại hoặc chọn một tình huống mẫu.");
      } else {
        setErrorMessage(
          err.message || "Không thể kết nối đến máy chủ phân tích. Vui lòng thử lại hoặc chọn tình huống mẫu để kiểm tra."
        );
      }
    } finally {
      setIsAnalyzing(false);
      setIsTraceLoading(false);
    }
  };

  // Handle guided follow-up response submission and re-analysis
  const handleCompleteGuidedFlow = async (
    newAnswers: GuidedAnswer[],
    extraNote: string
  ) => {
    if (!initialInput || !analysisResult) return;

    setIsReanalyzing(true);
    setErrorMessage(null);

    const currentTurn = (analysisResult.so_luot_da_hoi || 0) + 1;
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 25000);

    try {
      const response = await fetch("/api/analyze", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          ...initialInput,
          existingEvidence: analysisResult.bang_chung_da_co || [],
          previousQuestionsAndAnswers: accumulatedQA,
          newAnswers,
          extraNote,
          so_luot_da_hoi: currentTurn,
        }),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        if (response.status === 429) {
          throw new Error("Bạn đã gửi quá nhiều câu trả lời trong thời gian ngắn. Vui lòng chờ trong giây lát.");
        }
        throw new Error(`Máy chủ phản hồi mã lỗi ${response.status}`);
      }

      const updatedResult: AnalysisResponse = await response.json();
      const currentReputation = traceResult?.reputationRisk || "SAFE";
      const finalLevel = maxRisk(updatedResult.finalRiskLevel, currentReputation);

      setAnalysisResult({
        ...updatedResult,
        finalRiskLevel: finalLevel,
        reputationRiskLevel: currentReputation,
        traceCheckResult: traceResult || undefined,
        muc_rui_ro: mapCanonicalToLegacyVietnamese(finalLevel),
      });
      setShowGuidedFlow(false);

      // Append new answers to accumulated history
      const formattedForHistory = newAnswers.map((item) => ({
        question: item.question,
        answer: item.answer,
        round: currentTurn,
      }));
      if (extraNote.trim()) {
        formattedForHistory.push({
          question: "Ghi chú bổ sung từ bạn",
          answer: extraNote.trim(),
          round: currentTurn,
        });
      }

      setAccumulatedQA((prev) => [...prev, ...formattedForHistory]);
    } catch (err: any) {
      clearTimeout(timeoutId);
      console.error("Re-analysis error:", err);
      setErrorMessage(
        err.message || "Không thể gửi câu trả lời phân tích lại. Vui lòng thử lại trong giây lát."
      );
    } finally {
      setIsReanalyzing(false);
    }
  };

  // Select Demo Scenario
  const handleSelectDemoScenario = async (scenario: DemoScenario) => {
    setInitialInput(scenario.inputData);
    setAccumulatedQA([]);
    setShowGuidedFlow(false);
    setActiveTab("check");
    setIsTraceLoading(true);

    try {
      const trace = await performTraceCheck({
        text: scenario.inputData.text || "",
        linkUrl: scenario.inputData.linkUrl || "",
      });
      setTraceResult(trace);
      const upgradedLevel = maxRisk(scenario.mockResult.finalRiskLevel, trace.reputationRisk);
      setAnalysisResult({
        ...scenario.mockResult,
        finalRiskLevel: upgradedLevel,
        reputationRiskLevel: trace.reputationRisk,
        traceCheckResult: trace,
        muc_rui_ro: mapCanonicalToLegacyVietnamese(upgradedLevel),
      });
    } catch (e) {
      console.warn("Demo trace error:", e);
      setAnalysisResult(scenario.mockResult);
    } finally {
      setIsTraceLoading(false);
    }
  };

  const handleCheckIndicator = async (input: string) => {
    setErrorMessage(null);
    setAnalysisResult(null);
    setShowGuidedFlow(false);
    
    // 1. Fast rule-based lookup (<50ms) for instant initial render
    let initialResult: IndicatorCheckResult | null = null;
    try {
      initialResult = checkIndicator(input);
      setIndicatorResult(initialResult);
    } catch (err: any) {
      console.error("Indicator lookup error:", err);
      setErrorMessage("Không thể thực hiện tra cứu số & đường link. Vui lòng thử lại.");
      return;
    }

    // 2. If input has a phone number, perform background Google Search Grounding for public warnings
    if (initialResult && initialResult.phones && initialResult.phones.length > 0) {
      const primaryPhone = initialResult.phones[0];
      const phoneToSearch = primaryPhone.raw || primaryPhone.normalized;

      // If already matched official warning in local database, no need for blocking search state
      if (!initialResult.hasOfficialWarningMatch) {
        setIsSearchingGrounding(true);
      }

      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 12000); // 12s timeout

        const response = await fetch("/api/check-indicator/search-phone", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ phone: phoneToSearch, input }),
          signal: controller.signal,
        });

        clearTimeout(timeoutId);

        if (response.ok) {
          const data = await response.json();
          if (data && data.grounding) {
            setIndicatorResult((prev) => {
              if (!prev) return prev;
              return enrichIndicatorWithGrounding(prev, data.grounding);
            });
          }
        } else {
          setIndicatorResult((prev) => {
            if (!prev || prev.hasOfficialWarningMatch) return prev;
            return {
              ...prev,
              groundingSearchState: "error",
              groundingSearchMessage: "Chưa thể tra cứu nguồn công khai",
            };
          });
        }
      } catch (groundingErr: any) {
        console.warn("Background grounding search error:", groundingErr.message || groundingErr);
        setIndicatorResult((prev) => {
          if (!prev || prev.hasOfficialWarningMatch) return prev;
          return {
            ...prev,
            groundingSearchState: "error",
            groundingSearchMessage: "Chưa thể tra cứu nguồn công khai",
          };
        });
      } finally {
        setIsSearchingGrounding(false);
      }
    }
  };

  const handleReset = () => {
    setAnalysisResult(null);
    setTraceResult(null);
    setIndicatorResult(null);
    setIsSearchingGrounding(false);
    setIsTraceLoading(false);
    setInitialInput(null);
    setAccumulatedQA([]);
    setShowGuidedFlow(false);
    setErrorMessage(null);
  };

  return (
    <div
      className={`min-h-screen bg-slate-50 text-slate-900 flex flex-col font-sans transition-all selection:bg-emerald-100 selection:text-emerald-900 ${
        isLargeFont ? "text-lg" : "text-base"
      }`}
    >
      {/* Top Header */}
      <Header
        isLargeFont={isLargeFont}
        onToggleLargeFont={() => setIsLargeFont((prev) => !prev)}
        onOpenHotline={() => setIsHotlineOpen(true)}
        onOpenBreathing={() => setIsBreathingOpen(true)}
        onOpenArchitecture={() => setIsArchitectureOpen(true)}
        onOpenPrivacy={() => setIsPrivacyOpen(true)}
        activeTab={activeTab}
        onSelectTab={(tab) => {
          setActiveTab(tab);
          if (tab === "practice") {
            setAnalysisResult(null);
            setIndicatorResult(null);
            setInitialInput(null);
            setAccumulatedQA([]);
            setShowGuidedFlow(false);
          }
        }}
      />

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col justify-start pb-12">
        {/* Global Error Banner if any */}
        {errorMessage && (
          <div className="max-w-4xl mx-auto px-4 mt-4 w-full">
            <div className="p-5 rounded-2xl bg-rose-50 border-2 border-rose-300 text-rose-950 text-sm space-y-3 shadow-md">
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-2.5 font-bold">
                  <AlertTriangle className="w-5 h-5 text-rose-600 shrink-0" />
                  <span>{errorMessage}</span>
                </div>
                <button
                  onClick={() => setErrorMessage(null)}
                  className="px-3 py-1 rounded-lg bg-rose-200 hover:bg-rose-300 text-rose-900 text-xs font-bold transition-colors cursor-pointer"
                >
                  Đóng
                </button>
              </div>

              <div className="p-3 rounded-xl bg-white/80 border border-rose-200 text-xs text-rose-900 font-medium">
                🛡️ <strong>LƯU Ý AN TOÀN TRONG LÚC CHỜ:</strong> Tuyệt đối <strong>KHÔNG chuyển tiền</strong>, <strong>KHÔNG cung cấp mã OTP</strong> và <strong>KHÔNG tải ứng dụng lạ (.apk)</strong> vào điện thoại.
              </div>

              {initialInput && (
                <button
                  onClick={() => handleAnalyze(initialInput)}
                  className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold flex items-center gap-2 shadow-xs cursor-pointer transition-colors"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>Thử lại phân tích</span>
                </button>
              )}
            </div>
          </div>
        )}

        {/* Practice Mode Tab */}
        {activeTab === "practice" ? (
          <PracticeMode
            isLargeFont={isLargeFont}
            onBackToCheck={() => setActiveTab("check")}
          />
        ) : indicatorResult ? (
          /* Fast Indicator Lookup Result View */
          <div className="py-6 sm:py-8 px-4 max-w-5xl mx-auto w-full">
            <IndicatorLookupResultCard
              result={indicatorResult}
              isLargeFont={isLargeFont}
              isSearchingGrounding={isSearchingGrounding}
              onReset={handleReset}
              onAnalyzeFull={(input) => {
                handleReset();
                handleAnalyze({
                  type: "text",
                  text: input,
                });
              }}
            />
          </div>
        ) : showGuidedFlow && analysisResult ? (
          /* Guided Conversational Q&A Flow (One question at a time) */
          <GuidedFollowUpFlow
            initialResult={analysisResult}
            originalInputText={initialInput?.text || ""}
            isLargeFont={isLargeFont}
            onComplete={handleCompleteGuidedFlow}
            onOpenHotline={() => setIsHotlineOpen(true)}
            onCancel={() => setShowGuidedFlow(false)}
            isReanalyzing={isReanalyzing}
          />
        ) : analysisResult ? (
          /* Final Analysis Result View */
          <AnalysisResult
            result={analysisResult}
            originalInputText={initialInput?.text || ""}
            isLargeFont={isLargeFont}
            onReset={handleReset}
            onOpenHotline={() => setIsHotlineOpen(true)}
            userAnswerHistory={accumulatedQA}
            onOpenFollowUpFlow={() => setShowGuidedFlow(true)}
            traceResult={traceResult}
            isTraceLoading={isTraceLoading}
          />
        ) : (
          /* Input Hero Screen */
          <HeroInput
            isLargeFont={isLargeFont}
            isAnalyzing={isAnalyzing}
            onAnalyze={handleAnalyze}
            onCheckIndicator={handleCheckIndicator}
            onSelectDemoScenario={handleSelectDemoScenario}
            onOpenBreathing={() => setIsBreathingOpen(true)}
          />
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-200 bg-white py-6 px-4 text-center text-xs text-slate-500 shadow-xs">
        <div className="max-w-5xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-emerald-600" />
            <span className="font-bold text-slate-800">
              Bẫy Hay Thật ? — Trợ lý AI xác minh dấu hiệu lừa đảo trực tuyến
            </span>
          </div>

          <div className="flex items-center gap-3 sm:gap-4 text-slate-600 font-semibold flex-wrap justify-center">
            <button
              onClick={() => setIsPrivacyOpen(true)}
              className="hover:text-emerald-700 underline transition-colors cursor-pointer flex items-center gap-1"
            >
              <Lock className="w-3.5 h-3.5 text-emerald-600" />
              <span>Chính sách bảo mật & Quyền riêng tư</span>
            </button>
            <span>•</span>
            <button
              onClick={() => setIsArchitectureOpen(true)}
              className="hover:text-emerald-700 underline transition-colors cursor-pointer"
            >
              Hồ sơ kiến trúc
            </button>
            <span>•</span>
            <button
              onClick={() => setIsHotlineOpen(true)}
              className="hover:text-rose-700 underline transition-colors cursor-pointer"
            >
              Tổng đài 156
            </button>
          </div>
        </div>
        <p className="mt-3 text-[11px] text-slate-500 max-w-3xl mx-auto leading-relaxed">
          Dữ liệu phân tích tức thời trong bộ nhớ RAM, không lưu nhật ký hay thông tin cá nhân. Thông tin tham khảo đối chiếu theo khuyến cáo của Bộ Công An (A05) và Cục An toàn thông tin (Bộ TT&TT).
        </p>
      </footer>

      {/* Modals */}
      <CalmBreathingModal
        isOpen={isBreathingOpen}
        onClose={() => setIsBreathingOpen(false)}
      />

      <EmergencyGuideModal
        isOpen={isHotlineOpen}
        onClose={() => setIsHotlineOpen(false)}
      />

      <DemoScenariosModal
        isOpen={isDemoModalOpen}
        onClose={() => setIsDemoModalOpen(false)}
        onSelect={handleSelectDemoScenario}
      />

      <ArchitectureModal
        isOpen={isArchitectureOpen}
        onClose={() => setIsArchitectureOpen(false)}
      />

      <PrivacyPolicyModal
        isOpen={isPrivacyOpen}
        onClose={() => setIsPrivacyOpen(false)}
      />
    </div>
  );
}
