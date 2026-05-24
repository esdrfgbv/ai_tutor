import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { useAuth } from "../context/AuthContext.jsx";
import api from "../api/client.js";
import { User, Mail, BookOpen, Target, Copy, CheckCircle, Award, Zap } from "lucide-react";
import AIOrb from "../components/AIOrb.jsx";
import ProgressRing from "../components/ProgressRing.jsx";

export default function ProfilePage() {
  const { user } = useAuth();
  const [studentProfile, setStudentProfile] = useState(null);
  const [error, setError] = useState("");
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (user?.role === "student") {
      api.get("/learning/profile")
        .then((res) => setStudentProfile(res.data))
        .catch((err) => setError(err.response?.data?.detail || "Could not load profile"));
    }
  }, [user]);

  const copyId = async () => {
    if (!studentProfile?.id) return;
    await navigator.clipboard.writeText(String(studentProfile.id));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const initials = user.full_name
    ? user.full_name.split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase()
    : "U";

  return (
    <div className="max-w-2xl mx-auto space-y-5 pb-8">
      {/* Profile Hero */}
      <motion.div
        initial={{ opacity: 0, y: 14 }}
        animate={{ opacity: 1, y: 0 }}
        className="rounded-3xl p-7 relative overflow-hidden text-center"
        style={{
          background: "rgba(17,17,17,0.95)",
          border: "1px solid rgba(173,255,68,0.1)",
        }}
      >
        {/* Background glow */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-48 h-48 rounded-full opacity-10 blur-3xl pointer-events-none" style={{ background: "#adff44" }} />

        <div className="relative">
          {/* Avatar */}
          <div className="relative inline-block mb-4">
            <div
              className="w-20 h-20 rounded-full flex items-center justify-center text-2xl font-black mx-auto"
              style={{
                background: "linear-gradient(135deg, #adff44, #7acc00)",
                color: "#000",
                boxShadow: "0 0 30px rgba(173,255,68,0.4)",
              }}
            >
              {initials}
            </div>
            {/* Online indicator */}
            <div
              className="absolute bottom-1 right-1 w-4 h-4 rounded-full border-2"
              style={{ background: "#adff44", borderColor: "#0a0a0a" }}
            />
          </div>

          <h1 className="font-display font-black text-2xl text-white mb-1">{user.full_name}</h1>
          <div className="flex items-center justify-center gap-2">
            <Mail size={13} style={{ color: "#8a8a8a" }} />
            <p className="text-sm" style={{ color: "#8a8a8a" }}>{user.email}</p>
          </div>
          <div className="flex items-center justify-center gap-2 mt-2">
            <span
              className="px-3 py-1 rounded-full text-xs font-bold capitalize"
              style={{
                background: "rgba(173,255,68,0.1)",
                border: "1px solid rgba(173,255,68,0.2)",
                color: "#adff44",
              }}
            >
              {user.role}
            </span>
            {studentProfile?.target_exam && (
              <span
                className="px-3 py-1 rounded-full text-xs font-bold"
                style={{
                  background: "rgba(255,255,255,0.06)",
                  border: "1px solid rgba(255,255,255,0.1)",
                  color: "#bdbdbd",
                }}
              >
                {studentProfile.target_exam} Aspirant
              </span>
            )}
          </div>
        </div>
      </motion.div>

      {/* Stats Row */}
      {user.role === "student" && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="grid grid-cols-3 gap-3"
        >
          {[
            { label: "Current XP", value: "1,240", icon: Zap, color: "#adff44" },
            { label: "Achievements", value: "7", icon: Award, color: "#ffd700" },
            { label: "Days Active", value: "21", icon: Target, color: "#adff44" },
          ].map(({ label, value, icon: Icon, color }) => (
            <div key={label} className="rounded-2xl p-4 text-center" style={{ background: "rgba(17,17,17,0.9)", border: "1px solid rgba(255,255,255,0.07)" }}>
              <div className="w-8 h-8 rounded-xl flex items-center justify-center mx-auto mb-2" style={{ background: `${color}15`, border: `1px solid ${color}25` }}>
                <Icon size={15} style={{ color }} />
              </div>
              <p className="font-display font-black text-xl text-white">{value}</p>
              <p className="text-[10px] mt-0.5" style={{ color: "#8a8a8a" }}>{label}</p>
            </div>
          ))}
        </motion.div>
      )}

      {/* Student Profile Card */}
      {user.role === "student" && studentProfile && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
          className="rounded-2xl p-5"
          style={{ background: "rgba(17,17,17,0.9)", border: "1px solid rgba(255,255,255,0.07)" }}
        >
          <h2 className="font-display font-bold text-white mb-4">Student Details</h2>

          <div className="grid sm:grid-cols-2 gap-3 mb-5">
            <div className="rounded-xl px-4 py-3" style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.06)" }}>
              <p className="text-xs mb-1" style={{ color: "#8a8a8a" }}>Class / Grade</p>
              <p className="font-bold text-white">Class {studentProfile.grade}</p>
            </div>
            <div className="rounded-xl px-4 py-3" style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.06)" }}>
              <p className="text-xs mb-1" style={{ color: "#8a8a8a" }}>Target Exam</p>
              <p className="font-bold text-white">{studentProfile.target_exam}</p>
            </div>
          </div>

          {/* Student ID Card */}
          <div
            className="rounded-2xl p-4 relative overflow-hidden"
            style={{
              background: "linear-gradient(135deg, rgba(173,255,68,0.08) 0%, rgba(173,255,68,0.03) 100%)",
              border: "1px solid rgba(173,255,68,0.2)",
            }}
          >
            <div className="absolute top-0 right-0 w-24 h-24 rounded-full opacity-10 pointer-events-none" style={{ background: "#adff44", transform: "translate(40%, -40%)" }} />
            <p className="text-xs font-bold mb-1" style={{ color: "#adff44" }}>🔗 STUDENT ID — Share with Parents</p>
            <p className="text-xs mb-3" style={{ color: "#8a8a8a" }}>Parents use this ID to link their account and view your progress</p>
            <div className="flex items-center gap-3">
              <span className="font-display font-black text-3xl" style={{ color: "#adff44", letterSpacing: "0.08em" }}>
                {studentProfile.id}
              </span>
              <button
                onClick={copyId}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all"
                style={{
                  background: copied ? "rgba(173,255,68,0.15)" : "rgba(255,255,255,0.06)",
                  border: `1px solid ${copied ? "rgba(173,255,68,0.3)" : "rgba(255,255,255,0.1)"}`,
                  color: copied ? "#adff44" : "#bdbdbd",
                }}
              >
                {copied ? <CheckCircle size={12} /> : <Copy size={12} />}
                {copied ? "Copied!" : "Copy"}
              </button>
            </div>
          </div>
        </motion.div>
      )}

      {error && (
        <p className="text-sm rounded-xl px-4 py-3" style={{ background: "rgba(255,107,107,0.08)", border: "1px solid rgba(255,107,107,0.2)", color: "#ff6b6b" }}>
          {error}
        </p>
      )}
    </div>
  );
}
