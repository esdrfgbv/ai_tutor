import { useEffect, useState, useCallback } from "react";
import { useParams, Link } from "react-router-dom";
import { ArrowLeft, BookOpen, Brain, PanelRightOpen, PanelRightClose } from "lucide-react";
import { motion } from "framer-motion";
import api from "../api/client";
import { useAuth } from "../context/AuthContext.jsx";
import { useStudySession } from "../context/StudySessionContext.jsx";
import { StudyWorkspaceProvider, useStudyWorkspace } from "../context/StudyWorkspaceContext.jsx";
import { modulesMap } from "../utils/modules";
import StudySidebar from "../components/study/StudySidebar.jsx";
import PdfCanvasViewer from "../components/study/PdfCanvasViewer.jsx";
import AiTutorPanel from "../components/study/AiTutorPanel.jsx";
import ResizeHandle from "../components/study/ResizeHandle.jsx";

function getModuleTitle(subject, slug) {
  for (const grade in modulesMap) {
    const list = modulesMap[grade][subject] || [];
    const mod = list.find((m) => m.slug === slug);
    if (mod) return mod.title;
  }
  return slug
    .split("-")
    .map((w) => (w.toLowerCase() === "nsao" ? "Number System and Operations" : w.charAt(0).toUpperCase() + w.slice(1)))
    .join(" ");
}

function WorkspaceContent({ pdfUrl, title }) {
  const {
    aiPanelOpen, setAiPanelOpen, sidebarOpen,
    currentPage, totalPages, subject,
  } = useStudyWorkspace();

  const [pdfRatio, setPdfRatio] = useState(65); // percentage of content area for PDF

  const handleResize = useCallback((ratio) => {
    setPdfRatio(ratio);
  }, []);

  return (
    <div className="study-workspace">
      {/* ── Left Sidebar ── */}
      <StudySidebar />

      {/* ── Main Content Area ── */}
      <div className="study-main">
        {/* ── Top Bar ── */}
        <div className="study-topbar">
          <div className="study-topbar-left">
            <Link to="/chapters" className="study-back-btn">
              <ArrowLeft size={14} />
              <span className="study-back-text">Back</span>
            </Link>
            <div className="study-topbar-info">
              <p className="study-topbar-subject">
                <BookOpen size={11} />
                {subject?.charAt(0).toUpperCase() + subject?.slice(1)}
              </p>
              <h1 className="study-topbar-title">{title}</h1>
            </div>
          </div>
          <div className="study-topbar-right">
            {totalPages > 0 && (
              <span className="study-page-badge">
                Page {currentPage} / {totalPages}
              </span>
            )}
            <button
              onClick={() => setAiPanelOpen(!aiPanelOpen)}
              className={`study-ai-toggle ${aiPanelOpen ? "active" : ""}`}
              title={aiPanelOpen ? "Close AI Panel" : "Open AI Panel"}
            >
              {aiPanelOpen ? <PanelRightClose size={16} /> : <PanelRightOpen size={16} />}
              <Brain size={14} className="study-ai-toggle-brain" />
              <span className="study-ai-toggle-label">AI Tutor</span>
            </button>
          </div>
        </div>

        {/* ── Content Split ── */}
        <div className="study-content-split">
          {/* PDF Viewer */}
          <div
            className="study-pdf-area"
            style={{ flex: aiPanelOpen ? `0 0 ${pdfRatio}%` : "1 1 100%" }}
          >
            <PdfCanvasViewer pdfUrl={pdfUrl} />
          </div>

          {/* Resize Handle */}
          {aiPanelOpen && (
            <ResizeHandle
              onResize={handleResize}
              minLeft={35}
              maxLeft={75}
            />
          )}

          {/* AI Tutor Panel */}
          {aiPanelOpen && (
            <motion.div
              initial={{ width: 0, opacity: 0 }}
              animate={{ width: "auto", opacity: 1 }}
              exit={{ width: 0, opacity: 0 }}
              transition={{ duration: 0.25 }}
              className="study-ai-area"
              style={{ flex: `0 0 ${100 - pdfRatio}%` }}
            >
              <AiTutorPanel />
            </motion.div>
          )}
        </div>
      </div>

      {/* ── Mobile AI FAB ── */}
      {!aiPanelOpen && (
        <button
          onClick={() => setAiPanelOpen(true)}
          className="study-ai-fab"
        >
          <Brain size={22} />
        </button>
      )}
    </div>
  );
}

export default function ModuleLearningPage() {
  const { subject, slug } = useParams();
  const { startSession, endSession } = useStudySession();
  const { user } = useAuth();
  const [grade, setGrade] = useState(null);

  const title = getModuleTitle(subject, slug);

  useEffect(() => {
    if (user?.role === "student") {
      api.get("/learning/profile")
        .then((res) => setGrade(res.data.grade))
        .catch(() => setGrade(9));
    } else {
      setGrade(9);
    }
  }, [user]);

  useEffect(() => {
    startSession("pdf_reading", subject || "maths", slug);
    return () => endSession();
  }, [subject, slug]);

  const pdfUrl = grade
    ? `${api.defaults.baseURL}/learning/class-${grade}/${subject}/pdf/${slug}`
    : null;

  if (!grade || !pdfUrl) {
    return (
      <div className="study-loading">
        <div className="study-loading-spinner" />
        <p className="study-loading-text">Loading study workspace...</p>
      </div>
    );
  }

  return (
    <StudyWorkspaceProvider
      subject={subject}
      slug={slug}
      chapterTitle={title}
      grade={grade}
    >
      <WorkspaceContent pdfUrl={pdfUrl} title={title} />
    </StudyWorkspaceProvider>
  );
}
