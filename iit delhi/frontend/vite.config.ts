import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import fs from "node:fs";
import path from "node:path";
import { defineConfig, type Plugin, type ViteDevServer } from "vite";

// Optional local-dev plugins (not available on Vercel/CI)
let jsxLocPlugin: (() => Plugin) | null = null;
let vitePluginManusRuntime: (() => Plugin) | null = null;
try { jsxLocPlugin = (await import("@builder.io/vite-plugin-jsx-loc")).jsxLocPlugin; } catch { /* not installed in CI */ }
try { vitePluginManusRuntime = (await import("vite-plugin-manus-runtime")).vitePluginManusRuntime; } catch { /* not installed in CI */ }

// =============================================================================
// Manus Debug Collector - Vite Plugin
// Writes browser logs directly to files, trimmed when exceeding size limit
// =============================================================================

const PROJECT_ROOT = import.meta.dirname;
const LOG_DIR = path.join(PROJECT_ROOT, ".manus-logs");
const MAX_LOG_SIZE_BYTES = 1 * 1024 * 1024; // 1MB per log file
const TRIM_TARGET_BYTES = Math.floor(MAX_LOG_SIZE_BYTES * 0.6); // Trim to 60% to avoid constant re-trimming

type LogSource = "browserConsole" | "networkRequests" | "sessionReplay";

function ensureLogDir() {
  if (!fs.existsSync(LOG_DIR)) {
    fs.mkdirSync(LOG_DIR, { recursive: true });
  }
}

function trimLogFile(logPath: string, maxSize: number) {
  try {
    if (!fs.existsSync(logPath) || fs.statSync(logPath).size <= maxSize) {
      return;
    }

    const lines = fs.readFileSync(logPath, "utf-8").split("\n");
    const keptLines: string[] = [];
    let keptBytes = 0;

    // Keep newest lines (from end) that fit within 60% of maxSize
    const targetSize = TRIM_TARGET_BYTES;
    for (let i = lines.length - 1; i >= 0; i--) {
      const lineBytes = Buffer.byteLength(`${lines[i]}\n`, "utf-8");
      if (keptBytes + lineBytes > targetSize) break;
      keptLines.unshift(lines[i]);
      keptBytes += lineBytes;
    }

    fs.writeFileSync(logPath, keptLines.join("\n"), "utf-8");
  } catch {
    /* ignore trim errors */
  }
}

function writeToLogFile(source: LogSource, entries: unknown[]) {
  if (entries.length === 0) return;

  ensureLogDir();
  const logPath = path.join(LOG_DIR, `${source}.log`);

  // Format entries with timestamps
  const lines = entries.map(entry => {
    const ts = new Date().toISOString();
    return `[${ts}] ${JSON.stringify(entry)}`;
  });

  // Append to log file
  fs.appendFileSync(logPath, lines.join("\n") + "\n", "utf-8");

  // Trim if exceeds max size
  trimLogFile(logPath, MAX_LOG_SIZE_BYTES);
}

/**
 * Vite plugin that exposes an endpoint for the browser agent to flush logs.
 */
function vitePluginManusDebugCollector(): Plugin {
  return {
    name: "vite-plugin-manus-debug-collector",
    configureServer(server: ViteDevServer) {
      server.middlewares.use("/__manus_debug_log", (req, res) => {
        if (req.method !== "POST") {
          res.statusCode = 405;
          res.end("Method Not Allowed");
          return;
        }

        let body = "";
        req.on("data", chunk => {
          body += chunk.toString();
        });

        req.on("end", () => {
          try {
            const data = JSON.parse(body);
            const { source, entries } = data as {
              source: LogSource;
              entries: unknown[];
            };

            if (
              [
                "browserConsole",
                "networkRequests",
                "sessionReplay",
              ].includes(source) &&
              Array.isArray(entries)
            ) {
              writeToLogFile(source, entries);
              res.statusCode = 200;
              res.end("OK");
            } else {
              res.statusCode = 400;
              res.end("Invalid payload");
            }
          } catch {
            res.statusCode = 400;
            res.end("JSON parse error");
          }
        });
      });
    },
  };
}

/**
 * Vite plugin that proxies storage requests to the manus storage service.
 */
function vitePluginStorageProxy(): Plugin {
  return {
    name: "vite-plugin-storage-proxy",
    configureServer(server: ViteDevServer) {
      server.middlewares.use("/storage/", async (req, res) => {
        const objectPath = req.url?.replace(/^\//, "");
        if (!objectPath) {
          res.writeHead(400, { "Content-Type": "text/plain" });
          res.end("Missing object path");
          return;
        }

        const forgeUrl =
          process.env.BUILT_IN_FORGE_API_URL || "http://localhost:3000";
        const token = process.env.FORGE_AUTH_TOKEN || "";

        try {
          const forgeResp = await fetch(`${forgeUrl}/api/storage/read-url`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify({ objectPath }),
          });

          if (!forgeResp.ok) {
            res.writeHead(forgeResp.status, { "Content-Type": "text/plain" });
            res.end("Storage backend error");
            return;
          }

          const { url } = (await forgeResp.json()) as { url: string };
          if (!url) {
            res.writeHead(502, { "Content-Type": "text/plain" });
            res.end("Empty signed URL");
            return;
          }

          res.writeHead(307, { Location: url, "Cache-Control": "no-store" });
          res.end();
        } catch {
          res.writeHead(502, { "Content-Type": "text/plain" });
          res.end("Storage proxy error");
        }
      });
    },
  };
}

const plugins: Plugin[] = [
  react(),
  tailwindcss(),
  ...(jsxLocPlugin ? [jsxLocPlugin()] : []),
  ...(vitePluginManusRuntime ? [vitePluginManusRuntime()] : []),
  vitePluginManusDebugCollector(),
  vitePluginStorageProxy(),
];

export default defineConfig({
  plugins,
  resolve: {
    alias: {
      "@": path.resolve(import.meta.dirname, "src"),
    },
  },
  envDir: path.resolve(import.meta.dirname),
  root: path.resolve(import.meta.dirname),
  build: {
    outDir: path.resolve(import.meta.dirname, "dist"),
    emptyOutDir: true,
    rollupOptions: {
      output: {
        manualChunks: {
          three: ["three"],
          fiber: ["@react-three/fiber"],
        },
      },
    },
  },
  server: {
    port: 3000,
    strictPort: false,
    host: true,
    allowedHosts: [
      ".manuspre.computer",
      ".manus.computer",
      ".manus-asia.computer",
      ".manuscomputer.ai",
      ".manusvm.computer",
      "localhost",
      "127.0.0.1",
    ],
    fs: {
      strict: true,
      deny: ["**/.*"],
    },
    proxy: {
      "/api": {
        target: "http://localhost:5000",
        changeOrigin: true,
      },
    },
  },
});
