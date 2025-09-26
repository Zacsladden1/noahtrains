'use client';

import { useEffect, useState } from 'react';

export default function IOSPWABanner() {
  const [show, setShow] = useState(false);

  useEffect(() => {
    const ua = navigator.userAgent || navigator.vendor || (window as any).opera;
    const isIOS = /iPad|iPhone|iPod/.test(ua) && !(window as any).MSStream;
    const isStandalone = (window.navigator as any).standalone === true;
    if (isIOS && !isStandalone) setShow(true);
  }, []);

  if (!show) return null;

  return (
    <div className="fixed inset-x-0 bottom-0 z-50 p-3 sm:p-4 bg-black/90 text-white border-t border-white/20">
      <div className="text-sm sm:text-base">
        Add this app to your Home Screen for iPhone notifications: tap Share, then "Add to Home Screen".
      </div>
      <button
        onClick={() => setShow(false)}
        className="mt-2 text-xs underline text-white/80"
      >
        Dismiss
      </button>
    </div>
  );
}


