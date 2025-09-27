'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { BarcodeScanner as ReactBarcodeScanner } from 'react-barcode-scanner';
import { BrowserMultiFormatReader } from '@zxing/library';
import { Camera, CameraOff, RefreshCcw } from 'lucide-react';

type Props = {
  onDetected: (code: string) => void;
  onManualEntry?: () => void;
};

export function BarcodeScanner({ onDetected, onManualEntry }: Props) {
  const [error, setError] = useState<string | null>(null);
  const [pendingScan, setPendingScan] = useState<string | null>(null);
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [pendingLabel, setPendingLabel] = useState<string | null>(null);
  const [labelLoading, setLabelLoading] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const [useTorch, setUseTorch] = useState(false);

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const codeReaderRef = useRef<BrowserMultiFormatReader | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [facing, setFacing] = useState<'environment' | 'user'>('environment');
  const rafRef = useRef<number | null>(null);

  useEffect(() => {
    setIsIOS(/iPad|iPhone|iPod/.test(navigator.userAgent));
  }, []);

  const handleScan = useCallback((code: string) => {
    if (!pendingScan) {
      setPendingScan(code);
      setShowConfirmation(true);
      // Try to resolve a human-friendly label for confirmation
      (async () => {
        try {
          setLabelLoading(true);
          const res = await fetch(`https://world.openfoodfacts.org/api/v2/product/${code}.json`);
          const data = await res.json().catch(() => ({} as any));
          const p = (data && (data.product || data.data)) || null;
          const name = p?.product_name || p?.generic_name || null;
          const brand = p?.brands || null;
          const label = [name, brand].filter(Boolean).join(' · ');
          setPendingLabel(label || null);
        } catch {
          setPendingLabel(null);
        } finally {
          setLabelLoading(false);
        }
      })();
    }
  }, [pendingScan]);

  const handleError = useCallback((err: string) => {
    console.error('Barcode scanner error:', err);
    setError(err);
  }, []);

  // iOS ZXing fallback setup
  useEffect(() => {
    if (!isIOS || showConfirmation) return;

    let cancelled = false;

    const startZXing = async () => {
      try {
        // Request higher quality on iOS
        const constraints: MediaStreamConstraints = {
          video: {
            facingMode: { ideal: facing },
            width: { ideal: 1920 },
            height: { ideal: 1080 },
            frameRate: { ideal: 30, max: 60 },
            advanced: useTorch ? [{ torch: true as any }] : [],
          } as MediaTrackConstraints,
          audio: false,
        };
        const stream = await navigator.mediaDevices.getUserMedia(constraints);
        streamRef.current = stream;

        if (!videoRef.current) return;
        videoRef.current.srcObject = stream;
        await videoRef.current.play();

        codeReaderRef.current = new BrowserMultiFormatReader();

        const loop = async () => {
          if (cancelled || showConfirmation) return;
          try {
            const result = await codeReaderRef.current!.decodeFromVideoElement(videoRef.current!);
            if (result && result.getText() && !pendingScan) {
              handleScan(result.getText());
              return;
            }
          } catch (_) {
            // continue scanning
          }
          rafRef.current = requestAnimationFrame(loop);
        };
        rafRef.current = requestAnimationFrame(loop);
      } catch (e: any) {
        handleError(e?.message || 'Camera access failed');
      }
    };

    if (isIOS) startZXing();

    return () => {
      cancelled = true;
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      if (codeReaderRef.current) {
        try { codeReaderRef.current.reset(); } catch {}
      }
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(t => t.stop());
        streamRef.current = null;
      }
    };
  }, [isIOS, useTorch, facing, showConfirmation, pendingScan, handleScan, handleError]);

  // Ensure cleanup util is defined before any hook depends on it
  const cleanupCamera = useCallback(() => {
    try {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    } catch {}
    try {
      if (codeReaderRef.current) codeReaderRef.current.reset();
    } catch {}
    try {
      if (streamRef.current) {
        // Turn off torch if supported by track constraints before stopping
        const videoTracks = streamRef.current.getVideoTracks();
        for (const vt of videoTracks) {
          try { (vt as any).applyConstraints({ advanced: [{ torch: false }] }); } catch {}
        }
        streamRef.current.getTracks().forEach(t => {
          try { t.stop(); } catch {}
        });
        streamRef.current = null;
      }
    } catch {}
    // Also detach any media from the video element to force release on iOS
    try {
      if (videoRef.current) {
        try { videoRef.current.pause(); } catch {}
        try { (videoRef.current as any).srcObject = null; } catch {}
      }
    } catch {}
  }, []);

  const handleConfirmScan = useCallback(() => {
    if (pendingScan) {
      onDetected(pendingScan);
      setPendingScan(null);
      setShowConfirmation(false);
      // Ensure torch and camera are fully turned off when leaving scanner
      setUseTorch(false);
      cleanupCamera();
      setPendingLabel(null);
    }
  }, [pendingScan, onDetected, cleanupCamera]);

  const handleCancelScan = useCallback(() => {
    setPendingScan(null);
    setShowConfirmation(false);
    cleanupCamera();
    setUseTorch(false);
    setPendingLabel(null);
  }, [cleanupCamera]);

  // Make sure torch/camera are disabled when page is hidden or leaving
  useEffect(() => {
    const onHide = () => {
      try { setUseTorch(false); } catch {}
      try { cleanupCamera(); } catch {}
    };
    document.addEventListener('visibilitychange', onHide);
    window.addEventListener('pagehide', onHide);
    window.addEventListener('beforeunload', onHide);
    return () => {
      document.removeEventListener('visibilitychange', onHide);
      window.removeEventListener('pagehide', onHide);
      window.removeEventListener('beforeunload', onHide);
    };
  }, [cleanupCamera]);

  return (
    <div className="space-y-3">
      {!showConfirmation && (
        <div className="relative rounded-lg overflow-hidden bg-black/50 aspect-video">
          {!isIOS ? (
            <ReactBarcodeScanner
              options={{
                formats: ['ean_13', 'ean_8', 'upc_a', 'upc_e', 'code_128', 'code_39', 'qr_code'],
              }}
              onCapture={(barcodes) => {
                if (barcodes.length > 0 && !pendingScan) {
                  const code = barcodes[0].rawValue || '';
                  handleScan(code);
                }
              }}
              onError={(error) => handleError(error.message || 'Scanner error')}
              trackConstraints={{
                facingMode: 'environment',
                aspectRatio: 1,
                frameRate: { ideal: 30, max: 60 }
              }}
            />
          ) : (
            <video
              ref={videoRef}
              className="w-full h-full object-cover"
              playsInline
              muted
              autoPlay
            />
          )}
          <div className="absolute inset-0 pointer-events-none border-2 border-gold m-6 rounded-xl" />
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div className="text-gold text-sm font-medium">
              Point camera at barcode to scan
            </div>
          </div>
          {isIOS && (
            <button
              type="button"
              onClick={() => setUseTorch(v => !v)}
              className="absolute top-3 right-3 z-10 rounded-md bg-black/60 text-white text-xs px-2 py-1 border border-white/20 hover:bg-black/80"
            >
              {useTorch ? 'Torch Off' : 'Torch On'}
            </button>
          )}
          <button
            type="button"
            onClick={() => setFacing(prev => prev === 'environment' ? 'user' : 'environment')}
            className="absolute top-3 left-3 z-10 rounded-md bg-black/60 text-white text-xs px-2 py-1 border border-white/20 hover:bg-black/80"
          >
            Flip
          </button>
        </div>
      )}

      {showConfirmation && pendingScan && (
        <div className="bg-black/80 rounded-lg p-4 border border-gold/30">
          <div className="text-center space-y-3">
            <div className="text-green-400 text-lg font-semibold">✓ Barcode Detected!</div>
            <div className="bg-black/40 rounded p-3">
              {labelLoading ? (
                <div className="text-white/70 text-sm">Looking up product…</div>
              ) : (
                <>
                  <div className="text-white text-sm break-words font-semibold">
                    {pendingLabel || 'Unknown product'}
                  </div>
                  <div className="text-white/50 font-mono text-xs mt-1">{pendingScan}</div>
                </>
              )}
            </div>
            <p className="text-white/70 text-sm">Confirm to use this product</p>
            <div className="flex gap-2 justify-center">
              <button
                onClick={handleConfirmScan}
                className="px-4 py-2 bg-gold text-black text-sm font-semibold rounded-md hover:bg-gold/80"
              >
                Confirm
              </button>
              <button
                onClick={handleCancelScan}
                className="px-4 py-2 bg-white/10 text-white text-sm rounded-md border border-white/20 hover:bg-white/20"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {error && (
        <div className="text-center space-y-2">
          <p className="text-red-400 text-sm">{error}</p>
          <div className="flex gap-2 justify-center">
            <button
              onClick={() => window.location.reload()}
              className="px-3 py-1 bg-gold text-black text-xs rounded-md hover:bg-gold/80"
            >
              Retry
            </button>
            {onManualEntry && (
              <button
                onClick={onManualEntry}
                className="px-3 py-1 bg-white/10 text-white text-xs rounded-md border border-white/20 hover:bg-white/20"
              >
                Enter Manually
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}


