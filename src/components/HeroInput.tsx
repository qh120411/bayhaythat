import React, { useState, useRef } from "react";
import {
  ShieldAlert,
  ShieldCheck,
  Image as ImageIcon,
  MessageSquareText,
  Link2,
  Mic,
  FileText,
  Video,
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
} from "lucide-react";
import { InputMode, DemoScenario } from "../types";
import { DEMO_SCENARIOS } from "../data/scenarios";

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
}

export const HeroInput: React.FC<HeroInputProps> = ({
  isLargeFont,
  isAnalyzing,
  onAnalyze,
  onSelectDemoScenario,
  onOpenBreathing,
}) => {
  const [selectedMode, setSelectedMode] = useState<InputMode>("text");
  const [textContent, setTextContent] = useState("");
  const [linkInput, setLinkInput] = useState("");
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [imageMimeType, setImageMimeType] = useState<string>("image/jpeg");
  const [audioPreviewName, setAudioPreviewName] = useState<string | null>(null);
  const [audioBase64, setAudioBase64] = useState<string | null>(null);
  const [audioMimeType, setAudioMimeType] = useState<string>("audio/mp3");
  const [isRecording, setIsRecording] = useState(false);
  const [recordingSeconds, setRecordingSeconds] = useState(0);

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
      console.error("Microphone access denied or error:", err);
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

    if (
      !textContent.trim() &&
      !linkInput.trim() &&
      !imagePreview &&
      !audioBase64
    ) {
      alert("Vui lòng nhập nội dung, dán link hoặc tải ảnh/âm thanh cần kiểm tra.");
      return;
    }

    onAnalyze({
      type: selectedMode,
      text: textContent.trim(),
      linkUrl: linkInput.trim(),
      imageBase64: imagePreview || undefined,
      imageMimeType: imagePreview ? imageMimeType : undefined,
      audioBase64: audioBase64 || undefined,
      audioMimeType: audioBase64 ? audioMimeType : undefined,
    });
  };

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
              Chỉ cần dán tin nhắn, tải ảnh chụp màn hình hoặc kể lại sự việc. AI sẽ phân tích các điểm bất thường và chỉ bạn cách xử lý an toàn nhất.
            </p>
          </div>

          {/* 4 Grid Mode Selector Buttons */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {inputOptions.map((opt) => {
              const Icon = opt.icon;
              const isSelected = selectedMode === opt.id;
              return (
                <button
                  key={opt.id}
                  id={`mode-select-${opt.id}`}
                  onClick={() => setSelectedMode(opt.id as InputMode)}
                  className={`w-full h-full min-h-[108px] p-4 rounded-2xl border text-left transition-all duration-200 flex flex-col items-center justify-center text-center gap-2.5 cursor-pointer ${
                    isSelected
                      ? opt.activeBg + " scale-102"
                      : "bg-slate-50 hover:bg-slate-100/90 border-slate-200 text-slate-700 hover:text-slate-900"
                  }`}
                >
                  <div className={`p-2.5 rounded-xl transition-colors ${isSelected ? "bg-white shadow-sm" : "bg-white/80"}`}>
                    <Icon className={`w-5 h-5 ${opt.iconColor}`} />
                  </div>
                  <div className="flex flex-col items-center">
                    <span className={`font-bold block ${isLargeFont ? "text-base" : "text-sm"} text-slate-900`}>
                      {opt.title}
                    </span>
                    <span className="text-xs text-slate-500 mt-0.5">
                      {opt.desc}
                    </span>
                  </div>
                </button>
              );
            })}
          </div>

          {/* Dynamic Input Sub-forms */}
          <form onSubmit={handleSubmit} className="space-y-5 pt-2">
            {/* TEXT MODE */}
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
                  placeholder="Ví dụ: 'Cháu Hoàng vừa bị tai nạn giao thông cấp cứu Bệnh viện Chợ Rẫy, yêu cầu nộp viện phí 25 triệu gấp...' hoặc 'Don hang bi giu, bam link de nap phi 15k...'"
                  rows={4}
                  className={`w-full p-4 rounded-2xl bg-slate-50/50 border-2 border-slate-200 focus:border-emerald-600 focus:bg-white focus:ring-4 focus:ring-emerald-500/10 text-slate-900 placeholder-slate-400 outline-none transition-all resize-none shadow-sm ${
                    isLargeFont ? "text-lg leading-relaxed" : "text-base"
                  }`}
                />
              </div>
            )}

            {/* IMAGE / QR / SCREENSHOT MODE */}
            {selectedMode === "image" && (
              <div className="space-y-3">
                <label className={`font-bold text-slate-800 flex items-center gap-2 ${isLargeFont ? "text-lg" : "text-sm"}`}>
                  <ImageIcon className="w-4 h-4 text-emerald-600" />
                  <span>Tải ảnh chụp màn hình tin nhắn, mã QR, giấy triệu tập hoặc hóa đơn:</span>
                </label>
                <div
                  onClick={() => fileInputRef.current?.click()}
                  className="border-2 border-dashed border-slate-300 hover:border-emerald-600 rounded-3xl p-6 sm:p-8 text-center cursor-pointer bg-slate-50/70 hover:bg-emerald-50/40 transition-all flex flex-col items-center justify-center gap-3 group shadow-sm"
                >
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleImageUpload}
                    className="hidden"
                  />
                  {imagePreview ? (
                    <div className="relative group max-w-sm">
                      <img
                        src={imagePreview}
                        alt="Ảnh cần kiểm tra"
                        className="max-h-60 rounded-2xl object-contain border border-slate-300 shadow-md"
                      />
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setImagePreview(null);
                        }}
                        className="absolute -top-2.5 -right-2.5 p-2 bg-rose-600 hover:bg-rose-700 text-white rounded-full shadow-lg transition-transform hover:scale-110"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  ) : (
                    <>
                      <div className="w-16 h-16 rounded-2xl bg-white border border-emerald-200 flex items-center justify-center text-emerald-600 group-hover:scale-110 transition-transform shadow-sm">
                        <Upload className="w-8 h-8" />
                      </div>
                      <div>
                        <p className={`font-bold text-slate-800 ${isLargeFont ? "text-lg" : "text-base"}`}>
                          Chạm vào đây để chọn ảnh từ máy hoặc chụp trực tiếp
                        </p>
                        <p className="text-xs text-slate-500 mt-1">
                          Hỗ trợ ảnh màn hình Zalo, Facebook, SMS, ảnh giấy mời hoặc mã QR chuyển tiền
                        </p>
                      </div>
                    </>
                  )}
                </div>

                <div className="space-y-1.5">
                  <span className="text-xs text-slate-500 font-medium">Ghi chú thêm về bức ảnh (nếu có):</span>
                  <input
                    type="text"
                    value={textContent}
                    onChange={(e) => setTextContent(e.target.value)}
                    placeholder="Ví dụ: 'Ảnh này gửi qua Zalo từ số lạ yêu cầu quét mã QR nạp tiền...'"
                    className="w-full px-4 py-3 rounded-xl bg-slate-50 border border-slate-200 text-slate-900 text-sm focus:border-emerald-600 focus:bg-white outline-none"
                  />
                </div>
              </div>
            )}

            {/* POLICE CALL VIDEO MODE */}
            {selectedMode === "police_call" && (
              <div className="space-y-3">
                <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 text-rose-900 text-sm flex items-start gap-3.5 shadow-sm">
                  <AlertTriangle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
                  <div>
                    <strong className="block text-rose-800 font-bold mb-1">
                      CẢNH BÁO QUAN TRỌNG TỪ BỘ CÔNG AN:
                    </strong>
                    <p className="text-xs text-rose-900/90 leading-relaxed">
                      Công an Việt Nam <strong>KHÔNG BAO GIỜ</strong> gọi video call làm việc, không bao giờ tống đạt lệnh bắt qua Zalo và không có "Tài khoản an toàn" để chuyển tiền. Mọi yêu cầu làm việc đều có giấy mời bằng văn bản gửi đến Công an Phường địa phương!
                    </p>
                  </div>
                </div>

                <label className={`font-bold text-slate-800 flex items-center gap-2 ${isLargeFont ? "text-lg" : "text-sm"}`}>
                  <Video className="w-4 h-4 text-rose-600" />
                  <span>Kể lại nội dung cuộc gọi video hoặc tải ảnh chụp màn hình cuộc gọi:</span>
                </label>
                <textarea
                  value={textContent}
                  onChange={(e) => setTextContent(e.target.value)}
                  placeholder="Ví dụ: 'Có người mặc sắc phục công an gọi video Zalo đọc đúng số CCCD của tôi, dọa tôi dính líu đường dây rửa tiền và bắt tôi chuyển tiền vào tài khoản thanh tra...'"
                  rows={4}
                  className={`w-full p-4 rounded-2xl bg-slate-50/50 border-2 border-rose-200 focus:border-rose-600 focus:bg-white focus:ring-4 focus:ring-rose-500/10 text-slate-900 placeholder-slate-400 outline-none transition-all resize-none ${
                    isLargeFont ? "text-lg leading-relaxed" : "text-base"
                  }`}
                />

                <div className="flex items-center gap-3 flex-wrap">
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="px-4 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200 text-xs font-bold flex items-center gap-2 transition-all cursor-pointer"
                  >
                    <Upload className="w-4 h-4 text-slate-600" />
                    <span>{imagePreview ? "Đã đính kèm ảnh chụp" : "Đính kèm ảnh chụp màn hình video call (nếu có)"}</span>
                  </button>
                  {imagePreview && (
                    <span className="text-xs text-emerald-700 font-bold flex items-center gap-1">
                      <CheckCircle2 className="w-4 h-4 text-emerald-600" /> Đã sẵn sàng ảnh
                    </span>
                  )}
                </div>
              </div>
            )}

            {/* LINK URL MODE */}
            {selectedMode === "link" && (
              <div className="space-y-3">
                <label className={`font-bold text-slate-800 flex items-center gap-2 ${isLargeFont ? "text-lg" : "text-sm"}`}>
                  <Link2 className="w-4 h-4 text-purple-600" />
                  <span>Dán đường link / trang web mà người lạ gửi cho bạn:</span>
                </label>
                <div className="relative">
                  <input
                    id="input-link-url"
                    type="text"
                    value={linkInput}
                    onChange={(e) => setLinkInput(e.target.value)}
                    placeholder="Ví dụ: http://ghtk-giaohang-xacnhan.top hoặc https://dichvucong-vneid.gov-vn.xyz"
                    className={`w-full p-4 pl-12 rounded-2xl bg-slate-50/50 border-2 border-slate-200 focus:border-purple-600 focus:bg-white focus:ring-4 focus:ring-purple-500/10 text-slate-900 placeholder-slate-400 outline-none transition-all shadow-sm ${
                      isLargeFont ? "text-lg" : "text-base"
                    }`}
                  />
                  <Link2 className="w-5 h-5 text-purple-600 absolute left-4 top-1/2 -translate-y-1/2" />
                </div>
                <p className="text-xs text-slate-500 flex items-center gap-1.5 font-medium">
                  <Info className="w-3.5 h-3.5 text-purple-600" />
                  Hệ thống kiểm tra an toàn danh tiếng tên miền mà không tải mã độc về thiết bị.
                </p>
              </div>
            )}

            {/* AUDIO / RECORDING MODE */}
            {selectedMode === "audio" && (
              <div className="space-y-4">
                <label className={`font-bold text-slate-800 flex items-center gap-2 ${isLargeFont ? "text-lg" : "text-sm"}`}>
                  <Mic className="w-4 h-4 text-amber-600" />
                  <span>Thu âm giọng nói của bạn hoặc tải tệp ghi âm cuộc gọi:</span>
                </label>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                  {/* Direct Microphone Recorder */}
                  <div className="p-5 rounded-2xl bg-slate-50 border-2 border-slate-200 flex flex-col items-center justify-center text-center gap-3 shadow-sm">
                    {isRecording ? (
                      <div className="flex flex-col items-center gap-2.5">
                        <div className="w-16 h-16 rounded-full bg-rose-600 animate-pulse flex items-center justify-center text-white shadow-xl shadow-rose-600/30">
                          <Mic className="w-8 h-8" />
                        </div>
                        <span className="text-rose-700 font-extrabold text-sm">
                          Đang ghi âm... ({recordingSeconds}s)
                        </span>
                        <button
                          type="button"
                          onClick={stopRecording}
                          className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold transition-all shadow-md cursor-pointer"
                        >
                          Dừng & Lưu ghi âm
                        </button>
                      </div>
                    ) : (
                      <div className="flex flex-col items-center gap-2">
                        <button
                          type="button"
                          onClick={startRecording}
                          className="w-16 h-16 rounded-full bg-emerald-600 hover:bg-emerald-700 flex items-center justify-center text-white shadow-lg shadow-emerald-600/25 transition-transform active:scale-95 cursor-pointer"
                        >
                          <Mic className="w-8 h-8" />
                        </button>
                        <span className={`font-bold text-slate-800 ${isLargeFont ? "text-base" : "text-sm"}`}>
                          Chạm để nói sự việc
                        </span>
                        <span className="text-xs text-slate-500">
                          (Nói tự nhiên: Ai gọi đến, họ nói gì và đòi gì?)
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Upload Audio File */}
                  <div
                    onClick={() => audioInputRef.current?.click()}
                    className="p-5 rounded-2xl bg-slate-50 border-2 border-slate-200 hover:border-amber-500 flex flex-col items-center justify-center text-center gap-2.5 cursor-pointer transition-colors shadow-sm"
                  >
                    <input
                      ref={audioInputRef}
                      type="file"
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

            {/* STORY / FREE TEXT MODE */}
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

            {/* PRIMARY CTA BUTTON */}
            <button
              id="btn-submit-analyze"
              type="submit"
              disabled={isAnalyzing}
              className={`w-full py-4 sm:py-5 px-6 rounded-2xl bg-gradient-to-r from-emerald-600 via-teal-600 to-emerald-600 hover:from-emerald-700 hover:to-teal-700 text-white font-black shadow-lg shadow-emerald-600/30 flex items-center justify-center gap-3 transition-all duration-200 active:scale-98 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed ${
                isLargeFont ? "text-2xl" : "text-xl"
              }`}
            >
              {isAnalyzing ? (
                <>
                  <div className="w-6 h-6 border-3 border-white border-t-transparent rounded-full animate-spin" />
                  <span>AI Đang Phân Tích Dữ Liệu...</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-6 h-6 text-white animate-pulse" />
                  <span>Kiểm Tra Tình Huống Ngay</span>
                  <ArrowRight className="w-6 h-6" />
                </>
              )}
            </button>
          </form>

          {/* Privacy Guarantee Note */}
          <div className="pt-2 flex items-center justify-center gap-4 text-xs text-slate-500 text-center flex-wrap font-medium">
            <span className="flex items-center gap-1.5">
              <Lock className="w-3.5 h-3.5 text-emerald-600" /> Không lưu số tài khoản & mã OTP
            </span>
            <span>•</span>
            <span className="flex items-center gap-1.5">
              <ShieldCheck className="w-3.5 h-3.5 text-blue-600" /> Tự động che thông tin cá nhân
            </span>
            <span>•</span>
            <span className="flex items-center gap-1.5">
              <Volume2 className="w-3.5 h-3.5 text-amber-600" /> Hỗ trợ đọc to kết quả
            </span>
          </div>
        </div>
      </div>

      {/* QUICK DEMO SHOWCASE SECTION */}
      <div className="space-y-4 pt-1">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center gap-2.5">
            <span className="w-3 h-3 rounded-full bg-amber-500 animate-ping" />
            <h2 className={`font-black text-slate-900 ${isLargeFont ? "text-xl" : "text-lg"}`}>
              Trải Nghiệm Nhanh 3 Tình Huống Mẫu Điển Hình
            </h2>
          </div>
          <span className="text-xs text-slate-500 font-medium">Bấm để xem phân tích AI tức thì</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {DEMO_SCENARIOS.map((scenario, index) => (
            <div
              key={scenario.id}
              id={`btn-demo-scenario-${scenario.id}`}
              onClick={() => onSelectDemoScenario(scenario)}
              className="p-5 rounded-3xl bg-white hover:bg-slate-50/80 border border-slate-200 hover:border-emerald-500 cursor-pointer transition-all duration-300 shadow-sm group flex flex-col justify-between hover:shadow-md hover:-translate-y-0.5"
            >
              <div className="space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="px-2.5 py-1 rounded-lg bg-amber-50 border border-amber-200 text-amber-800 text-xs font-bold">
                    Tình huống #{index + 1}
                  </span>
                  <span className="text-[11px] font-bold text-slate-600 bg-slate-100 px-2 py-0.5 rounded-md">
                    {scenario.tag}
                  </span>
                </div>
                <h3 className="font-black text-slate-900 text-sm group-hover:text-emerald-700 transition-colors line-clamp-1">
                  {scenario.title}
                </h3>
                <p className="text-xs text-slate-600 line-clamp-2 leading-relaxed font-medium">
                  {scenario.victimScenario}
                </p>
              </div>

              <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs font-bold text-emerald-700 group-hover:text-emerald-800">
                <span>Xem kết quả phân tích</span>
                <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};
