import React from "react";

export default function Markdown({ text }) {
  if (!text) return null;

  const parts = text.split(/(```[\s\S]*?```)/g);

  return (
    <div className="space-y-1.5 text-sm leading-relaxed" style={{ color: "#e0e0e0" }}>
      {parts.map((part, index) => {
        if (part.startsWith("```")) {
          const match = part.match(/^```(\w*)\n([\s\S]*?)```$/);
          const lang = match ? match[1] : "";
          const content = match ? match[2].trim() : part.replace(/^```|```$/g, "").trim();

          return (
            <pre
              key={index}
              className="my-3 overflow-x-auto"
              style={{
                background: "rgba(0,0,0,0.5)",
                border: "1px solid rgba(173,255,68,0.15)",
                borderRadius: 12,
                padding: "14px 16px",
              }}
            >
              {lang && (
                <div
                  className="text-[10px] uppercase font-bold tracking-widest mb-2 pb-2"
                  style={{
                    color: "#adff44",
                    borderBottom: "1px solid rgba(255,255,255,0.06)",
                    letterSpacing: "0.1em",
                  }}
                >
                  {lang}
                </div>
              )}
              <code className="block whitespace-pre font-mono text-xs" style={{ color: "#c5ff66" }}>
                {content}
              </code>
            </pre>
          );
        }

        const lines = part.split("\n");
        return lines.map((line, lineIdx) => {
          const trimmed = line.trim();
          const isBullet = trimmed.startsWith("- ") || trimmed.startsWith("* ");
          const isNumbered = /^\d+\.\s/.test(trimmed);
          const isHeading1 = trimmed.startsWith("# ");
          const isHeading2 = trimmed.startsWith("## ");
          const isHeading3 = trimmed.startsWith("### ");

          let displayLine = line;
          if (isBullet) {
            const bi = line.indexOf("-") !== -1 ? line.indexOf("-") : line.indexOf("*");
            displayLine = line.substring(bi + 2);
          } else if (isNumbered) {
            const m = line.match(/^\s*\d+\.\s/);
            if (m) displayLine = line.substring(m[0].length);
          } else if (isHeading1) {
            displayLine = trimmed.substring(2);
          } else if (isHeading2) {
            displayLine = trimmed.substring(3);
          } else if (isHeading3) {
            displayLine = trimmed.substring(4);
          }

          const formatInline = (str) => {
            const elements = [];
            let curr = str;
            let key = 0;
            while (curr.length > 0) {
              const boldMatch = curr.match(/(\*\*|__)(.*?)\1/);
              const codeMatch = curr.match(/`(.*?)`/);
              const italicMatch = curr.match(/(\*|_)(.*?)\1/);
              const matches = [
                boldMatch && { type: "bold", index: boldMatch.index, length: boldMatch[0].length, content: boldMatch[2] },
                codeMatch && { type: "code", index: codeMatch.index, length: codeMatch[0].length, content: codeMatch[1] },
                italicMatch && { type: "italic", index: italicMatch.index, length: italicMatch[0].length, content: italicMatch[2] },
              ].filter(Boolean);
              if (!matches.length) { elements.push(<span key={key++}>{curr}</span>); break; }
              matches.sort((a, b) => a.index - b.index);
              const first = matches[0];
              if (first.index > 0) elements.push(<span key={key++}>{curr.substring(0, first.index)}</span>);
              if (first.type === "bold") {
                elements.push(<strong key={key++} style={{ color: "#fff", fontWeight: 700 }}>{first.content}</strong>);
              } else if (first.type === "code") {
                elements.push(
                  <code key={key++} style={{
                    background: "rgba(173,255,68,0.1)",
                    border: "1px solid rgba(173,255,68,0.2)",
                    borderRadius: 6,
                    padding: "1px 6px",
                    fontFamily: "monospace",
                    fontSize: "0.85em",
                    color: "#adff44",
                    fontWeight: 600,
                  }}>{first.content}</code>
                );
              } else if (first.type === "italic") {
                elements.push(<em key={key++} style={{ color: "#bdbdbd" }}>{first.content}</em>);
              }
              curr = curr.substring(first.index + first.length);
            }
            return elements;
          };

          const fc = formatInline(displayLine);

          if (isHeading1) return <h3 key={`${index}-${lineIdx}`} className="font-display font-bold text-base mt-3 mb-1" style={{ color: "#fff" }}>{fc}</h3>;
          if (isHeading2) return <h4 key={`${index}-${lineIdx}`} className="font-display font-bold text-sm mt-2 mb-1" style={{ color: "#e0e0e0" }}>{fc}</h4>;
          if (isHeading3) return <h5 key={`${index}-${lineIdx}`} className="font-semibold text-sm mt-1.5" style={{ color: "#adff44" }}>{fc}</h5>;

          if (isBullet) return (
            <ul key={`${index}-${lineIdx}`} className="list-disc pl-5 my-0.5">
              <li style={{ color: "#e0e0e0" }}>{fc}</li>
            </ul>
          );
          if (isNumbered) return (
            <ol key={`${index}-${lineIdx}`} className="list-decimal pl-5 my-0.5">
              <li style={{ color: "#e0e0e0" }}>{fc}</li>
            </ol>
          );
          if (trimmed === "") return <div key={`${index}-${lineIdx}`} className="h-2" />;
          return <p key={`${index}-${lineIdx}`} style={{ color: "#e0e0e0" }}>{fc}</p>;
        });
      })}
    </div>
  );
}
