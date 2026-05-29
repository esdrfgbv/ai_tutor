import React, { useState } from "react";
import { X, Wand2, Loader } from "lucide-react";
import api from "../api/client";

export default function RandomTestModal({ onClose }) {
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  
  const [form, setForm] = useState({
    title: "Auto-Generated Mock Test",
    grade: 6,
    duration_minutes: 60,
    total_questions: 20,
    difficulty: "",
    year: "",
    negative_marking: 0.0
  });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      // In a fully featured version, this would include subject_constraints
      // For now, we'll send the base parameters to the endpoint we created
      const payload = {
        title: form.title,
        grade: parseInt(form.grade),
        duration_minutes: parseInt(form.duration_minutes),
        total_questions: parseInt(form.total_questions),
        difficulty: form.difficulty || null,
        year: form.year ? parseInt(form.year) : null,
        negative_marking: parseFloat(form.negative_marking),
        subject_constraints: []
      };

      await api.post("/api/admin/questions/random-set", payload);
      setSuccess(true);
      setTimeout(() => {
        onClose();
      }, 2000);
    } catch (err) {
      console.error(err);
      alert(err.response?.data?.detail || "Failed to generate test");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-neutral-900 border border-white/10 rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden flex flex-col">
        <div className="flex items-center justify-between p-5 border-b border-white/10 bg-black/40">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-[#adff44]/20 flex items-center justify-center">
              <Wand2 className="text-[#adff44]" size={16} />
            </div>
            <h2 className="text-xl font-display font-bold text-white">Auto-Generate Test</h2>
          </div>
          <button onClick={onClose} className="text-neutral-400 hover:text-white transition-colors">
            <X size={20} />
          </button>
        </div>

        {success ? (
          <div className="p-10 flex flex-col items-center justify-center">
            <div className="w-16 h-16 rounded-full bg-[#adff44]/20 flex items-center justify-center mb-4">
              <Wand2 className="text-[#adff44]" size={32} />
            </div>
            <h3 className="text-2xl font-bold text-white mb-2">Success!</h3>
            <p className="text-neutral-400 text-center">Test has been generated from the question bank.</p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="p-6 space-y-5">
            <div>
              <label className="text-xs text-neutral-400 mb-1.5 block uppercase tracking-wider font-semibold">Test Title</label>
              <input 
                required 
                className="w-full bg-black border border-white/10 rounded-lg px-4 py-3 text-sm focus:border-[#adff44] outline-none text-white" 
                value={form.title} 
                onChange={e => setForm({...form, title: e.target.value})} 
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-xs text-neutral-400 mb-1.5 block uppercase tracking-wider font-semibold">Grade</label>
                <select 
                  className="w-full bg-black border border-white/10 rounded-lg px-4 py-3 text-sm focus:border-[#adff44] outline-none text-white"
                  value={form.grade} 
                  onChange={e => setForm({...form, grade: e.target.value})}
                >
                  <option value="6">Class 6</option>
                  <option value="9">Class 9</option>
                </select>
              </div>
              <div>
                <label className="text-xs text-neutral-400 mb-1.5 block uppercase tracking-wider font-semibold">Total Questions</label>
                <input 
                  type="number" 
                  min="5" 
                  max="100" 
                  required 
                  className="w-full bg-black border border-white/10 rounded-lg px-4 py-3 text-sm focus:border-[#adff44] outline-none text-white" 
                  value={form.total_questions} 
                  onChange={e => setForm({...form, total_questions: e.target.value})} 
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-xs text-neutral-400 mb-1.5 block uppercase tracking-wider font-semibold">Difficulty</label>
                <select 
                  className="w-full bg-black border border-white/10 rounded-lg px-4 py-3 text-sm focus:border-[#adff44] outline-none text-white"
                  value={form.difficulty} 
                  onChange={e => setForm({...form, difficulty: e.target.value})}
                >
                  <option value="">Mixed</option>
                  <option value="easy">Easy</option>
                  <option value="medium">Medium</option>
                  <option value="hard">Hard</option>
                </select>
              </div>
              <div>
                <label className="text-xs text-neutral-400 mb-1.5 block uppercase tracking-wider font-semibold">Source Year (Optional)</label>
                <input 
                  type="number" 
                  placeholder="e.g. 2020"
                  className="w-full bg-black border border-white/10 rounded-lg px-4 py-3 text-sm focus:border-[#adff44] outline-none text-white" 
                  value={form.year} 
                  onChange={e => setForm({...form, year: e.target.value})} 
                />
              </div>
            </div>

            <div className="bg-black/30 p-4 rounded-xl border border-white/5 mt-6">
              <h4 className="text-sm font-bold text-white mb-2">Subject Distribution</h4>
              <p className="text-xs text-neutral-400">
                In this simplified version, questions will be selected randomly based on the filters above. 
                A full version would allow specifying exactly how many questions to pull per section.
              </p>
            </div>

            <div className="pt-4 flex gap-3">
              <button 
                type="button"
                onClick={onClose}
                className="flex-1 bg-transparent text-white border border-white/20 font-bold py-3 rounded-xl hover:bg-white/5 transition-colors"
              >
                Cancel
              </button>
              <button 
                disabled={loading} 
                type="submit" 
                className="flex-1 bg-[#adff44] text-black font-black text-sm py-3 rounded-xl hover:bg-[#9BE53D] transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {loading ? <Loader className="animate-spin" size={18} /> : <Wand2 size={18} />}
                {loading ? "Generating..." : "Generate Test"}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
