// AIVideoPage.jsx - AI Video Tutor page
import { useState } from "react";
import { Loader2, Sparkles, ChevronDown } from "lucide-react";
import { generateVideo, CATEGORIES } from "../lib/groq.js";
import { VideoPlayer } from "../components/sparkle/VideoPlayer.jsx";

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
    // Clean, flat slate background. Zero gradients, zero ambient circles.
    <div className="min-h-screen bg-[#09090b] text-slate-100 selection:bg-lime-400 selection:text-black">
      
      {/* Container wrapper */}
      <div className="max-w-4xl mx-auto px-6 py-16 md:py-24">
        {!videoData ? (
          <div className="space-y-12">
            
            {/* Header */}
            <div className="text-center space-y-4">
              <div 
                className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-semibold uppercase tracking-wider"
                style={{ background: "rgba(173,255,68,0.05)", border: "1px solid rgba(173,255,68,0.2)", color: "#ADFF44" }}
              >
                <span className="w-1.5 h-1.5 rounded-full" style={{ background: "#ADFF44" }} />
                AI Video Tutor · Powered by Groq
              </div>
              
              <h1 className="text-4xl md:text-5xl font-extrabold text-white tracking-tight leading-tight max-w-2xl mx-auto">
                Learn Anything in{" "}
                <span className="inline-block" style={{ color: "#ADFF44" }}>60 Seconds</span>
              </h1>
              
              <p className="text-slate-400 text-sm md:text-base max-w-lg mx-auto font-normal leading-relaxed">
                Type any topic and get an interactive AI-narrated video lecture with slide-by-slide explanations, 
                tailored perfectly for JNV & Sainik School prep.
              </p>
            </div>

            {/* Input Card Container */}
            <div className="bg-[#121214] border border-white/[0.06] rounded-2xl p-6 relative shadow-xl">
              <label className="block text-xs font-bold text-slate-400 mb-3 uppercase tracking-widest">
                Enter your topic
              </label>
              
              <textarea
                value={topic}
                onChange={(e) => setTopic(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && (e.ctrlKey || e.metaKey) && !loading) handleGenerate();
                }}
                placeholder="e.g., How to find HCF and LCM step by step"
                className="w-full rounded-xl px-4 py-3.5 text-sm resize-none bg-[#18181b] border border-white/[0.06] text-white placeholder-slate-600 outline-none transition-all duration-200 focus:border-white/20"
                rows={3}
                style={{ caretColor: "#ADFF44" }}
              />

              <div className="flex flex-wrap items-center justify-between gap-4 mt-6">
                <div className="flex flex-wrap items-center gap-3">
                  
                  {/* Category Dropdown */}
                  <div className="relative">
                    <button
                      onClick={() => setShowCatMenu((p) => !p)}
                      className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-semibold transition-all duration-200 bg-[#18181b] border border-white/[0.06] text-slate-300 hover:text-white"
                    >
                      <span>{selectedCat.icon}</span>
                      <span>{selectedCat.label}</span>
                      <ChevronDown className={`w-3.5 h-3.5 opacity-50 transition-transform duration-200 ${showCatMenu ? "rotate-180" : ""}`} />
                    </button>
                    
                    {showCatMenu && (
                      <>
                        <div className="fixed inset-0 z-40" onClick={() => setShowCatMenu(false)} />
                        <div className="absolute top-full mt-2 left-0 z-50 p-1.5 rounded-xl min-w-[240px] space-y-1 border border-white/[0.06] bg-[#121214] shadow-2xl">
                          {CATEGORIES.map((cat) => (
                            <button
                              key={cat.id}
                              onClick={() => { setCategory(cat.id); setShowCatMenu(false); }}
                              className="w-full text-left flex items-start gap-3 px-3 py-2 rounded-lg transition-all duration-150 hover:bg-white/[0.02]"
                              style={{
                                background: category === cat.id ? "rgba(173,255,68,0.06)" : "transparent",
                              }}
                            >
                              <span className="text-base mt-0.5">{cat.icon}</span>
                              <div>
                                <div className="font-semibold text-xs transition-colors" style={{ color: category === cat.id ? "#ADFF44" : "#FFF" }}>
                                  {cat.label}
                                </div>
                                <div className="text-[11px] text-slate-400 mt-0.5">{cat.desc}</div>
                              </div>
                            </button>
                          ))}
                        </div>
                      </>
                    )}
                  </div>

                  {/* Language Selector */}
                  <div className="flex items-center p-1 rounded-xl bg-[#18181b] border border-white/[0.06]">
                    {["english", "hindi"].map((lang) => (
                      <button
                        key={lang}
                        onClick={() => setLanguage(lang)}
                        className="px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all duration-200 capitalize"
                        style={{
                          background: language === lang ? "#ADFF44" : "transparent",
                          color: language === lang ? "#000" : "rgba(255,255,255,0.4)",
                        }}
                      >
                        {lang === "english" ? "🇬🇧 Eng" : "🇮🇳 Hin"}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Primary Action Button */}
                <button
                  onClick={handleGenerate}
                  disabled={!topic.trim() || loading}
                  className="flex items-center justify-center gap-2 px-6 py-2.5 rounded-xl font-bold text-xs active:scale-[0.98] disabled:opacity-30 disabled:pointer-events-none transition-all duration-200 w-full sm:w-auto"
                  style={{ background: "#ADFF44", color: "#000" }}
                >
                  {loading ? (
                    <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Generating…</>
                  ) : (
                    <><Sparkles className="w-3.5 h-3.5 fill-current" /> Generate Video</>
                  )}
                </button>
              </div>

              {/* Status and Errors */}
              {loading && (
                <div 
                  className="mt-5 flex items-center gap-3 p-3 rounded-xl" 
                  style={{ background: "rgba(173,255,68,0.02)", border: "1px solid rgba(173,255,68,0.1)" }}
                >
                  <Loader2 className="w-3.5 h-3.5 animate-spin" style={{ color: "#ADFF44" }} />
                  <span className="text-xs font-medium" style={{ color: "rgba(173,255,68,0.7)" }}>AI is creating your personalized lecture slides…</span>
                </div>
              )}

              {error && (
                <div className="mt-5 p-3 rounded-xl text-xs font-semibold text-red-400 bg-red-500/[0.02] border border-red-500/10">
                  {error}
                </div>
              )}
            </div>

            {/* Sample Topics Section */}
            <div className="space-y-3">
              <p className="text-[10px] font-bold text-slate-500 tracking-widest text-center uppercase">Or select a sample topic</p>
              <div className="flex flex-wrap gap-2 justify-center max-w-xl mx-auto">
                {SAMPLE_TOPICS.map((t) => (
                  <button
                    key={t}
                    onClick={() => { setTopic(t); }}
                    className="text-xs font-medium px-3.5 py-1.5 rounded-full border bg-[#121214] border-white/[0.04] text-slate-400 hover:border-white/10 active:scale-[0.98] transition-all duration-200"
                    onMouseEnter={(e) => {
                      e.currentTarget.style.borderColor = "rgba(173,255,68,0.2)";
                      e.currentTarget.style.color = "#ADFF44";
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.borderColor = "rgba(255,255,255,0.04)";
                      e.currentTarget.style.color = "rgba(255,255,255,0.4)";
                    }}
                  >
                    {t}
                  </button>
                ))}
              </div>
            </div>

            {/* Feature Footers */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-4">
              {[
                { icon: "🎙️", title: "Instant TTS Narration", desc: "Crisp voice lines generation reading through modules naturally." },
                { icon: "💬", title: "In-Video Doubt Solving", desc: "Integrated chat interfaces help address custom student problems instantly." },
                { icon: "📊", title: "Structured Slides", desc: "Logical, progressive concept cards customized for high retention." },
              ].map((f) => (
                <div key={f.title} className="p-4 rounded-xl bg-[#121214] border border-white/[0.04]">
                  <div className="text-xl mb-2">{f.icon}</div>
                  <h3 className="text-xs font-bold text-slate-300 mb-1">{f.title}</h3>
                  <p className="text-[11px] text-slate-500 font-medium leading-relaxed">{f.desc}</p>
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