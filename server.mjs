// 本地预览：node server.mjs  → 打开 http://localhost:8787
// 静态文件来自 public/，/api/chat 交给 functions/api/chat.js（和线上同一份代码）
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { onRequestPost, onRequestGet } from './functions/api/chat.js';

const root = path.dirname(fileURLToPath(import.meta.url));
const pub = path.join(root, 'public');
const env = { ...process.env };
try {
  for (const line of fs.readFileSync(path.join(root, '.env'), 'utf8').split('\n')) {
    const m = line.match(/^\s*([A-Z_]+)\s*=\s*(.*)\s*$/);
    if (m && !env[m[1]]) env[m[1]] = m[2];
  }
} catch { /* 没有 .env 也能跑，只是 AI 导师会提示未配置 */ }

const types = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.wasm': 'application/wasm', '.svg': 'image/svg+xml', '.png': 'image/png', '.ico': 'image/x-icon' };
const PORT = Number(env.PORT || 8787);

http.createServer(async (req, res) => {
  const url = new URL(req.url, 'http://localhost');
  if (url.pathname === '/api/chat') {
    const chunks = [];
    for await (const c of req) chunks.push(c);
    const request = new Request(url, { method: req.method, headers: { ...req.headers, 'x-forwarded-for': req.socket.remoteAddress }, body: req.method === 'POST' ? Buffer.concat(chunks) : undefined });
    const r = req.method === 'POST' ? await onRequestPost({ request, env }) : onRequestGet();
    res.writeHead(r.status, Object.fromEntries(r.headers));
    return res.end(await r.text());
  }
  let p = path.normalize(decodeURIComponent(url.pathname)).replace(/^([/\\])+/, '');
  if (!p) p = 'index.html';
  const file = path.join(pub, p);
  if (!file.startsWith(pub) || !fs.existsSync(file) || fs.statSync(file).isDirectory()) { res.writeHead(404); return res.end('not found'); }
  res.writeHead(200, { 'Content-Type': types[path.extname(file)] || 'application/octet-stream' });
  fs.createReadStream(file).pipe(res);
}).listen(PORT, () => console.log(`本地预览：http://localhost:${PORT}  （AI 导师：${env.DEEPSEEK_API_KEY ? '已配置 Key' : '未配置 Key，先复制 .env.example 为 .env'}）`));
