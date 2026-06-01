import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import { createQrSvg } from "./qr-code.mjs";

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
  ".svg": "image/svg+xml",
  ".webmanifest": "application/manifest+json; charset=utf-8"
};
const fallbackConfig = {
  supabaseUrl: "https://rawpuvxrexgfsrgjtcep.supabase.co",
  supabaseAnonKey: "sb_publishable_iAMpHKfFKawzaFOSzalT9w_yA7_nIR8",
  appUrl: "https://nakaru-san.com",
  instagramAuthUrl: "",
  enabledSocialProviders: "",
  vapidPublicKey: ""
};

function publicConfig() {
  return {
    supabaseUrl: process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || fallbackConfig.supabaseUrl,
    supabaseAnonKey: process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY || process.env.SUPABASE_PUBLISHABLE_KEY || fallbackConfig.supabaseAnonKey,
    appUrl: process.env.VITE_APP_URL || process.env.APP_URL || fallbackConfig.appUrl,
    instagramAuthUrl: process.env.VITE_INSTAGRAM_AUTH_URL || process.env.INSTAGRAM_AUTH_URL || fallbackConfig.instagramAuthUrl,
    enabledSocialProviders: process.env.VITE_SOCIAL_AUTH_PROVIDERS || process.env.SOCIAL_AUTH_PROVIDERS || fallbackConfig.enabledSocialProviders,
    vapidPublicKey: process.env.VITE_VAPID_PUBLIC_KEY || process.env.VAPID_PUBLIC_KEY || fallbackConfig.vapidPublicKey
  };
}

function serverConfig() {
  return {
    ...publicConfig(),
    supabaseServiceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_KEY || "",
    vapidPrivateKey: process.env.VAPID_PRIVATE_KEY || "",
    vapidSubject: process.env.VAPID_SUBJECT || process.env.WEB_PUSH_SUBJECT || "mailto:support@nakaru-san.com"
  };
}

function sendJson(response, status, payload) {
  response.writeHead(status, {
    "Content-Type": "application/json; charset=utf-8",
    "Cache-Control": "no-store, max-age=0"
  });
  response.end(JSON.stringify(payload));
}

function readJsonBody(request, limit = 65536) {
  return new Promise((resolve, reject) => {
    let body = "";
    request.on("data", (chunk) => {
      body += chunk;
      if (body.length > limit) {
        reject(new Error("Request body is too large."));
        request.destroy();
      }
    });
    request.on("end", () => {
      try {
        resolve(body ? JSON.parse(body) : {});
      } catch {
        reject(new Error("Request body must be JSON."));
      }
    });
    request.on("error", reject);
  });
}

async function verifySupabaseUser(token, configValue) {
  if (!token || !configValue.supabaseUrl || !configValue.supabaseAnonKey) return null;
  const response = await fetch(`${configValue.supabaseUrl.replace(/\/$/, "")}/auth/v1/user`, {
    headers: {
      apikey: configValue.supabaseAnonKey,
      Authorization: `Bearer ${token}`
    }
  });
  if (!response.ok) return null;
  return response.json();
}

async function supabaseRest(configValue, table, query, options = {}) {
  const url = new URL(`${configValue.supabaseUrl.replace(/\/$/, "")}/rest/v1/${table}`);
  Object.entries(query || {}).forEach(([key, value]) => url.searchParams.set(key, value));
  const response = await fetch(url, {
    method: options.method || "GET",
    headers: {
      apikey: configValue.supabaseServiceRoleKey,
      Authorization: `Bearer ${configValue.supabaseServiceRoleKey}`,
      "Content-Type": "application/json",
      Prefer: options.prefer || ""
    },
    body: options.body ? JSON.stringify(options.body) : undefined
  });
  const text = await response.text();
  const data = text ? JSON.parse(text) : null;
  if (!response.ok) {
    const error = new Error(data?.message || `Supabase REST request failed with ${response.status}`);
    error.status = response.status;
    throw error;
  }
  return data;
}

async function handlePushNotification(request, response) {
  const configValue = serverConfig();
  if (!configValue.supabaseServiceRoleKey || !configValue.vapidPublicKey || !configValue.vapidPrivateKey) {
    sendJson(response, 503, { error: "Push sender is not configured yet." });
    return;
  }

  const token = String(request.headers.authorization || "").replace(/^Bearer\s+/i, "");
  const user = await verifySupabaseUser(token, configValue);
  if (!user?.id) {
    sendJson(response, 401, { error: "Not signed in." });
    return;
  }

  const body = await readJsonBody(request);
  const recipientId = String(body.recipientId || "").trim();
  if (!recipientId || recipientId === user.id) {
    sendJson(response, 400, { error: "A recipient is required." });
    return;
  }

  const subscriptions = await supabaseRest(configValue, "push_subscriptions", {
    select: "id,endpoint,subscription",
    user_id: `eq.${recipientId}`
  });

  const webPush = await import("web-push");
  webPush.default.setVapidDetails(configValue.vapidSubject, configValue.vapidPublicKey, configValue.vapidPrivateKey);

  const payload = JSON.stringify({
    title: String(body.title || "Nakaru-San"),
    body: String(body.body || "You have a new Nakaru-San notification."),
    type: String(body.type || "message"),
    tag: `nakaru-${String(body.type || "message")}-${String(body.refId || Date.now())}`,
    data: {
      page: String(body.page || "messages"),
      refId: String(body.refId || ""),
      type: String(body.type || "message")
    }
  });

  const results = await Promise.allSettled((subscriptions || []).map(async (item) => {
    try {
      await webPush.default.sendNotification(item.subscription, payload);
      return { id: item.id, sent: true };
    } catch (error) {
      if ([404, 410].includes(error?.statusCode)) {
        await supabaseRest(configValue, "push_subscriptions", { endpoint: `eq.${item.endpoint}` }, { method: "DELETE" });
      }
      throw error;
    }
  }));

  sendJson(response, 200, {
    ok: true,
    attempted: subscriptions?.length || 0,
    sent: results.filter((item) => item.status === "fulfilled").length
  });
}

function handlePushStatus(response) {
  const configValue = serverConfig();
  sendJson(response, 200, {
    hasSupabaseUrl: Boolean(configValue.supabaseUrl),
    hasSupabaseAnonKey: Boolean(configValue.supabaseAnonKey),
    hasSupabaseServiceRoleKey: Boolean(configValue.supabaseServiceRoleKey),
    hasVapidPublicKey: Boolean(configValue.vapidPublicKey),
    hasVapidPrivateKey: Boolean(configValue.vapidPrivateKey)
  });
}

function handleDownloadQr(request, response) {
  const configValue = publicConfig();
  const url = new URL(request.url || "/", "http://localhost");
  const target = String(url.searchParams.get("target") || `${(configValue.appUrl || "https://nakaru-san-site-1.onrender.com").replace(/\/$/, "")}/#download-app`);
  try {
    const svg = createQrSvg(target, { title: "Scan to download Nakaru-San", moduleSize: 12 });
    response.writeHead(200, {
      "Content-Type": "image/svg+xml; charset=utf-8",
      "Cache-Control": "no-store, max-age=0"
    });
    response.end(svg);
  } catch (error) {
    sendJson(response, 400, { error: error.message || "QR code could not be created." });
  }
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
      "Cache-Control": ["index.html", "service-worker.js", "manifest.webmanifest"].includes(path.basename(target)) ? "no-store, max-age=0" : "public, max-age=60"
    });
    response.end(data);
  });
}

http.createServer((request, response) => {
  const url = new URL(request.url || "/", "http://localhost");
  if (request.method === "OPTIONS" && url.pathname.startsWith("/api/")) {
    response.writeHead(204, {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET,POST,OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, Authorization"
    });
    response.end();
    return;
  }
  if (url.pathname === "/api/push-status") {
    handlePushStatus(response);
    return;
  }
  if (url.pathname === "/api/download-qr.svg") {
    handleDownloadQr(request, response);
    return;
  }
  if (url.pathname === "/api/push-notification") {
    if (request.method !== "POST") {
      sendJson(response, 405, { error: "Method not allowed." });
      return;
    }
    handlePushNotification(request, response).catch((error) => {
      console.error("Push notification route failed", error);
      sendJson(response, 500, { error: "Push notification could not be sent." });
    });
    return;
  }
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
      "Cache-Control": ["index.html", "service-worker.js", "manifest.webmanifest"].includes(path.basename(target)) ? "no-store, max-age=0" : "public, max-age=60"
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
