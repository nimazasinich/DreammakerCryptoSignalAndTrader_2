interface SkeletonBlockProps {
  height?: number;
  width?: string;
  className?: string;
}

export default function SkeletonBlock({
  height = 160,
  width = '100%',
  className = ''
}: SkeletonBlockProps) {
  return (
    <div
      style={{ height: `${height}px`, width }}
      className={`animate-pulse bg-slate-800/30 rounded-xl ${className}`}
      role="status"
      aria-label="Loading..."
    >
      <div className="h-full w-full bg-gradient-to-r from-transparent via-slate-700/20 to-transparent animate-shimmer" />
    </div>
  );
}
