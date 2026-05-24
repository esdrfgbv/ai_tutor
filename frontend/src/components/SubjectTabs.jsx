import { motion } from "framer-motion";

export default function SubjectTabs({ subjects, value, onChange, className = "" }) {
  return (
    <div
      className={`flex items-center gap-1 p-1 rounded-2xl ${className}`}
      style={{
        background: "rgba(255,255,255,0.04)",
        border: "1px solid rgba(255,255,255,0.07)",
      }}
    >
      {subjects.map((subject) => {
        const isActive = value === subject.value;
        const label = typeof subject === "string"
          ? subject.split("-").map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join(" ")
          : subject.label;
        const val = typeof subject === "string" ? subject : subject.value;

        return (
          <button
            key={val}
            onClick={() => onChange(val)}
            className="relative px-4 py-2 rounded-xl text-sm font-semibold transition-colors duration-200 z-10"
            style={{
              color: isActive ? "#000" : "#8a8a8a",
              minWidth: 80,
            }}
          >
            {isActive && (
              <motion.div
                layoutId="subject-tab-pill"
                className="absolute inset-0 rounded-xl"
                style={{ background: "#adff44" }}
                transition={{ type: "spring", stiffness: 400, damping: 35 }}
              />
            )}
            <span className="relative z-10">{label}</span>
          </button>
        );
      })}
    </div>
  );
}
