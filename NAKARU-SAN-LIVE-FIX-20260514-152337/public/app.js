const rooms = [
  {
    title: "Moonlit Lounge",
    theme: "Fantasy anime watch party",
    viewers: "0",
    tags: ["Subs", "No spoilers", "Chill"],
    gradient: "linear-gradient(145deg, #7c3cff, #211132 58%, #f4c95d)"
  },
  {
    title: "Raid After Credits",
    theme: "Gaming squad forming after episodes",
    viewers: "0",
    tags: ["RPG", "Voice open", "LFG"],
    gradient: "linear-gradient(145deg, #101018, #6f35e8 55%, #2dd4bf)"
  },
  {
    title: "Classic Mecha Night",
    theme: "Retro anime, model kits, ranked matches",
    viewers: "0",
    tags: ["Retro", "Public chat", "Mods"],
    gradient: "linear-gradient(145deg, #25202d, #c09232 48%, #7c3cff)"
  }
];

const requests = [
  { initials: "RA", name: "RaeArcade", meta: "Shared rooms: Moonlit Lounge, Raid After Credits" },
  { initials: "NO", name: "NovaOnigiri", meta: "Likes: slice of life, cozy MMOs, manga clubs" },
  { initials: "KU", name: "KuroQuest", meta: "Sent after Classic Mecha Night" }
];

const dmThreads = [
  { name: "RaeArcade", preview: "Ready for co-op?", messages: [] },
  { name: "NovaOnigiri", preview: "Slice of life list", messages: [] },
  { name: "KuroQuest", preview: "Mecha night", messages: [] }
];

let activeRoom = rooms[0].title;
let activeThread = dmThreads[0].name;
let userId = localStorage.getItem("nakaruUserId") || "";
let toastTimer;
let lastToastKey = "";
let lastToastAt = 0;
let localStream;
let broadcastStream;
let peerConnection;
let callPollTimer;
let lastSignalAt = 0;
let searchTimer;
let lastSafeChatWarnAt = 0;

const roomList = document.querySelector("#roomList");
const messageFeed = document.querySelector("#messageFeed");
const requestList = document.querySelector("#requestList");
const messageForm = document.querySelector("#messageForm");
const messageInput = document.querySelector("#messageInput");
const activeRoomTitle = document.querySelector("#activeRoomTitle");
const activeRoomStatus = document.querySelector("#activeRoomStatus");
const featuredRoomTitle = document.querySelector("#featuredRoomTitle");
const featuredRoomMeta = document.querySelector("#featuredRoomMeta");
const liveChip = document.querySelector("#liveChip");
const hostCard = document.querySelector("#hostCard");
const broadcastVideo = document.querySelector("#broadcastVideo");
const streamControls = document.querySelector("#streamControls");
const threadList = document.querySelector("#threadList");
const dmFeed = document.querySelector("#dmFeed");
const dmForm = document.querySelector("#dmForm");
const dmInput = document.querySelector("#dmInput");
const activeDmStatus = document.querySelector("#activeDmStatus");
const callName = document.querySelector("#callName");
const callStatus = document.querySelector("#callStatus");
const callStage = document.querySelector("#callStage");
const endCallButton = document.querySelector("#endCallButton");
const selfVideo = document.querySelector("#selfVideo");
const selfTile = document.querySelector("#selfTile");
const sitePresence = document.querySelector("#sitePresence");
const streamScreen = document.querySelector(".stream-screen");
const searchForm = document.querySelector("#searchForm");
const searchInput = document.querySelector("#searchInput");
const searchResults = document.querySelector("#searchResults");
const searchResultsTitle = document.querySelector("#searchResultsTitle");
const searchResultsStatus = document.querySelector("#searchResultsStatus");
const youtubeForm = document.querySelector("#youtubeForm");
const youtubeInput = document.querySelector("#youtubeInput");
const youtubeEmbed = document.querySelector("#youtubeEmbed");
const watchStatus = document.querySelector("#watchStatus");
const postForm = document.querySelector("#postForm");
const postInput = document.querySelector("#postInput");
const postImageInput = document.querySelector("#postImageInput");
const feedList = document.querySelector("#feedList");
const feedStatus = document.querySelector("#feedStatus");
let feedPosts = [];
let currentAccount = null;
let authMode = "signup";
const accountButton = document.querySelector("#accountButton");
const authModal = document.querySelector("#authModal");
const authForm = document.querySelector("#authForm");
const authTitle = document.querySelector("#authTitle");
const authUsername = document.querySelector("#authUsername");
const authEmail = document.querySelector("#authEmail");
const authPassword = document.querySelector("#authPassword");
const authSubmitButton = document.querySelector("#authSubmitButton");
const authMessage = document.querySelector("#authMessage");
const signupTab = document.querySelector("#signupTab");
const loginTab = document.querySelector("#loginTab");
const closeAuthButton = document.querySelector("#closeAuthButton");
const profileName = document.querySelector("#profileName");
const profileBio = document.querySelector("#profileBio");
const profileNameInput = document.querySelector("#profileNameInput");
const profileBioInput = document.querySelector("#profileBioInput");
const profilePhotoInput = document.querySelector("#profilePhotoInput");
const profileBannerInput = document.querySelector("#profileBannerInput");
const profilePhoto = document.querySelector("#profilePhoto");
const profileBanner = document.querySelector("#profileBanner");
const profilePosts = document.querySelector("#profilePosts");
const saveProfileButton = document.querySelector("#saveProfileButton");
let profile = JSON.parse(localStorage.getItem("nakaruProfile") || "{}");

function displayName() {
  return profile.name || currentAccount?.username || "YukiKaze";
}

function byId(id) {
  return document.querySelector(`#${id}`);
}

const supabaseConfig = window.NAKARU_CONFIG || {};
const supabaseUrl = (supabaseConfig.SUPABASE_URL || "").replace(/\/$/, "");
const supabaseKey = supabaseConfig.SUPABASE_ANON_KEY || supabaseConfig.SUPABASE_PUBLISHABLE_KEY || "";
const useSupabaseDirect = Boolean(supabaseUrl && supabaseKey);
const supabaseClient = useSupabaseDirect && window.supabase?.createClient
  ? window.supabase.createClient(supabaseUrl, supabaseKey, {
      auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true }
    })
  : null;

const localSeedMessages = {
  "Moonlit Lounge": [
    { from: "Ami", text: "The soundtrack has no business being this good." },
    { from: "Kairo", text: "Anyone staying for co-op after the episode?" },
    { from: "Mina", text: "New here. This room already feels comfortable." },
    { from: "Sora", text: "Spoiler shield saved me twice tonight." }
  ],
  "Raid After Credits": [
    { from: "RaeArcade", text: "Forming a dungeon party after the credits." },
    { from: "Yuna", text: "I can heal if someone tanks." },
    { from: "Kairo", text: "Voice chat is open for the raid group." }
  ],
  "Classic Mecha Night": [
    { from: "KuroQuest", text: "That transformation scene still holds up." },
    { from: "Ami", text: "Model kit talk after the episode?" },
    { from: "Ren", text: "Ranked matches in thirty." }
  ]
};

const localSeedDms = {
  RaeArcade: [
    { from: "RaeArcade", text: "You joining the raid after credits?" },
    { from: "YukiKaze", text: "Yes. Save me a slot." }
  ],
  NovaOnigiri: [
    { from: "NovaOnigiri", text: "I made a cozy watch list for Sunday." },
    { from: "YukiKaze", text: "Send it over." }
  ],
  KuroQuest: [
    { from: "KuroQuest", text: "Classic Mecha Night is starting soon." },
    { from: "YukiKaze", text: "I am bringing the nostalgia." }
  ]
};

function localRead(key, fallback) {
  try {
    return JSON.parse(localStorage.getItem(key) || "") || fallback;
  } catch {
    localStorage.setItem(key, JSON.stringify(fallback));
    return fallback;
  }
}

function localWrite(key, value) {
  localStorage.setItem(key, JSON.stringify(value));
  return value;
}

function supabaseHeaders(extra = {}) {
  const token = localStorage.getItem("nakaruSupabaseAccessToken");
  return {
    apikey: supabaseKey,
    Authorization: `Bearer ${token || supabaseKey}`,
    "Content-Type": "application/json",
    ...extra
  };
}

async function supabaseRest(path, options = {}) {
  const response = await fetch(`${supabaseUrl}/rest/v1/${path}`, {
    ...options,
    headers: supabaseHeaders(options.headers)
  });
  const payload = await readResponsePayload(response);
  if (!response.ok) throw new Error(readErrorMessage(payload, `Supabase request failed: ${response.status}`));
  return payload;
}

async function supabaseAuth(path, body) {
  const response = await fetch(`${supabaseUrl}/auth/v1/${path}`, {
    method: "POST",
    headers: supabaseHeaders(),
    body: JSON.stringify(body)
  });
  const payload = await readResponsePayload(response);
  if (!response.ok) throw new Error(readErrorMessage(payload, `Auth request failed: ${response.status}`));
  return payload;
}

async function readResponsePayload(response) {
  if (response.status === 204) return null;
  const text = await response.text();
  if (!text) return null;
  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}

function readErrorMessage(payload, fallback) {
  if (!payload) return fallback;
  if (typeof payload === "string") return payload;
  return payload.msg || payload.message || payload.error_description || payload.error || fallback;
}

function accountFromUser(user, fallback = {}) {
  if (!user) return null;
  const email = user.email || fallback.email || "";
  const username =
    user.user_metadata?.username ||
    user.user_metadata?.display_name ||
    fallback.username ||
    email.split("@")[0] ||
    "NakaruMember";
  return { id: user.id, username, email };
}

function storeSupabaseSession(result, fallback = {}) {
  const session = result?.session || result || {};
  const user = result?.user || session.user || null;
  const account = accountFromUser(user, fallback);
  if (session.access_token) localStorage.setItem("nakaruSupabaseAccessToken", session.access_token);
  if (session.refresh_token) localStorage.setItem("nakaruSupabaseRefreshToken", session.refresh_token);
  if (account) localStorage.setItem("nakaruAccount", JSON.stringify(account));
  return account;
}

function clearSupabaseSession() {
  localStorage.removeItem("nakaruSupabaseAccessToken");
  localStorage.removeItem("nakaruSupabaseRefreshToken");
  localStorage.removeItem("nakaruAccount");
}

async function getCurrentSupabaseUser() {
  if (!useSupabaseDirect) return null;

  if (supabaseClient?.auth?.getSession) {
    const { data, error } = await supabaseClient.auth.getSession();
    if (error) console.warn("Supabase session lookup failed", error);
    if (data?.session?.user) {
      storeSupabaseSession(data, { email: data.session.user.email });
      return data.session.user;
    }
  }

  const token = localStorage.getItem("nakaruSupabaseAccessToken");
  if (!token) return null;

  const response = await fetch(`${supabaseUrl}/auth/v1/user`, {
    headers: { apikey: supabaseKey, Authorization: `Bearer ${token}` }
  });
  const payload = await readResponsePayload(response);
  if (!response.ok) {
    clearSupabaseSession();
    console.warn("Supabase user lookup failed", readErrorMessage(payload, "Session expired."));
    return null;
  }
  return payload;
}

async function loadProfileForUser(user) {
  if (!user) return null;
  try {
    const rows = await supabaseRest(`profiles?id=eq.${encodeURIComponent(user.id)}&limit=1`);
    const row = rows?.[0];
    if (!row) return null;
    profile = {
      ...profile,
      name: row.display_name || row.username || profile.name || currentAccount?.username,
      bio: row.bio || profile.bio,
      photo: row.photo || row.avatar_url || profile.photo || "",
      banner: row.banner || row.banner_url || profile.banner || ""
    };
    localStorage.setItem("nakaruProfile", JSON.stringify(profile));
    return row;
  } catch (error) {
    console.warn("Profile load failed", error);
    return null;
  }
}

async function getCurrentAccountFromSupabase() {
  const user = await getCurrentSupabaseUser();
  if (!user) return { account: null };
  const account = accountFromUser(user);
  localStorage.setItem("nakaruAccount", JSON.stringify(account));
  await loadProfileForUser(user);
  return { account };
}

async function upsertAccount(account) {
  if (!account) return;
  await supabaseRest("accounts", {
    method: "POST",
    headers: { Prefer: "resolution=merge-duplicates,return=minimal" },
    body: JSON.stringify([{ id: account.id, username: account.username, email: account.email }])
  }).catch((error) => console.warn("Account mirror save failed", error));
}

async function upsertProfileForUser(user, values) {
  if (!user) throw new Error("Sign in required.");
  const row = {
    id: user.id,
    username: values.username || currentAccount?.username || user.email?.split("@")[0] || "NakaruMember",
    display_name: values.name || values.display_name || values.username || "Nakaru Member",
    bio: values.bio || "Anime fan, watch-party host, and co-op teammate.",
    avatar_url: values.photo || values.avatar_url || "",
    banner_url: values.banner || values.banner_url || "",
    photo: values.photo || values.avatar_url || "",
    banner: values.banner || values.banner_url || "",
    updated_at: new Date().toISOString()
  };
  const rows = await supabaseRest("profiles?on_conflict=id", {
    method: "POST",
    headers: { Prefer: "resolution=merge-duplicates,return=representation" },
    body: JSON.stringify([row])
  });
  return rows?.[0] || row;
}

function friendlyAuthMessage(error, mode) {
  const text = String(error?.message || error || "").toLowerCase();
  if (text.includes("confirm") || text.includes("verified")) {
    return "Please check your email and confirm your account before logging in.";
  }
  if (text.includes("invalid login") || text.includes("invalid credentials")) {
    return "Could not log in. Check the email and password.";
  }
  if (mode === "signup") return "Could not create account. Use a valid email and an 8+ character password.";
  return "Could not log in. Check the email and password.";
}

async function uploadImageToSupabase(dataUrl, folder = "posts") {
  if (!dataUrl?.startsWith("data:image/")) return dataUrl || "";
  const [meta, encoded] = dataUrl.split(",");
  const mime = meta.match(/data:(.*?);base64/)?.[1] || "image/png";
  const ext = mime.split("/")[1] || "png";
  const binary = atob(encoded);
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index += 1) bytes[index] = binary.charCodeAt(index);
  const path = `${folder}/${crypto.randomUUID()}.${ext}`;
  const bucket = "nakaru-uploads";

  const response = await fetch(`${supabaseUrl}/storage/v1/object/${bucket}/${path}`, {
    method: "POST",
    headers: {
      apikey: supabaseKey,
      Authorization: `Bearer ${localStorage.getItem("nakaruSupabaseAccessToken") || supabaseKey}`,
      "Content-Type": mime,
      "x-upsert": "false"
    },
    body: bytes
  });
  if (!response.ok) throw new Error(`Upload failed: ${response.status}`);
  return `${supabaseUrl}/storage/v1/object/public/${bucket}/${path}`;
}

async function supabaseApi(path, options = {}) {
  const method = options.method || "GET";
  const body = options.body ? JSON.parse(options.body) : {};
  const url = new URL(path, window.location.origin);
  const route = url.pathname.replace(/^\/api/, "");

  if (route === "/auth/me") {
    return getCurrentAccountFromSupabase();
  }

  if (route === "/auth/signup" && method === "POST") {
    let result;
    if (supabaseClient?.auth?.signUp) {
      const { data, error } = await supabaseClient.auth.signUp({
        email: body.email,
        password: body.password,
        options: { data: { username: body.username } }
      });
      if (error) throw error;
      result = data;
    } else {
      result = await supabaseAuth("signup", {
        email: body.email,
        password: body.password,
        data: { username: body.username }
      });
    }

    const hasSession = Boolean(result?.session?.access_token || result?.access_token);
    if (!hasSession) {
      clearSupabaseSession();
      return {
        account: null,
        needsEmailConfirmation: true,
        message: "Account created. Please check your email to confirm it before logging in."
      };
    }

    const account = storeSupabaseSession(result, { email: body.email, username: body.username });
    if (!account) throw new Error("Account was created but no user session was returned.");
    await upsertAccount(account);
    await upsertProfileForUser(result.user || result.session?.user, {
      username: account.username,
      name: account.username
    }).catch((error) => console.warn("Starter profile save failed", error));
    return { account, message: "Account created and signed in." };
  }

  if (route === "/auth/login" && method === "POST") {
    let result;
    if (supabaseClient?.auth?.signInWithPassword) {
      const { data, error } = await supabaseClient.auth.signInWithPassword({
        email: body.email,
        password: body.password
      });
      if (error) throw error;
      result = data;
    } else {
      result = await supabaseAuth("token?grant_type=password", {
        email: body.email,
        password: body.password
      });
    }

    const account = storeSupabaseSession(result, { email: body.email });
    if (!account) throw new Error("Could not start a signed-in session.");
    await upsertAccount(account);
    await loadProfileForUser(result.user || result.session?.user);
    return { account };
  }

  if (route === "/auth/logout" && method === "POST") {
    await supabaseClient?.auth?.signOut?.().catch((error) => console.warn("Supabase sign out failed", error));
    clearSupabaseSession();
    return { ok: true };
  }

  if (route === "/feed" && method === "GET") {
    const posts = await supabaseRest("feed_posts?appropriate=eq.true&order=at.desc");
    return { posts: posts.map(normalizeFeedPost) };
  }

  if (route === "/feed" && method === "POST") {
    const image = await uploadImageToSupabase(body.image, "posts");
    const youtubeUrl = body.youtubeUrl || getYouTubeUrlFromText(body.text || "");
    const post = {
      id: crypto.randomUUID(),
      from: body.from || displayName(),
      text: body.text || "Shared an image.",
      youtube_url: youtubeUrl,
      youtubeUrl,
      image,
      at: Date.now(),
      appropriate: true
    };
    await supabaseRest("feed_posts", {
      method: "POST",
      headers: { Prefer: "return=minimal" },
      body: JSON.stringify([post])
    });
    return { post: normalizeFeedPost(post), visible: true };
  }

  if (route === "/messages" && method === "GET") {
    const room = url.searchParams.get("room") || "Moonlit Lounge";
    const messages = await supabaseRest(`public_messages?room=eq.${encodeURIComponent(room)}&order=at.asc`);
    return { room, messages, roomCount: 1 };
  }

  if (route === "/messages" && method === "POST") {
    const message = { id: crypto.randomUUID(), room: body.room || "Moonlit Lounge", from: body.from, text: body.text, at: Date.now() };
    await supabaseRest("public_messages", {
      method: "POST",
      headers: { Prefer: "return=minimal" },
      body: JSON.stringify([message])
    });
    return { message };
  }

  if (route === "/dm" && method === "GET") {
    const thread = url.searchParams.get("thread") || "RaeArcade";
    const messages = await supabaseRest(`direct_messages?thread=eq.${encodeURIComponent(thread)}&order=at.asc`);
    return { thread, messages };
  }

  if (route === "/dm" && method === "POST") {
    const message = { id: crypto.randomUUID(), thread: body.thread || "RaeArcade", from: body.from, text: body.text, at: Date.now() };
    await supabaseRest("direct_messages", {
      method: "POST",
      headers: { Prefer: "return=minimal" },
      body: JSON.stringify([message])
    });
    return { message };
  }

  if (route === "/presence") {
    return { userId: localStorage.getItem("nakaruUserId") || crypto.randomUUID(), total: 1, room: body.room || "Moonlit Lounge", roomCount: 1, users: [] };
  }

  if (route === "/status") {
    return {
      ok: true,
      supabaseConfigured: useSupabaseDirect,
      oauth: {
        google: { configured: true, missing: [] },
        facebook: { configured: true, missing: [] },
        instagram: { configured: true, missing: [] },
        twitter: { configured: true, missing: [] }
      }
    };
  }

  if (route === "/search") {
    const q = url.searchParams.get("q") || "";
    return {
      query: q,
      images: [],
      posts: [],
      googleConfigured: false,
      links: {
        googleImages: `https://www.google.com/search?tbm=isch&q=${encodeURIComponent(`${q} anime character reference`)}`,
        googleSearch: `https://www.google.com/search?q=${encodeURIComponent(`${q} anime forum discussion`)}`
      }
    };
  }

  if (route === "/calls") return { callId: "demo", signals: [] };
  throw new Error(`Unknown Supabase route: ${route}`);
}

function localPostShape(post) {
  return {
    id: post.id || crypto.randomUUID(),
    from: post.from || displayName(),
    text: post.text || "",
    youtubeUrl: post.youtubeUrl || "",
    image: post.image || "",
    at: post.at || Date.now(),
    appropriate: post.appropriate ?? true
  };
}

function normalizeFeedPost(post) {
  return {
    ...post,
    from: post.from || post["from"] || displayName(),
    youtubeUrl: post.youtubeUrl || post.youtube_url || "",
    image: post.image || "",
    at: Number(post.at || Date.now()),
    appropriate: post.appropriate ?? true
  };
}

async function localApi(path, options = {}) {
  const method = options.method || "GET";
  const url = new URL(path, window.location.origin);
  const route = url.pathname.replace(/^\/api/, "").replace(/\/$/, "") || "/";
  const body = options.body ? JSON.parse(options.body) : {};

  if (route === "/status") {
    return {
      ok: true,
      appBaseUrl: window.location.origin,
      supabaseConfigured: useSupabaseDirect,
      googleSearchConfigured: false,
      oauth: {
        google: { configured: false, missing: ["GOOGLE_CLIENT_ID", "GOOGLE_CLIENT_SECRET"], redirectUri: `${window.location.origin}/api/auth/oauth/google/callback` },
        facebook: { configured: false, missing: ["FACEBOOK_CLIENT_ID", "FACEBOOK_CLIENT_SECRET"], redirectUri: `${window.location.origin}/api/auth/oauth/facebook/callback` },
        instagram: { configured: false, missing: ["INSTAGRAM_CLIENT_ID", "INSTAGRAM_CLIENT_SECRET"], redirectUri: `${window.location.origin}/api/auth/oauth/instagram/callback` },
        twitter: { configured: false, missing: ["X_CLIENT_ID"], redirectUri: `${window.location.origin}/api/auth/oauth/twitter/callback` }
      }
    };
  }

  if (route === "/auth/me" && method === "GET") {
    return { account: localRead("nakaruLocalAccount", null) };
  }

  if ((route === "/auth/signup" || route === "/auth/login") && method === "POST") {
    const account = {
      id: localStorage.getItem("nakaruLocalAccountId") || crypto.randomUUID(),
      username: body.username || body.email?.split("@")[0] || "NakaruMember",
      email: body.email || "member@nakaru-san.local"
    };
    localStorage.setItem("nakaruLocalAccountId", account.id);
    localWrite("nakaruLocalAccount", account);
    return { account };
  }

  if (route === "/feed" && method === "GET") {
    const posts = localRead("nakaruLocalFeed", [
      localPostShape({ from: "Ami", text: "Tonight's watch party is spoiler-safe. Drop your favorite opening themes.", at: Date.now() - 18000 }),
      localPostShape({ from: "RaeArcade", text: "Raid After Credits is open after the episode. Bring your builds.", at: Date.now() - 10000 })
    ]);
    return { posts: posts.filter((post) => post.appropriate).sort((a, b) => b.at - a.at) };
  }

  if (route === "/feed" && method === "POST") {
    const posts = localRead("nakaruLocalFeed", []);
    const post = localPostShape({ ...body, youtubeUrl: getYouTubeUrlFromText(body.text || "") });
    posts.unshift(post);
    localWrite("nakaruLocalFeed", posts);
    return { post, visible: true };
  }

  if (route === "/messages" && method === "GET") {
    const room = url.searchParams.get("room") || "Moonlit Lounge";
    const messages = localRead("nakaruLocalMessages", localSeedMessages);
    messages[room] ||= [];
    localWrite("nakaruLocalMessages", messages);
    return { room, messages: messages[room], roomCount: 1 };
  }

  if (route === "/messages" && method === "POST") {
    const room = body.room || "Moonlit Lounge";
    const messages = localRead("nakaruLocalMessages", localSeedMessages);
    messages[room] ||= [];
    const message = { id: crypto.randomUUID(), from: body.from || displayName(), text: body.text || "", at: Date.now() };
    messages[room].push(message);
    localWrite("nakaruLocalMessages", messages);
    return { message };
  }

  if (route === "/dm" && method === "GET") {
    const thread = url.searchParams.get("thread") || "RaeArcade";
    const messages = localRead("nakaruLocalDms", localSeedDms);
    messages[thread] ||= [];
    localWrite("nakaruLocalDms", messages);
    return { thread, messages: messages[thread] };
  }

  if (route === "/dm" && method === "POST") {
    const thread = body.thread || "RaeArcade";
    const messages = localRead("nakaruLocalDms", localSeedDms);
    messages[thread] ||= [];
    const message = { id: crypto.randomUUID(), from: body.from || displayName(), text: body.text || "", at: Date.now() };
    messages[thread].push(message);
    localWrite("nakaruLocalDms", messages);
    return { message };
  }

  if (route === "/presence") {
    return { users: [{ id: userId || "local", name: displayName(), room: activeRoom }], roomCount: 1, siteCount: 1 };
  }

  if (route === "/calls" && method === "GET") {
    const callId = url.searchParams.get("callId") || "call-local";
    const since = Number(url.searchParams.get("since") || 0);
    const signals = localRead("nakaruLocalCallSignals", {});
    return { callId, signals: (signals[callId] || []).filter((signal) => signal.at > since) };
  }

  if (route === "/calls" && method === "POST") {
    const callId = body.callId || "call-local";
    const signals = localRead("nakaruLocalCallSignals", {});
    signals[callId] ||= [];
    const signal = { id: crypto.randomUUID(), ...body, at: Date.now() };
    signals[callId].push(signal);
    localWrite("nakaruLocalCallSignals", signals);
    return { signal };
  }

  if (route === "/search" && method === "GET") {
    const q = url.searchParams.get("q") || "";
    return {
      query: q,
      images: [],
      posts: feedPosts.filter((post) => `${post.from} ${post.text}`.toLowerCase().includes(q.toLowerCase())),
      googleConfigured: false,
      links: {
        googleImages: `https://www.google.com/search?tbm=isch&q=${encodeURIComponent(`${q} anime character reference`)}`,
        googleSearch: `https://www.google.com/search?q=${encodeURIComponent(`${q} anime forum discussion`)}`
      }
    };
  }

  throw new Error(`Unknown local route: ${route}`);
}

async function api(path, options = {}) {
  if (useSupabaseDirect) return supabaseApi(path, options);
  const response = await fetch(path, {
    headers: { "Content-Type": "application/json", ...(options.headers || {}) },
    ...options
  });
  if (!response.ok) {
    let detail = response.statusText;
    try {
      const body = await response.json();
      detail = body.detail || body.error || detail;
    } catch {
      detail = await response.text().catch(() => detail);
    }
    throw new Error(detail || `Request failed: ${response.status}`);
  }
  return response.json();
}

async function chatApi(path, options = {}) {
  if (!useSupabaseDirect) {
    console.warn("Supabase not available.");
    throw new Error("Supabase unavailable");
  }
  return supabaseApi(path, options);
}

function showToast(title, text, options = {}) {
  const dedupeMs = options.dedupeMs || 0;
  const key = `${title}:${text}`;
  const now = Date.now();
  if (dedupeMs && key === lastToastKey && now - lastToastAt < dedupeMs) return;
  lastToastKey = key;
  lastToastAt = now;
  clearTimeout(toastTimer);
  document.querySelector(".toast")?.remove();
  const toast = document.createElement("div");
  toast.className = "toast";
  toast.innerHTML = `<strong>${title}</strong><span>${text}</span>`;
  document.body.appendChild(toast);
  toastTimer = setTimeout(() => toast.remove(), 4200);
}

function showSafeChatError() {
  const now = Date.now();
  if (now - lastSafeChatWarnAt < 60000) return;
  lastSafeChatWarnAt = now;
  console.warn("Chat temporarily unavailable.");
}

async function withButtonLoading(button, loadingText, task) {
  if (!button) return task();
  const originalText = button.textContent;
  button.disabled = true;
  button.textContent = loadingText;
  try {
    return await task();
  } finally {
    button.disabled = false;
    button.textContent = originalText;
  }
}

function scrollToSection(id) {
  const section = document.querySelector(`#${id}`);
  if (section) section.scrollIntoView({ behavior: "smooth", block: "start" });
}

function renderRooms(items) {
  roomList.innerHTML = items
    .map(
      (room) => `
        <article class="room-card">
          <div class="thumb" style="--room-bg: ${room.gradient}"></div>
          <div class="room-info">
            <strong>${room.title}</strong>
            <div class="room-meta">
              <span>${room.theme}</span>
              <span>${room.viewers} online now</span>
              <span>${room.tags.join(" | ")}</span>
            </div>
          </div>
          <button class="join-button ${room.title === activeRoom ? "active" : ""}" data-room="${room.title}" type="button">
            ${room.title === activeRoom ? "Joined" : "Join"}
          </button>
        </article>
      `
    )
    .join("");
}

function renderMessages(items, target) {
  target.innerHTML = items
    .map(({ from, text }) => {
      const initials = from.slice(0, 2).toUpperCase();
      return `
        <article class="message">
          <div class="avatar">${initials}</div>
          <div>
            <strong>${from}</strong>
            <span>${text}</span>
          </div>
        </article>
      `;
    })
    .join("");
  target.scrollTop = target.scrollHeight;
}

async function syncPresence() {
  try {
    const data = await api("/api/presence", {
      method: "POST",
      body: JSON.stringify({ userId, name: displayName(), room: activeRoom })
    });
    userId = data.userId;
    localStorage.setItem("nakaruUserId", userId);
    sitePresence.textContent = `${data.total} online`;
    const active = rooms.find((room) => room.title === activeRoom);
    if (active) active.viewers = String(data.roomCount);
    activeRoomStatus.textContent = `${data.roomCount} online`;
    renderRooms(rooms);
  } catch {
    sitePresence.textContent = "Offline";
  }
}

async function syncPublicMessages() {
  try {
    const data = await chatApi(`/api/messages?room=${encodeURIComponent(activeRoom)}`);
    renderMessages(data.messages, messageFeed);
    activeRoomStatus.textContent = `${data.roomCount} online`;
  } catch (error) {
    console.warn("Public chat sync failed", error);
    showSafeChatError();
  }
}

async function syncDmMessages() {
  try {
    const data = await chatApi(`/api/dm?thread=${encodeURIComponent(activeThread)}`);
    const thread = dmThreads.find((item) => item.name === activeThread);
    thread.messages = data.messages;
    if (data.messages.length) thread.preview = data.messages[data.messages.length - 1].text;
    renderActiveThread();
  } catch (error) {
    console.warn("Direct message sync failed", error);
    showSafeChatError();
  }
}

function getYouTubeUrlFromText(text) {
  const match = text.match(/https?:\/\/(?:www\.)?(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/shorts\/)[^\s]+/i);
  return match?.[0] || "";
}

function renderFeedPosts(posts) {
  feedList.innerHTML = posts
    .map((post) => {
      const videoId = getYouTubeId(post.youtubeUrl || getYouTubeUrlFromText(post.text));
      const video = videoId
        ? `
          <div class="post-video">
            <iframe
              src="https://www.youtube-nocookie.com/embed/${videoId}"
              title="Community YouTube post"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
              allowfullscreen>
            </iframe>
          </div>
        `
        : "";
      const image = post.image ? `<img class="post-image" src="${post.image}" alt="User post attachment" loading="lazy" />` : "";

      return `
        <article class="feed-post">
          <div class="post-head">
            <div class="avatar">${post.from.slice(0, 2).toUpperCase()}</div>
            <div>
              <strong>${post.from}</strong>
              <small>${new Date(post.at).toLocaleString()}</small>
            </div>
          </div>
          <div class="post-body">${post.text}</div>
          ${image}
          ${video}
          <div class="post-actions">
            <button type="button">Like</button>
            <button type="button">Comment</button>
            <button type="button">Share</button>
          </div>
        </article>
      `;
    })
    .join("");
  renderProfilePosts();
}

async function syncFeed() {
  try {
    const data = await api("/api/feed");
    feedPosts = data.posts;
    renderFeedPosts(feedPosts);
    feedStatus.textContent = `${feedPosts.length} posts`;
  } catch {
    feedStatus.textContent = "Offline";
  }
}

function renderActiveRoom() {
  const room = rooms.find((item) => item.title === activeRoom) || rooms[0];
  activeRoomTitle.textContent = room.title;
  featuredRoomTitle.textContent = room.title;
  featuredRoomMeta.textContent = `${room.theme} | ${room.tags.join(" | ")}`;
  renderRooms(rooms);
  syncPresence();
  syncPublicMessages();
}

function renderRequests(items) {
  requestList.innerHTML = items
    .map(
      (person) => `
        <article class="person" data-person="${person.name}">
          <div class="avatar">${person.initials}</div>
          <div class="person-main">
            <strong>${person.name}</strong>
            <div class="person-meta">${person.meta}</div>
            <div class="person-actions">
              <button class="accept" type="button">Accept</button>
              <button class="deny" type="button">Deny</button>
              <button class="block" type="button">Block</button>
            </div>
          </div>
        </article>
      `
    )
    .join("");
}

function renderThreads() {
  threadList.innerHTML = dmThreads
    .map(
      (thread) => `
        <button class="thread-button ${thread.name === activeThread ? "active" : ""}" data-thread="${thread.name}" type="button">
          <strong>${thread.name}</strong>
          <small>${thread.preview}</small>
        </button>
      `
    )
    .join("");
}

function renderActiveThread() {
  const thread = dmThreads.find((item) => item.name === activeThread) || dmThreads[0];
  activeDmStatus.textContent = thread.name;
  renderThreads();
  renderMessages(thread.messages, dmFeed);
}

function localSearch(query) {
  const needle = query.toLowerCase();
  const roomMatches = rooms.filter((room) =>
    [room.title, room.theme, ...room.tags].some((value) => value.toLowerCase().includes(needle))
  );
  const dmMatches = dmThreads
    .flatMap((thread) => thread.messages.map((message) => ({ thread: thread.name, ...message })))
    .filter((message) => `${message.from} ${message.text} ${message.thread}`.toLowerCase().includes(needle));
  const feedMatches = feedPosts.filter((post) => `${post.from} ${post.text}`.toLowerCase().includes(needle));
  return { roomMatches, dmMatches, feedMatches };
}

function resultCard(title, detail, link = "") {
  const tag = link ? "a" : "article";
  const href = link ? ` href="${link}" data-open-url="${link}"` : "";
  return `
    <${tag} class="result-card"${href}>
      <strong>${title}</strong>
      <span>${detail}</span>
    </${tag}>
  `;
}

async function runSearch(query) {
  const clean = query.trim();
  if (!clean) return;

  searchResultsTitle.textContent = `Results for ${clean}`;
  searchResultsStatus.textContent = "Searching";
  scrollToSection("searchResultsPanel");

  const { roomMatches, dmMatches, feedMatches } = localSearch(clean);
  let remote = { images: [], posts: [], googleConfigured: false, links: {} };
  try {
    remote = await api(`/api/search?q=${encodeURIComponent(clean)}`);
  } catch {
    remote.links = {
      googleImages: `https://www.google.com/search?tbm=isch&q=${encodeURIComponent(`${clean} anime character reference`)}`,
      googleSearch: `https://www.google.com/search?q=${encodeURIComponent(`${clean} anime forum discussion`)}`
    };
  }

  const localRooms = roomMatches.length
    ? roomMatches.map((room) => resultCard(room.title, `${room.theme} | ${room.tags.join(" | ")}`)).join("")
    : resultCard("No matching Nakaru-san rooms yet", "Create or join a room for this topic.");

  const localPosts = dmMatches.length
    ? dmMatches.map((post) => resultCard(`${post.thread} | ${post.from}`, post.text)).join("")
    : resultCard("No matching Nakaru-san messages yet", "Public and direct posts will appear here as people talk.");
  const feedResults = feedMatches.length
    ? feedMatches.map((post) => resultCard(`${post.from} on the home feed`, post.text)).join("")
    : resultCard("No matching home feed posts yet", "Community posts related to your search will appear here.");

  const imageResults = remote.images?.length
    ? `<div class="image-results">${remote.images
        .map(
          (image) => `
            <a class="result-card image-result" href="${image.link}" data-open-url="${image.link}">
              <img src="${image.thumbnail || image.link}" alt="${image.title}" loading="lazy" />
              <small>${image.title}</small>
            </a>
          `
        )
        .join("")}</div>`
    : resultCard("Open Google Images reference search", "Uses Google directly until API keys are added.", remote.links.googleImages);

  const postResults = remote.posts?.length
    ? remote.posts.map((post) => resultCard(post.title, post.snippet, post.link)).join("")
    : resultCard("Open Google discussion search", "Find related public posts and discussions on Google.", remote.links.googleSearch);

  searchResults.innerHTML = `
    <section class="result-group">
      <h3>Nakaru-san rooms</h3>
      ${localRooms}
    </section>
    <section class="result-group">
      <h3>Nakaru-san posts</h3>
      ${localPosts}
    </section>
    <section class="result-group">
      <h3>Home feed posts</h3>
      ${feedResults}
    </section>
    <section class="result-group">
      <h3>Reference images</h3>
      ${imageResults}
    </section>
    <section class="result-group">
      <h3>Related public posts</h3>
      ${postResults}
    </section>
  `;
  searchResultsStatus.textContent = remote.googleConfigured ? "Google API" : "Links";
}

function getYouTubeId(value) {
  try {
    const url = new URL(value.trim());
    if (url.hostname.includes("youtu.be")) return url.pathname.slice(1).split("/")[0];
    if (url.hostname.includes("youtube.com")) {
      if (url.pathname === "/watch") return url.searchParams.get("v");
      if (url.pathname.startsWith("/shorts/")) return url.pathname.split("/")[2];
      if (url.pathname.startsWith("/embed/")) return url.pathname.split("/")[2];
    }
  } catch {
    return "";
  }
  return "";
}

function loadYouTubeVideo(value, options = {}) {
  const videoId = getYouTubeId(value);
  if (!videoId) {
    watchStatus.textContent = "Invalid link";
    showToast("YouTube link needed", "Paste a valid youtube.com or youtu.be video link.");
    return "";
  }

  youtubeEmbed.innerHTML = `
    <iframe
      src="https://www.youtube-nocookie.com/embed/${videoId}"
      title="Shared YouTube video"
      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
      allowfullscreen>
    </iframe>
  `;
  watchStatus.textContent = "Loaded";
  scrollToSection("watchTogether");
  if (!options.silent) showToast("Video loaded", "The YouTube video is ready in the shared player.");
  return videoId;
}

async function postYouTubeVideo() {
  const url = youtubeInput.value.trim();
  const videoId = loadYouTubeVideo(url, { silent: true });
  if (!videoId) return;

  const postText = `Shared a YouTube video: ${url}`;
  const data = await api("/api/feed", {
    method: "POST",
    body: JSON.stringify({
      from: displayName(),
      text: postText,
      youtubeUrl: url,
      image: ""
    })
  });

  youtubeInput.value = "";
  watchStatus.textContent = "Posted";
  if (data.visible) {
    feedPosts = [data.post, ...feedPosts.filter((post) => post.id !== data.post.id)];
    renderFeedPosts(feedPosts);
    feedStatus.textContent = `${feedPosts.length} posts`;
    showToast("Video posted", "The YouTube video is now on the Nakaru-san home feed.");
  } else {
    showToast("Post held", "That video post needs review before it appears on the home feed.");
  }
}

function setAuthMode(mode) {
  authMode = mode;
  const signingUp = mode === "signup";
  authTitle.textContent = signingUp ? "Create account" : "Log in";
  authSubmitButton.textContent = signingUp ? "Create account" : "Log in";
  authUsername.closest("label").style.display = signingUp ? "grid" : "none";
  signupTab.classList.toggle("active", signingUp);
  loginTab.classList.toggle("active", !signingUp);
  authMessage.textContent = "Social sign in opens through Supabase when those providers are enabled.";
}

function updateAccountUi() {
  accountButton.textContent = currentAccount ? currentAccount.username : "Sign In";
  document.querySelector(".profile-mini strong").textContent = displayName();
  renderProfile();
}

function renderProfile() {
  const name = displayName();
  const bio = profile.bio || "Anime fan, watch-party host, and co-op teammate.";
  profileName.textContent = name;
  profileBio.textContent = bio;
  profileNameInput.value = profile.name || currentAccount?.username || "YukiKaze";
  profileBioInput.value = bio;
  profilePhoto.textContent = profile.photo ? "" : name.slice(0, 2).toUpperCase();
  profilePhoto.style.backgroundImage = profile.photo ? `url(${profile.photo})` : "";
  profileBanner.style.backgroundImage = profile.banner ? `url(${profile.banner})` : "";
  document.querySelectorAll(".profile-mini .avatar").forEach((avatar) => {
    avatar.textContent = profile.photo ? "" : name.slice(0, 2).toUpperCase();
    avatar.style.backgroundImage = profile.photo ? `url(${profile.photo})` : "";
    avatar.style.backgroundSize = "cover";
    avatar.style.backgroundPosition = "center";
  });
  renderProfilePosts();
}

function renderProfilePosts() {
  const mine = feedPosts.filter((post) => post.from === displayName() || post.from === currentAccount?.username || post.from === "YukiKaze");
  profilePosts.innerHTML = mine.length
    ? mine.map((post) => resultCard(post.text, new Date(post.at).toLocaleString())).join("")
    : resultCard("No posts yet", "Your community posts will appear here.");
}

function readImage(input) {
  return new Promise((resolve) => {
    const file = input.files?.[0];
    if (!file) return resolve("");
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.readAsDataURL(file);
  });
}

async function prepareProfileImage(dataUrl, folder, existing) {
  if (!dataUrl) return existing || "";
  try {
    return await uploadImageToSupabase(dataUrl, folder);
  } catch (error) {
    console.warn("Profile image upload failed; saving inline image instead.", error);
    return dataUrl;
  }
}

async function saveProfile(event) {
  event?.preventDefault?.();
  await withButtonLoading(saveProfileButton, "Saving...", async () => {
    try {
      const user = await getCurrentSupabaseUser();
      if (!user) {
        showToast("Sign in needed", "Please create an account or log in before saving your profile.");
        setAuthMode("login");
        authModal.showModal();
        return;
      }

      const photoData = await readImage(profilePhotoInput);
      const bannerData = await readImage(profileBannerInput);
      const nextProfile = {
        ...profile,
        name: profileNameInput.value.trim() || displayName(),
        bio: profileBioInput.value.trim() || "Anime fan, watch-party host, and co-op teammate.",
        photo: await prepareProfileImage(photoData, "profiles", profile.photo),
        banner: await prepareProfileImage(bannerData, "profiles", profile.banner)
      };

      const saved = await upsertProfileForUser(user, {
        username: currentAccount?.username,
        name: nextProfile.name,
        bio: nextProfile.bio,
        photo: nextProfile.photo,
        banner: nextProfile.banner
      });

      profile = {
        ...nextProfile,
        name: saved.display_name || nextProfile.name,
        bio: saved.bio || nextProfile.bio,
        photo: saved.photo || saved.avatar_url || nextProfile.photo,
        banner: saved.banner || saved.banner_url || nextProfile.banner
      };
      localStorage.setItem("nakaruProfile", JSON.stringify(profile));
      profilePhotoInput.value = "";
      profileBannerInput.value = "";
      renderProfile();
      saveProfileButton.blur();
      scrollToSection("profilePage");
      showToast("Profile saved", "Your profile is saved and connected to your account.");
    } catch (error) {
      console.error("Profile save failed", error);
      showToast("Profile not saved", "This feature is temporarily unavailable.");
    }
  });
}

async function syncAccount() {
  try {
    const data = await api("/api/auth/me");
    currentAccount = data.account;
    updateAccountUi();
  } catch (error) {
    console.warn("Account session sync failed", error);
    currentAccount = null;
    updateAccountUi();
  }
}

async function submitAuth() {
  const path = authMode === "signup" ? "/api/auth/signup" : "/api/auth/login";
  const loadingText = authMode === "signup" ? "Creating..." : "Logging in...";
  await withButtonLoading(authSubmitButton, loadingText, async () => {
    try {
      authMessage.textContent = "";
      const data = await api(path, {
        method: "POST",
        body: JSON.stringify({
          username: authUsername.value.trim(),
          email: authEmail.value.trim(),
          password: authPassword.value
        })
      });
      if (data.needsEmailConfirmation) {
        authMessage.textContent = data.message;
        showToast("Check your email", data.message);
        return;
      }

      currentAccount = data.account;
      await loadProfileForUser(await getCurrentSupabaseUser());
      authModal.close();
      updateAccountUi();
      showToast("Welcome", `Signed in as ${displayName()}.`);
    } catch (error) {
      console.error("Authentication failed", error);
      authMessage.textContent = friendlyAuthMessage(error, authMode);
    }
  });
}

function updateRequest(event) {
  const action = event.target.closest("button");
  const personCard = event.target.closest(".person");
  if (!action || !personCard) return;

  const name = personCard.dataset.person;
  const decision = action.textContent.trim().toLowerCase();
  const label = decision === "block" ? "blocked" : `${decision}ed`;
  personCard.querySelector(".person-main").innerHTML = `
    <strong>${name}</strong>
    <div class="person-meta">Request ${label}. ${decision === "accept" ? "Direct messaging is now available." : ""}</div>
  `;
  showToast("Friend request updated", `${name} was ${label}.`);
}

async function startLiveRoom() {
  const roomName = `YukiKaze Live ${new Date().toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}`;
  try {
    broadcastStream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
  } catch {
    showToast("Streaming permission needed", "Allow camera and microphone access to go live.");
    return;
  }

  if (!rooms.find((room) => room.title === roomName)) {
    rooms.unshift({
      title: roomName,
      theme: "Live anime and gaming creator stream",
      viewers: "1",
      tags: ["Live video", "Creator chat", "Friends invited"],
      gradient: "linear-gradient(145deg, #f4c95d, #7c3cff 52%, #07060a)"
    });
  }

  activeRoom = roomName;
  await chatApi("/api/messages", {
      method: "POST",
      body: JSON.stringify({ room: roomName, from: "System", text: `${displayName()} went live. Chat is open.` })
  }).catch(() => showSafeChatError());

  broadcastVideo.srcObject = broadcastStream;
  broadcastVideo.hidden = false;
  streamScreen.classList.add("is-broadcasting");
  streamControls.hidden = false;
  liveChip.textContent = "YOU ARE LIVE | streaming";
  hostCard.hidden = false;
  renderActiveRoom();
  scrollToSection("messages");
  showToast("Live stream started", "Your camera and microphone are broadcasting in the Nakaru-san player.");
}

function stopLiveStream() {
  if (broadcastStream) {
    broadcastStream.getTracks().forEach((track) => track.stop());
    broadcastStream = null;
  }
  broadcastVideo.srcObject = null;
  broadcastVideo.hidden = true;
  streamScreen.classList.remove("is-broadcasting");
  streamControls.hidden = true;
  hostCard.hidden = true;
  liveChip.textContent = "LIVE | watch rooms";
  showToast("Live stream stopped", "Camera and microphone tracks were stopped.");
}

async function startCall(kind) {
  const wantsVideo = kind === "Video";
  const friend = activeThread || "RaeArcade";

  try {
    localStream = await navigator.mediaDevices.getUserMedia({ video: wantsVideo, audio: true });
    await startPeerSignaling(friend);
    selfVideo.srcObject = localStream;
    selfVideo.hidden = !wantsVideo;
    selfTile.hidden = wantsVideo;
    callStage.classList.add("in-call");
    callName.innerHTML = `${kind} call with ${friend}<span class="media-note">Camera/microphone are active. Open this site in a second browser tab and start the same call to complete a WebRTC connection.</span>`;
    callStatus.textContent = wantsVideo ? "Camera + mic active" : "Mic active";
    endCallButton.disabled = false;
    scrollToSection("calls");
    showToast(`${kind} call active`, "Your browser granted real media access over Wi-Fi.");
  } catch (error) {
    callStatus.textContent = "Permission needed";
    showToast("Call permission needed", "Allow camera and microphone access in the browser to place calls.");
  }
}

async function startPeerSignaling(friend) {
  stopPeerConnection();
  const callId = `call-${friend}`;
  peerConnection = new RTCPeerConnection({
    iceServers: [{ urls: "stun:stun.l.google.com:19302" }]
  });

  localStream.getTracks().forEach((track) => peerConnection.addTrack(track, localStream));
  peerConnection.onicecandidate = (event) => {
    if (event.candidate) {
      api("/api/calls", {
        method: "POST",
        body: JSON.stringify({ callId, from: userId || "YukiKaze", type: "candidate", payload: event.candidate })
      }).catch(() => {});
    }
  };
  peerConnection.onconnectionstatechange = () => {
    if (peerConnection?.connectionState === "connected") callStatus.textContent = "Connected peer-to-peer";
    if (peerConnection?.connectionState === "failed") callStatus.textContent = "Call reconnecting";
  };

  const offer = await peerConnection.createOffer();
  await peerConnection.setLocalDescription(offer);
  await api("/api/calls", {
    method: "POST",
    body: JSON.stringify({ callId, from: userId || "YukiKaze", type: "offer", payload: offer })
  });

  callPollTimer = setInterval(() => pollCallSignals(callId), 1500);
}

async function pollCallSignals(callId) {
  if (!peerConnection) return;
  const data = await api(`/api/calls?callId=${encodeURIComponent(callId)}&since=${lastSignalAt}`);
  for (const signal of data.signals) {
    lastSignalAt = Math.max(lastSignalAt, signal.at);
    if (signal.from === userId) continue;

    if (signal.type === "offer" && !peerConnection.currentRemoteDescription) {
      await peerConnection.setRemoteDescription(signal.payload);
      const answer = await peerConnection.createAnswer();
      await peerConnection.setLocalDescription(answer);
      await api("/api/calls", {
        method: "POST",
        body: JSON.stringify({ callId, from: userId || "YukiKaze", type: "answer", payload: answer })
      });
    }

    if (signal.type === "answer" && !peerConnection.currentRemoteDescription) {
      await peerConnection.setRemoteDescription(signal.payload);
    }

    if (signal.type === "candidate" && peerConnection.currentRemoteDescription) {
      await peerConnection.addIceCandidate(signal.payload);
    }
  }
}

function stopPeerConnection() {
  clearInterval(callPollTimer);
  callPollTimer = null;
  lastSignalAt = 0;
  if (peerConnection) {
    peerConnection.close();
    peerConnection = null;
  }
}

function endCall() {
  stopPeerConnection();
  if (localStream) {
    localStream.getTracks().forEach((track) => track.stop());
    localStream = null;
  }
  selfVideo.srcObject = null;
  selfVideo.hidden = true;
  selfTile.hidden = false;
  callStage.classList.remove("in-call");
  callName.textContent = "Choose a friend to call";
  callStatus.textContent = "Ready";
  endCallButton.disabled = true;
  showToast("Call ended", "Camera and microphone tracks were stopped.");
}

document.querySelectorAll(".nav-item").forEach((item) => {
  item.addEventListener("click", () => {
    document.querySelectorAll(".nav-item").forEach((nav) => nav.classList.remove("active"));
    item.classList.add("active");
    scrollToSection(item.dataset.section);
  });
});

roomList.addEventListener("click", (event) => {
  const joinButton = event.target.closest(".join-button");
  if (!joinButton) return;
  activeRoom = joinButton.dataset.room;
  renderActiveRoom();
  scrollToSection("messages");
  showToast("Room joined", `You joined ${activeRoom}. The presence count updates live.`);
});

threadList.addEventListener("click", (event) => {
  const threadButton = event.target.closest(".thread-button");
  if (!threadButton) return;
  activeThread = threadButton.dataset.thread;
  syncDmMessages();
});

messageForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  const text = messageInput.value.trim();
  if (!text) return;
  try {
    await chatApi("/api/messages", { method: "POST", body: JSON.stringify({ room: activeRoom, from: displayName(), text }) });
    messageInput.value = "";
    syncPublicMessages();
  } catch {
    showSafeChatError();
  }
});

dmForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  const text = dmInput.value.trim();
  if (!text) return;
  try {
    await chatApi("/api/dm", { method: "POST", body: JSON.stringify({ thread: activeThread, from: displayName(), text }) });
    dmInput.value = "";
    syncDmMessages();
  } catch {
    showSafeChatError();
  }
});

requestList.addEventListener("click", updateRequest);
searchForm.addEventListener("submit", (event) => {
  event.preventDefault();
  runSearch(searchInput.value);
});
searchInput.addEventListener("input", () => {
  clearTimeout(searchTimer);
  searchTimer = setTimeout(() => runSearch(searchInput.value), 450);
});
searchInput.addEventListener("keydown", (event) => {
  if (event.key === "Enter") {
    event.preventDefault();
    runSearch(searchInput.value);
  }
});
searchResults.addEventListener("click", (event) => {
  const link = event.target.closest("[data-open-url]");
  if (!link) return;
  event.preventDefault();
  window.location.href = link.dataset.openUrl;
});
youtubeForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  const button = youtubeForm.querySelector("button[type='submit']");
  await withButtonLoading(button, "Posting...", async () => {
    try {
      await postYouTubeVideo();
    } catch (error) {
      console.error("YouTube post failed", error);
      showToast("Video not posted", "This feature is temporarily unavailable.");
    }
  });
});
accountButton.addEventListener("click", () => {
  setAuthMode("signup");
  authModal.showModal();
});
closeAuthButton.addEventListener("click", () => authModal.close());
signupTab.addEventListener("click", () => setAuthMode("signup"));
loginTab.addEventListener("click", () => setAuthMode("login"));
authForm.addEventListener("submit", (event) => {
  event.preventDefault();
  submitAuth();
});
document.querySelectorAll("[data-provider]").forEach((button) => {
  button.addEventListener("click", async () => {
    const provider = button.dataset.provider;
    await withButtonLoading(button, "Opening...", async () => {
      if (!useSupabaseDirect) {
        authMessage.textContent = "Social sign in needs Supabase configured first.";
        return;
      }
      const redirectTo = `${window.location.origin}${window.location.pathname}`;
      if (supabaseClient?.auth?.signInWithOAuth) {
        const { error } = await supabaseClient.auth.signInWithOAuth({
          provider,
          options: { redirectTo }
        });
        if (error) {
          console.error("Social login failed", error);
          authMessage.textContent = "Social sign in is temporarily unavailable.";
        }
        return;
      }
      window.location.href = `${supabaseUrl}/auth/v1/authorize?provider=${encodeURIComponent(provider)}&redirect_to=${encodeURIComponent(redirectTo)}`;
    });
  });
});
saveProfileButton.addEventListener("click", saveProfile);
postForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  const button = postForm.querySelector("button[type='submit']");
  await withButtonLoading(button, "Posting...", async () => {
    try {
      const text = postInput.value.trim();
      const image = await readImage(postImageInput);
      if (!text && !image) return;
      const data = await api("/api/feed", { method: "POST", body: JSON.stringify({ from: displayName(), text: text || "Shared an image.", image }) });
      postInput.value = "";
      postImageInput.value = "";
      if (data.visible) {
        showToast("Post published", "Your post is now on the Nakaru-san home feed.");
      } else {
        showToast("Post held", "That post needs review before it appears on the home feed.");
      }
      if (data.post) {
        feedPosts = [data.post, ...feedPosts.filter((post) => post.id !== data.post.id)];
        renderFeedPosts(feedPosts);
        feedStatus.textContent = `${feedPosts.length} posts`;
      }
      syncFeed();
    } catch (error) {
      console.error("Post creation failed", error);
      showToast("Post not published", "This feature is temporarily unavailable.");
    }
  });
});
byId("startRoomButton").addEventListener("click", startLiveRoom);
byId("stopStreamButton").addEventListener("click", stopLiveStream);
byId("exploreRoomsButton").addEventListener("click", () => scrollToSection("rooms"));
byId("viewRequestsButton").addEventListener("click", () => scrollToSection("friends"));
byId("notificationsButton").addEventListener("click", () => showToast("Notifications", "Friend requests, room invites, and DMs update through Nakaru-san."));
byId("videoCallButton").addEventListener("click", () => startCall("Video"));
byId("voiceCallButton").addEventListener("click", () => startCall("Voice"));
byId("endCallButton").addEventListener("click", endCall);

renderActiveRoom();
renderRequests(requests);
renderProfile();
syncAccount();
syncDmMessages();
syncFeed();
setInterval(syncPresence, 3000);
setInterval(syncPublicMessages, 3500);
setInterval(syncDmMessages, 4000);
setInterval(syncFeed, 5000);
