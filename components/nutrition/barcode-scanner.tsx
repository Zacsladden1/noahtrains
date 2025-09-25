'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { BarcodeScanner as ReactBarcodeScanner } from 'react-barcode-scanner';

type Props = {
  onDetected: (code: string) => void;
  onManualEntry?: () => void;
};

export function BarcodeScanner({ onDetected, onManualEntry }: Props) {
  const [error, setError] = useState<string | null>(null);
  const [pendingScan, setPendingScan] = useState<string | null>(null);
  const [showConfirmation, setShowConfirmation] = useState(false);

  const handleScan = useCallback((code: string) => {
    if (!pendingScan) {
      setPendingScan(code);
      setShowConfirmation(true);
    }
  }, [pendingScan]);

  const handleError = useCallback((err: string) => {
    console.error('Barcode scanner error:', err);
    setError(err);
  }, []);

  const handleConfirmScan = useCallback(() => {
    if (pendingScan) {
      onDetected(pendingScan);
      setPendingScan(null);
      setShowConfirmation(false);
    }
  }, [pendingScan, onDetected]);

  const handleCancelScan = useCallback(() => {
    setPendingScan(null);
    setShowConfirmation(false);
  }, []);

  return (
    <div className="space-y-3">
      {!showConfirmation && (
        <div className="relative rounded-lg overflow-hidden bg-black/50 aspect-video">
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
          <div className="absolute inset-0 pointer-events-none border-2 border-gold m-6 rounded-xl" />
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div className="text-gold text-sm font-medium">
              Point camera at barcode to scan
            </div>
          </div>
        </div>
      )}

      {/* Confirmation Dialog */}
      {showConfirmation && pendingScan && (
        <div className="bg-black/80 rounded-lg p-4 border border-gold/30">
          <div className="text-center space-y-3">
            <div className="text-green-400 text-lg font-semibold">✓ Barcode Detected!</div>
            <div className="bg-black/40 rounded p-3">
              <div className="text-white font-mono text-sm break-all">{pendingScan}</div>
            </div>
            <p className="text-white/70 text-sm">Confirm this barcode to add the product?</p>
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


