import http from "node:http";
import fs from "node:fs/promises";
import path from "node:path";
import { createHash } from "node:crypto";
import { fileURLToPath } from "node:url";

import {
  buildModelForPrompt,
  createLearningContent,
  detectFromImage,
  summarizeForTraining,
} from "./src/pipeline.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const publicDir = path.join(__dirname, "public");
const logsDir = path.join(__dirname, "logs");
const clientLogFile = path.join(logsDir, "client-events.log");
const generatedDir = path.join(__dirname, "generated");
const envFile = path.join(__dirname, ".env");

await loadEnvFile(envFile);

const port = Number(process.env.PORT || 3000);

const server = http.createServer(async (req, res) => {
  try {
    const url = new URL(req.url, `http://${req.headers.host}`);

    if (req.method === "GET" && url.pathname === "/api/health") {
      return sendJson(res, 200, {
        ok: true,
        openAiConfigured: Boolean(process.env.OPENAI_API_KEY),
      });
    }

    if (req.method === "GET" && url.pathname === "/") {
      return serveStaticFrom(res, publicDir, "/index.html");
    }

    if (req.method === "GET" && url.pathname === "/index.html") {
      return serveStaticFrom(res, publicDir, "/index.html");
    }

    if (req.method === "GET" && url.pathname === "/app.js") {
      return serveStaticFrom(res, publicDir, "/app.js");
    }

    if (req.method === "GET" && url.pathname === "/styles.css") {
      return serveStaticFrom(res, publicDir, "/styles.css");
    }

    if (req.method === "GET" && url.pathname === "/ping") {
      return sendText(res, 200, "pong");
    }

    if (req.method === "GET" && url.pathname === "/status") {
      return sendText(
        res,
        200,
        [
          "NexEras 3D pipeline is running.",
          `UI: http://127.0.0.1:${port}`,
          `Health: http://127.0.0.1:${port}/api/health`,
          `Ping: http://127.0.0.1:${port}/ping`,
          `Generated: ${generatedDir}`,
        ].join("\n")
      );
    }

    if (req.method === "POST" && url.pathname === "/api/generate") {
      const body = await readJson(req);
      const prompt = typeof body.prompt === "string" ? body.prompt.trim() : "";
      const imageDataUrl = typeof body.imageDataUrl === "string" ? body.imageDataUrl : "";

      await appendLog(
        "server",
        JSON.stringify({
          event: "generate_request",
          prompt,
          hasImage: Boolean(imageDataUrl),
          at: new Date().toISOString(),
        })
      );

      if (!prompt && !imageDataUrl) {
        return sendJson(res, 400, { error: "Provide either a prompt or an image." });
      }

      const artifact = imageDataUrl
        ? await detectFromImage({ imageDataUrl, prompt })
        : await buildModelForPrompt(prompt);

      const id = createHash("sha1")
        .update(JSON.stringify({ prompt, imageDataUrl, type: artifact.objectType, ts: Date.now() }))
        .digest("hex")
        .slice(0, 12);

      const learning = await createLearningContent(artifact);
      const summary = await summarizeForTraining(artifact);
      const modelBase64 = artifact.modelUrl.split(",")[1];
      await fs.mkdir(generatedDir, { recursive: true });
      await fs.writeFile(path.join(generatedDir, `${id}.glb`), Buffer.from(modelBase64, "base64"));

      await appendLog(
        "server",
        JSON.stringify({
          event: "generate_success",
          objectType: artifact.objectType,
          id,
          at: new Date().toISOString(),
        })
      );

      return sendJson(res, 200, {
        id,
        ...artifact,
        viewerUrl: `/generated/${id}.glb`,
        summary,
        learning,
      });
    }

    if (req.method === "POST" && url.pathname === "/api/client-log") {
      const body = await readJson(req);
      await appendLog("client", JSON.stringify({ ...body, at: new Date().toISOString() }));
      return sendJson(res, 200, { ok: true });
    }

    if (req.method === "GET") {
      if (url.pathname.startsWith("/generated/")) {
        const generatedPath = url.pathname.replace("/generated/", "");
        return serveStaticFrom(res, generatedDir, generatedPath);
      }

      return serveStatic(res, url.pathname);
    }

    sendJson(res, 404, { error: "Not found" });
  } catch (error) {
    console.error(error);
    sendJson(res, 500, { error: error.message || "Internal server error" });
  }
});

server.listen(port, () => {
  console.log(`NexEras 3D pipeline running at http://localhost:${port}`);
});

async function serveStatic(res, pathname) {
  return serveStaticFrom(res, publicDir, pathname === "/" ? "/index.html" : pathname);
}

async function serveStaticFrom(res, baseDir, pathname) {
  const filePath = path.normalize(path.join(baseDir, pathname));

  if (!filePath.startsWith(baseDir)) {
    return sendJson(res, 403, { error: "Forbidden" });
  }

  try {
    const data = await fs.readFile(filePath);
    res.writeHead(200, {
      "Content-Type": contentType(path.extname(filePath)),
      "Cache-Control": "no-store",
    });
    res.end(data);
  } catch {
    sendJson(res, 404, { error: "Not found" });
  }
}

async function readJson(req) {
  const chunks = [];
  for await (const chunk of req) {
    chunks.push(chunk);
  }

  const raw = Buffer.concat(chunks).toString("utf8");
  return raw ? JSON.parse(raw) : {};
}

async function appendLog(kind, line) {
  await fs.mkdir(logsDir, { recursive: true });
  await fs.appendFile(clientLogFile, `[${kind}] ${line}\n`, "utf8");
}

function sendJson(res, statusCode, payload) {
  res.writeHead(statusCode, {
    "Content-Type": "application/json; charset=utf-8",
    "Cache-Control": "no-store",
  });
  res.end(JSON.stringify(payload));
}

function sendText(res, statusCode, payload) {
  res.writeHead(statusCode, {
    "Content-Type": "text/plain; charset=utf-8",
    "Cache-Control": "no-store",
  });
  res.end(payload);
}

function contentType(ext) {
  switch (ext) {
    case ".html":
      return "text/html; charset=utf-8";
    case ".css":
      return "text/css; charset=utf-8";
    case ".js":
      return "application/javascript; charset=utf-8";
    case ".json":
      return "application/json; charset=utf-8";
    case ".glb":
      return "model/gltf-binary";
    default:
      return "application/octet-stream";
  }
}

async function loadEnvFile(filePath) {
  try {
    const raw = await fs.readFile(filePath, "utf8");
    for (const line of raw.split(/\r?\n/)) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) {
        continue;
      }
      const separator = trimmed.indexOf("=");
      if (separator === -1) {
        continue;
      }
      const key = trimmed.slice(0, separator).trim();
      const value = trimmed.slice(separator + 1).trim();
      if (key && process.env[key] === undefined) {
        process.env[key] = value;
      }
    }
  } catch {
    // Optional local env file.
  }
}
