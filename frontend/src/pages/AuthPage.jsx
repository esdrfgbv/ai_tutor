import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { useAuth } from "../context/AuthContext.jsx";
import AIOrb from "../components/AIOrb.jsx";
import { Eye, EyeOff, Zap, BookOpen, Brain, BarChart3 } from "lucide-react";
import { SearchableSelect } from "../components/SearchableSelect.jsx";
import { STATES, STATES_AND_DISTRICTS, CITIES_BY_STATE, SECTIONS } from "../utils/indiaGeography.js";

const portalRoles = ["student", "parent", "admin"];

const FEATURES = [
  { icon: Brain, text: "AI Tutor powered by NCERT textbooks" },
  { icon: BookOpen, text: "Adaptive PYQ-style quiz engine" },
  { icon: BarChart3, text: "Real-time performance analytics" },
  { icon: Zap, text: "Instant AI doubt resolution" },
];

export default function AuthPage() {
  const [searchParams] = useSearchParams();
  const [mode, setMode] = useState("login");
  const [role, setRole] = useState("student");
  const [error, setError] = useState("");
  const [showPwd, setShowPwd] = useState(false);

  const { login, register, forgotPassword } = useAuth();
  const navigate = useNavigate();

  const [form, setForm] = useState({
    email: "",
    password: "",
    full_name: "",
    role: "student",
    grade: 6,
    target_exam: "JNV",
    phone: "",
    student_identifier: "",
    school_name: "",
    state: "",
    district: "",
    city: "",
    section: "",
    medium: "English",
  });

  useEffect(() => {
    const requestedRole = searchParams.get("role");
    if (requestedRole && portalRoles.includes(requestedRole)) {
      setRole(requestedRole);
      setForm((prev) => ({ ...prev, role: requestedRole }));
      if (requestedRole === "admin") setMode("login");
    }
  }, [searchParams]);

  useEffect(() => {
    setForm((prev) => ({ ...prev, role }));
  }, [role]);

  const handleForgotPassword = async () => {
    if (!form.email) { setError("Please enter your email to reset your password."); return; }
    try {
      setError("");
      const res = await forgotPassword(form.email);
      alert(`Your new password is: ${res.new_password}\n\nPlease copy it and login.`);
    } catch (err) {
      const detail = err.response?.data?.detail;
      setError(typeof detail === "string" ? detail : "Failed to reset password.");
    }
  };

  const submit = async (event) => {
    event.preventDefault();
    setError("");
    try {
      let payload = {};
      if (mode === "login") {
        payload = { email: form.email, password: form.password };
      } else if (role === "student") {
        payload = { 
          email: form.email, 
          password: form.password, 
          full_name: form.full_name, 
          role: "student", 
          grade: form.grade, 
          target_exam: form.target_exam,
          school_name: form.school_name,
          state: form.state,
          district: form.district,
          city: form.city,
          section: form.section,
          medium: form.medium
        };
      } else {
        payload = { email: form.email, password: form.password, full_name: form.full_name, role: "parent", phone: form.phone, student_identifier: form.student_identifier };
      }
      const user = mode === "login" ? await login(payload) : await register(payload);
      navigate(`/${user.role}`);
    } catch (err) {
      console.error("AUTH ERROR:", err);
      const detail = err.response?.data?.detail;
      if (Array.isArray(detail)) setError(detail[0]?.msg || "Authentication failed");
      else if (typeof detail === "string") setError(detail);
      else setError(err.message || "Authentication failed");
    }
  };

  return (
    <div className="min-h-screen flex" style={{ background: "#000" }}>
      {/* ── LEFT BRAND PANEL (desktop only) ── */}
      <div
        className="hidden lg:flex lg:w-1/2 flex-col justify-between p-12 relative overflow-hidden"
        style={{
          background: "linear-gradient(135deg, #0a0a0a 0%, #111111 100%)",
          borderRight: "1px solid rgba(255,255,255,0.06)",
        }}
      >
        {/* Ambient glow */}
        <div className="absolute top-1/4 left-1/4 w-72 h-72 rounded-full opacity-15 blur-3xl pointer-events-none" style={{ background: "#adff44" }} />

        {/* Brand */}
        <div className="flex items-center gap-3 relative z-10">
          <AIOrb size={40} />
          <div>
            <p className="font-display font-black text-white text-lg">Prep100</p>
            <p className="text-xs" style={{ color: "#8a8a8a" }}>JNV · Sainik School Prep</p>
          </div>
        </div>

        {/* Center content */}
        <div className="relative z-10">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
          >
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full mb-6 text-xs font-semibold"
              style={{ background: "rgba(173,255,68,0.1)", border: "1px solid rgba(173,255,68,0.2)", color: "#adff44" }}>
              <Zap size={12} fill="#adff44" />
              AI-Powered Learning Platform
            </div>
            <h1 className="font-display font-black text-5xl text-white leading-tight mb-4">
              Learn smarter.<br />
              <span style={{ color: "#adff44" }}>Score higher.</span>
            </h1>
            <p className="text-base mb-10 leading-relaxed" style={{ color: "#8a8a8a" }}>
              Textbook-grounded AI tutor, adaptive quizzes, and smart analytics to get you into JNV or Sainik School.
            </p>
            <div className="space-y-3">
              {FEATURES.map((f, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.4 + i * 0.1 }}
                  className="flex items-center gap-3"
                >
                  <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
                    style={{ background: "rgba(173,255,68,0.1)", border: "1px solid rgba(173,255,68,0.2)" }}>
                    <f.icon size={15} style={{ color: "#adff44" }} />
                  </div>
                  <span className="text-sm" style={{ color: "#bdbdbd" }}>{f.text}</span>
                </motion.div>
              ))}
            </div>
          </motion.div>
        </div>

        {/* Bottom quote */}
        <div className="relative z-10 rounded-2xl p-4" style={{ background: "rgba(173,255,68,0.05)", border: "1px solid rgba(173,255,68,0.1)" }}>
          <p className="text-sm italic" style={{ color: "#bdbdbd" }}>
            "Prep100 helped me understand topics I was struggling with for months — in just one session."
          </p>
          <p className="text-xs mt-2 font-semibold" style={{ color: "#adff44" }}>— JNV Aspirant, Class 6</p>
        </div>
      </div>

      {/* ── RIGHT FORM PANEL ── */}
      <div className="flex-1 flex items-center justify-center p-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="w-full max-w-md"
        >
          {/* Mobile brand */}
          <div className="lg:hidden flex items-center gap-3 justify-center mb-8">
            <AIOrb size={36} />
            <span className="font-display font-black text-white text-xl">Prep100</span>
          </div>

          <div
            className="rounded-3xl p-8"
            style={{
              background: "rgba(17,17,17,0.9)",
              border: "1px solid rgba(255,255,255,0.08)",
              boxShadow: "0 24px 80px rgba(0,0,0,0.6)",
            }}
          >
            <h2 className="font-display font-black text-2xl text-white mb-1">
              {mode === "login" ? "Welcome back 👋" : "Create account"}
            </h2>
            <p className="text-sm mb-6" style={{ color: "#8a8a8a" }}>
              {mode === "login"
                ? "Sign in to continue your learning journey"
                : "Join thousands of JNV & Sainik aspirants"}
            </p>

            {/* Role Selector */}
            <div className="flex gap-2 p-1 rounded-2xl mb-6" style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.07)" }}>
              {portalRoles.map((portal) => {
                const isActive = portal === role;
                return (
                  <button
                    key={portal}
                    type="button"
                    onClick={() => { setRole(portal); if (portal === "admin") setMode("login"); }}
                    className="relative flex-1 py-2 rounded-xl text-sm font-semibold transition-colors duration-200"
                    style={{ color: isActive ? "#000" : "#8a8a8a" }}
                  >
                    {isActive && (
                      <motion.div
                        layoutId="auth-role-pill"
                        className="absolute inset-0 rounded-xl"
                        style={{ background: "#adff44" }}
                        transition={{ type: "spring", stiffness: 400, damping: 35 }}
                      />
                    )}
                    <span className="relative z-10 capitalize">{portal}</span>
                  </button>
                );
              })}
            </div>

            <form onSubmit={submit} className="space-y-4">
              {/* Error */}
              <AnimatePresence>
                {error && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    exit={{ opacity: 0, height: 0 }}
                    className="rounded-xl px-4 py-3 text-sm"
                    style={{ background: "rgba(255,107,107,0.1)", border: "1px solid rgba(255,107,107,0.2)", color: "#ff6b6b" }}
                  >
                    {error}
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Full name */}
              {mode === "register" && role !== "admin" && (
                <input
                  className="input"
                  placeholder="Full name"
                  value={form.full_name}
                  onChange={(e) => setForm({ ...form, full_name: e.target.value })}
                  required
                />
              )}

              {/* Email */}
              <input
                className="input"
                type="email"
                placeholder="Email address"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                required
              />

              {/* Password */}
              <div className="relative">
                <input
                  className="input pr-12"
                  type={showPwd ? "text" : "password"}
                  placeholder="Password (min 8 chars)"
                  value={form.password}
                  onChange={(e) => setForm({ ...form, password: e.target.value })}
                  required
                  minLength={8}
                />
                <button
                  type="button"
                  onClick={() => setShowPwd(!showPwd)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted hover:text-white transition-colors"
                >
                  {showPwd ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>

              {/* Forgot password */}
              {mode === "login" && (
                <div className="flex justify-end">
                  <button type="button" onClick={handleForgotPassword}
                    className="text-sm font-semibold transition-colors hover:underline"
                    style={{ color: "#adff44" }}>
                    Forgot Password?
                  </button>
                </div>
              )}

              {/* Student extra fields */}
              {mode === "register" && role === "student" && (
                <div className="space-y-3">
                  <div className="grid grid-cols-2 gap-3">
                    <select className="input" value={form.grade} onChange={(e) => setForm({ ...form, grade: Number(e.target.value) })}>
                      <option value={6}>Class 6</option>
                      <option value={9}>Class 9</option>
                    </select>
                    <select className="input" value={form.target_exam} onChange={(e) => setForm({ ...form, target_exam: e.target.value })}>
                      <option value="JNV">JNV</option>
                      <option value="Sainik">Sainik</option>
                    </select>
                  </div>
                  
                  <input className="input" placeholder="School Name" value={form.school_name} onChange={(e) => setForm({ ...form, school_name: e.target.value })} required />
                  
                  <div className="grid grid-cols-2 gap-3 z-30 relative">
                    <SearchableSelect 
                      options={STATES} 
                      placeholder="State" 
                      value={form.state} 
                      onChange={(val) => setForm({ ...form, state: val, district: "", city: "" })} 
                      required 
                    />
                    <SearchableSelect 
                      options={form.state ? (STATES_AND_DISTRICTS[form.state] || []) : []} 
                      placeholder="District" 
                      value={form.district} 
                      onChange={(val) => setForm({ ...form, district: val })} 
                      required 
                      disabled={!form.state}
                    />
                  </div>
                  
                  <div className="grid grid-cols-2 gap-3 z-20 relative">
                    <SearchableSelect 
                      options={form.state ? (CITIES_BY_STATE[form.state] || []) : []} 
                      placeholder="City / Town" 
                      value={form.city} 
                      onChange={(val) => setForm({ ...form, city: val })} 
                      required 
                      allowCustom={true}
                    />
                    <SearchableSelect 
                      options={SECTIONS} 
                      placeholder="Section" 
                      value={form.section} 
                      onChange={(val) => setForm({ ...form, section: val })} 
                      required 
                    />
                  </div>
                  
                  <select className="input" value={form.medium} onChange={(e) => setForm({ ...form, medium: e.target.value })} required>
                    <option value="English">English Medium</option>
                    <option value="Hindi">Hindi Medium</option>
                    <option value="Telugu">Telugu Medium</option>
                  </select>
                </div>
              )}

              {/* Parent extra fields */}
              {mode === "register" && role === "parent" && (
                <>
                  <input className="input" type="tel" placeholder="Phone number (optional)" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
                  <input className="input" placeholder="Student email or ID (optional)" value={form.student_identifier || ""} onChange={(e) => setForm({ ...form, student_identifier: e.target.value })} />
                </>
              )}

              {/* Admin note */}
              {mode === "login" && role === "admin" && (
                <p className="text-xs rounded-xl px-3 py-2" style={{ background: "rgba(255,255,255,0.04)", color: "#8a8a8a" }}>
                  Admin accounts are provisioned manually. Use your issued credentials.
                </p>
              )}

              {/* Submit */}
              <button type="submit" className="btn-primary w-full py-3.5 text-base font-bold mt-2">
                {mode === "login" ? "Sign In" : "Create Account"}
              </button>
            </form>

            {/* Toggle mode */}
            {role !== "admin" && (
              <button
                type="button"
                onClick={() => setMode(mode === "login" ? "register" : "login")}
                className="mt-5 w-full text-sm font-semibold text-center transition-colors hover:underline"
                style={{ color: "#adff44" }}
              >
                {mode === "login" ? "New here? Create a free account →" : "Already registered? Sign in →"}
              </button>
            )}
          </div>
        </motion.div>
      </div>
    </div>
  );
}