import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import api from "../api/client";
import ErrorNotice from "../components/ErrorNotice.jsx";
import { modulesMap } from "../utils/modules";

export default function ChaptersPage() {
  const [chapters, setChapters] = useState([]);
  const [filters, setFilters] = useState({ grade: 6, subject: "maths" });
  const [error, setError] = useState("");
  const isClass9 = Number(filters.grade) === 9;
  const currentModules = isClass9 ? modulesMap[filters.subject] || [] : [];

  useEffect(() => {
    if (isClass9) {
      setChapters([]);
      return;
    }
    setError("");
    api.get("/learning/chapters", { params: filters })
      .then((r) => setChapters(r.data))
      .catch((err) => setError(err.response?.data?.detail || "Could not load chapters."));
  }, [filters, isClass9]);

  return (
    <div className="space-y-4">
      <ErrorNotice message={error} />
      <div className="flex flex-wrap gap-3">
        <select
          className="input max-w-40"
          value={filters.grade}
          onChange={(e) => setFilters({ ...filters, grade: Number(e.target.value) })}
        >
          {[4, 5, 6, 7, 8, 9].map((g) => (
            <option key={g} value={g}>{g}</option>
          ))}
        </select>
        <select
          className="input max-w-48"
          value={filters.subject}
          onChange={(e) => setFilters({ ...filters, subject: e.target.value })}
        >
          <option value="maths">Maths</option>
          <option value="science">Science</option>
          <option value="english">English</option>
        </select>
      </div>

      {isClass9 ? (
        currentModules.length > 0 ? (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {currentModules.map((module, index) => (
              <Link
                key={module.slug}
                to={`/viewer/${filters.subject}/${module.slug}`}
                className="card block text-left transition duration-200 hover:-translate-y-1 hover:shadow-lg border border-black/10 dark:border-white/10 hover:border-mint/50 dark:hover:border-mint/50 relative overflow-hidden group"
              >
                <div className="absolute top-0 right-0 h-16 w-16 bg-mint/10 rounded-bl-full flex items-center justify-center transition-transform duration-200 group-hover:scale-110">
                  <span className="text-[11px] font-bold text-mint uppercase tracking-wider pl-4 pb-4">PDF</span>
                </div>
                <div className="space-y-2 pr-12">
                  <p className="text-xs font-semibold uppercase tracking-wide text-mint">
                    Module {index + 1}
                  </p>
                  <h2 className="text-lg font-bold text-ink dark:text-white group-hover:text-mint transition-colors">
                    {module.title}
                  </h2>
                  <p className="text-xs text-black/60 dark:text-white/60">
                    Interactive PDF study module for Class 9 {filters.subject.charAt(0).toUpperCase() + filters.subject.slice(1)}.
                  </p>
                </div>
              </Link>
            ))}
          </div>
        ) : (
          <div className="card text-center py-12 text-black/60 dark:text-white/60">
            No study modules available for Class 9 {filters.subject}.
          </div>
        )
      ) : (
        <div className="grid gap-4 md:grid-cols-3">
          {chapters.map((chapter) => (
            <Link key={chapter.id} to={`/chapters/${chapter.id}`} className="card block transition duration-150 hover:-translate-y-1 hover:shadow-lg">
              <p className="text-sm text-mint">Chapter {chapter.chapter_number}</p>
              <h2 className="mt-2 text-lg font-bold">{chapter.title}</h2>
              <p className="mt-2 text-sm text-black/60 dark:text-white/60">{chapter.description}</p>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
