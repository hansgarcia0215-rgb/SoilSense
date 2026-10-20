/**
 * generate-icons.cjs
 * Generates all PWA icon sizes from soilsense_logo.png using jimp.
 * Run: node scripts/generate-icons.cjs
 */

const Jimp = require('jimp');
const path = require('path');
const fs   = require('fs');

const SRC = path.join(__dirname, '..', 'public', 'soilsense_logo.png');
const OUT = path.join(__dirname, '..', 'public', 'icons');

if (!fs.existsSync(OUT)) fs.mkdirSync(OUT, { recursive: true });

const SIZES = [72, 96, 128, 144, 152, 192, 384, 512];

async function main() {
  console.log('Reading source logo:', SRC);
  const img = await Jimp.read(SRC);

  // Generate each size
  for (const size of SIZES) {
    const out = path.join(OUT, `icon-${size}x${size}.png`);
    await img.clone().resize(size, size).writeAsync(out);
    console.log(`  ✓ icon-${size}x${size}.png`);
  }

  // Maskable icon — add white padding (safe zone = 40% of canvas)
  // The actual icon content sits in the central 60%
  const maskableSize = 512;
  const padded = new Jimp(maskableSize, maskableSize, 0xffffffff); // white bg
  const inner  = await Jimp.read(SRC);
  const iconSize = Math.round(maskableSize * 0.6);
  inner.resize(iconSize, iconSize);
  const offset = Math.round((maskableSize - iconSize) / 2);
  padded.composite(inner, offset, offset);
  await padded.writeAsync(path.join(OUT, 'maskable-512x512.png'));
  console.log('  ✓ maskable-512x512.png (with safe-zone padding)');

  // Also copy 512x512 as the main favicon PNG
  await img.clone().resize(512, 512).writeAsync(
    path.join(__dirname, '..', 'public', 'favicon.png')
  );
  console.log('  ✓ favicon.png');

  console.log('\n✅ All icons generated from soilsense_logo.png');
}

main().catch(err => { console.error('Error:', err.message); process.exit(1); });
