import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { basename, join, resolve } from 'node:path';
import { chromium } from '@playwright/test';

const inputs = process.argv.slice(2);
if (inputs.length !== 2) {
  throw new Error('Usage: node scripts/optimize-number-path-images.mjs <hero.png> <result.png>');
}

const outputDirectory = resolve('public/illustrations/number-path');
const outputNames = ['number-path-forest-hero.webp', 'number-path-result-treasure.webp'];
await mkdir(outputDirectory, { recursive: true });

const browser = await chromium.launch({ headless: true });
try {
  const page = await browser.newPage();
  for (let index = 0; index < inputs.length; index += 1) {
    const input = resolve(inputs[index]);
    const encoded = (await readFile(input)).toString('base64');
    const result = await page.evaluate(async ({ encodedImage }) => {
      const image = new Image();
      image.src = `data:image/png;base64,${encodedImage}`;
      await image.decode();
      const sourceCanvas = document.createElement('canvas');
      sourceCanvas.width = image.naturalWidth;
      sourceCanvas.height = image.naturalHeight;
      const sourceContext = sourceCanvas.getContext('2d', { alpha: true });
      if (!sourceContext) throw new Error('Canvas context unavailable');
      sourceContext.drawImage(image, 0, 0);

      // Some image generators bake the transparency preview into the PNG.
      // Remove only the light neutral area connected to the canvas boundary,
      // preserving isolated cream highlights and white details inside the art.
      const pixels = sourceContext.getImageData(0, 0, sourceCanvas.width, sourceCanvas.height);
      const visited = new Uint8Array(sourceCanvas.width * sourceCanvas.height);
      const queue = [];
      const isBackdrop = (offset) => {
        const red = pixels.data[offset];
        const green = pixels.data[offset + 1];
        const blue = pixels.data[offset + 2];
        return Math.min(red, green, blue) >= 210 && Math.max(red, green, blue) - Math.min(red, green, blue) <= 28;
      };
      const enqueue = (x, y) => {
        if (x < 0 || y < 0 || x >= sourceCanvas.width || y >= sourceCanvas.height) return;
        const index = y * sourceCanvas.width + x;
        if (visited[index] || !isBackdrop(index * 4)) return;
        visited[index] = 1;
        queue.push(index);
      };
      for (let x = 0; x < sourceCanvas.width; x += 1) {
        enqueue(x, 0);
        enqueue(x, sourceCanvas.height - 1);
      }
      for (let y = 0; y < sourceCanvas.height; y += 1) {
        enqueue(0, y);
        enqueue(sourceCanvas.width - 1, y);
      }
      for (let cursor = 0; cursor < queue.length; cursor += 1) {
        const index = queue[cursor];
        pixels.data[index * 4 + 3] = 0;
        const x = index % sourceCanvas.width;
        const y = Math.floor(index / sourceCanvas.width);
        enqueue(x - 1, y);
        enqueue(x + 1, y);
        enqueue(x, y - 1);
        enqueue(x, y + 1);
      }
      for (let index = 0; index < visited.length; index += 1) {
        if (isBackdrop(index * 4)) pixels.data[index * 4 + 3] = 0;
      }
      const componentVisited = new Uint8Array(sourceCanvas.width * sourceCanvas.height);
      let largestComponent = [];
      for (let seed = 0; seed < componentVisited.length; seed += 1) {
        if (componentVisited[seed] || pixels.data[seed * 4 + 3] === 0) continue;
        const component = [];
        const componentQueue = [seed];
        componentVisited[seed] = 1;
        for (let cursor = 0; cursor < componentQueue.length; cursor += 1) {
          const index = componentQueue[cursor];
          component.push(index);
          const x = index % sourceCanvas.width;
          const y = Math.floor(index / sourceCanvas.width);
          for (const neighbor of [index - 1, index + 1, index - sourceCanvas.width, index + sourceCanvas.width]) {
            const neighborX = neighbor % sourceCanvas.width;
            if (neighbor < 0 || neighbor >= componentVisited.length || componentVisited[neighbor]
              || pixels.data[neighbor * 4 + 3] === 0 || (Math.abs(neighborX - x) > 1) || Math.abs(Math.floor(neighbor / sourceCanvas.width) - y) > 1) continue;
            componentVisited[neighbor] = 1;
            componentQueue.push(neighbor);
          }
        }
        if (component.length > largestComponent.length) largestComponent = component;
      }
      const keep = new Uint8Array(componentVisited.length);
      for (const index of largestComponent) keep[index] = 1;
      for (let index = 0; index < keep.length; index += 1) {
        if (!keep[index]) pixels.data[index * 4 + 3] = 0;
      }
      sourceContext.putImageData(pixels, 0, 0);

      const canvas = document.createElement('canvas');
      canvas.width = 512;
      canvas.height = 512;
      const context = canvas.getContext('2d', { alpha: true });
      if (!context) throw new Error('Canvas context unavailable');
      context.clearRect(0, 0, canvas.width, canvas.height);
      context.imageSmoothingEnabled = true;
      context.imageSmoothingQuality = 'high';
      context.drawImage(sourceCanvas, 0, 0, canvas.width, canvas.height);
      return {
        dataUrl: canvas.toDataURL('image/webp', 0.88),
        sourceWidth: image.naturalWidth,
        sourceHeight: image.naturalHeight,
        cornerAlpha: context.getImageData(0, 0, 1, 1).data[3]
      };
    }, { encodedImage: encoded });
    if (result.cornerAlpha !== 0) throw new Error(`${basename(input)} does not have a transparent corner`);
    const output = join(outputDirectory, outputNames[index]);
    await writeFile(output, Buffer.from(result.dataUrl.split(',')[1], 'base64'));
    process.stdout.write(`${basename(input)} ${result.sourceWidth}x${result.sourceHeight} -> ${outputNames[index]} 512x512\n`);
  }
} finally {
  await browser.close();
}
