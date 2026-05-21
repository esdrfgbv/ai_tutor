import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { BookOpen, MessageSquare, BarChart3 } from "lucide-react";
import api from "../api/client";
import ErrorNotice from "../components/ErrorNotice.jsx";

export default function ChapterDetailPage() {
  const { chapterId } = useParams();
  const navigate = useNavigate();
  const [chapter, setChapter] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!chapterId) return;
    setError("");
    api.get(`/learning/chapters/${chapterId}`)
      .then((r) => setChapter(r.data))
      .catch((err) => {
        setError(err.response?.data?.detail || "Could not load chapter.");
      });
  }, [chapterId]);

  if (error) {
    return (
      <div className="space-y-4">
        <ErrorNotice message={error} />
        <button className="btn-primary" onClick={() => navigate(-1)}>Go back</button>
      </div>
    );
  }

  if (!chapter) {
    return <div className="card">Loading chapter...</div>;
  }

  return (
    <div className="space-y-6">
      <button className="btn-soft" onClick={() => navigate(-1)}>
        Back to chapters
      </button>
      <div className="card">
        <p className="text-sm text-mint font-semibold">Chapter {chapter.chapter_number}</p>
        <h1 className="mt-2 text-4xl font-bold">{chapter.title}</h1>
        <p className="mt-4 text-sm text-black/70 dark:text-white/70">{chapter.description}</p>
      </div>
      <div className="grid gap-4 md:grid-cols-3">
        <button
          onClick={() => navigate(`/doubts?chapter=${encodeURIComponent(chapter.title)}&subject=${chapter.subject}`)}
          className="card p-4 hover:border-mint hover:bg-mint/5 transition"
        >
          <MessageSquare size={24} className="text-mint mb-2" />
          <h3 className="font-bold">Ask AI Doubts</h3>
          <p className="text-sm text-black/60 dark:text-white/60 mt-1">Get instant answers about topics in this chapter</p>
        </button>
        <button
          onClick={() => navigate(`/quiz?chapter=${chapter.id}&subject=${chapter.subject}`)}
          className="card p-4 hover:border-coral hover:bg-coral/5 transition"
        >
          <BarChart3 size={24} className="text-coral mb-2" />
          <h3 className="font-bold">Take Quiz</h3>
          <p className="text-sm text-black/60 dark:text-white/60 mt-1">Test your understanding with adaptive questions</p>
        </button>
        <button
          onClick={() => navigate("/chapters")}
          className="card p-4 hover:border-gold hover:bg-gold/5 transition"
        >
          <BookOpen size={24} className="text-gold mb-2" />
          <h3 className="font-bold">Next Chapter</h3>
          <p className="text-sm text-black/60 dark:text-white/60 mt-1">Move on to the next topic</p>
        </button>
      </div>
      <div className="card">
        <h2 className="text-xl font-semibold mb-3">Study Tips</h2>
        <ul className="space-y-2 text-sm text-black/70 dark:text-white/70">
          <li>✓ Read through the chapter content carefully</li>
          <li>✓ Use AI Doubts to clarify any concepts you don't understand</li>
          <li>✓ Practice with the adaptive quiz to test your knowledge</li>
          <li>✓ Review any weak topics before moving to the next chapter</li>
        </ul>
      </div>
    </div>
  );
}
