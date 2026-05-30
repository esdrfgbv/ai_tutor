// SlideText.jsx - Renders slide text with progressive reveal and math/markdown formatting
import { useMemo } from "react";

function renderInline(text) {
  const parts = text.split(/(\*\*[^*]+\*\*)/g);
  return parts.map((part, i) => {
    if (part.startsWith("**") && part.endsWith("**")) {
      return (
        <span key={i} className="font-bold" style={{ color: "#ADFF44" }}>
          {part.slice(2, -2)}
        </span>
      );
    }
    return part;
  });
}

export function SlideText({ text, revealChars }) {
  const visible = text.slice(0, revealChars);

  const lines = useMemo(() => {
    return visible.split("\n").filter((l) => l.trim() !== "");
  }, [visible]);

  return (
    <div className="space-y-2">
      {lines.map((line, i) => {
        const trimmed = line.trim();

        // Bold heading line
        if (trimmed.startsWith("**") && trimmed.endsWith("**") && !trimmed.includes(":**")) {
          return (
            <h3
              key={i}
              className="font-bold text-lg mb-1"
              style={{ color: "#ADFF44" }}
            >
              {trimmed.slice(2, -2)}
            </h3>
          );
        }

        // Bullet point
        if (trimmed.startsWith("- ")) {
          return (
            <div key={i} className="flex items-start gap-2 ml-2">
              <span className="mt-1.5 w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: "#ADFF44" }} />
              <span className="text-white/80 text-sm leading-relaxed">{renderInline(trimmed.slice(2))}</span>
            </div>
          );
        }

        // Regular line
        return (
          <p key={i} className="text-white/75 text-sm leading-relaxed">
            {renderInline(trimmed)}
          </p>
        );
      })}

      {/* Blinking cursor */}
      {revealChars < text.length && (
        <span
          className="inline-block w-0.5 h-4 ml-0.5 animate-pulse"
          style={{ background: "#ADFF44" }}
        />
      )}
    </div>
  );
}
