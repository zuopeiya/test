const http = require("node:http");
const fs = require("node:fs/promises");
const path = require("node:path");

const PORT = Number(process.env.FRONTEND_PORT || 5173);
const ROOT = __dirname;
const MIME_TYPES = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".png": "image/png",
  ".svg": "image/svg+xml; charset=utf-8"
};

process.stdout.on("error", () => {});
process.stderr.on("error", () => {});

const log = (message) => {
  try {
    console.log(message);
  } catch {
    // Some desktop launchers close stdout after detaching the process.
  }
};

const resolveFile = (urlPath) => {
  const safePath = path.normalize(decodeURIComponent(urlPath)).replace(/^(\.\.[/\\])+/, "");
  const candidate = path.join(ROOT, safePath === "/" ? "index.html" : safePath);
  return candidate.startsWith(ROOT) ? candidate : path.join(ROOT, "index.html");
};

const serve = async (req, res) => {
  const url = new URL(req.url, `http://${req.headers.host}`);
  const filePath = resolveFile(url.pathname);

  try {
    const content = await fs.readFile(filePath);
    res.writeHead(200, {
      "Content-Type": MIME_TYPES[path.extname(filePath)] || "application/octet-stream"
    });
    res.end(content);
  } catch {
    const fallback = await fs.readFile(path.join(ROOT, "index.html"));
    res.writeHead(200, { "Content-Type": MIME_TYPES[".html"] });
    res.end(fallback);
  }
};

if (process.argv.includes("--check")) {
  fs.access(path.join(ROOT, "index.html"))
    .then(() => console.log("Frontend check passed."))
    .catch((error) => {
      console.error(error.message);
      process.exitCode = 1;
    });
} else {
  http.createServer(serve).listen(PORT, () => {
    log(`Personal card frontend running at http://localhost:${PORT}`);
  });
}
