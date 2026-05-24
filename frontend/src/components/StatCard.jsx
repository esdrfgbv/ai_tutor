import { useEffect, useRef } from "react";
import { motion } from "framer-motion";

function useCountUp(target, duration = 1200) {
  const ref = useRef(null);

  useEffect(() => {
    let start = 0;
    const end = parseFloat(target) || 0;
    if (end === 0) return;
    const step = end / (duration / 16);
    const timer = setInterval(() => {
      start += step;
      if (start >= end) {
        start = end;
        clearInterval(timer);
      }
      if (ref.current) {
        ref.current.textContent = Number.isInteger(end)
          ? Math.floor(start)
          : start.toFixed(1);
      }
    }, 16);
    return () => clearInterval(timer);
  }, [target, duration]);

  return ref;
}

export default function StatCard({
  icon: Icon,
  label,
  value,
  suffix = "",
  prefix = "",
  accentColor = "#adff44",
  glow = false,
  className = "",
  animate = true,
}) {
  const numericValue = parseFloat(String(value).replace(/[^0-9.]/g, "")) || 0;
  const countRef = useCountUp(animate ? numericValue : 0);

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      whileHover={{ y: -2, transition: { duration: 0.2 } }}
      className={`relative overflow-hidden rounded-2xl p-5 cursor-default ${className}`}
      style={{
        background: "rgba(17,17,17,0.9)",
        border: `1px solid ${glow ? `${accentColor}30` : "rgba(255,255,255,0.07)"}`,
        boxShadow: glow
          ? `0 0 20px ${accentColor}15, inset 0 1px 0 rgba(255,255,255,0.04)`
          : "inset 0 1px 0 rgba(255,255,255,0.04)",
      }}
    >
      {/* Background gradient */}
      <div
        className="absolute top-0 right-0 w-24 h-24 rounded-full opacity-10 pointer-events-none"
        style={{
          background: `radial-gradient(circle, ${accentColor} 0%, transparent 70%)`,
          transform: "translate(30%, -30%)",
        }}
      />

      <div className="relative flex flex-col gap-3">
        {/* Icon */}
        <div
          className="w-10 h-10 rounded-xl flex items-center justify-center"
          style={{
            background: `${accentColor}15`,
            border: `1px solid ${accentColor}25`,
          }}
        >
          <Icon size={18} style={{ color: accentColor }} />
        </div>

        {/* Value */}
        <div>
          <div className="flex items-baseline gap-0.5">
            {prefix && <span className="text-sm font-medium" style={{ color: accentColor }}>{prefix}</span>}
            <span
              ref={animate ? countRef : null}
              className="font-display font-bold text-2xl text-white"
            >
              {animate ? "0" : value}
            </span>
            {suffix && <span className="text-sm font-medium" style={{ color: accentColor }}>{suffix}</span>}
          </div>
          <p className="text-xs mt-1" style={{ color: "#8a8a8a" }}>{label}</p>
        </div>
      </div>
    </motion.div>
  );
}
