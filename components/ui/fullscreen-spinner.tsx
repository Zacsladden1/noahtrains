'use client';

export default function FullscreenSpinner() {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm">
      <div className="animate-spin rounded-full border-2 border-gold/40 border-t-gold h-12 w-12" />
    </div>
  );
}


