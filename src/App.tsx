import React, { useState } from "react";
import { Header } from "./components/Header";
import { HeroInput } from "./components/HeroInput";
import { AnalysisResult } from "./components/AnalysisResult";
import { PracticeMode } from "./components/PracticeMode";
import { DemoScenariosModal } from "./components/DemoScenariosModal";
import { CalmBreathingModal } from "./components/CalmBreathingModal";
import { EmergencyGuideModal } from "./components/EmergencyGuideModal";
import { ArchitectureModal } from "./components/ArchitectureModal";
import { AnalysisResponse, DemoScenario, InputMode } from "./types";
import { AlertTriangle, ShieldCheck, Heart } from "lucide-react";

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
  const [initialInput, setInitialInput] = useState<InitialInputState | null>(null);
  const [accumulatedQA, setAccumulatedQA] = useState<
    Array<{ question: string; answer: string; round: number }>
  >([]);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isReanalyzing, setIsReanalyzing] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Modals state
  const [isHotlineOpen, setIsHotlineOpen] = useState(false);
  const [isBreathingOpen, setIsBreathingOpen] = useState(false);
  const [isArchitectureOpen, setIsArchitectureOpen] = useState(false);
  const [isDemoModalOpen, setIsDemoModalOpen] = useState(false);

  // Call Server-side Gemini API for initial assessment
  const handleAnalyze = async (data: InitialInputState) => {
    setIsAnalyzing(true);
    setErrorMessage(null);
    setInitialInput(data);
    setAccumulatedQA([]);

    try {
      const response = await fetch("/api/analyze", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          ...data,
          so_luot_da_hoi: 0,
        }),
      });

      if (!response.ok) {
        throw new Error(`Máy chủ phản hồi mã lỗi ${response.status}`);
      }

      const resultData: AnalysisResponse = await response.json();
      setAnalysisResult(resultData);
    } catch (err: any) {
      console.error("Analysis error:", err);
      setErrorMessage(
        "Không thể kết nối đến máy chủ phân tích. Vui lòng thử lại hoặc chọn tình huống mẫu để kiểm tra."
      );
    } finally {
      setIsAnalyzing(false);
    }
  };

  // Handle follow-up response submission and re-analysis
  const handleSubmitFollowUpAnswers = async (
    newAnswers: Array<{ questionId: string; question: string; answer: string }>,
    extraNote: string
  ) => {
    if (!initialInput || !analysisResult) return;

    setIsReanalyzing(true);
    setErrorMessage(null);

    const currentTurn = (analysisResult.so_luot_da_hoi || 0) + 1;

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
      });

      if (!response.ok) {
        throw new Error(`Máy chủ phản hồi mã lỗi ${response.status}`);
      }

      const updatedResult: AnalysisResponse = await response.json();
      setAnalysisResult(updatedResult);

      // Append new answers to accumulated history
      const formattedForHistory = newAnswers.map((item) => ({
        question: item.question,
        answer: item.answer,
        round: currentTurn,
      }));
      if (extraNote.trim()) {
        formattedForHistory.push({
          question: "Ghi chú bổ sung từ người dùng",
          answer: extraNote.trim(),
          round: currentTurn,
        });
      }

      setAccumulatedQA((prev) => [...prev, ...formattedForHistory]);
    } catch (err: any) {
      console.error("Re-analysis error:", err);
      setErrorMessage(
        "Không thể gửi câu trả lời phân tích lại. Vui lòng thử lại trong giây lát."
      );
    } finally {
      setIsReanalyzing(false);
    }
  };

  // Select Demo Scenario
  const handleSelectDemoScenario = (scenario: DemoScenario) => {
    setAnalysisResult(scenario.mockResult);
    setInitialInput({ type: "text", text: scenario.title });
    setAccumulatedQA([]);
    setActiveTab("check");
  };

  const handleReset = () => {
    setAnalysisResult(null);
    setInitialInput(null);
    setAccumulatedQA([]);
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
        activeTab={activeTab}
        onSelectTab={(tab) => {
          setActiveTab(tab);
          if (tab === "practice") {
            setAnalysisResult(null);
            setInitialInput(null);
            setAccumulatedQA([]);
          }
        }}
      />

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col justify-start pb-12">
        {/* Global Error Banner if any */}
        {errorMessage && (
          <div className="max-w-4xl mx-auto px-4 mt-4 w-full">
            <div className="p-4 rounded-2xl bg-rose-50 border border-rose-300 text-rose-900 text-sm flex items-center justify-between gap-3 shadow-md">
              <div className="flex items-center gap-2 font-semibold">
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
          </div>
        )}

        {/* Practice Mode Tab */}
        {activeTab === "practice" ? (
          <PracticeMode
            isLargeFont={isLargeFont}
            onBackToCheck={() => setActiveTab("check")}
          />
        ) : analysisResult ? (
          /* Result View */
          <AnalysisResult
            result={analysisResult}
            isLargeFont={isLargeFont}
            onReset={handleReset}
            onOpenHotline={() => setIsHotlineOpen(true)}
            onSubmitFollowUpAnswers={handleSubmitFollowUpAnswers}
            isReanalyzing={isReanalyzing}
            currentTurn={analysisResult.so_luot_da_hoi || 0}
          />
        ) : (
          /* Input Hero Screen */
          <HeroInput
            isLargeFont={isLargeFont}
            isAnalyzing={isAnalyzing}
            onAnalyze={handleAnalyze}
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

          <div className="flex items-center gap-4 text-slate-600 font-semibold">
            <button
              onClick={() => setIsArchitectureOpen(true)}
              className="hover:text-emerald-700 underline transition-colors cursor-pointer"
            >
              Hồ sơ kiến trúc kỹ thuật
            </button>
            <span>•</span>
            <button
              onClick={() => setIsHotlineOpen(true)}
              className="hover:text-rose-700 underline transition-colors cursor-pointer"
            >
              Danh bạ 156 / 113
            </button>
          </div>
        </div>
        <p className="mt-3 text-[11px] text-slate-500 max-w-3xl mx-auto leading-relaxed">
          Công cụ hỗ trợ đánh giá rủi ro tham khảo, không khẳng định tư cách pháp lý của cá nhân hay tổ chức. Khi có nghi vấn, hãy liên hệ cơ quan công an địa phương hoặc tổng đài chính thống.
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
    </div>
  );
}
