import React, { useState, useRef, useEffect } from "react";
import { Sparkles, Send, Bot, User, Trash2, HelpCircle } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";

interface Message {
  role: "user" | "ai";
  text: string;
}

const PRESET_PROMPTS = [
  "Apakah ada guru yang jadwal mengajarnya bertabrakan?",
  "Berapa rata-rata tingkat kehadiran guru hari ini?",
  "Berikan ringkasan log aktivitas presensi terbaru.",
  "Bagaimana cara mengoptimalkan pembagian jadwal mengajar?"
];

export default function AIChatThinking() {
  const [messages, setMessages] = useState<Message[]>([
    {
      role: "ai",
      text: "Assalamu'alaikum! Saya Asisten AI Pondok Pesantren Al-Huda. Saya dapat membantu Anda menganalisis jadwal mengajar guru, mengevaluasi konflik, menyusun rekap absensi, atau memberikan rekomendasi administrasi. Ada yang bisa saya bantu hari ini?"
    }
  ]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [loadingStep, setLoadingStep] = useState(0);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const steps = [
    "Memulai penalaran mendalam...",
    "Menganalisis jadwal mengajar & database guru...",
    "Mengevaluasi rekam medis presensi hari ini...",
    "Merumuskan solusi bebas konflik..."
  ];

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isLoading]);

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isLoading) {
      interval = setInterval(() => {
        setLoadingStep((prev) => (prev + 1) % steps.length);
      }, 3500);
    } else {
      setLoadingStep(0);
    }
    return () => clearInterval(interval);
  }, [isLoading]);

  const handleSend = async (textToSend: string) => {
    if (!textToSend.trim() || isLoading) return;

    const userMsg = textToSend.trim();
    setInput("");
    setMessages((prev) => [...prev, { role: "user", text: userMsg }]);
    setIsLoading(true);

    try {
      const res = await fetch("/api/gemini/assist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt: userMsg })
      });

      const data = await res.json();
      if (res.ok && data.text) {
        setMessages((prev) => [...prev, { role: "ai", text: data.text }]);
      } else {
        setMessages((prev) => [
          ...prev,
          {
            role: "ai",
            text: "Maaf, terjadi kesalahan saat menghubungi asisten AI: " + (data.error || "Gagal memproses.")
          }
        ]);
      }
    } catch (err: any) {
      setMessages((prev) => [
        ...prev,
        {
          role: "ai",
          text: "Maaf, gagal menghubungi server AI. Pastikan server berjalan dan koneksi stabil."
        }
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const clearChat = () => {
    setMessages([
      {
        role: "ai",
        text: "Pesan dibersihkan. Silakan tanyakan hal lain seputar jadwal, rekap guru, atau presensi Pondok!"
      }
    ]);
  };

  return (
    <div className="flex flex-col h-[520px] bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden" id="ai-chat-assistant">
      {/* Header */}
      <div className="bg-gradient-to-r from-emerald-800 to-emerald-600 text-white p-4 flex items-center justify-between shadow-sm">
        <div className="flex items-center gap-2">
          <div className="p-1.5 bg-emerald-500/20 rounded-lg border border-emerald-400/30">
            <Sparkles className="w-5 h-5 text-emerald-200 animate-pulse" />
          </div>
          <div>
            <h3 className="font-semibold text-sm tracking-tight flex items-center gap-1.5">
              Asisten AI Pintar
              <span className="text-[10px] bg-emerald-900/50 px-1.5 py-0.5 rounded-full border border-emerald-400/30 text-emerald-100">
                HIGH THINKING
              </span>
            </h3>
            <p className="text-[10px] text-emerald-100 font-mono">Powered by configurable AI provider</p>
          </div>
        </div>
        <button
          onClick={clearChat}
          className="p-1.5 hover:bg-emerald-700/50 rounded-lg text-emerald-100 transition-colors"
          title="Bersihkan obrolan"
        >
          <Trash2 className="w-4 h-4" />
        </button>
      </div>

      {/* Chat Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-50/50">
        <AnimatePresence initial={false}>
          {messages.map((m, idx) => (
            <motion.div
              key={idx}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className={`flex gap-3 max-w-[85%] ${m.role === "user" ? "ml-auto flex-row-reverse" : ""}`}
            >
              <div
                className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 shadow-sm ${
                  m.role === "user" ? "bg-emerald-600 text-white" : "bg-white border border-gray-100 text-emerald-700"
                }`}
              >
                {m.role === "user" ? <User className="w-4 h-4" /> : <Bot className="w-4 h-4" />}
              </div>
              <div
                className={`p-3 rounded-2xl text-xs leading-relaxed shadow-sm ${
                  m.role === "user"
                    ? "bg-emerald-600 text-white rounded-tr-none"
                    : "bg-white border border-gray-100 text-gray-800 rounded-tl-none whitespace-pre-line"
                }`}
              >
                {m.text}
              </div>
            </motion.div>
          ))}
        </AnimatePresence>

        {/* Loading Indicator with reasoning stages */}
        {isLoading && (
          <div className="flex gap-3 max-w-[85%]">
            <div className="w-8 h-8 rounded-full flex items-center justify-center shrink-0 bg-white border border-gray-100 text-emerald-700 shadow-sm">
              <Bot className="w-4 h-4 animate-spin text-emerald-600" />
            </div>
            <div className="bg-white border border-gray-100 p-3 rounded-2xl rounded-tl-none text-xs text-gray-500 shadow-sm flex flex-col gap-1.5">
              <div className="flex items-center gap-2">
                <span className="font-medium text-emerald-700">Asisten AI sedang berpikir...</span>
              </div>
              <div className="text-[10px] text-gray-400 font-mono animate-pulse">
                {steps[loadingStep]}
              </div>
              <div className="w-24 h-1 bg-gray-100 rounded-full overflow-hidden mt-1">
                <div className="h-full bg-emerald-600 animate-infinite-loading rounded-full" style={{ width: "60%" }}></div>
              </div>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Preset Buttons */}
      {messages.length === 1 && (
        <div className="p-3 bg-gray-50 border-t border-gray-100 flex flex-wrap gap-2">
          <p className="text-[10px] text-gray-400 w-full mb-1 flex items-center gap-1">
            <HelpCircle className="w-3 h-3 text-emerald-600" /> Coba pertanyaan berikut:
          </p>
          {PRESET_PROMPTS.map((p, i) => (
            <button
              key={i}
              onClick={() => handleSend(p)}
              className="text-[10px] bg-white border border-gray-200 text-gray-600 hover:text-emerald-700 hover:border-emerald-200 px-2.5 py-1.5 rounded-full transition-all text-left truncate max-w-full"
            >
              {p}
            </button>
          ))}
        </div>
      )}

      {/* Input */}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          handleSend(input);
        }}
        className="p-3 bg-white border-t border-gray-100 flex gap-2 items-center"
      >
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          disabled={isLoading}
          placeholder="Tanyakan analisis jadwal pondok..."
          className="flex-1 bg-gray-50 border border-gray-200 focus:border-emerald-500 focus:bg-white text-xs px-3.5 py-2.5 rounded-xl outline-none transition-all placeholder:text-gray-400"
        />
        <button
          type="submit"
          disabled={!input.trim() || isLoading}
          className="p-2.5 bg-emerald-700 text-white rounded-xl hover:bg-emerald-800 disabled:opacity-40 disabled:hover:bg-emerald-700 transition-colors cursor-pointer"
        >
          <Send className="w-4 h-4" />
        </button>
      </form>
    </div>
  );
}
