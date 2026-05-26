import http from "node:http";
import fs from "node:fs";
import path from "node:path";

const folder = process.argv[2] || "dist";
const port = Number(process.env.PORT || process.argv[3] || 4173);
const root = path.resolve(process.cwd(), folder);
const types = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".webp": "image/webp",
  ".gif": "image/gif",
  ".svg": "image/svg+xml"
};
const fallbackConfig = {
  supabaseUrl: "https://rawpuvxrexgfsrgjtcep.supabase.co",
  supabaseAnonKey: "sb_publishable_iAMpHKfFKawzaFOSzalT9w_yA7_nIR8",
  appUrl: "https://nakaru-san.com",
  instagramAuthUrl: ""
};

function publicConfig() {
  return {
    supabaseUrl: process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || fallbackConfig.supabaseUrl,
    supabaseAnonKey: process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY || process.env.SUPABASE_PUBLISHABLE_KEY || fallbackConfig.supabaseAnonKey,
    appUrl: process.env.VITE_APP_URL || process.env.APP_URL || fallbackConfig.appUrl,
    instagramAuthUrl: process.env.VITE_INSTAGRAM_AUTH_URL || process.env.INSTAGRAM_AUTH_URL || fallbackConfig.instagramAuthUrl
  };
}

function sendFile(response, target) {
  fs.readFile(target, (error, data) => {
    if (error) {
      response.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" });
      response.end("Not found");
      return;
    }

    response.writeHead(200, {
      "Content-Type": types[path.extname(target).toLowerCase()] || "application/octet-stream",
      "Cache-Control": path.basename(target) === "index.html" ? "no-cache" : "public, max-age=300"
    });
    response.end(data);
  });
}

http.createServer((request, response) => {
  const url = new URL(request.url || "/", "http://localhost");
  let file = decodeURIComponent(url.pathname).replace(/^\/+/, "");
  if (!file) file = "index.html";

  if (file === "config.js") {
    response.writeHead(200, {
      "Content-Type": "text/javascript; charset=utf-8",
      "Cache-Control": "no-store, max-age=0"
    });
    response.end(`window.NAKARU_CONFIG = ${JSON.stringify(publicConfig(), null, 2)};\n`);
    return;
  }

  const normalizedFile = path.normalize(file);
  const target = path.resolve(root, normalizedFile);
  if (!target.startsWith(root)) {
    response.writeHead(403);
    response.end("Forbidden");
    return;
  }

  fs.readFile(target, (error, data) => {
    if (!error) {
      response.writeHead(200, {
        "Content-Type": types[path.extname(target).toLowerCase()] || "application/octet-stream",
        "Cache-Control": path.basename(target) === "index.html" ? "no-cache" : "public, max-age=300"
      });
      response.end(data);
      return;
    }

    const extension = path.extname(file).toLowerCase();
    if (extension) {
      const publicTarget = path.resolve(process.cwd(), "public", normalizedFile);
      const rootTarget = path.resolve(process.cwd(), normalizedFile);
      if (publicTarget.startsWith(path.resolve(process.cwd(), "public"))) {
        fs.access(publicTarget, fs.constants.R_OK, (publicError) => {
          if (!publicError) {
            sendFile(response, publicTarget);
            return;
          }
          if (rootTarget.startsWith(process.cwd())) {
            sendFile(response, rootTarget);
            return;
          }
          response.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" });
          response.end("Not found");
        });
        return;
      }
      response.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" });
      response.end("Not found");
      return;
    }

    sendFile(response, path.join(root, "index.html"));
  });
}).listen(port, "0.0.0.0", () => {
  console.log(`Nakaru-San web service running on port ${port}`);
});
