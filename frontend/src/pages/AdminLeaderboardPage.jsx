import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Filter, Search, ChevronLeft, ChevronRight, Download } from "lucide-react";
import api from "../api/client";

export default function AdminLeaderboardPage() {
  const [data, setData] = useState([]);
  const [totalCount, setTotalCount] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);

  const [filters, setFilters] = useState({
    school_name: "",
    state: "",
    district: "",
    medium: "",
    sort_by: "highest_score"
  });

  const fetchLeaderboard = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page,
        limit: 20,
        sort_by: filters.sort_by
      });
      if (filters.school_name) params.append("school_name", filters.school_name);
      if (filters.state) params.append("state", filters.state);
      if (filters.district) params.append("district", filters.district);
      if (filters.medium) params.append("medium", filters.medium);

      const res = await api.get(`/api/leaderboard/admin?${params.toString()}`);
      setData(res.data.data);
      setTotalCount(res.data.total_count);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLeaderboard();
  }, [page, filters]);

  return (
    <div className="flex h-full bg-black text-white p-6 gap-6">
      {/* Sidebar Filters */}
      <div className="w-64 flex-shrink-0 bg-neutral-900 rounded-2xl p-5 border border-white/10 h-fit">
        <div className="flex items-center gap-2 mb-6 font-display font-bold text-lg text-[#adff44]">
          <Filter size={20} />
          Filters
        </div>
        
        <div className="space-y-5">
          <div>
            <label className="text-xs text-neutral-400 mb-1.5 block uppercase tracking-wider font-semibold">School Name</label>
            <input 
              type="text" 
              placeholder="e.g., JNV Rohtak" 
              className="w-full bg-black border border-white/10 rounded-lg px-3 py-2 text-sm focus:border-[#adff44] outline-none"
              value={filters.school_name}
              onChange={(e) => setFilters(p => ({ ...p, school_name: e.target.value }))}
            />
          </div>
          <div>
            <label className="text-xs text-neutral-400 mb-1.5 block uppercase tracking-wider font-semibold">State</label>
            <input 
              type="text" 
              placeholder="State name" 
              className="w-full bg-black border border-white/10 rounded-lg px-3 py-2 text-sm focus:border-[#adff44] outline-none"
              value={filters.state}
              onChange={(e) => setFilters(p => ({ ...p, state: e.target.value }))}
            />
          </div>
          <div>
            <label className="text-xs text-neutral-400 mb-1.5 block uppercase tracking-wider font-semibold">District</label>
            <input 
              type="text" 
              placeholder="District name" 
              className="w-full bg-black border border-white/10 rounded-lg px-3 py-2 text-sm focus:border-[#adff44] outline-none"
              value={filters.district}
              onChange={(e) => setFilters(p => ({ ...p, district: e.target.value }))}
            />
          </div>
          <div>
            <label className="text-xs text-neutral-400 mb-1.5 block uppercase tracking-wider font-semibold">Medium</label>
            <select 
              className="w-full bg-black border border-white/10 rounded-lg px-3 py-2 text-sm focus:border-[#adff44] outline-none"
              value={filters.medium}
              onChange={(e) => setFilters(p => ({ ...p, medium: e.target.value }))}
            >
              <option value="">All Mediums</option>
              <option value="English">English</option>
              <option value="Hindi">Hindi</option>
            </select>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-3xl font-display font-black">Global Analytics Leaderboard</h1>
            <p className="text-neutral-400 mt-1">Found {totalCount} matching students</p>
          </div>
          <div className="flex gap-3">
            <select 
              className="bg-neutral-900 border border-white/10 rounded-xl px-4 py-2 outline-none text-sm font-medium focus:border-[#adff44]"
              value={filters.sort_by}
              onChange={(e) => setFilters(p => ({ ...p, sort_by: e.target.value }))}
            >
              <option value="highest_score">Sort by Score</option>
              <option value="average_accuracy">Sort by Accuracy</option>
              <option value="quizzes_taken">Sort by Engagement</option>
            </select>
            <button className="bg-[#adff44] text-black px-4 py-2 rounded-xl text-sm font-bold flex items-center gap-2 hover:bg-[#9BE53D] transition-colors">
              <Download size={16} /> Export CSV
            </button>
          </div>
        </div>

        {/* Table */}
        <div className="bg-neutral-900 border border-white/10 rounded-2xl overflow-hidden flex-1 flex flex-col">
          <div className="overflow-x-auto flex-1">
            <table className="w-full text-left text-sm whitespace-nowrap">
              <thead className="bg-black/50 text-neutral-400 uppercase text-xs font-semibold tracking-wider">
                <tr>
                  <th className="px-6 py-4">Rank</th>
                  <th className="px-6 py-4">Student</th>
                  <th className="px-6 py-4">School</th>
                  <th className="px-6 py-4">State / Dist</th>
                  <th className="px-6 py-4 text-right">Quizzes</th>
                  <th className="px-6 py-4 text-right">Score</th>
                  <th className="px-6 py-4 text-right">Accuracy</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {loading ? (
                  <tr><td colSpan={7} className="text-center py-10 text-neutral-500">Loading data...</td></tr>
                ) : data.length === 0 ? (
                  <tr><td colSpan={7} className="text-center py-10 text-neutral-500">No students found matching filters.</td></tr>
                ) : (
                  data.map((row) => (
                    <tr key={row.student_id} className="hover:bg-white/5 transition-colors">
                      <td className="px-6 py-4 font-bold">#{row.rank}</td>
                      <td className="px-6 py-4">
                        <div className="font-semibold text-white">{row.name}</div>
                        <div className="text-xs text-neutral-400">Class {row.grade} · {row.medium}</div>
                      </td>
                      <td className="px-6 py-4">{row.school_name}</td>
                      <td className="px-6 py-4">
                        <div className="text-white">{row.district}</div>
                        <div className="text-xs text-neutral-400">{row.state}</div>
                      </td>
                      <td className="px-6 py-4 text-right font-medium">{row.quizzes_taken}</td>
                      <td className="px-6 py-4 text-right font-medium text-[#adff44]">{row.score}</td>
                      <td className="px-6 py-4 text-right font-medium">{row.accuracy}%</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
          
          {/* Pagination */}
          <div className="p-4 border-t border-white/10 flex items-center justify-between bg-black/20">
            <div className="text-sm text-neutral-400">
              Showing <span className="text-white font-medium">{(page-1)*20 + 1}</span> to <span className="text-white font-medium">{Math.min(page*20, totalCount)}</span> of <span className="text-white font-medium">{totalCount}</span>
            </div>
            <div className="flex gap-2">
              <button 
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page === 1}
                className="p-2 rounded-lg bg-neutral-800 disabled:opacity-50 hover:bg-neutral-700 transition-colors"
              >
                <ChevronLeft size={18} />
              </button>
              <button 
                onClick={() => setPage(p => p + 1)}
                disabled={page * 20 >= totalCount}
                className="p-2 rounded-lg bg-neutral-800 disabled:opacity-50 hover:bg-neutral-700 transition-colors"
              >
                <ChevronRight size={18} />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
