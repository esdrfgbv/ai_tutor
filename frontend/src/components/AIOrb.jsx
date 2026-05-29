import { motion } from "framer-motion";

export default function AIOrb({ size = 48, className = "", pulse = true }) {
  return (
    <div className={`relative flex-shrink-0 ${className}`} style={{ width: size, height: size }}>
      {/* Outer glow ring */}
      <motion.div
        className="absolute inset-0 rounded-full"
        animate={pulse ? {
          scale: [1, 1.3, 1],
          opacity: [0.4, 0.1, 0.4],
        } : {}}
        transition={{ duration: 2.5, repeat: Infinity, ease: "easeInOut" }}
        style={{
          background: "radial-gradient(circle, rgba(173,255,68,0.3) 0%, transparent 70%)",
          inset: -size * 0.3,
          borderRadius: "50%",
        }}
      />
      {/* Middle ring */}
      <motion.div
        className="absolute inset-0 rounded-full"
        animate={pulse ? {
          scale: [1, 1.15, 1],
          opacity: [0.6, 0.2, 0.6],
        } : {}}
        transition={{ duration: 2.5, repeat: Infinity, ease: "easeInOut", delay: 0.3 }}
        style={{
          background: "radial-gradient(circle, rgba(173,255,68,0.4) 0%, transparent 60%)",
          inset: -size * 0.15,
          borderRadius: "50%",
        }}
      />
      {/* Core orb */}
      <motion.img
        src="/profile.jpeg"
        alt="AI Tutor"
        className="relative w-full h-full rounded-full object-cover z-10"
        animate={pulse ? {
          scale: [1, 1.06, 1],
        } : {}}
        transition={{ duration: 2.5, repeat: Infinity, ease: "easeInOut" }}
        style={{
          boxShadow: "0 0 20px rgba(173,255,68,0.5), inset 0 1px 0 rgba(255,255,255,0.3)",
        }}
      />
    </div>
  );
}
