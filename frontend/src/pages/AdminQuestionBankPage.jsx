import { useState, useEffect } from "react";
import { Search, Filter, BookOpen, Layers, Settings2, Plus } from "lucide-react";
import api from "../api/client";

export default function AdminQuestionBankPage() {
  const [data, setData] = useState([]);
  const [totalCount, setTotalCount] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [selectedQuestions, setSelectedQuestions] = useState(new Set());

  const [filters, setFilters] = useState({
    subject: "",
    grade: "",
    chapter: "",
  });

  const fetchQuestions = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page, limit: 20 });
      if (filters.subject) params.append("subject", filters.subject);
      if (filters.grade) params.append("grade", filters.grade);
      if (filters.chapter) params.append("chapter", filters.chapter);

      const res = await api.get(`/api/admin/questions?${params.toString()}`);
      setData(res.data.data);
      setTotalCount(res.data.total_count);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchQuestions();
  }, [page, filters]);

  const toggleSelection = (id) => {
    setSelectedQuestions(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  return (
    <div className="flex h-full bg-black text-white p-6 gap-6">
      {/* Filters Sidebar */}
      <div className="w-64 flex-shrink-0 bg-neutral-900 rounded-2xl p-5 border border-white/10 h-fit">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-2 font-display font-bold text-lg">
            <Filter size={20} className="text-[#adff44]" />
            Filters
          </div>
          <button 
            onClick={() => setFilters({ subject: "", grade: "", chapter: "" })}
            className="text-xs text-neutral-400 hover:text-white"
          >
            Clear all
          </button>
        </div>

        <div className="space-y-5">
          <div>
            <label className="text-xs text-neutral-400 mb-1.5 block uppercase tracking-wider font-semibold">Grade</label>
            <select 
              className="w-full bg-black border border-white/10 rounded-lg px-3 py-2 text-sm focus:border-[#adff44] outline-none"
              value={filters.grade}
              onChange={(e) => setFilters(p => ({ ...p, grade: e.target.value }))}
            >
              <option value="">All Grades</option>
              <option value="6">Class 6</option>
              <option value="9">Class 9</option>
            </select>
          </div>
          <div>
            <label className="text-xs text-neutral-400 mb-1.5 block uppercase tracking-wider font-semibold">Subject</label>
            <select 
              className="w-full bg-black border border-white/10 rounded-lg px-3 py-2 text-sm focus:border-[#adff44] outline-none"
              value={filters.subject}
              onChange={(e) => setFilters(p => ({ ...p, subject: e.target.value }))}
            >
              <option value="">All Subjects</option>
              <option value="maths">Maths</option>
              <option value="science">Science</option>
            </select>
          </div>
          <div>
            <label className="text-xs text-neutral-400 mb-1.5 block uppercase tracking-wider font-semibold">Chapter</label>
            <input 
              type="text" 
              placeholder="Search chapters..." 
              className="w-full bg-black border border-white/10 rounded-lg px-3 py-2 text-sm focus:border-[#adff44] outline-none"
              value={filters.chapter}
              onChange={(e) => setFilters(p => ({ ...p, chapter: e.target.value }))}
            />
          </div>
        </div>
      </div>

      {/* Main Area */}
      <div className="flex-1 flex flex-col min-w-0">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-3xl font-display font-black">Question Bank</h1>
            <p className="text-neutral-400 mt-1">Found {totalCount} questions matching criteria</p>
          </div>
          {selectedQuestions.size > 0 && (
            <div className="bg-[#adff44] text-black px-4 py-2 rounded-xl text-sm font-bold flex items-center gap-2 shadow-[0_0_20px_rgba(173,255,68,0.2)]">
              {selectedQuestions.size} Questions Selected
              <span className="w-px h-4 bg-black/20 mx-1"></span>
              <button className="hover:opacity-70">Create Mock Test</button>
            </div>
          )}
        </div>

        {/* Questions List */}
        <div className="flex-1 overflow-y-auto space-y-4 pr-2">
          {loading ? (
            <div className="text-center py-20 text-neutral-500">Loading questions...</div>
          ) : data.length === 0 ? (
            <div className="text-center py-20 text-neutral-500 bg-neutral-900 rounded-2xl border border-white/10">No questions found matching the filters.</div>
          ) : (
            data.map(q => {
              const isSelected = selectedQuestions.has(q.id);
              return (
                <div 
                  key={q.id} 
                  className={`bg-neutral-900 border rounded-2xl p-5 transition-all ${isSelected ? 'border-[#adff44] bg-[#adff44]/5' : 'border-white/10 hover:border-white/30'}`}
                >
                  <div className="flex gap-4">
                    <button 
                      onClick={() => toggleSelection(q.id)}
                      className={`w-6 h-6 rounded-md flex-shrink-0 flex items-center justify-center transition-colors ${isSelected ? 'bg-[#adff44] text-black' : 'border-2 border-white/20'}`}
                    >
                      {isSelected && <div className="w-2 h-2 rounded-sm bg-black" />}
                    </button>
                    
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-3 text-xs font-semibold">
                        <span className="bg-white/10 px-2.5 py-1 rounded-md text-white">{q.subject}</span>
                        <span className="bg-white/5 px-2.5 py-1 rounded-md text-neutral-400 truncate max-w-[200px]">{q.chapter}</span>
                        <span className="bg-white/5 px-2.5 py-1 rounded-md text-neutral-400 capitalize">{q.difficulty}</span>
                        <span className="bg-white/5 px-2.5 py-1 rounded-md text-[#adff44]">{q.marks} Marks</span>
                      </div>
                      
                      <h3 className="text-lg text-white mb-4 leading-relaxed font-medium">{q.prompt}</h3>
                      
                      <div className="grid grid-cols-2 gap-3">
                        {q.options.map((opt, i) => {
                          const isCorrect = q.correct_answer === opt;
                          return (
                            <div 
                              key={i} 
                              className={`p-3 rounded-xl border text-sm ${isCorrect ? 'border-[#adff44]/50 bg-[#adff44]/10 text-[#adff44]' : 'border-white/10 text-neutral-300'}`}
                            >
                              {opt}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
