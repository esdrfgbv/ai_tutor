// AdaptiveLearningPage.jsx - Adaptive Learning with Skill Graph + Diagnostic Assessment
import { useState } from "react";
import { Brain, BarChart3 } from "lucide-react";
import { ZeroBasePanel } from "../components/sparkle/ZeroBasePanel.jsx";
import { DiagnosticPanel } from "../components/sparkle/DiagnosticPanel.jsx";

const TABS = [
  { id: "adaptive", label: "Skill Graph", icon: Brain },
  { id: "diagnostic", label: "Diagnostic", icon: BarChart3 },
];

export default function AdaptiveLearningPage() {
  const [tab, setTab] = useState("adaptive");

  return (
    <div className="max-w-3xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center gap-3 mb-2">
          <div
            className="w-10 h-10 rounded-xl flex items-center justify-center"
            style={{ background: "rgba(173,255,68,0.1)", border: "1px solid rgba(173,255,68,0.15)" }}
          >
            <Brain className="w-5 h-5" style={{ color: "#ADFF44" }} />
          </div>
          <div>
            <h1 className="text-xl font-bold text-white/90">Adaptive Learning</h1>
            <p className="text-xs text-white/40">Skill-graph guided practice & diagnostic assessment</p>
          </div>
        </div>
        <p className="text-sm text-white/35">
          Track your skill mastery across all subjects, identify weak areas, and take focused diagnostic tests
          to measure your readiness for JNV & Sainik School exams.
        </p>
      </div>

      {/* Tab selector */}
      <div className="flex items-center gap-1 p-1 rounded-xl mb-5 w-fit" style={{ background: "rgba(255,255,255,0.04)" }}>
        {TABS.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all"
            style={{
              background: tab === t.id ? "#ADFF44" : "transparent",
              color: tab === t.id ? "#000" : "rgba(255,255,255,0.4)",
            }}
          >
            <t.icon className="w-3 h-3" /> {t.label}
          </button>
        ))}
      </div>

      {/* Panel */}
      <div className="rounded-2xl p-6" style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.06)" }}>
        {tab === "adaptive" ? <ZeroBasePanel /> : <DiagnosticPanel />}
      </div>

      {/* Info */}
      <div className="mt-4 grid grid-cols-2 gap-3">
        <div className="p-3 rounded-xl" style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.05)" }}>
          <p className="text-xs font-medium text-white/50 mb-1">🎯 Skill Graph</p>
          <p className="text-xs text-white/25">See your mastery level across 8 skill areas. Click any skill to practice targeted questions.</p>
        </div>
        <div className="p-3 rounded-xl" style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.05)" }}>
          <p className="text-xs font-medium text-white/50 mb-1">📊 Diagnostic</p>
          <p className="text-xs text-white/25">Take a quick diagnostic test per subject. Get instant feedback with score breakdown.</p>
        </div>
      </div>
    </div>
  );
}
