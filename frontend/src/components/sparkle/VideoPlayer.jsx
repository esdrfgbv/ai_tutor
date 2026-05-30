// VideoPlayer.jsx - Full AI Video Player with TTS narration, slide navigation, and chat sidebar
import { useEffect, useMemo, useRef, useState } from "react";
import {
  Play, Pause, RotateCcw, Send, ArrowLeft, Loader2, Volume2,
  Sparkles, ChevronRight, PartyPopper, Brain,
} from "lucide-react";
import { SlideText } from "./SlideText.jsx";
import { SlideImage } from "./SlideImage.jsx";
import { chatAboutSlide } from "../../lib/groq.js";
import { sanitizeForSpeech } from "../../lib/speech.js";
import { Mascot } from "./Mascot.jsx";

function estimateTotal(data) {
  return data.slides.reduce((acc, s) => acc + Math.max(2.5, s.voice_script.length / 14), 0);
}

function fmtTime(seconds) {
  const s = Math.max(0, Math.floor(seconds));
  const m = Math.floor(s / 60);
  const r = s % 60;
  return `${m}:${r.toString().padStart(2, "0")}`;
}

export function VideoPlayer({ data, onExit, language = "english", category }) {
  const [index, setIndex] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [revealed, setRevealed] = useState(0);
  const [chat, setChat] = useState([
    { role: "assistant", content: "Your video is ready! Press play to start. You can ask doubts any time." },
  ]);
  const [doubt, setDoubt] = useState("");
  const [thinking, setThinking] = useState(false);
  const [slideAnim, setSlideAnim] = useState("idle");
  const [completed, setCompleted] = useState(false);
  const [speaking, setSpeaking] = useState(false);

  const indexRef = useRef(0);
  const utterRef = useRef(null);
  const revealTimerRef = useRef(null);
  const chatEndRef = useRef(null);

  useEffect(() => { indexRef.current = index; }, [index]);

  useEffect(() => {
    return () => {
      window.speechSynthesis.cancel();
      if (revealTimerRef.current) clearInterval(revealTimerRef.current);
    };
  }, []);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chat, thinking]);

  const slide = data.slides[index];
  const speechText = useMemo(() => sanitizeForSpeech(slide.voice_script), [slide]);
  const progress = (index + (revealed / Math.max(1, slide.display_text.length))) / data.slides.length;

  const stopReveal = () => {
    if (revealTimerRef.current) {
      clearInterval(revealTimerRef.current);
      revealTimerRef.current = null;
    }
  };

  const startFallbackTimer = (durationMs, displayLen) => {
    stopReveal();
    const start = performance.now();
    revealTimerRef.current = setInterval(() => {
      const elapsed = performance.now() - start;
      const pct = Math.min(1, elapsed / durationMs);
      setRevealed(Math.floor(displayLen * pct));
      if (pct >= 1) stopReveal();
    }, 50);
  };

  useEffect(() => {
    setSlideAnim("enter");
    const t = setTimeout(() => setSlideAnim("idle"), 500);
    return () => clearTimeout(t);
  }, [index]);

  const speakSlide = (i) => {
    window.speechSynthesis.cancel();
    stopReveal();
    setRevealed(0);

    if (i >= data.slides.length) {
      setPlaying(false);
      setSpeaking(false);
      setCompleted(true);
      return;
    }

    const s = data.slides[i];
    const text = sanitizeForSpeech(s.voice_script);
    const u = new SpeechSynthesisUtterance(text);
    u.rate = 1;
    u.pitch = 1;

    const voices = window.speechSynthesis.getVoices();
    const isHindi = language === "hindi";
    const preferred = isHindi
      ? voices.find((v) => /hi-IN/.test(v.lang)) || voices.find((v) => /hi/i.test(v.lang))
      : voices.find((v) => /en-US|en-GB/.test(v.lang) && /Google|Natural|Samantha|Daniel/i.test(v.name)) ||
        voices.find((v) => /en-/i.test(v.lang));
    if (preferred) u.voice = preferred;

    // Start fallback timer in case boundary events don't fire
    const estDuration = Math.max(2500, (text.length / 14) * 1000);
    setTimeout(() => startFallbackTimer(estDuration, s.display_text.length), 800);

    u.onboundary = (e) => {
      if (typeof e.charIndex === "number" && text.length > 0) {
        const pct = Math.min(1, e.charIndex / text.length + 0.08);
        setRevealed(Math.floor(s.display_text.length * pct));
      }
    };
    u.onstart = () => { setSpeaking(true); setRevealed(0); };
    u.onend = () => {
      setSpeaking(false);
      stopReveal();
      setRevealed(s.display_text.length);
      if (indexRef.current === i) {
        const next = i + 1;
        if (next < data.slides.length) {
          setSlideAnim("exit");
          setTimeout(() => {
            setIndex(next);
            speakSlide(next);
          }, 400);
        } else {
          setPlaying(false);
          setCompleted(true);
        }
      }
    };
    u.onerror = () => { setSpeaking(false); stopReveal(); };

    utterRef.current = u;
    window.speechSynthesis.speak(u);
  };

  const handlePlay = () => {
    setPlaying(true);
    setCompleted(false);
    speakSlide(index);
  };

  const handlePause = () => {
    setPlaying(false);
    setSpeaking(false);
    window.speechSynthesis.cancel();
    stopReveal();
  };

  const handleRestart = () => {
    window.speechSynthesis.cancel();
    stopReveal();
    setIndex(0);
    setRevealed(0);
    setCompleted(false);
    setSpeaking(false);
    setPlaying(true);
    setTimeout(() => speakSlide(0), 50);
  };

  const exitPlayer = () => {
    window.speechSynthesis.cancel();
    stopReveal();
    onExit();
  };

  const jumpTo = (i) => {
    window.speechSynthesis.cancel();
    stopReveal();
    setCompleted(false);
    setSpeaking(false);
    setIndex(i);
    setRevealed(0);
    if (playing) setTimeout(() => speakSlide(i), 100);
  };

  const sendDoubt = async () => {
    const q = doubt.trim();
    if (!q) return;
    handlePause();
    setChat((c) => [...c, { role: "user", content: q }]);
    setDoubt("");
    setThinking(true);
    try {
      const ans = await chatAboutSlide({
        title: data.title,
        displayText: slide.display_text,
        voiceScript: slide.voice_script,
        doubt: q,
      });
      setChat((c) => [...c, { role: "assistant", content: ans }]);
    } catch (e) {
      setChat((c) => [...c, { role: "assistant", content: `Error: ${e.message}` }]);
    } finally {
      setThinking(false);
    }
  };

  // Completion screen
  if (completed && !playing) {
    return (
      <div
        className="flex flex-col items-center justify-center min-h-[500px] rounded-2xl p-10 text-center"
        style={{ background: "rgba(173,255,68,0.04)", border: "1px solid rgba(173,255,68,0.12)" }}
      >
        <div className="text-6xl mb-4">🎉</div>
        <h2 className="text-2xl font-bold mb-2" style={{ color: "#ADFF44" }}>
          Video Complete!
        </h2>
        <p className="text-white/50 mb-2">
          <span className="text-white/80 font-medium">{data.title}</span>
        </p>
        <p className="text-sm text-white/30 mb-8">{data.slides.length} slides covered</p>
        <div className="flex gap-3">
          <button
            onClick={handleRestart}
            className="flex items-center gap-2 px-6 py-2.5 rounded-xl font-medium text-sm transition-all"
            style={{ background: "#ADFF44", color: "#000" }}
          >
            <RotateCcw className="w-4 h-4" /> Watch Again
          </button>
          <button
            onClick={exitPlayer}
            className="flex items-center gap-2 px-6 py-2.5 rounded-xl font-medium text-sm transition-all text-white/60 hover:text-white"
            style={{ border: "1px solid rgba(255,255,255,0.1)" }}
          >
            New Topic
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      {/* Top bar */}
      <div className="flex items-center justify-between">
        <button
          onClick={exitPlayer}
          className="flex items-center gap-2 text-sm text-white/50 hover:text-white transition-colors"
        >
          <ArrowLeft className="w-4 h-4" /> Back to Topics
        </button>
        <div className="flex items-center gap-2 text-sm text-white/40">
          <span style={{ color: "#ADFF44" }}>🎓</span>
          <span className="text-white/60 font-medium">{data.title}</span>
          {category && (
            <span
              className="text-xs px-2 py-0.5 rounded-full uppercase tracking-wider"
              style={{ background: "rgba(173,255,68,0.1)", color: "rgba(173,255,68,0.7)", border: "1px solid rgba(173,255,68,0.2)" }}
            >
              {category}
            </span>
          )}
        </div>
        <span className="text-xs font-mono text-white/30">
          {fmtTime(progress * estimateTotal(data))} / {fmtTime(estimateTotal(data))}
        </span>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Slide board */}
        <div className="lg:col-span-2">
          <div
            className="relative rounded-2xl overflow-hidden"
            style={{ background: "linear-gradient(135deg, #0f0f1a, #1a0f1a)", border: "1px solid rgba(173,255,68,0.15)" }}
          >
            {/* AI badge */}
            <div className="absolute top-4 right-4 z-10">
              <div
                className="flex items-center gap-1.5 px-3 py-1 rounded-full text-xs"
                style={{ background: "rgba(0,0,0,0.7)", border: "1px solid rgba(173,255,68,0.3)", color: "rgba(173,255,68,0.8)" }}
              >
                <span
                  className="w-1.5 h-1.5 rounded-full animate-pulse"
                  style={{ background: "#ADFF44" }}
                />
                AI TUTOR
              </div>
            </div>

            {/* Speaking wave */}
            {speaking && (
              <div className="absolute top-4 left-1/2 -translate-x-1/2 flex items-end gap-0.5 h-4 z-10">
                {[1, 2, 3, 4, 5, 4, 3, 2, 1].map((h, i) => (
                  <span
                    key={i}
                    className="w-0.5 rounded-full animate-bounce"
                    style={{
                      height: h * 3,
                      background: "rgba(173,255,68,0.6)",
                      animationDelay: `${i * 0.1}s`,
                    }}
                  />
                ))}
              </div>
            )}

            {/* Slide content */}
            <div
              className="p-6 min-h-[280px] flex gap-4"
              style={{
                opacity: slideAnim === "idle" ? 1 : 0,
                transform: slideAnim === "enter" ? "translateY(10px)" : "translateY(0)",
                transition: "all 0.4s ease",
              }}
            >
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-4 text-xs text-white/30 font-mono">
                  <span
                    className="w-6 h-px"
                    style={{ background: speaking ? "#ADFF44" : "rgba(255,255,255,0.2)" }}
                  />
                  STEP {index + 1}
                  {speaking && (
                    <span className="flex gap-0.5 ml-1">
                      {[1, 2, 3].map((i) => (
                        <span
                          key={i}
                          className="w-1 h-1 rounded-full animate-bounce"
                          style={{ background: "#ADFF44", animationDelay: `${(i - 1) * 0.15}s` }}
                        />
                      ))}
                    </span>
                  )}
                </div>
                <SlideText text={slide.display_text} revealChars={revealed} />
              </div>
              <div className="hidden sm:block w-48 shrink-0">
                <div className="h-48 rounded-xl overflow-hidden">
                  <SlideImage text={slide.display_text} speaking={speaking} />
                </div>
              </div>
            </div>

            {/* Mascot */}
            <div className="absolute bottom-14 left-4">
              <Mascot speaking={speaking} emotion={speaking ? "happy" : "neutral"} />
            </div>

            {/* Progress bar */}
            <div className="px-4 pb-3">
              <div
                className="relative h-1.5 rounded-full overflow-hidden"
                style={{ background: "rgba(255,255,255,0.05)" }}
              >
                <div
                  className="absolute inset-y-0 left-0 rounded-full transition-all duration-300"
                  style={{ width: `${progress * 100}%`, background: "linear-gradient(90deg, #ADFF44, #8CD430)" }}
                />
              </div>
            </div>

            {/* Controls */}
            <div
              className="px-4 py-3 flex items-center justify-between"
              style={{ borderTop: "1px solid rgba(255,255,255,0.05)", background: "rgba(0,0,0,0.4)" }}
            >
              <div className="flex items-center gap-3">
                <button
                  onClick={handleRestart}
                  className="p-1.5 text-white/40 hover:text-white transition-colors"
                  title="Restart"
                >
                  <RotateCcw className="w-4 h-4" />
                </button>
                <Volume2
                  className="w-4 h-4 transition-colors"
                  style={{ color: speaking ? "#ADFF44" : "rgba(255,255,255,0.3)" }}
                />
              </div>

              <div className="flex items-center gap-3">
                <button
                  onClick={() => jumpTo(Math.max(0, index - 1))}
                  disabled={index === 0}
                  className="p-1.5 text-white/40 hover:text-white disabled:opacity-30 transition-colors"
                >
                  <ChevronRight className="w-4 h-4 rotate-180" />
                </button>
                {playing ? (
                  <button
                    onClick={handlePause}
                    className="w-10 h-10 rounded-full flex items-center justify-center transition-all"
                    style={{ background: "linear-gradient(135deg, #ADFF44, #8CD430)" }}
                  >
                    <Pause className="w-5 h-5 text-black" />
                  </button>
                ) : (
                  <button
                    onClick={handlePlay}
                    className="w-10 h-10 rounded-full flex items-center justify-center transition-all"
                    style={{ background: "linear-gradient(135deg, #ADFF44, #8CD430)" }}
                  >
                    <Play className="w-5 h-5 text-black ml-0.5" />
                  </button>
                )}
                <button
                  onClick={() => jumpTo(Math.min(data.slides.length - 1, index + 1))}
                  disabled={index >= data.slides.length - 1}
                  className="p-1.5 text-white/40 hover:text-white disabled:opacity-30 transition-colors"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>

              {/* Slide dots */}
              <div className="flex items-center gap-1.5">
                {data.slides.map((_, i) => (
                  <button
                    key={i}
                    onClick={() => jumpTo(i)}
                    className="w-2 h-2 rounded-full transition-all"
                    style={{
                      background:
                        i === index
                          ? "#ADFF44"
                          : i < index
                          ? "rgba(255,255,255,0.4)"
                          : "rgba(255,255,255,0.1)",
                      transform: i === index ? "scale(1.25)" : "scale(1)",
                    }}
                  />
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Chat sidebar */}
        <div className="flex flex-col rounded-2xl overflow-hidden" style={{ border: "1px solid rgba(255,255,255,0.06)", background: "rgba(10,10,10,0.8)" }}>
          <div className="px-4 py-3 flex items-center gap-2" style={{ borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
            <span className="w-2 h-2 rounded-full animate-pulse" style={{ background: "#ADFF44" }} />
            <span className="text-sm text-white/70">Ask a doubt</span>
          </div>
          <div className="flex-1 overflow-y-auto p-4 space-y-3 min-h-[200px] max-h-[300px] lg:max-h-none">
            <p className="text-xs text-white/20">Doubts about what's on screen? Ask here.</p>
            {chat.map((m, i) => (
              <div
                key={i}
                className={`text-sm rounded-2xl px-3 py-2 max-w-[95%] ${
                  m.role === "user" ? "ml-auto text-right" : ""
                }`}
                style={{
                  background:
                    m.role === "user"
                      ? "linear-gradient(135deg, rgba(173,255,68,0.8), rgba(140,212,48,0.8))"
                      : "rgba(255,255,255,0.05)",
                  color: m.role === "user" ? "#000" : "rgba(255,255,255,0.8)",
                  border: m.role === "user" ? "none" : "1px solid rgba(255,255,255,0.06)",
                }}
              >
                {m.content}
              </div>
            ))}
            {thinking && (
              <div className="flex items-center gap-2 text-xs text-white/40">
                <Loader2 className="w-3 h-3 animate-spin" style={{ color: "#ADFF44" }} />
                Thinking…
              </div>
            )}
            <div ref={chatEndRef} />
          </div>
          <div
            className="p-2 flex gap-2"
            style={{ borderTop: "1px solid rgba(255,255,255,0.06)", background: "rgba(0,0,0,0.3)" }}
          >
            <input
              value={doubt}
              onChange={(e) => setDoubt(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") sendDoubt(); }}
              placeholder="Ask your doubt…"
              className="flex-1 text-sm px-3 py-2 rounded-xl outline-none"
              style={{
                background: "rgba(255,255,255,0.05)",
                border: "1px solid rgba(255,255,255,0.1)",
                color: "#fff",
              }}
            />
            <button
              onClick={sendDoubt}
              disabled={thinking || !doubt.trim()}
              className="p-2 rounded-xl flex items-center justify-center transition-all disabled:opacity-30"
              style={{ background: "linear-gradient(135deg, #ADFF44, #8CD430)" }}
            >
              <Send className="w-4 h-4 text-black" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
