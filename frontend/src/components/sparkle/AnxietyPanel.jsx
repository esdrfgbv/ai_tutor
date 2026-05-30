// AnxietyPanel.jsx - Exam Anxiety Coach with box breathing exercises
import { useState, useEffect } from "react";
import { Heart, Wind, Sun, Activity, Play, Brain } from "lucide-react";

const SESSIONS = [
  { id: "breathing", label: "Box Breathing", icon: Wind, duration: "3 min", desc: "Inhale 4s · Hold 4s · Exhale 4s · Hold 4s" },
  { id: "calm", label: "Calm Mind", icon: Sun, duration: "5 min", desc: "Progressive relaxation for exam morning" },
  { id: "focus", label: "Laser Focus", icon: Activity, duration: "4 min", desc: "Concentration boost before study sessions" },
];

const MOTIVATIONS = [
  "You've prepared well. Trust your preparation.",
  "Every question is an opportunity to show what you know.",
  "Stay calm. Stay focused. You've got this.",
  "Your hard work will speak through your answers.",
  "Breathe deeply. You are capable and ready.",
  "Success is not a destination — it's a daily decision.",
];

export function AnxietyPanel() {
  const [phase, setPhase] = useState("start");
  const [breathPhase, setBreathPhase] = useState("inhale");
  const [count, setCount] = useState(4);
  const [rounds, setRounds] = useState(0);
  const [msg, setMsg] = useState("");

  const startBreathing = () => {
    setPhase("breathing");
    setBreathPhase("inhale");
    setCount(4);
    setRounds(0);
    setMsg(MOTIVATIONS[Math.floor(Math.random() * MOTIVATIONS.length)]);
  };

  useEffect(() => {
    if (phase !== "breathing") return;
    const timer = setInterval(() => {
      setCount((c) => {
        if (c <= 1) {
          setBreathPhase((p) => {
            if (p === "inhale") { setCount(4); return "hold"; }
            if (p === "hold") { setCount(4); return "exhale"; }
            setRounds((r) => {
              if (r >= 2) { setPhase("done"); return r; }
              return r + 1;
            });
            setCount(4);
            return "inhale";
          });
          return 4;
        }
        return c - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [phase]);

  const breathColor = breathPhase === "inhale" ? "#ADFF44" : breathPhase === "hold" ? "#8CD430" : "#6BBF00";
  const breathScale = breathPhase === "inhale" ? "1.15" : breathPhase === "hold" ? "1.0" : "0.85";

  if (phase === "breathing") {
    return (
      <div className="text-center py-6">
        <div className="relative w-44 h-44 mx-auto mb-6">
          {/* Outer ring */}
          <div
            className="absolute inset-0 rounded-full transition-all duration-1000"
            style={{
              border: `2px solid ${breathColor}`,
              transform: `scale(${breathScale})`,
              opacity: 0.6,
            }}
          />
          {/* Inner fill */}
          <div
            className="absolute inset-2 rounded-full transition-all duration-1000 flex items-center justify-center"
            style={{
              background: `radial-gradient(circle, ${breathColor}22, transparent)`,
              transform: `scale(${breathScale})`,
            }}
          >
            <div className="text-center">
              <div className="text-4xl font-bold" style={{ color: breathColor }}>{count}</div>
              <div className="text-xs text-white/40 capitalize mt-1">{breathPhase}</div>
            </div>
          </div>
        </div>
        <p className="text-sm text-white/50 italic mb-2 px-4">"{msg}"</p>
        <p className="text-xs text-white/30 mb-5">Round {rounds + 1} of 3</p>
        <button
          onClick={() => setPhase("start")}
          className="text-xs px-4 py-2 rounded-lg text-white/40 hover:text-white/70 transition-all"
          style={{ border: "1px solid rgba(255,255,255,0.08)" }}
        >
          Stop Session
        </button>
      </div>
    );
  }

  if (phase === "done") {
    return (
      <div className="text-center py-8">
        <div
          className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4"
          style={{ background: "rgba(173,255,68,0.1)" }}
        >
          <Brain className="w-8 h-8" style={{ color: "#ADFF44" }} />
        </div>
        <h3 className="text-lg font-semibold text-white/80 mb-2">Session Complete!</h3>
        <p className="text-sm text-white/50 mb-6">You're feeling calmer and more focused now. 🧘</p>
        <button
          onClick={() => setPhase("start")}
          className="px-5 py-2 rounded-xl text-sm font-medium transition-all"
          style={{ background: "#ADFF44", color: "#000" }}
        >
          Try Another Session
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="text-center mb-4">
        <div
          className="w-14 h-14 rounded-full flex items-center justify-center mx-auto mb-3"
          style={{ background: "rgba(173,255,68,0.08)" }}
        >
          <Heart className="w-7 h-7" style={{ color: "#ADFF44" }} />
        </div>
        <p className="text-sm text-white/50">Pre-exam anxiety is natural. Let's calm your mind.</p>
      </div>

      {SESSIONS.map((s) => (
        <button
          key={s.id}
          onClick={startBreathing}
          className="w-full flex items-center gap-3 p-4 rounded-xl transition-all group"
          style={{ border: "1px solid rgba(255,255,255,0.05)", background: "rgba(255,255,255,0.02)" }}
          onMouseEnter={(e) => { e.currentTarget.style.background = "rgba(255,255,255,0.04)"; }}
          onMouseLeave={(e) => { e.currentTarget.style.background = "rgba(255,255,255,0.02)"; }}
        >
          <div
            className="w-10 h-10 rounded-xl flex items-center justify-center transition-transform group-hover:scale-110"
            style={{ background: "rgba(173,255,68,0.08)", color: "#ADFF44" }}
          >
            <s.icon className="w-4 h-4" />
          </div>
          <div className="flex-1 text-left">
            <div className="text-sm font-medium text-white/70">{s.label}</div>
            <div className="text-xs text-white/30">{s.desc}</div>
          </div>
          <div className="text-xs text-white/20">{s.duration}</div>
          <div
            className="w-8 h-8 rounded-full flex items-center justify-center"
            style={{ background: "#ADFF44" }}
          >
            <Play className="w-4 h-4 text-black" />
          </div>
        </button>
      ))}
    </div>
  );
}
