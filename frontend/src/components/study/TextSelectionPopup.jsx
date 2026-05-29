import { useEffect, useRef, useState } from "react";
import { Brain, Lightbulb, StickyNote, Bookmark } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useStudyWorkspace } from "../../context/StudyWorkspaceContext";

const ACTIONS = [
  { id: "ask_ai", icon: Brain, label: "Ask AI", color: "#adff44" },
  { id: "explain_simply", icon: Lightbulb, label: "Explain Simply", color: "#60a5fa" },
  { id: "generate_notes", icon: StickyNote, label: "Generate Notes", color: "#f59e0b" },
  { id: "bookmark", icon: Bookmark, label: "Bookmark", color: "#f472b6" },
];

export default function TextSelectionPopup() {
  const {
    selectedText, selectionRect, setSelectedText, setSelectionRect,
    sendMessage, addBookmark, currentPage, setAiPanelOpen,
  } = useStudyWorkspace();

  const popupRef = useRef(null);
  const [position, setPosition] = useState({ top: 0, left: 0 });
  const [visible, setVisible] = useState(false);

  // Position the popup near the selection
  useEffect(() => {
    if (selectedText && selectionRect) {
      const scrollY = window.scrollY || document.documentElement.scrollTop;
      const scrollX = window.scrollX || document.documentElement.scrollLeft;

      let top = selectionRect.top + scrollY - 50;
      let left = selectionRect.left + scrollX + selectionRect.width / 2;

      // Keep popup within viewport
      const vpWidth = window.innerWidth;
      const popupWidth = 360;
      if (left - popupWidth / 2 < 10) left = popupWidth / 2 + 10;
      if (left + popupWidth / 2 > vpWidth - 10) left = vpWidth - popupWidth / 2 - 10;
      if (top < scrollY + 60) top = selectionRect.bottom + scrollY + 10;

      setPosition({ top, left });
      setVisible(true);
    } else {
      setVisible(false);
    }
  }, [selectedText, selectionRect]);

  const handleAction = (actionId) => {
    if (!selectedText) return;

    if (actionId === "bookmark") {
      addBookmark(selectedText, currentPage);
    } else {
      setAiPanelOpen(true);

      let question = selectedText;
      if (actionId === "explain_simply") {
        question = `Explain this in simple language with examples: "${selectedText}"`;
      } else if (actionId === "generate_notes") {
        question = `Generate concise study notes for: "${selectedText}"`;
      } else {
        question = `Explain this concept: "${selectedText}"`;
      }

      sendMessage(question, {
        selectedText,
        action: actionId,
        currentPage,
      });
    }

    // Clear selection
    window.getSelection()?.removeAllRanges();
    setSelectedText("");
    setSelectionRect(null);
  };

  return (
    <AnimatePresence>
      {visible && selectedText && (
        <motion.div
          ref={popupRef}
          initial={{ opacity: 0, scale: 0.9, y: 5 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.9, y: 5 }}
          transition={{ duration: 0.08, ease: "easeOut" }}
          className="text-selection-popup"
          style={{
            position: "fixed",
            top: position.top - (window.scrollY || 0),
            left: position.left,
            transform: "translateX(-50%)",
            zIndex: 9999,
          }}
        >
          <div className="tsp-actions">
            {ACTIONS.map((action) => (
              <button
                key={action.id}
                onClick={() => handleAction(action.id)}
                className="tsp-action-btn"
                title={action.label}
              >
                <action.icon size={14} style={{ color: action.color }} />
                <span>{action.label}</span>
              </button>
            ))}
          </div>
          {selectedText.length > 60 && (
            <div className="tsp-preview">
              "{selectedText.slice(0, 60)}..."
            </div>
          )}
        </motion.div>
      )}
    </AnimatePresence>
  );
}
