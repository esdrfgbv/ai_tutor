import React from "react";

export default function Markdown({ text }) {
  if (!text) return null;

  // Split by code blocks first
  const parts = text.split(/(```[\s\S]*?```)/g);

  return (
    <div className="space-y-1 text-sm text-black/75 dark:text-white/75">
      {parts.map((part, index) => {
        if (part.startsWith("```")) {
          // Extract language and code content
          const match = part.match(/^```(\w*)\n([\s\S]*?)```$/);
          const lang = match ? match[1] : "";
          const content = match ? match[2].trim() : part.replace(/^```|```$/g, "").trim();
          
          return (
            <pre key={index} className="bg-black/5 dark:bg-black/35 text-xs font-mono p-3.5 rounded-xl overflow-x-auto my-2 border border-black/10 dark:border-white/10 text-ink dark:text-white shadow-inner">
              {lang && (
                <div className="text-[10px] uppercase font-bold tracking-widest text-black/40 dark:text-white/40 mb-1 select-none border-b border-black/5 dark:border-white/5 pb-1">
                  {lang}
                </div>
              )}
              <code className="block whitespace-pre">{content}</code>
            </pre>
          );
        } else {
          // Split by line and process inline styles
          const lines = part.split("\n");
          return lines.map((line, lineIdx) => {
            const trimmed = line.trim();
            const isBullet = trimmed.startsWith("- ") || trimmed.startsWith("* ");
            const isNumbered = /^\d+\.\s/.test(trimmed);
            
            let displayLine = line;
            if (isBullet) {
              // Find index of first letter after bullet mark
              const bulletIndex = line.indexOf("-") !== -1 ? line.indexOf("-") : line.indexOf("*");
              displayLine = line.substring(bulletIndex + 2);
            } else if (isNumbered) {
              const numMatch = line.match(/^\s*\d+\.\s/);
              if (numMatch) {
                displayLine = line.substring(numMatch[0].length);
              }
            }

            // Inline formatting helper for bold, italic, and inline code
            const formatInline = (str) => {
              const elements = [];
              let currentStr = str;
              let key = 0;

              while (currentStr.length > 0) {
                const boldMatch = currentStr.match(/(\*\*|__)(.*?)\1/);
                const codeMatch = currentStr.match(/`(.*?)`/);
                const italicMatch = currentStr.match(/(\*|_)(.*?)\1/);

                const matches = [
                  boldMatch && { type: "bold", index: boldMatch.index, length: boldMatch[0].length, content: boldMatch[2] },
                  codeMatch && { type: "code", index: codeMatch.index, length: codeMatch[0].length, content: codeMatch[1] },
                  italicMatch && { type: "italic", index: italicMatch.index, length: italicMatch[0].length, content: italicMatch[2] }
                ].filter(Boolean);

                if (matches.length === 0) {
                  elements.push(<span key={key++}>{currentStr}</span>);
                  break;
                }

                // Sort matches by index to handle the earliest match
                matches.sort((a, b) => a.index - b.index);
                const first = matches[0];

                if (first.index > 0) {
                  elements.push(<span key={key++}>{currentStr.substring(0, first.index)}</span>);
                }

                if (first.type === "bold") {
                  elements.push(
                    <strong key={key++} className="font-extrabold text-ink dark:text-white">
                      {first.content}
                    </strong>
                  );
                } else if (first.type === "code") {
                  elements.push(
                    <code key={key++} className="bg-black/5 dark:bg-white/10 px-1.5 py-0.5 rounded-lg font-mono text-xs border border-black/15 dark:border-white/15 text-mint font-semibold">
                      {first.content}
                    </code>
                  );
                } else if (first.type === "italic") {
                  elements.push(<em key={key++} className="italic">{first.content}</em>);
                }

                currentStr = currentStr.substring(first.index + first.length);
              }

              return elements;
            };

            const formattedContent = formatInline(displayLine);

            if (isBullet) {
              return (
                <ul key={lineIdx} className="list-disc pl-5 my-1 text-black/75 dark:text-white/75 leading-relaxed">
                  <li>{formattedContent}</li>
                </ul>
              );
            }

            if (isNumbered) {
              return (
                <ol key={lineIdx} className="list-decimal pl-5 my-1 text-black/75 dark:text-white/75 leading-relaxed">
                  <li>{formattedContent}</li>
                </ol>
              );
            }

            if (trimmed === "") {
              return <div key={lineIdx} className="h-2" />;
            }

            return (
              <p key={lineIdx} className="leading-relaxed">
                {formattedContent}
              </p>
            );
          });
        }
      })}
    </div>
  );
}
