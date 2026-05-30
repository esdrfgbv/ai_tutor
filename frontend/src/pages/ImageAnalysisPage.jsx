// ImageAnalysisPage.jsx - AI Image Analysis (Vision) page
import { Camera } from "lucide-react";
import { ImageSolverPanel } from "../components/sparkle/ImageSolverPanel.jsx";

export default function ImageAnalysisPage() {
  return (
    <div className="max-w-3xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-3">
          <div
            className="w-10 h-10 rounded-xl flex items-center justify-center"
            style={{ background: "rgba(173,255,68,0.1)", border: "1px solid rgba(173,255,68,0.15)" }}
          >
            <Camera className="w-5 h-5" style={{ color: "#ADFF44" }} />
          </div>
          <div>
            <h1 className="text-xl font-bold text-white/90">Image Analysis</h1>
            <p className="text-xs text-white/40">AI Vision · Groq Llama 4 Scout</p>
          </div>
          <div
            className="ml-auto flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs"
            style={{ background: "rgba(173,255,68,0.08)", border: "1px solid rgba(173,255,68,0.15)", color: "rgba(173,255,68,0.7)" }}
          >
            <span className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ background: "#ADFF44" }} />
            AI Vision Online
          </div>
        </div>
        <p className="text-sm text-white/40 ml-13">
          Upload any question, diagram, math problem, or pattern image. AI will read every detail and provide a step-by-step solution.
        </p>
      </div>

      {/* How it works */}
      <div className="grid grid-cols-3 gap-3 mb-6">
        {[
          { step: "1", icon: "📸", title: "Upload Image", desc: "Photo, screenshot, or scan" },
          { step: "2", icon: "🧠", title: "AI Analyzes", desc: "Reads text, shapes & patterns" },
          { step: "3", icon: "✅", title: "Get Solution", desc: "Step-by-step explanation" },
        ].map((s) => (
          <div key={s.step} className="p-3 rounded-xl text-center" style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.05)" }}>
            <div className="text-xl mb-1.5">{s.icon}</div>
            <p className="text-xs font-medium text-white/60">{s.title}</p>
            <p className="text-xs text-white/25 mt-0.5">{s.desc}</p>
          </div>
        ))}
      </div>

      {/* Main panel */}
      <div className="rounded-2xl p-6" style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.06)" }}>
        <ImageSolverPanel />
      </div>

      {/* Tips */}
      <div className="mt-4 p-4 rounded-xl" style={{ background: "rgba(173,255,68,0.04)", border: "1px solid rgba(173,255,68,0.08)" }}>
        <p className="text-xs font-medium text-white/40 mb-2">📌 Tips for best results</p>
        <ul className="space-y-1">
          {[
            "Ensure good lighting — avoid shadows over text",
            "Hold the camera steady for a clear, sharp photo",
            "Works best with printed questions, textbook pages, and handwritten notes",
            "Supports PNG, JPG, JPEG, and WebP formats",
          ].map((tip) => (
            <li key={tip} className="text-xs text-white/30 flex items-start gap-1.5">
              <span style={{ color: "rgba(173,255,68,0.5)" }}>•</span> {tip}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
