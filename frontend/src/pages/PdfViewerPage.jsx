import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import {
  ArrowLeft,
  ClipboardList,
  ExternalLink,
} from "lucide-react";

import { Document, Page, pdfjs } from "react-pdf";

import api from "../api/client";

import "react-pdf/dist/Page/AnnotationLayer.css";
import "react-pdf/dist/Page/TextLayer.css";

import { useStudySession } from "../context/StudySessionContext.jsx";

pdfjs.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjs.version}/pdf.worker.min.js`;

function slugToTitle(slug) {
  return slug
    .split("-")
    .map(
      (word) =>
        word.charAt(0).toUpperCase() +
        word.slice(1)
    )
    .join(" ");
}

export default function PdfViewerPage() {
  const { slug } = useParams();

  const { startSession, endSession } =
    useStudySession();

  const [numPages, setNumPages] =
    useState(null);

  const [error, setError] = useState("");

  useEffect(() => {
    startSession(
      "pdf_reading",
      "maths",
      slug
    );

    return () => endSession();
  }, [slug]);

  const pdfUrl = `${api.defaults.baseURL}/learning/class-9-maths/pdf/${slug}`;

  const title = slugToTitle(slug);

  function onDocumentLoadSuccess({
    numPages,
  }) {
    setNumPages(numPages);
  }

  return (
    <div className="min-h-screen bg-white dark:bg-zinc-950">
      {/* HEADER */}
      <div className="sticky top-0 z-10 flex items-center justify-between border-b border-black/10 bg-white px-4 py-3 dark:border-white/10 dark:bg-zinc-950">
        <div className="flex items-center gap-3">
          <Link
            to="/chapters"
            className="btn-soft flex items-center gap-2"
          >
            <ArrowLeft size={16} />
            Back
          </Link>

          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-mint">
              Class 9 Maths
            </p>

            <h1 className="text-lg font-black">
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
            Download
          </a>

          <Link
            to={`/quiz?mode=module&chapter=${slug}`}
            className="btn-primary flex items-center gap-2"
          >
            <ClipboardList size={16} />
            Quiz
          </Link>
        </div>
      </div>

      {/* PDF */}
      <div className="flex justify-center p-6">
        <Document
          file={pdfUrl}
          onLoadSuccess={
            onDocumentLoadSuccess
          }
          onLoadError={(err) => {
            console.error(err);

            setError(
              "Failed to load PDF."
            );
          }}
          loading={
            <p className="text-sm">
              Loading PDF...
            </p>
          }
        >
          {Array.from(
            new Array(numPages),
            (_, index) => (
              <div
                key={`page_${
                  index + 1
                }`}
                className="mb-6 shadow-lg"
              >
                <Page
                  pageNumber={index + 1}
                  width={900}
                />
              </div>
            )
          )}
        </Document>
      </div>

      {error && (
        <div className="p-4 text-center text-red-500">
          {error}
        </div>
      )}
    </div>
  );
}