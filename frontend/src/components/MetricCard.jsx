import React from "react";
import { motion } from "framer-motion";
import { Icon } from "lucide-react";

export default function MetricCard({ icon: IconComp, label, value, accent = "" }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ y: -2 }}
      transition={{ duration: 0.3 }}
      className="rounded-2xl p-4 flex flex-col gap-3"
      style={{
        background: "rgba(17,17,17,0.9)",
        border: "1px solid rgba(255,255,255,0.07)",
        boxShadow: "inset 0 1px 0 rgba(255,255,255,0.04)",
      }}
    >
      <div
        className="w-9 h-9 rounded-xl flex items-center justify-center"
        style={{ background: "rgba(173,255,68,0.1)", border: "1px solid rgba(173,255,68,0.2)" }}
      >
        <IconComp size={16} style={{ color: "#adff44" }} />
      </div>
      <div>
        <p className="font-display font-bold text-xl text-white">{value}</p>
        <p className="text-xs text-muted mt-0.5">{label}</p>
      </div>
    </motion.div>
  );
}
