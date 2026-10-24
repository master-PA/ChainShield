import fs from 'fs';
import path from 'path';
import zlib from 'zlib';

function crc32(buf: Buffer): number {
  let c = 0xffffffff;
  for (let i = 0; i < buf.length; i++) {
    c ^= buf[i];
    for (let k = 0; k < 8; k++) {
      c = (c >>> 1) ^ (c & 1 ? 0xedb88320 : 0);
    }
  }
  return (c ^ 0xffffffff) >>> 0;
}

function makeChunk(type: string, data: Buffer): Buffer {
  const typeBuf = Buffer.from(type, 'ascii');
  const lenBuf = Buffer.alloc(4);
  lenBuf.writeUInt32BE(data.length, 0);
  const typeAndData = Buffer.concat([typeBuf, data]);
  const crc = crc32(typeAndData);
  const crcBuf = Buffer.alloc(4);
  crcBuf.writeUInt32BE(crc, 0);
  return Buffer.concat([lenBuf, typeAndData, crcBuf]);
}

export function createPng(
  width: number,
  height: number,
  rgbaPixelFn: (x: number, y: number) => [number, number, number, number]
): Buffer {
  const signature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);

  // IHDR
  const ihdrData = Buffer.alloc(13);
  ihdrData.writeUInt32BE(width, 0);
  ihdrData.writeUInt32BE(height, 4);
  ihdrData[8] = 8; // bit depth
  ihdrData[9] = 6; // RGBA
  ihdrData[10] = 0;
  ihdrData[11] = 0;
  ihdrData[12] = 0;
  const ihdrChunk = makeChunk('IHDR', ihdrData);

  // Scanlines
  const rowBytes = 1 + width * 4;
  const rawData = Buffer.alloc(rowBytes * height);
  for (let y = 0; y < height; y++) {
    const rowOffset = y * rowBytes;
    rawData[rowOffset] = 0; // filter None
    for (let x = 0; x < width; x++) {
      const [r, g, b, a] = rgbaPixelFn(x, y);
      const pxOffset = rowOffset + 1 + x * 4;
      rawData[pxOffset] = r;
      rawData[pxOffset + 1] = g;
      rawData[pxOffset + 2] = b;
      rawData[pxOffset + 3] = a;
    }
  }

  const idatData = zlib.deflateSync(rawData);
  const idatChunk = makeChunk('IDAT', idatData);
  const iendChunk = makeChunk('IEND', Buffer.alloc(0));

  return Buffer.concat([signature, ihdrChunk, idatChunk, iendChunk]);
}

/**
 * Draws a cryptographic shield in cyan/emerald on dark slate background
 */
function shieldPixel(x: number, y: number, size: number): [number, number, number, number] {
  const cx = size / 2;
  const cy = size / 2;
  const nx = (x - cx) / (size / 2); // -1 to 1
  const ny = (y - cy) / (size / 2); // -1 to 1

  // Outer rounded square background
  const rDist = Math.max(Math.abs(nx), Math.abs(ny));
  if (rDist > 0.95) {
    return [0, 0, 0, 0]; // Transparent outside
  }

  // Dark slate background: #0b0f14
  let r = 11;
  let g = 15;
  let b = 20;
  let a = 255;

  // Shield boundary calculation
  // Top horizontal curve from y=-0.6 to -0.4, side tapering down to y=0.7 at x=0
  const shieldTop = -0.65;
  const shieldBottom = 0.75;
  const shieldWidthAtY = Math.max(0, 0.65 * (1 - Math.max(0, (ny - 0.1) / (shieldBottom - 0.1))));

  const inShield = ny >= shieldTop && ny <= shieldBottom && Math.abs(nx) <= (ny < 0.1 ? 0.65 : shieldWidthAtY);

  if (inShield) {
    // Shield border vs shield inner
    const edgeDist = Math.min(
      Math.abs(ny - shieldTop),
      Math.abs(shieldBottom - ny),
      Math.abs(Math.abs(nx) - (ny < 0.1 ? 0.65 : shieldWidthAtY))
    );

    if (edgeDist < 0.12) {
      // Bright teal border #14b8a6
      r = 20;
      g = 184;
      b = 166;
    } else {
      // Inner gradient from dark teal to deep slate
      const grad = (ny - shieldTop) / (shieldBottom - shieldTop);
      r = Math.round(15 + grad * 5);
      g = Math.round(75 - grad * 35);
      b = Math.round(85 - grad * 40);

      // Central checkmark / keyhole emblem
      if (Math.abs(nx) < 0.12 && ny > -0.25 && ny < 0.35) {
        // Bright emerald core #10b981
        r = 16;
        g = 185;
        b = 129;
      }
    }
  }

  return [r, g, b, a];
}

export function generateAllIcons(outputDir: string) {
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  const sizes = [16, 48, 128];
  for (const size of sizes) {
    const png = createPng(size, size, (x, y) => shieldPixel(x, y, size));
    const filePath = path.join(outputDir, `icon${size}.png`);
    fs.writeFileSync(filePath, png);
    console.log(`Generated ${filePath} (${png.length} bytes)`);
  }

  // Also write SVG icon
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 128 128" width="128" height="128">
  <rect width="128" height="128" rx="28" fill="#0B0F14"/>
  <path d="M64 18 L102 32 V68 C102 92 84 108 64 114 C44 108 26 92 26 68 V32 Z" fill="#134E4A" stroke="#14B8A6" stroke-width="6" stroke-linejoin="round"/>
  <path d="M52 64 L60 72 L78 52" fill="none" stroke="#2DD4BF" stroke-width="7" stroke-linecap="round" stroke-linejoin="round"/>
</svg>`;
  fs.writeFileSync(path.join(outputDir, 'icon.svg'), svg);
  console.log('Generated icon.svg');
}

// Auto-run if executed directly
if (process.argv[1] && process.argv[1].includes('generateIcons')) {
  const targetDir = path.resolve(process.cwd(), 'extension', 'icons');
  generateAllIcons(targetDir);
}
