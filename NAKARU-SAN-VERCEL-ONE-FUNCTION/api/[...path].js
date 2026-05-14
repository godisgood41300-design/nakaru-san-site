import { createHash, randomBytes, randomUUID, scryptSync, timingSafeEqual } from "node:crypto";

const store = globalThis.__nakaruStore || {
  accounts: new Map(),
  sessions: new Map(),
  oauthStates: new Map(),
  users: new Map(),
  messages: new Map(),
  dms: new Map(),
  calls: new Map(),
  feed: []
};

if (!globalThis.__nakaruStore) {
  store.messages.set("Moonlit Lounge", [
    ["Ami", "The soundtrack has no business being this good."],
    ["Kairo", "Anyone staying for co-op after the episode?"],
    ["Mina", "New here. This room already feels comfortable."],
    ["Sora", "Spoiler shield saved me twice tonight."]
  ].map(([from, text]) => ({ id: randomUUID(), from, text, at: Date.now() })));
  store.dms.set("RaeArcade", [
    ["RaeArcade", "You joining the raid after credits?"],
    ["YukiKaze", "Yes. Save me a slot."]
  ].map(([from, text]) => ({ id: randomUUID(), from, text, at: Date.now() })));
  store.feed.push(
    { id: randomUUID(), from: "Ami", text: "Tonight's watch party is spoiler-safe. Drop your favorite opening themes.", youtubeUrl: "", image: "", at: Date.now() - 18000, appropriate: true },
    { id: randomUUID(), from: "RaeArcade", text: "Raid After Credits is open after the episode. Bring your builds.", youtubeUrl: "", image: "", at: Date.now() - 10000, appropriate: true }
  );
  globalThis.__nakaruStore = store;
}

const supabaseUrl = (process.env.SUPABASE_URL || "").replace(/\/$/, "");
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SECRET_KEY || "";
const bucket = process.env.SUPABASE_BUCKET || "nakaru-uploads";
const hasSupabase = Boolean(supabaseUrl && serviceKey);
const googleApiKey = process.env.GOOGLE_API_KEY || "";
const googleSearchEngineId = process.env.GOOGLE_CX || "";
const appBaseUrl = process.env.APP_BASE_URL || "";

const oauthProviders = {
  google: {
    name: "Google",
    clientId: process.env.GOOGLE_CLIENT_ID || "",
    clientSecret: process.env.GOOGLE_CLIENT_SECRET || "",
    authorizeUrl: "https://accounts.google.com/o/oauth2/v2/auth",
    tokenUrl: "https://oauth2.googleapis.com/token",
    profileUrl: "https://www.googleapis.com/oauth2/v3/userinfo",
    scope: "openid email profile"
  },
  facebook: {
    name: "Facebook",
    clientId: process.env.FACEBOOK_CLIENT_ID || "",
    clientSecret: process.env.FACEBOOK_CLIENT_SECRET || "",
    authorizeUrl: "https://www.facebook.com/v19.0/dialog/oauth",
    tokenUrl: "https://graph.facebook.com/v19.0/oauth/access_token",
    profileUrl: "https://graph.facebook.com/me?fields=id,name,email",
    scope: "email,public_profile"
  },
  instagram: {
    name: "Instagram",
    clientId: process.env.INSTAGRAM_CLIENT_ID || "",
    clientSecret: process.env.INSTAGRAM_CLIENT_SECRET || "",
    authorizeUrl: "https://api.instagram.com/oauth/authorize",
    tokenUrl: "https://api.instagram.com/oauth/access_token",
    profileUrl: "https://graph.instagram.com/me?fields=id,username",
    scope: "user_profile"
  },
  twitter: {
    name: "X",
    clientId: process.env.X_CLIENT_ID || process.env.TWITTER_CLIENT_ID || "",
    clientSecret: process.env.X_CLIENT_SECRET || process.env.TWITTER_CLIENT_SECRET || "",
    authorizeUrl: "https://x.com/i/oauth2/authorize",
    tokenUrl: "https://api.x.com/2/oauth2/token",
    profileUrl: "https://api.x.com/2/users/me?user.fields=username",
    scope: "users.read tweet.read offline.access"
  }
};

function json(res, status, payload) {
  return res.status(status).json(payload);
}

function parseBody(req) {
  if (!req.body) return {};
  if (typeof req.body === "string") {
    try { return JSON.parse(req.body); } catch { return {}; }
  }
  return req.body;
}

function parseCookies(req) {
  return Object.fromEntries((req.headers.cookie || "").split(";").map((item) => item.trim().split("=")).filter(([key]) => key));
}

function hashPassword(password, salt = randomBytes(16).toString("hex")) {
  return `${salt}:${scryptSync(password, salt, 64).toString("hex")}`;
}

function verifyPassword(password, stored = "") {
  const [salt, hash] = stored.split(":");
  if (!salt || !hash) return false;
  const actual = Buffer.from(hashPassword(password, salt).split(":")[1], "hex");
  const expected = Buffer.from(hash, "hex");
  return actual.length === expected.length && timingSafeEqual(actual, expected);
}

function publicAccount(account) {
  return account ? { id: account.id, username: account.username, email: account.email } : null;
}

function siteBase(req) {
  if (appBaseUrl) return appBaseUrl;
  const proto = req.headers["x-forwarded-proto"] || "https";
  return `${proto}://${req.headers.host}`;
}

function oauthRedirectUri(req, provider) {
  return `${siteBase(req)}/api/auth/oauth/${provider}/callback`;
}

function base64url(buffer) {
  return Buffer.from(buffer).toString("base64").replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function supabaseHeaders(extra = {}) {
  return { apikey: serviceKey, Authorization: `Bearer ${serviceKey}`, "Content-Type": "application/json", ...extra };
}

async function rest(path, options = {}) {
  if (!hasSupabase) return null;
  const response = await fetch(`${supabaseUrl}/rest/v1/${path}`, { ...options, headers: supabaseHeaders(options.headers) });
  if (!response.ok) throw new Error(`Supabase request failed ${response.status}`);
  if (response.status === 204) return null;
  return response.json();
}

async function findAccountByEmail(email) {
  if (hasSupabase) return (await rest(`accounts?email=eq.${encodeURIComponent(email)}&limit=1`))?.[0] || null;
  return store.accounts.get(email) || null;
}

async function findAccountById(id) {
  if (hasSupabase) return (await rest(`accounts?id=eq.${encodeURIComponent(id)}&limit=1`))?.[0] || null;
  return [...store.accounts.values()].find((account) => account.id === id) || null;
}

async function createAccount(account) {
  if (!hasSupabase) {
    store.accounts.set(account.email, account);
    return account;
  }
  return (await rest("accounts", { method: "POST", headers: { Prefer: "return=representation" }, body: JSON.stringify(account) }))?.[0] || account;
}

async function createSession(accountId) {
  const sessionId = randomUUID();
  if (hasSupabase) await rest("sessions", { method: "POST", headers: { Prefer: "return=minimal" }, body: JSON.stringify({ id: sessionId, account_id: accountId }) });
  else store.sessions.set(sessionId, accountId);
  return sessionId;
}

async function currentAccount(req) {
  const sessionId = parseCookies(req).nakaru_session;
  if (!sessionId) return null;
  if (hasSupabase) {
    const session = (await rest(`sessions?id=eq.${encodeURIComponent(sessionId)}&limit=1`))?.[0];
    return session?.account_id ? findAccountById(session.account_id) : null;
  }
  return findAccountById(store.sessions.get(sessionId));
}

function extractYouTubeUrl(text) {
  return text.match(/https?:\/\/(?:www\.)?(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/shorts\/)[^\s]+/i)?.[0] || "";
}

function appropriate(text) {
  return !["hate", "slur", "nsfw", "porn", "kill yourself"].some((word) => text.toLowerCase().includes(word));
}

async function uploadImage(dataUrl, folder = "posts") {
  if (!hasSupabase || !dataUrl?.startsWith("data:image/")) return dataUrl || "";
  const [meta, encoded] = dataUrl.split(",");
  const mime = meta.match(/data:(.*?);base64/)?.[1] || "image/png";
  const objectPath = `${folder}/${randomUUID()}.${mime.split("/")[1] || "png"}`;
  const response = await fetch(`${supabaseUrl}/storage/v1/object/${bucket}/${objectPath}`, {
    method: "POST",
    headers: { apikey: serviceKey, Authorization: `Bearer ${serviceKey}`, "Content-Type": mime, "x-upsert": "false" },
    body: Buffer.from(encoded, "base64")
  });
  if (!response.ok) throw new Error(`Supabase upload failed ${response.status}`);
  return `${supabaseUrl}/storage/v1/object/public/${bucket}/${objectPath}`;
}

async function exchangeOAuth(req, provider, code, stateRecord) {
  const config = oauthProviders[provider];
  const redirectUri = oauthRedirectUri(req, provider);
  let profile;

  if (provider === "facebook") {
    const url = new URL(config.tokenUrl);
    url.searchParams.set("client_id", config.clientId);
    url.searchParams.set("client_secret", config.clientSecret);
    url.searchParams.set("redirect_uri", redirectUri);
    url.searchParams.set("code", code);
    const token = await (await fetch(url)).json();
    profile = await (await fetch(`${config.profileUrl}&access_token=${token.access_token}`)).json();
  } else if (provider === "twitter") {
    const body = new URLSearchParams({ grant_type: "authorization_code", code, redirect_uri: redirectUri, code_verifier: stateRecord.codeVerifier, client_id: config.clientId });
    const headers = { "Content-Type": "application/x-www-form-urlencoded" };
    if (config.clientSecret) headers.Authorization = `Basic ${Buffer.from(`${config.clientId}:${config.clientSecret}`).toString("base64")}`;
    const token = await (await fetch(config.tokenUrl, { method: "POST", headers, body })).json();
    profile = (await (await fetch(config.profileUrl, { headers: { Authorization: `Bearer ${token.access_token}` } })).json()).data;
  } else if (provider === "instagram") {
    const body = new URLSearchParams({ client_id: config.clientId, client_secret: config.clientSecret, grant_type: "authorization_code", redirect_uri: redirectUri, code });
    const token = await (await fetch(config.tokenUrl, { method: "POST", body })).json();
    profile = await (await fetch(`${config.profileUrl}&access_token=${token.access_token}`)).json();
  } else if (provider === "google") {
    const body = new URLSearchParams({ client_id: config.clientId, client_secret: config.clientSecret, grant_type: "authorization_code", redirect_uri: redirectUri, code });
    const token = await (await fetch(config.tokenUrl, { method: "POST", headers: { "Content-Type": "application/x-www-form-urlencoded" }, body })).json();
    profile = await (await fetch(config.profileUrl, { headers: { Authorization: `Bearer ${token.access_token}` } })).json();
    profile.id = profile.sub;
  }

  const providerId = String(profile.id);
  const email = profile.email || `${provider}-${providerId}@nakaru-san.local`;
  return (await findAccountByEmail(email)) || createAccount({
    id: randomUUID(),
    username: profile.name || profile.username || `${config.name}User`,
    email,
    password_hash: "",
    provider,
    provider_id: providerId
  });
}

export default async function handler(req, res) {
  const requestUrl = new URL(req.url || "/", `https://${req.headers.host || "localhost"}`);
  const queryPath = req.query?.path;
  const path = Array.isArray(queryPath) ? queryPath : [queryPath].filter(Boolean);
  const route = (path.length ? `/${path.join("/")}` : requestUrl.pathname.replace(/^\/api/, "")).replace(/\/$/, "") || "/";
  const parts = route.split("/").filter(Boolean);
  const method = req.method || "GET";

  try {
    if (route === "/status") {
      const oauth = Object.fromEntries(Object.entries(oauthProviders).map(([key, config]) => {
        const missing = [];
        if (!config.clientId) missing.push(`${key.toUpperCase()}_CLIENT_ID`);
        if (key !== "twitter" && !config.clientSecret) missing.push(`${key.toUpperCase()}_CLIENT_SECRET`);
        return [key, { configured: missing.length === 0, missing, redirectUri: oauthRedirectUri(req, key) }];
      }));
      return json(res, 200, { ok: true, appBaseUrl: siteBase(req), supabaseConfigured: hasSupabase, googleSearchConfigured: Boolean(googleApiKey && googleSearchEngineId), oauth });
    }

    if (route === "/auth/me") return json(res, 200, { account: publicAccount(await currentAccount(req)) });

    if (route === "/auth/signup" && method === "POST") {
      const { username = "", email = "", password = "" } = parseBody(req);
      const cleanEmail = email.trim().toLowerCase();
      if (username.trim().length < 3 || !cleanEmail.includes("@") || password.length < 8) return json(res, 400, { error: "Enter a valid username, email, and 8+ character password." });
      if (await findAccountByEmail(cleanEmail)) return json(res, 409, { error: "That email already has an account." });
      const account = await createAccount({ id: randomUUID(), username: username.trim(), email: cleanEmail, password_hash: hashPassword(password) });
      const sessionId = await createSession(account.id);
      res.setHeader("Set-Cookie", `nakaru_session=${sessionId}; HttpOnly; SameSite=Lax; Path=/; Max-Age=2592000`);
      return json(res, 201, { account: publicAccount(account) });
    }

    if (route === "/auth/login" && method === "POST") {
      const { email = "", password = "" } = parseBody(req);
      const account = await findAccountByEmail(email.trim().toLowerCase());
      if (!account || !verifyPassword(password, account.password_hash || account.passwordHash)) return json(res, 401, { error: "Email or password is incorrect." });
      const sessionId = await createSession(account.id);
      res.setHeader("Set-Cookie", `nakaru_session=${sessionId}; HttpOnly; SameSite=Lax; Path=/; Max-Age=2592000`);
      return json(res, 200, { account: publicAccount(account) });
    }

    if (route === "/auth/logout") {
      res.setHeader("Set-Cookie", "nakaru_session=; HttpOnly; SameSite=Lax; Path=/; Max-Age=0");
      return json(res, 200, { ok: true });
    }

    if (route.match(/^\/auth\/oauth\/[^/]+$/)) {
      const provider = parts.at(-1);
      const config = oauthProviders[provider];
      if (!config) return json(res, 404, { error: "Unknown OAuth provider." });
      if (!config.clientId || (provider !== "twitter" && !config.clientSecret)) return json(res, 501, { error: `${config.name} login needs credentials in Vercel.`, provider, redirectUri: oauthRedirectUri(req, provider) });
      const state = randomUUID();
      const codeVerifier = base64url(randomBytes(32));
      const params = new URLSearchParams({ client_id: config.clientId, redirect_uri: oauthRedirectUri(req, provider), response_type: "code", scope: config.scope, state });
      if (provider === "twitter") {
        params.set("code_challenge", base64url(createHash("sha256").update(codeVerifier).digest()));
        params.set("code_challenge_method", "S256");
      }
      store.oauthStates.set(state, { provider, codeVerifier });
      res.writeHead(302, { Location: `${config.authorizeUrl}?${params}` });
      return res.end();
    }

    if (route.match(/^\/auth\/oauth\/[^/]+\/callback$/)) {
      const provider = parts.at(-2);
      const stateRecord = store.oauthStates.get(req.query.state || "");
      store.oauthStates.delete(req.query.state || "");
      if (!stateRecord || stateRecord.provider !== provider || !req.query.code) return res.status(400).send("<h1>Social sign-in failed</h1>");
      const account = await exchangeOAuth(req, provider, req.query.code, stateRecord);
      const sessionId = await createSession(account.id);
      res.setHeader("Set-Cookie", `nakaru_session=${sessionId}; HttpOnly; SameSite=Lax; Path=/; Max-Age=2592000`);
      res.writeHead(302, { Location: "/" });
      return res.end();
    }

    if (route === "/feed" && method === "GET") {
      const posts = hasSupabase ? await rest("feed_posts?appropriate=eq.true&order=at.desc") : store.feed.filter((post) => post.appropriate).sort((a, b) => b.at - a.at);
      return json(res, 200, { posts });
    }

    if (route === "/feed" && method === "POST") {
      const { from = "YukiKaze", text = "", image = "" } = parseBody(req);
      const visible = appropriate(text);
      const post = { id: randomUUID(), from, text, youtube_url: extractYouTubeUrl(text), youtubeUrl: extractYouTubeUrl(text), image: await uploadImage(image), at: Date.now(), appropriate: visible };
      if (hasSupabase) await rest("feed_posts", { method: "POST", headers: { Prefer: "return=minimal" }, body: JSON.stringify(post) });
      else store.feed.unshift(post);
      return json(res, 201, { post, visible });
    }

    if (route === "/messages" && method === "GET") {
      const room = requestUrl.searchParams.get("room") || req.query.room || "Moonlit Lounge";
      const messages = hasSupabase ? await rest(`public_messages?room=eq.${encodeURIComponent(room)}&order=at.asc`) : store.messages.get(room) || [];
      return json(res, 200, { room, messages, roomCount: 1 });
    }

    if (route === "/messages" && method === "POST") {
      const { room = "Moonlit Lounge", from = "YukiKaze", text = "" } = parseBody(req);
      const message = { id: randomUUID(), room, from, text, at: Date.now() };
      if (hasSupabase) await rest("public_messages", { method: "POST", headers: { Prefer: "return=minimal" }, body: JSON.stringify(message) });
      else store.messages.set(room, [...(store.messages.get(room) || []), message]);
      return json(res, 201, { message });
    }

    if (route === "/dm" && method === "GET") {
      const thread = requestUrl.searchParams.get("thread") || req.query.thread || "RaeArcade";
      const messages = hasSupabase ? await rest(`direct_messages?thread=eq.${encodeURIComponent(thread)}&order=at.asc`) : store.dms.get(thread) || [];
      return json(res, 200, { thread, messages });
    }

    if (route === "/dm" && method === "POST") {
      const { thread = "RaeArcade", from = "YukiKaze", text = "" } = parseBody(req);
      const message = { id: randomUUID(), thread, from, text, at: Date.now() };
      if (hasSupabase) await rest("direct_messages", { method: "POST", headers: { Prefer: "return=minimal" }, body: JSON.stringify(message) });
      else store.dms.set(thread, [...(store.dms.get(thread) || []), message]);
      return json(res, 201, { message });
    }

    if (route === "/presence") return json(res, 200, { users: [], roomCount: 1, siteCount: 1 });

    if (route === "/calls" && method === "GET") {
      const callId = requestUrl.searchParams.get("callId") || "call-local";
      const since = Number(requestUrl.searchParams.get("since") || 0);
      return json(res, 200, { callId, signals: (store.calls.get(callId) || []).filter((signal) => signal.at > since) });
    }

    if (route === "/calls" && method === "POST") {
      const body = parseBody(req);
      const callId = body.callId || "call-local";
      const signal = { id: randomUUID(), ...body, at: Date.now() };
      store.calls.set(callId, [...(store.calls.get(callId) || []), signal]);
      return json(res, 201, { signal });
    }

    if (route === "/search") {
      const q = requestUrl.searchParams.get("q") || "";
      return json(res, 200, {
        query: q,
        images: [],
        posts: store.feed.filter((post) => `${post.from} ${post.text}`.toLowerCase().includes(q.toLowerCase())),
        googleConfigured: Boolean(googleApiKey && googleSearchEngineId),
        links: {
          googleImages: `https://www.google.com/search?tbm=isch&q=${encodeURIComponent(`${q} anime character reference`)}`,
          googleSearch: `https://www.google.com/search?q=${encodeURIComponent(`${q} anime forum discussion`)}`
        }
      });
    }

    return json(res, 404, { error: "Not found", route });
  } catch (error) {
    console.error(error);
    return json(res, 500, { error: "Server error", detail: error.message });
  }
}
