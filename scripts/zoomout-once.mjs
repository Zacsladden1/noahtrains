import path from 'node:path';
import fs from 'node:fs';
import sharp from 'sharp';

const input = process.argv[2];
if (!input || !fs.existsSync(input)) {
  console.error('Usage: node scripts/zoomout-once.mjs "/absolute/path/to/icon.png"');
  process.exit(1);
}

const ZOOM = 1.08; // slightly zoomed out compared to previous 1.15

async function run() {
  const img = sharp(input);
  const meta = await img.metadata();
  const width = meta.width || 0;
  const height = meta.height || 0;
  if (!width || !height) throw new Error('Could not read image dimensions');
  const base = Math.min(width, height);
  const cropSize = Math.round(base / ZOOM);
  const left = Math.max(0, Math.floor((width - cropSize) / 2));
  const top = Math.max(0, height - cropSize);
  const buf = await img
    .extract({ left, top, width: Math.min(cropSize, width - left), height: Math.min(cropSize, height - top) })
    .resize(180, 180, { fit: 'cover' })
    .png({ compressionLevel: 9 })
    .toBuffer();
  await fs.promises.writeFile(input, buf);
  console.log('Updated in place:', input);
}

run().catch((e) => { console.error(e); process.exit(1); });


