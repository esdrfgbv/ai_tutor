import React from "react";
import { motion } from "framer-motion";

export default function MetricCard({ icon: IconComp, label, value, accent = "" }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ y: -4 }}
      transition={{ duration: 0.3 }}
      className="rounded-2xl p-6 flex flex-col gap-4 bg-surface-1 border border-white/10"
      style={{ boxShadow: "0 4px 24px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.05)" }}
    >
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium text-white/70">{label}</p>
        <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-white/5 border border-white/10">
          <IconComp size={18} className="text-mint" />
        </div>
      </div>
      <div>
        <p className="font-display font-bold text-3xl text-white">{value}</p>
      </div>
    </motion.div>
  );
}
