import { BarChart3, BookOpen, Brain, ClipboardList, Home, LogOut, Moon, User } from "lucide-react";
import { NavLink, Outlet } from "react-router-dom";
import { useAuth } from "../context/AuthContext.jsx";

const studentNav = [
  { to: "/student", label: "Home", icon: Home },
  { to: "/chapters", label: "Study Modules", icon: BookOpen },
  { to: "/doubts", label: "AI Doubts", icon: Brain },
  { to: "/quiz", label: "Tests", icon: ClipboardList },
  { to: "/analytics", label: "Analytics", icon: BarChart3 },
  { to: "/profile", label: "Profile", icon: User },
];

const parentNav = [
  { to: "/parent", label: "Dashboard", icon: Home },
  { to: "/profile", label: "Profile", icon: User },
];

const adminNav = [
  { to: "/admin", label: "Dashboard", icon: BarChart3 },
  { to: "/profile", label: "Profile", icon: User },
];

export default function AppLayout() {
  const { user, logout, toggleTheme } = useAuth();
  const home = `/${user.role}`;
  const nav = user.role === "student" ? studentNav : user.role === "parent" ? parentNav : adminNav;
  return (
    <div className="min-h-screen bg-[#f8fbf9] dark:bg-[#111816]">
      <aside className="fixed inset-y-0 left-0 hidden w-64 border-r border-black/10 bg-white/80 p-4 backdrop-blur xl:block dark:border-white/10 dark:bg-black/20">
        <NavLink to={home} className="block rounded-lg bg-ink p-4 text-white dark:bg-mint dark:text-ink">
          <p className="text-lg font-bold">PrepOrbit AI</p>
          <p className="text-xs opacity-80">JNV + Sainik School</p>
        </NavLink>
        <nav className="mt-8 space-y-1">
          {nav.map((item) => (
            <NavLink key={item.to} to={item.to} className={({ isActive }) => `flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium ${isActive ? "bg-mint text-white" : "text-black/70 hover:bg-black/5 dark:text-white/70 dark:hover:bg-white/5"}`}>
              <item.icon size={18} /> {item.label}
            </NavLink>
          ))}
        </nav>
      </aside>
      <main className="xl:pl-64">
        <header className="sticky top-0 z-20 flex items-center justify-between border-b border-black/10 bg-white/75 px-4 py-3 backdrop-blur dark:border-white/10 dark:bg-[#111816]/80">
          <div>
            <p className="text-sm text-black/55 dark:text-white/60">Welcome back</p>
            <h1 className="font-semibold">{user.full_name}</h1>
          </div>
          <div className="flex items-center gap-2">
            <button className="btn-soft px-3" onClick={toggleTheme} aria-label="Toggle theme"><Moon size={18} /></button>
            <button className="btn-soft px-3" onClick={logout} aria-label="Log out"><LogOut size={18} /></button>
          </div>
        </header>
        <div className="mx-auto max-w-7xl px-4 py-6">
          <Outlet />
        </div>
      </main>
      <nav className="fixed inset-x-0 bottom-0 z-30 grid border-t border-black/10 bg-white/95 px-2 py-2 backdrop-blur xl:hidden dark:border-white/10 dark:bg-[#111816]/95" style={{ gridTemplateColumns: `repeat(${nav.length}, minmax(0, 1fr))` }}>
        {nav.map((item) => (
          <NavLink key={item.to} to={item.to} className={({ isActive }) => `flex flex-col items-center gap-1 rounded-lg px-2 py-2 text-[11px] font-semibold ${isActive ? "text-mint" : "text-black/60 dark:text-white/60"}`}>
            <item.icon size={18} />
            <span>{item.label.split(" ")[0]}</span>
          </NavLink>
        ))}
      </nav>
    </div>
  );
}
