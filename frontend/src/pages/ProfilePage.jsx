import { useEffect, useState } from "react";
import { useAuth } from "../context/AuthContext.jsx";
import api from "../api/client.js";

export default function ProfilePage() {
  const { user } = useAuth();
  const [studentProfile, setStudentProfile] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    if (user?.role === "student") {
      api.get("/learning/profile")
        .then((res) => setStudentProfile(res.data))
        .catch((err) => setError(err.response?.data?.detail || "Could not load profile"));
    }
  }, [user]);

  return (
    <div className="card">
      <h2 className="text-xl font-bold">Profile</h2>
      <p className="mt-4 text-lg font-semibold">{user.full_name}</p>
      <p className="text-black/60 dark:text-white/60">{user.email} · {user.role}</p>
      {user?.role === "student" && studentProfile && (
        <div className="mt-6 space-y-3 rounded-lg bg-black/5 p-4 dark:bg-white/5">
          <p className="text-sm font-semibold text-black/70 dark:text-white/70">Share this ID with parents to link their account</p>
          <p className="text-2xl font-bold text-mint">{studentProfile.id}</p>
          <p className="text-xs text-black/50 dark:text-white/50">Grade: {studentProfile.grade} · Target: {studentProfile.target_exam}</p>
        </div>
      )}
      {error && <p className="mt-4 text-sm text-red-600">{error}</p>}
    </div>
  );
}
