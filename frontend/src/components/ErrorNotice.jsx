import { AlertCircle } from "lucide-react";

export default function ErrorNotice({ message }) {
  if (!message) return null;
  return (
    <div
      className="flex items-start gap-3 rounded-2xl px-4 py-3 text-sm"
      style={{
        background: "rgba(255,107,107,0.08)",
        border: "1px solid rgba(255,107,107,0.2)",
        color: "#ff6b6b",
      }}
    >
      <AlertCircle size={16} className="flex-shrink-0 mt-0.5" />
      <span>{message}</span>
    </div>
  );
}
