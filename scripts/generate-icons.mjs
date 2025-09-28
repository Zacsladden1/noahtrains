import fs from 'node:fs';
import path from 'node:path';
import sharp from 'sharp';

const root = path.resolve(process.cwd());
const cliArg = process.argv[2];
const srcPath = cliArg && fs.existsSync(cliArg)
  ? path.resolve(cliArg)
  : path.join(root, 'public', 'blackbg.png');
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

// Fit entire image inside with black letterbox to avoid cropping any edges
async function generate(size) {
  const img = sharp(srcPath);
  const buf = await img
    .resize(size, size, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 1 } })
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


