import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import api from "../api/client";
import ErrorNotice from "../components/ErrorNotice.jsx";

const class9MathModules = [
  { title: "Number System and Operations", slug: "nsao" },
  { title: "Quadrilaterals", slug: "quadrilaterals" },
  { title: "Statistics", slug: "statistics" },
  { title: "Trigonometry", slug: "trigonometry" },
  { title: "Square and Square Roots", slug: "square-and-square-roots" },
  { title: "Cube and Cube Roots", slug: "cube-and-cube-roots" },
  { title: "Comparing Quantities", slug: "comparing-quantities" },
  { title: "Algebraic Expressions Identities", slug: "algebraic-expression-identities" },
  { title: "Solid Shapes", slug: "solid-shapes" },
  { title: "Mensuration", slug: "mensuration" },
  { title: "Exponents", slug: "exponents" },
  { title: "Direct Inverse Proportional", slug: "direct-inverse-proportional" },
  { title: "Factorization", slug: "factorization" },
  { title: "Rational Numbers", slug: "rational-numbers" },
  { title: "Linear Equations in one Variable", slug: "linear-equations-in-one-variable" },
  { title: "Percentage Profit and Loss", slug: "percentage-profit-and-loss" },
  { title: "Algebra", slug: "algebra" },
  { title: "Geometry", slug: "geometry" },
];

export default function ChaptersPage() {
  const [chapters, setChapters] = useState([]);
  const [filters, setFilters] = useState({ grade: 6, subject: "maths" });
  const [error, setError] = useState("");
  const isClass9Maths = Number(filters.grade) === 9 && filters.subject === "maths";

  useEffect(() => {
    if (isClass9Maths) {
      setChapters([]);
      return;
    }
    setError("");
    api.get("/learning/chapters", { params: filters })
      .then((r) => setChapters(r.data))
      .catch((err) => setError(err.response?.data?.detail || "Could not load chapters."));
  }, [filters, isClass9Maths]);

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
          <option value="maths">maths</option>
          <option value="science">science</option>
        </select>
      </div>

      {isClass9Maths ? (
        <div className="grid gap-4 md:grid-cols-2">
          {class9MathModules.map((module, index) => {
            const pdfUrl = `${api.defaults.baseURL}/learning/class-9-maths/pdf/${module.slug}`;
            return (
              <a
                key={module.slug}
                href={pdfUrl}
                target="_blank"
                rel="noreferrer"
                className="card block text-left transition duration-150 hover:-translate-y-1 hover:shadow-lg"
              >
                <p className="text-sm text-mint">Module {index + 1}</p>
                <h2 className="mt-2 text-lg font-bold">{module.title}</h2>
              </a>
            );
          })}
        </div>
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
