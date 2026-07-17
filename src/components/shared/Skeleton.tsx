/**
 * Base shimmer block for loading skeletons. Deliberately unopinionated about
 * shape — pass rounding (`rounded-full`, `rounded-md`, ...) and sizing via
 * `className` so callers compose their own skeleton layouts from this one
 * primitive instead of every page re-declaring `animate-pulse bg-slate-*`.
 */
export function SkeletonBlock({ className = '' }: { className?: string }) {
  return <div className={`animate-pulse bg-slate-200 ${className}`} />;
}
