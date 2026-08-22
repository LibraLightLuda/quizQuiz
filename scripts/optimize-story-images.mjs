import { chromium } from '@playwright/test';
import { promises as fs } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const storyRoot = fileURLToPath(new URL('../public/illustrations/stories/', import.meta.url));
const removeOriginals = process.argv.includes('--remove-originals');

const findPngFiles = async (directory) => {
  const entries = await fs.readdir(directory, { withFileTypes: true });
  const nested = await Promise.all(entries.map(async (entry) => {
    const location = path.join(directory, entry.name);
    if (entry.isDirectory()) return findPngFiles(location);
    return entry.isFile() && entry.name.endsWith('.png') ? [location] : [];
  }));
  return nested.flat();
};

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage();

try {
  const pngFiles = (await findPngFiles(storyRoot)).sort();
  let pngBytes = 0;
  let webpBytes = 0;

  for (const pngPath of pngFiles) {
    const source = await fs.readFile(pngPath);
    const quality = path.basename(path.dirname(pngPath)) === 'covers' ? 0.88 : 0.84;
    const converted = await page.evaluate(async ({ base64, quality: imageQuality }) => {
      const image = new Image();
      image.src = `data:image/png;base64,${base64}`;
      await image.decode();
      const canvas = document.createElement('canvas');
      canvas.width = image.naturalWidth;
      canvas.height = image.naturalHeight;
      const context = canvas.getContext('2d', { alpha: false });
      if (!context) throw new Error('2D canvas is unavailable');
      context.drawImage(image, 0, 0);
      const dataUrl = canvas.toDataURL('image/webp', imageQuality);
      if (!dataUrl.startsWith('data:image/webp;base64,')) throw new Error('WebP encoding is unavailable');
      return {
        base64: dataUrl.slice('data:image/webp;base64,'.length),
        width: image.naturalWidth,
        height: image.naturalHeight
      };
    }, { base64: source.toString('base64'), quality });

    const isCover = path.basename(path.dirname(pngPath)) === 'covers';
    const expectedSize = isCover ? 256 : 768;
    if (converted.width !== expectedSize || converted.height !== expectedSize) {
      throw new Error(`Unexpected dimensions for ${pngPath}: ${converted.width}x${converted.height}`);
    }

    const output = Buffer.from(converted.base64, 'base64');
    const decodedSize = await page.evaluate(async (webpBase64) => {
      const image = new Image();
      image.src = `data:image/webp;base64,${webpBase64}`;
      await image.decode();
      return { width: image.naturalWidth, height: image.naturalHeight };
    }, output.toString('base64'));
    if (decodedSize.width !== expectedSize || decodedSize.height !== expectedSize) {
      throw new Error(`WebP verification failed for ${pngPath}: ${decodedSize.width}x${decodedSize.height}`);
    }
    await fs.writeFile(pngPath.replace(/\.png$/, '.webp'), output);
    pngBytes += source.byteLength;
    webpBytes += output.byteLength;
  }

  const reduction = pngBytes === 0 ? 0 : Math.round((1 - webpBytes / pngBytes) * 1000) / 10;
  if (removeOriginals) {
    const normalizedRoot = `${path.resolve(storyRoot)}${path.sep}`;
    for (const pngPath of pngFiles) {
      const normalizedPng = path.resolve(pngPath);
      const webpPath = pngPath.replace(/\.png$/, '.webp');
      if (!normalizedPng.startsWith(normalizedRoot)) throw new Error(`Unsafe removal path: ${normalizedPng}`);
      await fs.access(webpPath);
      await fs.unlink(normalizedPng);
    }
  }
  console.log(JSON.stringify({
    files: pngFiles.length,
    pngBytes,
    webpBytes,
    reductionPercent: reduction,
    originalsRemoved: removeOriginals ? pngFiles.length : 0
  }));
} finally {
  await page.close();
  await browser.close();
}
