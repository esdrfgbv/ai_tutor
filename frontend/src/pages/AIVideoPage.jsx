// AIVideoPage.jsx - AI Video Tutor page
import { useState } from "react";
import { Loader2, Sparkles, ChevronDown } from "lucide-react";
import { generateVideo, CATEGORIES } from "../lib/groq.js";
import { VideoPlayer } from "../components/sparkle/VideoPlayer.jsx";
import { FloatingShapes } from "../components/sparkle/FloatingShapes.jsx";

const SAMPLE_TOPICS = [
  "What is Photosynthesis?",
  "How to find HCF and LCM",
  "Noun clauses in English",
  "Speed, Distance and Time problems",
  "What is the water cycle?",
  "Profit and Loss calculations",
  "Parts of a plant cell",
  "Odd one out puzzles",
];

export default function AIVideoPage() {
  const [topic, setTopic] = useState("");
  const [category, setCategory] = useState("general");
  const [language, setLanguage] = useState("english");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [videoData, setVideoData] = useState(null);
  const [showCatMenu, setShowCatMenu] = useState(false);

  const selectedCat = CATEGORIES.find((c) => c.id === category) || CATEGORIES[0];

  const handleGenerate = async () => {
    if (!topic.trim()) return;
    setLoading(true);
    setError("");
    setVideoData(null);
    try {
      const data = await generateVideo(topic.trim(), language, category);
      setVideoData(data);
    } catch (e) {
      setError(e.message.includes("401") ? "API key error — please check your Groq key." : e.message);
    } finally {
      setLoading(false);
    }
  };

  const handleExit = () => {
    setVideoData(null);
    setLoading(false);
  };

  return (
    <div className="relative min-h-screen">
      <FloatingShapes variant={videoData ? "player" : "landing"} />

      <div className="relative z-10">
        {!videoData ? (
          <div className="max-w-3xl mx-auto">
            {/* Header */}
            <div className="text-center mb-10">
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full text-xs mb-5"
                style={{ background: "rgba(173,255,68,0.1)", border: "1px solid rgba(173,255,68,0.2)", color: "rgba(173,255,68,0.8)" }}>
                <span className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ background: "#ADFF44" }} />
                AI Video Tutor · Powered by Groq
              </div>
              <h1 className="text-4xl font-bold text-white mb-3 leading-tight">
                Learn Anything in{" "}
                <span style={{ color: "#ADFF44" }}>60 Seconds</span>
              </h1>
              <p className="text-white/40 text-base max-w-xl mx-auto">
                Type any topic and get an interactive AI-narrated video lecture with slide-by-slide explanations,
                perfectly tailored for JNV & Sainik School prep.
              </p>
            </div>

            {/* Input card */}
            <div className="p-6 rounded-2xl mb-6" style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.08)" }}>
              <label className="block text-xs font-medium text-white/40 mb-3 uppercase tracking-wider">Enter your topic</label>
              <textarea
                value={topic}
                onChange={(e) => setTopic(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && (e.ctrlKey || e.metaKey) && !loading) handleGenerate();
                }}
                placeholder="e.g. How to find HCF and LCM step by step"
                className="w-full rounded-xl px-4 py-3 text-sm resize-none outline-none transition-all"
                rows={3}
                style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)", color: "rgba(255,255,255,0.85)", caretColor: "#ADFF44" }}
              />

              <div className="flex flex-wrap gap-3 mt-4">
                {/* Category selector */}
                <div className="relative">
                  <button
                    onClick={() => setShowCatMenu((p) => !p)}
                    className="flex items-center gap-2 px-3 py-2 rounded-xl text-sm transition-all"
                    style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)", color: "rgba(255,255,255,0.6)" }}
                  >
                    <span>{selectedCat.icon}</span>
                    <span>{selectedCat.label}</span>
                    <ChevronDown className="w-3 h-3" />
                  </button>
                  {showCatMenu && (
                    <div
                      className="absolute top-full left-0 mt-1 z-50 p-1 rounded-xl min-w-[180px] space-y-0.5"
                      style={{ background: "rgba(15,15,15,0.98)", border: "1px solid rgba(255,255,255,0.1)", boxShadow: "0 20px 60px rgba(0,0,0,0.8)" }}
                    >
                      {CATEGORIES.map((cat) => (
                        <button
                          key={cat.id}
                          onClick={() => { setCategory(cat.id); setShowCatMenu(false); }}
                          className="w-full text-left flex items-center gap-2 px-3 py-2 rounded-lg text-xs transition-all"
                          style={{
                            background: category === cat.id ? "rgba(173,255,68,0.1)" : "transparent",
                            color: category === cat.id ? "#ADFF44" : "rgba(255,255,255,0.55)",
                          }}
                        >
                          <span>{cat.icon}</span>
                          <div>
                            <div className="font-medium">{cat.label}</div>
                            <div className="text-xs opacity-50">{cat.desc}</div>
                          </div>
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                {/* Language toggle */}
                <div className="flex items-center gap-0 rounded-xl overflow-hidden" style={{ border: "1px solid rgba(255,255,255,0.1)" }}>
                  {["english", "hindi"].map((lang) => (
                    <button
                      key={lang}
                      onClick={() => setLanguage(lang)}
                      className="px-3 py-2 text-xs font-medium transition-all capitalize"
                      style={{
                        background: language === lang ? "#ADFF44" : "rgba(255,255,255,0.05)",
                        color: language === lang ? "#000" : "rgba(255,255,255,0.4)",
                      }}
                    >
                      {lang === "english" ? "🇬🇧 English" : "🇮🇳 Hindi"}
                    </button>
                  ))}
                </div>

                <button
                  onClick={handleGenerate}
                  disabled={!topic.trim() || loading}
                  className="ml-auto flex items-center gap-2 px-6 py-2 rounded-xl font-medium text-sm transition-all disabled:opacity-40"
                  style={{ background: "linear-gradient(135deg, #ADFF44, #8CD430)", color: "#000" }}
                >
                  {loading ? (
                    <><Loader2 className="w-4 h-4 animate-spin" /> Generating…</>
                  ) : (
                    <><Sparkles className="w-4 h-4" /> Generate Video</>
                  )}
                </button>
              </div>

              {loading && (
                <div className="mt-4 flex items-center gap-3 p-3 rounded-xl" style={{ background: "rgba(173,255,68,0.05)", border: "1px solid rgba(173,255,68,0.1)" }}>
                  <Loader2 className="w-4 h-4 animate-spin" style={{ color: "#ADFF44" }} />
                  <span className="text-xs text-white/50">AI is creating your personalized lecture slides…</span>
                </div>
              )}

              {error && (
                <div className="mt-4 p-3 rounded-xl text-xs text-red-300" style={{ background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.2)" }}>
                  {error}
                </div>
              )}
            </div>

            {/* Sample topics */}
            <div>
              <p className="text-xs text-white/30 mb-3 text-center">Or try a sample topic →</p>
              <div className="flex flex-wrap gap-2 justify-center">
                {SAMPLE_TOPICS.map((t) => (
                  <button
                    key={t}
                    onClick={() => { setTopic(t); }}
                    className="text-xs px-3 py-1.5 rounded-full transition-all"
                    style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.07)", color: "rgba(255,255,255,0.35)" }}
                    onMouseEnter={(e) => { e.currentTarget.style.background = "rgba(173,255,68,0.08)"; e.currentTarget.style.color = "rgba(173,255,68,0.8)"; e.currentTarget.style.borderColor = "rgba(173,255,68,0.2)"; }}
                    onMouseLeave={(e) => { e.currentTarget.style.background = "rgba(255,255,255,0.04)"; e.currentTarget.style.color = "rgba(255,255,255,0.35)"; e.currentTarget.style.borderColor = "rgba(255,255,255,0.07)"; }}
                  >
                    {t}
                  </button>
                ))}
              </div>
            </div>

            {/* Feature highlights */}
            <div className="grid grid-cols-3 gap-4 mt-10">
              {[
                { icon: "🎙️", title: "TTS Narration", desc: "Natural voice reads every slide — English & Hindi" },
                { icon: "💬", title: "Ask Doubts", desc: "Chat sidebar lets you ask questions mid-video" },
                { icon: "📊", title: "Smart Slides", desc: "Step-by-step logic with progressive text reveal" },
              ].map((f) => (
                <div key={f.title} className="p-4 rounded-xl text-center" style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.05)" }}>
                  <div className="text-2xl mb-2">{f.icon}</div>
                  <p className="text-xs font-medium text-white/60 mb-1">{f.title}</p>
                  <p className="text-xs text-white/25">{f.desc}</p>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <VideoPlayer data={videoData} onExit={handleExit} language={language} category={selectedCat.label} />
        )}
      </div>
    </div>
  );
}
