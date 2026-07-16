/**
 * Fallback shown for the brief window while a dynamically-imported modal's
 * chunk is fetching. Keeps the same backdrop tone as the modals themselves so
 * the transition reads as "opening", not "did my click even register".
 */
export function ModalLoadingFallback() {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(13,38,48,0.45)' }}
    >
      <div
        className="size-8 animate-spin rounded-full border-2 border-white/30"
        style={{ borderTopColor: '#FFFFFF' }}
        aria-label="Loading"
      />
    </div>
  );
}
