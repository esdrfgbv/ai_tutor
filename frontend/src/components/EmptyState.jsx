export default function EmptyState({ title, action }) {
  return (
    <div className="rounded-lg border border-dashed border-black/20 p-8 text-center dark:border-white/15">
      <p className="font-semibold">{title}</p>
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}
