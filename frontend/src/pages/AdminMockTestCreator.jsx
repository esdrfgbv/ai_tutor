import React, { useState } from "react";
import { Plus, Trash2, Calendar, Target, FileText, Layers, CheckCircle2, ChevronLeft, X } from "lucide-react";
import api from "../api/client";
import QuestionBankBrowser from "../components/QuestionBankBrowser";

export default function AdminMockTestCreator() {
  const [step, setStep] = useState(1); // 1: Details, 2: Questions
  
  const [form, setForm] = useState({
    title: "",
    description: "",
    duration_minutes: 60,
    total_marks: 100,
    negative_marking: 0.25,
    start_time: "",
    end_time: "",
    instructions: "",
  });

  const [targets, setTargets] = useState([]);
  const [targetInput, setTargetInput] = useState({ type: "school", value: "" });
  
  // Track selected IDs and complete objects
  const [selectedQuestions, setSelectedQuestions] = useState(new Set());
  const [selectedMap, setSelectedMap] = useState(new Map());
  
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  const addTarget = () => {
    if (!targetInput.value.trim()) return;
    setTargets([...targets, { target_type: targetInput.type, target_value: targetInput.value }]);
    setTargetInput({ ...targetInput, value: "" });
  };

  const removeTarget = (idx) => {
    setTargets(targets.filter((_, i) => i !== idx));
  };

  const submit = async () => {
    if (selectedQuestions.size === 0) {
      alert("Please select at least one question for the mock test.");
      return;
    }
    
    setLoading(true);
    try {
      const payload = {
        ...form,
        start_time: new Date(form.start_time).toISOString(),
        end_time: new Date(form.end_time).toISOString(),
        question_ids: Array.from(selectedQuestions),
        targets,
      };
      
      await api.post("/admin/mock-tests", payload);
      setSuccess(true);
      setTimeout(() => {
        setSuccess(false);
        setStep(1);
        setSelectedQuestions(new Set());
        setSelectedMap(new Map());
        setForm({ ...form, title: "", description: "" });
      }, 3000);
    } catch (err) {
      console.error(err);
      alert("Failed to create mock test");
    } finally {
      setLoading(false);
    }
  };

  const removeSelection = (id) => {
    const newSet = new Set(selectedQuestions);
    const newMap = new Map(selectedMap);
    newSet.delete(id);
    newMap.delete(id);
    setSelectedQuestions(newSet);
    setSelectedMap(newMap);
  };

  // Calculate subject distribution for the sticky panel
  const getSubjectDistribution = () => {
    const dist = {};
    for (const q of selectedMap.values()) {
      const subj = q.subject || "General";
      dist[subj] = (dist[subj] || 0) + 1;
    }
    return Object.entries(dist).sort((a, b) => b[1] - a[1]);
  };

  const totalCalculatedMarks = Array.from(selectedMap.values()).reduce((sum, q) => sum + (q.marks || 1), 0);

  if (success) {
    return (
      <div className="flex h-full bg-black text-white p-8 items-center justify-center">
        <div className="text-center max-w-md">
          <div className="w-24 h-24 bg-[#adff44]/20 rounded-full flex items-center justify-center mx-auto mb-8 shadow-[0_0_40px_rgba(173,255,68,0.2)]">
            <CheckCircle2 size={48} className="text-[#adff44]" />
          </div>
          <h2 className="text-4xl font-black font-display mb-4">Mock Test Deployed!</h2>
          <p className="text-neutral-400 mb-8 text-lg">The mock test has been successfully created and deployed to the selected targets.</p>
          <button 
            onClick={() => { setSuccess(false); setStep(1); }}
            className="w-full bg-[#adff44] text-black font-black py-4 rounded-xl hover:bg-[#9BE53D] transition-colors shadow-lg"
          >
            Create Another Test
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col bg-black text-white overflow-hidden -mx-4 -my-6" style={{ height: "calc(100vh - 57px)" }}>
      {/* Header & Stepper */}
      <div className={`flex-shrink-0 ${step === 2 ? 'px-4 py-2' : 'p-8 pb-4'} border-b border-white/10 flex justify-between items-end bg-black sticky top-0 z-20 transition-all`}>
        <div>
          <h1 className={`${step === 2 ? 'text-xl' : 'text-3xl'} font-display font-black mb-1 transition-all`}>Build Mock Test</h1>
          <p className={`text-neutral-400 text-sm ${step === 2 ? 'hidden' : 'block'}`}>Create a targeted exam using questions extracted from PDFs.</p>
        </div>
        
        <div className="flex items-center gap-2 text-sm font-bold bg-neutral-900 p-1.5 rounded-xl border border-white/10">
          <button 
            onClick={() => setStep(1)}
            className={`flex items-center gap-2 px-5 py-2 rounded-lg transition-colors ${step === 1 ? 'bg-white/10 text-white shadow-sm' : 'text-neutral-500 hover:text-white hover:bg-white/5'}`}
          >
            <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs ${step === 1 ? 'bg-[#adff44] text-black' : 'bg-black border border-white/20'}`}>1</div>
            Details & Targets
          </button>
          <button 
            onClick={() => {
              if (form.title && form.start_time && form.end_time) setStep(2);
              else alert("Please fill in required details first (Title, Start Time, End Time)");
            }}
            className={`flex items-center gap-2 px-5 py-2 rounded-lg transition-colors ${step === 2 ? 'bg-white/10 text-white shadow-sm' : 'text-neutral-500 hover:text-white hover:bg-white/5'}`}
          >
            <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs ${step === 2 ? 'bg-[#adff44] text-black' : 'bg-black border border-white/20'}`}>2</div>
            Select Questions
          </button>
        </div>
      </div>

      <div className={`flex-1 overflow-hidden flex flex-col min-h-0 ${step === 2 ? 'p-2' : 'p-8'}`}>
        {step === 1 ? (
          <div className="max-w-4xl mx-auto space-y-8 pb-12 overflow-y-auto w-full pr-4 custom-scrollbar">
            {/* Section 1: Details */}
            <div className="bg-neutral-900 border border-white/10 rounded-2xl p-8 shadow-sm hover:border-white/20 transition-colors">
              <h2 className="text-xl font-bold text-[#adff44] flex items-center gap-2 mb-8">
                <FileText size={24} /> Test Details
              </h2>
              <div className="space-y-6">
                <div>
                  <label className="text-xs text-neutral-400 mb-2 block uppercase tracking-wider font-bold">Test Title *</label>
                  <input required className="w-full bg-black border border-white/10 rounded-xl px-4 py-3.5 text-sm focus:border-[#adff44] outline-none transition-colors hover:border-white/20" value={form.title} onChange={e => setForm({...form, title: e.target.value})} placeholder="e.g. Navodaya Vidyalaya Final Mock" />
                </div>
                <div>
                  <label className="text-xs text-neutral-400 mb-2 block uppercase tracking-wider font-bold">Description</label>
                  <textarea className="w-full bg-black border border-white/10 rounded-xl px-4 py-3.5 text-sm focus:border-[#adff44] outline-none h-28 resize-none transition-colors hover:border-white/20" value={form.description} onChange={e => setForm({...form, description: e.target.value})} placeholder="Test description..." />
                </div>
                <div className="grid grid-cols-3 gap-6 bg-black p-6 rounded-xl border border-white/5">
                  <div>
                    <label className="text-xs text-neutral-400 mb-2 block uppercase tracking-wider font-bold">Duration (min)</label>
                    <input type="number" required className="w-full bg-neutral-900 border border-white/10 rounded-lg px-4 py-3 text-sm focus:border-[#adff44] outline-none" value={form.duration_minutes} onChange={e => setForm({...form, duration_minutes: parseInt(e.target.value)})} />
                  </div>
                  <div>
                    <label className="text-xs text-neutral-400 mb-2 block uppercase tracking-wider font-bold">Total Marks</label>
                    <input type="number" required className="w-full bg-neutral-900 border border-white/10 rounded-lg px-4 py-3 text-sm focus:border-[#adff44] outline-none" value={form.total_marks} onChange={e => setForm({...form, total_marks: parseInt(e.target.value)})} />
                  </div>
                  <div>
                    <label className="text-xs text-neutral-400 mb-2 block uppercase tracking-wider font-bold">Negative Marking</label>
                    <input type="number" step="0.1" required className="w-full bg-neutral-900 border border-white/10 rounded-lg px-4 py-3 text-sm focus:border-[#adff44] outline-none" value={form.negative_marking} onChange={e => setForm({...form, negative_marking: parseFloat(e.target.value)})} />
                  </div>
                </div>
              </div>
            </div>

            {/* Section 2: Scheduling & Targets */}
            <div className="grid grid-cols-2 gap-8">
              <div className="bg-neutral-900 border border-white/10 rounded-2xl p-8 h-fit shadow-sm hover:border-white/20 transition-colors">
                <h2 className="text-xl font-bold text-[#adff44] flex items-center gap-2 mb-8">
                  <Calendar size={24} /> Scheduling
                </h2>
                <div className="space-y-6">
                  <div>
                    <label className="text-xs text-neutral-400 mb-2 block uppercase tracking-wider font-bold">Start Time *</label>
                    <input type="datetime-local" required className="w-full bg-black border border-white/10 rounded-xl px-4 py-3.5 text-sm focus:border-[#adff44] outline-none transition-colors hover:border-white/20" value={form.start_time} onChange={e => setForm({...form, start_time: e.target.value})} />
                  </div>
                  <div>
                    <label className="text-xs text-neutral-400 mb-2 block uppercase tracking-wider font-bold">End Time *</label>
                    <input type="datetime-local" required className="w-full bg-black border border-white/10 rounded-xl px-4 py-3.5 text-sm focus:border-[#adff44] outline-none transition-colors hover:border-white/20" value={form.end_time} onChange={e => setForm({...form, end_time: e.target.value})} />
                  </div>
                </div>
              </div>

              <div className="bg-neutral-900 border border-white/10 rounded-2xl p-8 h-fit shadow-sm hover:border-white/20 transition-colors">
                <h2 className="text-xl font-bold text-[#adff44] flex items-center gap-2 mb-8">
                  <Target size={24} /> Targeting
                </h2>
                <div className="flex gap-3 mb-6">
                  <select className="bg-black border border-white/10 rounded-xl px-3 py-2 text-sm focus:border-[#adff44] outline-none transition-colors hover:border-white/20" value={targetInput.type} onChange={e => setTargetInput({...targetInput, type: e.target.value})}>
                    <option value="school">School</option>
                    <option value="district">District</option>
                    <option value="state">State</option>
                    <option value="student_id">Student ID</option>
                  </select>
                  <input className="flex-1 bg-black border border-white/10 rounded-xl px-4 py-2 text-sm focus:border-[#adff44] outline-none transition-colors hover:border-white/20" placeholder="Value..." value={targetInput.value} onChange={e => setTargetInput({...targetInput, value: e.target.value})} />
                  <button type="button" onClick={addTarget} className="bg-white/10 hover:bg-white/20 px-4 rounded-xl transition-colors"><Plus size={18} /></button>
                </div>
                <div className="space-y-3 max-h-48 overflow-y-auto pr-2">
                  {targets.map((t, idx) => (
                    <div key={idx} className="flex justify-between items-center bg-black border border-white/5 rounded-xl px-4 py-3 text-sm">
                      <span><span className="text-neutral-500 uppercase text-xs font-bold mr-3">{t.target_type}</span> {t.target_value}</span>
                      <button type="button" onClick={() => removeTarget(idx)} className="text-red-400 hover:text-red-300 transition-colors"><Trash2 size={16} /></button>
                    </div>
                  ))}
                  {targets.length === 0 && (
                    <div className="bg-black/50 border border-dashed border-white/10 rounded-xl p-6 text-center">
                      <Target className="mx-auto mb-2 text-neutral-600" size={24} />
                      <p className="text-neutral-500 text-sm font-medium">Targeting everyone</p>
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="pt-8 flex justify-end">
              <button 
                onClick={() => {
                  if (form.title && form.start_time && form.end_time) setStep(2);
                  else alert("Please fill in required fields (Title, Start Time, End Time)");
                }}
                className="bg-[#adff44] text-black font-black text-lg px-12 py-4 rounded-xl hover:bg-[#9BE53D] transition-colors shadow-[0_0_30px_rgba(173,255,68,0.2)] hover:scale-105 transform duration-200"
              >
                Continue to Question Selection
              </button>
            </div>
          </div>
        ) : (
          <div className="flex-1 h-full min-h-0">
            <QuestionBankBrowser 
              onSelectionChange={(selectedSet, selectedMapObj) => {
                setSelectedQuestions(selectedSet);
                setSelectedMap(selectedMapObj);
              }}
              preSelected={selectedQuestions}
              preSelectedMap={selectedMap}
              compact={false}
            >
              {/* Right Pane: Selected Questions + Marks Section */}
              <div className="w-[340px] flex-shrink-0 flex flex-col h-full bg-neutral-900 border border-white/10 rounded-2xl overflow-hidden shadow-xl">
                
                {/* Header */}
                <div className="p-4 border-b border-white/10 bg-black/40 flex items-center justify-between z-10 backdrop-blur-md">
                  <div className="flex items-center gap-2">
                    <button onClick={() => setStep(1)} className="p-1 rounded-md text-neutral-400 hover:bg-white/10 hover:text-white transition-colors" title="Back to Details">
                      <ChevronLeft size={18} />
                    </button>
                    <h3 className="font-bold text-white tracking-wide">Selected Questions</h3>
                  </div>
                  <span className="text-xs font-bold text-black bg-[#adff44] px-2 py-0.5 rounded-full">{selectedQuestions.size}</span>
                </div>
                
                {/* Scrollable Selected List */}
                <div className="flex-1 overflow-y-auto p-4 space-y-3 custom-scrollbar">
                  {Array.from(selectedMap.values()).map(q => (
                    <div key={q.id} className="bg-black border border-white/10 p-3.5 rounded-xl relative group hover:border-white/20 transition-colors shadow-sm">
                      <button 
                        onClick={() => removeSelection(q.id)} 
                        className="absolute top-2 right-2 text-neutral-500 hover:text-red-400 hover:bg-red-400/10 p-1 rounded-md transition-colors"
                        title="Remove question"
                      >
                        <X size={14} />
                      </button>
                      <p className="text-xs text-neutral-300 line-clamp-2 pr-6 leading-relaxed mb-3 font-medium">{q.prompt}</p>
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] bg-white/5 border border-white/10 px-2 py-1 rounded-md text-neutral-400 font-bold tracking-wide uppercase">
                          {q.subject || 'General'}
                        </span>
                        <span className="text-[10px] text-neutral-500 font-bold bg-white/5 px-2 py-1 rounded-md">
                          {q.marks || 1} Mark
                        </span>
                      </div>
                    </div>
                  ))}
                  {selectedQuestions.size === 0 && (
                    <div className="flex flex-col items-center justify-center h-48 text-neutral-500">
                      <Layers size={32} className="mb-3 opacity-20" />
                      <p className="text-sm font-bold text-neutral-400">No questions selected</p>
                      <p className="text-xs mt-1">Select questions from the left panel.</p>
                    </div>
                  )}
                </div>

                {/* Marks Section */}
                <div className="p-5 border-t border-white/10 bg-black/60 backdrop-blur-md">
                  <div className="flex justify-between items-end mb-6">
                    <div>
                      <div className="text-[10px] text-neutral-500 font-bold uppercase tracking-wider mb-1">Total Marks</div>
                      <div className="text-3xl font-black text-[#adff44] leading-none">{totalCalculatedMarks}</div>
                    </div>
                    <div className="text-right">
                      <div className="text-[10px] text-neutral-500 font-bold uppercase tracking-wider mb-1">Est. Duration</div>
                      <div className={`text-base font-bold ${Math.ceil(selectedQuestions.size * 1.5) > form.duration_minutes ? 'text-red-400' : 'text-white'} leading-none`}>
                        ~{Math.ceil(selectedQuestions.size * 1.5)} mins
                      </div>
                    </div>
                  </div>
                  
                  <button 
                    disabled={loading || selectedQuestions.size === 0}
                    onClick={submit}
                    className="w-full bg-[#adff44] text-black font-black py-4 rounded-xl hover:bg-[#9BE53D] transition-all disabled:opacity-50 disabled:hover:scale-100 disabled:hover:shadow-none hover:scale-[1.02] shadow-[0_0_20px_rgba(173,255,68,0.15)] flex justify-center items-center gap-2 text-sm uppercase tracking-wide"
                  >
                    {loading ? "Deploying..." : (
                      <>
                        <CheckCircle2 size={18} />
                        Publish Mock Test
                      </>
                    )}
                  </button>
                </div>
              </div>
            </QuestionBankBrowser>
          </div>
        )}
      </div>
    </div>
  );
}
