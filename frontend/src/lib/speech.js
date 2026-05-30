// speech.js - Text-to-speech sanitization utility
// Strips LaTeX, markdown, and math symbols before TTS narration

export function sanitizeForSpeech(text) {
  if (!text) return "";
  return text
    // Remove LaTeX block equations $$...$$
    .replace(/\$\$[^$]+\$\$/g, " ")
    // Remove LaTeX inline equations $...$
    .replace(/\$[^$]+\$/g, " ")
    // Remove markdown bold/italic
    .replace(/\*{1,3}([^*]+)\*{1,3}/g, "$1")
    // Remove markdown headers
    .replace(/^#{1,6}\s*/gm, "")
    // Remove bullet dashes
    .replace(/^-\s/gm, " ")
    // Remove backslash commands like \rightarrow
    .replace(/\\[a-zA-Z]+/g, " ")
    // Remove remaining symbols
    .replace(/[_^{}[\]\\]/g, " ")
    // Collapse whitespace
    .replace(/\s+/g, " ")
    .trim();
}
