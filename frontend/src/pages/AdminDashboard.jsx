import {
  Activity,
  ClipboardList,
  Users,
  TrendingUp,
  BookOpen,
  Flame,
  AlertCircle,
} from "lucide-react";

import { useEffect, useState } from "react";

import {
  Bar,
  BarChart,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
 YAxis,
} from "recharts";

import api from "../api/client";
import ErrorNotice from "../components/ErrorNotice.jsx";
import MetricCard from "../components/MetricCard.jsx";
import EmptyState from "../components/EmptyState.jsx";

const cap = (v) => Math.min(100, Math.max(0, Number(v) || 0));

const COLORS = [
  "#4fb286",
  "#f9735b",
  "#f4b942",
  "#6366f1",
  "#ec4899",
  "#14b8a6",
];

export default function AdminDashboard() {
  const [overview, setOverview] = useState(null);
  const [users, setUsers] = useState([]);
  const [links, setLinks] = useState([]);
  const [error, setError] = useState("");
  const [activeTab, setActiveTab] = useState("overview");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    console.log("[AdminDashboard] Loading admin data...");

    Promise.all([
      api.get("/analytics/admin"),
      api.get("/admin/users"),
      api.get("/admin/parent-links"),
    ])
      .then(([o, u, l]) => {
        console.log("[AdminDashboard] Data loaded successfully");

        setOverview(o.data);
        setUsers(u.data);
        setLinks(l.data);
        setError("");
      })
      .catch((err) => {
        const errorMsg =
          err.response?.data?.detail ||
          err.message ||
          "Could not load admin console.";

        console.error("[AdminDashboard] Failed to load data:", errorMsg);

        setError(errorMsg);
      })
      .finally(() => {
        setLoading(false);
      });
  }, []);

  const approve = async (linkId) => {
    try {
      await api.post(`/admin/parent-links/${linkId}/approve`);

      setLinks((items) =>
        items.map((item) =>
          item.link_id === linkId
            ? { ...item, status: "approved" }
            : item
        )
      );
    } catch (err) {
      setError(err.response?.data?.detail || "Could not approve link");
    }
  };

  if (loading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3, 4].map((i) => (
          <div
            key={i}
            className="card h-32 animate-pulse bg-black/5 dark:bg-white/5"
          />
        ))}
      </div>
    );
  }

  if (error && !overview) {
    return (
      <div className="space-y-4">
        <ErrorNotice message={error} />

        <div className="card border border-yellow-200 bg-yellow-50 p-4 dark:border-yellow-900 dark:bg-yellow-900/20">
          <div className="flex gap-3">
            <AlertCircle
              className="mt-1 flex-shrink-0 text-yellow-600 dark:text-yellow-400"
              size={20}
            />

            <div className="text-sm">
              <p className="font-semibold text-yellow-800 dark:text-yellow-300">
                Debug Info:
              </p>

              <p className="mt-1 font-mono text-yellow-700 dark:text-yellow-200">
                {error}
              </p>

              <p className="mt-2 text-xs text-yellow-600 dark:text-yellow-400">
                API URL: {api.defaults.baseURL}
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const tabs = ["overview", "students", "parent links"];

  return (
    <div className="space-y-6">
      {error && <ErrorNotice message={error} />}

      {/* KPI ROW */}
      {overview && (
        <>
          <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-4">
            <MetricCard
              icon={Users}
              label="Total Students"
              value={overview.students || 0}
            />

            <MetricCard
              icon={ClipboardList}
              label="Total Attempts"
              value={overview.attempts || 0}
              accent="bg-coral"
            />

            <MetricCard
              icon={Activity}
              label="Active (7 days)"
              value={overview.active_students_7d || 0}
              accent="bg-gold"
            />

            <MetricCard
              icon={TrendingUp}
              label="Avg Accuracy"
              value={`${cap(overview.average_accuracy)}%`}
              accent="bg-mint"
            />
          </div>

          {/* ENGAGEMENT */}
          <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-4">
            <div className="card text-center">
              <BookOpen size={20} className="mx-auto text-mint" />

              <p className="mt-2 text-xl font-black">
                {overview.engagement?.study_sessions || 0}
              </p>

              <p className="mt-1 text-xs text-black/50 dark:text-white/50">
                Study Sessions
              </p>
            </div>

            <div className="card text-center">
              <Flame size={20} className="mx-auto text-coral" />

              <p className="mt-2 text-xl font-black">
                {overview.engagement?.study_hours_7d || 0}h
              </p>

              <p className="mt-1 text-xs text-black/50 dark:text-white/50">
                Study Hours (7d)
              </p>
            </div>

            <div className="card text-center">
              <ClipboardList size={20} className="mx-auto text-gold" />

              <p className="mt-2 text-xl font-black">
                {overview.engagement?.mock_attempts || 0}
              </p>

              <p className="mt-1 text-xs text-black/50 dark:text-white/50">
                Mock Attempts
              </p>
            </div>

            <div className="card text-center">
              <Activity size={20} className="mx-auto text-purple-500" />

              <p className="mt-2 text-xl font-black">
                {cap(overview.chapter_completion_avg)}%
              </p>

              <p className="mt-1 text-xs text-black/50 dark:text-white/50">
                Avg Chapter Completion
              </p>
            </div>
          </div>

          {/* TABS */}
          <div className="flex w-fit gap-1 rounded-xl bg-black/5 p-1 dark:bg-white/5">
            {tabs.map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`rounded-lg px-4 py-2 text-sm font-semibold capitalize transition-colors ${
                  activeTab === tab
                    ? "bg-white text-black shadow-sm dark:bg-white/10 dark:text-white"
                    : "text-black/50 hover:text-black dark:text-white/50 dark:hover:text-white"
                }`}
              >
                {tab}
              </button>
            ))}
          </div>

          {/* OVERVIEW TAB */}
          {activeTab === "overview" && (
            <div className="space-y-6">
              <div className="grid gap-6 lg:grid-cols-2">
                {/* SUBJECT DISTRIBUTION */}
                <div className="card h-72">
                  <h2 className="mb-4 font-bold">
                    Subject Distribution (Attempts)
                  </h2>

                  {overview.subject_distribution?.length ? (
                    <ResponsiveContainer width="100%" height="80%">
                      <BarChart
                        data={overview.subject_distribution}
                        barSize={36}
                      >
                        <XAxis
                          dataKey="subject"
                          tick={{ fontSize: 12 }}
                        />

                        <YAxis tick={{ fontSize: 11 }} />

                        <Tooltip formatter={(v) => [v, "Attempts"]} />

                        <Bar
                          dataKey="attempts"
                          radius={[4, 4, 0, 0]}
                        >
                          {overview.subject_distribution.map((_, i) => (
                            <Cell
                              key={i}
                              fill={COLORS[i % COLORS.length]}
                            />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  ) : (
                    <p className="text-sm text-black/50 dark:text-white/50">
                      No quiz attempts yet.
                    </p>
                  )}
                </div>

                {/* PLATFORM STATS */}
                <div className="card">
                  <h2 className="mb-4 font-bold">
                    Platform Statistics
                  </h2>

                  <ul className="space-y-3 text-sm">
                    {[
                      {
                        label: "Quizzes published",
                        value: overview.quizzes || 0,
                      },
                      {
                        label: "Questions in bank",
                        value: overview.questions || 0,
                      },
                      {
                        label: "Active sessions now",
                        value:
                          overview.engagement?.active_sessions || 0,
                      },
                      {
                        label: "Total students",
                        value: overview.students || 0,
                      },
                      {
                        label: "Total attempts",
                        value: overview.attempts || 0,
                      },
                    ].map((item) => (
                      <li
                        key={item.label}
                        className="flex items-center justify-between border-b border-black/5 pb-2 dark:border-white/5"
                      >
                        <span className="text-black/60 dark:text-white/55">
                          {item.label}
                        </span>

                        <span className="font-bold">
                          {item.value}
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>

              {/* LEADERBOARD */}
              <div className="card overflow-auto">
                <h2 className="mb-4 font-bold">
                  Global Leaderboard — Top 10 Performers
                </h2>

                {overview.top_performers?.length ? (
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="text-left text-xs uppercase text-black/50 dark:text-white/40">
                        <th className="pb-3">Rank</th>
                        <th className="pb-3">Name</th>
                        <th className="pb-3">Score</th>
                        <th className="pb-3">Accuracy</th>
                        <th className="pb-3">Points</th>
                        <th className="pb-3">Streak</th>
                      </tr>
                    </thead>

                    <tbody>
                      {overview.top_performers.map((row) => (
                        <tr
                          key={row.student_id}
                          className="border-t border-black/8 dark:border-white/8"
                        >
                          <td className="py-2 font-semibold">
                            {row.rank}
                          </td>

                          <td className="py-2 font-medium">
                            {row.name}
                          </td>

                          <td className="py-2">{row.score}</td>

                          <td className="py-2">
                            <span
                              className={`font-semibold ${
                                cap(row.accuracy) >= 70
                                  ? "text-mint"
                                  : "text-coral"
                              }`}
                            >
                              {cap(row.accuracy)}%
                            </span>
                          </td>

                          <td className="py-2">
                            {row.points}
                          </td>

                          <td className="py-2">
                            {row.streak}d 🔥
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                ) : (
                  <EmptyState title="No leaderboard data found" />
                )}
              </div>
            </div>
          )}

          {/* STUDENTS TAB */}
          {activeTab === "students" && (
            <div className="card overflow-auto">
              <h2 className="mb-4 font-bold">All Users</h2>

              {users.length > 0 ? (
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-black/10 text-left text-xs uppercase text-black/50 dark:border-white/10">
                      <th className="px-2 py-2">ID</th>
                      <th>Email</th>
                      <th>Name</th>
                      <th>Role</th>
                      <th>Status</th>
                    </tr>
                  </thead>

                  <tbody>
                    {users.map((user) => (
                      <tr
                        key={user.id}
                        className="border-b border-black/10 dark:border-white/10"
                      >
                        <td className="px-2 py-2">{user.id}</td>

                        <td>{user.email}</td>

                        <td>{user.full_name}</td>

                        <td className="capitalize">
                          {user.role}
                        </td>

                        <td>
                          {user.is_active
                            ? "Active"
                            : "Inactive"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : (
                <EmptyState title="No users found" />
              )}
            </div>
          )}

          {/* PARENT LINKS TAB */}
          {activeTab === "parent links" && (
            <div className="card overflow-auto">
              <h2 className="mb-4 font-bold">
                Parent-child links
              </h2>

              {links.length > 0 ? (
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-black/10 text-left text-xs uppercase text-black/50 dark:border-white/10">
                      <th className="px-2 py-2">Parent</th>
                      <th>Child</th>
                      <th>Status</th>
                      <th>Action</th>
                    </tr>
                  </thead>

                  <tbody>
                    {links.map((link) => (
                      <tr
                        key={link.link_id}
                        className="border-b border-black/10 dark:border-white/10"
                      >
                        <td className="px-2 py-2">
                          {link.parent_name || "N/A"}
                        </td>

                        <td>{link.student_name}</td>

                        <td>
                          <span
                            className={`rounded px-2 py-1 text-xs font-semibold ${
                              link.status === "approved"
                                ? "bg-mint/20 text-mint"
                                : link.status === "pending"
                                ? "bg-yellow-500/20 text-yellow-700"
                                : "bg-red-500/20 text-red-700"
                            }`}
                          >
                            {link.status}
                          </span>
                        </td>

                        <td>
                          {link.status === "pending" && (
                            <button
                              onClick={() =>
                                approve(link.link_id)
                              }
                              className="btn-soft px-2 py-1 text-xs"
                            >
                              Approve
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : (
                <EmptyState title="No parent links found" />
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}