import http from "node:http";
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const moduleDir = path.dirname(fileURLToPath(import.meta.url));
const defaultRoot = path.resolve(moduleDir, "..");
const defaultConfigPath = path.join(defaultRoot, "local-runtime.config.json");

const mimeTypes = new Map([
  [".html", "text/html; charset=utf-8"],
  [".css", "text/css; charset=utf-8"],
  [".js", "application/javascript; charset=utf-8"],
  [".json", "application/json; charset=utf-8"],
  [".png", "image/png"],
  [".jpg", "image/jpeg"],
  [".jpeg", "image/jpeg"],
  [".svg", "image/svg+xml; charset=utf-8"],
  [".ico", "image/x-icon"],
]);

function normaliseApiBasePath(value) {
  const raw = typeof value === "string" && value.trim() ? value.trim() : "/api";
  const withLeadingSlash = raw.startsWith("/") ? raw : `/${raw}`;
  return withLeadingSlash.replace(/\/+$/, "") || "/api";
}

function normaliseOriginHost(value) {
  const raw = typeof value === "string" && value.trim() ? value.trim() : "localhost";
  try {
    const parsed = raw.includes("://") ? new URL(raw) : new URL(`http://${raw}`);
    return parsed.hostname || "localhost";
  } catch {
    return "localhost";
  }
}

function normalisePort(value) {
  if (value === undefined || value === null || value === "") return 0;
  const port = Number(value);
  if (!Number.isInteger(port) || port < 0 || port > 65535) return 0;
  return port;
}

export async function loadLocalRuntimeConfig(configPath = defaultConfigPath) {
  let parsed = {};
  try {
    parsed = JSON.parse(await fs.readFile(configPath, "utf8"));
  } catch (error) {
    if (error.code !== "ENOENT") throw error;
  }

  return {
    apiBasePath: normaliseApiBasePath(parsed.apiBasePath),
    origin: normaliseOriginHost(parsed.origin),
    port: normalisePort(parsed.port),
  };
}

export function getBrowserRuntimeConfig(config) {
  return {
    apiBasePath: config.apiBasePath,
    origin: config.origin,
  };
}

function sendJson(res, statusCode, body, headers = {}) {
  res.writeHead(statusCode, {
    "content-type": "application/json; charset=utf-8",
    ...headers,
  });
  res.end(JSON.stringify(body));
}

function corsHeaders(requestOrigin, allowedOrigin) {
  if (requestOrigin !== allowedOrigin) return null;
  return {
    "access-control-allow-headers": "content-type, authorization",
    "access-control-allow-methods": "GET, OPTIONS",
    "access-control-allow-origin": allowedOrigin,
    "access-control-max-age": "600",
    vary: "Origin",
  };
}

function resolveStaticPath(root, pathname) {
  const requested = pathname === "/" ? "/index.html" : decodeURIComponent(pathname);
  const safeRelative = requested.split("/").filter(Boolean).join(path.sep);
  const filePath = path.resolve(root, safeRelative);
  if (filePath !== root && !filePath.startsWith(`${root}${path.sep}`)) return null;
  return filePath;
}

export async function createLocalRuntimeServer(options = {}) {
  const root = path.resolve(options.root || defaultRoot);
  const config = options.config || await loadLocalRuntimeConfig(options.configPath);
  const requests = [];
  let activePort = null;
  let activeOrigin = null;

  const server = http.createServer(async (req, res) => {
    requests.push({
      method: req.method || "GET",
      origin: req.headers.origin || null,
      url: req.url || "/",
    });
    const requestUrl = new URL(req.url || "/", activeOrigin || `http://${config.origin}`);
    const isApiRequest = requestUrl.pathname === `${config.apiBasePath}/runtime-config`;

    if (isApiRequest) {
      const origin = req.headers.origin;
      const headers = origin ? corsHeaders(origin, activeOrigin) : { vary: "Origin" };

      if (req.method === "OPTIONS") {
        if (!headers) return sendJson(res, 403, { success: false, error: "Origin is not allowed" });
        res.writeHead(204, headers);
        res.end();
        return;
      }

      if (!["GET", "HEAD"].includes(req.method || "GET")) {
        return sendJson(res, 405, { success: false, error: "Method is not allowed" }, headers || {});
      }

      if (origin && !headers) {
        return sendJson(res, 403, { success: false, error: "Origin is not allowed" });
      }

      const body = {
        ...getBrowserRuntimeConfig(config),
        port: activePort,
      };
      if (req.method === "HEAD") {
        res.writeHead(200, {
          "content-type": "application/json; charset=utf-8",
          ...(headers || {}),
        });
        res.end();
        return;
      }
      return sendJson(res, 200, body, headers || {});
    }

    if (!["GET", "HEAD"].includes(req.method || "GET")) {
      return sendJson(res, 405, { success: false, error: "Method is not allowed" });
    }

    const filePath = resolveStaticPath(root, requestUrl.pathname);
    if (!filePath) return sendJson(res, 403, { success: false, error: "Path is not allowed" });

    try {
      const data = await fs.readFile(filePath);
      res.writeHead(200, {
        "content-type": mimeTypes.get(path.extname(filePath).toLowerCase()) || "application/octet-stream",
      });
      if (req.method === "HEAD") {
        res.end();
      } else {
        res.end(data);
      }
    } catch (error) {
      const statusCode = error.code === "ENOENT" ? 404 : 500;
      sendJson(res, statusCode, {
        success: false,
        error: statusCode === 404 ? "Not found" : "Unable to read file",
      });
    }
  });

  const ready = new Promise((resolve, reject) => {
    server.once("error", reject);
    server.listen(config.port, config.origin, () => {
      const address = server.address();
      activePort = typeof address === "object" && address ? address.port : config.port;
      activeOrigin = `http://${config.origin}:${activePort}`;
      resolve();
    });
  });

  await ready;

  return {
    config,
    get origin() {
      return new URL(activeOrigin);
    },
    get port() {
      return activePort;
    },
    ready,
    requests,
    server,
    get url() {
      return `${activeOrigin}/`;
    },
    close() {
      return new Promise((resolve, reject) => {
        server.close((error) => {
          if (error) reject(error);
          else resolve();
        });
      });
    },
  };
}

async function main() {
  const runtime = await createLocalRuntimeServer();
  console.log(`Baidu Dedupe Backup local runtime: ${runtime.url}`);
}

if (
  typeof process !== "undefined"
  && Array.isArray(process.argv)
  && process.argv[1]
  && import.meta.url === pathToFileURL(process.argv[1]).href
) {
  main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
  });
}
