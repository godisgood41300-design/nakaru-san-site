import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import { extname, join, normalize } from "node:path";
import { createHash, randomBytes, randomUUID, scryptSync, timingSafeEqual } from "node:crypto";

const root = process.cwd();
const port = Number(process.env.PORT || 4173);
const host = process.env.HOST || "0.0.0.0";
const users = new Map();
const accounts = new Map();
const sessions = new Map();
const oauthStates = new Map();
const publicMessages = new Map();
const directMessages = new Map();
const callSignals = new Map();
const feedPosts = [];
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
  twitter: {
    name: "X",
    clientId: process.env.X_CLIENT_ID || process.env.TWITTER_CLIENT_ID || "",
    clientSecret: process.env.X_CLIENT_SECRET || process.env.TWITTER_CLIENT_SECRET || "",
    authorizeUrl: "https://x.com/i/oauth2/authorize",
    tokenUrl: "https://api.x.com/2/oauth2/token",
    profileUrl: "https://api.x.com/2/users/me?user.fields=username",
    scope: "users.read tweet.read offline.access"
  },
  github: {
    name: "GitHub",
    clientId: process.env.GITHUB_CLIENT_ID || "",
    clientSecret: process.env.GITHUB_CLIENT_SECRET || "",
    authorizeUrl: "https://github.com/login/oauth/authorize",
    tokenUrl: "https://github.com/login/oauth/access_token",
    profileUrl: "https://api.github.com/user",
    scope: "read:user user:email"
  }
};

const types = {
  ".css": "text/css; charset=utf-8",
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".png": "image/png"
};

const seedMessages = {
  "Moonlit Lounge": [
    ["Ami", "The soundtrack has no business being this good."],
    ["Kairo", "Anyone staying for co-op after the episode?"],
    ["Mina", "New here. This room already feels comfortable."],
    ["Sora", "Spoiler shield saved me twice tonight."]
  ],
  "Raid After Credits": [
    ["RaeArcade", "Forming a dungeon party after the credits."],
    ["Yuna", "I can heal if someone tanks."],
    ["Kairo", "Voice chat is open for the raid group."]
  ],
  "Classic Mecha Night": [
    ["KuroQuest", "That transformation scene still holds up."],
    ["Ami", "Model kit talk after the episode?"],
    ["Ren", "Ranked matches in thirty."]
  ]
};

for (const [room, messages] of Object.entries(seedMessages)) {
  publicMessages.set(room, messages.map(([from, text]) => ({ id: randomUUID(), from, text, at: Date.now() })));
}

directMessages.set(
  "RaeArcade",
  [
    ["RaeArcade", "You joining the raid after credits?"],
    ["YukiKaze", "Yes. Save me a slot."]
  ].map(([from, text]) => ({ id: randomUUID(), from, text, at: Date.now() }))
);

feedPosts.push(
  {
    id: randomUUID(),
    from: "Ami",
    text: "Tonight's watch party is spoiler-safe. Drop your favorite opening themes.",
    youtubeUrl: "",
    image: "",
    at: Date.now() - 18_000,
    appropriate: true
  },
  {
    id: randomUUID(),
    from: "RaeArcade",
    text: "Raid After Credits is open after the episode. Bring your builds.",
    youtubeUrl: "",
    image: "",
    at: Date.now() - 10_000,
    appropriate: true
  }
);
directMessages.set(
  "NovaOnigiri",
  [
    ["NovaOnigiri", "I made a cozy watch list for Sunday."],
    ["YukiKaze", "Send it over."]
  ].map(([from, text]) => ({ id: randomUUID(), from, text, at: Date.now() }))
);
directMessages.set(
  "KuroQuest",
  [
    ["KuroQuest", "Classic Mecha Night is starting soon."],
    ["YukiKaze", "I am bringing the nostalgia."]
  ].map(([from, text]) => ({ id: randomUUID(), from, text, at: Date.now() }))
);

function json(response, status, payload) {
  response.writeHead(status, { "Content-Type": "application/json; charset=utf-8" });
  response.end(JSON.stringify(payload));
}

function parseCookies(request) {
  return Object.fromEntries(
    (request.headers.cookie || "")
      .split(";")
      .map((cookie) => cookie.trim().split("="))
      .filter(([key]) => key)
  );
}

function hashPassword(password, salt = randomBytes(16).toString("hex")) {
  const hash = scryptSync(password, salt, 64).toString("hex");
  return `${salt}:${hash}`;
}

function verifyPassword(password, stored) {
  const [salt, hash] = stored.split(":");
  const actual = Buffer.from(hashPassword(password, salt).split(":")[1], "hex");
  const expected = Buffer.from(hash, "hex");
  return actual.length === expected.length && timingSafeEqual(actual, expected);
}

function publicAccount(account) {
  return { id: account.id, username: account.username, email: account.email };
}

function redirect(response, location) {
  response.writeHead(302, { Location: location });
  response.end();
}

function base64url(buffer) {
  return Buffer.from(buffer).toString("base64").replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function oauthRedirectUri(provider) {
  const baseUrl = appBaseUrl || "https://nakaru-san.com";
  return `${baseUrl}/api/auth/oauth/${provider}/callback`;
}

function upsertOAuthAccount(provider, profile) {
  const providerId = String(profile.id);
  const email = profile.email || `${provider}-${providerId}@nakaru-san.local`;
  const existing = accounts.get(email);
  if (existing) return existing;

  const username = profile.name || profile.username || `${oauthProviders[provider].name}User`;
  const account = {
    id: randomUUID(),
    username,
    email,
    passwordHash: "",
    provider,
    providerId
  };
  accounts.set(email, account);
  return account;
}

async function exchangeOAuthCode(provider, code, stateRecord) {
  const config = oauthProviders[provider];
  const redirectUri = oauthRedirectUri(provider);

  if (provider === "facebook") {
    const tokenUrl = new URL(config.tokenUrl);
    tokenUrl.searchParams.set("client_id", config.clientId);
    tokenUrl.searchParams.set("client_secret", config.clientSecret);
    tokenUrl.searchParams.set("redirect_uri", redirectUri);
    tokenUrl.searchParams.set("code", code);
    const token = await (await fetch(tokenUrl)).json();
    const profile = await (await fetch(`${config.profileUrl}&access_token=${token.access_token}`)).json();
    return upsertOAuthAccount(provider, profile);
  }

  if (provider === "twitter") {
    const body = new URLSearchParams({
      grant_type: "authorization_code",
      code,
      redirect_uri: redirectUri,
      code_verifier: stateRecord.codeVerifier,
      client_id: config.clientId
    });
    const headers = { "Content-Type": "application/x-www-form-urlencoded" };
    if (config.clientSecret) {
      headers.Authorization = `Basic ${Buffer.from(`${config.clientId}:${config.clientSecret}`).toString("base64")}`;
    }
    const token = await (await fetch(config.tokenUrl, { method: "POST", headers, body })).json();
    const profileResponse = await fetch(config.profileUrl, { headers: { Authorization: `Bearer ${token.access_token}` } });
    const profile = (await profileResponse.json()).data;
    return upsertOAuthAccount(provider, { id: profile.id, username: profile.username, name: profile.name });
  }

  if (provider === "google") {
    const body = new URLSearchParams({
      client_id: config.clientId,
      client_secret: config.clientSecret,
      grant_type: "authorization_code",
      redirect_uri: redirectUri,
      code
    });
    const token = await (await fetch(config.tokenUrl, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body
    })).json();
    const profile = await (await fetch(config.profileUrl, {
      headers: { Authorization: `Bearer ${token.access_token}` }
    })).json();
    return upsertOAuthAccount(provider, { id: profile.sub, email: profile.email, name: profile.name });
  }

  if (provider === "github") {
    const body = new URLSearchParams({
      client_id: config.clientId,
      client_secret: config.clientSecret,
      redirect_uri: redirectUri,
      code
    });
    const token = await (await fetch(config.tokenUrl, {
      method: "POST",
      headers: { Accept: "application/json" },
      body
    })).json();
    const profile = await (await fetch(config.profileUrl, {
      headers: {
        Accept: "application/vnd.github+json",
        Authorization: `Bearer ${token.access_token}`
      }
    })).json();
    return upsertOAuthAccount(provider, {
      id: profile.id,
      email: profile.email || `github-${profile.id}@nakaru-san.local`,
      username: profile.login,
      name: profile.name || profile.login
    });
  }

  throw new Error("Unsupported OAuth provider");
}

function currentAccount(request) {
  const sessionId = parseCookies(request).nakaru_session;
  const accountId = sessionId ? sessions.get(sessionId) : "";
  return accountId ? [...accounts.values()].find((account) => account.id === accountId) : null;
}

function readBody(request) {
  return new Promise((resolve, reject) => {
    let body = "";
    request.on("data", (chunk) => {
      body += chunk;
      if (body.length > 1_000_000) request.destroy();
    });
    request.on("end", () => {
      try {
        resolve(body ? JSON.parse(body) : {});
      } catch (error) {
        reject(error);
      }
    });
    request.on("error", reject);
  });
}

function cleanupUsers() {
  const cutoff = Date.now() - 15_000;
  for (const [id, user] of users.entries()) {
    if (user.lastSeen < cutoff) users.delete(id);
  }
}

function countRoom(room) {
  cleanupUsers();
  return [...users.values()].filter((user) => user.room === room).length;
}

function isAppropriate(text) {
  const blocked = ["hate", "slur", "nsfw", "porn", "kill yourself"];
  const clean = text.toLowerCase();
  return !blocked.some((word) => clean.includes(word));
}

function extractYouTubeUrl(text) {
  const match = text.match(/https?:\/\/(?:www\.)?(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/shorts\/)[^\s]+/i);
  return match?.[0] || "";
}

async function googleSearch(query, searchType) {
  if (!googleApiKey || !googleSearchEngineId) return [];
  const url = new URL("https://www.googleapis.com/customsearch/v1");
  url.searchParams.set("key", googleApiKey);
  url.searchParams.set("cx", googleSearchEngineId);
  url.searchParams.set("q", query);
  url.searchParams.set("safe", "active");
  url.searchParams.set("num", searchType === "image" ? "6" : "5");
  if (searchType === "image") {
    url.searchParams.set("searchType", "image");
    url.searchParams.set("rights", "cc_publicdomain,cc_attribute,cc_sharealike");
  }

  const response = await fetch(url);
  if (!response.ok) return [];
  const data = await response.json();
  return (data.items || []).map((item) => ({
    title: item.title,
    link: item.link,
    snippet: item.snippet || "",
    thumbnail: item.image?.thumbnailLink || item.pagemap?.cse_thumbnail?.[0]?.src || ""
  }));
}

function handleApi(request, response, url) {
  if (url.pathname === "/api/auth/me" && request.method === "GET") {
    const account = currentAccount(request);
    json(response, 200, { account: account ? publicAccount(account) : null });
    return true;
  }

  if (url.pathname === "/api/auth/signup" && request.method === "POST") {
    readBody(request)
      .then(({ username = "", email = "", password = "" }) => {
        const cleanUsername = username.trim();
        const cleanEmail = email.trim().toLowerCase();
        if (cleanUsername.length < 3) return json(response, 400, { error: "Username must be at least 3 characters." });
        if (!cleanEmail.includes("@")) return json(response, 400, { error: "Enter a valid email." });
        if (password.length < 8) return json(response, 400, { error: "Password must be at least 8 characters." });
        if (accounts.has(cleanEmail)) return json(response, 409, { error: "An account already exists for that email." });

        const account = { id: randomUUID(), username: cleanUsername, email: cleanEmail, passwordHash: hashPassword(password) };
        accounts.set(cleanEmail, account);
        const sessionId = randomUUID();
        sessions.set(sessionId, account.id);
        response.setHeader("Set-Cookie", `nakaru_session=${sessionId}; HttpOnly; SameSite=Lax; Path=/; Max-Age=2592000`);
        json(response, 201, { account: publicAccount(account) });
      })
      .catch(() => json(response, 400, { error: "Invalid JSON body" }));
    return true;
  }

  if (url.pathname === "/api/auth/login" && request.method === "POST") {
    readBody(request)
      .then(({ email = "", password = "" }) => {
        const account = accounts.get(email.trim().toLowerCase());
        if (!account || !verifyPassword(password, account.passwordHash)) {
          return json(response, 401, { error: "Email or password is incorrect." });
        }
        const sessionId = randomUUID();
        sessions.set(sessionId, account.id);
        response.setHeader("Set-Cookie", `nakaru_session=${sessionId}; HttpOnly; SameSite=Lax; Path=/; Max-Age=2592000`);
        json(response, 200, { account: publicAccount(account) });
      })
      .catch(() => json(response, 400, { error: "Invalid JSON body" }));
    return true;
  }

  if (url.pathname === "/api/auth/logout" && request.method === "POST") {
    const sessionId = parseCookies(request).nakaru_session;
    if (sessionId) sessions.delete(sessionId);
    response.setHeader("Set-Cookie", "nakaru_session=; HttpOnly; SameSite=Lax; Path=/; Max-Age=0");
    json(response, 200, { ok: true });
    return true;
  }

  if (url.pathname.match(/^\/api\/auth\/oauth\/[^/]+$/) && request.method === "GET") {
    const provider = url.pathname.split("/").pop();
    const config = oauthProviders[provider];
    if (!config) {
      json(response, 501, { error: "Social login is not enabled yet.", provider });
      return true;
    }
    if (!config.clientId || (provider !== "twitter" && !config.clientSecret)) {
      json(response, 501, {
        error: `${config.name} login is wired, but it needs app credentials in Render before users can sign in.`,
        provider,
        required: provider === "twitter" ? ["X_CLIENT_ID"] : [`${provider.toUpperCase()}_CLIENT_ID`, `${provider.toUpperCase()}_CLIENT_SECRET`],
        redirectUri: oauthRedirectUri(provider)
      });
      return true;
    }

    const state = randomUUID();
    const codeVerifier = base64url(randomBytes(32));
    const params = new URLSearchParams({
      client_id: config.clientId,
      redirect_uri: oauthRedirectUri(provider),
      response_type: "code",
      scope: config.scope,
      state
    });

    if (provider === "twitter") {
      const codeChallenge = base64url(createHash("sha256").update(codeVerifier).digest());
      params.set("code_challenge", codeChallenge);
      params.set("code_challenge_method", "S256");
    }

    oauthStates.set(state, { provider, codeVerifier, createdAt: Date.now() });
    redirect(response, `${config.authorizeUrl}?${params}`);
    return true;
  }

  if (url.pathname.match(/^\/api\/auth\/oauth\/[^/]+\/callback$/) && request.method === "GET") {
    const provider = url.pathname.split("/").at(-2);
    if (!oauthProviders[provider]) {
      response.writeHead(501, { "Content-Type": "text/html; charset=utf-8" });
      response.end("<h1>Social sign-in is not enabled yet.</h1><p>Please use email login for now.</p>");
      return true;
    }
    const state = url.searchParams.get("state") || "";
    const code = url.searchParams.get("code") || "";
    const stateRecord = oauthStates.get(state);
    oauthStates.delete(state);
    if (!stateRecord || stateRecord.provider !== provider || !code) {
      response.writeHead(400, { "Content-Type": "text/html; charset=utf-8" });
      response.end("<h1>Social sign-in failed</h1><p>The login session expired or was rejected.</p>");
      return true;
    }

    exchangeOAuthCode(provider, code, stateRecord)
      .then((account) => {
        const sessionId = randomUUID();
        sessions.set(sessionId, account.id);
        response.setHeader("Set-Cookie", `nakaru_session=${sessionId}; HttpOnly; SameSite=Lax; Path=/; Max-Age=2592000`);
        redirect(response, "/");
      })
      .catch(() => {
        response.writeHead(502, { "Content-Type": "text/html; charset=utf-8" });
        response.end("<h1>Social sign-in failed</h1><p>The provider did not return a usable account.</p>");
      });
    return true;
  }

  if (url.pathname === "/api/feed" && request.method === "GET") {
    json(response, 200, { posts: feedPosts.filter((post) => post.appropriate).sort((a, b) => b.at - a.at) });
    return true;
  }

  if (url.pathname === "/api/feed" && request.method === "POST") {
    readBody(request)
      .then(({ from = "YukiKaze", text = "", image = "" }) => {
        if (!text.trim()) return json(response, 400, { error: "Post cannot be empty" });
        const appropriate = isAppropriate(text);
        const post = {
          id: randomUUID(),
          from,
          text: text.trim(),
          youtubeUrl: extractYouTubeUrl(text),
          image,
          at: Date.now(),
          appropriate
        };
        feedPosts.push(post);
        json(response, appropriate ? 201 : 202, { post, visible: appropriate });
      })
      .catch(() => json(response, 400, { error: "Invalid JSON body" }));
    return true;
  }

  if (url.pathname === "/api/search" && request.method === "GET") {
    const q = (url.searchParams.get("q") || "").trim();
    if (!q) {
      json(response, 200, { query: q, images: [], posts: [], googleConfigured: Boolean(googleApiKey && googleSearchEngineId) });
      return true;
    }

    Promise.all([googleSearch(`${q} anime character reference`, "image"), googleSearch(`${q} anime forum discussion`, "web")])
      .then(([images, posts]) => {
        json(response, 200, {
          query: q,
          images,
          posts,
          googleConfigured: Boolean(googleApiKey && googleSearchEngineId),
          links: {
            googleImages: `https://www.google.com/search?tbm=isch&q=${encodeURIComponent(`${q} anime character reference`)}`,
            googleSearch: `https://www.google.com/search?q=${encodeURIComponent(`${q} anime forum discussion`)}`
          }
        });
      })
      .catch(() => json(response, 502, { error: "Search provider failed" }));
    return true;
  }

  if (url.pathname === "/api/presence" && request.method === "POST") {
    readBody(request)
      .then(({ userId, name = "YukiKaze", room = "Moonlit Lounge" }) => {
        const id = userId || randomUUID();
        users.set(id, { id, name, room, lastSeen: Date.now() });
        cleanupUsers();
        json(response, 200, {
          userId: id,
          total: users.size,
          room,
          roomCount: countRoom(room),
          users: [...users.values()].map((user) => ({ id: user.id, name: user.name, room: user.room }))
        });
      })
      .catch(() => json(response, 400, { error: "Invalid JSON body" }));
    return true;
  }

  if (url.pathname === "/api/messages" && request.method === "GET") {
    const room = url.searchParams.get("room") || "Moonlit Lounge";
    if (!publicMessages.has(room)) publicMessages.set(room, []);
    json(response, 200, { room, messages: publicMessages.get(room), roomCount: countRoom(room) });
    return true;
  }

  if (url.pathname === "/api/messages" && request.method === "POST") {
    readBody(request)
      .then(({ room = "Moonlit Lounge", from = "YukiKaze", text = "" }) => {
        if (!text.trim()) return json(response, 400, { error: "Message cannot be empty" });
        if (!publicMessages.has(room)) publicMessages.set(room, []);
        const message = { id: randomUUID(), from, text: text.trim(), at: Date.now() };
        publicMessages.get(room).push(message);
        json(response, 201, { message });
      })
      .catch(() => json(response, 400, { error: "Invalid JSON body" }));
    return true;
  }

  if (url.pathname === "/api/dm" && request.method === "GET") {
    const thread = url.searchParams.get("thread") || "RaeArcade";
    if (!directMessages.has(thread)) directMessages.set(thread, []);
    json(response, 200, { thread, messages: directMessages.get(thread) });
    return true;
  }

  if (url.pathname === "/api/dm" && request.method === "POST") {
    readBody(request)
      .then(({ thread = "RaeArcade", from = "YukiKaze", text = "" }) => {
        if (!text.trim()) return json(response, 400, { error: "Message cannot be empty" });
        if (!directMessages.has(thread)) directMessages.set(thread, []);
        const message = { id: randomUUID(), from, text: text.trim(), at: Date.now() };
        directMessages.get(thread).push(message);
        json(response, 201, { message });
      })
      .catch(() => json(response, 400, { error: "Invalid JSON body" }));
    return true;
  }

  if (url.pathname === "/api/calls" && request.method === "GET") {
    const callId = url.searchParams.get("callId") || "RaeArcade";
    const since = Number(url.searchParams.get("since") || 0);
    if (!callSignals.has(callId)) callSignals.set(callId, []);
    json(response, 200, { callId, signals: callSignals.get(callId).filter((signal) => signal.at > since) });
    return true;
  }

  if (url.pathname === "/api/calls" && request.method === "POST") {
    readBody(request)
      .then(({ callId = "RaeArcade", from = "YukiKaze", type = "", payload = null }) => {
        if (!type) return json(response, 400, { error: "Signal type is required" });
        if (!callSignals.has(callId)) callSignals.set(callId, []);
        const signal = { id: randomUUID(), callId, from, type, payload, at: Date.now() };
        callSignals.get(callId).push(signal);
        callSignals.set(callId, callSignals.get(callId).slice(-100));
        json(response, 201, { signal });
      })
      .catch(() => json(response, 400, { error: "Invalid JSON body" }));
    return true;
  }

  return false;
}

createServer(async (request, response) => {
  const url = new URL(request.url || "/", `https://${request.headers.host || "nakaru-san.com"}`);
  if (url.pathname.startsWith("/api/") && handleApi(request, response, url)) return;

  const requestedPath = url.pathname === "/" ? "/index.html" : url.pathname;
  const safePath = normalize(decodeURIComponent(requestedPath)).replace(/^(\.\.[/\\])+/, "");
  const filePath = join(root, safePath);

  try {
    const file = await readFile(filePath);
    const ext = extname(filePath);
    const cacheControl = [".html", ".js", ".css"].includes(ext)
      ? "no-cache, no-store, must-revalidate"
      : "public, max-age=86400";
    response.writeHead(200, {
      "Content-Type": types[ext] || "application/octet-stream",
      "Cache-Control": cacheControl
    });
    response.end(file);
  } catch {
    response.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" });
    response.end("Not found");
  }
}).listen(port, host, () => {
  console.log(`Nakaru-san running at http://${host}:${port}`);
});
