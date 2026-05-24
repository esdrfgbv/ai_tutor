import { useState, useEffect } from "react";
import { NavLink, Outlet, useLocation } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  BarChart3, BookOpen, Brain, ClipboardList, Home,
  LogOut, User, ChevronLeft, ChevronRight, Flame,
  Bell, Search, Zap, Settings, Menu, X
} from "lucide-react";
import { useAuth } from "../context/AuthContext.jsx";

const studentNav = [
  { to: "/student", label: "Dashboard", icon: Home, shortLabel: "Home" },
  { to: "/chapters", label: "Study Modules", icon: BookOpen, shortLabel: "Study" },
  { to: "/doubts", label: "AI Tutor", icon: Brain, shortLabel: "Tutor" },
  { to: "/quiz", label: "Tests", icon: ClipboardList, shortLabel: "Tests" },
  { to: "/analytics", label: "Analytics", icon: BarChart3, shortLabel: "Stats" },
  { to: "/profile", label: "Profile", icon: User, shortLabel: "Profile" },
];

const parentNav = [
  { to: "/parent", label: "Dashboard", icon: Home, shortLabel: "Home" },
  { to: "/profile", label: "Profile", icon: User, shortLabel: "Profile" },
];

const adminNav = [
  { to: "/admin", label: "Dashboard", icon: BarChart3, shortLabel: "Admin" },
  { to: "/profile", label: "Profile", icon: User, shortLabel: "Profile" },
];

const roleGradient = {
  student: "from-neon/20 to-transparent",
  parent: "from-blue-500/20 to-transparent",
  admin: "from-purple-500/20 to-transparent",
};

export default function AppLayout() {
  const { user, logout } = useAuth();
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const location = useLocation();

  const home = `/${user.role}`;
  const nav = user.role === "student" ? studentNav : user.role === "parent" ? parentNav : adminNav;

  // Close mobile menu on route change
  useEffect(() => {
    setMobileOpen(false);
  }, [location.pathname]);

  const initials = user.full_name
    ? user.full_name.split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase()
    : "U";

  return (
    <div className="min-h-screen bg-[#000000] flex">
      {/* ── DESKTOP SIDEBAR ── */}
      <motion.aside
        initial={false}
        animate={{ width: collapsed ? 72 : 265 }}
        transition={{ duration: 0.3, ease: [0.25, 0.46, 0.45, 0.94] }}
        className="hidden xl:flex flex-col fixed inset-y-0 left-0 z-30 overflow-hidden"
        style={{
          background: "rgba(10,10,10,0.95)",
          borderRight: "1px solid rgba(255,255,255,0.06)",
          backdropFilter: "blur(20px)",
        }}
      >
        {/* Brand */}
        <div className="flex items-center justify-between p-4 mb-2 mt-2">
          <AnimatePresence mode="wait">
            {!collapsed && (
              <motion.div
                key="brand-full"
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -10 }}
                transition={{ duration: 0.2 }}
                className="flex items-center gap-3 min-w-0"
              >
                <div className="ai-orb flex-shrink-0" style={{ width: 32, height: 32, minWidth: 32 }} />
                <div className="min-w-0">
                  <p className="font-display font-bold text-white truncate leading-tight text-sm">Prep100</p>
                  <p className="text-[10px] text-muted leading-tight truncate">JNV · Sainik School</p>
                </div>
              </motion.div>
            )}
            {collapsed && (
              <motion.div
                key="brand-small"
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.8 }}
                className="mx-auto"
              >
                <div className="ai-orb" style={{ width: 32, height: 32 }} />
              </motion.div>
            )}
          </AnimatePresence>
          {!collapsed && (
            <button
              onClick={() => setCollapsed(true)}
              className="flex-shrink-0 p-1.5 rounded-lg text-muted hover:text-white hover:bg-white/5 transition-all"
            >
              <ChevronLeft size={16} />
            </button>
          )}
        </div>

        {/* Expand button when collapsed */}
        {collapsed && (
          <button
            onClick={() => setCollapsed(false)}
            className="mx-auto mt-1 p-1.5 rounded-lg text-muted hover:text-white hover:bg-white/5 transition-all"
          >
            <ChevronRight size={16} />
          </button>
        )}

        {/* Nav Items */}
        <nav className="flex-1 px-3 space-y-1 mt-4 overflow-y-auto">
          {nav.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === home}
              title={collapsed ? item.label : undefined}
              className={({ isActive }) =>
                `flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all duration-200 group relative overflow-hidden
                ${isActive
                  ? "bg-neon/10 text-neon border-l-2 border-neon"
                  : "text-muted hover:text-white hover:bg-white/5 border-l-2 border-transparent"
                }`
              }
            >
              {({ isActive }) => (
                <>
                  <item.icon size={18} className={`flex-shrink-0 ${isActive ? "text-neon" : "group-hover:text-white"}`} style={isActive ? { filter: "drop-shadow(0 0 6px rgba(173,255,68,0.6))" } : {}} />
                  <AnimatePresence>
                    {!collapsed && (
                      <motion.span
                        initial={{ opacity: 0, width: 0 }}
                        animate={{ opacity: 1, width: "auto" }}
                        exit={{ opacity: 0, width: 0 }}
                        transition={{ duration: 0.2 }}
                        className="truncate whitespace-nowrap overflow-hidden"
                      >
                        {item.label}
                      </motion.span>
                    )}
                  </AnimatePresence>
                </>
              )}
            </NavLink>
          ))}
        </nav>

        {/* User Section */}
        <div className="p-3 border-t border-white/[0.06]">
          {/* XP Bar (students only) */}
          {user.role === "student" && !collapsed && (
            <div className="mb-3 px-1">
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-[10px] text-muted font-medium">Daily XP</span>
                <span className="text-[10px] text-neon font-bold">240 / 500</span>
              </div>
              <div className="progress-bar">
                <div className="progress-fill" style={{ width: "48%" }} />
              </div>
            </div>
          )}

          {/* Avatar + Logout */}
          <div className={`flex items-center gap-3 rounded-xl p-2 hover:bg-white/5 transition-all ${collapsed ? "justify-center" : ""}`}>
            <div className="flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-black"
              style={{ background: "var(--neon)" }}>
              {initials}
            </div>
            <AnimatePresence>
              {!collapsed && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="flex-1 min-w-0"
                >
                  <p className="text-xs font-semibold text-white truncate">{user.full_name}</p>
                  <p className="text-[10px] text-muted capitalize">{user.role}</p>
                </motion.div>
              )}
            </AnimatePresence>
            {!collapsed && (
              <button
                onClick={logout}
                className="flex-shrink-0 p-1.5 rounded-lg text-muted hover:text-white hover:bg-white/5 transition-all"
                title="Log out"
              >
                <LogOut size={14} />
              </button>
            )}
          </div>
          {collapsed && (
            <button
              onClick={logout}
              className="w-full mt-2 flex justify-center p-2 rounded-xl text-muted hover:text-white hover:bg-white/5 transition-all"
              title="Log out"
            >
              <LogOut size={16} />
            </button>
          )}
        </div>
      </motion.aside>

      {/* ── MOBILE OVERLAY SIDEBAR ── */}
      <AnimatePresence>
        {mobileOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setMobileOpen(false)}
              className="fixed inset-0 z-40 bg-black/70 backdrop-blur-sm xl:hidden"
            />
            <motion.aside
              initial={{ x: -280 }}
              animate={{ x: 0 }}
              exit={{ x: -280 }}
              transition={{ type: "spring", damping: 30, stiffness: 300 }}
              className="fixed inset-y-0 left-0 z-50 w-72 xl:hidden flex flex-col"
              style={{
                background: "rgba(10,10,10,0.98)",
                borderRight: "1px solid rgba(255,255,255,0.06)",
              }}
            >
              <div className="flex items-center justify-between p-5">
                <div className="flex items-center gap-3">
                  <div className="ai-orb" style={{ width: 32, height: 32 }} />
                  <div>
                    <p className="font-display font-bold text-white text-sm">Prep100</p>
                    <p className="text-[10px] text-muted">JNV · Sainik School</p>
                  </div>
                </div>
                <button onClick={() => setMobileOpen(false)} className="p-1.5 rounded-lg text-muted hover:text-white">
                  <X size={18} />
                </button>
              </div>
              <nav className="flex-1 px-4 space-y-1">
                {nav.map((item) => (
                  <NavLink
                    key={item.to}
                    to={item.to}
                    end={item.to === home}
                    className={({ isActive }) =>
                      `flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all
                      ${isActive ? "bg-neon/10 text-neon border-l-2 border-neon" : "text-muted hover:text-white hover:bg-white/5 border-l-2 border-transparent"}`
                    }
                  >
                    {({ isActive }) => (
                      <>
                        <item.icon size={18} className={isActive ? "text-neon" : ""} />
                        <span>{item.label}</span>
                      </>
                    )}
                  </NavLink>
                ))}
              </nav>
              <div className="p-4 border-t border-white/[0.06]">
                <div className="flex items-center gap-3 p-2">
                  <div className="w-9 h-9 rounded-full flex items-center justify-center text-xs font-bold text-black" style={{ background: "var(--neon)" }}>
                    {initials}
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-semibold text-white">{user.full_name}</p>
                    <p className="text-xs text-muted capitalize">{user.role}</p>
                  </div>
                  <button onClick={logout} className="p-2 rounded-lg text-muted hover:text-white">
                    <LogOut size={16} />
                  </button>
                </div>
              </div>
            </motion.aside>
          </>
        )}
      </AnimatePresence>

      {/* ── MAIN CONTENT ── */}
      <div className="flex-1 flex flex-col xl:pl-[265px] transition-all duration-300"
        style={{ paddingLeft: collapsed ? undefined : undefined }}>
        {/* Override padding based on collapse state */}
        <style>{`.xl\\:pl-\\[265px\\] { padding-left: ${collapsed ? "72px" : "265px"}; }`}</style>

        {/* ── FLOATING NAVBAR ── */}
        <header
          className="sticky top-0 z-20 flex items-center justify-between px-5 py-3"
          style={{
            background: "rgba(0,0,0,0.85)",
            backdropFilter: "blur(20px)",
            borderBottom: "1px solid rgba(255,255,255,0.06)",
          }}
        >
          {/* Left: Hamburger (mobile) + Page context */}
          <div className="flex items-center gap-3">
            <button
              onClick={() => setMobileOpen(true)}
              className="xl:hidden p-2 rounded-xl text-muted hover:text-white hover:bg-white/5 transition-all"
            >
              <Menu size={20} />
            </button>
            <div className="hidden sm:block">
              <p className="text-xs text-muted">Welcome back 👋</p>
              <p className="text-sm font-semibold text-white leading-tight">{user.full_name}</p>
            </div>
          </div>

          {/* Right: Actions */}
          <div className="flex items-center gap-2">
            {/* Streak badge (students) */}
            {user.role === "student" && (
              <div className="hidden sm:flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-bold"
                style={{ background: "rgba(255,107,107,0.12)", border: "1px solid rgba(255,107,107,0.2)", color: "#ff6b6b" }}>
                <Flame size={13} />
                <span>Streak</span>
              </div>
            )}
            <button className="relative p-2 rounded-xl text-muted hover:text-white hover:bg-white/5 transition-all">
              <Bell size={18} />
              <span className="absolute top-1.5 right-1.5 w-1.5 h-1.5 rounded-full bg-neon" />
            </button>
            <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-black cursor-pointer"
              style={{ background: "var(--neon)" }}>
              {initials}
            </div>
          </div>
        </header>

        {/* ── PAGE CONTENT ── */}
        <main className="flex-1 overflow-y-auto">
          <div className="mx-auto max-w-7xl px-4 py-6 page-enter">
            <Outlet />
          </div>
        </main>
      </div>

      {/* ── MOBILE BOTTOM NAV ── */}
      <nav
        className="fixed inset-x-0 bottom-0 z-30 xl:hidden"
        style={{
          background: "rgba(0,0,0,0.95)",
          backdropFilter: "blur(20px)",
          borderTop: "1px solid rgba(255,255,255,0.06)",
        }}
      >
        <div className="flex items-center justify-around px-2 py-2">
          {nav.slice(0, 5).map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === home}
              className={({ isActive }) =>
                `bottom-nav-item ${isActive ? "active" : ""}`
              }
            >
              {({ isActive }) => (
                <>
                  <item.icon size={20} style={isActive ? { filter: "drop-shadow(0 0 6px rgba(173,255,68,0.6))" } : {}} />
                  <span>{item.shortLabel}</span>
                  {isActive && (
                    <motion.div
                      layoutId="bottomNavDot"
                      className="absolute -top-0 w-4 h-0.5 rounded-full bg-neon"
                    />
                  )}
                </>
              )}
            </NavLink>
          ))}
        </div>
      </nav>
    </div>
  );
}
