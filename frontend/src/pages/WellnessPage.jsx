// WellnessPage.jsx - Wellness & Goals: Anxiety Coach + Daily Inspiration + Study Plan
import { useState, useEffect } from "react";
import { Heart, Sparkles, Zap, Loader } from "lucide-react";
import { AnxietyPanel } from "../components/sparkle/AnxietyPanel.jsx";
import { InspirationPanel } from "../components/sparkle/InspirationPanel.jsx";
import api from "../api/client";

const TABS = [
  { id: "anxiety", label: "Calm & Focus", icon: Heart },
  { id: "inspiration", label: "Daily Motivation", icon: Sparkles },
  { id: "plan", label: "Study Plan", icon: Zap },
];

const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

function StudyPlanPanel() {
  const [selectedDay, setSelectedDay] = useState(() => Math.max(0, new Date().getDay() - 1));
  const [plan, setPlan] = useState(null);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);

  const fetchPlan = () => {
    setLoading(true);
    api.get("/study-plan").then(({ data }) => {
      if (data.plan) setPlan(data.plan);
    }).catch(() => {}).finally(() => setLoading(false));
  };

  useEffect(() => { fetchPlan(); }, []);

  const handleGenerate = () => {
    setGenerating(true);
    api.post("/study-plan/generate").then(({ data }) => {
      if (data.plan) setPlan(data.plan);
    }).catch(() => {}).finally(() => setGenerating(false));
  };

  const tasksForDay = plan?.days?.[selectedDay]?.tasks || [];
  const dayPlan = plan?.days?.[selectedDay] || null;

  return (
    <div className="space-y-4">
      {/* Day selector */}
      <div className="flex gap-2">
        {DAYS.map((day, i) => {
          const dayTasks = plan?.days?.[i]?.tasks || [];
          const done = dayTasks.filter((t) => t.done).length;
          return (
            <button
              key={day}
              onClick={() => setSelectedDay(i)}
              className="flex-1 py-2 rounded-xl text-xs font-medium transition-all relative"
              style={{
                background: selectedDay === i ? "#ADFF44" : "rgba(255,255,255,0.04)",
                color: selectedDay === i ? "#000" : "rgba(255,255,255,0.35)",
                border: `1px solid ${selectedDay === i ? "transparent" : "rgba(255,255,255,0.06)"}`,
              }}
            >
              {day}
              {done > 0 && (
                <span className="absolute -top-1 -right-1 text-[10px] px-1 rounded-full"
                  style={{ background: "rgba(173,255,68,0.2)", color: "#ADFF44" }}>
                  {done}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Content */}
      {loading ? (
        <div className="flex items-center justify-center py-10">
          <Loader className="animate-spin" style={{ color: "#ADFF44" }} size={20} />
        </div>
      ) : plan && dayPlan ? (
        <>
          <div className="space-y-2">
            {tasksForDay.map((task, i) => (
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
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-medium" style={{ color: task.done ? "rgba(173,255,68,0.7)" : "rgba(255,255,255,0.6)" }}>{task.subject}</span>
                    {task.priority === "high" && (
                      <span className="text-[10px] px-1.5 py-0.5 rounded-full" style={{ background: "rgba(255,80,80,0.15)", color: "#ff6b6b" }}>High</span>
                    )}
                  </div>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className="text-xs text-white/30">{task.topic}</span>
                    <span className="text-[10px] text-white/20">{task.activity}</span>
                    {task.duration_minutes && <span className="text-[10px] text-white/20">{task.duration_minutes}m</span>}
                  </div>
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
                {tasksForDay.filter((t) => t.done).length}/{tasksForDay.length} done
          </span>
        </div>
        <div className="h-1.5 rounded-full overflow-hidden" style={{ background: "rgba(255,255,255,0.05)" }}>
          <div
            className="h-full rounded-full transition-all"
            style={{
              width: `${(dayPlan.tasks.filter((t) => t.done).length / dayPlan.tasks.length) * 100}%`,
              background: "linear-gradient(90deg, #ADFF44, #adff44)",
            }}
          />
        </div>
      </div>

      <div className="flex items-center justify-between gap-2">
        <button
          onClick={handleGenerate}
          disabled={generating}
          className="flex-1 py-2 rounded-xl text-xs font-medium transition-all"
          style={{
            background: generating ? "rgba(173,255,68,0.15)" : "rgba(173,255,68,0.1)",
            border: "1px solid rgba(173,255,68,0.2)",
            color: generating ? "rgba(173,255,68,0.5)" : "#ADFF44",
          }}
        >
          {generating ? "Generating..." : "Create New Plan"}
        </button>
      </div>
    </>
  ) : (
    <div className="p-6 rounded-xl text-center space-y-2" style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.06)" }}>
      <p className="text-sm text-white/40">No study plan yet.</p>
      <p className="text-xs text-white/25">Click below to generate an AI-personalized weekly plan.</p>
      <button
        onClick={handleGenerate}
        disabled={generating}
        className="mt-3 px-5 py-2 rounded-xl text-xs font-medium transition-all"
        style={{
          background: generating ? "rgba(173,255,68,0.15)" : "#ADFF44",
          color: generating ? "rgba(173,255,68,0.5)" : "#000",
        }}
      >
        {generating ? "Generating..." : "Create Study Plan"}
      </button>
    </div>
  )}
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
            <h1 className="text-xl font-bold text-white/90">Focus Zone</h1>
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
