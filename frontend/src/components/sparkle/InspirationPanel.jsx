// InspirationPanel.jsx - Daily Inspiration with quotes, stories, and prep tips
import { useState } from "react";
import { Sparkles, RefreshCw, BookOpen, TrendingUp, Target, ChevronRight } from "lucide-react";

const QUOTES = [
  { text: "Success is not final, failure is not fatal: it is the courage to continue that counts.", author: "Winston Churchill" },
  { text: "The only way to do great work is to love what you do.", author: "Steve Jobs" },
  { text: "Believe you can and you're halfway there.", author: "Theodore Roosevelt" },
  { text: "Your attitude, not your aptitude, will determine your altitude.", author: "Zig Ziglar" },
  { text: "The future belongs to those who believe in the beauty of their dreams.", author: "Eleanor Roosevelt" },
  { text: "It does not matter how slowly you go as long as you do not stop.", author: "Confucius" },
  { text: "Education is the most powerful weapon which you can use to change the world.", author: "Nelson Mandela" },
  { text: "Hardships often prepare ordinary people for an extraordinary destiny.", author: "C.S. Lewis" },
];

const STORIES = [
  { title: "From Rural Village to Sainik School", desc: "How Rakesh Meena's determination earned him a spot in Sainik School, Chittorgarh.", readTime: "4 min" },
  { title: "Navodaya Topper's Study Secret", desc: "Anita Sharma shares her 6-step daily routine that scored 98.4% in the JNV entrance.", readTime: "6 min" },
  { title: "Overcoming Exam Fear", desc: "How deep breathing and positive visualization helped Arjun conquer his exam anxiety.", readTime: "3 min" },
  { title: "Small Town to Big Dream", desc: "Priya studied under a street lamp every night and cracked Navodaya on her first attempt.", readTime: "5 min" },
];

const TIPS = [
  { icon: BookOpen, text: "Revise NCERT thoroughly — 80% of questions come from standard textbooks." },
  { icon: TrendingUp, text: "Practice 10 PYQs daily to understand exam patterns and time management." },
  { icon: Target, text: "Focus on weak areas first — 30 min daily on your weakest subject compounds fast." },
];

export function InspirationPanel() {
  const [quoteIdx, setQuoteIdx] = useState(Math.floor(Math.random() * QUOTES.length));

  const refreshQuote = () => {
    let next = Math.floor(Math.random() * QUOTES.length);
    while (next === quoteIdx) next = Math.floor(Math.random() * QUOTES.length);
    setQuoteIdx(next);
  };

  const q = QUOTES[quoteIdx];

  return (
    <div className="space-y-5">
      {/* Quote card */}
      <div
        className="relative p-5 rounded-2xl"
        style={{ background: "rgba(173,255,68,0.04)", border: "1px solid rgba(173,255,68,0.12)" }}
      >
        <div className="text-4xl absolute top-3 left-3 opacity-15">❝</div>
        <div className="relative z-10 pt-3">
          <p className="text-sm text-white/70 italic leading-relaxed mb-3">"{q.text}"</p>
          <div className="flex items-center justify-between">
            <span className="text-xs text-white/40">— {q.author}</span>
            <button
              onClick={refreshQuote}
              className="p-1.5 rounded-lg text-white/20 hover:text-white/50 transition-all"
            >
              <RefreshCw className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/* Success stories */}
      <div>
        <h3 className="text-xs font-medium text-white/50 mb-3 flex items-center gap-2">
          <BookOpen className="w-3.5 h-3.5" style={{ color: "#ADFF44" }} />
          Success Stories
        </h3>
        <div className="space-y-2">
          {STORIES.map((s) => (
            <div
              key={s.title}
              className="p-3 rounded-xl cursor-pointer transition-all group"
              style={{ border: "1px solid rgba(255,255,255,0.05)", background: "rgba(255,255,255,0.02)" }}
              onMouseEnter={(e) => { e.currentTarget.style.background = "rgba(255,255,255,0.04)"; }}
              onMouseLeave={(e) => { e.currentTarget.style.background = "rgba(255,255,255,0.02)"; }}
            >
              <div className="flex items-start justify-between">
                <div className="min-w-0 flex-1">
                  <div className="text-xs font-medium text-white/60 group-hover:text-white/80 transition-colors">{s.title}</div>
                  <div className="text-xs text-white/30 mt-0.5 line-clamp-2">{s.desc}</div>
                  <span className="text-xs text-white/20 mt-1 inline-block">{s.readTime} read</span>
                </div>
                <ChevronRight className="w-3.5 h-3.5 text-white/20 group-hover:text-white/50 transition-colors mt-1 ml-2" />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Today's tips */}
      <div>
        <h3 className="text-xs font-medium text-white/50 mb-3 flex items-center gap-2">
          <Target className="w-3.5 h-3.5" style={{ color: "#ADFF44" }} />
          Today's Prep Tips
        </h3>
        <div className="space-y-2">
          {TIPS.map((tip, i) => (
            <div
              key={i}
              className="flex items-start gap-2.5 p-2.5 rounded-xl"
              style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.04)" }}
            >
              <span
                className="w-6 h-6 rounded-lg flex items-center justify-center shrink-0"
                style={{ background: "rgba(173,255,68,0.1)" }}
              >
                <tip.icon className="w-3.5 h-3.5" style={{ color: "#ADFF44" }} />
              </span>
              <span className="text-xs text-white/50 leading-relaxed">{tip.text}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
