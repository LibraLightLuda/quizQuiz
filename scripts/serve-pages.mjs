import { createServer } from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { extname, resolve, sep } from 'node:path';

const root = resolve('dist');
const prefix = '/NumberCal/';
const mimeTypes = {
  '.css': 'text/css; charset=utf-8',
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.webmanifest': 'application/manifest+json; charset=utf-8'
};

createServer(async (request, response) => {
  const pathname = new URL(request.url ?? '/', 'http://127.0.0.1').pathname;
  if (!pathname.startsWith(prefix)) {
    response.writeHead(404).end('Not found');
    return;
  }

  const relativePath = decodeURIComponent(pathname.slice(prefix.length)) || 'index.html';
  let filePath = resolve(root, relativePath);
  if (filePath !== root && !filePath.startsWith(`${root}${sep}`)) {
    response.writeHead(400).end('Bad path');
    return;
  }

  try {
    if ((await stat(filePath)).isDirectory()) filePath = resolve(filePath, 'index.html');
  } catch {
    if (request.headers.accept?.includes('text/html') && !extname(relativePath)) {
      filePath = resolve(root, 'index.html');
    } else {
      response.writeHead(404).end('Not found');
      return;
    }
  }

  try {
    const body = await readFile(filePath);
    response.writeHead(200, {
      'Content-Type': mimeTypes[extname(filePath)] ?? 'application/octet-stream',
      'Cache-Control': 'no-cache'
    });
    response.end(body);
  } catch {
    response.writeHead(404).end('Not found');
  }
}).listen(4176, '127.0.0.1');
