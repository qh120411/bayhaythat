// Web Speech API Voice synthesis helper for elderly & accessible Vietnamese reading

let currentUtterance: SpeechSynthesisUtterance | null = null;

export function speakVietnamese(
  text: string,
  onStart?: () => void,
  onEnd?: () => void,
  onError?: (err: any) => void
) {
  if (!("speechSynthesis" in window)) {
    console.warn("Speech Synthesis is not supported in this browser.");
    return false;
  }

  // Cancel any ongoing speech
  window.speechSynthesis.cancel();

  // Clean text: strip markdown characters or asterisks
  const cleanText = text
    .replace(/[*_#`~]/g, "")
    .replace(/\s+/g, " ")
    .trim();

  const utterance = new SpeechSynthesisUtterance(cleanText);
  utterance.lang = "vi-VN";
  utterance.rate = 0.95; // Slightly calmer and clear for elderly listeners
  utterance.pitch = 1.0;

  // Try to find a Vietnamese voice if available
  const voices = window.speechSynthesis.getVoices();
  const viVoice = voices.find((v) => v.lang.includes("vi") || v.name.toLowerCase().includes("vietnam"));
  if (viVoice) {
    utterance.voice = viVoice;
  }

  utterance.onstart = () => {
    currentUtterance = utterance;
    onStart?.();
  };

  utterance.onend = () => {
    currentUtterance = null;
    onEnd?.();
  };

  utterance.onerror = (e) => {
    currentUtterance = null;
    onError?.(e);
  };

  window.speechSynthesis.speak(utterance);
  return true;
}

export function stopSpeaking() {
  if ("speechSynthesis" in window) {
    window.speechSynthesis.cancel();
    currentUtterance = null;
  }
}

export function isSpeaking(): boolean {
  if (!("speechSynthesis" in window)) return false;
  return window.speechSynthesis.speaking;
}
