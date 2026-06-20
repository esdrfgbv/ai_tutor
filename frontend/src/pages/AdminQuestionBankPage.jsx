import React from "react";
import QuestionBankBrowser from "../components/QuestionBankBrowser";

export default function AdminQuestionBankPage() {
  return (
    <div className="flex flex-col bg-black text-white p-4 overflow-hidden -mx-4 -my-6" style={{ height: "calc(100vh - 57px)" }}>
      <div className="flex items-center justify-between mb-4 flex-shrink-0">
        <div>
          <h1 className="text-3xl font-display font-black">Question Bank</h1>
          <p className="text-neutral-400 mt-1">Manage and filter questions extracted from PDFs</p>
        </div>
      </div>

      {/* Main Browser Area */}
      <div className="flex-1 min-h-0 overflow-hidden">
        <QuestionBankBrowser hideSelection={true} />
      </div>
    </div>
  );
}
