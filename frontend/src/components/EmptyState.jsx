export default function EmptyState({ title, description, icon }) {
  return (
    <div className="flex flex-col items-center justify-center py-10 text-center gap-2">
      {icon && <div className="text-4xl mb-1">{icon}</div>}
      <p className="text-sm font-semibold text-white">{title}</p>
      {description && <p className="text-xs max-w-xs" style={{ color: "#8a8a8a" }}>{description}</p>}
    </div>
  );
}
