import React, { useState, useEffect, useRef } from "react";
import { Upload, FolderInput, RefreshCw, FileText, CheckCircle2, XCircle, Clock, AlertCircle } from "lucide-react";
import api from "../api/client";

export default function PDFUploadManager() {
  const [jobs, setJobs] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  
  const [importDir, setImportDir] = useState("navodaya_pyqs");
  const [importExamType, setImportExamType] = useState("JNV");
  const [importGrade, setImportGrade] = useState("6");
  
  const fileInputRef = useRef(null);

  const fetchData = async () => {
    try {
      const [jobsRes, statsRes] = await Promise.all([
        api.get("/admin/pdf-extraction/jobs"),
        api.get("/admin/pdf-extraction/stats")
      ]);
      setJobs(jobsRes.data);
      setStats(statsRes.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    // Poll every 5 seconds if there are pending/processing jobs
    const interval = setInterval(() => {
      fetchData();
    }, 5000);
    return () => clearInterval(interval);
  }, []);

  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const formData = new FormData();
    formData.append("file", file);
    formData.append("exam_type", importExamType);
    formData.append("grade", importGrade);

    try {
      await api.post("/admin/pdf-extraction/upload", formData, {
        headers: { "Content-Type": "multipart/form-data" }
      });
      fetchData();
    } catch (err) {
      console.error(err);
      alert("Failed to upload PDF");
    }
    
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleLocalImport = async () => {
    try {
      await api.post("/admin/pdf-extraction/import-local", {
        directory: importDir,
        exam_type: importExamType,
        grade: parseInt(importGrade)
      });
      alert(`Started batch import from ${importDir}`);
      setTimeout(fetchData, 1000);
    } catch (err) {
      console.error(err);
      alert("Failed to start batch import");
    }
  };

  const reprocessJob = async (id) => {
    try {
      await api.post(`/admin/pdf-extraction/jobs/${id}/reprocess`);
      fetchData();
    } catch (err) {
      console.error(err);
      alert("Failed to reprocess job");
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'completed': return <CheckCircle2 className="text-green-500" size={18} />;
      case 'failed': return <XCircle className="text-red-500" size={18} />;
      case 'processing': return <RefreshCw className="text-blue-500 animate-spin" size={18} />;
      default: return <Clock className="text-neutral-500" size={18} />;
    }
  };

  return (
    <div className="p-8 h-full overflow-y-auto bg-black text-white">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-display font-black mb-2">PDF Extraction Manager</h1>
          <p className="text-neutral-400">Upload PDFs or import from local directories to extract questions.</p>
        </div>
        <button onClick={fetchData} className="flex items-center gap-2 bg-neutral-800 text-white px-4 py-2 rounded-xl text-sm font-bold hover:bg-neutral-700 transition-colors">
          <RefreshCw size={16} /> Refresh
        </button>
      </div>

      {stats && (
        <div className="grid grid-cols-4 gap-4 mb-8">
          <div className="bg-neutral-900 border border-white/10 rounded-2xl p-5">
            <div className="text-neutral-400 text-sm font-bold uppercase mb-1">Total PDFs Processed</div>
            <div className="text-3xl font-black text-white">{stats.total_sources}</div>
          </div>
          <div className="bg-neutral-900 border border-white/10 rounded-2xl p-5">
            <div className="text-neutral-400 text-sm font-bold uppercase mb-1">Total Questions Extracted</div>
            <div className="text-3xl font-black text-[#adff44]">{stats.total_questions}</div>
          </div>
          <div className="bg-neutral-900 border border-white/10 rounded-2xl p-5">
            <div className="text-neutral-400 text-sm font-bold uppercase mb-1">Active Jobs</div>
            <div className="text-3xl font-black text-blue-400">{stats.pending_sources}</div>
          </div>
          <div className="bg-neutral-900 border border-white/10 rounded-2xl p-5">
            <div className="text-neutral-400 text-sm font-bold uppercase mb-1">Failed Jobs</div>
            <div className="text-3xl font-black text-red-400">{stats.failed_sources}</div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-2 gap-6 mb-8">
        {/* Upload Single PDF */}
        <div className="bg-neutral-900 border border-white/10 rounded-2xl p-6">
          <h2 className="text-xl font-bold mb-4 flex items-center gap-2 text-white">
            <Upload className="text-[#adff44]" size={20} /> Upload PDF
          </h2>
          
          <div className="grid grid-cols-2 gap-4 mb-6">
            <div>
              <label className="text-xs text-neutral-400 mb-1.5 block uppercase tracking-wider font-semibold">Exam Type</label>
              <select className="w-full bg-black border border-white/10 rounded-lg px-3 py-2 text-sm focus:border-[#adff44] outline-none text-white" value={importExamType} onChange={e => setImportExamType(e.target.value)}>
                <option value="JNV">JNV (Navodaya)</option>
                <option value="AISSEE">AISSEE (Sainik)</option>
                <option value="General">General</option>
              </select>
            </div>
            <div>
              <label className="text-xs text-neutral-400 mb-1.5 block uppercase tracking-wider font-semibold">Grade</label>
              <select className="w-full bg-black border border-white/10 rounded-lg px-3 py-2 text-sm focus:border-[#adff44] outline-none text-white" value={importGrade} onChange={e => setImportGrade(e.target.value)}>
                <option value="6">Class 6</option>
                <option value="9">Class 9</option>
              </select>
            </div>
          </div>

          <div 
            className="border-2 border-dashed border-white/20 rounded-xl p-8 flex flex-col items-center justify-center cursor-pointer hover:border-[#adff44]/50 hover:bg-[#adff44]/5 transition-colors group"
            onClick={() => fileInputRef.current?.click()}
          >
            <input type="file" ref={fileInputRef} className="hidden" accept=".pdf" onChange={handleFileUpload} />
            <div className="w-12 h-12 bg-white/5 rounded-full flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
              <FileText className="text-neutral-400 group-hover:text-[#adff44] transition-colors" size={24} />
            </div>
            <p className="font-bold text-white mb-1">Click to select PDF</p>
            <p className="text-xs text-neutral-500">Only .pdf files are supported</p>
          </div>
        </div>

        {/* Import from Local Directory */}
        <div className="bg-neutral-900 border border-white/10 rounded-2xl p-6">
          <h2 className="text-xl font-bold mb-4 flex items-center gap-2 text-white">
            <FolderInput className="text-blue-400" size={20} /> Batch Import
          </h2>
          <p className="text-sm text-neutral-400 mb-6">Import all PDFs from a pre-configured local directory on the server.</p>
          
          <div className="space-y-4 mb-6">
            <div>
              <label className="text-xs text-neutral-400 mb-1.5 block uppercase tracking-wider font-semibold">Directory</label>
              <select className="w-full bg-black border border-white/10 rounded-lg px-3 py-2 text-sm focus:border-[#adff44] outline-none text-white" value={importDir} onChange={e => setImportDir(e.target.value)}>
                <option value="navodaya_pyqs">novodaya pyqs/</option>
                <option value="mock_test_papers">mock test papers/</option>
                <option value="aiseee_pyqs">aiseee pyqs/</option>
              </select>
            </div>
          </div>
          
          <div className="bg-blue-500/10 border border-blue-500/20 rounded-xl p-4 flex gap-3 mb-6">
            <AlertCircle className="text-blue-400 shrink-0" size={20} />
            <div className="text-sm text-blue-200">
              This will queue all PDFs in the selected directory. This process runs in the background and may take a while.
            </div>
          </div>
          
          <button 
            onClick={handleLocalImport}
            className="w-full bg-blue-500 hover:bg-blue-600 text-white font-bold py-3 rounded-xl transition-colors"
          >
            Start Batch Import
          </button>
        </div>
      </div>

      {/* Jobs List */}
      <h2 className="text-2xl font-display font-bold mb-4 text-white">Recent Extraction Jobs</h2>
      
      <div className="bg-neutral-900 border border-white/10 rounded-2xl overflow-hidden">
        <table className="w-full text-left text-sm">
          <thead className="bg-black/40 text-neutral-400 font-bold uppercase text-xs tracking-wider">
            <tr>
              <th className="px-6 py-4 border-b border-white/10">File Name</th>
              <th className="px-6 py-4 border-b border-white/10">Status</th>
              <th className="px-6 py-4 border-b border-white/10">Extracted</th>
              <th className="px-6 py-4 border-b border-white/10">Date</th>
              <th className="px-6 py-4 border-b border-white/10 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/10">
            {jobs.length === 0 ? (
              <tr>
                <td colSpan="5" className="px-6 py-8 text-center text-neutral-500">No jobs found</td>
              </tr>
            ) : (
              jobs.map(job => (
                <tr key={job.id} className="hover:bg-white/5">
                  <td className="px-6 py-4 font-medium text-white">
                    {job.file_name}
                    {job.extraction_error && (
                      <div className="text-xs text-red-400 mt-1 truncate max-w-xs">{job.extraction_error}</div>
                    )}
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2 capitalize font-medium">
                      {getStatusIcon(job.extraction_status)}
                      <span className={
                        job.extraction_status === 'completed' ? 'text-green-400' : 
                        job.extraction_status === 'failed' ? 'text-red-400' : 
                        job.extraction_status === 'processing' ? 'text-blue-400' : 
                        'text-neutral-400'
                      }>
                        {job.extraction_status}
                      </span>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span className="font-bold text-white">{job.total_questions_extracted}</span>
                    <span className="text-neutral-500 ml-1">/ {job.total_pages} pages</span>
                  </td>
                  <td className="px-6 py-4 text-neutral-400">
                    {new Date(job.created_at).toLocaleDateString()}
                  </td>
                  <td className="px-6 py-4 text-right">
                    <button 
                      onClick={() => reprocessJob(job.id)}
                      disabled={job.extraction_status === 'processing'}
                      className="text-xs font-bold bg-white/10 hover:bg-white/20 text-white px-3 py-1.5 rounded-lg transition-colors disabled:opacity-50"
                    >
                      Reprocess
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
