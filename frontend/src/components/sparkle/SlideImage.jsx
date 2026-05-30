// SlideImage.jsx - Abstract visual representation for slide content
import { useMemo } from "react";

const ICONS = ["📐", "🔬", "🧪", "📖", "🧮", "⚗️", "🌿", "🔭", "🧬", "📊"];

function pickIcon(text) {
  return ICONS[text.length % ICONS.length];
}

function extractKeywords(text) {
  const words = text
    .replace(/\*\*?([^*]+)\*\*?/g, "$1")
    .split(/\s+/)
    .filter((w) => w.length > 4)
    .slice(0, 5);
  return words;
}

export function SlideImage({ text, speaking }) {
  const icon = useMemo(() => pickIcon(text), [text]);
  const keywords = useMemo(() => extractKeywords(text), [text]);

  return (
    <div
      className="w-full h-full flex flex-col items-center justify-center rounded-xl relative overflow-hidden"
      style={{ background: "rgba(173,255,68,0.04)", border: "1px solid rgba(173,255,68,0.12)" }}
    >
      {/* Animated glow when speaking */}
      {speaking && (
        <div
          className="absolute inset-0 animate-pulse"
          style={{ background: "radial-gradient(circle at center, rgba(173,255,68,0.08), transparent 70%)" }}
        />
      )}

      {/* Main icon */}
      <div className="text-5xl mb-3" style={{ filter: speaking ? "drop-shadow(0 0 12px #ADFF44)" : "none" }}>
        {icon}
      </div>

      {/* Keywords as floating tags */}
      <div className="flex flex-wrap gap-1 justify-center px-3">
        {keywords.map((word, i) => (
          <span
            key={i}
            className="text-xs px-2 py-0.5 rounded-full"
            style={{
              background: "rgba(173,255,68,0.08)",
              color: "rgba(173,255,68,0.7)",
              border: "1px solid rgba(173,255,68,0.15)",
              animationDelay: `${i * 0.2}s`,
            }}
          >
            {word}
          </span>
        ))}
      </div>

      {/* Corner accents */}
      <div
        className="absolute top-2 left-2 text-xs font-mono"
        style={{ color: "rgba(173,255,68,0.25)" }}
      >
        ┌
      </div>
      <div
        className="absolute top-2 right-2 text-xs font-mono"
        style={{ color: "rgba(173,255,68,0.25)" }}
      >
        ┐
      </div>
      <div
        className="absolute bottom-2 left-2 text-xs font-mono"
        style={{ color: "rgba(173,255,68,0.25)" }}
      >
        └
      </div>
      <div
        className="absolute bottom-2 right-2 text-xs font-mono"
        style={{ color: "rgba(173,255,68,0.25)" }}
      >
        ┘
      </div>
    </div>
  );
}
