'use client';

import { useEffect, useRef, useState } from 'react';

type Props = {
  onDetected: (code: string) => void;
};

export function BarcodeScanner({ onDetected }: Props) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [active, setActive] = useState(false);

  useEffect(() => {
    let stream: MediaStream | null = null;
    let rafId: number | null = null;
    let detector: any = null;

    const start = async () => {
      try {
        // Camera access
        stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: { ideal: 'environment' } },
          audio: false,
        });
        if (!videoRef.current) return;
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
        setActive(true);

        // BarcodeDetector (supported in modern Chrome/Safari). Fallback handled below.
        // @ts-ignore
        if ('BarcodeDetector' in window) {
          // @ts-ignore
          detector = new window.BarcodeDetector({ formats: ['ean_13', 'qr_code', 'code_128', 'upc_e', 'upc_a'] });
          const scan = async () => {
            try {
              if (videoRef.current && detector) {
                const codes = await detector.detect(videoRef.current);
                if (codes && codes.length > 0) {
                  onDetected(String(codes[0].rawValue || codes[0].rawValue || codes[0].value || ''));
                  return;
                }
              }
            } catch (_) {}
            rafId = window.requestAnimationFrame(scan);
          };
          rafId = window.requestAnimationFrame(scan);
        } else {
          setError('BarcodeDetector not supported. Enter barcode manually.');
        }
      } catch (err: any) {
        console.error(err);
        setError('Camera access failed. Allow camera permissions and use HTTPS or localhost.');
      }
    };

    start();

    return () => {
      if (rafId) cancelAnimationFrame(rafId);
      if (stream) stream.getTracks().forEach((t) => t.stop());
      setActive(false);
    };
  }, [onDetected]);

  return (
    <div className="space-y-3">
      <div className="relative rounded-lg overflow-hidden bg-black/50 aspect-video">
        <video ref={videoRef} className="w-full h-full object-cover" playsInline muted />
        <div className="absolute inset-0 pointer-events-none border-2 border-gold m-6 rounded-xl" />
      </div>
      {!active && !error && <p className="text-white/60 text-sm">Starting camera…</p>}
      {error && <p className="text-red-400 text-sm">{error}</p>}
    </div>
  );
}


