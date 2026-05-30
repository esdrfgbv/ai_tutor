// Mascot.jsx - Animated tutor mascot that reacts to speech state
export function Mascot({ speaking, emotion = "neutral" }) {
  const eyes = speaking
    ? "animate-pulse"
    : emotion === "happy"
    ? ""
    : "";

  return (
    <div className="flex items-end gap-1">
      <div
        className="relative w-8 h-8 rounded-xl flex items-center justify-center text-base transition-all duration-300"
        style={{
          background: speaking
            ? "rgba(173,255,68,0.2)"
            : "rgba(255,255,255,0.05)",
          border: `1px solid ${speaking ? "rgba(173,255,68,0.4)" : "rgba(255,255,255,0.08)"}`,
          transform: speaking ? "scale(1.05)" : "scale(1)",
        }}
      >
        {emotion === "happy" ? "😊" : speaking ? "🗣️" : "🤖"}
      </div>
      {speaking && (
        <div className="flex items-end gap-0.5 mb-1">
          {[1, 2, 3, 2, 1].map((h, i) => (
            <div
              key={i}
              className="w-0.5 rounded-full animate-bounce"
              style={{
                height: h * 4,
                background: "#ADFF44",
                animationDelay: `${i * 0.1}s`,
              }}
            />
          ))}
        </div>
      )}
    </div>
  );
}
