import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { gzipSync } from 'node:zlib';
import { join, resolve } from 'node:path';

const distDir = resolve('dist');
const indexPath = join(distDir, 'index.html');

if (!existsSync(indexPath)) throw new Error('dist가 없습니다. 먼저 npm run build를 실행해 주세요.');

const gzipBytes = (path) => gzipSync(readFileSync(path)).byteLength;
const indexHtml = readFileSync(indexPath, 'utf8');
const entryAssets = [...indexHtml.matchAll(/(?:src|href)="([^"]+\.(?:js|css))"/g)]
  .map((match) => match[1])
  .map((assetUrl) => join(distDir, assetUrl.slice(assetUrl.indexOf('assets/'))));
const initialGzipBytes = gzipBytes(indexPath) + entryAssets.reduce((total, path) => total + gzipBytes(path), 0);

const assetFiles = readdirSync(join(distDir, 'assets'))
  .map((name) => join(distDir, 'assets', name))
  .filter((path) => statSync(path).isFile());
const lazyJavaScript = assetFiles
  .filter((path) => path.endsWith('.js') && !entryAssets.includes(path))
  .map((path) => ({ path, gzipBytes: gzipBytes(path) }));
const largestLazyJavaScript = Math.max(0, ...lazyJavaScript.map((asset) => asset.gzipBytes));

const INITIAL_BUDGET = 500 * 1024;
const LAZY_CHUNK_BUDGET = 120 * 1024;
if (initialGzipBytes > INITIAL_BUDGET) throw new Error(`초기 화면 용량이 예산을 넘었습니다: ${initialGzipBytes} > ${INITIAL_BUDGET}`);
if (largestLazyJavaScript > LAZY_CHUNK_BUDGET) throw new Error(`지연 로딩 묶음이 너무 큽니다: ${largestLazyJavaScript} > ${LAZY_CHUNK_BUDGET}`);

console.log(JSON.stringify({ initialGzipBytes, initialBudget: INITIAL_BUDGET, largestLazyJavaScript, lazyChunkBudget: LAZY_CHUNK_BUDGET }));
