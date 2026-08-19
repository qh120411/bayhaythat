import React, { useState, useRef, useEffect } from "react";
import {
  ShieldAlert,
  ShieldCheck,
  Image as ImageIcon,
  MessageSquareText,
  Mic,
  FileText,
  Upload,
  Sparkles,
  ArrowRight,
  X,
  Volume2,
  CheckCircle2,
  Lock,
  HeartHandshake,
  AlertTriangle,
  Zap,
  Info,
  Loader2,
  Search,
  Globe,
  Smartphone,
  Link as LinkIcon,
  FileSearch,
} from "lucide-react";
import { InputMode, DemoScenario, IndicatorCheckResult } from "../types";
import { DEMO_SCENARIOS } from "../data/scenarios";
import { checkIndicator } from "../utils/indicatorLookup";

interface HeroInputProps {
  isLargeFont: boolean;
  isAnalyzing: boolean;
  onAnalyze: (data: {
    type: InputMode;
    text?: string;
    linkUrl?: string;
    imageBase64?: string;
    imageMimeType?: string;
    audioBase64?: string;
    audioMimeType?: string;
  }) => void;
  onSelectDemoScenario: (scenario: DemoScenario) => void;
  onOpenBreathing: () => void;
  onCheckIndicator?: (input: string) => void;
}

export const HeroInput: React.FC<HeroInputProps> = ({
  isLargeFont,
  isAnalyzing,
  onAnalyze,
  onSelectDemoScenario,
  onOpenBreathing,
  onCheckIndicator,
}) => {
  const [selectedMode, setSelectedMode] = useState<InputMode>("text");
  const [textContent, setTextContent] = useState("");
  const [indicatorInput, setIndicatorInput] = useState("");
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [imageMimeType, setImageMimeType] = useState<string>("image/jpeg");
  const [audioPreviewName, setAudioPreviewName] = useState<string | null>(null);
  const [audioBase64, setAudioBase64] = useState<string | null>(null);
  const [audioMimeType, setAudioMimeType] = useState<string>("audio/mp3");
  const [isRecording, setIsRecording] = useState(false);
  const [recordingSeconds, setRecordingSeconds] = useState(0);

  // Progressive Loading Step State
  const [loadingStep, setLoadingStep] = useState(0);

  useEffect(() => {
    let interval: any;
    if (isAnalyzing) {
      setLoadingStep(0);
      interval = setInterval(() => {
        setLoadingStep((prev) => (prev < 2 ? prev + 1 : prev));
      }, 1800);
    } else {
      setLoadingStep(0);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isAnalyzing]);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const audioInputRef = useRef<HTMLInputElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const recordingTimerRef = useRef<any>(null);

  // File Upload Handlers
  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setImageMimeType(file.type || "image/jpeg");
      const reader = new FileReader();
      reader.onload = (event) => {
        const base64 = event.target?.result as string;
        setImagePreview(base64);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleAudioUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setAudioPreviewName(file.name);
      setAudioMimeType(file.type || "audio/mp3");
      const reader = new FileReader();
      reader.onload = (event) => {
        const base64 = event.target?.result as string;
        setAudioBase64(base64);
      };
      reader.readAsDataURL(file);
    }
  };

  // Microphone Recording Handler
  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      const audioChunks: Blob[] = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunks.push(event.data);
        }
      };

      mediaRecorder.onstop = () => {
        const audioBlob = new Blob(audioChunks, { type: "audio/webm" });
        setAudioMimeType("audio/webm");
        setAudioPreviewName(`Ghi_am_${new Date().toLocaleTimeString("vi-VN")}.webm`);
        const reader = new FileReader();
        reader.onload = () => {
          setAudioBase64(reader.result as string);
        };
        reader.readAsDataURL(audioBlob);
        stream.getTracks().forEach((track) => track.stop());
      };

      mediaRecorderRef.current = mediaRecorder;
      mediaRecorder.start();
      setIsRecording(true);
      setRecordingSeconds(0);

      recordingTimerRef.current = setInterval(() => {
        setRecordingSeconds((prev) => prev + 1);
      }, 1000);
    } catch (err) {
      console.error("Microphone access error:", err);
      alert("Không thể truy cập micro. Bạn có thể gõ nội dung hoặc tải tệp ghi âm sẵn có.");
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      if (recordingTimerRef.current) clearInterval(recordingTimerRef.current);
    }
  };

  // Submit Handler
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (isAnalyzing) return;

    if (selectedMode === "indicator") {
      const input = indicatorInput.trim();
      if (!input) {
        alert("Vui lòng nhập số điện thoại hoặc đường link cần tra cứu.");
        return;
      }

      if (onCheckIndicator) {
        onCheckIndicator(input);
      } else {
        // Fallback to standard onAnalyze with text
        onAnalyze({
          type: "indicator",
          text: input,
          linkUrl: input.includes(".") && !input.includes(" ") ? input : undefined,
        });
      }
      return;
    }

    if (!textContent.trim() && !imagePreview && !audioBase64) {
      alert("Vui lòng nhập nội dung, tải ảnh chụp màn hình hoặc gửi đoạn ghi âm cần kiểm tra.");
      return;
    }

    onAnalyze({
      type: selectedMode,
      text: textContent.trim(),
      imageBase64: imagePreview || undefined,
      imageMimeType: imagePreview ? imageMimeType : undefined,
      audioBase64: audioBase64 || undefined,
      audioMimeType: audioBase64 ? audioMimeType : undefined,
    });
  };

  // Custom icon combining Phone and Link / Magnifying glass
  const PhoneLinkSearchIcon: React.FC<{ className?: string }> = ({ className }) => (
    <div className="relative flex items-center justify-center">
      <Smartphone className={className} />
      <Search className="w-3 h-3 absolute -bottom-1 -right-1 text-indigo-700 bg-white rounded-full p-0.5 shadow-2xs border border-indigo-200" />
    </div>
  );

  // Exactly 5 input mode options in the requested order:
  // 1. Dán tin nhắn
  // 2. Tra số & đường link
  // 3. Tải ảnh hoặc mã QR
  // 4. Gửi đoạn ghi âm
  // 5. Kể lại sự việc
  const inputOptions = [
    {
      id: "text",
      title: "Dán tin nhắn",
      desc: "Zalo, SMS, Messenger",
      icon: MessageSquareText,
      iconColor: "text-blue-600",
      activeBg: "bg-blue-50 border-blue-500 text-blue-900 ring-2 ring-blue-500/20 shadow-sm",
    },
    {
      id: "indicator",
      title: "Tra số & đường link",
      desc: "Kiểm tra nhanh đầu số và tên miền",
      icon: PhoneLinkSearchIcon,
      iconColor: "text-indigo-600",
      activeBg: "bg-indigo-50 border-indigo-500 text-indigo-900 ring-2 ring-indigo-500/20 shadow-sm",
    },
    {
      id: "image",
      title: "Tải ảnh hoặc mã QR",
      desc: "Ảnh chụp màn hình, hóa đơn",
      icon: ImageIcon,
      iconColor: "text-emerald-600",
      activeBg: "bg-emerald-50 border-emerald-500 text-emerald-900 ring-2 ring-emerald-500/20 shadow-sm",
    },
    {
      id: "audio",
      title: "Gửi đoạn ghi âm",
      desc: "Cuộc gọi hoặc tin nhắn thoại",
      icon: Mic,
      iconColor: "text-amber-600",
      activeBg: "bg-amber-50 border-amber-500 text-amber-900 ring-2 ring-amber-500/20 shadow-sm",
    },
    {
      id: "story",
      title: "Kể lại sự việc",
      desc: "Mô tả tình huống bằng lời",
      icon: FileText,
      iconColor: "text-teal-600",
      activeBg: "bg-teal-50 border-teal-500 text-teal-900 ring-2 ring-teal-500/20 shadow-sm",
    },
  ];

  const loadingSteps = [
    "Đang quét các dấu hiệu khẩn cấp...",
    "Đang đối chiếu cơ sở dữ liệu lừa đảo trực tuyến...",
    "Đang xây dựng hướng dẫn an toàn và khuyến cáo...",
  ];

  return (
    <section className="py-6 sm:py-8 px-4 max-w-5xl mx-auto space-y-7">
      {/* Calm Assistance Banner for Panicked Users */}
      <div className="p-5 rounded-3xl bg-gradient-to-r from-indigo-50 via-purple-50 to-blue-50 border border-indigo-200/90 shadow-sm flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-2xl bg-white border border-indigo-200 flex items-center justify-center shrink-0 shadow-sm">
            <HeartHandshake className="w-6 h-6 text-indigo-600" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="px-2 py-0.5 rounded-md bg-indigo-100/80 text-indigo-800 font-extrabold text-[11px] uppercase tracking-wider">
                Lời khuyên an tâm
              </span>
            </div>
            <h3 className={`font-extrabold text-slate-900 mt-0.5 ${isLargeFont ? "text-lg" : "text-base"}`}>
              Đang có người giục bạn chuyển tiền hoặc đọc mã OTP gấp?
            </h3>
            <p className="text-xs text-slate-600 font-medium">
              Hãy bấm dừng lại 1 phút. Tiền vẫn an toàn trong tài khoản của bạn!
            </p>
          </div>
        </div>
        <button
          onClick={onOpenBreathing}
          className="px-4 py-2.5 rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs sm:text-sm font-extrabold transition-all shadow-md hover:shadow-indigo-600/25 flex items-center gap-2 cursor-pointer active:scale-95"
        >
          <span>Dừng lại & Bình tĩnh</span>
          <ArrowRight className="w-4 h-4" />
        </button>
      </div>

      {/* Main Bright Form Container */}
      <div className="bg-white rounded-3xl border border-slate-200/90 p-6 sm:p-8 shadow-xl shadow-slate-200/50 relative overflow-hidden">
        <div className="space-y-6">
          {/* Header Title */}
          <div className="text-center space-y-2">
            <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-black uppercase tracking-wider">
              <Zap className="w-3.5 h-3.5 text-emerald-600" />
              Bước 1: Chọn cách cung cấp thông tin
            </div>
            <h1 className={`font-black text-slate-900 tracking-tight ${isLargeFont ? "text-3xl sm:text-4xl" : "text-2xl sm:text-3xl"}`}>
              Kiểm Tra Dấu Hiệu Lừa Đảo Trực Tuyến
            </h1>
            <p className={`text-slate-600 max-w-2xl mx-auto leading-relaxed ${isLargeFont ? "text-base" : "text-sm"}`}>
              Tra cứu nhanh đầu số, kiểm tra tên miền thật hoặc dán tin nhắn để hệ thống phát hiện các điểm bất thường và hướng dẫn cách xử lý an toàn.
            </p>
          </div>

          {/* 5 Grid Mode Selector Buttons (Responsive: 5 on wide desktop, 3 on tablet, 2 or 1 on mobile) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
            {inputOptions.map((opt) => {
              const Icon = opt.icon;
              const isSelected = selectedMode === opt.id;
              return (
                <button
                  key={opt.id}
                  id={`mode-select-${opt.id}`}
                  onClick={() => setSelectedMode(opt.id as InputMode)}
                  className={`w-full h-full min-h-[110px] p-3.5 sm:p-4 rounded-2xl border text-left transition-all duration-200 flex flex-col items-center justify-center text-center gap-2.5 cursor-pointer ${
                    isSelected
                      ? opt.activeBg + " scale-102"
                      : "bg-slate-50 hover:bg-slate-100/90 border-slate-200 text-slate-700 hover:text-slate-900"
                  }`}
                >
                  <div className={`p-2.5 rounded-xl transition-colors ${isSelected ? "bg-white shadow-sm" : "bg-white/80"}`}>
                    <Icon className={`w-5 h-5 ${opt.iconColor}`} />
                  </div>
                  <div className="flex flex-col items-center">
                    <span className={`font-bold block ${isLargeFont ? "text-base" : "text-sm"} text-slate-900 leading-snug`}>
                      {opt.title}
                    </span>
                    <span className="text-[11px] text-slate-500 mt-0.5 font-medium leading-tight line-clamp-2">
                      {opt.desc}
                    </span>
                  </div>
                </button>
              );
            })}
          </div>

          {/* Dynamic Input Sub-forms */}
          <form onSubmit={handleSubmit} className="space-y-5 pt-2">
            {/* 1. TEXT MODE */}
            {selectedMode === "text" && (
              <div className="space-y-2">
                <div className="flex items-center justify-between flex-wrap gap-1">
                  <label className={`font-bold text-slate-800 flex items-center gap-2 ${isLargeFont ? "text-lg" : "text-sm"}`}>
                    <MessageSquareText className="w-4 h-4 text-blue-600" />
                    <span>Dán nội dung tin nhắn bạn nhận được:</span>
                  </label>
                  <span className="text-xs text-slate-500 font-medium">Tự động che số tài khoản & CCCD</span>
                </div>
                <textarea
                  id="input-text-message"
                  value={textContent}
                  onChange={(e) => setTextContent(e.target.value)}
                  placeholder="Ví dụ: 'Người lạ nhắn tôi chuyển 10 triệu đồng để nhận quà, có phải lừa đảo không?' hoặc 'Cháu vừa bị tai nạn cấp cứu, chuyển gấp viện phí 25 triệu...'"
                  rows={4}
                  className={`w-full p-4 rounded-2xl bg-slate-50/50 border-2 border-slate-200 focus:border-emerald-600 focus:bg-white focus:ring-4 focus:ring-emerald-500/10 text-slate-900 placeholder-slate-400 outline-none transition-all resize-none shadow-sm ${
                    isLargeFont ? "text-lg leading-relaxed" : "text-base"
                  }`}
                />
              </div>
            )}

            {/* 2. TRA SỐ & ĐƯỜNG LINK MODE (Dedicated Quick Single Clear Input) */}
            {selectedMode === "indicator" && (
              <div className="space-y-4">
                <div className="space-y-2">
                  <div className="flex items-center justify-between flex-wrap gap-1">
                    <label className={`font-bold text-slate-800 flex items-center gap-2 ${isLargeFont ? "text-lg" : "text-sm"}`}>
                      <Search className="w-4 h-4 text-indigo-600" />
                      <span>Dán số điện thoại hoặc đường link cần kiểm tra:</span>
                    </label>
                    <span className="text-xs text-indigo-700 bg-indigo-50 px-2.5 py-0.5 rounded font-bold border border-indigo-200">
                      Tự động nhận diện SĐT, quốc gia & tên miền thật
                    </span>
                  </div>
                  <input
                    type="text"
                    id="input-indicator-quick"
                    value={indicatorInput}
                    onChange={(e) => setIndicatorInput(e.target.value)}
                    placeholder="Ví dụ: +212 7 86 69 54 33 hoặc https://example.com"
                    className={`w-full p-4 rounded-2xl bg-slate-50/50 border-2 border-slate-200 focus:border-indigo-600 focus:bg-white focus:ring-4 focus:ring-indigo-500/10 text-slate-900 placeholder-slate-400 outline-none transition-all shadow-sm ${
                      isLargeFont ? "text-lg" : "text-base"
                    }`}
                  />
                  <p className="text-xs text-slate-500">
                    Cho phép dán: 1 số điện thoại, 1 URL, hoặc đoạn ngắn chứa cả hai. Không bắt buộc phải kể lại tình huống.
                  </p>
                </div>

                {/* Quick Examples Badges */}
                <div className="flex items-center gap-2 flex-wrap text-xs text-slate-600 pt-1">
                  <span className="font-semibold text-slate-500">Mẫu tra cứu nhanh:</span>
                  <button
                    type="button"
                    onClick={() => setIndicatorInput("+212 7 86 69 54 33")}
                    className="px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 font-mono font-medium transition-colors cursor-pointer border border-slate-200"
                  >
                    +212 7 86 69 54 33 (Ma-rốc)
                  </button>
                  <button
                    type="button"
                    onClick={() => setIndicatorInput("https://500001.eu.cc/dichvucong.gov/vn")}
                    className="px-2.5 py-1 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-800 font-mono font-medium transition-colors cursor-pointer border border-rose-200"
                  >
                    500001.eu.cc/dichvucong.gov/vn
                  </button>
                  <button
                    type="button"
                    onClick={() => setIndicatorInput("https://dichvucong.gov.vn")}
                    className="px-2.5 py-1 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-800 font-mono font-medium transition-colors cursor-pointer border border-emerald-200"
                  >
                    dichvucong.gov.vn (Chính thống)
                  </button>
                </div>
              </div>
            )}

            {/* 3. IMAGE / QR MODE */}
            {selectedMode === "image" && (
              <div className="space-y-3">
                <label className={`font-bold text-slate-800 flex items-center gap-2 ${isLargeFont ? "text-lg" : "text-sm"}`}>
                  <ImageIcon className="w-4 h-4 text-emerald-600" />
                  <span>Tải ảnh chụp màn hình tin nhắn, mã QR hoặc hóa đơn:</span>
                </label>

                <input
                  type="file"
                  ref={fileInputRef}
                  accept="image/*"
                  onChange={handleImageUpload}
                  className="hidden"
                />

                {!imagePreview ? (
                  <div
                    id="dropzone-image-upload"
                    onClick={() => fileInputRef.current?.click()}
                    className="border-2 border-dashed border-slate-300 hover:border-emerald-500 hover:bg-emerald-50/30 rounded-3xl p-8 flex flex-col items-center justify-center text-center cursor-pointer transition-all duration-200 group bg-slate-50/50"
                  >
                    <div className="w-16 h-16 rounded-2xl bg-white border border-slate-200 flex items-center justify-center text-slate-400 group-hover:text-emerald-600 group-hover:scale-110 transition-all shadow-sm">
                      <Upload className="w-8 h-8" />
                    </div>
                    <span className="mt-3 font-bold text-slate-800 text-sm sm:text-base">
                      Bấm để chọn ảnh từ điện thoại hoặc máy tính
                    </span>
                    <span className="text-xs text-slate-500 mt-1">
                      Hỗ trợ ảnh chụp màn hình Zalo, SMS, Messenger, mã QR chuyển khoản, hóa đơn
                    </span>
                  </div>
                ) : (
                  <div className="relative rounded-2xl overflow-hidden border-2 border-emerald-500 bg-slate-900 p-2 flex items-center justify-center max-h-72">
                    <img
                      src={imagePreview}
                      alt="Ảnh tải lên"
                      className="max-h-64 object-contain rounded-xl"
                      referrerPolicy="no-referrer"
                    />
                    <button
                      type="button"
                      onClick={() => setImagePreview(null)}
                      className="absolute top-4 right-4 p-2 rounded-full bg-rose-600 hover:bg-rose-700 text-white shadow-lg transition-transform hover:scale-110 cursor-pointer"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                )}

                <textarea
                  value={textContent}
                  onChange={(e) => setTextContent(e.target.value)}
                  placeholder="Ghi chú thêm về bức ảnh này (nếu có): Ai gửi cho bạn, trong hoàn cảnh nào..."
                  rows={2}
                  className="w-full p-3 rounded-xl bg-slate-50 border border-slate-200 focus:border-emerald-600 focus:bg-white text-xs sm:text-sm text-slate-900 placeholder-slate-400 outline-none"
                />
              </div>
            )}

            {/* 4. AUDIO / VOICE RECORDING MODE */}
            {selectedMode === "audio" && (
              <div className="space-y-4">
                <label className={`font-bold text-slate-800 flex items-center gap-2 ${isLargeFont ? "text-lg" : "text-sm"}`}>
                  <Mic className="w-4 h-4 text-amber-600" />
                  <span>Gửi đoạn ghi âm giọng nói hoặc cuộc gọi đáng ngờ:</span>
                </label>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                  {/* Direct Microphone Recorder */}
                  <div className="p-5 rounded-2xl bg-slate-50 border-2 border-slate-200 flex flex-col items-center justify-center text-center gap-3 shadow-sm">
                    {isRecording ? (
                      <div className="flex flex-col items-center gap-2.5">
                        <div className="w-16 h-16 rounded-full bg-rose-600 animate-pulse flex items-center justify-center text-white shadow-xl shadow-rose-600/30">
                          <Mic className="w-8 h-8" />
                        </div>
                        <span className="font-extrabold text-rose-600 text-base">
                          Đang ghi âm... {recordingSeconds}s
                        </span>
                        <button
                          type="button"
                          onClick={stopRecording}
                          className="px-5 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs shadow-md transition-all cursor-pointer"
                        >
                          Dừng & Sử dụng bản ghi
                        </button>
                      </div>
                    ) : (
                      <>
                        <button
                          type="button"
                          id="btn-start-record-audio"
                          onClick={startRecording}
                          className="w-14 h-14 rounded-2xl bg-amber-500 hover:bg-amber-600 text-white flex items-center justify-center shadow-lg shadow-amber-500/30 transition-all hover:scale-105 active:scale-95 cursor-pointer"
                        >
                          <Mic className="w-7 h-7" />
                        </button>
                        <span className="font-bold text-slate-800 text-sm">
                          Bấm micro để nói lời kể
                        </span>
                        <span className="text-xs text-slate-500">Kể lại nội dung cuộc gọi hoặc tin nhắn thoại</span>
                      </>
                    )}
                  </div>

                  {/* Upload Audio File */}
                  <div
                    id="dropzone-audio-upload"
                    onClick={() => audioInputRef.current?.click()}
                    className="p-5 rounded-2xl bg-slate-50 border-2 border-dashed border-slate-300 hover:border-amber-500 flex flex-col items-center justify-center text-center gap-2 cursor-pointer transition-all hover:bg-amber-50/20"
                  >
                    <input
                      type="file"
                      ref={audioInputRef}
                      accept="audio/*"
                      onChange={handleAudioUpload}
                      className="hidden"
                    />
                    <div className="w-14 h-14 rounded-2xl bg-white border border-amber-200 flex items-center justify-center text-amber-600 shadow-sm">
                      <Volume2 className="w-7 h-7" />
                    </div>
                    <span className="font-bold text-slate-800 text-sm">
                      {audioPreviewName ? audioPreviewName : "Tải tệp ghi âm sẵn có (.mp3, .m4a)"}
                    </span>
                    <span className="text-xs text-slate-500">Tệp ghi âm từ điện thoại</span>
                  </div>
                </div>

                {audioBase64 && (
                  <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 flex items-center justify-between text-xs text-emerald-800">
                    <span className="flex items-center gap-2 font-bold">
                      <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                      Đã nạp tệp âm thanh ({audioPreviewName || "Bản ghi trực tiếp"})
                    </span>
                    <button
                      type="button"
                      onClick={() => {
                        setAudioBase64(null);
                        setAudioPreviewName(null);
                      }}
                      className="text-rose-600 hover:underline font-bold cursor-pointer"
                    >
                      Xóa
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* 5. STORY / FREE TEXT MODE */}
            {selectedMode === "story" && (
              <div className="space-y-2">
                <label className={`font-bold text-slate-800 flex items-center gap-2 ${isLargeFont ? "text-lg" : "text-sm"}`}>
                  <FileText className="w-4 h-4 text-teal-600" />
                  <span>Kể lại chi tiết những gì đang xảy ra với bạn:</span>
                </label>
                <textarea
                  value={textContent}
                  onChange={(e) => setTextContent(e.target.value)}
                  placeholder="Ví dụ: 'Sáng nay có người tự xưng nhân viên điện lực gọi điện bảo tôi chưa nộp tiền điện 3 tháng và đe dọa sẽ cắt điện trong 2 giờ nữa nếu không chuyển 850.000đ vào tài khoản...'"
                  rows={5}
                  className={`w-full p-4 rounded-2xl bg-slate-50/50 border-2 border-slate-200 focus:border-teal-600 focus:bg-white focus:ring-4 focus:ring-teal-500/10 text-slate-900 placeholder-slate-400 outline-none transition-all resize-none shadow-sm ${
                    isLargeFont ? "text-lg leading-relaxed" : "text-base"
                  }`}
                />
              </div>
            )}

            {/* PRIMARY CTA BUTTON & PROGRESSIVE LOADING */}
            <div className="space-y-3">
              <button
                id="btn-submit-analyze"
                type="submit"
                disabled={isAnalyzing}
                className={`w-full py-4 sm:py-5 px-6 rounded-2xl ${
                  selectedMode === "indicator"
                    ? "bg-gradient-to-r from-indigo-600 via-blue-600 to-indigo-600 hover:from-indigo-700 hover:to-blue-700 shadow-indigo-600/30"
                    : "bg-gradient-to-r from-emerald-600 via-teal-600 to-emerald-600 hover:from-emerald-700 hover:to-teal-700 shadow-emerald-600/30"
                } text-white font-black shadow-lg flex items-center justify-center gap-3 transition-all duration-200 active:scale-98 cursor-pointer disabled:opacity-75 disabled:cursor-not-allowed ${
                  isLargeFont ? "text-2xl" : "text-xl"
                }`}
              >
                {isAnalyzing ? (
                  <>
                    <Loader2 className="w-6 h-6 animate-spin text-white" />
                    <span>{loadingSteps[loadingStep]}</span>
                  </>
                ) : selectedMode === "indicator" ? (
                  <>
                    <Search className="w-6 h-6 text-white" />
                    <span>Tra Cứu Nhanh</span>
                    <ArrowRight className="w-6 h-6" />
                  </>
                ) : (
                  <>
                    <Sparkles className="w-6 h-6 text-white animate-pulse" />
                    <span>Kiểm Tra Tình Huống Ngay</span>
                    <ArrowRight className="w-6 h-6" />
                  </>
                )}
              </button>

              {isAnalyzing && (
                <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-center gap-3 text-xs text-slate-600 font-bold animate-in fade-in">
                  <div className="flex items-center gap-1.5 text-emerald-700">
                    <span className="w-2 h-2 rounded-full bg-emerald-600 animate-ping" />
                    <span>Đang xử lý tức thời trong RAM</span>
                  </div>
                  <span className="text-slate-300">•</span>
                  <div className="flex items-center gap-1.5 text-slate-600">
                    <Lock className="w-3.5 h-3.5 text-slate-500" />
                    <span>Mã hóa bảo vệ dữ liệu</span>
                  </div>
                </div>
              )}
            </div>
          </form>
        </div>
      </div>

      {/* Bottom Floating Scenario Suggestions Bar */}
      <div className="flex items-center justify-between p-4 rounded-2xl bg-white border border-slate-200/90 shadow-sm flex-wrap gap-3">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-amber-50 border border-amber-200 flex items-center justify-center text-amber-600">
            <Zap className="w-4 h-4" />
          </div>
          <div>
            <span className="text-xs font-bold text-slate-800 block">
              Bạn muốn thử nghiệm các chiêu trò tinh vi đang diễn ra?
            </span>
            <span className="text-[11px] text-slate-500">
              Có sẵn 6 tình huống thực tế: Cấp cứu viện phí, nộp phạt DVC, mạo danh công an...
            </span>
          </div>
        </div>

        <button
          type="button"
          onClick={() => onSelectDemoScenario(DEMO_SCENARIOS[0])}
          className="px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold transition-all shadow-xs flex items-center gap-2 cursor-pointer"
        >
          <span>Xem tình huống mẫu</span>
          <ArrowRight className="w-3.5 h-3.5" />
        </button>
      </div>
    </section>
  );
};
