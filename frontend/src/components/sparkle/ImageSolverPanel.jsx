// ImageSolverPanel.jsx - AI Image Analysis using Groq Llama 4 Scout Vision
import { useState, useRef } from "react";
import { Upload, Loader2, AlertCircle, CheckCircle2, RefreshCw, Sparkles, X } from "lucide-react";
import { analyzeImage } from "../../lib/groq.js";

function renderInline(text) {
  const parts = text.split(/(\*\*[^*]+\*\*)/g);
  return parts.map((part, i) => {
    if (part.startsWith("**") && part.endsWith("**")) {
      return <span key={i} className="text-white font-semibold">{part.slice(2, -2)}</span>;
    }
    return part;
  });
}

function compressImage(dataUrl, maxW = 1600) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement("canvas");
      let { width, height } = img;
      if (width > maxW || height > maxW) {
        const scale = maxW / Math.max(width, height);
        width = Math.round(width * scale);
        height = Math.round(height * scale);
      }
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext("2d");
      ctx.fillStyle = "white";
      ctx.fillRect(0, 0, width, height);
      ctx.drawImage(img, 0, 0, width, height);
      let quality = 0.85;
      let result = canvas.toDataURL("image/jpeg", quality);
      while (result.length > 3.5 * 1024 * 1024 && quality > 0.3) {
        quality -= 0.1;
        result = canvas.toDataURL("image/jpeg", quality);
      }
      resolve(result);
    };
    img.onerror = () => reject(new Error("Failed to load image"));
    img.src = dataUrl;
  });
}

function ResultRenderer({ result, onRegenerate }) {
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4" style={{ color: "#ADFF44" }} />
          <span className="text-xs font-medium text-white/70">AI Analysis</span>
        </div>
        <button
          onClick={onRegenerate}
          className="flex items-center gap-1 text-xs text-white/30 hover:text-white/60 transition-all"
        >
          <RefreshCw className="w-3 h-3" /> Re-analyze
        </button>
      </div>

      <div
        className="p-5 rounded-2xl text-sm text-white/70 leading-relaxed space-y-1"
        style={{ background: "rgba(173,255,68,0.04)", border: "1px solid rgba(173,255,68,0.12)" }}
      >
        {result.split("\n").map((line, i) => {
          const trimmed = line.trim();
          if (!trimmed) return null;

          // Section heading **text**
          if (trimmed.startsWith("**") && trimmed.endsWith("**") && !trimmed.includes(":**")) {
            return (
              <p key={i} className="font-semibold text-base mt-4 mb-2 first:mt-0" style={{ color: "#fff" }}>
                {trimmed.slice(2, -2)}
              </p>
            );
          }

          // Label heading **Label:** content
          const labelMatch = trimmed.match(/^\*\*(.+?):\*\*\s*(.*)/);
          if (labelMatch) {
            return (
              <div key={i} className="flex items-start gap-2 mt-3 mb-1">
                <span className="font-semibold shrink-0" style={{ color: "#ADFF44" }}>{labelMatch[1]}:</span>
                <span className="text-white/80">{renderInline(labelMatch[2])}</span>
              </div>
            );
          }

          // Final Answer line
          if (trimmed.startsWith("**Final Answer")) {
            const valMatch = trimmed.match(/\*\*Final Answer:\*\*\s*\*\*(.+?)\*\*/);
            if (valMatch) {
              return (
                <div key={i} className="flex items-center gap-3 mt-4 p-3 rounded-xl" style={{ background: "rgba(173,255,68,0.1)", border: "1px solid rgba(173,255,68,0.2)" }}>
                  <span className="text-xs uppercase tracking-wider text-white/40">Answer</span>
                  <span className="text-lg font-bold" style={{ color: "#ADFF44" }}>{valMatch[1]}</span>
                </div>
              );
            }
          }

          // Quick Tip
          if (trimmed.includes("Quick Tip")) {
            const tip = trimmed.replace(/^\*\*/, "").replace(/\*\*$/, "").replace("💡 Quick Tip:", "").trim();
            return (
              <div key={i} className="mt-4 p-3 rounded-xl" style={{ background: "rgba(234,179,8,0.08)", border: "1px solid rgba(234,179,8,0.15)" }}>
                <p className="text-xs uppercase tracking-wider text-yellow-400/60 mb-1">Quick Tip</p>
                <p className="text-sm text-yellow-200/80">{tip}</p>
              </div>
            );
          }

          // Bullet
          if (trimmed.startsWith("- ")) {
            return (
              <p key={i} className="ml-4 flex items-start gap-2 mb-1">
                <span className="mt-1" style={{ color: "rgba(173,255,68,0.6)" }}>•</span>
                {renderInline(trimmed.slice(2))}
              </p>
            );
          }

          // Step
          const stepMatch = trimmed.match(/^(Step\s+\d+):\s*(.*)/i);
          if (stepMatch) {
            return (
              <div key={i} className="flex items-start gap-3 ml-2 mb-2 mt-2">
                <span
                  className="shrink-0 w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold"
                  style={{ background: "rgba(173,255,68,0.15)", border: "1px solid rgba(173,255,68,0.2)", color: "#ADFF44" }}
                >
                  {stepMatch[1].replace("Step ", "")}
                </span>
                <span className="text-white/70 mt-0.5">{renderInline(stepMatch[2])}</span>
              </div>
            );
          }

          // Separator
          if (trimmed === "---") return <hr key={i} className="my-4" style={{ borderColor: "rgba(255,255,255,0.05)" }} />;

          return <p key={i} className="text-white/70 mb-1.5">{renderInline(trimmed)}</p>;
        })}
      </div>

      <div className="flex items-center gap-2 p-2 rounded-xl text-xs text-white/20" style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.05)" }}>
        <Sparkles className="w-3 h-3" style={{ color: "#ADFF44" }} />
        Groq Llama 4 Scout Vision · JNV/SSS aligned
      </div>
    </div>
  );
}

export function ImageSolverPanel() {
  const [image, setImage] = useState(null);
  const [fileName, setFileName] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);
  const inputRef = useRef(null);

  const handleImage = async (file) => {
    if (file.size > 20 * 1024 * 1024) {
      setError("Image too large. Max 20MB.");
      return;
    }
    setFileName(file.name);
    setError(null);
    setResult(null);
    const reader = new FileReader();
    reader.onload = async (e) => {
      const raw = e.target.result;
      try {
        const compressed = await compressImage(raw);
        setImage(compressed);
      } catch {
        setImage(raw);
      }
    };
    reader.readAsDataURL(file);
  };

  const analyze = async () => {
    if (!image) return;
    setLoading(true);
    setError(null);
    setResult(null);
    try {
      const answer = await analyzeImage(image);
      setResult(answer);
    } catch (e) {
      const msg = e.message;
      if (msg.includes("does not support image") || msg.includes("Cannot read")) {
        setError("This AI model can't process this image. Try a clearer photo with good lighting.");
      } else if (msg.includes("413") || msg.includes("too large") || msg.includes("size")) {
        setError("Image is too large. Try a smaller or more compressed photo (under 4MB).");
      } else if (msg.includes("rate") || msg.includes("429")) {
        setError("Too many requests. Please wait a moment and try again.");
      } else {
        setError(msg);
      }
    } finally {
      setLoading(false);
    }
  };

  const reset = () => {
    setImage(null);
    setResult(null);
    setError(null);
    setLoading(false);
    setFileName("");
  };

  return (
    <div className="space-y-4">
      {/* Upload area */}
      {!image && (
        <div
          onClick={() => inputRef.current?.click()}
          onDragOver={(e) => e.preventDefault()}
          onDrop={(e) => {
            e.preventDefault();
            const file = e.dataTransfer.files[0];
            if (file) handleImage(file);
          }}
          className="border-2 border-dashed rounded-2xl p-10 text-center cursor-pointer transition-all group"
          style={{
            borderColor: "rgba(173,255,68,0.2)",
            background: "rgba(173,255,68,0.02)",
          }}
          onMouseEnter={(e) => { e.currentTarget.style.borderColor = "rgba(173,255,68,0.4)"; }}
          onMouseLeave={(e) => { e.currentTarget.style.borderColor = "rgba(173,255,68,0.2)"; }}
        >
          <input
            ref={inputRef}
            type="file"
            accept="image/jpeg,image/jpg,image/png,image/webp"
            className="hidden"
            onChange={(e) => e.target.files?.[0] && handleImage(e.target.files[0])}
          />
          <div
            className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4"
            style={{ background: "rgba(173,255,68,0.08)" }}
          >
            <Upload className="w-7 h-7" style={{ color: "rgba(173,255,68,0.6)" }} />
          </div>
          <p className="text-sm text-white/50 mb-1">Drop image or click to upload</p>
          <p className="text-xs text-white/20">Question · Pattern · Diagram · Notes · PNG · JPG · WEBP</p>
          <div className="flex flex-wrap gap-2 justify-center mt-4">
            {["Pattern Completion", "Odd One Out", "Math Grid", "Word Problem", "Diagram", "Formula"].map((tag) => (
              <span
                key={tag}
                className="text-xs px-2 py-1 rounded-full"
                style={{ background: "rgba(255,255,255,0.04)", color: "rgba(255,255,255,0.25)", border: "1px solid rgba(255,255,255,0.06)" }}
              >
                {tag}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Error */}
      {error && (
        <div
          className="flex items-start gap-2 p-3 rounded-xl text-sm"
          style={{ background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.2)", color: "#fca5a5" }}
        >
          <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
          <span>{error}</span>
        </div>
      )}

      {/* Image preview */}
      {image && (
        <div className="space-y-3">
          <div className="relative rounded-2xl overflow-hidden" style={{ border: "1px solid rgba(255,255,255,0.08)" }}>
            <img src={image} alt="Uploaded" className="w-full object-contain max-h-64 bg-black/40" />
            <div className="absolute top-2 right-2 flex gap-1">
              <button
                onClick={reset}
                className="px-2 py-1 rounded-lg text-xs text-white/50 hover:text-white transition-all flex items-center gap-1"
                style={{ background: "rgba(0,0,0,0.7)" }}
              >
                <X className="w-3 h-3" /> Remove
              </button>
            </div>
            <div className="absolute bottom-2 left-2">
              <span
                className="px-2 py-0.5 rounded-lg text-xs font-mono text-white/50"
                style={{ background: "rgba(0,0,0,0.7)" }}
              >
                {fileName || "image"}
              </span>
            </div>
          </div>

          {!result && !loading && (
            <button
              onClick={analyze}
              className="w-full flex items-center justify-center gap-2 py-3 rounded-xl font-medium text-sm transition-all"
              style={{ background: "linear-gradient(135deg, #ADFF44, #8CD430)", color: "#000" }}
            >
              <Sparkles className="w-4 h-4" />
              Analyze with AI
            </button>
          )}

          {loading && (
            <div
              className="flex items-center justify-center gap-3 p-6 rounded-2xl"
              style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.05)" }}
            >
              <Loader2 className="w-5 h-5 animate-spin" style={{ color: "#ADFF44" }} />
              <div>
                <p className="text-sm text-white/60">AI is analyzing your image…</p>
                <p className="text-xs text-white/20">Reading text, shapes, patterns, and numbers</p>
              </div>
            </div>
          )}

          {result && <ResultRenderer result={result} onRegenerate={analyze} />}
        </div>
      )}
    </div>
  );
}
