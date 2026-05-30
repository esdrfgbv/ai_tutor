// ZeroBasePanel.jsx - Adaptive skill-graph learning
import { useState } from "react";
import { Target, ChevronRight, Brain, BarChart3, CheckCircle2 } from "lucide-react";

const SKILLS = [
  { id: "arithmetic", label: "Arithmetic", level: 3, maxLevel: 5, color: "#ADFF44" },
  { id: "algebra", label: "Algebra", level: 2, maxLevel: 5, color: "#8CD430" },
  { id: "geometry", label: "Geometry", level: 1, maxLevel: 5, color: "#6BBF00" },
  { id: "reasoning", label: "Reasoning", level: 2, maxLevel: 5, color: "#ADFF44" },
  { id: "spatial", label: "Spatial", level: 0, maxLevel: 5, color: "#8CD430" },
  { id: "english", label: "English", level: 3, maxLevel: 5, color: "#6BBF00" },
  { id: "vocab", label: "Vocabulary", level: 2, maxLevel: 5, color: "#ADFF44" },
  { id: "comprehension", label: "Comprehension", level: 1, maxLevel: 5, color: "#8CD430" },
];

const QUESTIONS = {
  arithmetic: [
    { q: "What is 25 × 12?", options: ["250", "275", "300", "325"], correct: 2, hint: "Break it: 25×10 = 250, 25×2 = 50. Add them!" },
    { q: "Find HCF of 24 and 36", options: ["4", "6", "8", "12"], correct: 3, hint: "Factors of 24: 1,2,3,4,6,8,12,24. Factors of 36: 1,2,3,4,6,9,12,18,36. Largest common?" },
  ],
  algebra: [
    { q: "If x + 5 = 12, what is x?", options: ["5", "6", "7", "8"], correct: 2, hint: "Subtract 5 from both sides." },
  ],
  geometry: [
    { q: "Area of a rectangle 6cm × 4cm?", options: ["20 cm²", "24 cm²", "28 cm²", "30 cm²"], correct: 1, hint: "Area = Length × Width" },
  ],
  reasoning: [
    { q: "Next in series: 2, 6, 18, 54, _?", options: ["108", "144", "162", "180"], correct: 2, hint: "Each term is multiplied by 3." },
  ],
  spatial: [
    { q: "A cube has how many edges?", options: ["8", "10", "12", "14"], correct: 2, hint: "Count: 4 edges on top + 4 on bottom + 4 vertical = ?" },
  ],
  english: [
    { q: "Choose the correct spelling:", options: ["Accomodate", "Accommodate", "Acomodate", "Accomoddate"], correct: 1, hint: "Double 'c' and double 'm' — Ac-com-mo-date." },
  ],
  vocab: [
    { q: "Synonym of 'Brave':", options: ["Timid", "Courageous", "Weak", "Afraid"], correct: 1, hint: "Brave = having courage." },
  ],
  comprehension: [
    { q: "A paragraph that gives the main idea is called:", options: ["Topic sentence", "Thesis", "Conclusion", "Body"], correct: 0, hint: "The 'topic' of a paragraph is stated in the topic sentence." },
  ],
};

export function ZeroBasePanel() {
  const [activeSkill, setActiveSkill] = useState(null);
  const [currentQ, setCurrentQ] = useState(0);
  const [answered, setAnswered] = useState(null);
  const [score, setScore] = useState(0);
  const [finished, setFinished] = useState(false);

  const questions = activeSkill ? (QUESTIONS[activeSkill] || []) : [];
  const q = questions[currentQ];

  const handleAnswer = (idx) => {
    if (answered !== null) return;
    setAnswered(idx);
    if (idx === q?.correct) setScore((s) => s + 1);
    setTimeout(() => {
      if (currentQ < questions.length - 1) {
        setCurrentQ((c) => c + 1);
        setAnswered(null);
      } else {
        setFinished(true);
      }
    }, 1500);
  };

  const reset = () => {
    setActiveSkill(null);
    setCurrentQ(0);
    setAnswered(null);
    setScore(0);
    setFinished(false);
  };

  if (finished) {
    return (
      <div className="text-center py-8">
        <CheckCircle2 className="w-12 h-12 mx-auto mb-3" style={{ color: "#ADFF44" }} />
        <h3 className="text-lg font-semibold text-white/80 mb-1">Session Complete!</h3>
        <p className="text-3xl font-bold mb-1" style={{ color: "#ADFF44" }}>{score}/{questions.length}</p>
        <p className="text-sm text-white/40 mb-6">{Math.round((score / questions.length) * 100)}% accuracy</p>
        <button
          onClick={reset}
          className="px-5 py-2 rounded-xl text-sm font-medium transition-all"
          style={{ background: "#ADFF44", color: "#000" }}
        >
          Back to Skills
        </button>
      </div>
    );
  }

  if (activeSkill && q) {
    return (
      <div>
        <div className="flex items-center gap-2 mb-4">
          <Brain className="w-4 h-4" style={{ color: "#ADFF44" }} />
          <span className="text-xs text-white/40 capitalize">{activeSkill}</span>
          <span className="text-xs text-white/20 ml-auto">Q {currentQ + 1}/{questions.length}</span>
          <button onClick={reset} className="text-xs text-white/30 hover:text-white/60 ml-2">← Back</button>
        </div>
        <p className="text-base text-white/80 mb-4 font-medium">{q.q}</p>
        <div className="space-y-2">
          {q.options.map((opt, i) => {
            const isCorrect = i === q.correct;
            const isWrong = answered === i && !isCorrect;
            return (
              <button
                key={i}
                onClick={() => handleAnswer(i)}
                disabled={answered !== null}
                className="w-full text-left px-4 py-3 rounded-xl text-sm transition-all duration-300"
                style={{
                  border: `1px solid ${
                    answered === null
                      ? "rgba(255,255,255,0.08)"
                      : isCorrect
                      ? "rgba(173,255,68,0.4)"
                      : isWrong
                      ? "rgba(239,68,68,0.3)"
                      : "rgba(255,255,255,0.04)"
                  }`,
                  background:
                    answered === null
                      ? "rgba(255,255,255,0.02)"
                      : isCorrect
                      ? "rgba(173,255,68,0.1)"
                      : isWrong
                      ? "rgba(239,68,68,0.1)"
                      : "rgba(255,255,255,0.01)",
                  color:
                    answered === null
                      ? "rgba(255,255,255,0.6)"
                      : isCorrect
                      ? "#ADFF44"
                      : isWrong
                      ? "#fca5a5"
                      : "rgba(255,255,255,0.3)",
                }}
              >
                <div className="flex items-center gap-2">
                  {answered !== null && isCorrect && <CheckCircle2 className="w-4 h-4" style={{ color: "#ADFF44" }} />}
                  {opt}
                </div>
                {answered !== null && isCorrect && (
                  <div className="text-xs mt-1 opacity-70">{q.hint}</div>
                )}
              </button>
            );
          })}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div>
        <div className="flex items-center justify-between mb-3">
          <span className="text-xs text-white/50 font-medium">Your Skill Graph</span>
          <span className="text-xs text-white/20">{SKILLS.filter((s) => s.level > 0).length}/{SKILLS.length} active</span>
        </div>
        <div className="space-y-2">
          {SKILLS.map((skill) => (
            <button
              key={skill.id}
              onClick={() => setActiveSkill(skill.id)}
              className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all group"
              style={{ border: "1px solid rgba(255,255,255,0.05)", background: "rgba(255,255,255,0.02)" }}
              onMouseEnter={(e) => { e.currentTarget.style.background = "rgba(255,255,255,0.04)"; }}
              onMouseLeave={(e) => { e.currentTarget.style.background = "rgba(255,255,255,0.02)"; }}
            >
              <BarChart3 className="w-4 h-4 text-white/30" />
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-white/60">{skill.label}</span>
                  <span className="text-xs text-white/20">{skill.level}/{skill.maxLevel}</span>
                </div>
                <div className="mt-1 h-1.5 rounded-full overflow-hidden" style={{ background: "rgba(255,255,255,0.05)" }}>
                  <div
                    className="h-full rounded-full transition-all duration-700"
                    style={{ width: `${(skill.level / skill.maxLevel) * 100}%`, background: skill.color }}
                  />
                </div>
              </div>
              <ChevronRight className="w-3 h-3 text-white/20" />
            </button>
          ))}
        </div>
      </div>

      <div className="p-4 rounded-xl" style={{ background: "rgba(173,255,68,0.05)", border: "1px solid rgba(173,255,68,0.1)" }}>
        <div className="flex items-center gap-2 mb-2">
          <Brain className="w-4 h-4" style={{ color: "#ADFF44" }} />
          <span className="text-xs font-medium text-white/70">Recommended Next</span>
        </div>
        <p className="text-xs text-white/40 mb-2">Spatial reasoning needs improvement. Start a practice session?</p>
        <button
          onClick={() => setActiveSkill("spatial")}
          className="text-xs px-3 py-1.5 rounded-lg font-medium transition-all"
          style={{ background: "#ADFF44", color: "#000" }}
        >
          Start Spatial Practice
        </button>
      </div>
    </div>
  );
}
