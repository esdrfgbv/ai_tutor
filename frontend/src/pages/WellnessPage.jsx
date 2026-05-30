// WellnessPage.jsx - Wellness & Goals: Anxiety Coach + Daily Inspiration + Study Plan
import { useState } from "react";
import { Heart, Sparkles, Zap } from "lucide-react";
import { AnxietyPanel } from "../components/sparkle/AnxietyPanel.jsx";
import { InspirationPanel } from "../components/sparkle/InspirationPanel.jsx";

const TABS = [
  { id: "anxiety", label: "Calm & Focus", icon: Heart },
  { id: "inspiration", label: "Daily Inspiration", icon: Sparkles },
  { id: "plan", label: "Study Plan", icon: Zap },
];

const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const PLAN = [
  { day: "Mon", tasks: [{ sub: "Math", topic: "LCM & HCF", done: true }, { sub: "English", topic: "Noun clauses", done: true }, { sub: "Reasoning", topic: "Pattern completion", done: false }] },
  { day: "Tue", tasks: [{ sub: "Science", topic: "Photosynthesis", done: true }, { sub: "Math", topic: "Fractions", done: false }] },
  { day: "Wed", tasks: [{ sub: "English", topic: "Grammar", done: false }, { sub: "GK", topic: "Current affairs", done: false }] },
  { day: "Thu", tasks: [{ sub: "Math", topic: "Geometry", done: false }, { sub: "Reasoning", topic: "Analogies", done: false }] },
  { day: "Fri", tasks: [{ sub: "Science", topic: "Water cycle", done: false }, { sub: "Math", topic: "Profit & Loss", done: false }] },
  { day: "Sat", tasks: [{ sub: "Revision", topic: "Full week recap", done: false }, { sub: "Mock Test", topic: "2 tests", done: false }] },
  { day: "Sun", tasks: [{ sub: "Rest", topic: "Light reading only", done: false }] },
];

function StudyPlanPanel() {
  const [selectedDay, setSelectedDay] = useState(0);
  const today = new Date().getDay(); // 0 = Sunday
  const dayPlan = PLAN[selectedDay];

  return (
    <div className="space-y-4">
      {/* Day selector */}
      <div className="flex gap-2">
        {DAYS.map((day, i) => (
          <button
            key={day}
            onClick={() => setSelectedDay(i)}
            className="flex-1 py-2 rounded-xl text-xs font-medium transition-all"
            style={{
              background: selectedDay === i ? "#ADFF44" : "rgba(255,255,255,0.04)",
              color: selectedDay === i ? "#000" : "rgba(255,255,255,0.35)",
              border: `1px solid ${selectedDay === i ? "transparent" : "rgba(255,255,255,0.06)"}`,
            }}
          >
            {day}
          </button>
        ))}
      </div>

      {/* Tasks */}
      <div className="space-y-2">
        {dayPlan.tasks.map((task, i) => (
          <div
            key={i}
            className="flex items-center gap-3 p-3 rounded-xl transition-all"
            style={{ background: "rgba(255,255,255,0.02)", border: `1px solid ${task.done ? "rgba(173,255,68,0.15)" : "rgba(255,255,255,0.06)"}` }}
          >
            <div
              className="w-5 h-5 rounded-full flex items-center justify-center shrink-0"
              style={{ background: task.done ? "rgba(173,255,68,0.2)" : "rgba(255,255,255,0.05)", border: `1px solid ${task.done ? "rgba(173,255,68,0.4)" : "rgba(255,255,255,0.1)"}` }}
            >
              {task.done && <span className="text-xs" style={{ color: "#ADFF44" }}>✓</span>}
            </div>
            <div className="flex-1 min-w-0">
              <span className="text-xs font-medium" style={{ color: task.done ? "rgba(173,255,68,0.7)" : "rgba(255,255,255,0.6)" }}>{task.sub}</span>
              <span className="text-xs text-white/30 ml-2">{task.topic}</span>
            </div>
            {task.done && (
              <span className="text-xs px-2 py-0.5 rounded-full" style={{ background: "rgba(173,255,68,0.1)", color: "rgba(173,255,68,0.6)" }}>Done</span>
            )}
          </div>
        ))}
      </div>

      {/* Summary bar */}
      <div className="p-3 rounded-xl" style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.05)" }}>
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs text-white/40">{DAYS[selectedDay]} Progress</span>
          <span className="text-xs font-medium" style={{ color: "#ADFF44" }}>
            {dayPlan.tasks.filter((t) => t.done).length}/{dayPlan.tasks.length} done
          </span>
        </div>
        <div className="h-1.5 rounded-full overflow-hidden" style={{ background: "rgba(255,255,255,0.05)" }}>
          <div
            className="h-full rounded-full transition-all"
            style={{
              width: `${(dayPlan.tasks.filter((t) => t.done).length / dayPlan.tasks.length) * 100}%`,
              background: "linear-gradient(90deg, #ADFF44, #8CD430)",
            }}
          />
        </div>
      </div>

      <div className="p-3 rounded-xl text-center" style={{ background: "rgba(173,255,68,0.04)", border: "1px solid rgba(173,255,68,0.1)" }}>
        <p className="text-xs text-white/40">📅 Study plans are coming with AI personalization soon.</p>
        <p className="text-xs text-white/25 mt-0.5">Your analytics will auto-generate a custom weekly plan.</p>
      </div>
    </div>
  );
}

export default function WellnessPage() {
  const [tab, setTab] = useState("anxiety");

  return (
    <div className="max-w-2xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center gap-3 mb-2">
          <div
            className="w-10 h-10 rounded-xl flex items-center justify-center"
            style={{ background: "rgba(173,255,68,0.1)", border: "1px solid rgba(173,255,68,0.15)" }}
          >
            <Heart className="w-5 h-5" style={{ color: "#ADFF44" }} />
          </div>
          <div>
            <h1 className="text-xl font-bold text-white/90">Wellness & Goals</h1>
            <p className="text-xs text-white/40">Calm your mind · Stay inspired · Track your plan</p>
          </div>
        </div>
        <p className="text-sm text-white/35">
          Peak exam performance starts with mental health. Use breathing exercises, motivational stories,
          and your personalized study plan to stay on track every day.
        </p>
      </div>

      {/* Tabs */}
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
        {tab === "anxiety" && <AnxietyPanel />}
        {tab === "inspiration" && <InspirationPanel />}
        {tab === "plan" && <StudyPlanPanel />}
      </div>
    </div>
  );
}
