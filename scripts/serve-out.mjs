/**
 * Minimal static server for the exported `out/` directory — used only by the
 * Playwright E2E suite. Honours `trailingSlash: true` (serves `<dir>/index.html`)
 * and an optional BASE_PATH prefix so tests can mirror the GitHub Pages layout.
 *
 *   PORT=4173 BASE_PATH=/info-for-all node scripts/serve-out.mjs
 */
import { createServer } from "node:http";
import { readFile, stat } from "node:fs/promises";
import { extname, join, normalize } from "node:path";
import { fileURLToPath } from "node:url";
import { dirname } from "node:path";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..", "out");
const PORT = Number(process.env.PORT || 4173);
const BASE = (process.env.BASE_PATH || "").replace(/\/$/, "");

const TYPES = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".txt": "text/plain; charset=utf-8",
  ".svg": "image/svg+xml",
  ".ico": "image/x-icon",
  ".png": "image/png",
  ".webmanifest": "application/manifest+json",
  ".woff2": "font/woff2",
};

async function tryFiles(pathname) {
  const candidates = [
    join(ROOT, pathname),
    join(ROOT, pathname, "index.html"),
    join(ROOT, pathname.replace(/\/$/, "") + ".html"),
  ];
  for (const c of candidates) {
    const safe = normalize(c);
    if (!safe.startsWith(ROOT)) continue;
    try {
      const s = await stat(safe);
      if (s.isFile()) return safe;
    } catch {
      /* next */
    }
  }
  return null;
}

const server = createServer(async (req, res) => {
  let pathname = decodeURIComponent(new URL(req.url, "http://x").pathname);
  if (BASE && pathname.startsWith(BASE)) pathname = pathname.slice(BASE.length) || "/";
  else if (BASE && pathname === "") pathname = "/";

  let file = await tryFiles(pathname);
  if (!file) file = await tryFiles("/404.html");
  if (!file) {
    res.writeHead(404).end("Not found");
    return;
  }
  try {
    const body = await readFile(file);
    res.writeHead(file.endsWith("404.html") ? 404 : 200, {
      "content-type": TYPES[extname(file)] || "application/octet-stream",
      "cache-control": "no-store",
    });
    res.end(body);
  } catch {
    res.writeHead(500).end("error");
  }
});

server.listen(PORT, () => console.log(`serve-out: http://localhost:${PORT}${BASE}/  (root ${ROOT})`));
