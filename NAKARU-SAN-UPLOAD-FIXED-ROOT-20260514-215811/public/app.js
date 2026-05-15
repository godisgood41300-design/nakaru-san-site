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
let postsTableWarningShown = false;
let postsTableUnavailable = false;

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
const livePlaceholder = document.querySelector("#livePlaceholder");
const chatStartLiveButton = document.querySelector("#chatStartLiveButton");
const chatHomeButton = document.querySelector("#chatHomeButton");
const chatProfileButton = document.querySelector("#chatProfileButton");
const homeSection = document.querySelector("#home");
const homeDashboard = document.querySelector("#homeDashboard");
const chatRoomPage = document.querySelector("#chat-room");
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
const streamScreen = document.querySelector("#chat-room .stream-screen") || document.querySelector(".stream-screen");
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
const editProfileButton = document.querySelector("#editProfileButton");
const profilePanel = document.querySelector("#profilePage");
const profileEditor = document.querySelector(".profile-editor");
let profile = JSON.parse(localStorage.getItem("nakaruProfile") || "{}");
let profileEditing = false;

const APP_VERSION = "20260514-oauth-provider-fix";
console.info("Nakaru-san app loaded", APP_VERSION);

// Social providers must be enabled in Supabase Dashboard > Authentication > Providers.
// Also add the live site origin to Supabase Auth URL Configuration redirect URLs.
const oauthProviderMap = {
  google: { provider: "google", label: "Google" },
  facebook: { provider: "facebook", label: "Facebook" },
  twitter: { provider: "twitter", label: "X" },
  github: { provider: "github", label: "GitHub" }
};

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

async function fetchWithTimeout(url, options = {}, timeoutMs = 15000) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { ...options, signal: options.signal || controller.signal });
  } finally {
    clearTimeout(timer);
  }
}

async function supabaseRest(path, options = {}) {
  const response = await fetchWithTimeout(`${supabaseUrl}/rest/v1/${path}`, {
    ...options,
    headers: supabaseHeaders(options.headers)
  });
  const payload = await readResponsePayload(response);
  if (!response.ok) throw new Error(readErrorMessage(payload, `Supabase request failed: ${response.status}`));
  return payload;
}

async function supabaseAuth(path, body) {
  const response = await fetchWithTimeout(`${supabaseUrl}/auth/v1/${path}`, {
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

  const response = await fetchWithTimeout(`${supabaseUrl}/auth/v1/user`, {
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
    username: cleanUsername(values.username || currentAccount?.username || user.email?.split("@")[0]),
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
    return "Please confirm your email before logging in.";
  }
  if (text.includes("invalid login") || text.includes("invalid credentials")) {
    return "Could not log in. Check the email and password.";
  }
  if (mode === "signup") return "Could not create account. Use a valid email and an 8+ character password.";
  return "Could not log in. Check the email and password.";
}

function cleanUsername(value, fallback = "NakaruMember") {
  const cleaned = String(value || fallback)
    .trim()
    .replace(/^@/, "")
    .replace(/[^a-zA-Z0-9_]/g, "_")
    .replace(/_+/g, "_")
    .slice(0, 32);
  return cleaned || fallback;
}

async function requireSignedInUser() {
  const user = await getCurrentSupabaseUser();
  if (!user) throw new Error("Sign in required.");
  currentAccount = accountFromUser(user);
  localStorage.setItem("nakaruAccount", JSON.stringify(currentAccount));
  return user;
}

async function fetchProfilesForPosts(posts) {
  const ids = [...new Set(posts.map((post) => post.user_id).filter(Boolean))]
    .filter((id) => /^[0-9a-f-]{36}$/i.test(id));
  if (!ids.length) return new Map();

  try {
    const rows = await supabaseRest(`profiles?id=in.(${ids.join(",")})`);
    return new Map((rows || []).map((row) => [row.id, row]));
  } catch (error) {
    console.warn("Post profile lookup failed", error);
    return new Map();
  }
}

async function fetchSupabaseFeedPosts() {
  let postsRows = [];
  if (!postsTableUnavailable) {
    try {
      postsRows = await supabaseRest("posts?select=*&order=created_at.desc");
    } catch (error) {
      postsTableUnavailable = true;
      if (!postsTableWarningShown) {
        postsTableWarningShown = true;
        console.warn("Posts table fetch failed", error);
      }
    }
  }

  const profiles = await fetchProfilesForPosts(postsRows || []);
  const posts = (postsRows || []).map((post) => normalizeFeedPost(post, profiles.get(post.user_id)));

  let legacyPosts = [];
  try {
    const rows = await supabaseRest("feed_posts?appropriate=eq.true&order=at.desc");
    legacyPosts = (rows || []).map((post) => normalizeFeedPost(post));
  } catch {
    legacyPosts = [];
  }

  return [...posts, ...legacyPosts].sort((a, b) => b.at - a.at);
}

async function createSupabaseFeedPost(body) {
  const user = await requireSignedInUser();
  const content = (body.content || body.text || "").trim();
  const youtubeEmbedUrl = body.youtubeUrl ? getYouTubeEmbedUrl(body.youtubeUrl) : getYouTubeEmbedUrl(content);
  const youtubeUrl = body.youtubeUrl || getYouTubeUrlFromText(content) || "";
  const uploadedImage = await uploadImageToSupabase(body.image, "posts");
  const postType = youtubeEmbedUrl ? "youtube" : uploadedImage ? "image" : "text";

  if (!content && !uploadedImage && !youtubeEmbedUrl) throw new Error("Post content required.");

  const row = {
    user_id: user.id,
    content: content || (youtubeEmbedUrl ? "Shared a YouTube video." : "Shared an image."),
    post_type: postType,
    media_url: uploadedImage || null,
    youtube_url: youtubeUrl || null,
    youtube_embed_url: youtubeEmbedUrl || null,
    updated_at: new Date().toISOString()
  };

  const savedRows = await supabaseRest("posts", {
    method: "POST",
    headers: { Prefer: "return=representation" },
    body: JSON.stringify([row])
  });
  const profiles = await fetchProfilesForPosts(savedRows || []);
  return normalizeFeedPost(savedRows?.[0] || row, profiles.get(user.id));
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

  const response = await fetchWithTimeout(`${supabaseUrl}/storage/v1/object/${bucket}/${path}`, {
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
    const posts = await fetchSupabaseFeedPosts();
    return { posts };
  }

  if (route === "/feed" && method === "POST") {
    const post = await createSupabaseFeedPost(body);
    return { post, visible: true };
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
        twitter: { configured: true, missing: [] },
        github: { configured: true, missing: [] }
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
    user_id: post.user_id || "",
    from: post.from || displayName(),
    text: post.content || post.text || "",
    content: post.content || post.text || "",
    postType: post.post_type || post.postType || "",
    youtubeUrl: post.youtubeUrl || "",
    youtubeEmbedUrl: post.youtube_embed_url || post.youtubeEmbedUrl || getYouTubeEmbedUrl(post.youtubeUrl || post.text || ""),
    image: post.image || "",
    at: post.at || Date.now(),
    appropriate: post.appropriate ?? true
  };
}

function normalizeFeedPost(post, authorProfile = null) {
  const createdAt = post.created_at ? new Date(post.created_at).getTime() : Number(post.at || Date.now());
  const content = post.content || post.text || "";
  const authorName =
    authorProfile?.display_name ||
    authorProfile?.username ||
    post.from ||
    post["from"] ||
    currentAccount?.username ||
    displayName();
  const youtubeUrl = post.youtube_embed_url || post.youtube_url || post.youtubeUrl || getYouTubeUrlFromText(content);
  return {
    ...post,
    user_id: post.user_id || "",
    from: authorName,
    text: content,
    content,
    postType: post.post_type || (youtubeUrl ? "youtube" : post.media_url || post.image ? "image" : "text"),
    youtubeUrl,
    youtubeEmbedUrl: post.youtube_embed_url || getYouTubeEmbedUrl(youtubeUrl),
    image: post.media_url || post.image || "",
    at: createdAt,
    created_at: post.created_at || new Date(createdAt).toISOString(),
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
        twitter: { configured: false, missing: ["X_CLIENT_ID"], redirectUri: `${window.location.origin}/api/auth/oauth/twitter/callback` },
        github: { configured: false, missing: ["GITHUB_CLIENT_ID", "GITHUB_CLIENT_SECRET"], redirectUri: `${window.location.origin}/api/auth/oauth/github/callback` }
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
    const embedUrl = body.youtubeUrl ? getYouTubeEmbedUrl(body.youtubeUrl) : getYouTubeEmbedUrl(body.text || "");
    const post = localPostShape({
      ...body,
      user_id: currentAccount?.id || "",
      content: body.content || body.text || "",
      post_type: embedUrl ? "youtube" : body.image ? "image" : "text",
      youtubeUrl: body.youtubeUrl || getYouTubeUrlFromText(body.text || ""),
      youtube_embed_url: embedUrl
    });
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
  const response = await fetchWithTimeout(path, {
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

async function withButtonPending(button, pendingText, task) {
  if (!button) return task();
  if (button.dataset.pending === "true") return undefined;
  const originalHtml = button.innerHTML;
  const wasDisabled = button.disabled;
  button.dataset.pending = "true";
  button.setAttribute("aria-busy", "true");
  button.disabled = true;
  button.textContent = pendingText;
  try {
    return await task();
  } finally {
    delete button.dataset.pending;
    button.removeAttribute("aria-busy");
    button.disabled = wasDisabled;
    button.innerHTML = originalHtml;
  }
}

function bindOnce(element, eventName, key, handler) {
  if (!element) {
    console.warn(`Nakaru-san handler missing: ${key}`);
    return;
  }
  const attr = `data-nakaru-bound-${key}`;
  if (element.hasAttribute(attr)) return;
  element.setAttribute(attr, "true");
  element.addEventListener(eventName, handler);
  console.debug(`Nakaru-san handler attached: ${key}`);
}

function scrollToSection(id) {
  const section = document.querySelector(`#${id}`);
  if (section) section.scrollIntoView({ behavior: "smooth", block: "start" });
}

function setAppView(view, target = "") {
  const showingChat = view === "chat-room";
  if (chatRoomPage) chatRoomPage.hidden = !showingChat;
  if (homeSection) homeSection.hidden = showingChat;
  if (homeDashboard) homeDashboard.hidden = showingChat;
  document.body.dataset.view = showingChat ? "chat-room" : "home";
  if (showingChat) {
    renderRooms(rooms);
    syncPublicMessages();
    syncPresence();
  }
  scrollToSection(target || (showingChat ? "chat-room" : "home"));
}

function navigateToSection(sectionId) {
  const chatTargets = new Set(["chat-room", "rooms", "messages"]);
  if (chatTargets.has(sectionId)) {
    setAppView("chat-room", sectionId === "chat-room" ? "chat-room" : sectionId);
    return;
  }
  setAppView("home", sectionId);
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
  const match = text.match(/https?:\/\/(?:(?:www\.|m\.)?youtube\.com\/watch\?v=|youtu\.be\/|(?:www\.|m\.)?youtube\.com\/shorts\/|(?:www\.|m\.)?youtube\.com\/embed\/|(?:www\.)?youtube-nocookie\.com\/embed\/)[^\s]+/i);
  return match?.[0] || "";
}

function escapeHtml(value) {
  return String(value || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function postCardHtml(post) {
  const name = post.from || "Nakaru Member";
  const embedUrl = post.youtubeEmbedUrl || getYouTubeEmbedUrl(post.youtubeUrl || getYouTubeUrlFromText(post.text || ""));
  const video = embedUrl
    ? `
      <div class="post-video">
        <iframe
          src="${escapeHtml(embedUrl)}"
          title="Community YouTube post"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
          allowfullscreen>
        </iframe>
      </div>
    `
    : "";
  const image = post.image ? `<img class="post-image" src="${escapeHtml(post.image)}" alt="User post attachment" loading="lazy" />` : "";

  return `
    <article class="feed-post">
      <div class="post-head">
        <div class="avatar">${escapeHtml(name.slice(0, 2).toUpperCase())}</div>
        <div>
          <strong>${escapeHtml(name)}</strong>
          <small>${new Date(post.at).toLocaleString()}</small>
        </div>
      </div>
      <div class="post-body">${escapeHtml(post.text || post.content || "")}</div>
      ${image}
      ${video}
      <div class="post-actions">
        <button type="button">Like</button>
        <button type="button">Comment</button>
        <button type="button">Share</button>
      </div>
    </article>
  `;
}

function renderFeedPosts(posts) {
  feedList.innerHTML = posts.map(postCardHtml).join("");
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

function parseYouTubeUrl(value) {
  try {
    const url = new URL(String(value || "").trim());
    const host = url.hostname.replace(/^www\./, "");
    let videoId = "";
    if (host === "youtu.be") videoId = url.pathname.slice(1).split("/")[0];
    if (host === "youtube.com" || host === "m.youtube.com") {
      if (url.pathname === "/watch") videoId = url.searchParams.get("v") || "";
      if (url.pathname.startsWith("/shorts/")) videoId = url.pathname.split("/")[2] || "";
      if (url.pathname.startsWith("/embed/")) videoId = url.pathname.split("/")[2] || "";
    }
    if (host === "youtube-nocookie.com" && url.pathname.startsWith("/embed/")) {
      videoId = url.pathname.split("/")[2] || "";
    }
    videoId = videoId.split(/[?&#/]/)[0];
    if (!/^[a-zA-Z0-9_-]{6,}$/.test(videoId)) return null;
    return {
      videoId,
      originalUrl: url.href,
      embedUrl: `https://www.youtube.com/embed/${videoId}`
    };
  } catch {
    return null;
  }
}

function getYouTubeId(value) {
  return parseYouTubeUrl(value)?.videoId || "";
}

function getYouTubeEmbedUrl(value) {
  return parseYouTubeUrl(value)?.embedUrl || "";
}

function previewYouTubeVideo(value) {
  const parsed = parseYouTubeUrl(value);
  if (!parsed) {
    watchStatus.textContent = "Invalid link";
    showToast("YouTube link needed", "Please enter a valid YouTube URL.");
    return null;
  }

  youtubeEmbed.innerHTML = `
    <iframe
      src="${parsed.embedUrl}"
      title="Shared YouTube video"
      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
      allowfullscreen>
    </iframe>
  `;
  watchStatus.textContent = "Ready";
  scrollToSection("watchTogether");
  return parsed;
}

async function postYouTubeVideo() {
  const url = youtubeInput.value.trim();
  const parsed = previewYouTubeVideo(url);
  if (!parsed) return false;

  const data = await api("/api/feed", {
    method: "POST",
    body: JSON.stringify({
      content: "Shared a YouTube video.",
      youtubeUrl: parsed.originalUrl,
      youtubeEmbedUrl: parsed.embedUrl,
      postType: "youtube"
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
  return true;
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

function setProfileEditing(isEditing) {
  profileEditing = Boolean(isEditing);
  profilePanel?.classList.toggle("is-editing", profileEditing);
  if (saveProfileButton) saveProfileButton.hidden = !profileEditing;
  if (editProfileButton) editProfileButton.hidden = profileEditing;
  if (profileEditor) profileEditor.setAttribute("aria-hidden", String(!profileEditing));
}

function updateAccountUi() {
  accountButton.textContent = currentAccount ? currentAccount.username : "Sign In";
  accountButton.classList.toggle("is-authenticated", Boolean(currentAccount));
  document.body.classList.toggle("is-signed-in", Boolean(currentAccount));
  document.querySelector(".profile-mini strong").textContent = displayName();
  document.querySelector(".profile-mini small").textContent = currentAccount ? "Signed in" : "Accepting friends";
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
  const mine = feedPosts.filter((post) => {
    if (currentAccount?.id) return post.user_id === currentAccount.id;
    return post.from === displayName() || post.from === currentAccount?.username || post.from === "YukiKaze";
  });
  profilePosts.innerHTML = mine.length
    ? mine.map(postCardHtml).join("")
    : resultCard("No posts yet", currentAccount ? "Your community posts will appear here." : "Sign in to see posts tied to your profile.");
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
  await withButtonPending(saveProfileButton, "Saving...", async () => {
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
      await loadProfileForUser(user);
      renderProfile();
      setProfileEditing(false);
      saveProfileButton.blur();
      scrollToSection("profilePage");
      console.info("Nakaru-san profile save success", { userId: user.id });
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

function initAuthStateListener() {
  if (!supabaseClient?.auth?.onAuthStateChange) return;
  supabaseClient.auth.onAuthStateChange(async (event, session) => {
    try {
      if (session?.user) {
        const account = storeSupabaseSession({ session, user: session.user }, { email: session.user.email });
        currentAccount = account;
        await upsertAccount(account);
        await loadProfileForUser(session.user);
        updateAccountUi();
        syncFeed();
        if (event === "SIGNED_IN") showToast("Signed in", `Welcome back, ${displayName()}.`);
        return;
      }

      if (event === "SIGNED_OUT") {
        clearSupabaseSession();
        currentAccount = null;
        updateAccountUi();
        syncFeed();
      }
    } catch (error) {
      console.warn("Auth state update failed", error);
    }
  });
}

async function submitAuth() {
  const path = authMode === "signup" ? "/api/auth/signup" : "/api/auth/login";
  const pendingText = authMode === "signup" ? "Creating..." : "Logging in...";
  await withButtonPending(authSubmitButton, pendingText, async () => {
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
        const message = "Please confirm your email before logging in.";
        authMessage.textContent = message;
        console.info("Nakaru-san signup requires email confirmation");
        showToast("Check your email", message);
        return;
      }

      currentAccount = data.account;
      await loadProfileForUser(await getCurrentSupabaseUser());
      authModal.close();
      updateAccountUi();
      console.info("Nakaru-san authentication success", { mode: authMode, userId: currentAccount?.id });
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
  const roomName = `${displayName()} Live ${new Date().toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}`;
  const user = await getCurrentSupabaseUser();
  if (!user) {
    setAuthMode("login");
    authModal.showModal();
    showToast("Sign in needed", "Please log in before starting a live video room.");
    return;
  }

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
  if (livePlaceholder) livePlaceholder.hidden = true;
  if (chatStartLiveButton) chatStartLiveButton.hidden = true;
  streamControls.hidden = false;
  if (liveChip) liveChip.textContent = "LIVE | chat rooms";
  hostCard.hidden = false;
  renderActiveRoom();
  setAppView("chat-room", "messages");
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
  if (livePlaceholder) livePlaceholder.hidden = false;
  if (chatStartLiveButton) chatStartLiveButton.hidden = false;
  streamControls.hidden = true;
  hostCard.hidden = true;
  if (liveChip) liveChip.textContent = "LIVE | chat rooms";
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
    navigateToSection(item.dataset.section);
  });
});

roomList.addEventListener("click", (event) => {
  const joinButton = event.target.closest(".join-button");
  if (!joinButton) return;
  activeRoom = joinButton.dataset.room;
  renderActiveRoom();
  setAppView("chat-room", "messages");
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
bindOnce(youtubeForm, "submit", "youtube-post", async (event) => {
  event.preventDefault();
  const button = youtubeForm.querySelector("button[type='submit']");
  await withButtonPending(button, "Posting...", async () => {
    try {
      const posted = await postYouTubeVideo();
      if (posted) console.info("Nakaru-san YouTube post success");
    } catch (error) {
      console.error("YouTube post failed", error);
      const needsSignIn = String(error?.message || "").toLowerCase().includes("sign in");
      showToast("Video not posted", needsSignIn ? "Please sign in before posting a video." : "This feature is temporarily unavailable.");
      if (needsSignIn) {
        setAuthMode("login");
        authModal.showModal();
      }
    }
  });
});
bindOnce(accountButton, "click", "account-open", () => {
  setAuthMode("signup");
  authModal.showModal();
});
closeAuthButton.addEventListener("click", () => authModal.close());
signupTab.addEventListener("click", () => setAuthMode("signup"));
loginTab.addEventListener("click", () => setAuthMode("login"));
bindOnce(authForm, "submit", "auth-submit", (event) => {
  event.preventDefault();
  submitAuth();
});
document.querySelectorAll("[data-provider]").forEach((button) => {
  bindOnce(button, "click", `social-${button.dataset.provider}`, async () => {
    const provider = button.dataset.provider;
    await withButtonPending(button, "Opening...", async () => {
      if (!useSupabaseDirect) {
        authMessage.textContent = "Social login is not enabled yet.";
        return;
      }
      const providerConfig = oauthProviderMap[provider];
      if (!providerConfig) {
        authMessage.textContent = "Social login is not enabled yet.";
        console.warn("Nakaru-san social provider is not enabled in this Supabase setup", { provider });
        return;
      }
      const redirectTo = `${window.location.origin}/`;
      if (supabaseClient?.auth?.signInWithOAuth) {
        const { data, error } = await supabaseClient.auth.signInWithOAuth({
          provider: providerConfig.provider,
          options: { redirectTo, skipBrowserRedirect: true }
        });
        if (error) {
          console.error("Social login failed", error);
          authMessage.textContent = "Social login is not enabled yet.";
          return;
        }
        if (!data?.url) {
          authMessage.textContent = "Social login is not enabled yet.";
          return;
        }
        window.location.href = data.url;
        return;
      }
      authMessage.textContent = "Social login is not enabled yet.";
    });
  });
});
bindOnce(editProfileButton, "click", "profile-edit", () => {
  if (!currentAccount) {
    setAuthMode("login");
    authModal.showModal();
    showToast("Sign in needed", "Please log in before editing your profile.");
    return;
  }
  setProfileEditing(true);
  console.debug("Nakaru-san profile edit mode opened");
});
bindOnce(saveProfileButton, "click", "profile-save", saveProfile);
bindOnce(profilePhotoInput, "change", "profile-photo-upload", async () => {
  console.debug("Nakaru-san profile photo selected", { hasFile: Boolean(profilePhotoInput.files?.[0]) });
  const preview = await readImage(profilePhotoInput);
  if (preview) {
    profilePhoto.textContent = "";
    profilePhoto.style.backgroundImage = `url(${preview})`;
  }
});
bindOnce(profileBannerInput, "change", "profile-banner-upload", async () => {
  console.debug("Nakaru-san profile banner selected", { hasFile: Boolean(profileBannerInput.files?.[0]) });
  const preview = await readImage(profileBannerInput);
  if (preview) profileBanner.style.backgroundImage = `url(${preview})`;
});
bindOnce(postForm, "submit", "feed-post", async (event) => {
  event.preventDefault();
  const button = postForm.querySelector("button[type='submit']");
  await withButtonPending(button, "Posting...", async () => {
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
      console.info("Nakaru-san feed post success", { postId: data.post?.id });
      syncFeed();
    } catch (error) {
      console.error("Post creation failed", error);
      const needsSignIn = String(error?.message || "").toLowerCase().includes("sign in");
      showToast("Post not published", needsSignIn ? "Please sign in before posting." : "This feature is temporarily unavailable.");
      if (needsSignIn) {
        setAuthMode("login");
        authModal.showModal();
      }
    }
  });
});
bindOnce(byId("startRoomButton"), "click", "open-chat-room-top", () => setAppView("chat-room", "chat-room"));
bindOnce(chatStartLiveButton, "click", "chat-start-live", startLiveRoom);
bindOnce(byId("stopStreamButton"), "click", "chat-stop-live", stopLiveStream);
bindOnce(chatHomeButton, "click", "chat-home", () => setAppView("home", "home"));
bindOnce(chatProfileButton, "click", "chat-profile", () => setAppView("home", "profilePage"));
bindOnce(byId("exploreRoomsButton"), "click", "explore-chat-rooms", () => setAppView("chat-room", "rooms"));
byId("viewRequestsButton").addEventListener("click", () => navigateToSection("friends"));
byId("notificationsButton").addEventListener("click", () => showToast("Notifications", "Friend requests, room invites, and DMs update through Nakaru-san."));
byId("videoCallButton").addEventListener("click", () => startCall("Video"));
byId("voiceCallButton").addEventListener("click", () => startCall("Voice"));
byId("endCallButton").addEventListener("click", endCall);

renderActiveRoom();
renderRequests(requests);
renderProfile();
setProfileEditing(false);
initAuthStateListener();
syncAccount();
syncDmMessages();
syncFeed();
setInterval(syncPresence, 3000);
setInterval(syncPublicMessages, 3500);
setInterval(syncDmMessages, 4000);
setInterval(syncFeed, 5000);
