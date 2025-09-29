'use client';

export default function FullscreenLogo() {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black">
      <div className="flex flex-col items-center gap-3">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/no%20backround%20high%20quality%20logo%202.png"
          alt="Noahhtrains"
          className="h-24 w-auto sm:h-28 drop-shadow-[0_0_30px_rgba(205,167,56,0.25)]"
        />
        <div className="text-base sm:text-lg font-[var(--font-heading)] tracking-[0.35em] text-gold">NOAHHTRAINS</div>
      </div>
    </div>
  );
}


