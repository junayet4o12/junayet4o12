#!/usr/bin/env node
"use strict";

const http = require("http");
const fs = require("fs");
const path = require("path");
const { Marked } = require("marked");
const { gfmHeadingId } = require("marked-gfm-heading-id");

const ROOT = path.resolve(__dirname, "..");
const README = path.join(ROOT, "README.md");
const HOST = process.env.HOST || "0.0.0.0";
const PORT = Number(process.env.PORT) || 3000;

const marked = new Marked({ gfm: true, breaks: false });
marked.use(gfmHeadingId());

function githubMarkdownCss() {
  try {
    return fs.readFileSync(
      require.resolve("github-markdown-css/github-markdown.css"),
      "utf8"
    );
  } catch {
    return "";
  }
}

function renderReadme() {
  const md = fs.readFileSync(README, "utf8");
  const body = marked.parse(md);
  const css = githubMarkdownCss();
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>Profile README preview</title>
<style>
${css}
body { margin: 0; background: #0d1117; }
.markdown-body {
  box-sizing: border-box;
  min-width: 200px;
  max-width: 980px;
  margin: 0 auto;
  padding: 45px;
}
</style>
</head>
<body>
<article class="markdown-body" data-color-mode="dark" data-dark-theme="dark">
${body}
</article>
</body>
</html>`;
}

const CONTENT_TYPES = {
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".png": "image/png",
  ".gif": "image/gif",
  ".svg": "image/svg+xml",
  ".webp": "image/webp",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
};

function serveStatic(req, res) {
  const urlPath = decodeURIComponent(req.url.split("?")[0]);
  const filePath = path.normalize(path.join(ROOT, urlPath));
  if (!filePath.startsWith(ROOT)) {
    res.writeHead(403).end("Forbidden");
    return;
  }
  fs.readFile(filePath, (err, data) => {
    if (err) {
      res.writeHead(404, { "Content-Type": "text/plain" }).end("Not found");
      return;
    }
    const type = CONTENT_TYPES[path.extname(filePath).toLowerCase()] ||
      "application/octet-stream";
    res.writeHead(200, { "Content-Type": type }).end(data);
  });
}

if (process.argv.includes("--render-only")) {
  const outDir = path.join(ROOT, "dist");
  fs.mkdirSync(outDir, { recursive: true });
  fs.writeFileSync(path.join(outDir, "index.html"), renderReadme());
  console.log(`Rendered README.md -> ${path.join(outDir, "index.html")}`);
  process.exit(0);
}

const server = http.createServer((req, res) => {
  const urlPath = req.url.split("?")[0];
  if (urlPath === "/" || urlPath === "/index.html") {
    try {
      res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
      res.end(renderReadme());
    } catch (err) {
      res.writeHead(500, { "Content-Type": "text/plain" });
      res.end(`Failed to render README.md: ${err.message}`);
    }
    return;
  }
  serveStatic(req, res);
});

server.listen(PORT, HOST, () => {
  console.log(`Profile README preview running at http://${HOST}:${PORT}`);
  console.log("Rendering README.md as GitHub-flavored Markdown. Ctrl+C to stop.");
});
