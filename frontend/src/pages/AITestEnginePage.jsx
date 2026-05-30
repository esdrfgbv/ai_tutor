// AITestEnginePage.jsx - AI Test Engine full page
import { Layers, Zap } from "lucide-react";
import { TestEnginePanel } from "../components/sparkle/TestEnginePanel.jsx";

export default function AITestEnginePage() {
  return (
    <div className="max-w-6xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center gap-3 mb-2">
          <div
            className="w-10 h-10 rounded-xl flex items-center justify-center"
            style={{ background: "rgba(173,255,68,0.1)", border: "1px solid rgba(173,255,68,0.15)" }}
          >
            <Layers className="w-5 h-5" style={{ color: "#ADFF44" }} />
          </div>
          <div>
            <h1 className="text-xl font-bold text-white/90">AI Test Engine</h1>
            <p className="text-xs text-white/40">Upload PYQ Paper → AI Extracts → Generates Unlimited Mock Tests</p>
          </div>
          <div
            className="ml-auto flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs"
            style={{ background: "rgba(173,255,68,0.08)", border: "1px solid rgba(173,255,68,0.15)", color: "rgba(173,255,68,0.7)" }}
          >
            <Zap className="w-3 h-3" style={{ color: "#ADFF44" }} />
            Powered by Groq
          </div>
        </div>
        <p className="text-sm text-white/35 ml-13">
          Upload any Sainik School / JNV / AISSEE question paper PDF and let AI analyze the pattern,
          then generate as many unique mock tests as you need — each 100% original.
        </p>
      </div>

      {/* Feature grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
        {[
          { icon: "📄", title: "PDF Extraction", desc: "AI reads any exam paper format" },
          { icon: "🧠", title: "Pattern Analysis", desc: "Finds topic weights & trends" },
          { icon: "⚡", title: "Bulk Generation", desc: "Up to 50 unique tests at once" },
          { icon: "🎯", title: "CBT Exam Mode", desc: "Real exam interface with timer" },
        ].map((f) => (
          <div key={f.title} className="p-3 rounded-xl" style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.05)" }}>
            <div className="text-xl mb-1.5">{f.icon}</div>
            <p className="text-xs font-medium text-white/60">{f.title}</p>
            <p className="text-xs text-white/25 mt-0.5">{f.desc}</p>
          </div>
        ))}
      </div>

      {/* Engine panel */}
      <div className="rounded-2xl p-6" style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.06)" }}>
        <TestEnginePanel />
      </div>
    </div>
  );
}
