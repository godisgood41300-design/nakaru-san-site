import { createHash, randomBytes, randomUUID, scryptSync, timingSafeEqual } from "node:crypto";
import { store } from "./_store.js";
import {
  createAccount,
  createDirectMessage,
  createFeedPost,
  createMessage,
  createSession,
  deleteSession,
  findAccountByEmail,
  findAccountById,
  findSessionAccountId,
  hasSupabase,
  listDirectMessages,
  listFeedPosts,
  listMessages,
  uploadDataUrl
} from "./_supabase.js";

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
  instagram: {
    name: "Instagram",
    clientId: process.env.INSTAGRAM_CLIENT_ID || "",
    clientSecret: process.env.INSTAGRAM_CLIENT_SECRET || "",
    authorizeUrl: "https://api.instagram.com/oauth/authorize",
    tokenUrl: "https://api.instagram.com/oauth/access_token",
    profileUrl: "https://graph.instagram.com/me?fields=id,username",
    scope: "user_profile"
  }
};

function parseBody(req) {
  if (!req.body) return {};
  if (typeof req.body === "string") {
    try {
      return JSON.parse(req.body);
    } catch {
      return {};
    }
  }
  return req.body;
}

function parseCookies(req) {
  return Object.fromEntries(
    (req.headers.cookie || "")
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

async function currentAccount(req) {
  const sessionId = parseCookies(req).nakaru_session;
  if (hasSupabase && sessionId) {
    const accountId = await findSessionAccountId(sessionId);
    return accountId ? findAccountById(accountId) : null;
  }
  const accountId = sessionId ? store.sessions.get(sessionId) : "";
  return accountId ? [...store.accounts.values()].find((account) => account.id === accountId) : null;
}

function cleanupUsers() {
  const cutoff = Date.now() - 15_000;
  for (const [id, user] of store.users.entries()) {
    if (user.lastSeen < cutoff) store.users.delete(id);
  }
}

function countRoom(room) {
  cleanupUsers();
  return [...store.users.values()].filter((user) => user.room === room).length;
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

function base64url(buffer) {
  return Buffer.from(buffer).toString("base64").replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function siteBase(req) {
  if (appBaseUrl) return appBaseUrl;
  const proto = req.headers["x-forwarded-proto"] || "https";
  return `${proto}://${req.headers.host}`;
}

function oauthRedirectUri(req, provider) {
  return `${siteBase(req)}/api/auth/oauth/${provider}/callback`;
}

async function upsertOAuthAccount(provider, profile) {
  const providerId = String(profile.id);
  const email = profile.email || `${provider}-${providerId}@nakaru-san.local`;
  const existing = hasSupabase ? await findAccountByEmail(email) : store.accounts.get(email);
  if (existing) return existing;

  const username = profile.name || profile.username || `${oauthProviders[provider].name}User`;
  const account = { id: randomUUID(), username, email, passwordHash: "", password_hash: "", provider, provider_id: providerId };
  if (hasSupabase) {
    await createAccount({
      id: account.id,
      username: account.username,
      email: account.email,
      password_hash: "",
      provider,
      provider_id: providerId
    });
  } else {
    store.accounts.set(email, account);
  }
  return account;
}

async function exchangeOAuthCode(req, provider, code, stateRecord) {
  const config = oauthProviders[provider];
  const redirectUri = oauthRedirectUri(req, provider);

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

  if (provider === "instagram") {
    const body = new URLSearchParams({
      client_id: config.clientId,
      client_secret: config.clientSecret,
      grant_type: "authorization_code",
      redirect_uri: redirectUri,
      code
    });
    const token = await (await fetch(config.tokenUrl, { method: "POST", body })).json();
    const profile = await (await fetch(`${config.profileUrl}&access_token=${token.access_token}`)).json();
    return upsertOAuthAccount(provider, { id: profile.id, username: profile.username, name: profile.username });
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

  throw new Error("Unsupported OAuth provider");
}

export default async function handler(req, res) {
  const requestUrl = new URL(req.url || "/", `https://${req.headers.host || "localhost"}`);
  const fromUrl = requestUrl.pathname.replace(/^\/api/, "").replace(/\/$/, "") || "/";
  const queryPath = req.query?.path;
  const path = Array.isArray(queryPath) ? queryPath : [queryPath].filter(Boolean);
  const fromQuery = path.length ? `/${path.join("/")}` : "";
  const route = fromQuery || fromUrl;
  const routeParts = route.split("/").filter(Boolean);
  const method = req.method;

  try {
    if (route === "/status" && method === "GET") {
      const oauth = Object.fromEntries(
        Object.entries(oauthProviders).map(([key, config]) => {
          const missing = [];
          if (!config.clientId) missing.push(`${key.toUpperCase()}_CLIENT_ID`);
          if (key !== "twitter" && !config.clientSecret) missing.push(`${key.toUpperCase()}_CLIENT_SECRET`);
          if (key === "twitter" && !config.clientSecret) missing.push("optional TWITTER_CLIENT_SECRET or X_CLIENT_SECRET");
          return [key, {
            configured: missing.length === 0 || (key === "twitter" && Boolean(config.clientId)),
            missing,
            redirectUri: oauthRedirectUri(req, key)
          }];
        })
      );
      return res.status(200).json({
        ok: true,
        appBaseUrl: siteBase(req),
        supabaseConfigured: hasSupabase,
        googleSearchConfigured: Boolean(googleApiKey && googleSearchEngineId),
        oauth
      });
    }

    if (route === "/auth/me" && method === "GET") {
      const account = await currentAccount(req);
      return res.status(200).json({ account: account ? publicAccount(account) : null });
    }

    if (route === "/auth/signup" && method === "POST") {
      const { username = "", email = "", password = "" } = parseBody(req);
      const cleanUsername = username.trim();
      const cleanEmail = email.trim().toLowerCase();
      if (cleanUsername.length < 3) return res.status(400).json({ error: "Username must be at least 3 characters." });
      if (!cleanEmail.includes("@")) return res.status(400).json({ error: "Enter a valid email." });
      if (password.length < 8) return res.status(400).json({ error: "Password must be at least 8 characters." });
      const existingAccount = hasSupabase ? await findAccountByEmail(cleanEmail) : store.accounts.get(cleanEmail);
      if (existingAccount) return res.status(409).json({ error: "An account already exists for that email." });

      const account = { id: randomUUID(), username: cleanUsername, email: cleanEmail, passwordHash: hashPassword(password), password_hash: hashPassword(password) };
      if (hasSupabase) await createAccount({ id: account.id, username: account.username, email: account.email, password_hash: account.password_hash });
      else store.accounts.set(cleanEmail, account);
      const sessionId = randomUUID();
      if (hasSupabase) await createSession({ id: sessionId, account_id: account.id, created_at: new Date().toISOString() });
      else store.sessions.set(sessionId, account.id);
      res.setHeader("Set-Cookie", `nakaru_session=${sessionId}; HttpOnly; SameSite=Lax; Path=/; Max-Age=2592000`);
      return res.status(201).json({ account: publicAccount(account) });
    }

    if (route === "/auth/login" && method === "POST") {
      const { email = "", password = "" } = parseBody(req);
      const account = hasSupabase ? await findAccountByEmail(email.trim().toLowerCase()) : store.accounts.get(email.trim().toLowerCase());
      const storedHash = account?.password_hash || account?.passwordHash;
      if (!account || !verifyPassword(password, storedHash)) {
        return res.status(401).json({ error: "Email or password is incorrect." });
      }
      const sessionId = randomUUID();
      if (hasSupabase) await createSession({ id: sessionId, account_id: account.id, created_at: new Date().toISOString() });
      else store.sessions.set(sessionId, account.id);
      res.setHeader("Set-Cookie", `nakaru_session=${sessionId}; HttpOnly; SameSite=Lax; Path=/; Max-Age=2592000`);
      return res.status(200).json({ account: publicAccount(account) });
    }

    if (route === "/auth/logout" && method === "POST") {
      const sessionId = parseCookies(req).nakaru_session;
      if (sessionId && hasSupabase) await deleteSession(sessionId);
      else if (sessionId) store.sessions.delete(sessionId);
      res.setHeader("Set-Cookie", "nakaru_session=; HttpOnly; SameSite=Lax; Path=/; Max-Age=0");
      return res.status(200).json({ ok: true });
    }

    if (route.match(/^\/auth\/oauth\/[^/]+$/) && method === "GET") {
      const provider = routeParts.at(-1);
      const config = oauthProviders[provider];
      if (!config) return res.status(404).json({ error: "Unknown OAuth provider." });
      if (!config.clientId || (provider !== "twitter" && !config.clientSecret)) {
        return res.status(501).json({
          error: `${config.name} login is wired, but it needs app credentials in Vercel before users can sign in.`,
          provider,
          redirectUri: oauthRedirectUri(req, provider)
        });
      }

      const state = randomUUID();
      const codeVerifier = base64url(randomBytes(32));
      const params = new URLSearchParams({
        client_id: config.clientId,
        redirect_uri: oauthRedirectUri(req, provider),
        response_type: "code",
        scope: config.scope,
        state
      });

      if (provider === "twitter") {
        const codeChallenge = base64url(createHash("sha256").update(codeVerifier).digest());
        params.set("code_challenge", codeChallenge);
        params.set("code_challenge_method", "S256");
      }

      store.oauthStates.set(state, { provider, codeVerifier, createdAt: Date.now() });
      res.writeHead(302, { Location: `${config.authorizeUrl}?${params}` });
      return res.end();
    }

    if (route.match(/^\/auth\/oauth\/[^/]+\/callback$/) && method === "GET") {
      const provider = routeParts.at(-2);
      const state = req.query.state || "";
      const code = req.query.code || "";
      const stateRecord = store.oauthStates.get(state);
      store.oauthStates.delete(state);
      if (!stateRecord || stateRecord.provider !== provider || !code) {
        return res.status(400).send("<h1>Social sign-in failed</h1><p>The login session expired or was rejected.</p>");
      }
      const account = await exchangeOAuthCode(req, provider, code, stateRecord);
      const sessionId = randomUUID();
      if (hasSupabase) await createSession({ id: sessionId, account_id: account.id, created_at: new Date().toISOString() });
      else store.sessions.set(sessionId, account.id);
      res.setHeader("Set-Cookie", `nakaru_session=${sessionId}; HttpOnly; SameSite=Lax; Path=/; Max-Age=2592000`);
      res.writeHead(302, { Location: "/" });
      return res.end();
    }

    if (route === "/feed" && method === "GET") {
      const posts = hasSupabase ? await listFeedPosts() : store.feedPosts.filter((post) => post.appropriate).sort((a, b) => b.at - a.at);
      return res.status(200).json({ posts });
    }

    if (route === "/feed" && method === "POST") {
      const { from = "YukiKaze", text = "", image = "" } = parseBody(req);
      if (!text.trim()) return res.status(400).json({ error: "Post cannot be empty" });
      const appropriate = isAppropriate(text);
      const uploadedImage = await uploadDataUrl(image, "posts");
      const post = {
        id: randomUUID(),
        from,
        text: text.trim(),
        youtubeUrl: extractYouTubeUrl(text),
        youtube_url: extractYouTubeUrl(text),
        image: uploadedImage,
        at: Date.now(),
        appropriate
      };
      if (hasSupabase) await createFeedPost(post);
      else store.feedPosts.push(post);
      return res.status(appropriate ? 201 : 202).json({ post, visible: appropriate });
    }

    if (route === "/search" && method === "GET") {
      const q = (req.query.q || "").trim();
      if (!q) return res.status(200).json({ query: q, images: [], posts: [], googleConfigured: Boolean(googleApiKey && googleSearchEngineId) });
      const [images, posts] = await Promise.all([googleSearch(`${q} anime character reference`, "image"), googleSearch(`${q} anime forum discussion`, "web")]);
      return res.status(200).json({
        query: q,
        images,
        posts,
        googleConfigured: Boolean(googleApiKey && googleSearchEngineId),
        links: {
          googleImages: `https://www.google.com/search?tbm=isch&q=${encodeURIComponent(`${q} anime character reference`)}`,
          googleSearch: `https://www.google.com/search?q=${encodeURIComponent(`${q} anime forum discussion`)}`
        }
      });
    }

    if (route === "/presence" && method === "POST") {
      const { userId, name = "YukiKaze", room = "Moonlit Lounge" } = parseBody(req);
      const id = userId || randomUUID();
      store.users.set(id, { id, name, room, lastSeen: Date.now() });
      cleanupUsers();
      return res.status(200).json({
        userId: id,
        total: store.users.size,
        room,
        roomCount: countRoom(room),
        users: [...store.users.values()].map((user) => ({ id: user.id, name: user.name, room: user.room }))
      });
    }

    if (route === "/messages" && method === "GET") {
      const room = req.query.room || "Moonlit Lounge";
      const messages = hasSupabase ? await listMessages(room) : store.publicMessages.get(room);
      if (!hasSupabase && !store.publicMessages.has(room)) store.publicMessages.set(room, []);
      return res.status(200).json({ room, messages: messages || store.publicMessages.get(room), roomCount: countRoom(room) });
    }

    if (route === "/messages" && method === "POST") {
      const { room = "Moonlit Lounge", from = "YukiKaze", text = "" } = parseBody(req);
      if (!text.trim()) return res.status(400).json({ error: "Message cannot be empty" });
      const message = { id: randomUUID(), from, text: text.trim(), at: Date.now() };
      if (hasSupabase) await createMessage({ ...message, room });
      else {
        if (!store.publicMessages.has(room)) store.publicMessages.set(room, []);
        store.publicMessages.get(room).push(message);
      }
      return res.status(201).json({ message });
    }

    if (route === "/dm" && method === "GET") {
      const thread = req.query.thread || "RaeArcade";
      const messages = hasSupabase ? await listDirectMessages(thread) : store.directMessages.get(thread);
      if (!hasSupabase && !store.directMessages.has(thread)) store.directMessages.set(thread, []);
      return res.status(200).json({ thread, messages: messages || store.directMessages.get(thread) });
    }

    if (route === "/dm" && method === "POST") {
      const { thread = "RaeArcade", from = "YukiKaze", text = "" } = parseBody(req);
      if (!text.trim()) return res.status(400).json({ error: "Message cannot be empty" });
      const message = { id: randomUUID(), from, text: text.trim(), at: Date.now() };
      if (hasSupabase) await createDirectMessage({ ...message, thread });
      else {
        if (!store.directMessages.has(thread)) store.directMessages.set(thread, []);
        store.directMessages.get(thread).push(message);
      }
      return res.status(201).json({ message });
    }

    if (route === "/calls" && method === "GET") {
      const callId = req.query.callId || "RaeArcade";
      const since = Number(req.query.since || 0);
      if (!store.callSignals.has(callId)) store.callSignals.set(callId, []);
      return res.status(200).json({ callId, signals: store.callSignals.get(callId).filter((signal) => signal.at > since) });
    }

    if (route === "/calls" && method === "POST") {
      const { callId = "RaeArcade", from = "YukiKaze", type = "", payload = null } = parseBody(req);
      if (!type) return res.status(400).json({ error: "Signal type is required" });
      if (!store.callSignals.has(callId)) store.callSignals.set(callId, []);
      const signal = { id: randomUUID(), callId, from, type, payload, at: Date.now() };
      store.callSignals.get(callId).push(signal);
      store.callSignals.set(callId, store.callSignals.get(callId).slice(-100));
      return res.status(201).json({ signal });
    }

    return res.status(404).json({ error: "Not found" });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: "Server error", detail: error.message });
  }
}
