// DiagnosticPanel.jsx - Subject-based diagnostic assessment
import { useState } from "react";
import { BarChart3, BookOpen, FileText, Clock, CheckCircle2, ArrowRight } from "lucide-react";

const SUBJECTS = [
  { id: "math", label: "Mathematics", icon: "📐", color: "#ADFF44", questions: 15, time: "20 min" },
  { id: "english", label: "English", icon: "📖", color: "#8CD430", questions: 12, time: "15 min" },
  { id: "reasoning", label: "Reasoning", icon: "🧩", color: "#6BBF00", questions: 10, time: "15 min" },
  { id: "science", label: "Science", icon: "🔬", color: "#ADFF44", questions: 12, time: "18 min" },
];

const SAMPLE_QUESTIONS = {
  math: [
    { q: "What is the LCM of 6 and 8?", options: ["16", "24", "32", "48"], correct: 1 },
    { q: "If a train travels 120 km in 2 hours, what is its speed?", options: ["50 km/h", "60 km/h", "70 km/h", "80 km/h"], correct: 1 },
    { q: "What is 15% of 200?", options: ["25", "30", "35", "40"], correct: 1 },
  ],
  english: [
    { q: "Choose the correct spelling:", options: ["Accomodate", "Accommodate", "Acomodate", "Accomoddate"], correct: 1 },
    { q: "The plural of 'child' is:", options: ["childs", "childes", "children", "childrens"], correct: 2 },
  ],
  reasoning: [
    { q: "Find the odd one out: 2, 4, 8, 10, 16", options: ["2", "4", "8", "10"], correct: 3 },
    { q: "Next in series: 1, 4, 9, 16, _?", options: ["20", "25", "32", "36"], correct: 1 },
  ],
  science: [
    { q: "Which gas do plants absorb during photosynthesis?", options: ["Oxygen", "Nitrogen", "Carbon dioxide", "Hydrogen"], correct: 2 },
    { q: "Unit of force is:", options: ["Watt", "Newton", "Joule", "Pascal"], correct: 1 },
  ],
};

export function DiagnosticPanel() {
  const [subject, setSubject] = useState(null);
  const [started, setStarted] = useState(false);
  const [qIdx, setQIdx] = useState(0);
  const [answered, setAnswered] = useState(null);
  const [correct, setCorrect] = useState(0);
  const [finished, setFinished] = useState(false);

  const questions = SAMPLE_QUESTIONS[subject] || [];
  const q = questions[qIdx];

  const handleAnswer = (idx) => {
    if (answered !== null) return;
    setAnswered(idx);
    if (idx === q?.correct) setCorrect((c) => c + 1);
    setTimeout(() => {
      if (qIdx < questions.length - 1) {
        setQIdx((i) => i + 1);
        setAnswered(null);
      } else {
        setFinished(true);
      }
    }, 1200);
  };

  const reset = () => {
    setSubject(null);
    setStarted(false);
    setFinished(false);
    setQIdx(0);
    setAnswered(null);
    setCorrect(0);
  };

  if (finished) {
    const pct = Math.round((correct / questions.length) * 100);
    return (
      <div className="text-center py-8">
        <CheckCircle2 className="w-12 h-12 mx-auto mb-3" style={{ color: "#ADFF44" }} />
        <h3 className="text-lg font-semibold text-white/80 mb-2">Assessment Complete!</h3>
        <p className="text-4xl font-bold mb-1" style={{ color: "#ADFF44" }}>{correct}/{questions.length}</p>
        <p className="text-sm text-white/40 mb-2">Score: {pct}%</p>
        <div
          className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm mb-6"
          style={{
            background: pct >= 70 ? "rgba(173,255,68,0.1)" : pct >= 40 ? "rgba(234,179,8,0.1)" : "rgba(239,68,68,0.1)",
            color: pct >= 70 ? "#ADFF44" : pct >= 40 ? "#fbbf24" : "#fca5a5",
            border: `1px solid ${pct >= 70 ? "rgba(173,255,68,0.2)" : pct >= 40 ? "rgba(234,179,8,0.2)" : "rgba(239,68,68,0.2)"}`,
          }}
        >
          {pct >= 70 ? "🏆 Excellent!" : pct >= 40 ? "📈 Keep practicing!" : "💪 Needs more revision"}
        </div>
        <br />
        <button
          onClick={reset}
          className="px-5 py-2 rounded-xl text-sm font-medium transition-all"
          style={{ background: "#ADFF44", color: "#000" }}
        >
          Try Another Subject
        </button>
      </div>
    );
  }

  if (started && q) {
    return (
      <div>
        <div className="flex items-center gap-2 mb-4">
          <span className="text-sm capitalize text-white/50">{subject}</span>
          <span className="text-xs text-white/20 ml-auto">Q {qIdx + 1}/{questions.length}</span>
        </div>
        <div className="w-full h-1 rounded-full mb-5 overflow-hidden" style={{ background: "rgba(255,255,255,0.05)" }}>
          <div
            className="h-full rounded-full transition-all"
            style={{ width: `${((qIdx + 1) / questions.length) * 100}%`, background: "#ADFF44" }}
          />
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
                      ? "rgba(255,255,255,0.65)"
                      : isCorrect
                      ? "#ADFF44"
                      : isWrong
                      ? "#fca5a5"
                      : "rgba(255,255,255,0.25)",
                }}
              >
                {opt}
              </button>
            );
          })}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <p className="text-xs text-white/40 mb-4">Select a subject to begin your diagnostic test</p>
      {SUBJECTS.map((s) => (
        <button
          key={s.id}
          onClick={() => setSubject(s.id === subject ? null : s.id)}
          className="w-full flex items-center gap-3 p-4 rounded-xl transition-all"
          style={{
            border: `1px solid ${subject === s.id ? "rgba(173,255,68,0.2)" : "rgba(255,255,255,0.05)"}`,
            background: subject === s.id ? "rgba(173,255,68,0.05)" : "rgba(255,255,255,0.02)",
          }}
        >
          <div className="w-10 h-10 rounded-xl flex items-center justify-center text-xl" style={{ background: "rgba(255,255,255,0.05)" }}>
            {s.icon}
          </div>
          <div className="flex-1 text-left min-w-0">
            <div className="text-sm font-medium text-white/70">{s.label}</div>
            <div className="flex items-center gap-3 text-xs text-white/30 mt-0.5">
              <span className="flex items-center gap-1"><FileText className="w-3 h-3" />{s.questions} Qs</span>
              <span className="flex items-center gap-1"><Clock className="w-3 h-3" />{s.time}</span>
            </div>
          </div>
          {subject === s.id && (
            <button
              onClick={(e) => { e.stopPropagation(); setStarted(true); }}
              className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium transition-all"
              style={{ background: "#ADFF44", color: "#000" }}
            >
              Start <ArrowRight className="w-3 h-3" />
            </button>
          )}
        </button>
      ))}
    </div>
  );
}
