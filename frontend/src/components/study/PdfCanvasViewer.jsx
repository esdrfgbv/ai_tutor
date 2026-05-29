import { useState, useRef, useEffect, useCallback } from "react";
import { Document, Page, pdfjs } from "react-pdf";
import {
  ZoomIn, ZoomOut, ChevronLeft, ChevronRight,
  Download, Maximize2, Minimize2, Search, Loader2,
} from "lucide-react";
import { useStudyWorkspace } from "../../context/StudyWorkspaceContext";
import TextSelectionPopup from "./TextSelectionPopup";

import "react-pdf/dist/Page/TextLayer.css";
import "react-pdf/dist/Page/AnnotationLayer.css";

// Configure PDF.js worker
pdfjs.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;

export default function PdfCanvasViewer({ pdfUrl }) {
  const {
    currentPage, setCurrentPage, totalPages, setTotalPages,
    setSelectedText, setSelectionRect,
  } = useStudyWorkspace();

  const [scale, setScale] = useState(1.2);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [pageInput, setPageInput] = useState("1");
  const [pdfLoading, setPdfLoading] = useState(true);
  const [pdfError, setPdfError] = useState("");

  const containerRef = useRef(null);
  const scrollRef = useRef(null);

  // Handle document loaded
  const onDocumentLoadSuccess = useCallback(({ numPages }) => {
    setTotalPages(numPages);
    setPdfLoading(false);
    setPdfError("");
  }, [setTotalPages]);

  const onDocumentLoadError = useCallback((error) => {
    setPdfLoading(false);
    setPdfError("Failed to load PDF. Please try again.");
    console.error("PDF load error:", error);
  }, []);

  // Page navigation
  const goToPage = useCallback((page) => {
    const p = Math.max(1, Math.min(page, totalPages));
    setCurrentPage(p);
    setPageInput(String(p));
    // Scroll to page
    const pageEl = document.getElementById(`pdf-page-${p}`);
    if (pageEl) {
      pageEl.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }, [totalPages, setCurrentPage]);

  // Zoom controls
  const zoomIn = () => setScale((s) => Math.min(s + 0.2, 3));
  const zoomOut = () => setScale((s) => Math.max(s - 0.2, 0.5));

  // Fullscreen toggle
  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      containerRef.current?.requestFullscreen?.();
      setIsFullscreen(true);
    } else {
      document.exitFullscreen?.();
      setIsFullscreen(false);
    }
  };

  useEffect(() => {
    const handleFsChange = () => setIsFullscreen(!!document.fullscreenElement);
    document.addEventListener("fullscreenchange", handleFsChange);
    return () => document.removeEventListener("fullscreenchange", handleFsChange);
  }, []);

  // Track current page via scroll position
  useEffect(() => {
    const scrollEl = scrollRef.current;
    if (!scrollEl || !totalPages) return;

    const handleScroll = () => {
      const pages = scrollEl.querySelectorAll("[data-page-number]");
      let currentVisible = 1;
      const scrollTop = scrollEl.scrollTop;
      const scrollCenter = scrollTop + scrollEl.clientHeight / 3;

      pages.forEach((page) => {
        if (page.offsetTop <= scrollCenter) {
          currentVisible = parseInt(page.dataset.pageNumber, 10);
        }
      });

      if (currentVisible !== currentPage) {
        setCurrentPage(currentVisible);
        setPageInput(String(currentVisible));
      }
    };

    scrollEl.addEventListener("scroll", handleScroll, { passive: true });
    return () => scrollEl.removeEventListener("scroll", handleScroll);
  }, [totalPages, currentPage, setCurrentPage]);

  // Handle text selection
  useEffect(() => {
    const handleMouseUp = () => {
      const selection = window.getSelection();
      const text = selection?.toString?.()?.trim();

      if (text && text.length > 2) {
        setSelectedText(text);
        try {
          const range = selection.getRangeAt(0);
          const rect = range.getBoundingClientRect();
          setSelectionRect({
            top: rect.top,
            left: rect.left,
            width: rect.width,
            height: rect.height,
            bottom: rect.bottom,
            right: rect.right,
          });
        } catch {
          setSelectionRect(null);
        }
      } else {
        setSelectedText("");
        setSelectionRect(null);
      }
    };

    const handleSelectionChange = () => {
      const selection = window.getSelection();
      const text = selection?.toString?.()?.trim();
      if (!text) {
        setSelectedText("");
        setSelectionRect(null);
      }
    };

    document.addEventListener("mouseup", handleMouseUp);
    document.addEventListener("selectionchange", handleSelectionChange);
    return () => {
      document.removeEventListener("mouseup", handleMouseUp);
      document.removeEventListener("selectionchange", handleSelectionChange);
    };
  }, [setSelectedText, setSelectionRect]);

  // Render pages: only render visible pages ± buffer for performance
  const [visibleRange, setVisibleRange] = useState({ start: 1, end: 5 });
  useEffect(() => {
    const buffer = 2;
    setVisibleRange({
      start: Math.max(1, currentPage - buffer),
      end: Math.min(totalPages || 1, currentPage + buffer + 2),
    });
  }, [currentPage, totalPages]);

  return (
    <div ref={containerRef} className="pdf-viewer-container">
      {/* ── Toolbar ── */}
      <div className="pdf-toolbar">
        <div className="pdf-toolbar-group">
          <button onClick={zoomOut} className="pdf-toolbar-btn" title="Zoom Out">
            <ZoomOut size={15} />
          </button>
          <span className="pdf-toolbar-label">{Math.round(scale * 100)}%</span>
          <button onClick={zoomIn} className="pdf-toolbar-btn" title="Zoom In">
            <ZoomIn size={15} />
          </button>
        </div>

        <div className="pdf-toolbar-divider" />

        <div className="pdf-toolbar-group">
          <button
            onClick={() => goToPage(currentPage - 1)}
            disabled={currentPage <= 1}
            className="pdf-toolbar-btn"
            title="Previous Page"
          >
            <ChevronLeft size={15} />
          </button>
          <div className="pdf-toolbar-page-input">
            <input
              type="text"
              value={pageInput}
              onChange={(e) => setPageInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  const num = parseInt(pageInput, 10);
                  if (!isNaN(num)) goToPage(num);
                }
              }}
              onBlur={() => {
                const num = parseInt(pageInput, 10);
                if (!isNaN(num)) goToPage(num);
                else setPageInput(String(currentPage));
              }}
              className="pdf-page-input"
            />
            <span className="pdf-page-total">/ {totalPages || "—"}</span>
          </div>
          <button
            onClick={() => goToPage(currentPage + 1)}
            disabled={currentPage >= totalPages}
            className="pdf-toolbar-btn"
            title="Next Page"
          >
            <ChevronRight size={15} />
          </button>
        </div>

        <div className="pdf-toolbar-divider" />

        <div className="pdf-toolbar-group">
          <a
            href={pdfUrl}
            download
            className="pdf-toolbar-btn"
            title="Download PDF"
          >
            <Download size={15} />
          </a>
          <button onClick={toggleFullscreen} className="pdf-toolbar-btn" title="Fullscreen">
            {isFullscreen ? <Minimize2 size={15} /> : <Maximize2 size={15} />}
          </button>
        </div>
      </div>

      {/* ── PDF Document ── */}
      <div ref={scrollRef} className="pdf-scroll-area">
        {pdfLoading && (
          <div className="pdf-loading-overlay">
            <Loader2 size={32} className="animate-spin" style={{ color: "#adff44" }} />
            <p className="pdf-loading-text">Loading PDF Module...</p>
          </div>
        )}

        {pdfError && (
          <div className="pdf-error-state">
            <p>{pdfError}</p>
          </div>
        )}

        <Document
          file={pdfUrl}
          onLoadSuccess={onDocumentLoadSuccess}
          onLoadError={onDocumentLoadError}
          loading=""
          className="pdf-document"
        >
          {totalPages > 0 &&
            Array.from({ length: totalPages }, (_, i) => i + 1).map((pageNum) => {
              const inRange = pageNum >= visibleRange.start && pageNum <= visibleRange.end;
              return (
                <div
                  key={pageNum}
                  id={`pdf-page-${pageNum}`}
                  data-page-number={pageNum}
                  className="pdf-page-wrapper"
                >
                  {inRange ? (
                    <Page
                      pageNumber={pageNum}
                      scale={scale}
                      renderTextLayer={true}
                      renderAnnotationLayer={true}
                      className="pdf-page"
                      loading={
                        <div className="pdf-page-skeleton" style={{ height: 842 * scale, width: 595 * scale }} />
                      }
                    />
                  ) : (
                    <div
                      className="pdf-page-placeholder"
                      style={{ height: 842 * scale, width: 595 * scale }}
                    >
                      <span className="pdf-page-placeholder-text">Page {pageNum}</span>
                    </div>
                  )}
                  <div className="pdf-page-number">Page {pageNum}</div>
                </div>
              );
            })}
        </Document>
      </div>

      {/* Text selection popup */}
      <TextSelectionPopup />
    </div>
  );
}
