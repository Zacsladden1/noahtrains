import fs from 'node:fs';
import path from 'node:path';
import sharp from 'sharp';

const root = path.resolve(process.cwd());
const srcPath = path.join(root, 'public', 'blackbg.png');
const outDir = path.join(root, 'public');

if (!fs.existsSync(srcPath)) {
  console.error('Source image not found:', srcPath);
  process.exit(1);
}

// Sizes we need for iOS and PWA
const outputs = [
  { name: 'apple-touch-icon.png', size: 180 },
  { name: 'icon-192.png', size: 192 },
  { name: 'icon-512.png', size: 512 },
];

// Zoom factor (>1 zooms in); and crop anchor to bottom to keep yellow baseline at bottom
const ZOOM = 1.15; // adjust if you want tighter crop

/**
 * Create a zoomed square crop from the bottom (south) so the yellow line sits near the bottom.
 */
async function generate(size) {
  const img = sharp(srcPath);
  const { width, height } = await img.metadata();
  if (!width || !height) throw new Error('Cannot read image dimensions');

  const base = Math.min(width, height);
  const cropSize = Math.round(base / ZOOM);

  // Crop from bottom center
  const left = Math.max(0, Math.floor((width - cropSize) / 2));
  const top = Math.max(0, height - cropSize);

  const buf = await img
    .extract({ left, top, width: Math.min(cropSize, width - left), height: Math.min(cropSize, height - top) })
    .resize(size, size, { fit: 'cover' })
    .png({ compressionLevel: 9 })
    .toBuffer();

  return buf;
}

(async () => {
  try {
    for (const out of outputs) {
      const buf = await generate(out.size);
      const dest = path.join(outDir, out.name);
      await fs.promises.writeFile(dest, buf);
      console.log('Wrote', dest);
    }
    console.log('All icons generated.');
  } catch (e) {
    console.error(e);
    process.exit(1);
  }
})();


