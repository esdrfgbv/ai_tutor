import React, { useState, useEffect, useCallback, useRef } from "react";
import { Filter, BookOpen, Layers, Settings2, Loader, Database, CheckCircle2, Clock, Trophy } from "lucide-react";
import api from "../api/client";

export default function QuestionBankBrowser({ 
  onSelectionChange, 
  preSelected = new Set(), 
  preSelectedMap = new Map(),
  compact = false,
  hideSelection = false,
  children
}) {
  const [data, setData] = useState([]);
  const [totalCount, setTotalCount] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  
  // Selected state
  const [selectedSet, setSelectedSet] = useState(new Set(preSelected));
  const [selectedMap, setSelectedMap] = useState(new Map(preSelectedMap));

  // Initialize from props if they change
  useEffect(() => {
    setSelectedSet(new Set(preSelected));
    setSelectedMap(new Map(preSelectedMap));
  }, [preSelected, preSelectedMap]);

  // Removed text search, purely dropdown-driven
  const [filters, setFilters] = useState({
    source_id: "",
    subject: "",
    grade: "",
    section: "",
    year: "",
    difficulty: "",
    question_type: "",
  });

  const [sourceOptions, setSourceOptions] = useState([]);
  const [sectionOptions, setSectionOptions] = useState([]);
  const [yearOptions, setYearOptions] = useState([]);

  // Load filter options
  useEffect(() => {
    const loadFilterOptions = async () => {
      try {
        const [sourcesRes, sectionsRes, yearsRes] = await Promise.all([
          api.get("/admin/questions/sources"),
          api.get("/admin/questions/sections"),
          api.get("/admin/questions/years")
        ]);
        setSourceOptions(sourcesRes.data);
        setSectionOptions(sectionsRes.data);
        setYearOptions(yearsRes.data);
      } catch (error) {
        console.error("Failed to load filter options", error);
      }
    };
    loadFilterOptions();
  }, []);

  const fetchQuestions = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page, limit: compact ? 10 : 20 });
      Object.entries(filters).forEach(([key, val]) => {
        if (val) params.append(key, val);
      });

      const res = await api.get(`/admin/questions?${params.toString()}`);
      setData(res.data.data);
      setTotalCount(res.data.total_count);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [page, filters, compact]);

  useEffect(() => {
    fetchQuestions();
  }, [fetchQuestions]);

  const toggleSelection = (q) => {
    const newSet = new Set(selectedSet);
    const newMap = new Map(selectedMap);
    
    if (newSet.has(q.id)) {
      newSet.delete(q.id);
      newMap.delete(q.id);
    } else {
      newSet.add(q.id);
      newMap.set(q.id, q);
    }
    
    setSelectedSet(newSet);
    setSelectedMap(newMap);
    
    if (onSelectionChange) {
      onSelectionChange(newSet, newMap);
    }
  };

  const totalPages = Math.ceil(totalCount / (compact ? 10 : 20));
  const totalSelectedMarks = Array.from(selectedMap.values()).reduce((sum, q) => sum + (q.marks || 1), 0);

  return (
    <div className="flex flex-col h-full gap-4 min-h-0">
      {/* Horizontal Filters Section */}
      <div className="w-full flex-shrink-0 bg-neutral-900 rounded-2xl p-4 border border-white/10 shadow-sm">
        <div className="flex items-center gap-3 mb-3">
          <Filter className="text-[#adff44]" size={20} />
          <h2 className="text-xl font-display font-black text-white">Filters Section</h2>
          <div className="flex-1" />
          <button 
            onClick={() => {
              setFilters({
                source_id: "", subject: "", grade: "", section: "",
                year: "", difficulty: "", question_type: ""
              });
              setPage(1);
            }}
            className="text-xs text-neutral-400 hover:text-white bg-black px-3 py-1.5 rounded-lg border border-white/10 transition-colors"
          >
            Clear All
          </button>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 xl:grid-cols-7 gap-3">
          <div>
            <label className="text-[10px] text-neutral-500 mb-1 block uppercase tracking-wider font-bold">Source PDF</label>
            <select 
              className="w-full bg-black border border-white/10 rounded-xl px-3 py-2 text-sm text-white focus:border-[#adff44] outline-none transition-colors hover:border-white/20 appearance-none"
              value={filters.source_id}
              onChange={(e) => { setFilters(p => ({ ...p, source_id: e.target.value })); setPage(1); }}
            >
              <option value="">All Sources</option>
              {sourceOptions.map(s => (
                <option key={s.id} value={s.id}>{s.display_name || s.file_name} ({s.question_count})</option>
              ))}
            </select>
          </div>

          <div>
            <label className="text-[10px] text-neutral-500 mb-1 block uppercase tracking-wider font-bold">Subject</label>
            <select 
              className="w-full bg-black border border-white/10 rounded-xl px-3 py-2 text-sm text-white focus:border-[#adff44] outline-none transition-colors hover:border-white/20 appearance-none"
              value={filters.subject}
              onChange={(e) => { setFilters(p => ({ ...p, subject: e.target.value })); setPage(1); }}
            >
              <option value="">All Subjects</option>
              <option value="Mental Ability">Mental Ability</option>
              <option value="Arithmetic">Arithmetic</option>
              <option value="Language">Language</option>
              <option value="Science">Science</option>
              <option value="maths">Mathematics</option>
              <option value="english">English</option>
            </select>
          </div>

          <div>
            <label className="text-[10px] text-neutral-500 mb-1 block uppercase tracking-wider font-bold">Section</label>
            <select 
              className="w-full bg-black border border-white/10 rounded-xl px-3 py-2 text-sm text-white focus:border-[#adff44] outline-none transition-colors hover:border-white/20 appearance-none"
              value={filters.section}
              onChange={(e) => { setFilters(p => ({ ...p, section: e.target.value })); setPage(1); }}
            >
              <option value="">All Sections</option>
              {sectionOptions.map(s => (
                <option key={s.section_name} value={s.section_name}>{s.section_name} ({s.question_count})</option>
              ))}
            </select>
          </div>

          <div>
            <label className="text-[10px] text-neutral-500 mb-1 block uppercase tracking-wider font-bold">Grade</label>
            <select 
              className="w-full bg-black border border-white/10 rounded-xl px-3 py-2 text-sm text-white focus:border-[#adff44] outline-none transition-colors hover:border-white/20 appearance-none"
              value={filters.grade}
              onChange={(e) => { setFilters(p => ({ ...p, grade: e.target.value })); setPage(1); }}
            >
              <option value="">All</option>
              <option value="6">Class 6</option>
              <option value="9">Class 9</option>
            </select>
          </div>

          <div>
            <label className="text-[10px] text-neutral-500 mb-1 block uppercase tracking-wider font-bold">Year</label>
            <select 
              className="w-full bg-black border border-white/10 rounded-xl px-3 py-2 text-sm text-white focus:border-[#adff44] outline-none transition-colors hover:border-white/20 appearance-none"
              value={filters.year}
              onChange={(e) => { setFilters(p => ({ ...p, year: e.target.value })); setPage(1); }}
            >
              <option value="">All</option>
              {yearOptions.map(y => (
                <option key={y.year} value={y.year}>{y.year} ({y.question_count})</option>
              ))}
            </select>
          </div>

          <div>
            <label className="text-[10px] text-neutral-500 mb-1 block uppercase tracking-wider font-bold">Difficulty</label>
            <select 
              className="w-full bg-black border border-white/10 rounded-xl px-3 py-2 text-sm text-white focus:border-[#adff44] outline-none transition-colors hover:border-white/20 appearance-none"
              value={filters.difficulty}
              onChange={(e) => { setFilters(p => ({ ...p, difficulty: e.target.value })); setPage(1); }}
            >
              <option value="">All</option>
              <option value="easy">Easy</option>
              <option value="medium">Medium</option>
              <option value="hard">Hard</option>
            </select>
          </div>
        </div>
      </div>

      {/* Split Panes Container */}
      <div className="flex flex-1 gap-4 min-h-0">
        
        {/* Left Pane: All Questions */}
        <div className="flex-1 min-w-0 bg-neutral-900/50 rounded-2xl flex flex-col h-full border border-white/5">
          {/* Main Action Bar */}
          <div className="flex-shrink-0 flex items-center justify-between bg-black/40 border-b border-white/5 p-3 z-10 backdrop-blur-md rounded-t-2xl">
            <div className="flex items-center gap-6">
              <div className="flex items-center gap-2">
                 <Database size={18} className="text-[#adff44]" />
                 <div><div className="text-xs font-bold text-neutral-500 uppercase">Found</div>
                 <div className="font-bold text-white text-lg leading-tight">{totalCount} <span className="text-xs font-normal text-neutral-400">questions</span></div></div>
              </div>
              {!hideSelection && (
                <>
                  <div className="w-px h-8 bg-white/10" />
                  <div className="flex items-center gap-2">
                     <CheckCircle2 size={18} className="text-[#adff44]" />
                     <div><div className="text-xs font-bold text-neutral-500 uppercase">Selected</div>
                     <div className="font-bold text-[#adff44] text-lg leading-tight">{selectedSet.size} <span className="text-xs font-normal text-neutral-500">questions</span></div></div>
                  </div>
                </>
              )}
            </div>

            {!hideSelection && (
              <div className="flex items-center gap-4 text-sm font-bold text-neutral-300">
                <span className="flex items-center gap-1.5"><Trophy size={16} className="text-yellow-400" /> {totalSelectedMarks} Marks</span>
                <span className="flex items-center gap-1.5"><Clock size={16} className="text-purple-400" /> ~{Math.ceil(selectedSet.size * 1.5)} Mins</span>
              </div>
            )}
          </div>

          <div className="flex-1 overflow-y-auto p-4 custom-scrollbar">
            {loading ? (
              <div className="flex flex-col items-center justify-center h-64 text-neutral-500">
                <Loader className="animate-spin mb-4 text-[#adff44]" size={32} />
                <p>Loading questions...</p>
              </div>
            ) : data.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-64 text-neutral-500 bg-black/30 rounded-2xl border border-dashed border-white/10">
                <Database size={48} className="mb-4 opacity-20" />
                <p className="text-lg font-bold text-white mb-1">No questions found</p>
                <p className="text-sm">Try adjusting your filters.</p>
              </div>
            ) : (
              <div className="space-y-4 pb-4">
                {data.map((q) => {
                  const isSelected = selectedSet.has(q.id);
                  return (
                    <div 
                      key={q.id} 
                      className={`relative bg-neutral-900 border rounded-2xl p-6 transition-all duration-300 group
                        ${isSelected 
                          ? 'border-[#adff44]/50 shadow-[0_0_20px_rgba(173,255,68,0.05)] bg-[#adff44]/[0.02]' 
                          : 'border-white/10 hover:border-white/20 hover:bg-white/[0.02]'}
                      `}
                    >
                      {/* Top Right Action Button */}
                      {!hideSelection && (
                        <div className="absolute top-4 right-4 z-10">
                          <button
                            onClick={() => toggleSelection(q)}
                            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold transition-all duration-300
                              ${isSelected 
                                ? 'bg-red-500/10 text-red-400 hover:bg-red-500/20 hover:text-red-300 border border-red-500/20' 
                                : 'bg-white/5 text-white hover:bg-[#adff44] hover:text-black hover:border-[#adff44] border border-white/10'}
                            `}
                          >
                            {isSelected ? 'Remove' : 'Select'}
                          </button>
                        </div>
                      )}

                      <div className={`flex items-start gap-4 ${hideSelection ? 'pr-4' : 'pr-24'}`}>
                        <div className="flex-1 min-w-0">
                          {/* Badges */}
                          <div className="flex flex-wrap gap-2 mb-4">
                            {q.subject && <span className="bg-black text-white border border-white/10 px-2.5 py-1 rounded-lg text-xs font-bold">{q.subject}</span>}
                            {q.grade && <span className="bg-black text-neutral-400 border border-white/10 px-2.5 py-1 rounded-lg text-xs font-medium">Grade {q.grade}</span>}
                            {q.section_name && <span className="bg-[#adff44]/10 text-[#adff44] border border-[#adff44]/20 px-2.5 py-1 rounded-lg text-xs font-bold">{q.section_name}</span>}
                            {q.difficulty && <span className="bg-white/5 text-neutral-300 border border-white/10 px-2.5 py-1 rounded-lg text-xs font-medium capitalize">{q.difficulty}</span>}
                            <span className="bg-white/5 text-neutral-300 border border-white/10 px-2.5 py-1 rounded-lg text-xs font-medium">1 Mark</span>
                          </div>

                          <div className="text-white text-base font-medium mb-5 leading-relaxed bg-black/40 p-4 rounded-xl border border-white/5">
                            {q.prompt}
                          </div>

                          {q.options && q.options.length > 0 && (
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-5">
                              {q.options.map((opt, idx) => {
                                const isCorrect = q.correct_answer === opt;
                                return (
                                  <div 
                                    key={idx} 
                                    className={`px-4 py-3 rounded-xl text-sm border 
                                      ${isCorrect ? 'bg-green-500/10 border-green-500/30 text-green-100' : 'bg-black/50 border-white/5 text-neutral-400'}
                                    `}
                                  >
                                    <div className="flex items-start gap-3">
                                      <div className={`w-5 h-5 rounded-full border flex items-center justify-center flex-shrink-0 mt-0.5 text-[10px] font-bold ${isCorrect ? 'border-green-500 text-green-500' : 'border-neutral-600 text-neutral-600'}`}>
                                        {String.fromCharCode(65 + idx)}
                                      </div>
                                      <span className="leading-snug">{opt.replace(/^[A-D]\)\s*/, '')}</span>
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          )}

                          <div className="flex flex-wrap items-center gap-4 text-xs font-medium text-neutral-500 bg-black/20 p-3 rounded-lg border border-white/5">
                            {q.source_pdf && (
                              <div className="flex items-center gap-1.5" title={q.source_pdf}>
                                <BookOpen size={14} className="text-neutral-400" />
                                <span className="max-w-[200px] truncate">{q.source_pdf}</span>
                              </div>
                            )}
                            {q.source_page && (
                              <div className="flex items-center gap-1.5">
                                <Layers size={14} className="text-neutral-400" />
                                <span>Page {q.source_page}</span>
                              </div>
                            )}
                            {q.year && (
                              <div className="flex items-center gap-1.5">
                                <Settings2 size={14} className="text-neutral-400" />
                                <span>{q.year}</span>
                              </div>
                            )}
                          </div>

                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex justify-between items-center bg-neutral-900 border border-white/10 rounded-2xl p-4 mt-2">
                <button 
                  disabled={page === 1}
                  onClick={() => setPage(p => p - 1)}
                  className="px-5 py-2.5 rounded-xl text-sm font-bold bg-black text-white hover:bg-white/10 disabled:opacity-30 transition-colors border border-white/10"
                >
                  Previous
                </button>
                <div className="text-sm font-bold text-neutral-400">
                  Page <span className="text-white">{page}</span> of <span className="text-white">{totalPages}</span>
                </div>
                <button 
                  disabled={page >= totalPages}
                  onClick={() => setPage(p => p + 1)}
                  className="px-5 py-2.5 rounded-xl text-sm font-bold bg-black text-white hover:bg-white/10 disabled:opacity-30 transition-colors border border-white/10"
                >
                  Next
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Right Pane (Injected) */}
        {children}

      </div>
    </div>
  );
}
