import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Trophy, Medal, ArrowUp, Search } from "lucide-react";
import api from "../api/client";

const cap = (v) => Math.min(100, Math.max(0, Number(v) || 0));

export default function LeaderboardPage() {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  useEffect(() => {
    api.get("/leaderboard", { params: { limit: 100 } })
      .then((res) => setRows(res.data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const filtered = search
    ? rows.filter((r) => r.name.toLowerCase().includes(search.toLowerCase()))
    : rows;

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 rounded-full border-2 animate-spin" style={{ borderColor: "rgba(173,255,68,0.3)", borderTopColor: "#adff44" }} />
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
        <div className="flex items-center gap-3 mb-1">
          <Trophy size={22} style={{ color: "#ffd700" }} />
          <h1 className="font-display font-black text-2xl text-white">Global Leaderboard</h1>
        </div>
        <p className="text-sm" style={{ color: "#8a8a8a" }}>Top performers across all grades</p>
      </motion.div>

      <div className="relative max-w-xs">
        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: "#8a8a8a" }} />
        <input
          className="input pl-9 text-sm py-2.5"
          placeholder="Search by name..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      <div className="rounded-2xl overflow-hidden" style={{ background: "rgba(17,17,17,0.9)", border: "1px solid rgba(255,255,255,0.07)" }}>
        {filtered.length === 0 ? (
          <div className="flex flex-col items-center py-16">
            <Trophy size={40} style={{ color: "#8a8a8a" }} className="mb-3" />
            <p className="text-white font-semibold mb-1">No results found</p>
            <p className="text-sm" style={{ color: "#8a8a8a" }}>Try a different search term</p>
          </div>
        ) : (
          <div className="divide-y" style={{ borderColor: "rgba(255,255,255,0.06)" }}>
            {filtered.map((row, i) => {
              const isTop3 = i < 3;
              const medals = ["🥇", "🥈", "🥉"];
              return (
                <motion.div
                  key={row.student_id}
                  initial={{ opacity: 0, x: -8 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.02 }}
                  className="flex items-center gap-4 px-5 py-4"
                  style={{
                    background: isTop3 ? "rgba(173,255,68,0.03)" : "transparent",
                  }}
                >
                  <span className="w-8 text-center text-base font-bold" style={{ color: isTop3 ? "#adff44" : "#8a8a8a" }}>
                    {isTop3 ? medals[i] : `#${row.rank}`}
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-white truncate">{row.name}</p>
                    <p className="text-[11px]" style={{ color: "#8a8a8a" }}>Class {row.grade}</p>
                  </div>
                  <div className="flex items-center gap-4">
                    <span className="text-xs font-bold px-2.5 py-1 rounded-full" style={{ background: "rgba(173,255,68,0.1)", color: "#adff44" }}>
                      {cap(row.accuracy)}%
                    </span>
                    <span className="text-xs font-semibold" style={{ color: "#bdbdbd" }}>{row.score} pts</span>
                    {row.streak > 0 && (
                      <span className="text-xs flex items-center gap-1" style={{ color: "#ff6b6b" }}>
                        <ArrowUp size={10} /> {row.streak}
                      </span>
                    )}
                  </div>
                </motion.div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
