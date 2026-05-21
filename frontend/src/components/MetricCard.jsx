import { motion } from "framer-motion";

export default function MetricCard({ icon: Icon, label, value, accent = "bg-mint" }) {
  return (
    <motion.div initial={false} animate={{ opacity: 1, y: 0 }} className="card">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-black/55 dark:text-white/60">{label}</p>
          <p className="mt-2 text-3xl font-bold">{value}</p>
        </div>
        <div className={`${accent} rounded-lg p-3 text-white`}>
          <Icon size={22} />
        </div>
      </div>
    </motion.div>
  );
}
