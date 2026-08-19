import React from "react";
import { X, Sparkles, ArrowRight, ShieldCheck } from "lucide-react";
import { DemoScenario } from "../types";
import { DEMO_SCENARIOS } from "../data/scenarios";

interface DemoScenariosModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (scenario: DemoScenario) => void;
}

export const DemoScenariosModal: React.FC<DemoScenariosModalProps> = ({
  isOpen,
  onClose,
  onSelect,
}) => {
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
          <span className="px-3 py-1 rounded-full bg-amber-50 text-amber-800 text-xs font-black border border-amber-200 uppercase tracking-wider">
            Thư Viện Tình Huống Mẫu
          </span>
          <h2 className="text-xl sm:text-2xl font-black text-slate-900 mt-1">
            Chọn Một Tình Huống Thực Tế Để Trải Nghiệm AI
          </h2>
          <p className="text-xs text-slate-600 font-medium mt-0.5">
            Bấm chọn để hệ thống tự động điền nội dung và hiển thị kết quả phân tích
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-h-96 overflow-y-auto pr-1">
          {DEMO_SCENARIOS.map((scenario) => (
            <div
              key={scenario.id}
              onClick={() => {
                onSelect(scenario);
                onClose();
              }}
              className="p-5 rounded-2xl bg-slate-50 hover:bg-emerald-50/40 border border-slate-200 hover:border-emerald-500 cursor-pointer transition-all shadow-xs group flex flex-col justify-between"
            >
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold px-2 py-0.5 rounded-md bg-amber-100 text-amber-900">
                    {scenario.tag}
                  </span>
                  <span className="text-[11px] text-slate-500 font-semibold">
                    Đánh giá: {scenario.mockResult.muc_rui_ro}
                  </span>
                </div>
                <h3 className="font-black text-sm text-slate-900 group-hover:text-emerald-700 transition-colors">
                  {scenario.title}
                </h3>
                <p className="text-xs text-slate-600 leading-relaxed font-medium">
                  {scenario.victimScenario}
                </p>
              </div>

              <div className="mt-3 pt-3 border-t border-slate-200/80 flex items-center justify-between text-xs font-bold text-emerald-700">
                <span>Nạp tình huống này</span>
                <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
