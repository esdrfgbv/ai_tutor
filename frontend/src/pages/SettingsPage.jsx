import { Settings, Moon, Bell, Shield, LogOut } from "lucide-react";
import { useAuth } from "../context/AuthContext.jsx";
import { motion } from "framer-motion";

export default function SettingsPage() {
  const { logout } = useAuth();

  const settings = [
    { icon: Bell, label: "Notifications", description: "Manage push and email alerts", action: null },
    { icon: Shield, label: "Privacy & Security", description: "Control your data and account security", action: null },
  ];

  return (
    <div className="max-w-xl mx-auto space-y-5">
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
        <h1 className="font-display font-black text-2xl text-white mb-1">Settings</h1>
        <p className="text-sm" style={{ color: "#8a8a8a" }}>Manage your account preferences</p>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="rounded-2xl overflow-hidden"
        style={{ background: "rgba(17,17,17,0.9)", border: "1px solid rgba(255,255,255,0.07)" }}
      >
        {settings.map(({ icon: Icon, label, description }, i) => (
          <div
            key={label}
            className="flex items-center gap-4 px-5 py-4 cursor-pointer transition-all"
            style={{ borderBottom: i < settings.length - 1 ? "1px solid rgba(255,255,255,0.06)" : "none" }}
            onMouseEnter={(e) => e.currentTarget.style.background = "rgba(255,255,255,0.03)"}
            onMouseLeave={(e) => e.currentTarget.style.background = "transparent"}
          >
            <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
              style={{ background: "rgba(173,255,68,0.08)", border: "1px solid rgba(173,255,68,0.15)" }}>
              <Icon size={16} style={{ color: "#adff44" }} />
            </div>
            <div className="flex-1">
              <p className="font-semibold text-white text-sm">{label}</p>
              <p className="text-xs mt-0.5" style={{ color: "#8a8a8a" }}>{description}</p>
            </div>
          </div>
        ))}
      </motion.div>

      <motion.button
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        onClick={logout}
        className="w-full flex items-center justify-center gap-2 rounded-2xl py-4 text-sm font-semibold transition-all"
        style={{ background: "rgba(255,107,107,0.08)", border: "1px solid rgba(255,107,107,0.2)", color: "#ff6b6b" }}
        whileHover={{ background: "rgba(255,107,107,0.12)" }}
      >
        <LogOut size={16} /> Sign Out
      </motion.button>
    </div>
  );
}
