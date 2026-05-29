import { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
import api from "../api/client";
import { useAuth } from "./AuthContext";

const StudyWorkspaceContext = createContext(null);

export function StudyWorkspaceProvider({ children, subject, slug, chapterTitle, grade }) {
  const { user } = useAuth();

  // ── PDF State ──
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(0);

  // ── Text Selection ──
  const [selectedText, setSelectedText] = useState("");
  const [selectionRect, setSelectionRect] = useState(null);

  // ── AI Conversation ──
  const [conversationId, setConversationId] = useState(null);
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(false);
  const [aiError, setAiError] = useState("");

  // ── Sidebar Data ──
  const [notes, setNotes] = useState([]);
  const [bookmarks, setBookmarks] = useState([]);
  const [recentDoubts, setRecentDoubts] = useState([]);

  // ── Panel State ──
  const [sidebarOpen, setSidebarOpen] = useState(() => {
    try { return localStorage.getItem("study_sidebar") !== "closed"; }
    catch { return true; }
  });
  const [aiPanelOpen, setAiPanelOpen] = useState(true);

  // Persist sidebar state
  useEffect(() => {
    try { localStorage.setItem("study_sidebar", sidebarOpen ? "open" : "closed"); }
    catch {}
  }, [sidebarOpen]);

  // ── Initialize/Get Conversation ──
  useEffect(() => {
    if (!subject || !slug) return;

    api.post("/conversations", {
      subject,
      module_slug: slug,
      chapter_title: chapterTitle || null,
      grade: grade || 9,
    })
      .then((res) => {
        setConversationId(res.data.id);
        setMessages(
          (res.data.messages || []).map((m) => ({
            id: m.id,
            role: m.role,
            text: m.content,
            selectedText: m.selected_text,
            pageNumber: m.page_number,
            citations: m.source_citations,
            createdAt: m.created_at,
          }))
        );
      })
      .catch((err) => console.error("Failed to init conversation:", err));
  }, [subject, slug, chapterTitle, grade]);

  // ── Load Notes ──
  const loadNotes = useCallback(() => {
    if (!slug) return;
    api.get("/notes", { params: { module_slug: slug } })
      .then((res) => setNotes(res.data))
      .catch(() => {});
  }, [slug]);

  // ── Load Bookmarks ──
  const loadBookmarks = useCallback(() => {
    if (!slug) return;
    api.get("/bookmarks", { params: { module_slug: slug } })
      .then((res) => setBookmarks(res.data))
      .catch(() => {});
  }, [slug]);

  // ── Load Recent Doubts ──
  const loadRecentDoubts = useCallback(() => {
    if (!slug) return;
    api.get("/conversations/recent", { params: { module_slug: slug, limit: 10 } })
      .then((res) => setRecentDoubts(res.data))
      .catch(() => {});
  }, [slug]);

  // Initial data load
  useEffect(() => {
    loadNotes();
    loadBookmarks();
    loadRecentDoubts();
  }, [loadNotes, loadBookmarks, loadRecentDoubts]);

  // ── Send Message ──
  const sendMessage = useCallback(
    async (question, options = {}) => {
      if (!conversationId || !question.trim() || loading) return;

      const { selectedText: selText, action, currentPage: page } = options;

      const userMsg = {
        id: `temp-${Date.now()}`,
        role: "user",
        text: question,
        selectedText: selText || null,
        pageNumber: page || currentPage,
        createdAt: new Date().toISOString(),
      };
      setMessages((prev) => [...prev, userMsg]);
      setLoading(true);
      setAiError("");

      try {
        const res = await api.post(`/conversations/${conversationId}/messages`, {
          question,
          selected_text: selText || null,
          current_page: page || currentPage,
          action: action || null,
        });

        const aiMsg = {
          id: res.data.id,
          role: "ai",
          text: res.data.content,
          selectedText: res.data.selected_text,
          pageNumber: res.data.page_number,
          citations: res.data.source_citations,
          createdAt: res.data.created_at,
        };

        setMessages((prev) => [...prev, aiMsg]);
        loadRecentDoubts();
      } catch (err) {
        const detail = err.response?.data?.detail || "Failed to get AI response";
        setAiError(detail);
        setMessages((prev) => [
          ...prev,
          {
            id: `err-${Date.now()}`,
            role: "ai",
            text: "Failed to get response. Please check your connection and try again.",
            createdAt: new Date().toISOString(),
          },
        ]);
      } finally {
        setLoading(false);
      }
    },
    [conversationId, loading, currentPage, loadRecentDoubts]
  );

  // ── Add Note ──
  const addNote = useCallback(
    async (content, selText = null, sourcePage = null) => {
      if (!slug || !subject) return;
      try {
        await api.post("/notes", {
          module_slug: slug,
          subject,
          chapter_title: chapterTitle,
          content,
          selected_text: selText,
          source_page: sourcePage,
          grade: grade || 9,
        });
        loadNotes();
      } catch (err) {
        console.error("Failed to save note:", err);
      }
    },
    [slug, subject, chapterTitle, grade, loadNotes]
  );

  // ── Delete Note ──
  const deleteNote = useCallback(
    async (noteId) => {
      try {
        await api.delete(`/notes/${noteId}`);
        loadNotes();
      } catch (err) {
        console.error("Failed to delete note:", err);
      }
    },
    [loadNotes]
  );

  // ── Add Bookmark ──
  const addBookmark = useCallback(
    async (selText, pageNumber = null) => {
      if (!slug || !subject || !selText) return;
      try {
        await api.post("/bookmarks", {
          module_slug: slug,
          subject,
          chapter_title: chapterTitle,
          selected_text: selText,
          page_number: pageNumber,
          grade: grade || 9,
        });
        loadBookmarks();
      } catch (err) {
        console.error("Failed to save bookmark:", err);
      }
    },
    [slug, subject, chapterTitle, grade, loadBookmarks]
  );

  // ── Delete Bookmark ──
  const deleteBookmark = useCallback(
    async (bookmarkId) => {
      try {
        await api.delete(`/bookmarks/${bookmarkId}`);
        loadBookmarks();
      } catch (err) {
        console.error("Failed to delete bookmark:", err);
      }
    },
    [loadBookmarks]
  );

  return (
    <StudyWorkspaceContext.Provider
      value={{
        // Context info
        subject,
        slug,
        chapterTitle,
        grade,

        // PDF
        currentPage,
        setCurrentPage,
        totalPages,
        setTotalPages,

        // Selection
        selectedText,
        setSelectedText,
        selectionRect,
        setSelectionRect,

        // AI
        conversationId,
        messages,
        sendMessage,
        loading,
        aiError,
        setAiError,

        // Notes & Bookmarks
        notes,
        addNote,
        deleteNote,
        bookmarks,
        addBookmark,
        deleteBookmark,

        // Recent
        recentDoubts,

        // Panels
        sidebarOpen,
        setSidebarOpen,
        aiPanelOpen,
        setAiPanelOpen,
      }}
    >
      {children}
    </StudyWorkspaceContext.Provider>
  );
}

export const useStudyWorkspace = () => {
  const ctx = useContext(StudyWorkspaceContext);
  if (!ctx) throw new Error("useStudyWorkspace must be used within StudyWorkspaceProvider");
  return ctx;
};
