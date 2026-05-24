import { useState } from "react";
import { Plus, Trash2, Calendar, Clock, Target, FileText } from "lucide-react";
import api from "../api/client";

export default function AdminMockTestCreator() {
  const [form, setForm] = useState({
    title: "",
    description: "",
    duration_minutes: 60,
    total_marks: 100,
    negative_marking: 0.25,
    start_time: "",
    end_time: "",
    instructions: "",
    question_ids: "", // Comma-separated for now for simplicity
  });

  const [targets, setTargets] = useState([]);
  const [targetInput, setTargetInput] = useState({ type: "school", value: "" });
  
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

  const submit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const qIds = form.question_ids.split(",").map(id => parseInt(id.trim())).filter(id => !isNaN(id));
      const payload = {
        ...form,
        start_time: new Date(form.start_time).toISOString(),
        end_time: new Date(form.end_time).toISOString(),
        question_ids: qIds,
        targets,
      };
      
      await api.post("/api/admin/mock-tests", payload);
      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
      setForm({ ...form, title: "", description: "", question_ids: "" });
    } catch (err) {
      console.error(err);
      alert("Failed to create mock test");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex h-full bg-black text-white p-8 justify-center overflow-y-auto">
      <div className="max-w-3xl w-full">
        <h1 className="text-3xl font-display font-black mb-2">Schedule Mock Test</h1>
        <p className="text-neutral-400 mb-8">Deploy a targeted mock test to specific schools, districts, or students.</p>

        <form onSubmit={submit} className="space-y-8">
          {/* Section 1: Details */}
          <div className="bg-neutral-900 border border-white/10 rounded-2xl p-6">
            <h2 className="text-lg font-bold text-[#adff44] flex items-center gap-2 mb-6">
              <FileText size={20} /> Test Details
            </h2>
            <div className="space-y-4">
              <div>
                <label className="text-xs text-neutral-400 mb-1.5 block uppercase tracking-wider font-semibold">Test Title</label>
                <input required className="w-full bg-black border border-white/10 rounded-lg px-4 py-3 text-sm focus:border-[#adff44] outline-none" value={form.title} onChange={e => setForm({...form, title: e.target.value})} placeholder="e.g. Navodaya Vidyalaya Final Mock" />
              </div>
              <div>
                <label className="text-xs text-neutral-400 mb-1.5 block uppercase tracking-wider font-semibold">Description</label>
                <textarea className="w-full bg-black border border-white/10 rounded-lg px-4 py-3 text-sm focus:border-[#adff44] outline-none h-24 resize-none" value={form.description} onChange={e => setForm({...form, description: e.target.value})} placeholder="Test description..." />
              </div>
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="text-xs text-neutral-400 mb-1.5 block uppercase tracking-wider font-semibold">Duration (min)</label>
                  <input type="number" required className="w-full bg-black border border-white/10 rounded-lg px-4 py-3 text-sm focus:border-[#adff44] outline-none" value={form.duration_minutes} onChange={e => setForm({...form, duration_minutes: parseInt(e.target.value)})} />
                </div>
                <div>
                  <label className="text-xs text-neutral-400 mb-1.5 block uppercase tracking-wider font-semibold">Total Marks</label>
                  <input type="number" required className="w-full bg-black border border-white/10 rounded-lg px-4 py-3 text-sm focus:border-[#adff44] outline-none" value={form.total_marks} onChange={e => setForm({...form, total_marks: parseInt(e.target.value)})} />
                </div>
                <div>
                  <label className="text-xs text-neutral-400 mb-1.5 block uppercase tracking-wider font-semibold">Negative Marking</label>
                  <input type="number" step="0.1" required className="w-full bg-black border border-white/10 rounded-lg px-4 py-3 text-sm focus:border-[#adff44] outline-none" value={form.negative_marking} onChange={e => setForm({...form, negative_marking: parseFloat(e.target.value)})} />
                </div>
              </div>
            </div>
          </div>

          {/* Section 2: Scheduling */}
          <div className="bg-neutral-900 border border-white/10 rounded-2xl p-6">
            <h2 className="text-lg font-bold text-[#adff44] flex items-center gap-2 mb-6">
              <Calendar size={20} /> Scheduling
            </h2>
            <div className="grid grid-cols-2 gap-6">
              <div>
                <label className="text-xs text-neutral-400 mb-1.5 block uppercase tracking-wider font-semibold">Start Time</label>
                <input type="datetime-local" required className="w-full bg-black border border-white/10 rounded-lg px-4 py-3 text-sm focus:border-[#adff44] outline-none" value={form.start_time} onChange={e => setForm({...form, start_time: e.target.value})} />
              </div>
              <div>
                <label className="text-xs text-neutral-400 mb-1.5 block uppercase tracking-wider font-semibold">End Time</label>
                <input type="datetime-local" required className="w-full bg-black border border-white/10 rounded-lg px-4 py-3 text-sm focus:border-[#adff44] outline-none" value={form.end_time} onChange={e => setForm({...form, end_time: e.target.value})} />
              </div>
            </div>
          </div>

          {/* Section 3: Questions & Targets */}
          <div className="grid grid-cols-2 gap-6">
            <div className="bg-neutral-900 border border-white/10 rounded-2xl p-6">
              <h2 className="text-lg font-bold text-[#adff44] flex items-center gap-2 mb-6">
                <FileText size={20} /> Questions
              </h2>
              <label className="text-xs text-neutral-400 mb-1.5 block uppercase tracking-wider font-semibold">Question IDs (comma separated)</label>
              <textarea required className="w-full bg-black border border-white/10 rounded-lg px-4 py-3 text-sm focus:border-[#adff44] outline-none h-32 resize-none" value={form.question_ids} onChange={e => setForm({...form, question_ids: e.target.value})} placeholder="e.g. 101, 102, 105..." />
              <p className="text-xs text-neutral-500 mt-2">In a real app, this would be populated from the Question Bank selection.</p>
            </div>

            <div className="bg-neutral-900 border border-white/10 rounded-2xl p-6">
              <h2 className="text-lg font-bold text-[#adff44] flex items-center gap-2 mb-6">
                <Target size={20} /> Targeting
              </h2>
              <div className="flex gap-2 mb-4">
                <select className="bg-black border border-white/10 rounded-lg px-3 py-2 text-sm focus:border-[#adff44] outline-none" value={targetInput.type} onChange={e => setTargetInput({...targetInput, type: e.target.value})}>
                  <option value="school">School</option>
                  <option value="district">District</option>
                  <option value="state">State</option>
                  <option value="student_id">Student ID</option>
                </select>
                <input className="flex-1 bg-black border border-white/10 rounded-lg px-3 py-2 text-sm focus:border-[#adff44] outline-none" placeholder="Value..." value={targetInput.value} onChange={e => setTargetInput({...targetInput, value: e.target.value})} />
                <button type="button" onClick={addTarget} className="bg-white/10 hover:bg-white/20 px-3 rounded-lg"><Plus size={18} /></button>
              </div>
              <div className="space-y-2">
                {targets.map((t, idx) => (
                  <div key={idx} className="flex justify-between items-center bg-black border border-white/5 rounded-lg px-3 py-2 text-sm">
                    <span><span className="text-neutral-500 uppercase text-xs font-bold mr-2">{t.target_type}</span> {t.target_value}</span>
                    <button type="button" onClick={() => removeTarget(idx)} className="text-red-400 hover:text-red-300"><Trash2 size={14} /></button>
                  </div>
                ))}
                {targets.length === 0 && <p className="text-neutral-500 text-sm text-center py-4 border border-dashed border-white/10 rounded-lg">Targeting everyone</p>}
              </div>
            </div>
          </div>

          <div className="pt-6">
            <button disabled={loading} type="submit" className="w-full bg-[#adff44] text-black font-black text-lg py-4 rounded-xl hover:bg-[#9BE53D] transition-colors disabled:opacity-50">
              {loading ? "Scheduling..." : "Deploy Mock Test"}
            </button>
            {success && <p className="text-center text-[#adff44] font-bold mt-4">Mock test successfully created!</p>}
          </div>
        </form>
      </div>
    </div>
  );
}
