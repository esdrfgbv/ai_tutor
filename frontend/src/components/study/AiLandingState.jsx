import { motion } from "framer-motion";
import {
  Brain, StickyNote, Calculator, AlertTriangle, HelpCircle,
} from "lucide-react";
import AIOrb from "../AIOrb.jsx";
import { useStudyWorkspace } from "../../context/StudyWorkspaceContext";

const QUICK_ACTIONS = [
  { id: "explain", label: "Explain Selected Text", icon: Brain, prompt: "Explain the key concepts from this chapter" },
  { id: "notes", label: "Generate Notes", icon: StickyNote, prompt: "Generate comprehensive study notes for this chapter" },
  { id: "formulas", label: "Key Formulas", icon: Calculator, prompt: "List all important formulas and key points in this chapter" },
  { id: "mistakes", label: "Common Mistakes", icon: AlertTriangle, prompt: "What are the most common mistakes students make in this chapter?" },
  { id: "practice", label: "Practice Questions", icon: HelpCircle, prompt: "Create 5 practice questions for this chapter" },
];

export default function AiLandingState() {
  const { sendMessage, chapterTitle, subject } = useStudyWorkspace();

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="atp-landing"
    >
      <div className="atp-landing-orb">
        <AIOrb size={64} />
      </div>

      <h3 className="atp-landing-title">🤖 Your AI Tutor is Ready</h3>
      <p className="atp-landing-desc">
        Ask any doubt about{" "}
        <span className="atp-landing-chapter">
          {chapterTitle || subject || "this chapter"}
        </span>{" "}
        and get instant explanations based on your study material.
      </p>

      <div className="atp-landing-actions">
        {QUICK_ACTIONS.map((action, i) => (
          <motion.button
            key={action.id}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 + i * 0.05 }}
            onClick={() => sendMessage(action.prompt, { action: action.id })}
            className="atp-landing-btn"
          >
            <action.icon size={14} className="atp-landing-btn-icon" />
            <span>{action.label}</span>
          </motion.button>
        ))}
      </div>
    </motion.div>
  );
}
