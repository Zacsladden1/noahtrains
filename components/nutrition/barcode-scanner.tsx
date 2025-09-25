'use client';

import { useEffect, useRef, useState } from 'react';
import { BrowserMultiFormatReader, NotFoundException } from '@zxing/library';

type Props = {
  onDetected: (code: string) => void;
  onManualEntry?: () => void;
};

export function BarcodeScanner({ onDetected, onManualEntry }: Props) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [active, setActive] = useState(false);
  const [facingMode, setFacingMode] = useState<'environment' | 'user'>('environment');

  useEffect(() => {
    let stream: MediaStream | null = null;
    let rafId: number | null = null;
    let codeReader: BrowserMultiFormatReader | null = null;
    let isScanning = false;

    const start = async () => {
      try {
        // Get camera access with iOS-specific optimizations
        const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
        const videoConstraints = {
          facingMode: { ideal: facingMode },
          width: { ideal: isIOS ? 1920 : 1280 }, // Higher resolution for iOS
          height: { ideal: isIOS ? 1080 : 720 },
          frameRate: { ideal: 30, max: 60 }, // Better frame rate for mobile
        };

        stream = await navigator.mediaDevices.getUserMedia({
          video: videoConstraints,
          audio: false,
        });

        if (!videoRef.current) return;
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
        setActive(true);

        // Use ZXing library for reliable barcode scanning
        codeReader = new BrowserMultiFormatReader();

        // Configure scanner for mobile devices
        const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);

        if (isMobile) {
          // On mobile, use continuous scanning with better performance
          const scan = async () => {
            if (!videoRef.current || !codeReader || isScanning) return;

            try {
              isScanning = true;

              // Scan from video element with mobile-optimized settings
              const result = await codeReader.decodeFromVideoElement(
                videoRef.current,
                (result) => {
                  if (result && result.getText()) {
                    const code = result.getText();
                    onDetected(code);
                    return true; // Stop scanning on successful detection
                  }
                  return false;
                },
                (err) => {
                  // NotFoundException is expected when no barcode is found
                  if (!(err instanceof NotFoundException)) {
                    console.warn('Mobile scanning error:', err);
                  }
                }
              );
            } catch (err) {
              // NotFoundException is expected when no barcode is found
              if (!(err instanceof NotFoundException)) {
                console.warn('Scanning error:', err);
              }
            } finally {
              isScanning = false;
              rafId = window.requestAnimationFrame(scan);
            }
          };

          // Start scanning
          rafId = window.requestAnimationFrame(scan);
        } else {
          // Desktop: use single-shot scanning
          const scan = async () => {
            if (!videoRef.current || !codeReader || isScanning) return;

            try {
              isScanning = true;

              const result = await codeReader.decodeOnceFromVideoDevice(undefined, videoRef.current.srcObject as MediaStream);

              if (result && result.getText()) {
                const code = result.getText();
                onDetected(code);
                return;
              }
            } catch (err) {
              // NotFoundException is expected when no barcode is found
              if (!(err instanceof NotFoundException)) {
                console.warn('Desktop scanning error:', err);
              }
            } finally {
              isScanning = false;
              rafId = window.requestAnimationFrame(scan);
            }
          };

          // Start scanning
          rafId = window.requestAnimationFrame(scan);
        }

      } catch (err: any) {
        console.error('Camera/Scanner setup error:', err);

        if (err.name === 'NotAllowedError') {
          setError('Camera access denied. Please allow camera permissions.');
        } else if (err.name === 'NotFoundError') {
          setError('No camera found. Please ensure your device has a camera.');
        } else if (err.name === 'NotReadableError') {
          setError('Camera is being used by another application.');
        } else {
          setError(`Scanner initialization failed: ${err.message || 'Unknown error'}`);
        }
      }
    };

    start();

    return () => {
      if (rafId) cancelAnimationFrame(rafId);
      if (codeReader) {
        codeReader.reset();
      }
      if (stream) {
        stream.getTracks().forEach((t) => t.stop());
      }
      setActive(false);
    };
  }, [onDetected, facingMode, onManualEntry]);

  return (
    <div className="space-y-3">
      <div className="relative rounded-lg overflow-hidden bg-black/50 aspect-video">
        <video
          ref={videoRef}
          className="w-full h-full object-cover"
          playsInline
          muted
          autoPlay
        />
        <canvas
          ref={canvasRef}
          className="absolute inset-0 w-full h-full pointer-events-none"
          style={{ display: 'none' }}
        />
        <div className="absolute inset-0 pointer-events-none border-2 border-gold m-6 rounded-xl" />
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div className="text-gold text-sm font-medium">
            Point camera at barcode
          </div>
        </div>
        <button
          type="button"
          onClick={() => setFacingMode((m) => (m === 'environment' ? 'user' : 'environment'))}
          className="absolute top-3 right-3 z-10 rounded-md bg-black/60 text-white text-xs px-2 py-1 border border-white/20 hover:bg-black/80"
        >
          Flip
        </button>
      </div>
      {!active && !error && (
        <div className="text-center">
          <p className="text-white/60 text-sm">Initializing camera...</p>
          <p className="text-white/40 text-xs mt-1">Using ZXing barcode scanner for better compatibility</p>
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


