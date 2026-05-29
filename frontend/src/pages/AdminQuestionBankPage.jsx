import React, { useState } from "react";
import { Plus, Wand2 } from "lucide-react";
import QuestionBankBrowser from "../components/QuestionBankBrowser";
import RandomTestModal from "../components/RandomTestModal";

export default function AdminQuestionBankPage() {
  const [selectedQuestions, setSelectedQuestions] = useState(new Set());
  const [isRandomModalOpen, setIsRandomModalOpen] = useState(false);

  return (
    <div className="flex flex-col bg-black text-white p-4 overflow-hidden -mx-4 -my-6" style={{ height: "calc(100vh - 57px)" }}>
      <div className="flex items-center justify-between mb-4 flex-shrink-0">
        <div>
          <h1 className="text-3xl font-display font-black">Question Bank</h1>
          <p className="text-neutral-400 mt-1">Manage and filter questions extracted from PDFs</p>
        </div>
        <div className="flex items-center gap-3">
          <button 
            onClick={() => setIsRandomModalOpen(true)}
            className="flex items-center gap-2 bg-neutral-800 text-white border border-white/10 px-4 py-2 rounded-xl text-sm font-bold hover:bg-neutral-700 transition-colors"
          >
            <Wand2 size={16} /> Auto-Generate Test
          </button>
        </div>
      </div>

      {/* Main Browser Area */}
      <div className="flex-1 min-h-0 overflow-hidden">
        <QuestionBankBrowser 
          hideSelection={true}
          onSelectionChange={setSelectedQuestions}
          actionComponent={
            <button className="bg-[#adff44] text-black px-4 py-2 rounded-xl text-sm font-bold flex items-center gap-2 shadow-[0_0_20px_rgba(173,255,68,0.2)] hover:scale-105 transition-transform">
              <Plus size={16} /> Create Mock Test
            </button>
          }
        />
      </div>

      {isRandomModalOpen && (
        <RandomTestModal onClose={() => setIsRandomModalOpen(false)} />
      )}
    </div>
  );
}
