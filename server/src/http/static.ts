import { createReadStream } from "node:fs";
import { existsSync } from "node:fs";
import { stat } from "node:fs/promises";
import { extname, join, normalize, resolve } from "node:path";

import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";

const CONTENT_TYPES = new Map<string, string>([
  [".css", "text/css; charset=utf-8"],
  [".html", "text/html; charset=utf-8"],
  [".js", "text/javascript; charset=utf-8"],
  [".json", "application/json; charset=utf-8"],
  [".svg", "image/svg+xml"],
  [".ico", "image/x-icon"],
  [".png", "image/png"],
  [".jpg", "image/jpeg"],
  [".jpeg", "image/jpeg"],
  [".webp", "image/webp"],
  [".map", "application/json; charset=utf-8"]
]);

export interface StaticWebAppOptions {
  webDistDir: string;
}

export function registerStaticWebApp(app: FastifyInstance, options: StaticWebAppOptions): void {
  const webDistDir = resolve(options.webDistDir);
  const indexHtmlPath = join(webDistDir, "index.html");

  if (!existsSync(indexHtmlPath)) {
    app.log.warn({ webDistDir }, "web/dist is unavailable; static dashboard serving is disabled");
    return;
  }

  app.get("/", async (_request, reply) => {
    await sendFile(reply, indexHtmlPath);
  });

  app.get("/*", async (request, reply) => {
    if (isBackendPath(request)) {
      reply.callNotFound();
      return;
    }

    const targetPath = resolveStaticPath(webDistDir, request.params as { "*": string | undefined });
    if (targetPath && (await fileExists(targetPath))) {
      await sendFile(reply, targetPath);
      return;
    }

    await sendFile(reply, indexHtmlPath);
  });
}

function isBackendPath(request: FastifyRequest): boolean {
  const path = request.url.split("?")[0] ?? "/";
  return path === "/health" || path.startsWith("/api/") || path.startsWith("/ws/");
}

function resolveStaticPath(webDistDir: string, params: { "*": string | undefined }): string | undefined {
  const rawPath = params["*"];
  if (!rawPath) {
    return undefined;
  }

  const normalized = normalize(rawPath).replace(/^(\.\.(\/|\\|$))+/, "");
  const resolvedPath = resolve(webDistDir, normalized);

  if (!resolvedPath.startsWith(webDistDir)) {
    return undefined;
  }

  return resolvedPath;
}

async function fileExists(path: string): Promise<boolean> {
  try {
    const metadata = await stat(path);
    return metadata.isFile();
  } catch {
    return false;
  }
}

async function sendFile(reply: FastifyReply, path: string): Promise<void> {
  const extension = extname(path).toLowerCase();
  const contentType = CONTENT_TYPES.get(extension) ?? "application/octet-stream";

  reply.header("content-type", contentType);
  return reply.send(createReadStream(path));
}
