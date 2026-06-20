import React, { useState, useEffect, useRef, useCallback } from "react";
import {
  Upload, FileText, Database, BarChart3, RefreshCw,
  CheckCircle2, XCircle, Clock, AlertCircle, Loader2,
  Search, Trash2, Eye, Plus, ChevronDown, Layers,
  Settings2, Activity, HardDrive, Filter, X
} from "lucide-react";
import api from "../api/client";

// ── Status Helpers ──────────────────────────────────────────────────────

const STATUS_STYLES = {
  completed: { icon: CheckCircle2, color: "text-emerald-400", bg: "bg-emerald-500/10 border-emerald-500/20" },
  failed: { icon: XCircle, color: "text-red-400", bg: "bg-red-500/10 border-red-500/20" },
  processing: { icon: Loader2, color: "text-blue-400", bg: "bg-blue-500/10 border-blue-500/20", spin: true },
  extracting: { icon: Loader2, color: "text-blue-400", bg: "bg-blue-500/10 border-blue-500/20", spin: true },
  embedding: { icon: Loader2, color: "text-purple-400", bg: "bg-purple-500/10 border-purple-500/20", spin: true },
  queued: { icon: Clock, color: "text-neutral-400", bg: "bg-neutral-500/10 border-neutral-500/20" },
};

function StatusBadge({ status }) {
  const s = STATUS_STYLES[status] || STATUS_STYLES.queued;
  const Icon = s.icon;
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg border text-xs font-bold capitalize ${s.bg} ${s.color}`}>
      <Icon size={13} className={s.spin ? "animate-spin" : ""} />
      {status}
    </span>
  );
}

function MetricCard({ icon: Icon, label, value, accent = "text-white" }) {
  return (
    <div className="bg-neutral-900 border border-white/10 rounded-2xl p-5 hover:border-white/20 transition-colors">
      <div className="flex items-center gap-2 mb-2">
        <Icon size={16} className="text-neutral-500" />
        <span className="text-xs text-neutral-400 font-bold uppercase tracking-wider">{label}</span>
      </div>
      <div className={`text-3xl font-black ${accent}`}>{value}</div>
    </div>
  );
}

// ── Main Component ──────────────────────────────────────────────────────

export default function KnowledgeBasePage() {
  const [activeTab, setActiveTab] = useState("upload");
  const [documents, setDocuments] = useState([]);
  const [analytics, setAnalytics] = useState(null);
  const [metadataSchema, setMetadataSchema] = useState({});
  const [queue, setQueue] = useState([]);
  const [loading, setLoading] = useState(true);
  const [docPagination, setDocPagination] = useState({ total: 0, page: 1, limit: 20 });
  const [docFilters, setDocFilters] = useState({});
  const [searchResults, setSearchResults] = useState(null);
  const [selectedDoc, setSelectedDoc] = useState(null);

  const fetchMetadataSchema = useCallback(async () => {
    try {
      const res = await api.get("/admin/knowledge/metadata/schema");
      setMetadataSchema(res.data.fields || {});
    } catch (e) { console.error(e); }
  }, []);

  const fetchDocuments = useCallback(async (page = 1, filters = {}) => {
    try {
      const params = { page, limit: 20, ...filters };
      const res = await api.get("/admin/knowledge/documents", { params });
      setDocuments(res.data.data || []);
      setDocPagination({ total: res.data.total_count, page: res.data.page, limit: res.data.limit });
    } catch (e) { console.error(e); }
  }, []);

  const fetchAnalytics = useCallback(async () => {
    try {
      const res = await api.get("/admin/knowledge/analytics");
      setAnalytics(res.data);
    } catch (e) { console.error(e); }
  }, []);

  const fetchQueue = useCallback(async () => {
    try {
      const res = await api.get("/admin/knowledge/queue");
      setQueue(res.data || []);
    } catch (e) { console.error(e); }
  }, []);

  useEffect(() => {
    Promise.all([fetchMetadataSchema(), fetchDocuments(), fetchAnalytics(), fetchQueue()])
      .finally(() => setLoading(false));
    const interval = setInterval(() => {
      fetchDocuments(docPagination.page, docFilters);
      fetchAnalytics();
      fetchQueue();
    }, 8000);
    return () => clearInterval(interval);
  }, []);

  const tabs = [
    { key: "upload", label: "Upload", icon: Upload },
    { key: "documents", label: "Documents", icon: FileText },
    { key: "analytics", label: "Analytics", icon: BarChart3 },
    { key: "queue", label: "Queue", icon: Layers },
    { key: "metadata", label: "Metadata", icon: Settings2 },
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="animate-spin text-[#adff44]" size={32} />
      </div>
    );
  }

  return (
    <div className="p-6 lg:p-8 h-full overflow-y-auto bg-black text-white">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-black mb-1 bg-gradient-to-r from-white to-neutral-400 bg-clip-text text-transparent">
            Knowledge Base
          </h1>
          <p className="text-neutral-500 text-sm">Upload, process, and manage educational content</p>
        </div>
        <button
          onClick={() => { fetchDocuments(); fetchAnalytics(); fetchQueue(); }}
          className="flex items-center gap-2 bg-neutral-800 hover:bg-neutral-700 text-white px-4 py-2 rounded-xl text-sm font-bold transition-colors"
        >
          <RefreshCw size={14} /> Refresh
        </button>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-8 bg-neutral-900 border border-white/10 rounded-2xl p-1.5 w-fit">
        {tabs.map(tab => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold transition-all ${
                activeTab === tab.key
                  ? "bg-[#adff44] text-black shadow-lg shadow-[#adff44]/20"
                  : "text-neutral-400 hover:text-white hover:bg-white/5"
              }`}
            >
              <Icon size={15} />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Tab Content */}
      {activeTab === "upload" && (
        <UploadTab
          metadataSchema={metadataSchema}
          onUploadComplete={() => { fetchDocuments(); fetchQueue(); fetchAnalytics(); }}
        />
      )}
      {activeTab === "documents" && (
        <DocumentsTab
          documents={documents}
          pagination={docPagination}
          filters={docFilters}
          metadataSchema={metadataSchema}
          onFilterChange={(f) => { setDocFilters(f); fetchDocuments(1, f); }}
          onPageChange={(p) => fetchDocuments(p, docFilters)}
          onReprocess={(id) => {
            api.post(`/admin/knowledge/documents/${id}/reprocess`).then(() => fetchDocuments());
          }}
          onDelete={(id) => {
            if (confirm("Delete this document?")) {
              api.delete(`/admin/knowledge/documents/${id}`).then(() => { fetchDocuments(); fetchAnalytics(); });
            }
          }}
          onSelect={setSelectedDoc}
          selectedDoc={selectedDoc}
        />
      )}
      {activeTab === "analytics" && <AnalyticsTab analytics={analytics} />}
      {activeTab === "queue" && <QueueTab queue={queue} onRefresh={fetchQueue} />}
      {activeTab === "metadata" && (
        <MetadataTab schema={metadataSchema} onRefresh={fetchMetadataSchema} />
      )}
    </div>
  );
}

// ── Upload Tab ──────────────────────────────────────────────────────────

function UploadTab({ metadataSchema, onUploadComplete }) {
  const [uploading, setUploading] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const [metadata, setMetadata] = useState({});
  const [newTagValue, setNewTagValue] = useState("");
  const [selectedFile, setSelectedFile] = useState(null);
  const fileRef = useRef(null);

  const handleUpload = async () => {
    if (!selectedFile) return;
    setUploading(true);
    const formData = new FormData();
    formData.append("file", selectedFile);
    formData.append("metadata_json", JSON.stringify(metadata));
    try {
      await api.post("/admin/knowledge/upload", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      setMetadata({});
      setSelectedFile(null);
      if (fileRef.current) fileRef.current.value = "";
      onUploadComplete();
    } catch (e) {
      alert(e.response?.data?.detail || "Upload failed");
    } finally {
      setUploading(false);
    }
  };

  const handleSelectFile = (file) => {
    if (!file) return;
    setSelectedFile(file);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setDragActive(false);
    const file = e.dataTransfer.files[0];
    if (file) handleSelectFile(file);
  };

  const clearSelection = () => {
    setSelectedFile(null);
    if (fileRef.current) fileRef.current.value = "";
  };

  const sourceType = metadata.source_type;
  const isPyqOrMock = sourceType === "pyq" || sourceType === "mock_test";

  const metaFields = [
    { key: "class", label: "Class", field: "class" },
    { key: "subject", label: "Subject", field: "subject", hideWhen: isPyqOrMock },
    { key: "source_type", label: "Source Type", field: "source_type" },
    { key: "exam_type", label: "Exam Type", field: "exam_type" },
    { key: "language", label: "Language", field: "language", hideWhen: isPyqOrMock },
    { key: "year", label: "Year", field: "year", hideWhen: !isPyqOrMock },
  ];

  const formatFileSize = (bytes) => {
    if (bytes < 1024) return bytes + " B";
    if (bytes < 1048576) return (bytes / 1024).toFixed(1) + " KB";
    return (bytes / 1048576).toFixed(1) + " MB";
  };

  return (
    <div className="grid lg:grid-cols-2 gap-6">
      {/* Upload Zone */}
      <div className="bg-neutral-900 border border-white/10 rounded-2xl p-6">
        <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
          <Upload className="text-[#adff44]" size={20} /> Upload Document
        </h2>

        {/* Drop zone / file selection */}
        <div
          className={`border-2 border-dashed rounded-2xl p-12 flex flex-col items-center justify-center cursor-pointer transition-all group ${
            dragActive
              ? "border-[#adff44] bg-[#adff44]/10"
              : selectedFile
                ? "border-emerald-500/50 bg-emerald-500/5"
                : "border-white/15 hover:border-[#adff44]/50 hover:bg-[#adff44]/5"
          }`}
          onClick={() => !selectedFile && fileRef.current?.click()}
          onDragOver={(e) => { e.preventDefault(); setDragActive(true); }}
          onDragLeave={() => setDragActive(false)}
          onDrop={handleDrop}
        >
          <input
            type="file"
            ref={fileRef}
            className="hidden"
            accept=".pdf,.docx,.png,.jpg,.jpeg,.txt"
            onChange={(e) => handleSelectFile(e.target.files[0])}
          />

          {uploading ? (
            <>
              <Loader2 className="animate-spin text-[#adff44] mb-3" size={40} />
              <p className="font-bold text-white mb-1">Uploading...</p>
              <p className="text-xs text-neutral-500">{selectedFile?.name}</p>
            </>
          ) : selectedFile ? (
            <>
              <div className="w-16 h-16 bg-emerald-500/10 rounded-2xl flex items-center justify-center mb-4">
                <FileText className="text-emerald-400" size={28} />
              </div>
              <p className="font-bold text-white mb-1">{selectedFile.name}</p>
              <p className="text-xs text-neutral-500 mb-4">{formatFileSize(selectedFile.size)}</p>
              <div className="flex gap-3">
                <button
                  onClick={(e) => { e.stopPropagation(); clearSelection(); }}
                  className="bg-white/10 hover:bg-white/20 text-neutral-300 px-4 py-2 rounded-xl text-sm font-bold transition-colors"
                >
                  Change File
                </button>
                <button
                  onClick={(e) => { e.stopPropagation(); handleUpload(); }}
                  disabled={uploading}
                  className="bg-[#adff44] text-black px-6 py-2 rounded-xl text-sm font-bold hover:bg-[#bfff66] transition-colors disabled:opacity-50 flex items-center gap-2"
                >
                  <Upload size={15} /> Upload
                </button>
              </div>
            </>
          ) : (
            <>
              <div className="w-16 h-16 bg-white/5 rounded-2xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                <FileText className="text-neutral-400 group-hover:text-[#adff44] transition-colors" size={28} />
              </div>
              <p className="font-bold text-white mb-1">Drop file here or click to browse</p>
              <p className="text-xs text-neutral-500">PDF, DOCX, PNG, JPG, JPEG, TXT — Max 100MB</p>
            </>
          )}
        </div>
      </div>

      {/* Metadata Form */}
      <div className="bg-neutral-900 border border-white/10 rounded-2xl p-6">
        <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
          <Database className="text-blue-400" size={20} /> Document Metadata
        </h2>
        <p className="text-xs text-neutral-500 mb-4">All fields are optional. Values are loaded from the database.</p>

        <div className="space-y-4">
          {metaFields.map(({ key, label, field, hideWhen }) => {
            if (hideWhen) return null;
            if (key === "year") {
              return (
                <div key={key}>
                  <label className="text-xs text-neutral-400 mb-1.5 block uppercase tracking-wider font-semibold">{label}</label>
                  <input
                    type="number"
                    className="w-full bg-black border border-white/10 rounded-xl px-3 py-2.5 text-sm focus:border-[#adff44] outline-none text-white"
                    placeholder="e.g., 2024"
                    value={metadata.year || ""}
                    onChange={(e) => setMetadata(prev => ({ ...prev, year: e.target.value ? parseInt(e.target.value) : undefined }))}
                  />
                </div>
              );
            }
            return (
              <div key={key}>
                <label className="text-xs text-neutral-400 mb-1.5 block uppercase tracking-wider font-semibold">{label}</label>
                <select
                  className="w-full bg-black border border-white/10 rounded-xl px-3 py-2.5 text-sm focus:border-[#adff44] outline-none text-white appearance-none"
                  value={metadata[key] || ""}
                  onChange={(e) => setMetadata(prev => ({ ...prev, [key]: e.target.value || undefined }))}
                >
                  <option value="">— Select —</option>
                  {(metadataSchema[field] || []).map(opt => (
                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                  ))}
                </select>
              </div>
            );
          })}

          {/* Chapter (free-text) — hidden for PYQ/mock test */}
          {!isPyqOrMock && (
            <div>
              <label className="text-xs text-neutral-400 mb-1.5 block uppercase tracking-wider font-semibold">Chapter</label>
              <input
                type="text"
                className="w-full bg-black border border-white/10 rounded-xl px-3 py-2.5 text-sm focus:border-[#adff44] outline-none text-white"
                placeholder="e.g., Chapter 3 - Fractions"
                value={metadata.chapter || ""}
                onChange={(e) => setMetadata(prev => ({ ...prev, chapter: e.target.value || undefined }))}
              />
            </div>
          )}

          {/* Tags */}
          <div>
            <label className="text-xs text-neutral-400 mb-1.5 block uppercase tracking-wider font-semibold">Tags</label>
            <div className="flex gap-2 flex-wrap mb-2">
              {(metadata.tags || []).map((tag, i) => (
                <span key={i} className="bg-[#adff44]/10 text-[#adff44] text-xs px-2 py-1 rounded-lg flex items-center gap-1">
                  {tag}
                  <X size={12} className="cursor-pointer" onClick={() =>
                    setMetadata(prev => ({ ...prev, tags: prev.tags.filter((_, idx) => idx !== i) }))
                  } />
                </span>
              ))}
            </div>
            <div className="flex gap-2">
              <input
                type="text"
                className="flex-1 bg-black border border-white/10 rounded-xl px-3 py-2 text-sm focus:border-[#adff44] outline-none text-white"
                placeholder="Add a tag"
                value={newTagValue}
                onChange={(e) => setNewTagValue(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && newTagValue.trim()) {
                    setMetadata(prev => ({ ...prev, tags: [...(prev.tags || []), newTagValue.trim()] }));
                    setNewTagValue("");
                  }
                }}
              />
              <button
                onClick={() => {
                  if (newTagValue.trim()) {
                    setMetadata(prev => ({ ...prev, tags: [...(prev.tags || []), newTagValue.trim()] }));
                    setNewTagValue("");
                  }
                }}
                className="bg-white/10 hover:bg-white/20 text-white px-3 py-2 rounded-xl text-sm font-bold transition-colors"
              >
                <Plus size={16} />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Documents Tab ───────────────────────────────────────────────────────

function DocumentsTab({ documents, pagination, filters, metadataSchema, onFilterChange, onPageChange, onReprocess, onDelete, onSelect, selectedDoc }) {
  const [searchText, setSearchText] = useState(filters.search || "");

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex flex-wrap gap-3 items-center">
        <div className="relative flex-1 min-w-[200px]">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-500" />
          <input
            type="text"
            className="w-full bg-neutral-900 border border-white/10 rounded-xl pl-10 pr-3 py-2.5 text-sm focus:border-[#adff44] outline-none text-white"
            placeholder="Search documents..."
            value={searchText}
            onChange={(e) => setSearchText(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && onFilterChange({ ...filters, search: searchText })}
          />
        </div>
        <select
          className="bg-neutral-900 border border-white/10 rounded-xl px-3 py-2.5 text-sm text-white outline-none"
          value={filters.status || ""}
          onChange={(e) => onFilterChange({ ...filters, status: e.target.value || undefined })}
        >
          <option value="">All Status</option>
          <option value="completed">Completed</option>
          <option value="failed">Failed</option>
          <option value="queued">Queued</option>
        </select>
        <select
          className="bg-neutral-900 border border-white/10 rounded-xl px-3 py-2.5 text-sm text-white outline-none"
          value={filters.source_type || ""}
          onChange={(e) => onFilterChange({ ...filters, source_type: e.target.value || undefined })}
        >
          <option value="">All Sources</option>
          {(metadataSchema.source_type || []).map(opt => (
            <option key={opt.value} value={opt.value}>{opt.label}</option>
          ))}
        </select>
      </div>

      {/* Document Table */}
      <div className="bg-neutral-900 border border-white/10 rounded-2xl overflow-hidden">
        <table className="w-full text-left text-sm">
          <thead className="bg-black/40 text-neutral-400 font-bold uppercase text-xs tracking-wider">
            <tr>
              <th className="px-5 py-4 border-b border-white/10">Document</th>
              <th className="px-5 py-4 border-b border-white/10">Type</th>
              <th className="px-5 py-4 border-b border-white/10">Status</th>
              <th className="px-5 py-4 border-b border-white/10">Chunks</th>
              <th className="px-5 py-4 border-b border-white/10">Date</th>
              <th className="px-5 py-4 border-b border-white/10 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5">
            {documents.length === 0 ? (
              <tr>
                <td colSpan="6" className="px-5 py-12 text-center text-neutral-500">
                  <Database size={32} className="mx-auto mb-3 opacity-30" />
                  No documents found
                </td>
              </tr>
            ) : (
              documents.map(doc => (
                <tr key={doc.id} className="hover:bg-white/[0.02] transition-colors">
                  <td className="px-5 py-4">
                    <div className="font-medium text-white truncate max-w-[250px]">{doc.original_file_name}</div>
                    <div className="text-xs text-neutral-500 mt-0.5">
                      {doc.doc_subject && <span className="mr-2">{doc.doc_subject}</span>}
                      {doc.exam_type && <span className="text-[#adff44]/60">{doc.exam_type}</span>}
                    </div>
                    {doc.processing_error && (
                      <div className="text-xs text-red-400 mt-1 truncate max-w-[250px]">{doc.processing_error}</div>
                    )}
                  </td>
                  <td className="px-5 py-4">
                    <span className="text-xs bg-white/5 px-2 py-1 rounded-lg text-neutral-300 uppercase">{doc.document_type}</span>
                  </td>
                  <td className="px-5 py-4"><StatusBadge status={doc.processing_status} /></td>
                  <td className="px-5 py-4">
                    <span className="font-bold text-white">{doc.total_chunks}</span>
                    <span className="text-neutral-500 ml-1 text-xs">/ {doc.total_pages}p</span>
                  </td>
                  <td className="px-5 py-4 text-neutral-400 text-xs">{new Date(doc.created_at).toLocaleDateString()}</td>
                  <td className="px-5 py-4 text-right">
                    <div className="flex gap-2 justify-end">
                      <button
                        onClick={() => onSelect(doc)}
                        className="text-xs bg-white/5 hover:bg-white/10 text-white px-2.5 py-1.5 rounded-lg transition-colors"
                        title="View Details"
                      >
                        <Eye size={14} />
                      </button>
                      <button
                        onClick={() => onReprocess(doc.id)}
                        disabled={["processing", "extracting", "embedding", "queued"].includes(doc.processing_status)}
                        className="text-xs bg-white/5 hover:bg-white/10 text-white px-2.5 py-1.5 rounded-lg transition-colors disabled:opacity-30"
                        title="Reprocess"
                      >
                        <RefreshCw size={14} />
                      </button>
                      <button
                        onClick={() => onDelete(doc.id)}
                        className="text-xs bg-red-500/10 hover:bg-red-500/20 text-red-400 px-2.5 py-1.5 rounded-lg transition-colors"
                        title="Delete"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {pagination.total > pagination.limit && (
        <div className="flex items-center justify-between pt-2">
          <span className="text-xs text-neutral-500">
            Showing {(pagination.page - 1) * pagination.limit + 1}–
            {Math.min(pagination.page * pagination.limit, pagination.total)} of {pagination.total}
          </span>
          <div className="flex gap-2">
            <button
              disabled={pagination.page <= 1}
              onClick={() => onPageChange(pagination.page - 1)}
              className="px-3 py-1.5 bg-neutral-800 rounded-lg text-xs font-bold disabled:opacity-30"
            >
              Prev
            </button>
            <button
              disabled={pagination.page * pagination.limit >= pagination.total}
              onClick={() => onPageChange(pagination.page + 1)}
              className="px-3 py-1.5 bg-neutral-800 rounded-lg text-xs font-bold disabled:opacity-30"
            >
              Next
            </button>
          </div>
        </div>
      )}

      {/* Document Detail Modal */}
      {selectedDoc && (
        <DocumentDetailModal doc={selectedDoc} onClose={() => onSelect(null)} />
      )}
    </div>
  );
}

// ── Document Detail Modal ───────────────────────────────────────────────

function DocumentDetailModal({ doc, onClose }) {
  const [detail, setDetail] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get(`/admin/knowledge/documents/${doc.id}`)
      .then(res => setDetail(res.data))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [doc.id]);

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-neutral-900 border border-white/10 rounded-2xl w-full max-w-3xl max-h-[80vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
        <div className="sticky top-0 bg-neutral-900 border-b border-white/10 px-6 py-4 flex items-center justify-between">
          <h3 className="font-bold text-lg">{doc.original_file_name}</h3>
          <button onClick={onClose} className="text-neutral-400 hover:text-white"><X size={20} /></button>
        </div>

        {loading ? (
          <div className="p-8 flex justify-center"><Loader2 className="animate-spin text-[#adff44]" size={24} /></div>
        ) : detail ? (
          <div className="p-6 space-y-6">
            {/* Info Grid */}
            <div className="grid grid-cols-3 gap-4">
              {[
                { label: "Status", value: <StatusBadge status={detail.processing_status} /> },
                { label: "Pages", value: detail.total_pages },
                { label: "Chunks", value: detail.total_chunks },
                { label: "Type", value: detail.document_type },
                { label: "Source", value: detail.source_type },
                { label: "Size", value: `${(detail.file_size / 1024).toFixed(0)} KB` },
              ].map((item, i) => (
                <div key={i} className="bg-black/40 rounded-xl p-3">
                  <div className="text-xs text-neutral-500 mb-1">{item.label}</div>
                  <div className="font-bold text-sm">{item.value}</div>
                </div>
              ))}
            </div>

            {/* Chunk Types */}
            {detail.chunk_count_by_type && Object.keys(detail.chunk_count_by_type).length > 0 && (
              <div>
                <h4 className="font-bold mb-2 text-sm">Chunk Distribution</h4>
                <div className="flex gap-2 flex-wrap">
                  {Object.entries(detail.chunk_count_by_type).map(([type, count]) => (
                    <span key={type} className="bg-white/5 px-3 py-1.5 rounded-lg text-xs">
                      <span className="text-neutral-400">{type}:</span>
                      <span className="font-bold text-white ml-1">{count}</span>
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Audit Log */}
            {detail.audit_logs && detail.audit_logs.length > 0 && (
              <div>
                <h4 className="font-bold mb-2 text-sm">Processing Timeline</h4>
                <div className="space-y-1.5">
                  {detail.audit_logs.map(log => (
                    <div key={log.id} className="flex items-center gap-3 text-xs bg-black/20 rounded-lg px-3 py-2">
                      <span className={`w-2 h-2 rounded-full ${log.error_message ? "bg-red-500" : "bg-emerald-500"}`} />
                      <span className="text-neutral-400 w-20">{log.stage}</span>
                      <span className="font-medium text-white flex-1">{log.action}</span>
                      {log.duration_ms != null && (
                        <span className="text-neutral-500">{log.duration_ms}ms</span>
                      )}
                      <span className="text-neutral-600">{new Date(log.timestamp).toLocaleTimeString()}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {detail.processing_error && (
              <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-4">
                <div className="text-xs text-red-400 font-bold mb-1">Processing Error</div>
                <div className="text-sm text-red-300">{detail.processing_error}</div>
              </div>
            )}
          </div>
        ) : null}
      </div>
    </div>
  );
}

// ── Analytics Tab ───────────────────────────────────────────────────────

function AnalyticsTab({ analytics }) {
  if (!analytics) return <div className="text-neutral-500">No analytics data available</div>;

  return (
    <div className="space-y-6">
      {/* KPI Row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <MetricCard icon={FileText} label="Total Documents" value={analytics.total_documents} accent="text-white" />
        <MetricCard icon={Layers} label="Total Chunks" value={analytics.total_chunks} accent="text-[#adff44]" />
        <MetricCard icon={Database} label="Total Questions" value={analytics.total_questions} accent="text-blue-400" />
        <MetricCard icon={HardDrive} label="Total Embeddings" value={analytics.total_embeddings} accent="text-purple-400" />
      </div>

      {/* Health Metrics */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-neutral-900 border border-white/10 rounded-2xl p-5">
          <div className="text-xs text-neutral-400 font-bold uppercase mb-2">Duplicate Rate</div>
          <div className="text-2xl font-black text-amber-400">{analytics.duplicate_rate}%</div>
          <div className="text-xs text-neutral-500 mt-1">Content deduplicated</div>
        </div>
        <div className="bg-neutral-900 border border-white/10 rounded-2xl p-5">
          <div className="text-xs text-neutral-400 font-bold uppercase mb-2">Failure Rate</div>
          <div className={`text-2xl font-black ${analytics.processing_failure_rate > 10 ? "text-red-400" : "text-emerald-400"}`}>
            {analytics.processing_failure_rate}%
          </div>
          <div className="text-xs text-neutral-500 mt-1">Processing failures</div>
        </div>
        <div className="bg-neutral-900 border border-white/10 rounded-2xl p-5">
          <div className="text-xs text-neutral-400 font-bold uppercase mb-2">OCR Success</div>
          <div className="text-2xl font-black text-emerald-400">{analytics.ocr_success_rate}%</div>
          <div className="text-xs text-neutral-500 mt-1">Scanned documents</div>
        </div>
        <div className="bg-neutral-900 border border-white/10 rounded-2xl p-5">
          <div className="text-xs text-neutral-400 font-bold uppercase mb-2">Avg Latency</div>
          <div className="text-2xl font-black text-white">{(analytics.avg_processing_time_ms / 1000).toFixed(1)}s</div>
          <div className="text-xs text-neutral-500 mt-1">Per document</div>
        </div>
      </div>

      {/* Distribution Charts */}
      <div className="grid md:grid-cols-2 gap-4">
        <div className="bg-neutral-900 border border-white/10 rounded-2xl p-5">
          <h3 className="font-bold mb-3 text-sm">By Status</h3>
          <div className="space-y-2">
            {Object.entries(analytics.documents_by_status || {}).map(([status, count]) => (
              <div key={status} className="flex items-center justify-between">
                <StatusBadge status={status} />
                <span className="font-bold">{count}</span>
              </div>
            ))}
          </div>
        </div>
        <div className="bg-neutral-900 border border-white/10 rounded-2xl p-5">
          <h3 className="font-bold mb-3 text-sm">By Source Type</h3>
          <div className="space-y-2">
            {Object.entries(analytics.documents_by_source || {}).map(([type, count]) => (
              <div key={type} className="flex items-center justify-between text-sm">
                <span className="text-neutral-300 capitalize">{type.replace("_", " ")}</span>
                <span className="font-bold">{count}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Vector Store Health */}
      <div className="bg-neutral-900 border border-white/10 rounded-2xl p-5">
        <h3 className="font-bold mb-3 text-sm flex items-center gap-2">
          <Activity size={16} className="text-[#adff44]" /> Vector Store Health
        </h3>
        <div className="flex gap-6 text-sm">
          <div>
            <span className="text-neutral-400">Status: </span>
            <span className={`font-bold ${analytics.vector_store_health?.status === "healthy" ? "text-emerald-400" : "text-amber-400"}`}>
              {analytics.vector_store_health?.status || "unknown"}
            </span>
          </div>
          <div>
            <span className="text-neutral-400">Vectors: </span>
            <span className="font-bold">{analytics.vector_store_health?.total_vectors || 0}</span>
          </div>
          <div>
            <span className="text-neutral-400">Collection: </span>
            <span className="font-bold text-neutral-300">{analytics.vector_store_health?.collection || "—"}</span>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Queue Tab ───────────────────────────────────────────────────────────

function QueueTab({ queue, onRefresh }) {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="font-bold">Processing Queue</h2>
        <button onClick={onRefresh} className="text-xs bg-neutral-800 hover:bg-neutral-700 px-3 py-1.5 rounded-lg font-bold flex items-center gap-1">
          <RefreshCw size={12} /> Refresh
        </button>
      </div>

      <div className="bg-neutral-900 border border-white/10 rounded-2xl overflow-hidden">
        <table className="w-full text-left text-sm">
          <thead className="bg-black/40 text-neutral-400 font-bold uppercase text-xs tracking-wider">
            <tr>
              <th className="px-5 py-3 border-b border-white/10">Job ID</th>
              <th className="px-5 py-3 border-b border-white/10">Doc ID</th>
              <th className="px-5 py-3 border-b border-white/10">Status</th>
              <th className="px-5 py-3 border-b border-white/10">Attempts</th>
              <th className="px-5 py-3 border-b border-white/10">Started</th>
              <th className="px-5 py-3 border-b border-white/10">Error</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5">
            {queue.length === 0 ? (
              <tr><td colSpan="6" className="px-5 py-8 text-center text-neutral-500">Queue is empty</td></tr>
            ) : (
              queue.map(job => (
                <tr key={job.id} className="hover:bg-white/[0.02]">
                  <td className="px-5 py-3 font-mono text-neutral-300">#{job.id}</td>
                  <td className="px-5 py-3 text-neutral-300">#{job.document_id}</td>
                  <td className="px-5 py-3"><StatusBadge status={job.status} /></td>
                  <td className="px-5 py-3">{job.attempt_count}/{job.max_retries}</td>
                  <td className="px-5 py-3 text-neutral-400 text-xs">
                    {job.started_at ? new Date(job.started_at).toLocaleString() : "—"}
                  </td>
                  <td className="px-5 py-3 text-red-400 text-xs truncate max-w-[200px]">{job.error_message || "—"}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ── Metadata Tab ────────────────────────────────────────────────────────

function MetadataTab({ schema, onRefresh }) {
  const [activeField, setActiveField] = useState(Object.keys(schema)[0] || "class");
  const [newValue, setNewValue] = useState("");
  const [newLabel, setNewLabel] = useState("");

  const addValue = async () => {
    if (!newValue.trim()) return;
    try {
      await api.post(`/admin/knowledge/metadata/${activeField}`, {
        value: newValue.trim(),
        label: newLabel.trim() || newValue.trim(),
      });
      setNewValue("");
      setNewLabel("");
      onRefresh();
    } catch (e) {
      alert(e.response?.data?.detail || "Failed to add value");
    }
  };

  const deleteValue = async (id) => {
    try {
      await api.delete(`/admin/knowledge/metadata/${activeField}/${id}`);
      onRefresh();
    } catch (e) {
      alert("Failed to remove value");
    }
  };

  return (
    <div className="grid lg:grid-cols-[240px_1fr] gap-6">
      {/* Field List */}
      <div className="bg-neutral-900 border border-white/10 rounded-2xl p-4">
        <h3 className="font-bold mb-3 text-sm">Metadata Fields</h3>
        <div className="space-y-1">
          {Object.keys(schema).map(field => (
            <button
              key={field}
              onClick={() => setActiveField(field)}
              className={`w-full text-left px-3 py-2 rounded-xl text-sm capitalize transition-colors ${
                activeField === field
                  ? "bg-[#adff44] text-black font-bold"
                  : "text-neutral-400 hover:text-white hover:bg-white/5"
              }`}
            >
              {field.replace("_", " ")}
              <span className="ml-2 text-xs opacity-60">({(schema[field] || []).length})</span>
            </button>
          ))}
        </div>
      </div>

      {/* Values */}
      <div className="bg-neutral-900 border border-white/10 rounded-2xl p-6">
        <h3 className="font-bold mb-4 text-sm capitalize">{activeField.replace("_", " ")} Values</h3>

        {/* Add New */}
        <div className="flex gap-2 mb-4">
          <input
            type="text"
            className="flex-1 bg-black border border-white/10 rounded-xl px-3 py-2 text-sm focus:border-[#adff44] outline-none text-white"
            placeholder="Value"
            value={newValue}
            onChange={(e) => setNewValue(e.target.value)}
          />
          <input
            type="text"
            className="flex-1 bg-black border border-white/10 rounded-xl px-3 py-2 text-sm focus:border-[#adff44] outline-none text-white"
            placeholder="Display Label (optional)"
            value={newLabel}
            onChange={(e) => setNewLabel(e.target.value)}
          />
          <button
            onClick={addValue}
            className="bg-[#adff44] text-black px-4 py-2 rounded-xl text-sm font-bold hover:bg-[#bfff66] transition-colors"
          >
            <Plus size={16} />
          </button>
        </div>

        {/* List */}
        <div className="space-y-1.5">
          {(schema[activeField] || []).map(item => (
            <div key={item.id} className="flex items-center justify-between bg-black/30 rounded-xl px-4 py-2.5 group">
              <div>
                <span className="font-medium text-sm">{item.label}</span>
                <span className="text-neutral-500 text-xs ml-2">({item.value})</span>
              </div>
              <button
                onClick={() => deleteValue(item.id)}
                className="text-red-400/50 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity"
              >
                <Trash2 size={14} />
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* Migration Actions */}
      <div className="bg-neutral-900 border border-white/10 rounded-2xl p-6 lg:col-span-2 flex items-center justify-between mt-6">
        <div>
          <h3 className="font-bold text-white mb-1">Migrate Legacy Data</h3>
          <p className="text-sm text-neutral-400">Migrate documents from the old PdfMetadata table to the new Knowledge Base.</p>
        </div>
        <button
          onClick={async () => {
            if (confirm("Trigger legacy data migration?")) {
              try {
                const res = await api.post("/admin/knowledge/migrate");
                alert(`Migrated ${res.data.migrated_docs} documents and ${res.data.migrated_chunks} chunks.`);
                onRefresh();
              } catch (e) {
                alert("Migration failed");
              }
            }
          }}
          className="bg-purple-500/20 text-purple-400 hover:bg-purple-500/30 px-4 py-2 rounded-xl text-sm font-bold transition-colors"
        >
          Run Migration
        </button>
      </div>
    </div>
  );
}
