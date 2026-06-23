import React, { useState, useEffect, useRef, useCallback, memo } from "react";
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
        headers: {
          "Content-Type": "multipart/form-data"
        }
      });
      setSelectedFile(null);
      setMetadata({});
      if (onUploadComplete) onUploadComplete();
    } catch (e) { 
      console.error(e); 
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="bg-neutral-900 border border-white/10 rounded-2xl p-6">
      <p className="text-neutral-400 mb-4 text-sm">Upload files to populate your knowledge base.</p>
      <input 
        type="file" 
        ref={fileRef} 
        onChange={(e) => setSelectedFile(e.target.files[0])} 
        className="hidden" 
      />
      <div 
        onClick={() => fileRef.current?.click()}
        className="border-2 border-dashed border-white/10 hover:border-[#adff44]/50 rounded-xl p-8 text-center cursor-pointer transition-colors mb-4"
      >
        <Upload className="mx-auto text-neutral-500 mb-2" size={32} />
        <span className="text-sm font-medium block">
          {selectedFile ? selectedFile.name : "Click to browse or drag file here"}
        </span>
      </div>
      <button
        onClick={handleUpload}
        disabled={!selectedFile || uploading}
        className="w-full bg-[#adff44] text-black font-bold py-2.5 rounded-xl text-sm disabled:opacity-50 disabled:cursor-not-allowed transition-opacity"
      >
        {uploading ? "Uploading..." : "Upload Document"}
      </button>
    </div>
  );
}

// ── Placeholder Tabs (To avoid crash if missing) ────────────────────────

function DocumentsTab({ onSelect }) {
  return <div className="text-neutral-400 text-sm p-4">Documents Layout Placeholder</div>;
}

function AnalyticsTab() {
  return <div className="text-neutral-400 text-sm p-4">Analytics Layout Placeholder</div>;
}

// Custom Modal definition fixing the break at line 580
function DocumentModal({ doc, onClose }) {
  if (!doc) return null;
  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-neutral-900 border border-white/10 rounded-2xl w-full max-w-3xl max-h-[80vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
        <div className="sticky top-0 bg-neutral-900 border-b border-white/10 px-6 py-4 flex items-center justify-between">
          <h3 className="font-bold text-lg">{doc.original_file_name}</h3>
          <button onClick={onClose} className="text-neutral-400 hover:text-white"><X size={18} /></button>
        </div>
        <div className="p-6 text-sm text-neutral-300">
          <StatusBadge status={doc.status} />
          <pre className="mt-4 p-4 bg-black rounded-xl overflow-x-auto text-xs">{JSON.stringify(doc.metadata, null, 2)}</pre>
        </div>
      </div>
    </div>
  );
}

function QueueTab() {
  return <div className="text-neutral-400 text-sm p-4">Queue Layout Placeholder</div>;
}

function MetadataTab() {
  return <div className="text-neutral-400 text-sm p-4">Metadata Layout Placeholder</div>;
}
