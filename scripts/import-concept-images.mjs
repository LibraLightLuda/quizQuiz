import { chromium } from '@playwright/test';
import { promises as fs } from 'node:fs';
import path from 'node:path';

const mappings = process.argv.slice(2).map((entry) => {
  const separator = entry.indexOf('=');
  if (separator < 1) throw new Error(`Expected source=destination, received: ${entry}`);
  return { source: entry.slice(0, separator), destination: entry.slice(separator + 1) };
});

if (mappings.length === 0) throw new Error('At least one source=destination mapping is required');

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage();

try {
  let totalBytes = 0;
  for (const mapping of mappings) {
    await fs.access(mapping.source);
    try {
      await fs.access(mapping.destination);
      throw new Error(`Destination already exists: ${mapping.destination}`);
    } catch (error) {
      if (error?.code !== 'ENOENT') throw error;
    }

    const source = await fs.readFile(mapping.source);
    const converted = await page.evaluate(async (base64) => {
      const image = new Image();
      image.src = `data:image/png;base64,${base64}`;
      await image.decode();
      const canvas = document.createElement('canvas');
      canvas.width = 512;
      canvas.height = 512;
      const context = canvas.getContext('2d', { alpha: false });
      if (!context) throw new Error('2D canvas is unavailable');
      context.fillStyle = '#fffaf0';
      context.fillRect(0, 0, 512, 512);
      context.drawImage(image, 0, 0, 512, 512);
      const dataUrl = canvas.toDataURL('image/webp', 0.88);
      if (!dataUrl.startsWith('data:image/webp;base64,')) throw new Error('WebP encoding is unavailable');
      return dataUrl.slice('data:image/webp;base64,'.length);
    }, source.toString('base64'));

    const output = Buffer.from(converted, 'base64');
    const decodedSize = await page.evaluate(async (base64) => {
      const image = new Image();
      image.src = `data:image/webp;base64,${base64}`;
      await image.decode();
      return [image.naturalWidth, image.naturalHeight];
    }, output.toString('base64'));
    if (decodedSize[0] !== 512 || decodedSize[1] !== 512) {
      throw new Error(`WebP verification failed: ${mapping.destination}`);
    }

    await fs.mkdir(path.dirname(mapping.destination), { recursive: true });
    await fs.writeFile(mapping.destination, output);
    totalBytes += output.byteLength;
  }
  console.log(JSON.stringify({ files: mappings.length, bytes: totalBytes }));
} finally {
  await page.close();
  await browser.close();
}
