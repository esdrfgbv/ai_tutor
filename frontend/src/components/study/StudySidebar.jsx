import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  BookOpen, StickyNote, Bookmark, Clock, Search,
  ChevronLeft, ChevronRight, Trash2, FileText, X,
} from "lucide-react";
import { Link } from "react-router-dom";
import { useStudyWorkspace } from "../../context/StudyWorkspaceContext";
import { modulesMap } from "../../utils/modules";

const TABS = [
  { id: "chapters", icon: BookOpen, label: "Chapters", emoji: "📖" },
  { id: "notes", icon: StickyNote, label: "Notes", emoji: "📝" },
  { id: "bookmarks", icon: Bookmark, label: "Bookmarks", emoji: "⭐" },
  { id: "doubts", icon: Clock, label: "Recent Doubts", emoji: "🕒" },
];

export default function StudySidebar() {
  const {
    sidebarOpen, setSidebarOpen, subject, slug, grade,
    notes, deleteNote, bookmarks, deleteBookmark, recentDoubts,
    sendMessage, setAiPanelOpen,
  } = useStudyWorkspace();

  const [activeTab, setActiveTab] = useState("chapters");
  const [chapterSearch, setChapterSearch] = useState("");

  const availableModules = (modulesMap[grade]?.[subject] || []).filter((m) =>
    m.title.toLowerCase().includes(chapterSearch.toLowerCase())
  );

  return (
    <AnimatePresence initial={false}>
      <motion.aside
        initial={false}
        animate={{ width: sidebarOpen ? 260 : 56 }}
        transition={{ duration: 0.3, ease: [0.25, 0.46, 0.45, 0.94] }}
        className="study-sidebar"
      >
        {/* Toggle Button */}
        <div className="ss-header">
          {sidebarOpen && (
            <motion.span
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="ss-title"
            >
              Study Navigator
            </motion.span>
          )}
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="ss-toggle-btn"
            title={sidebarOpen ? "Collapse sidebar" : "Expand sidebar"}
          >
            {sidebarOpen ? <ChevronLeft size={16} /> : <ChevronRight size={16} />}
          </button>
        </div>

        {/* Tab Buttons */}
        <div className={`ss-tabs ${sidebarOpen ? "" : "ss-tabs-collapsed"}`}>
          {TABS.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`ss-tab ${activeTab === tab.id ? "ss-tab-active" : ""}`}
              title={tab.label}
            >
              <span className="ss-tab-emoji">{tab.emoji}</span>
              {sidebarOpen && (
                <motion.span
                  initial={{ opacity: 0, width: 0 }}
                  animate={{ opacity: 1, width: "auto" }}
                  className="ss-tab-label"
                >
                  {tab.label}
                </motion.span>
              )}
            </button>
          ))}
        </div>

        {/* Tab Content (only when expanded) */}
        {sidebarOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.1 }}
            className="ss-content"
          >
            {/* ── Chapters Tab ── */}
            {activeTab === "chapters" && (
              <div className="ss-panel">
                <div className="ss-search">
                  <Search size={13} className="ss-search-icon" />
                  <input
                    className="ss-search-input"
                    placeholder="Search chapters..."
                    value={chapterSearch}
                    onChange={(e) => setChapterSearch(e.target.value)}
                  />
                </div>
                <div className="ss-list">
                  {availableModules.length > 0 ? (
                    availableModules.map((mod, i) => (
                      <Link
                        key={mod.slug}
                        to={`/study/${subject}/${mod.slug}`}
                        className={`ss-chapter-item ${slug === mod.slug ? "ss-chapter-active" : ""}`}
                      >
                        <span className="ss-chapter-num">{i + 1}</span>
                        <span className="ss-chapter-title">{mod.title}</span>
                      </Link>
                    ))
                  ) : (
                    <div className="ss-empty">No chapters found</div>
                  )}
                </div>
              </div>
            )}

            {/* ── Notes Tab ── */}
            {activeTab === "notes" && (
              <div className="ss-panel">
                {notes.length > 0 ? (
                  <div className="ss-list">
                    {notes.map((note) => (
                      <div key={note.id} className="ss-note-card">
                        <div className="ss-note-content">
                          {note.content.slice(0, 100)}{note.content.length > 100 ? "..." : ""}
                        </div>
                        {note.source_page && (
                          <span className="ss-note-page">📄 Page {note.source_page}</span>
                        )}
                        <div className="ss-note-meta">
                          <span className="ss-note-time">
                            {new Date(note.created_at).toLocaleDateString()}
                          </span>
                          <button
                            onClick={() => deleteNote(note.id)}
                            className="ss-note-delete"
                            title="Delete note"
                          >
                            <Trash2 size={11} />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="ss-empty">
                    <StickyNote size={24} style={{ color: "#8a8a8a", marginBottom: 8 }} />
                    <p>No notes yet</p>
                    <p className="ss-empty-hint">Save notes from AI responses</p>
                  </div>
                )}
              </div>
            )}

            {/* ── Bookmarks Tab ── */}
            {activeTab === "bookmarks" && (
              <div className="ss-panel">
                {bookmarks.length > 0 ? (
                  <div className="ss-list">
                    {bookmarks.map((bm) => (
                      <div key={bm.id} className="ss-bookmark-card">
                        <div className="ss-bookmark-text">
                          "{bm.selected_text.slice(0, 80)}{bm.selected_text.length > 80 ? "..." : ""}"
                        </div>
                        <div className="ss-note-meta">
                          {bm.page_number && (
                            <span className="ss-note-page">Page {bm.page_number}</span>
                          )}
                          <button
                            onClick={() => deleteBookmark(bm.id)}
                            className="ss-note-delete"
                            title="Delete bookmark"
                          >
                            <Trash2 size={11} />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="ss-empty">
                    <Bookmark size={24} style={{ color: "#8a8a8a", marginBottom: 8 }} />
                    <p>No bookmarks yet</p>
                    <p className="ss-empty-hint">Select text in PDF to bookmark</p>
                  </div>
                )}
              </div>
            )}

            {/* ── Recent Doubts Tab ── */}
            {activeTab === "doubts" && (
              <div className="ss-panel">
                {recentDoubts.length > 0 ? (
                  <div className="ss-list">
                    {recentDoubts.map((doubt) => (
                      <button
                        key={doubt.id}
                        className="ss-doubt-item"
                        onClick={() => {
                          setAiPanelOpen(true);
                        }}
                      >
                        <FileText size={13} className="ss-doubt-icon" />
                        <span className="ss-doubt-text">
                          {doubt.question.slice(0, 80)}{doubt.question.length > 80 ? "..." : ""}
                        </span>
                      </button>
                    ))}
                  </div>
                ) : (
                  <div className="ss-empty">
                    <Clock size={24} style={{ color: "#8a8a8a", marginBottom: 8 }} />
                    <p>No doubts yet</p>
                    <p className="ss-empty-hint">Ask your first doubt!</p>
                  </div>
                )}
              </div>
            )}
          </motion.div>
        )}
      </motion.aside>
    </AnimatePresence>
  );
}
