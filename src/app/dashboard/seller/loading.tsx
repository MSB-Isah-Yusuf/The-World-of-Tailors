export default function Loading() {
  return (
    <div className="space-y-4 animate-pulse">
      <div className="h-6 w-48 bg-midnight/10 dark:bg-white/10 rounded" />
      <div className="grid md:grid-cols-4 gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="h-24 rounded-2xl border bg-white dark:bg-white/[0.05] dark:border-white/10" />
        ))}
      </div>
      <div className="h-64 rounded-2xl border bg-white dark:bg-white/[0.05] dark:border-white/10" />
    </div>
  );
}
