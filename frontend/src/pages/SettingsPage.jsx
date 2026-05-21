import { useAuth } from "../context/AuthContext.jsx";
export default function SettingsPage() {
  const { toggleTheme } = useAuth();
  return <div className="card"><h2 className="text-xl font-bold">Settings</h2><button className="btn-soft mt-4" onClick={toggleTheme}>Toggle dark mode</button></div>;
}
