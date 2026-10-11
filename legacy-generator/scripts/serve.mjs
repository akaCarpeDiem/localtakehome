import { createReadStream, existsSync, statSync } from "node:fs";
import { createServer } from "node:http";
import { extname, join, normalize } from "node:path";

const root = join(process.cwd(), "dist");
const port = Number(process.env.PORT || 43123);
const types = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".mjs": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".svg": "image/svg+xml",
  ".woff2": "font/woff2",
  ".txt": "text/plain; charset=utf-8",
};

function fileFor(urlPath) {
  const pathname = decodeURIComponent(new URL(urlPath, "http://127.0.0.1").pathname);
  const rel = normalize(pathname).replace(/^(\.\.(\/|\\|$))+/, "").replace(/^[/\\]+/, "");
  let file = join(root, rel);
  if (!file.startsWith(root)) return null;
  if (existsSync(file) && statSync(file).isDirectory()) file = join(file, "index.html");
  return file;
}

createServer((req, res) => {
  const file = fileFor(req.url || "/");
  if (!file || !existsSync(file) || statSync(file).isDirectory()) {
    res.writeHead(404, { "content-type": "text/html; charset=utf-8" });
    createReadStream(join(root, "404.html")).pipe(res);
    return;
  }
  res.writeHead(200, { "content-type": types[extname(file)] || "application/octet-stream" });
  createReadStream(file).pipe(res);
}).listen(port, "0.0.0.0", () => {
  console.log(`LocalTakehome http://127.0.0.1:${port}`);
});
