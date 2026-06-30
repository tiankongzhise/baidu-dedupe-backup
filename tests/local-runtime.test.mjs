import assert from "node:assert/strict";
import fs from "node:fs";
import http from "node:http";
import vm from "node:vm";

import {
  createLocalRuntimeServer,
  getBrowserRuntimeConfig,
  loadLocalRuntimeConfig,
} from "../tools/local-runtime.mjs";

const tests = [];

function test(name, fn) {
  tests.push({ fn, name });
}

function request(url, options = {}) {
  return new Promise((resolve, reject) => {
    const req = http.request(url, options, (res) => {
      let body = "";
      res.setEncoding("utf8");
      res.on("data", (chunk) => {
        body += chunk;
      });
      res.on("end", () => {
        resolve({ body, headers: res.headers, statusCode: res.statusCode });
      });
    });
    req.on("error", reject);
    req.end();
  });
}

test("local runtime config defaults to localhost and same-origin API path", async () => {
  const config = await loadLocalRuntimeConfig();

  assert.equal(config.origin, "localhost");
  assert.equal(config.apiBasePath, "/api");
  assert.equal(config.port, 0);
  assert.deepEqual(getBrowserRuntimeConfig(config), {
    apiBasePath: "/api",
    origin: "localhost",
  });
});

test("local runtime server keeps one system-selected port during the process", async () => {
  const runtime = await createLocalRuntimeServer();
  try {
    assert.equal(runtime.origin.hostname, "localhost");
    assert.equal(runtime.config.port, 0);
    assert.equal(Number.isInteger(runtime.port), true);
    assert.equal(runtime.port > 0, true);
    assert.equal(runtime.url, `http://localhost:${runtime.port}/`);

    const firstPort = runtime.port;
    await runtime.ready;
    assert.equal(runtime.port, firstPort);
  } finally {
    await runtime.close();
  }
});

test("API is reachable through same-origin path and allows only the active origin", async () => {
  const runtime = await createLocalRuntimeServer();
  try {
    const allowedOrigin = runtime.url.slice(0, -1);
    const response = await request(`${runtime.url}api/runtime-config`, {
      headers: { Origin: allowedOrigin },
    });

    assert.equal(response.statusCode, 200);
    assert.equal(response.headers["access-control-allow-origin"], allowedOrigin);
    assert.equal(response.headers.vary, "Origin");
    assert.deepEqual(JSON.parse(response.body), {
      apiBasePath: "/api",
      origin: "localhost",
      port: runtime.port,
    });

    const denied = await request(`${runtime.url}api/runtime-config`, {
      headers: { Origin: "http://127.0.0.1:4173" },
    });

    assert.equal(denied.statusCode, 403);
    assert.equal(denied.headers["access-control-allow-origin"], undefined);
    assert.deepEqual(runtime.requests.map((entry) => entry.url), [
      "/api/runtime-config",
      "/api/runtime-config",
    ]);
  } finally {
    await runtime.close();
  }
});

test("prototype frontend uses a same-origin API helper", async () => {
  const source = fs.readFileSync(new URL("../prototype/assets/prototype.js", import.meta.url), "utf8");
  const requestedUrls = [];
  const sandbox = {
    console,
    document: null,
    fetch: async (url) => {
      requestedUrls.push(url);
      return {
        ok: true,
        json: async () => ({ apiBasePath: "/api", origin: "localhost", port: 49152 }),
      };
    },
    window: {
      location: {
        origin: "http://localhost:49152",
        protocol: "http:",
      },
    },
  };

  vm.createContext(sandbox);
  vm.runInContext(source, sandbox);

  const api = sandbox.window.BaiduDedupePrototype;
  assert.equal(api.apiUrl("/runtime-config"), "/api/runtime-config");
  assert.equal(api.apiUrl("runtime-config"), "/api/runtime-config");

  const config = await api.loadRuntimeConfig();
  assert.equal(config.apiBasePath, "/api");
  assert.equal(config.origin, "localhost");
  assert.equal(config.port, 49152);
  assert.deepEqual(requestedUrls, ["/api/runtime-config"]);
});

test("launcher page loads the shared runtime script", () => {
  const html = fs.readFileSync(new URL("../index.html", import.meta.url), "utf8");

  assert.match(html, /src="prototype\/assets\/prototype\.js"/);
});

for (const { fn, name } of tests) {
  try {
    await fn();
    console.log(`ok - ${name}`);
  } catch (error) {
    console.error(`not ok - ${name}`);
    console.error(error.stack || error.message);
    process.exitCode = 1;
  }
}
