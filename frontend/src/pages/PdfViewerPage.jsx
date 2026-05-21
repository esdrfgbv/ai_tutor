import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { ArrowLeft, ClipboardList, ExternalLink, BookOpen, AlertCircle, Brain } from "lucide-react";
import api from "../api/client";
import { useStudySession } from "../context/StudySessionContext.jsx";
import { modulesMap } from "../utils/modules";

function getModuleTitle(subject, slug) {
  const list = modulesMap[subject] || [];
  const module = list.find((m) => m.slug === slug);
  if (module) return module.title;

  return slug
    .split("-")
    .map((word) => {
      if (word.toLowerCase() === "nsao") return "Number System and Operations";
      return word.charAt(0).toUpperCase() + word.slice(1);
    })
    .join(" ");
}

export default function PdfViewerPage() {
  const { subject, slug } = useParams();
  const { startSession, endSession } = useStudySession();

  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    startSession("pdf_reading", subject || "maths", slug);
    return () => endSession();
  }, [subject, slug]);

  const pdfUrl = `${api.defaults.baseURL}/learning/class-9/${subject}/pdf/${slug}`;
  const title = getModuleTitle(subject, slug);

  return (
    <div className="min-h-screen bg-[#f8fbf9] dark:bg-[#111816] flex flex-col">
      {/* HEADER */}
      <div className="glass sticky top-[64px] z-10 flex items-center justify-between border-b border-black/10 px-4 py-3 dark:border-white/10 rounded-xl mb-4 shadow-sm">
        <div className="flex items-center gap-3">
          <Link
            to="/chapters"
            className="btn-soft flex items-center gap-2"
          >
            <ArrowLeft size={16} />
            Back
          </Link>

          <div>
            <p className="text-xs font-bold uppercase tracking-wider text-mint flex items-center gap-1">
              <BookOpen size={12} />
              Class 9 • {subject?.charAt(0).toUpperCase() + subject?.slice(1)}
            </p>

            <h1 className="text-base md:text-lg font-black text-ink dark:text-white">
              {title}
            </h1>
          </div>
        </div>

        <div className="flex gap-2">
          <a
            href={pdfUrl}
            target="_blank"
            rel="noreferrer"
            className="btn-soft flex items-center gap-2"
          >
            <ExternalLink size={16} />
            Open in New Tab
          </a>

          <Link
            to={`/doubts?subject=${subject}&slug=${slug}&chapter=${encodeURIComponent(title)}`}
            className="btn-soft flex items-center gap-2"
          >
            <Brain size={16} className="text-mint animate-pulse" />
            Ask AI Doubt
          </Link>

          <Link
            to={`/quiz?mode=module&chapter=${slug}&subject=${subject}`}
            className="btn-primary flex items-center gap-2"
          >
            <ClipboardList size={16} />
            Quiz
          </Link>
        </div>
      </div>

      {/* PDF VIEWER CONTAINER */}
      <div className="flex-1 relative min-h-[600px] rounded-xl overflow-hidden border border-black/10 dark:border-white/10 bg-white dark:bg-black/20 shadow-soft">
        {isLoading && !error && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-white/90 dark:bg-[#111816]/90 z-20 transition-all duration-300">
            <div className="w-12 h-12 border-4 border-mint border-t-transparent rounded-full animate-spin mb-4"></div>
            <p className="text-sm font-bold text-mint animate-pulse uppercase tracking-widest">
              Loading PDF Module
            </p>
            <p className="text-xs text-black/50 dark:text-white/50 mt-1">
              Fetching dynamic document stream...
            </p>
          </div>
        )}

        {error ? (
          <div className="absolute inset-0 flex flex-col items-center justify-center p-6 text-center bg-white dark:bg-[#111816]">
            <AlertCircle size={48} className="text-coral mb-4" />
            <h3 className="text-lg font-bold mb-2">Failed to load study module</h3>
            <p className="text-sm text-black/60 dark:text-white/60 max-w-md mb-4">{error}</p>
            <Link to="/chapters" className="btn-primary">
              Return to Chapters
            </Link>
          </div>
        ) : (
          <iframe
            src={pdfUrl}
            className="w-full h-[calc(100vh-220px)] border-0"
            title={title}
            onLoad={() => setIsLoading(false)}
            onError={() => {
              setError("Failed to load PDF. Please make sure the file exists on the server.");
              setIsLoading(false);
            }}
          />
        )}
      </div>
    </div>
  );
}