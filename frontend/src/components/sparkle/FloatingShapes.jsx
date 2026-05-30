// FloatingShapes.jsx - Animated background decorations
import { useEffect, useRef } from "react";

export function FloatingShapes({ variant = "landing" }) {
  return (
    <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden">
      {variant === "landing" && (
        <>
          <div
            className="absolute top-1/4 left-1/4 w-64 h-64 rounded-full opacity-5 animate-pulse"
            style={{ background: "radial-gradient(circle, #ADFF44, transparent)", animationDuration: "4s" }}
          />
          <div
            className="absolute bottom-1/4 right-1/4 w-48 h-48 rounded-full opacity-5 animate-pulse"
            style={{ background: "radial-gradient(circle, #8CD430, transparent)", animationDuration: "6s" }}
          />
          <div
            className="absolute top-3/4 left-1/2 w-32 h-32 rounded-full opacity-5 animate-pulse"
            style={{ background: "radial-gradient(circle, #6BBF00, transparent)", animationDuration: "5s" }}
          />
        </>
      )}
      {variant === "player" && (
        <>
          <div
            className="absolute -top-20 left-1/4 w-96 h-96 rounded-full opacity-5 animate-pulse"
            style={{ background: "radial-gradient(circle, #ADFF44, transparent)", animationDuration: "8s" }}
          />
          <div
            className="absolute bottom-0 right-1/4 w-64 h-64 rounded-full opacity-5 animate-pulse"
            style={{ background: "radial-gradient(circle, #8CD430, transparent)", animationDuration: "10s" }}
          />
        </>
      )}
    </div>
  );
}

export function Particles({ count = 20 }) {
  const particles = Array.from({ length: count }, (_, i) => ({
    id: i,
    x: Math.random() * 100,
    y: Math.random() * 100,
    size: Math.random() * 3 + 1,
    duration: Math.random() * 10 + 5,
    delay: Math.random() * 5,
  }));

  return (
    <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden">
      {particles.map((p) => (
        <div
          key={p.id}
          className="absolute rounded-full opacity-20"
          style={{
            left: `${p.x}%`,
            top: `${p.y}%`,
            width: p.size,
            height: p.size,
            background: "#ADFF44",
            animation: `float ${p.duration}s ${p.delay}s ease-in-out infinite alternate`,
          }}
        />
      ))}
    </div>
  );
}
