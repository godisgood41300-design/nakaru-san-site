const version = "20260527-auth-timeout-fix";
const config = window.NAKARU_CONFIG || {};
const socialProviders = [
  { provider: "google", label: "Connect with Google" },
  { provider: "apple", label: "Connect with Apple" },
  { provider: "facebook", label: "Connect with Facebook" },
  { provider: "twitter", label: "Connect with X" },
  { provider: "instagram", label: "Connect with Instagram", externalUrlKey: "instagramAuthUrl" }
];
const bootWarnings = [];
const accountServiceWarning = "Account services are temporarily unavailable. Please refresh in a moment.";
const requestTimeoutMs = 9000;
const supabaseRetryLimit = 20;
const rooms = [
  { id: "anime", name: "Anime", topic: "Watch parties, openings, episode talk" },
  { id: "gaming", name: "Gaming", topic: "Co-op queues, builds, raids, ranked" },
  { id: "manga", name: "Manga", topic: "Chapters, panels, collecting, theories" },
  { id: "general", name: "General", topic: "Community lounge and introductions" },
  { id: "nakaru-san", name: "Nakaru-San", topic: "Platform updates and creator rooms" }
];

const privateRooms = [
  { id: "private-crew-night", name: "Crew Night", topic: "Invite-only watch list planning and private fandom talk" },
  { id: "private-raid-party", name: "Raid Party", topic: "Private gaming voice room and media drops" },
  { id: "private-creator-den", name: "Creator Den", topic: "Artwork, clips, edits, and project feedback" }
];

const kanjiRainItems = [
  ["絆", 4, 18, 0, "purple"], ["夢", 12, 23, 6, "gold"], ["光", 20, 17, 12, "purple"], ["心", 28, 28, 3, "gold"],
  ["武", 36, 19, 9, "purple"], ["影", 44, 25, 15, "purple"], ["魂", 52, 18, 5, "gold"], ["月", 60, 24, 11, "purple"],
  ["火", 68, 16, 2, "gold"], ["空", 76, 27, 8, "purple"], ["道", 84, 20, 14, "gold"], ["和", 92, 26, 4, "purple"],
  ["絆", 8, 31, 17, "gold"], ["夢", 32, 22, 20, "purple"], ["光", 57, 29, 22, "gold"], ["心", 88, 18, 19, "purple"]
];

const demoPosts = [
  {
    id: "post-demo-1",
    user_id: "demo-ami",
    author: "Ami Arc",
    post_type: "text",
    content: "Moonlit Lounge is open tonight. Keep it spoiler-safe and bring opening theme recommendations.",
    likes: 18,
    comments_count: 4,
    created_at: new Date(Date.now() - 1000 * 60 * 30).toISOString()
  },
  {
    id: "post-demo-2",
    user_id: "demo-rae",
    author: "Rae Arcade",
    post_type: "youtube",
    content: "Shared a YouTube video.",
    youtube_url: "https://youtu.be/dQw4w9WgXcQ",
    youtube_embed_url: "https://www.youtube.com/embed/dQw4w9WgXcQ",
    likes: 31,
    comments_count: 7,
    created_at: new Date(Date.now() - 1000 * 60 * 55).toISOString()
  }
];

const state = {
  page: "home",
  sidebarOpen: false,
  user: null,
  profile: readLocal("nakaru-profile", {
    username: "nakaru_member",
    display_name: "Nakaru Member",
    bio: "Anime and gaming fan building a new watch-party circle.",
    avatar_url: "",
    banner_url: ""
  }),
  savedProfile: null,
  profileEditing: false,
  profileDirty: false,
  profileSaving: false,
  profileStatus: "",
  posts: readLocal("nakaru-posts", demoPosts),
  postStatus: "",
  youtubeStatus: "",
  videoPosting: false,
  videoComposerOpen: true,
  lastVideoPost: null,
  deviceVideoStatus: "",
  deviceVideoPosting: false,
  deviceVideoComposerOpen: true,
  lastDeviceVideoPost: null,
  activeRoom: "anime",
  activePrivateRoom: "private-crew-night",
  roomText: "",
  roomStatus: "",
  privateRoomStatus: "",
  roomMessages: readLocal("nakaru-room-messages", {
    anime: [
      { id: "room-1", author: "Ami Arc", text: "What is everyone watching tonight?", created_at: new Date().toISOString() },
      { id: "room-2", author: "Nova Ink", text: "I am bringing the manga comparison notes.", created_at: new Date().toISOString() }
    ],
    gaming: [{ id: "room-3", author: "Rae Arcade", text: "Need one tank for the raid queue.", created_at: new Date().toISOString() }]
  }),
  threads: readLocal("nakaru-dm-threads", [
    {
      id: "dm-rae",
      user: "Rae Arcade",
      preview: "Ready for co-op later?",
      messages: [
        { id: "dm1", fromMe: false, text: "Ready for co-op later?" },
        { id: "dm2", fromMe: true, text: "Yes, save me a slot." }
      ]
    },
    { id: "dm-nova", user: "Nova Ink", preview: "Dropping panel references now.", messages: [{ id: "dm3", fromMe: false, text: "Dropping panel references now." }] }
  ]),
  activeThread: "dm-rae",
  activeDmRecipient: "",
  activeConversationId: "",
  dmMessages: readLocal("nakaru-direct-messages", []),
  dmStatus: "",
  publicProfiles: [],
  publicProfileId: "",
  publicProfileStatus: "",
  topSearch: "",
  socialSearch: "",
  searchResults: [],
  searchStatus: "",
  incomingRequests: [],
  outgoingRequests: [],
  friendships: [],
  friends: [],
  socialStatus: "",
  socialChannel: null,
  notifications: [],
  authMode: "signin",
  authStatus: "",
  authLoading: false,
  socialLoading: "",
  rememberedEmail: readLocal("nakaru-remember-email", ""),
  rememberEmail: Boolean(readLocal("nakaru-remember-email", "")),
  pendingVerificationEmail: readLocal("nakaru-pending-verification-email", ""),
  verificationSending: false,
  stream: null,
  remoteStream: null,
  peer: null,
  callChannel: null,
  callRoom: "nakaru-lounge",
  callMode: "video",
  activeCallId: "",
  calls: [],
  callStatus: "",
  callStarting: false,
  inCall: false,
  liveRooms: [],
  liveRoomSearch: "",
  liveRoomSearchResults: [],
  activeLiveRoom: null,
  liveRoomInvites: [],
  liveRoomStatus: "",
  liveRoomCreating: false,
  liveRoomJoining: ""
};
state.savedProfile = { ...state.profile };

let supabaseClient = null;
let supabaseRetryCount = 0;
let authSubscription = null;

function validHttpUrl(value) {
  try {
    const parsed = new URL(String(value || ""));
    return parsed.protocol === "https:" || parsed.protocol === "http:";
  } catch {
    return false;
  }
}

function isDataUrl(value) {
  return String(value || "").startsWith("data:");
}

function safeProfileSearch(value) {
  return String(value || "")
    .trim()
    .replace(/[%(),]/g, " ")
    .replace(/\s+/g, " ")
    .slice(0, 64);
}

function hasPlaceholderSupabaseConfig() {
  const url = String(config.supabaseUrl || "").toLowerCase();
  const key = String(config.supabaseAnonKey || "").toLowerCase();
  return url.includes("your-project-ref") || key.includes("your-public-anon-key") || key.includes("your-public-publishable-key");
}

function hasDashboardSupabaseUrl() {
  return String(config.supabaseUrl || "").toLowerCase().includes("supabase.com/dashboard");
}

function hasProjectSupabaseUrl() {
  const url = String(config.supabaseUrl || "").toLowerCase();
  return /^https:\/\/[a-z0-9-]+\.supabase\.co\/?$/.test(url);
}

function hasUsableSupabaseConfig() {
  return Boolean(config.supabaseUrl && config.supabaseAnonKey && !hasPlaceholderSupabaseConfig() && !hasDashboardSupabaseUrl() && hasProjectSupabaseUrl());
}

function setupSupabaseClient() {
  if (!config.supabaseUrl || !config.supabaseAnonKey) return null;
  if (hasPlaceholderSupabaseConfig()) {
    bootWarnings.push("Supabase is not connected yet. Add your real Supabase URL and public key in Render.");
    return null;
  }
  if (hasDashboardSupabaseUrl() || !hasProjectSupabaseUrl()) {
    bootWarnings.push("Supabase URL is not the Project URL. Use the value ending in .supabase.co from Supabase Project Settings.");
    return null;
  }
  if (!validHttpUrl(config.supabaseUrl)) {
    bootWarnings.push("Supabase URL is not valid. The site is running in demo mode.");
    return null;
  }
  if (!window.supabase?.createClient) {
    console.warn("Supabase library is not ready yet.");
    return null;
  }
  try {
    return window.supabase.createClient(config.supabaseUrl, config.supabaseAnonKey, {
      auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true }
    });
  } catch (error) {
    console.error("Supabase setup failed", error);
    bootWarnings.push("Supabase setup failed. The site is running in demo mode.");
    return null;
  }
}

supabaseClient = setupSupabaseClient();

function ensureSupabaseClient() {
  if (!supabaseClient) supabaseClient = setupSupabaseClient();
  return supabaseClient;
}

function clearStoredSession() {
  state.user = null;
  localStorage.removeItem("nakaru-session");
  localStorage.removeItem("nakaru-local-users");
}

function clearLegacyLocalAuth() {
  localStorage.removeItem("nakaru-session");
  localStorage.removeItem("nakaru-local-users");
}

function clearBrowserAuthStorage() {
  clearLegacyLocalAuth();
  for (const storage of [localStorage, sessionStorage]) {
    for (let index = storage.length - 1; index >= 0; index -= 1) {
      const key = storage.key(index) || "";
      const lower = key.toLowerCase();
      if (key === "nakaru-remember-email") continue;
      if (key === "nakaru-session" || key === "nakaru-local-users" || key.startsWith("sb-") || lower.includes("supabase.auth")) {
        storage.removeItem(key);
      }
    }
  }
}

function resetPrivateState() {
  state.user = null;
  state.profileEditing = false;
  state.profileDirty = false;
  state.profileSaving = false;
  state.socialLoading = "";
  state.searchResults = [];
  state.incomingRequests = [];
  state.outgoingRequests = [];
  state.friendships = [];
  state.friends = [];
  state.dmMessages = [];
  state.activeConversationId = "";
  state.notifications = [];
  state.calls = [];
  state.activeCallId = "";
  state.liveRooms = [];
  state.liveRoomSearchResults = [];
  state.activeLiveRoom = null;
  state.liveRoomInvites = [];
}

function enabledSocialProviders() {
  const raw = config.enabledSocialProviders || config.socialAuthProviders || "";
  const enabled = Array.isArray(raw) ? raw : String(raw).split(",").map((item) => item.trim().toLowerCase()).filter(Boolean);
  return socialProviders.filter((item) => {
    if (item.externalUrlKey) return Boolean(config[item.externalUrlKey]);
    return enabled.includes(item.provider);
  });
}

function scheduleSupabaseRetry() {
  if (supabaseClient || !hasUsableSupabaseConfig()) return;

  window.setTimeout(async () => {
    if (ensureSupabaseClient()) {
      await initSupabaseSession();
      return;
    }

    supabaseRetryCount += 1;
    if (supabaseRetryCount < supabaseRetryLimit) {
      scheduleSupabaseRetry();
      return;
    }

    console.warn(accountServiceWarning);
    if (state.page === "edit-profile") state.authStatus = accountServiceWarning;
    render();
  }, 500);
}

function redirectUrl() {
  const origin = window.location.origin || config.appUrl;
  return `${origin.replace(/\/$/, "")}/`;
}

function readLocal(key, fallback) {
  try {
    const value = localStorage.getItem(key);
    return value ? JSON.parse(value) : fallback;
  } catch {
    return fallback;
  }
}

function writeLocal(key, value) {
  localStorage.setItem(key, JSON.stringify(value));
}

function withTimeout(promise, label = "Request", timeoutMs = requestTimeoutMs) {
  let timer;
  const timeout = new Promise((_, reject) => {
    timer = window.setTimeout(() => reject(new Error(`${label} timed out. Please try again.`)), timeoutMs);
  });
  return Promise.race([Promise.resolve(promise), timeout]).finally(() => window.clearTimeout(timer));
}

function visibleBootWarnings() {
  return bootWarnings.filter((warning) => {
    const text = String(warning).toLowerCase();
    return !(text.includes("account data") && text.includes("could not load"));
  });
}

function toggleSidebar(force) {
  state.sidebarOpen = typeof force === "boolean" ? force : !state.sidebarOpen;
  render();
}

function openAboutSection() {
  state.page = "home";
  state.sidebarOpen = false;
  render();
  scrollToSection("#about");
}

function escapeHtml(value = "") {
  return String(value).replace(/[&<>"']/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;" })[char]);
}

function initials(name = "NS") {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("") || "NS";
}

function avatar(profile = {}, size = "") {
  const name = profile.display_name || profile.username || profile.author || "Nakaru Member";
  const image = profile.avatar_url ? `style="background-image:url('${escapeHtml(profile.avatar_url)}')"` : "";
  return `<div class="avatar ${size}" ${image}>${profile.avatar_url ? "" : escapeHtml(initials(name))}</div>`;
}

function formatTime(value) {
  return new Date(value || Date.now()).toLocaleString([], { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" });
}

function cleanUsername(value, fallback = "nakaru_member") {
  const cleaned = String(value || "")
    .toLowerCase()
    .replace(/@.*/, "")
    .replace(/[^a-z0-9_]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, 24);
  return cleaned || fallback;
}

function defaultProfileForUser(user = state.user) {
  const metadata = user?.user_metadata || {};
  const emailName = cleanUsername(user?.email || "");
  const suffix = String(user?.id || crypto.randomUUID()).slice(0, 6);
  const username = cleanUsername(metadata.username || state.profile.username || emailName, `nakaru_${suffix}`);
  const safeUsername = username === "nakaru_member" ? `nakaru_${suffix}` : username;
  return {
    username: safeUsername,
    display_name: metadata.display_name || metadata.name || state.profile.display_name || safeUsername,
    bio: state.profile.bio || "Anime and gaming fan building a new watch-party circle.",
    avatar_url: state.profile.avatar_url || metadata.avatar_url || "",
    banner_url: state.profile.banner_url || ""
  };
}

function isMissingColumnError(error, column) {
  return error?.code === "42703" || String(error?.message || "").toLowerCase().includes(String(column || "").toLowerCase());
}

function normalizePost(post = {}) {
  const postType = post.post_type || post.type || "text";
  const profile = state.publicProfiles.find((item) => item.id === post.user_id);
  return {
    ...post,
    post_type: postType,
    type: postType,
    author: post.author || profile?.display_name || profile?.username || (post.user_id === state.user?.id ? state.profile.display_name || state.profile.username : "Nakaru Member"),
    likes: post.likes || 0,
    comments_count: post.comments_count || 0
  };
}

function profileName(profile = {}) {
  return profile.display_name || profile.username || "Nakaru Member";
}

function profileById(id) {
  if (id === state.user?.id) return { id: state.user.id, ...state.profile };
  return state.publicProfiles.find((profile) => profile.id === id) || {};
}

function profileIdentityButton(profile = {}, size = "") {
  const id = profile.id || "";
  const name = profileName(profile);
  const username = profile.username ? `@${profile.username}` : "View profile";
  if (!id) {
    return `<div class="profile-identity">${avatar(profile, size)}<span><strong>${escapeHtml(name)}</strong><small>${escapeHtml(username)}</small></span></div>`;
  }
  return `<button class="profile-identity profile-link" onclick="openUserProfile('${escapeHtml(id)}')" type="button">${avatar(profile, size)}<span><strong>${escapeHtml(name)}</strong><small>${escapeHtml(username)}</small></span></button>`;
}

function isFriend(userId) {
  return state.friends.some((friend) => friend.id === userId) || state.friendships.some((row) => row.user_id === state.user?.id && row.friend_id === userId);
}

function relationTo(userId) {
  if (!state.user) return "signed-out";
  if (userId === state.user.id) return "self";
  if (isFriend(userId)) return "friend";
  if (state.outgoingRequests.some((request) => request.receiver_id === userId && request.status === "pending")) return "pending-out";
  if (state.incomingRequests.some((request) => request.sender_id === userId && request.status === "pending")) return "pending-in";
  if ([...state.incomingRequests, ...state.outgoingRequests].some((request) => [request.sender_id, request.receiver_id].includes(userId) && request.status === "blocked")) return "blocked";
  return "none";
}

function notificationText(type, fallback) {
  const map = {
    request: "New friend request",
    accepted: "Friend request accepted",
    message: "New message",
    call: "Incoming call",
    live: "Live room invite"
  };
  return map[type] || fallback || "Notification";
}

function addNotification(type, text, refId = "") {
  state.notifications = [
    { id: crypto.randomUUID(), type, text: text || notificationText(type), refId, created_at: new Date().toISOString(), read: false },
    ...state.notifications
  ].slice(0, 20);
}

function profileSelectColumns(includeBanner = true) {
  return includeBanner ? "id,username,display_name,bio,avatar_url,banner_url" : "id,username,display_name,bio,avatar_url";
}

function parseYouTubeUrl(value) {
  try {
    const url = new URL(String(value || "").trim());
    const host = url.hostname.replace(/^www\./, "");
    let id = "";
    if (host === "youtu.be") id = url.pathname.slice(1).split("/")[0];
    if (host === "youtube.com" || host === "m.youtube.com") {
      if (url.pathname === "/watch") id = url.searchParams.get("v") || "";
      if (url.pathname.startsWith("/shorts/")) id = url.pathname.split("/")[2] || "";
      if (url.pathname.startsWith("/embed/")) id = url.pathname.split("/")[2] || "";
    }
    if (host === "youtube-nocookie.com" && url.pathname.startsWith("/embed/")) id = url.pathname.split("/")[2] || "";
    id = id.split(/[?&#/]/)[0];
    if (!/^[a-zA-Z0-9_-]{6,}$/.test(id)) return null;
    return { originalUrl: url.href, embedUrl: `https://www.youtube.com/embed/${id}` };
  } catch {
    return null;
  }
}

async function init() {
  clearLegacyLocalAuth();
  render();

  if (!ensureSupabaseClient()) {
    scheduleSupabaseRetry();
    return;
  }

  await initSupabaseSession();
}

async function initSupabaseSession() {
  try {
    const { data, error } = await withTimeout(supabaseClient.auth.getSession(), "Session check");
    if (error) throw error;
    state.user = data.session?.user || null;
    authSubscription?.unsubscribe?.();
    const { data: subscriptionData } = supabaseClient.auth.onAuthStateChange((_event, session) => {
      state.user = session?.user || null;
      if (!state.user) resetPrivateState();
      afterAuthChange();
    });
    authSubscription = subscriptionData?.subscription || null;
    await afterAuthChange();
  } catch (error) {
    console.error("Supabase session load failed", error);
    clearStoredSession();
    try {
      await withTimeout(supabaseClient.auth.signOut({ scope: "local" }), "Local session clear", 3500);
    } catch (signOutError) {
      console.warn("Could not clear local Supabase session", signOutError);
    }
    render();
  }
}

async function afterAuthChange() {
  await Promise.allSettled([
    withTimeout(loadPublicProfiles(), "Public profiles load", 5000),
    withTimeout(loadPosts(), "Feed load", 5000),
    withTimeout(loadRoomMessages(state.activeRoom), "Room messages load", 5000)
  ]);
  if (state.user) {
    try {
      await withTimeout(loadProfile(), "Profile load", 6000);
    } catch (error) {
      console.error("Profile data load failed", error);
      state.profile = { id: state.user.id, ...defaultProfileForUser(state.user), ...(state.profile || {}) };
      state.savedProfile = { ...state.profile };
    }
    try {
      await withTimeout(loadSocialData(), "Social data load", 4500);
      subscribeSocialRealtime();
    } catch (error) {
      console.warn("Optional social data load failed", error);
    }
  } else {
    await unsubscribeSocialRealtime();
    if (isProtectedPage(state.page)) {
      state.page = "edit-profile";
      state.authMode = "signin";
      state.authStatus = "Please sign in to continue.";
    }
  }
  render();
}

async function loadProfile() {
  if (!state.user) return;
  if (state.profileEditing && state.profileDirty && !state.profileSaving) return;
  if (supabaseClient) {
    let bannerColumnMissing = false;
    let { data, error } = await supabaseClient.from("profiles").select(profileSelectColumns(true)).eq("id", state.user.id).maybeSingle();
    if (error && isMissingColumnError(error, "banner_url")) {
      bannerColumnMissing = true;
      ({ data, error } = await supabaseClient.from("profiles").select(profileSelectColumns(false)).eq("id", state.user.id).maybeSingle());
    }
    if (error) console.error("Profile load failed", error);
    state.profile = { id: state.user.id, ...defaultProfileForUser(), ...(data || {}) };
    if (!state.profile.avatar_url) {
      state.profile.avatar_url = readLocal(`nakaru-avatar-fallback-${state.user.id}`, "");
    }
    if (!state.profile.banner_url) {
      state.profile.banner_url = readLocal(`nakaru-banner-fallback-${state.user.id}`, "");
    }
  } else {
    const profiles = readLocal("nakaru-local-profiles", {});
    state.profile = profiles[state.user.id] || { id: state.user.id, ...defaultProfileForUser(state.user) };
  }
  state.savedProfile = { ...state.profile };
}

async function ensureProfileRecord(usernameHint = "") {
  if (!state.user || !supabaseClient) return;
  const { data, error } = await withTimeout(
    supabaseClient.from("profiles").select("id").eq("id", state.user.id).maybeSingle(),
    "Profile check",
    6000
  );
  if (error) {
    console.error("Profile existence check failed", error);
  }
  if (data?.id) return;

  const defaults = defaultProfileForUser(state.user);
  const suffix = String(state.user.id || crypto.randomUUID()).slice(0, 6);
  const row = {
    id: state.user.id,
    username: cleanUsername(usernameHint || defaults.username, `nakaru_${suffix}`),
    display_name: defaults.display_name || cleanUsername(usernameHint || state.user.email, `nakaru_${suffix}`),
    bio: defaults.bio || "Anime and gaming fan building a new watch-party circle.",
    avatar_url: defaults.avatar_url || "",
    banner_url: defaults.banner_url || "",
    updated_at: new Date().toISOString()
  };
  if (row.username === "nakaru_member") row.username = `nakaru_${suffix}`;

  let { error: upsertError } = await withTimeout(supabaseClient.from("profiles").upsert(row, { onConflict: "id" }), "Profile creation", 7000);
  if (upsertError && isMissingColumnError(upsertError, "banner_url")) {
    const { banner_url, ...rowWithoutBanner } = row;
    ({ error: upsertError } = await withTimeout(supabaseClient.from("profiles").upsert(rowWithoutBanner, { onConflict: "id" }), "Profile creation retry", 7000));
  }
  if (upsertError && String(upsertError.message || "").toLowerCase().includes("duplicate")) {
    row.username = `${row.username}_${suffix}`.slice(0, 31);
    const { banner_url, ...retryRow } = row;
    ({ error: upsertError } = await withTimeout(supabaseClient.from("profiles").upsert(retryRow, { onConflict: "id" }), "Profile username retry", 7000));
  }
  if (upsertError) {
    console.error("Profile creation failed", upsertError);
    return;
  }
  state.profile = row;
  state.savedProfile = { ...row };
}

async function loadPublicProfiles() {
  if (!supabaseClient) return;
  let { data, error } = await supabaseClient.from("profiles").select(profileSelectColumns(true)).limit(80);
  if (error && isMissingColumnError(error, "banner_url")) {
    ({ data, error } = await supabaseClient.from("profiles").select(profileSelectColumns(false)).limit(80));
  }
  if (error) {
    console.error("Public profile load failed", error);
    return;
  }
  state.publicProfiles = data || [];
  if (!state.activeDmRecipient && state.user) {
    state.activeDmRecipient = state.publicProfiles.find((profile) => profile.id !== state.user.id)?.id || "";
  }
}

async function loadPosts() {
  if (!supabaseClient) return;
  const { data, error } = await supabaseClient
    .from("posts")
    .select("id,user_id,content,post_type,media_url,youtube_url,youtube_embed_url,created_at,updated_at")
    .order("created_at", { ascending: false })
    .limit(80);
  if (error) {
    console.error("Post load failed", error);
    return;
  }
  state.posts = (data || []).map(normalizePost);
}

async function loadRoomMessages(roomId = state.activeRoom) {
  if (!supabaseClient) return;
  let { data, error } = await supabaseClient
    .from("room_messages")
    .select("id,room_id,user_id,author,text,media_url,media_type,media_name,created_at")
    .eq("room_id", roomId)
    .order("created_at", { ascending: true })
    .limit(100);
  if (error && (isMissingColumnError(error, "media_url") || isMissingColumnError(error, "media_type") || isMissingColumnError(error, "media_name"))) {
    ({ data, error } = await supabaseClient
      .from("room_messages")
      .select("id,room_id,user_id,author,text,created_at")
      .eq("room_id", roomId)
      .order("created_at", { ascending: true })
      .limit(100));
  }
  if (error) {
    console.error("Room message load failed", error);
    state.roomStatus = "Chat is temporarily unavailable. Please try again soon.";
    return;
  }
  state.roomMessages[roomId] = data || [];
  state.roomStatus = "";
}

async function loadDirectMessages() {
  if (!supabaseClient || !state.user || !state.activeDmRecipient) return;
  if (!isFriend(state.activeDmRecipient)) {
    state.dmMessages = [];
    state.dmStatus = "You can message this user after you become friends.";
    return;
  }
  try {
    const conversationId = await ensureConversation(state.activeDmRecipient);
    if (!conversationId) return;
    let { data, error } = await supabaseClient
      .from("messages")
      .select("id,conversation_id,sender_id,receiver_id,body,media_url,media_type,media_name,read,created_at")
      .eq("conversation_id", conversationId)
      .order("created_at", { ascending: true })
      .limit(150);
    if (error && (isMissingColumnError(error, "media_url") || isMissingColumnError(error, "media_type") || isMissingColumnError(error, "media_name"))) {
      ({ data, error } = await supabaseClient
        .from("messages")
        .select("id,conversation_id,sender_id,receiver_id,body,read,created_at")
        .eq("conversation_id", conversationId)
        .order("created_at", { ascending: true })
        .limit(150));
    }
    if (error) throw error;
    state.dmMessages = (data || []).map((message) => ({ ...message, text: message.body }));
    state.dmStatus = "";
  } catch (error) {
    console.error("Message history load failed", error);
    await loadDirectMessagesFallback();
  }
}

async function loadDirectMessagesFallback() {
  const query = `and(sender_id.eq.${state.user.id},recipient_id.eq.${state.activeDmRecipient}),and(sender_id.eq.${state.activeDmRecipient},recipient_id.eq.${state.user.id})`;
  let { data, error } = await supabaseClient
    .from("direct_messages")
    .select("id,sender_id,recipient_id,text,media_url,media_type,media_name,created_at")
    .or(query)
    .order("created_at", { ascending: true })
    .limit(100);
  if (error && (isMissingColumnError(error, "media_url") || isMissingColumnError(error, "media_type") || isMissingColumnError(error, "media_name"))) {
    ({ data, error } = await supabaseClient
      .from("direct_messages")
      .select("id,sender_id,recipient_id,text,created_at")
      .or(query)
      .order("created_at", { ascending: true })
      .limit(100));
  }
  if (error) {
    console.error("Direct message fallback failed", error);
    state.dmStatus = "Messaging is temporarily unavailable. Please try again soon.";
    return;
  }
  state.dmMessages = data || [];
  state.dmStatus = "";
}

async function loadSocialData() {
  if (!supabaseClient || !state.user) return;
  const results = await Promise.allSettled([
    loadFriendRequests(),
    loadFriendships(),
    loadCalls(),
    loadLiveRooms(),
    loadLiveRoomInvites()
  ]);
  results.forEach((result) => {
    if (result.status === "rejected") console.warn("Optional social table unavailable", result.reason);
  });
  if ((state.page === "messages" || state.page === "inbox") && state.activeDmRecipient && isFriend(state.activeDmRecipient)) {
    try {
      await withTimeout(loadDirectMessages(), "Message history load", 4500);
    } catch (error) {
      console.warn("Direct messages could not load yet", error);
    }
  }
}

async function loadFriendRequests() {
  if (!supabaseClient || !state.user) return;
  const { data, error } = await supabaseClient
    .from("friend_requests")
    .select("id,sender_id,receiver_id,status,created_at,updated_at")
    .or(`sender_id.eq.${state.user.id},receiver_id.eq.${state.user.id}`)
    .order("created_at", { ascending: false });
  if (error) {
    console.error("Friend request load failed", error);
    state.socialStatus = "Friend requests are temporarily unavailable.";
    return;
  }
  const requests = data || [];
  state.incomingRequests = requests.filter((request) => request.receiver_id === state.user.id);
  state.outgoingRequests = requests.filter((request) => request.sender_id === state.user.id);
}

async function loadFriendships() {
  if (!supabaseClient || !state.user) return;
  const { data, error } = await supabaseClient
    .from("friendships")
    .select("id,user_id,friend_id,created_at")
    .or(`user_id.eq.${state.user.id},friend_id.eq.${state.user.id}`)
    .order("created_at", { ascending: false });
  if (error) {
    console.error("Friends load failed", error);
    state.socialStatus = "Friends list is temporarily unavailable.";
    return;
  }
  state.friendships = data || [];
  const friendIds = [...new Set(state.friendships.map((row) => row.user_id === state.user.id ? row.friend_id : row.user_id))];
  state.friends = friendIds.map(profileById).filter((profile) => profile.id);
  if (!state.activeDmRecipient && state.friends[0]) state.activeDmRecipient = state.friends[0].id;
}

async function loadCalls() {
  if (!supabaseClient || !state.user) return;
  const { data, error } = await supabaseClient
    .from("calls")
    .select("id,caller_id,receiver_id,call_type,status,room_id,created_at,ended_at")
    .or(`caller_id.eq.${state.user.id},receiver_id.eq.${state.user.id}`)
    .order("created_at", { ascending: false })
    .limit(30);
  if (error) {
    console.error("Calls load failed", error);
    return;
  }
  state.calls = data || [];
}

async function loadLiveRooms() {
  if (!supabaseClient) return;
  const { data, error } = await supabaseClient
    .from("live_rooms")
    .select("id,host_id,room_name,room_url,is_active,created_at,ended_at")
    .eq("is_active", true)
    .order("created_at", { ascending: false })
    .limit(50);
  if (error) {
    console.error("Live room load failed", error);
    state.liveRoomStatus = "Live rooms are temporarily unavailable. Make sure the latest Supabase schema is installed.";
    return;
  }
  state.liveRooms = data || [];
  const query = state.liveRoomSearch.trim().toLowerCase();
  state.liveRoomSearchResults = query
    ? state.liveRooms.filter((room) => `${room.room_name || ""} ${profileName(profileById(room.host_id))}`.toLowerCase().includes(query))
    : state.liveRooms;
  if (!state.activeLiveRoom && state.liveRooms[0]) state.activeLiveRoom = state.liveRooms[0];
}

async function loadLiveRoomInvites() {
  if (!supabaseClient || !state.user) return;
  const { data, error } = await supabaseClient
    .from("live_room_invites")
    .select("id,room_id,sender_id,receiver_id,status,created_at")
    .or(`sender_id.eq.${state.user.id},receiver_id.eq.${state.user.id}`)
    .order("created_at", { ascending: false })
    .limit(50);
  if (error) {
    console.error("Live room invites load failed", error);
    return;
  }
  state.liveRoomInvites = data || [];
}

async function ensureConversation(friendId) {
  if (!supabaseClient || !state.user || !friendId) return "";
  const participants = [state.user.id, friendId].sort();
  if (state.activeConversationId && state.activeDmRecipient === friendId) return state.activeConversationId;
  let { data, error } = await supabaseClient
    .from("conversations")
    .select("id,participant_ids,created_at,updated_at")
    .contains("participant_ids", participants)
    .maybeSingle();
  if (error) throw error;
  if (!data) {
    ({ data, error } = await supabaseClient
      .from("conversations")
      .insert({ participant_ids: participants })
      .select("id,participant_ids,created_at,updated_at")
      .single());
    if (error) throw error;
  }
  state.activeConversationId = data.id;
  return data.id;
}

function subscribeSocialRealtime() {
  if (!supabaseClient || !state.user || state.socialChannel) return;
  state.socialChannel = supabaseClient
    .channel(`nakaru-social-${state.user.id}`)
    .on("postgres_changes", { event: "*", schema: "public", table: "friend_requests" }, async (payload) => {
      const row = payload.new || payload.old || {};
      if (![row.sender_id, row.receiver_id].includes(state.user.id)) return;
      addNotification("request", row.receiver_id === state.user.id ? "You have a new friend request." : "A friend request was updated.", row.id);
      await loadFriendRequests();
      render();
    })
    .on("postgres_changes", { event: "*", schema: "public", table: "friendships" }, async (payload) => {
      const row = payload.new || payload.old || {};
      if (![row.user_id, row.friend_id].includes(state.user.id)) return;
      addNotification("accepted", "A friend connection was updated.", row.id);
      await loadFriendships();
      render();
    })
    .on("postgres_changes", { event: "INSERT", schema: "public", table: "messages" }, async (payload) => {
      const row = payload.new || {};
      if (![row.sender_id, row.receiver_id].includes(state.user.id)) return;
      if (row.sender_id !== state.user.id) addNotification("message", "You have a new message.", row.id);
      if (row.conversation_id === state.activeConversationId) await loadDirectMessages();
      render();
    })
    .on("postgres_changes", { event: "*", schema: "public", table: "calls" }, async (payload) => {
      const row = payload.new || payload.old || {};
      if (![row.caller_id, row.receiver_id].includes(state.user.id)) return;
      if (row.receiver_id === state.user.id && row.status === "ringing") addNotification("call", "Incoming call.", row.id);
      await loadCalls();
      render();
    })
    .on("postgres_changes", { event: "*", schema: "public", table: "live_rooms" }, async () => {
      await loadLiveRooms();
      render();
    })
    .on("postgres_changes", { event: "*", schema: "public", table: "live_room_invites" }, async (payload) => {
      const row = payload.new || payload.old || {};
      if (![row.sender_id, row.receiver_id].includes(state.user.id)) return;
      if (row.receiver_id === state.user.id && row.status === "pending") addNotification("live", "You were invited to a live room.", row.id);
      await loadLiveRoomInvites();
      render();
    })
    .subscribe();
}

async function unsubscribeSocialRealtime() {
  if (state.socialChannel && supabaseClient) {
    await supabaseClient.removeChannel(state.socialChannel);
  }
  state.socialChannel = null;
}

function isProtectedPage(page) {
  return ["profile", "video", "private-rooms", "friends", "friend-requests", "messages", "calls", "inbox"].includes(page);
}

function scrollToCurrentPage() {
  window.requestAnimationFrame(() => {
    const target = document.querySelector("[data-page-root]") || document.querySelector("main");
    if (target?.scrollIntoView) {
      target.scrollIntoView({ behavior: "smooth", block: "start" });
    } else {
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  });
}

function scrollToSection(selector) {
  window.requestAnimationFrame(() => {
    const target = document.querySelector(selector);
    if (target?.scrollIntoView) target.scrollIntoView({ behavior: "smooth", block: "start" });
  });
}

function setPage(page) {
  if (page === "golive") page = "live";
  if (page === "requests") page = "friend-requests";
  if (page === "messaging") page = "messages";
  if (isProtectedPage(page) && !state.user) {
    state.page = "edit-profile";
    state.sidebarOpen = false;
    state.authMode = "signin";
    state.authStatus = "Please sign in to continue.";
    render();
    scrollToCurrentPage();
    return;
  }
  state.page = page;
  state.sidebarOpen = false;
  if (page === "edit-profile" && state.user) state.profileEditing = true;
  if (page === "public-rooms") loadRoomMessages(state.activeRoom).finally(render);
  if (page === "private-rooms") loadRoomMessages(state.activePrivateRoom).finally(render);
  if (page === "live") {
    Promise.allSettled([
      withTimeout(loadPublicProfiles(), "Public profiles load", 5000),
      withTimeout(loadLiveRooms(), "Live room load", 6000)
    ]).finally(render);
  }
  if (page === "search") {
    withTimeout(loadPublicProfiles(), "Public profiles load", 5000).finally(render);
  }
  if (["friends", "friend-requests", "messages", "calls", "inbox"].includes(page) || (page === "live" && state.user)) {
    withTimeout(loadSocialData(), "Social data load", 6000).finally(render);
  }
  if (page === "messages" || page === "inbox") {
    withTimeout(loadPublicProfiles(), "Public profiles load", 5000)
      .then(loadDirectMessages)
      .finally(render);
  }
  if (page === "video") {
    state.videoComposerOpen = true;
    state.deviceVideoComposerOpen = true;
    state.youtubeStatus = "";
    state.deviceVideoStatus = "";
  }
  render();
  scrollToCurrentPage();
}

function friendlyAuthError(error, mode) {
  const message = String(error?.message || "").toLowerCase();
  if (message.includes("email not confirmed") || message.includes("not confirmed")) return "Email confirmation is still turned on in Supabase. Turn off Confirm email in Authentication > Providers > Email, then log in again.";
  if (message.includes("email address not authorized")) return "Supabase rejected this email address. Check your Supabase Auth email settings.";
  if (message.includes("rate limit")) return "Signup is temporarily rate-limited. Please wait a few minutes, then try again.";
  if (message.includes("invalid login") || message.includes("invalid credentials")) return "Wrong email or password. Please try again.";
  if (message.includes("already registered") || message.includes("already exists")) return "An account with this email already exists. Try signing in instead.";
  if (message.includes("password")) return mode === "signup" ? "Password must be at least 8 characters." : "Wrong email or password. Please try again.";
  return mode === "signup" ? "Could not create the account. Please check your information and try again." : "Could not sign in. Check your information and try again.";
}

function friendlyProfileSaveError(error) {
  const message = String(error?.message || error || "").toLowerCase();
  if (message.includes("jwt") || message.includes("session") || message.includes("auth") || message.includes("row-level") || message.includes("permission") || message.includes("policy")) {
    return "Please log in again, then save your profile.";
  }
  if (message.includes("duplicate") || message.includes("profiles_username")) {
    return "That username is already taken. Please choose another username.";
  }
  if (message.includes("relation") && message.includes("profiles")) {
    return "The profiles table is missing in Supabase. Run the latest Supabase schema, then try again.";
  }
  return "Profile could not be saved. Please try again soon.";
}

function rememberPendingVerificationEmail(email) {
  state.pendingVerificationEmail = email || "";
  if (state.pendingVerificationEmail) writeLocal("nakaru-pending-verification-email", state.pendingVerificationEmail);
  else localStorage.removeItem("nakaru-pending-verification-email");
}

async function submitAuth(event) {
  event.preventDefault();
  if (state.authLoading) return;
  const form = new FormData(event.currentTarget);
  const email = String(form.get("email") || "").trim();
  const password = String(form.get("password") || "");
  const confirmPassword = String(form.get("confirmPassword") || "");
  const username = cleanUsername(form.get("username") || email, `nakaru_${crypto.randomUUID().slice(0, 6)}`);
  if (!email || !email.includes("@")) {
    state.authStatus = "Enter a valid email address.";
    render();
    return;
  }
  if (password.length < 8) {
    state.authStatus = "Password must be at least 8 characters.";
    render();
    return;
  }
  if (state.authMode === "signup" && password !== confirmPassword) {
    state.authStatus = "Passwords do not match.";
    render();
    return;
  }
  state.rememberEmail = form.get("rememberEmail") === "on";
  state.rememberedEmail = state.rememberEmail ? email : "";
  if (state.rememberEmail) writeLocal("nakaru-remember-email", email);
  else localStorage.removeItem("nakaru-remember-email");
  state.authStatus = "";
  state.authLoading = true;
  render();

  try {
    if (!ensureSupabaseClient()) {
      state.authStatus = accountServiceWarning;
      return;
    }
    if (state.authMode === "signup") {
      const { data, error } = await withTimeout(supabaseClient.auth.signUp({
        email,
        password,
        options: {
          data: { username }
        }
      }), "Signup", 9000);
      if (error) throw error;
      if (!data?.session) {
        state.authMode = "signin";
        state.authStatus = "Account created. Log in with the same email and password. If login says email is not confirmed, turn off Confirm email in Supabase.";
        return;
      }
      state.user = data.session.user || data.user;
      rememberPendingVerificationEmail("");
      try {
        await ensureProfileRecord(username);
      } catch (profileError) {
        console.error("Profile setup after signup failed", profileError);
      }
      state.authStatus = "Account created and signed in.";
    } else {
      const { data, error } = await withTimeout(supabaseClient.auth.signInWithPassword({ email, password }), "Login", 9000);
      if (error) throw error;
      state.user = data.session?.user || data.user;
      rememberPendingVerificationEmail("");
      try {
        await ensureProfileRecord();
      } catch (profileError) {
        console.error("Profile setup after login failed", profileError);
      }
      state.authStatus = "Signed in successfully.";
    }
    try {
      await withTimeout(afterAuthChange(), "Account refresh", 9000);
    } catch (refreshError) {
      console.error("Account refresh after auth timed out", refreshError);
    }
    setPage("profile");
  } catch (error) {
    console.error("Auth failed", error);
    state.authStatus = friendlyAuthError(error, state.authMode);
    render();
  } finally {
    state.authLoading = false;
    state.socialLoading = "";
    render();
  }
}

async function social(provider) {
  const option = socialProviders.find((item) => item.provider === provider);
  const enabled = enabledSocialProviders().some((item) => item.provider === provider);
  if (!enabled) {
    state.authStatus = "Social login is not enabled yet.";
    render();
    return;
  }
  state.socialLoading = provider;
  render();
  if (option?.externalUrlKey) {
    const externalUrl = config[option.externalUrlKey];
    if (externalUrl) {
      window.location.href = externalUrl;
      return;
    }
    state.socialLoading = "";
    state.authStatus = "Social login is not enabled yet.";
    render();
    return;
  }

  if (!ensureSupabaseClient()) {
    state.socialLoading = "";
    state.authStatus = "Social login is not enabled yet.";
    render();
    return;
  }
  try {
    const { error } = await supabaseClient.auth.signInWithOAuth({ provider, options: { redirectTo: redirectUrl() } });
    if (error) throw error;
  } catch (error) {
    console.error("OAuth failed", error);
    state.socialLoading = "";
    state.authStatus = "Social login is not enabled yet.";
    render();
  }
}

function updateProfile(field, value, options = {}) {
  state.profile = { ...state.profile, [field]: value };
  state.profileDirty = true;
  state.profileStatus = "";
  const saveButton = document.querySelector("[data-profile-save]");
  if (saveButton) {
    saveButton.disabled = state.profileSaving;
    saveButton.textContent = state.profileSaving ? "Saving..." : "Save Profile";
  }
  const status = document.querySelector("[data-profile-status]");
  if (status) status.textContent = "";
  if (options.render) render();
}

function fileToDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ""));
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

function mediaKindFromFile(file) {
  if (!file) return "";
  if (file.type.startsWith("image/")) return "image";
  if (file.type.startsWith("video/")) return "video";
  return "";
}

function mediaLabel(kind = "") {
  return kind === "video" ? "Shared a video." : kind === "image" ? "Shared an image." : "Shared media.";
}

async function refreshAuthSession() {
  if (!supabaseClient?.auth?.getSession) return state.user;
  const { data, error } = await withTimeout(supabaseClient.auth.getSession(), "Session refresh", 6000);
  if (error) throw error;
  state.user = data.session?.user || null;
  return state.user;
}

async function uploadChatMedia(file, folder = "messages") {
  if (!file) return { media_url: "", media_type: "", media_name: "" };
  const mediaType = mediaKindFromFile(file);
  if (!mediaType) throw new Error("Unsupported media type");
  const maxBytes = mediaType === "video" ? 120 * 1024 * 1024 : 15 * 1024 * 1024;
  if (file.size > maxBytes) throw new Error(mediaType === "video" ? "Video file is too large" : "Image file is too large");

  if (!supabaseClient) {
    return {
      media_url: await fileToDataUrl(file),
      media_type: mediaType,
      media_name: file.name || mediaLabel(mediaType)
    };
  }

  const extension = (file.name.split(".").pop() || (mediaType === "video" ? "mp4" : "jpg")).replace(/[^a-z0-9]/gi, "").toLowerCase();
  const safeName = file.name.replace(/\.[^.]+$/, "").replace(/[^a-z0-9_-]+/gi, "-").slice(0, 42) || `nakaru-${mediaType}`;
  const path = `${folder}/${state.user.id}/${Date.now()}-${safeName}.${extension}`;
  const { error: uploadError } = await supabaseClient.storage.from("nakaru-media").upload(path, file, {
    cacheControl: "3600",
    contentType: file.type,
    upsert: false
  });
  if (uploadError) throw uploadError;
  const { data } = supabaseClient.storage.from("nakaru-media").getPublicUrl(path);
  return {
    media_url: data.publicUrl,
    media_type: mediaType,
    media_name: file.name || mediaLabel(mediaType)
  };
}

async function uploadProfileMedia(file, field) {
  if (!file) return "";
  if (!file.type.startsWith("image/")) throw new Error("Please choose an image file.");
  const maxBytes = field === "banner_url" ? 15 * 1024 * 1024 : 8 * 1024 * 1024;
  if (file.size > maxBytes) throw new Error(field === "banner_url" ? "Banner image is too large." : "Profile picture is too large.");
  if (!supabaseClient) return fileToDataUrl(file);

  const user = await refreshAuthSession();
  if (!user) throw new Error("No active session.");
  const extension = (file.name.split(".").pop() || "jpg").replace(/[^a-z0-9]/gi, "").toLowerCase() || "jpg";
  const safeField = field === "banner_url" ? "banner" : "avatar";
  const path = `profiles/${user.id}/${safeField}-${Date.now()}.${extension}`;
  const { error: uploadError } = await withTimeout(
    supabaseClient.storage.from("nakaru-media").upload(path, file, {
      cacheControl: "3600",
      contentType: file.type,
      upsert: false
    }),
    "Profile image upload",
    15000
  );
  if (uploadError) throw uploadError;
  const { data } = supabaseClient.storage.from("nakaru-media").getPublicUrl(path);
  return data.publicUrl;
}

function messageBody(message = {}) {
  return message.text || message.body || "";
}

function renderMessageMedia(message = {}) {
  if (!message.media_url) return "";
  const label = escapeHtml(message.media_name || mediaLabel(message.media_type));
  if (message.media_type === "image") {
    return `<figure class="message-media"><img src="${escapeHtml(message.media_url)}" alt="${label}" loading="lazy" /></figure>`;
  }
  if (message.media_type === "video") {
    return `<figure class="message-media"><video src="${escapeHtml(message.media_url)}" controls playsinline preload="metadata"></video></figure>`;
  }
  return `<a class="message-attachment" href="${escapeHtml(message.media_url)}" target="_blank" rel="noopener noreferrer">${label}</a>`;
}

async function setProfileImage(field, input) {
  const file = input.files?.[0];
  if (!file) return;
  state.profileStatus = field === "banner_url" ? "Uploading banner..." : "Uploading profile picture...";
  render();
  try {
    const imageUrl = await uploadProfileMedia(file, field);
    updateProfile(field, imageUrl, { render: true });
    state.profileStatus = field === "banner_url" ? "Banner ready. Click Save Profile to keep it." : "Profile picture ready. Click Save Profile to keep it.";
  } catch (error) {
    console.error("Profile image upload failed", error);
    try {
      const localImage = await fileToDataUrl(file);
      updateProfile(field, localImage, { render: true });
      state.profileStatus = field === "banner_url"
        ? "Banner preview is ready on this device. Run the Supabase storage setup so it saves permanently for every login."
        : "Profile picture preview is ready on this device. Run the Supabase storage setup so it saves permanently for every login.";
    } catch (fallbackError) {
      console.error("Profile image local fallback failed", fallbackError);
      state.profileStatus = "Image could not be uploaded. Make sure the Supabase storage setup has been run.";
    }
  } finally {
    input.value = "";
    render();
  }
}

async function saveProfile() {
  if (state.profileSaving) return;
  if (!state.user) {
    state.profileStatus = "Please log in before saving your profile.";
    render();
    return;
  }
  if (!state.profileDirty) {
    state.profileEditing = false;
    state.profileStatus = "Profile is already up to date.";
    setPage("profile");
    return;
  }
  state.profileSaving = true;
  state.profileStatus = "";
  render();
  let activeUser = state.user;
  try {
    activeUser = await refreshAuthSession();
    if (!activeUser) throw new Error("No active session.");
  } catch (error) {
    console.error("Profile save session check failed", error);
    state.profileSaving = false;
    state.profileStatus = "Please log in again, then save your profile.";
    render();
    return;
  }
  const defaults = defaultProfileForUser(activeUser);
  const suffix = String(activeUser.id || crypto.randomUUID()).slice(0, 6);
  const row = {
    id: activeUser.id,
    username: cleanUsername(state.profile.username || defaults.username, `nakaru_${suffix}`),
    display_name: state.profile.display_name || state.profile.username || defaults.display_name || "Nakaru Member",
    bio: state.profile.bio || "",
    avatar_url: state.profile.avatar_url || "",
    banner_url: state.profile.banner_url || "",
    updated_at: new Date().toISOString()
  };
  if (row.username === "nakaru_member") row.username = `nakaru_${suffix}`;
  try {
    let bannerColumnMissing = false;
    const avatarIsLocalPreview = isDataUrl(row.avatar_url);
    const bannerIsLocalPreview = isDataUrl(row.banner_url);
    if (avatarIsLocalPreview) writeLocal(`nakaru-avatar-fallback-${activeUser.id}`, row.avatar_url);
    if (bannerIsLocalPreview) writeLocal(`nakaru-banner-fallback-${activeUser.id}`, row.banner_url);
    const dbRow = {
      ...row,
      avatar_url: avatarIsLocalPreview ? (isDataUrl(state.savedProfile?.avatar_url) ? "" : state.savedProfile?.avatar_url || "") : row.avatar_url,
      banner_url: bannerIsLocalPreview ? (isDataUrl(state.savedProfile?.banner_url) ? "" : state.savedProfile?.banner_url || "") : row.banner_url
    };
    if (supabaseClient) {
      let savedData = null;
      let { data, error } = await withTimeout(
        supabaseClient.from("profiles").upsert(dbRow, { onConflict: "id" }).select(profileSelectColumns(true)).single(),
        "Profile save",
        9000
      );
      if (error && isMissingColumnError(error, "banner_url")) {
        bannerColumnMissing = true;
        const { banner_url, ...rowWithoutBanner } = dbRow;
        ({ data, error } = await withTimeout(
          supabaseClient.from("profiles").upsert(rowWithoutBanner, { onConflict: "id" }).select(profileSelectColumns(false)).single(),
          "Profile save retry",
          9000
        ));
      }
      if (error && String(error.message || "").toLowerCase().includes("duplicate")) {
        dbRow.username = `${dbRow.username}_${suffix}`.slice(0, 31);
        row.username = dbRow.username;
        const { banner_url, ...retryRow } = dbRow;
        ({ data, error } = await withTimeout(
          supabaseClient.from("profiles").upsert(retryRow, { onConflict: "id" }).select(profileSelectColumns(false)).single(),
          "Profile username retry",
          9000
        ));
      }
      if (error) throw error;
      savedData = data;
      state.profile = { ...row, ...(savedData || {}) };
      if (avatarIsLocalPreview) state.profile.avatar_url = row.avatar_url;
      if (bannerIsLocalPreview || bannerColumnMissing) state.profile.banner_url = row.banner_url;
      if (bannerColumnMissing) writeLocal(`nakaru-banner-fallback-${activeUser.id}`, row.banner_url || "");
    } else {
      const profiles = readLocal("nakaru-local-profiles", {});
      profiles[state.user.id] = row;
      writeLocal("nakaru-local-profiles", profiles);
      writeLocal("nakaru-profile", row);
      state.profile = row;
    }
    state.savedProfile = { ...state.profile };
    state.profileDirty = false;
    state.profileEditing = false;
    state.profileStatus = (avatarIsLocalPreview || bannerIsLocalPreview)
      ? "Profile text saved. Image previews are only on this device until Supabase Storage is set up."
      : bannerColumnMissing
      ? "Profile updated, but Supabase is missing the banner_url column. Run the latest schema so banners persist after login."
      : "Profile updated successfully.";
    if (supabaseClient && state.profile.banner_url === row.banner_url && isDataUrl(row.banner_url)) {
      state.profileStatus = "Profile updated, but the banner is still stored only on this device. Run the Supabase storage setup so banner images save permanently.";
    }
    await Promise.allSettled([loadProfile(), loadPublicProfiles()]);
    setPage("profile");
  } catch (error) {
    console.error("Profile save failed", error);
    state.profileStatus = friendlyProfileSaveError(error);
    render();
  } finally {
    state.profileSaving = false;
    render();
  }
}

function cancelProfile() {
  state.profile = { ...state.savedProfile };
  state.profileDirty = false;
  state.profileEditing = false;
  state.profileStatus = "";
  setPage("profile");
}

async function searchUsers(event) {
  event?.preventDefault();
  const value = event ? String(new FormData(event.currentTarget).get("search") || "") : state.socialSearch;
  state.socialSearch = safeProfileSearch(value);
  if (!state.socialSearch) {
    state.searchResults = [];
    state.searchStatus = "Search by username or display name.";
    render();
    return;
  }
  const query = state.socialSearch.toLowerCase();
  if (supabaseClient) {
    try {
      const pattern = `%${state.socialSearch}%`;
      let profileQuery = supabaseClient
        .from("profiles")
        .select(profileSelectColumns(true))
        .or(`username.ilike.${pattern},display_name.ilike.${pattern}`)
        .order("display_name", { ascending: true })
        .limit(30);
      if (state.user?.id) profileQuery = profileQuery.neq("id", state.user.id);
      let { data, error } = await withTimeout(profileQuery, "User search", 7000);
      if (error && isMissingColumnError(error, "banner_url")) {
        profileQuery = supabaseClient
          .from("profiles")
          .select(profileSelectColumns(false))
          .or(`username.ilike.${pattern},display_name.ilike.${pattern}`)
          .order("display_name", { ascending: true })
          .limit(30);
        if (state.user?.id) profileQuery = profileQuery.neq("id", state.user.id);
        ({ data, error } = await withTimeout(profileQuery, "User search retry", 7000));
      }
      if (error) throw error;
      state.searchResults = data || [];
      const merged = [...state.publicProfiles];
      for (const profile of state.searchResults) {
        if (!merged.some((item) => item.id === profile.id)) merged.push(profile);
      }
      state.publicProfiles = merged;
    } catch (error) {
      console.error("User search failed", error);
      await loadPublicProfiles();
      state.searchResults = state.publicProfiles
        .filter((profile) => profile.id !== state.user?.id)
        .filter((profile) => `${profile.username || ""} ${profile.display_name || ""}`.toLowerCase().includes(query))
        .slice(0, 20);
      state.searchStatus = state.searchResults.length ? "" : "User search is temporarily unavailable. Ask the member to save their profile, then try again.";
      render();
      return;
    }
  } else {
    await loadPublicProfiles();
    state.searchResults = state.publicProfiles
      .filter((profile) => profile.id !== state.user?.id)
      .filter((profile) => `${profile.username || ""} ${profile.display_name || ""}`.toLowerCase().includes(query))
      .slice(0, 20);
  }
  state.searchStatus = state.searchResults.length ? "" : "No users found yet.";
  render();
}

async function openUserProfile(profileId) {
  if (!profileId) return;
  state.publicProfileId = profileId;
  state.publicProfileStatus = "";
  state.sidebarOpen = false;
  state.page = "public-profile";
  render();
  scrollToCurrentPage();
  try {
    await loadPublicProfiles();
    if (state.user) {
      await Promise.allSettled([loadFriendRequests(), loadFriendships()]);
    }
    if (!profileById(profileId).id) {
      state.publicProfileStatus = "This profile could not be found yet. Ask the member to save their profile once.";
    }
  } catch (error) {
    console.error("Public profile load failed", error);
    state.publicProfileStatus = "Profile could not load right now. Please try again soon.";
  } finally {
    render();
    scrollToCurrentPage();
  }
}

async function topSearch(event) {
  event?.preventDefault();
  const value = String(new FormData(event.currentTarget).get("topSearch") || "").trim();
  if (!value) return;
  state.topSearch = value;
  state.socialSearch = value;
  setPage("search");
  await searchUsers();
}

function openReferenceSearch(kind = "images", value = state.socialSearch || state.topSearch) {
  const query = String(value || "").trim();
  if (!query) {
    state.searchStatus = "Type something to search first.";
    render();
    return;
  }
  const safeQuery = encodeURIComponent(`${query} anime reference`);
  const url = kind === "youtube"
    ? `https://www.youtube.com/results?search_query=${safeQuery}`
    : `https://www.google.com/search?tbm=isch&q=${safeQuery}`;
  window.open(url, "_blank", "noopener,noreferrer");
}

function actionForProfile(profile) {
  const status = relationTo(profile.id);
  if (status === "self") return `<button class="ghost-action" onclick="setPage('edit-profile')" type="button">Edit Profile</button>`;
  if (status === "signed-out") return `<button class="primary-action" onclick="setPage('edit-profile')" type="button">Sign in to Add</button>`;
  if (status === "friend") return `<button class="primary-action" onclick="messageFriend('${profile.id}')" type="button">Message</button>`;
  if (status === "pending-in") return `<button class="primary-action" onclick="setPage('friend-requests')" type="button">Respond</button>`;
  if (status === "pending-out") return `<button class="ghost-action" type="button" disabled>Request Sent</button>`;
  if (status === "blocked") return `<button class="ghost-action" type="button" disabled>Blocked</button>`;
  return `<button class="ghost-action" onclick="sendFriendRequest('${profile.id}')" type="button">Add Friend</button>`;
}

function userCard(profile, extra = "") {
  return `
    <article class="user-card">
      ${profileIdentityButton(profile)}
      <div class="user-card-actions">
        ${extra || actionForProfile(profile)}
      </div>
    </article>
  `;
}

async function sendFriendRequest(receiverId) {
  if (!state.user) {
    state.socialStatus = "Sign in to send friend requests.";
    render();
    return;
  }
  if (!receiverId || receiverId === state.user.id) return;
  if (!ensureSupabaseClient()) {
    state.socialStatus = "Friend requests need account services online.";
    render();
    return;
  }
  try {
    await Promise.allSettled([loadFriendRequests(), loadFriendships()]);
    if (isFriend(receiverId)) {
      state.socialStatus = "You are already friends. You can message this member now.";
      state.activeDmRecipient = receiverId;
      render();
      return;
    }
    const existing = [...state.incomingRequests, ...state.outgoingRequests].find((request) => [request.sender_id, request.receiver_id].includes(receiverId));
    if (existing?.status === "pending") {
      state.socialStatus = existing.receiver_id === state.user.id ? "This member already sent you a request. Open Requests to respond." : "Friend request is already pending.";
      render();
      return;
    }
    if (existing?.status === "declined" && existing.sender_id === state.user.id) {
      const { error } = await supabaseClient
        .from("friend_requests")
        .update({ status: "pending", updated_at: new Date().toISOString() })
        .eq("id", existing.id);
      if (error) throw error;
    } else {
      const { error } = await supabaseClient.from("friend_requests").insert({ sender_id: state.user.id, receiver_id: receiverId, status: "pending" });
      if (error) throw error;
    }
    state.socialStatus = "Friend request sent.";
    await loadFriendRequests();
  } catch (error) {
    console.error("Friend request failed", error);
    const message = String(error?.message || "").toLowerCase();
    state.socialStatus = message.includes("duplicate") || error?.code === "23505"
      ? "A friend request already exists. Check Requests for its status."
      : "Friend request could not be sent. Run the latest friend-request SQL in Supabase.";
  } finally {
    render();
  }
}

async function respondFriendRequest(requestId, status) {
  const request = state.incomingRequests.find((item) => item.id === requestId);
  if (!request) return;
  try {
    const { error } = await supabaseClient.from("friend_requests").update({ status, updated_at: new Date().toISOString() }).eq("id", requestId);
    if (error) throw error;
    if (status === "accepted") {
      const rows = [
        { user_id: state.user.id, friend_id: request.sender_id },
        { user_id: request.sender_id, friend_id: state.user.id }
      ];
      const { error: friendError } = await supabaseClient
        .from("friendships")
        .upsert(rows, { onConflict: "user_id,friend_id", ignoreDuplicates: true });
      if (friendError) throw friendError;
      state.socialStatus = "Friend request accepted.";
    } else {
      state.socialStatus = `Friend request ${status}.`;
    }
    await Promise.allSettled([loadPublicProfiles(), loadFriendRequests(), loadFriendships(), loadDirectMessages()]);
  } catch (error) {
    console.error("Friend request response failed", error);
    state.socialStatus = "Request could not be updated. Run the latest friend-request SQL in Supabase.";
  } finally {
    render();
  }
}

async function messageFriend(friendId) {
  if (!isFriend(friendId)) {
    state.dmStatus = "You can message this user after you become friends.";
    render();
    return;
  }
  state.activeDmRecipient = friendId;
  state.activeConversationId = "";
  state.page = "messages";
  await loadDirectMessages();
  render();
}

async function createTextPost(event) {
  event.preventDefault();
  const input = event.currentTarget.querySelector("input");
  const content = input.value.trim();
  if (!content) return;
  if (!state.user) {
    state.postStatus = "Sign in to create a post.";
    render();
    return;
  }
  await savePost({ post_type: "text", content });
  input.value = "";
  state.postStatus = "Post shared.";
  render();
}

async function postYouTube(event) {
  event.preventDefault();
  if (state.videoPosting) return;
  const input = event.currentTarget.querySelector("input");
  const parsed = parseYouTubeUrl(input.value);
  if (!state.user) {
    state.youtubeStatus = "Sign in to post a video.";
    render();
    return;
  }
  if (!parsed) {
    state.youtubeStatus = "Please enter a valid YouTube URL.";
    render();
    return;
  }
  state.videoPosting = true;
  render();
  try {
    state.lastVideoPost = await savePost({ post_type: "youtube", content: "Shared a YouTube video.", youtube_url: parsed.originalUrl, youtube_embed_url: parsed.embedUrl });
    state.youtubeStatus = "";
    state.videoComposerOpen = false;
  } catch (error) {
    console.error("Video post failed", error);
    state.youtubeStatus = "Video could not be posted. Please try again soon.";
  } finally {
    state.videoPosting = false;
    render();
  }
}

async function postDeviceVideo(event) {
  event.preventDefault();
  if (state.deviceVideoPosting) return;
  const input = event.currentTarget.querySelector("input[type='file']");
  const file = input?.files?.[0];
  if (!state.user) {
    state.deviceVideoStatus = "Sign in to upload a video.";
    render();
    return;
  }
  if (!file) {
    state.deviceVideoStatus = "Choose a video from your device first.";
    render();
    return;
  }
  if (!file.type.startsWith("video/")) {
    state.deviceVideoStatus = "Please choose a valid video file.";
    render();
    return;
  }
  const maxBytes = 120 * 1024 * 1024;
  if (file.size > maxBytes) {
    state.deviceVideoStatus = "Please choose a video under 120 MB.";
    render();
    return;
  }

  state.deviceVideoPosting = true;
  state.deviceVideoStatus = "";
  render();
  try {
    let mediaUrl = "";
    if (supabaseClient) {
      const extension = (file.name.split(".").pop() || "mp4").replace(/[^a-z0-9]/gi, "").toLowerCase() || "mp4";
      const safeName = file.name.replace(/\.[^.]+$/, "").replace(/[^a-z0-9_-]+/gi, "-").slice(0, 42) || "nakaru-video";
      const path = `videos/${state.user.id}/${Date.now()}-${safeName}.${extension}`;
      const { error: uploadError } = await supabaseClient.storage.from("nakaru-media").upload(path, file, {
        cacheControl: "3600",
        contentType: file.type,
        upsert: false
      });
      if (uploadError) throw uploadError;
      const { data } = supabaseClient.storage.from("nakaru-media").getPublicUrl(path);
      mediaUrl = data.publicUrl;
    } else {
      mediaUrl = await fileToDataUrl(file);
    }

    state.lastDeviceVideoPost = await savePost({
      post_type: "video",
      content: "Shared a video from their device.",
      media_url: mediaUrl
    });
    state.deviceVideoStatus = "";
    state.deviceVideoComposerOpen = false;
    input.value = "";
  } catch (error) {
    console.error("Device video upload failed", error);
    state.deviceVideoStatus = "Video could not be uploaded. Please try again soon.";
  } finally {
    state.deviceVideoPosting = false;
    render();
  }
}

async function savePost(postInput) {
  const postType = postInput.post_type || postInput.type || "text";
  const post = {
    id: crypto.randomUUID(),
    user_id: state.user.id,
    author: state.profile.display_name || state.profile.username || "Nakaru Member",
    likes: 0,
    comments_count: 0,
    created_at: new Date().toISOString(),
    ...postInput
  };
  if (supabaseClient) {
    const dbPost = {
      user_id: state.user.id,
      content: postInput.content || "",
      post_type: postType,
      media_url: postInput.media_url || null,
      youtube_url: postInput.youtube_url || null,
      youtube_embed_url: postInput.youtube_embed_url || null,
      updated_at: new Date().toISOString()
    };
    let { data, error } = await supabaseClient
      .from("posts")
      .insert(dbPost)
      .select("id,user_id,content,post_type,media_url,youtube_url,youtube_embed_url,created_at,updated_at")
      .single();
    if (error && isMissingColumnError(error, "post_type")) {
      const { post_type, ...fallbackPost } = dbPost;
      fallbackPost.type = postType;
      ({ data, error } = await supabaseClient.from("posts").insert(fallbackPost).select().single());
    }
    if (error) throw error;
    const normalized = normalizePost(data);
    state.posts = [normalized, ...state.posts];
    return normalized;
  } else {
    const normalized = normalizePost({ ...post, post_type: postType });
    state.posts = [normalized, ...state.posts];
    writeLocal("nakaru-posts", state.posts);
    return normalized;
  }
}

async function sendRoomMessage(event, roomId = state.activeRoom, statusField = "roomStatus") {
  event.preventDefault();
  const input = event.currentTarget.querySelector("input");
  const fileInput = event.currentTarget.querySelector("input[type='file']");
  const text = input?.value.trim() || "";
  const file = fileInput?.files?.[0] || null;
  if (!text && !file) return;
  if (!state.user) {
    state[statusField] = "Sign in to chat in live rooms.";
    render();
    return;
  }
  let media = { media_url: "", media_type: "", media_name: "" };
  if (file) {
    try {
      media = await uploadChatMedia(file, `rooms/${roomId}`);
    } catch (error) {
      console.error("Room media upload failed", error);
      state[statusField] = "That image or video could not be attached. Please try a smaller file.";
      render();
      return;
    }
  }
  const message = {
    id: crypto.randomUUID(),
    room_id: roomId,
    user_id: state.user.id,
    author: state.profile.display_name || "Nakaru Member",
    text: text || mediaLabel(media.media_type),
    ...media,
    created_at: new Date().toISOString()
  };
  try {
    if (supabaseClient) {
      let { data, error } = await supabaseClient.from("room_messages").insert({
        room_id: message.room_id,
        user_id: message.user_id,
        author: message.author,
        text: message.text,
        media_url: message.media_url || null,
        media_type: message.media_type || null,
        media_name: message.media_name || null
      }).select("id,room_id,user_id,author,text,media_url,media_type,media_name,created_at").single();
      if (error && (isMissingColumnError(error, "media_url") || isMissingColumnError(error, "media_type") || isMissingColumnError(error, "media_name"))) {
        ({ data, error } = await supabaseClient.from("room_messages").insert({
          room_id: message.room_id,
          user_id: message.user_id,
          author: message.author,
          text: message.text
        }).select("id,room_id,user_id,author,text,created_at").single());
      }
      if (error) throw error;
      state.roomMessages[roomId] = [...(state.roomMessages[roomId] || []), data];
    } else {
      state.roomMessages[roomId] = [...(state.roomMessages[roomId] || []), message];
      writeLocal("nakaru-room-messages", state.roomMessages);
    }
    state[statusField] = "";
    if (input) input.value = "";
    if (fileInput) fileInput.value = "";
  } catch (error) {
    console.error("Room message send failed", error);
    state[statusField] = "Chat is temporarily unavailable. Please try again soon.";
  } finally {
    render();
  }
}

async function setDmRecipient(profileId) {
  state.activeDmRecipient = profileId;
  state.dmStatus = "";
  await loadDirectMessages();
  render();
}

async function sendDm(event) {
  event.preventDefault();
  const input = event.currentTarget.querySelector("input");
  const fileInput = event.currentTarget.querySelector("input[type='file']");
  const text = input?.value.trim() || "";
  const file = fileInput?.files?.[0] || null;
  if (!text && !file) return;
  if (!state.user) {
    state.dmStatus = "Sign in to send direct messages.";
    render();
    return;
  }
  if (!isFriend(state.activeDmRecipient)) {
    state.dmStatus = "You can message this user after you become friends.";
    render();
    return;
  }
  let media = { media_url: "", media_type: "", media_name: "" };
  if (file) {
    try {
      media = await uploadChatMedia(file, `direct-messages/${state.activeDmRecipient || "demo"}`);
    } catch (error) {
      console.error("DM media upload failed", error);
      state.dmStatus = "That image or video could not be attached. Please try a smaller file.";
      render();
      return;
    }
  }
  const body = text || mediaLabel(media.media_type);
  if (state.activeDmRecipient && supabaseClient) {
    try {
      const conversationId = await ensureConversation(state.activeDmRecipient);
      let { data, error } = await supabaseClient
        .from("messages")
        .insert({
          conversation_id: conversationId,
          sender_id: state.user.id,
          receiver_id: state.activeDmRecipient,
          body,
          media_url: media.media_url || null,
          media_type: media.media_type || null,
          media_name: media.media_name || null,
          read: false
        })
        .select("id,conversation_id,sender_id,receiver_id,body,media_url,media_type,media_name,read,created_at")
        .single();
      if (error && (isMissingColumnError(error, "media_url") || isMissingColumnError(error, "media_type") || isMissingColumnError(error, "media_name"))) {
        ({ data, error } = await supabaseClient
          .from("messages")
          .insert({ conversation_id: conversationId, sender_id: state.user.id, receiver_id: state.activeDmRecipient, body, read: false })
          .select("id,conversation_id,sender_id,receiver_id,body,read,created_at")
          .single());
      }
      if (error) throw error;
      state.dmMessages = [...state.dmMessages, { ...data, text: data.body }];
      if (input) input.value = "";
      if (fileInput) fileInput.value = "";
      state.dmStatus = "";
      render();
      return;
    } catch (error) {
      console.error("Conversation message send failed", error);
      try {
        let { data, error: fallbackError } = await supabaseClient
          .from("direct_messages")
          .insert({
            sender_id: state.user.id,
            recipient_id: state.activeDmRecipient,
            text: body,
            media_url: media.media_url || null,
            media_type: media.media_type || null,
            media_name: media.media_name || null
          })
          .select("id,sender_id,recipient_id,text,media_url,media_type,media_name,created_at")
          .single();
        if (fallbackError && (isMissingColumnError(fallbackError, "media_url") || isMissingColumnError(fallbackError, "media_type") || isMissingColumnError(fallbackError, "media_name"))) {
          ({ data, error: fallbackError } = await supabaseClient
            .from("direct_messages")
            .insert({ sender_id: state.user.id, recipient_id: state.activeDmRecipient, text: body })
            .select("id,sender_id,recipient_id,text,created_at")
            .single());
        }
        if (fallbackError) throw fallbackError;
        state.dmMessages = [...state.dmMessages, data];
        if (input) input.value = "";
        if (fileInput) fileInput.value = "";
        state.dmStatus = "";
        render();
        return;
      } catch (fallbackError) {
        console.error("Direct message send failed", fallbackError);
        state.dmStatus = "Messaging is temporarily unavailable. Please try again soon.";
        render();
        return;
      }
    }
  }
  state.threads = state.threads.map((thread) => {
    if (thread.id !== state.activeThread) return thread;
    return { ...thread, preview: body, messages: [...thread.messages, { id: crypto.randomUUID(), fromMe: true, text: body, ...media }] };
  });
  writeLocal("nakaru-dm-threads", state.threads);
  if (input) input.value = "";
  if (fileInput) fileInput.value = "";
  render();
}

async function startFriendCall(friendId, type = "video") {
  if (!isFriend(friendId)) {
    state.callStatus = "You can call this user after you become friends.";
    setPage("calls");
    return;
  }
  try {
    const roomId = `call_${crypto.randomUUID()}`;
    const { data, error } = await supabaseClient
      .from("calls")
      .insert({ caller_id: state.user.id, receiver_id: friendId, call_type: type, status: "ringing", room_id: roomId })
      .select("id,caller_id,receiver_id,call_type,status,room_id,created_at,ended_at")
      .single();
    if (error) throw error;
    state.activeCallId = data.id;
    state.callRoom = data.room_id;
    state.activeDmRecipient = friendId;
    state.page = "calls";
    await connectCall(type, true);
    await loadCalls();
  } catch (error) {
    console.error("Call start failed", error);
    state.callStatus = "Call could not start. Please try again.";
    render();
  }
}

async function acceptCall(callId) {
  const call = state.calls.find((item) => item.id === callId);
  if (!call) return;
  try {
    const { error } = await supabaseClient.from("calls").update({ status: "accepted" }).eq("id", callId);
    if (error) throw error;
    state.activeCallId = call.id;
    state.callRoom = call.room_id;
    state.activeDmRecipient = call.caller_id === state.user.id ? call.receiver_id : call.caller_id;
    state.page = "calls";
    await connectCall(call.call_type || "video", false);
    await loadCalls();
  } catch (error) {
    console.error("Call accept failed", error);
    state.callStatus = "Call could not be accepted.";
    render();
  }
}

async function declineCall(callId) {
  try {
    const { error } = await supabaseClient.from("calls").update({ status: "declined", ended_at: new Date().toISOString() }).eq("id", callId);
    if (error) throw error;
    state.callStatus = "Call declined.";
    await loadCalls();
  } catch (error) {
    console.error("Call decline failed", error);
    state.callStatus = "Call could not be declined.";
  } finally {
    render();
  }
}

async function endActiveCall() {
  await stopCamera(false);
  if (state.activeCallId && supabaseClient) {
    await supabaseClient.from("calls").update({ status: "ended", ended_at: new Date().toISOString() }).eq("id", state.activeCallId);
  }
  state.activeCallId = "";
  state.callStatus = "Call ended.";
  await loadCalls();
  render();
}

async function createLiveRoom(event) {
  event?.preventDefault();
  if (state.liveRoomCreating) return;
  let activeUser = state.user;
  try {
    activeUser = await refreshAuthSession();
  } catch (error) {
    console.error("Live room session check failed", error);
  }
  if (!activeUser) {
    state.liveRoomStatus = "Sign in to create a live room.";
    render();
    return;
  }
  if (!ensureSupabaseClient()) {
    state.liveRoomStatus = "Live rooms need account services online.";
    render();
    return;
  }
  const form = event ? new FormData(event.currentTarget) : null;
  const roomName = String(form?.get("roomName") || state.callRoom || "Nakaru Live Room").trim();
  state.liveRoomCreating = true;
  state.liveRoomStatus = "Creating live room...";
  render();
  try {
    const { data, error } = await withTimeout(supabaseClient
      .from("live_rooms")
      .insert({ host_id: activeUser.id, room_name: roomName, room_url: `${redirectUrl()}#live`, is_active: true })
      .select("id,host_id,room_name,room_url,is_active,created_at,ended_at")
      .single(), "Live room create", 8000);
    if (error) throw error;
    state.activeLiveRoom = data;
    state.callRoom = data.id;
    state.liveRoomSearch = "";
    state.liveRoomStatus = "Live room is live and searchable. Invite friends or start video.";
    await loadLiveRooms();
  } catch (error) {
    console.error("Live room create failed", error);
    state.liveRoomStatus = "Live room could not be created. Run the latest Supabase schema and confirm you are logged in.";
  } finally {
    state.liveRoomCreating = false;
    render();
  }
}

async function searchLiveRooms(event) {
  event?.preventDefault();
  const value = event ? String(new FormData(event.currentTarget).get("liveRoomSearch") || "") : state.liveRoomSearch;
  state.liveRoomSearch = value.trim();
  await loadLiveRooms();
  if (state.liveRoomSearch && !state.liveRoomSearchResults.length) {
    state.liveRoomStatus = "No matching live rooms are active yet.";
  } else if (state.liveRoomSearch) {
    state.liveRoomStatus = `${state.liveRoomSearchResults.length} live room${state.liveRoomSearchResults.length === 1 ? "" : "s"} found.`;
  }
  render();
}

async function joinLiveRoom(roomId, mode = "video") {
  const room = state.liveRooms.find((item) => item.id === roomId) || state.liveRoomSearchResults.find((item) => item.id === roomId);
  if (!room) {
    state.liveRoomStatus = "That live room is no longer available.";
    render();
    return;
  }
  state.activeLiveRoom = room;
  state.callRoom = room.id;
  state.liveRoomJoining = room.id;
  state.liveRoomStatus = `Joining ${room.room_name || "live room"} over your internet connection...`;
  render();
  try {
    await joinCall(mode);
  } finally {
    state.liveRoomJoining = "";
    render();
  }
}

async function endLiveRoom(roomId = state.activeLiveRoom?.id) {
  await stopCamera(false);
  if (roomId && supabaseClient) {
    const room = state.liveRooms.find((item) => item.id === roomId) || state.activeLiveRoom;
    if (room?.host_id === state.user?.id) {
      const { error } = await supabaseClient.from("live_rooms").update({ is_active: false, ended_at: new Date().toISOString() }).eq("id", roomId);
      if (error) console.error("Live room end failed", error);
    }
  }
  state.activeLiveRoom = null;
  state.callRoom = "nakaru-lounge";
  state.liveRoomStatus = "Live room ended.";
  await loadLiveRooms();
  render();
}

async function inviteFriendToLiveRoom(friendId) {
  if (!isFriend(friendId)) {
    state.liveRoomStatus = "Only accepted friends can be invited.";
    render();
    return;
  }
  try {
    if (!state.activeLiveRoom) await createLiveRoom();
    if (!state.activeLiveRoom) return;
    const { error } = await supabaseClient.from("live_room_invites").insert({
      room_id: state.activeLiveRoom.id,
      sender_id: state.user.id,
      receiver_id: friendId,
      status: "pending"
    });
    if (error) throw error;
    state.liveRoomStatus = "Live room invite sent.";
    await loadLiveRoomInvites();
  } catch (error) {
    console.error("Live room invite failed", error);
    state.liveRoomStatus = "Invite could not be sent.";
  } finally {
    render();
  }
}

async function acceptLiveInvite(inviteId) {
  const invite = state.liveRoomInvites.find((item) => item.id === inviteId);
  if (!invite) return;
  try {
    const { error } = await supabaseClient.from("live_room_invites").update({ status: "accepted" }).eq("id", inviteId);
    if (error) throw error;
    state.callRoom = invite.room_id;
    state.page = "live";
    state.liveRoomStatus = "Live invite accepted. Joining room...";
    await joinCall("video");
    await loadLiveRoomInvites();
  } catch (error) {
    console.error("Live invite accept failed", error);
    state.liveRoomStatus = "Live invite could not be accepted.";
    render();
  }
}

async function declineLiveInvite(inviteId) {
  try {
    const { error } = await supabaseClient.from("live_room_invites").update({ status: "declined" }).eq("id", inviteId);
    if (error) throw error;
    state.liveRoomStatus = "Live invite declined.";
    await loadLiveRoomInvites();
  } catch (error) {
    console.error("Live invite decline failed", error);
    state.liveRoomStatus = "Live invite could not be declined.";
  } finally {
    render();
  }
}

function callRoomId() {
  return cleanUsername(state.callRoom || "nakaru-lounge", "nakaru_lounge");
}

function attachMediaStreams() {
  const localVideo = document.querySelector("#live-video");
  const remoteVideo = document.querySelector("#remote-video");
  if (localVideo && state.stream) localVideo.srcObject = state.stream;
  if (remoteVideo && state.remoteStream) remoteVideo.srcObject = state.remoteStream;
}

function createPeerConnection() {
  const peer = new RTCPeerConnection({ iceServers: [{ urls: "stun:stun.l.google.com:19302" }] });
  state.remoteStream = new MediaStream();
  peer.ontrack = (event) => {
    event.streams[0]?.getTracks().forEach((track) => state.remoteStream.addTrack(track));
    state.callStatus = "Connected to the other user.";
    render();
  };
  peer.onicecandidate = (event) => {
    if (event.candidate) sendCallSignal({ type: "ice", candidate: event.candidate });
  };
  return peer;
}

async function sendCallSignal(payload) {
  if (!state.callChannel || !state.user) return;
  await state.callChannel.send({
    type: "broadcast",
    event: "signal",
    payload: { ...payload, from: state.user.id, room: callRoomId() }
  });
}

async function handleCallSignal(payload) {
  if (!payload || payload.from === state.user?.id || payload.room !== callRoomId() || !state.peer) return;
  try {
    if (payload.type === "offer") {
      await state.peer.setRemoteDescription(new RTCSessionDescription(payload.offer));
      const answer = await state.peer.createAnswer();
      await state.peer.setLocalDescription(answer);
      await sendCallSignal({ type: "answer", answer });
      state.callStatus = "Answer sent. Connecting...";
    }
    if (payload.type === "answer") {
      await state.peer.setRemoteDescription(new RTCSessionDescription(payload.answer));
      state.callStatus = "Answer received. Connecting...";
    }
    if (payload.type === "ice" && payload.candidate) {
      await state.peer.addIceCandidate(new RTCIceCandidate(payload.candidate));
    }
  } catch (error) {
    console.error("Call signal failed", error);
    state.callStatus = "Call connection failed. Please try again.";
  } finally {
    render();
  }
}

async function connectCall(mode = "video", isCaller = false) {
  if (state.callStarting) return;
  if (!state.user) {
    state.callStatus = "Sign in to start or join a call.";
    render();
    return;
  }
  if (!ensureSupabaseClient()) {
    state.callStatus = "Calls need Supabase Realtime enabled.";
    render();
    return;
  }
  if (!navigator.mediaDevices?.getUserMedia || !window.RTCPeerConnection) {
    state.callStatus = "This browser does not support audio/video calling.";
    render();
    return;
  }
  await stopCamera(false);
  state.callStarting = true;
  state.callMode = mode;
  state.callStatus = isCaller ? "Starting call room..." : "Joining call room...";
  render();
  try {
    state.stream = await navigator.mediaDevices.getUserMedia({ video: mode === "video", audio: true });
    state.peer = createPeerConnection();
    state.stream.getTracks().forEach((track) => state.peer.addTrack(track, state.stream));
    state.callChannel = supabaseClient.channel(`nakaru-call-${callRoomId()}`, { config: { broadcast: { self: false } } });
    state.callChannel.on("broadcast", { event: "signal" }, ({ payload }) => handleCallSignal(payload));
    await new Promise((resolve, reject) => {
      state.callChannel.subscribe((status) => {
        if (status === "SUBSCRIBED") resolve();
        if (status === "CHANNEL_ERROR" || status === "TIMED_OUT") reject(new Error(status));
      });
    });
    state.inCall = true;
    if (isCaller) {
      const offer = await state.peer.createOffer();
      await state.peer.setLocalDescription(offer);
      await sendCallSignal({ type: "offer", offer });
      state.callStatus = "Call room started. Have the other user join the same room.";
    } else {
      state.callStatus = "Joined. Waiting for the caller to connect.";
    }
  } catch (error) {
    console.error("Call setup failed", error);
    state.callStatus = "Call could not start. Check camera/microphone permission and try again.";
    await stopCamera(false);
  } finally {
    state.callStarting = false;
    render();
    attachMediaStreams();
  }
}

async function startCall(mode = "video") {
  if (state.page === "live" && !state.activeLiveRoom) {
    await createLiveRoom();
    if (!state.activeLiveRoom) return;
  }
  await connectCall(mode, true);
}

async function joinCall(mode = "video") {
  await connectCall(mode, false);
}

async function startCamera() {
  try {
    state.stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
    render();
    attachMediaStreams();
  } catch (error) {
    console.error("Media permission failed", error);
    state.callStatus = "Camera or microphone permission was denied.";
    render();
  }
}

async function stopCamera(shouldRender = true) {
  state.stream?.getTracks().forEach((track) => track.stop());
  state.remoteStream?.getTracks().forEach((track) => track.stop());
  state.peer?.close();
  if (state.callChannel && supabaseClient) {
    try {
      await withTimeout(supabaseClient.removeChannel(state.callChannel), "Call cleanup", 2500);
    } catch (error) {
      console.warn("Call cleanup timed out", error);
    }
  }
  state.stream = null;
  state.remoteStream = null;
  state.peer = null;
  state.callChannel = null;
  state.inCall = false;
  if (shouldRender) state.callStatus = "Call ended.";
  if (shouldRender) render();
}

async function signOut() {
  if (state.authLoading) return;
  state.authLoading = true;
  render();
  try {
    await withTimeout(stopCamera(false), "Camera cleanup", 3000);
    if (ensureSupabaseClient()) {
      const { error } = await withTimeout(supabaseClient.auth.signOut({ scope: "global" }), "Sign out", 6000);
      if (error) {
        console.error("Global sign out failed", error);
        await withTimeout(supabaseClient.auth.signOut({ scope: "local" }), "Local sign out", 3500);
      }
    }
  } catch (error) {
    console.error("Sign out failed", error);
  } finally {
    clearBrowserAuthStorage();
    resetPrivateState();
    state.authLoading = false;
    state.authStatus = "Signed out.";
    state.page = "home";
    render();
  }
}

function renderPost(post) {
  const postType = post.post_type || post.type || "text";
  const authorProfile = profileById(post.user_id);
  const postProfile = authorProfile.id ? authorProfile : { display_name: post.author || "Nakaru Member" };
  return `
    <article class="post-card">
      <div class="post-head">${profileIdentityButton({ ...postProfile, display_name: postProfile.display_name || post.author || postProfile.username }, "")}<span>${formatTime(post.created_at)}</span></div>
      <p>${escapeHtml(post.content || "")}</p>
      ${postType === "youtube" && post.youtube_embed_url ? `<div class="video-frame"><iframe src="${escapeHtml(post.youtube_embed_url)}" title="Nakaru-San YouTube post" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" allowfullscreen></iframe></div>` : ""}
      ${postType === "video" && post.media_url ? `<div class="video-frame uploaded-video"><video src="${escapeHtml(post.media_url)}" controls playsinline preload="metadata"></video></div>` : ""}
      <div class="post-actions"><button type="button">${post.likes || 0} Likes</button><button type="button">${post.comments_count || post.comments || 0} Comments</button><button type="button">Reply</button></div>
    </article>
  `;
}

function renderVideoOnly(post) {
  if (post?.media_url) {
    return `<div class="posted-video-only"><div class="video-frame uploaded-video"><video src="${escapeHtml(post.media_url)}" controls playsinline preload="metadata"></video></div></div>`;
  }
  if (!post?.youtube_embed_url) {
    return `<p class="empty-state">Video posted. Open the live feed to view it.</p>`;
  }
  return `<div class="posted-video-only"><div class="video-frame"><iframe src="${escapeHtml(post.youtube_embed_url)}" title="Posted Nakaru-San YouTube video" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" allowfullscreen></iframe></div></div>`;
}

function authView() {
  const enabledOauth = enabledSocialProviders();
  return `
    <section class="auth-card panel">
      <div class="panel-title"><span class="eyebrow">Account</span><h2>${state.authMode === "signup" ? "Create your Nakaru-San account" : "Welcome back"}</h2></div>
      <div class="segmented">
        <button class="${state.authMode === "signin" ? "active" : ""}" onclick="state.authMode='signin'; state.authStatus=''; render()" type="button">Log In</button>
        <button class="${state.authMode === "signup" ? "active" : ""}" onclick="state.authMode='signup'; state.authStatus=''; render()" type="button">Sign Up</button>
      </div>
      <form class="form-grid" onsubmit="submitAuth(event)">
        ${state.authMode === "signup" ? `<label>Username<input name="username" autocomplete="username" placeholder="nakaru_fan" /></label>` : ""}
        <label>Email<input name="email" autocomplete="email" type="email" value="${escapeHtml(state.rememberedEmail)}" placeholder="you@example.com" required /></label>
        <label>Password<input name="password" autocomplete="${state.authMode === "signup" ? "new-password" : "current-password"}" type="password" placeholder="8+ characters" required minlength="8" /></label>
        ${state.authMode === "signup" ? `<label>Confirm password<input name="confirmPassword" autocomplete="new-password" type="password" placeholder="Type password again" required minlength="8" /></label>` : ""}
        <label class="remember-row"><input name="rememberEmail" type="checkbox" ${state.rememberEmail ? "checked" : ""} /> Remember this email on this device</label>
        <small class="auth-hint">Nakaru-San remembers your secure Supabase session and saved email. Passwords are handled by Supabase and your browser password manager, not stored by this website.</small>
        <button class="primary-action" ${state.authLoading ? "disabled" : ""} type="submit">${state.authLoading ? "Working..." : state.authMode === "signup" ? "Create Account" : "Log In"}</button>
      </form>
      ${enabledOauth.length ? `<div class="oauth-row social-grid">${enabledOauth.map((item) => `<button onclick="social('${item.provider}')" ${state.socialLoading ? "disabled" : ""} type="button">${escapeHtml(state.socialLoading === item.provider ? "Connecting..." : item.label)}</button>`).join("")}</div>` : ""}
      ${state.authStatus ? `<p class="status-text">${escapeHtml(state.authStatus)}</p>` : ""}
    </section>
  `;
}

function profileCard(editing = false) {
  return `
    <section class="profile-card panel">
      <div class="profile-banner" ${state.profile.banner_url ? `style="background-image:url('${escapeHtml(state.profile.banner_url)}')"` : ""}>${avatar(state.profile, "large")}</div>
      <div class="profile-head">
        <div><span class="eyebrow">${state.user ? "Your profile" : "Public profile"}</span><h2>${escapeHtml(state.profile.display_name || state.profile.username)}</h2><p>${escapeHtml(state.profile.bio || "")}</p></div>
        ${state.user && !editing ? `<button class="ghost-action" onclick="state.profileEditing=true; setPage('edit-profile')" type="button">Edit Profile</button>` : ""}
      </div>
      ${editing ? `
        <div class="edit-profile-grid">
          <label>Display name<input value="${escapeHtml(state.profile.display_name || "")}" oninput="updateProfile('display_name', this.value)" /></label>
          <label>Username<input value="${escapeHtml(state.profile.username || "")}" oninput="updateProfile('username', this.value)" /></label>
          <label class="wide">Bio/About<textarea rows="4" oninput="updateProfile('bio', this.value)">${escapeHtml(state.profile.bio || "")}</textarea></label>
          <label class="file-button">Change profile picture<input type="file" accept="image/*" onchange="setProfileImage('avatar_url', this)" /></label>
          <label class="file-button">Change banner<input type="file" accept="image/*" onchange="setProfileImage('banner_url', this)" /></label>
          <div class="profile-save-row wide">
            <button class="primary-action" data-profile-save ${!state.profileDirty || state.profileSaving ? "disabled" : ""} onclick="saveProfile()" type="button">${state.profileSaving ? "Saving..." : "Save Profile"}</button>
            <span class="muted" data-profile-status>${state.profileDirty ? "" : "Make a change to enable saving."}</span>
            <button class="ghost-action" onclick="cancelProfile()" type="button">Cancel</button>
          </div>
        </div>
      ` : ""}
      ${state.profileStatus ? `<p class="status-text success">${escapeHtml(state.profileStatus)}</p>` : ""}
    </section>
  `;
}

function publicProfileView(profile = {}) {
  if (!profile.id) {
    return `
      <main class="page-grid">
        <section class="panel">
          <div class="panel-title"><span class="eyebrow">Member profile</span><h2>Profile not found</h2></div>
          <p class="empty-state">${escapeHtml(state.publicProfileStatus || "This member profile could not be found yet.")}</p>
          <div class="hero-actions"><button class="ghost-action" onclick="setPage('search')" type="button">Back to Search</button></div>
        </section>
      </main>
    `;
  }
  const posts = state.posts.filter((post) => post.user_id === profile.id);
  const isSelf = profile.id === state.user?.id;
  return `
    <main class="content-layout">
      <section class="profile-card panel">
        <div class="profile-banner" ${profile.banner_url ? `style="background-image:url('${escapeHtml(profile.banner_url)}')"` : ""}>${avatar(profile, "large")}</div>
        <div class="profile-head">
          <div>
            <span class="eyebrow">${isSelf ? "Your public profile" : "Member profile"}</span>
            <h2>${escapeHtml(profile.display_name || profile.username || "Nakaru Member")}</h2>
            <p>@${escapeHtml(profile.username || "member")}</p>
            <p>${escapeHtml(profile.bio || "Anime and gaming fan on Nakaru-San.")}</p>
          </div>
          <div class="user-card-actions">${actionForProfile(profile)}</div>
        </div>
        ${state.publicProfileStatus ? `<p class="status-text">${escapeHtml(state.publicProfileStatus)}</p>` : ""}
        ${state.socialStatus ? `<p class="status-text">${escapeHtml(state.socialStatus)}</p>` : ""}
      </section>
      <section class="panel">
        <div class="panel-title"><span class="eyebrow">Member feed</span><h2>Posts by ${escapeHtml(profile.display_name || profile.username || "this member")}</h2></div>
        <div class="feed-list">${posts.length ? posts.map(renderPost).join("") : `<p class="empty-state">No public posts yet.</p>`}</div>
      </section>
    </main>
  `;
}

function renderAboutSection() {
  const cards = [
    ["Anime & Manga Forums", "Share theories, reviews, reactions, debates, and favorite moments."],
    ["Gaming Community", "Talk games, builds, updates, battles, clips, and gaming culture."],
    ["Go Live & Connect", "Start live rooms, hang out with friends, and connect face-to-face."],
    ["Blog Your Thoughts", "Post your feelings, opinions, stories, reviews, and creative ideas."]
  ];
  return `
    <section class="about-section panel" id="about">
      <div class="about-glow" aria-hidden="true"></div>
      <div class="about-copy">
        <span class="eyebrow">About Nakaru-San</span>
        <h2>Anime, gaming, friendship, and fandom under one roof.</h2>
        <p>Nakaru-San is more than a website. It is a community built for anime lovers, gamers, creators, streamers, and fans who want a place to belong. Whether you are posting your latest anime theory, reacting to a new episode, debating your favorite game, sharing your thoughts in a blog post, or going live with the community, Nakaru-San gives you a space to be heard.</p>
        <p>Here, fans can connect through posts, forums, private messages, voice calls, video calls, live rooms, and real conversations. It is a place where anime culture, gaming culture, friendship, creativity, and fandom all come together.</p>
        <p>Nakaru-San was created to give people a home where they can express themselves, meet others who love the same worlds they love, and build a community that feels alive.</p>
        <div class="hero-actions"><button class="primary-action" onclick="setPage('${state.user ? "feed" : "edit-profile"}')" type="button">${state.user ? "Start Posting" : "Join the Community"}</button><button class="ghost-action" onclick="setPage('public-rooms')" type="button">Explore Chatrooms</button></div>
      </div>
      <div class="about-card-grid">
        ${cards.map(([title, description]) => `<article class="about-card"><span aria-hidden="true">◆</span><h3>${escapeHtml(title)}</h3><p>${escapeHtml(description)}</p></article>`).join("")}
      </div>
    </section>
  `;
}

function renderChatLine(message = {}) {
  const messageProfile = profileById(message.user_id);
  const profile = messageProfile.id ? messageProfile : { display_name: message.author || "Nakaru Member" };
  return `
    <div class="chat-line">
      ${profileIdentityButton(profile)}
      <div>
        ${messageBody(message) ? `<p>${escapeHtml(messageBody(message))}</p>` : ""}
        ${renderMessageMedia(message)}
      </div>
    </div>
  `;
}

function renderDmBubble(message = {}) {
  const mine = message.sender_id === state.user?.id || message.fromMe;
  return `
    <div class="bubble ${mine ? "mine" : ""}">
      ${messageBody(message) ? `<p>${escapeHtml(messageBody(message))}</p>` : ""}
      ${renderMessageMedia(message)}
    </div>
  `;
}

function liveRoomCard(room = {}) {
  const host = profileById(room.host_id);
  const isHost = room.host_id === state.user?.id;
  return `
    <article class="room-card live-room-card">
      <div>
        <h3>${escapeHtml(room.room_name || "Nakaru Live Room")}</h3>
        <p>Hosted by ${host.id ? `<button class="inline-profile-link" onclick="openUserProfile('${host.id}')" type="button">${escapeHtml(profileName(host))}</button>` : escapeHtml(profileName(host))}</p>
        <span>${isHost ? "Your live room" : "Open live room"} · ${formatTime(room.created_at)}</span>
      </div>
      <div class="user-card-actions">
        <button class="primary-action" ${state.liveRoomJoining === room.id ? "disabled" : ""} onclick="joinLiveRoom('${room.id}', 'video')" type="button">${state.liveRoomJoining === room.id ? "Joining..." : "Join Video"}</button>
        <button class="ghost-action" ${state.liveRoomJoining === room.id ? "disabled" : ""} onclick="joinLiveRoom('${room.id}', 'audio')" type="button">Join Audio</button>
        ${isHost ? `<button class="ghost-action" onclick="endLiveRoom('${room.id}')" type="button">End Room</button>` : ""}
      </div>
    </article>
  `;
}

function renderPage() {
  const profilePosts = state.posts.filter((post) => post.user_id === state.user?.id);
  const activeThread = state.threads.find((thread) => thread.id === state.activeThread) || state.threads[0];
  const activeRoom = rooms.find((room) => room.id === state.activeRoom) || rooms[0];
  if (state.page === "feed") return `
    <main class="content-layout">
      <section class="panel">
        <div class="panel-title inline"><div><span class="eyebrow">Public live feed</span><h2>Anime and gaming posts</h2></div><button class="primary-action" onclick="setPage('video')" type="button">Post Video</button></div>
        <form class="composer" onsubmit="createTextPost(event)">${avatar(state.profile)}<input placeholder="Share an anime theory, gaming update, or watch-party plan" /><button class="primary-action" type="submit">Post</button></form>
        ${state.postStatus ? `<p class="status-text">${escapeHtml(state.postStatus)}</p>` : ""}
        <div class="feed-list">${state.posts.map(renderPost).join("")}</div>
      </section>
      <aside class="panel sidebar-panel"><h3>Search</h3><label class="search-box"><input placeholder="Search users or posts" /></label><h3>Suggested members</h3><div class="mini-user">${avatar({ display_name: "Ami Arc" })}<div><strong>Ami Arc</strong><span>@AmiArc</span></div></div><div class="mini-user">${avatar({ display_name: "Nova Ink" })}<div><strong>Nova Ink</strong><span>@NovaInk</span></div></div></aside>
    </main>
  `;
  if (state.page === "public-rooms") return `
    <main class="content-layout">
      <section class="panel">
        <div class="panel-title"><span class="eyebrow">Public chatrooms</span><h2>${escapeHtml(activeRoom.name)} Room</h2></div>
        <div class="room-tabs">${rooms.map((room) => `<button class="${room.id === state.activeRoom ? "active" : ""}" onclick="state.activeRoom='${room.id}'; loadRoomMessages('${room.id}').finally(render)" type="button">${escapeHtml(room.name)}</button>`).join("")}</div>
        <div class="chat-window">${(state.roomMessages[state.activeRoom] || []).map(renderChatLine).join("")}</div>
        <form class="message-form media-message-form" onsubmit="sendRoomMessage(event)"><input placeholder="Message ${escapeHtml(activeRoom.name)}" /><label class="attach-button">Media<input type="file" accept="image/*,video/*" /></label><button class="primary-action" type="submit">Send</button></form>
        ${state.roomStatus ? `<p class="status-text">${escapeHtml(state.roomStatus)}</p>` : ""}
      </section>
      <aside class="panel sidebar-panel"><h3>Room topic</h3><p>${escapeHtml(activeRoom.topic)}</p></aside>
    </main>
  `;
  if (state.page === "profile") return `<main class="content-layout">${profileCard(false)}<section class="panel"><div class="panel-title"><span class="eyebrow">Profile feed</span><h2>Posts by ${escapeHtml(state.profile.display_name || state.profile.username)}</h2></div><div class="feed-list">${profilePosts.length ? profilePosts.map(renderPost).join("") : `<p class="empty-state">No posts yet.</p>`}</div></section></main>`;
  if (state.page === "public-profile") return publicProfileView(profileById(state.publicProfileId));
  if (state.page === "edit-profile") return `<main class="page-grid">${state.user ? profileCard(state.profileEditing) : authView()}</main>`;
  if (state.page === "search") return `
    <main class="content-layout">
      <section class="panel">
        <div class="panel-title"><span class="eyebrow">Search users</span><h2>Find members and start messages</h2></div>
        <form class="form-grid compact-form" onsubmit="searchUsers(event)">
          <label>Username or display name<input name="search" value="${escapeHtml(state.socialSearch)}" placeholder="Search Nakaru-San users" /></label>
          <button class="primary-action" type="submit">Search Users</button>
        </form>
        ${state.searchStatus ? `<p class="status-text">${escapeHtml(state.searchStatus)}</p>` : ""}
        ${state.socialStatus ? `<p class="status-text">${escapeHtml(state.socialStatus)}</p>` : ""}
        <div class="user-card-list">${state.searchResults.length ? state.searchResults.map((profile) => userCard(profile)).join("") : `<p class="empty-state">Search a username or display name to find people to message.</p>`}</div>
      </section>
      <aside class="panel sidebar-panel">
        <div class="panel-title"><span class="eyebrow">Reference search</span><h2>Anime images and videos</h2></div>
        <p class="muted">These buttons open public Google Images or YouTube search results in a new tab. Nakaru-San does not copy or host those reference images.</p>
        <div class="reference-actions">
          <button class="ghost-action" onclick="openReferenceSearch('images')" type="button">Open Google Images</button>
          <button class="ghost-action" onclick="openReferenceSearch('youtube')" type="button">Open YouTube Search</button>
        </div>
      </aside>
    </main>
  `;
  if (state.page === "video") return `
    <main class="video-post-layout">
      <section class="panel video-post-panel"><div class="panel-title"><span class="eyebrow">Video link post</span><h2>Post a YouTube link</h2></div>
        ${state.videoComposerOpen ? `<form class="form-grid" onsubmit="postYouTube(event)"><label>YouTube URL<input placeholder="https://www.youtube.com/watch?v=..." /></label><button class="primary-action" ${state.videoPosting ? "disabled" : ""} type="submit">${state.videoPosting ? "Posting..." : "Post Video Link"}</button></form>` : renderVideoOnly(state.lastVideoPost)}
        ${state.youtubeStatus ? `<p class="status-text">${escapeHtml(state.youtubeStatus)}</p>` : ""}
      </section>
      <section class="panel video-post-panel"><div class="panel-title"><span class="eyebrow">Device video post</span><h2>Upload a video from your device</h2></div>
        ${state.deviceVideoComposerOpen ? `<form class="form-grid" onsubmit="postDeviceVideo(event)"><label class="file-button wide">Choose Video<input type="file" accept="video/*" /></label><small class="auth-hint">Upload original clips, reactions, edits, gameplay moments, and community videos up to 120 MB.</small><button class="primary-action" ${state.deviceVideoPosting ? "disabled" : ""} type="submit">${state.deviceVideoPosting ? "Uploading..." : "Upload Video"}</button></form>` : renderVideoOnly(state.lastDeviceVideoPost)}
        ${state.deviceVideoStatus ? `<p class="status-text">${escapeHtml(state.deviceVideoStatus)}</p>` : ""}
      </section>
    </main>
  `;
  if (state.page === "golive" || state.page === "live") {
    const liveRooms = state.liveRoomSearch ? state.liveRoomSearchResults : state.liveRooms;
    const pendingInvites = state.liveRoomInvites.filter((invite) => invite.receiver_id === state.user?.id && invite.status === "pending");
    return `
      <main class="content-layout">
        <section class="panel live-panel">
          <div class="panel-title"><span class="eyebrow">GoLive</span><h2>Searchable live rooms</h2></div>
          <form class="form-grid compact-form" onsubmit="createLiveRoom(event)">
            <label>Live room name<input name="roomName" value="${escapeHtml(state.activeLiveRoom?.room_name || state.callRoom)}" oninput="state.callRoom=this.value" placeholder="Nakaru Lounge" /></label>
            <button class="primary-action" ${state.liveRoomCreating ? "disabled" : ""} type="submit">${state.liveRoomCreating ? "Creating..." : "Create Searchable Live Room"}</button>
          </form>
          <form class="form-grid compact-form" onsubmit="searchLiveRooms(event)">
            <label>Search live rooms<input name="liveRoomSearch" value="${escapeHtml(state.liveRoomSearch)}" placeholder="Search by room or host" /></label>
            <button class="ghost-action" type="submit">Search Rooms</button>
          </form>
          <div class="live-grid">
            <div class="live-stage">${state.stream ? `<video id="live-video" autoplay muted playsinline></video>` : `<div><strong>Your camera preview appears here.</strong><span>Create or join a room to connect over Wi-Fi, phone data, or any internet connection.</span></div>`}</div>
            <div class="live-stage remote-stage">${state.remoteStream ? `<video id="remote-video" autoplay playsinline></video>` : `<div><strong>Remote user</strong><span>The other user appears here after joining the same live room.</span></div>`}</div>
          </div>
          <div class="hero-actions">
            <button class="primary-action" ${state.callStarting ? "disabled" : ""} onclick="startCall('video')" type="button">Go Live Video</button>
            <button class="ghost-action" ${state.callStarting ? "disabled" : ""} onclick="startCall('audio')" type="button">Go Live Audio</button>
            <button class="ghost-action" ${state.callStarting ? "disabled" : ""} onclick="joinCall('video')" type="button">Join Current Video</button>
            <button class="ghost-action" ${state.callStarting ? "disabled" : ""} onclick="joinCall('audio')" type="button">Join Current Audio</button>
            <button class="ghost-action" onclick="endLiveRoom()" type="button">End Live</button>
          </div>
          ${state.callStatus ? `<p class="status-text">${escapeHtml(state.callStatus)}</p>` : ""}
          ${state.liveRoomStatus ? `<p class="status-text">${escapeHtml(state.liveRoomStatus)}</p>` : ""}
        </section>
        <aside class="panel sidebar-panel">
          <div class="panel-title"><span class="eyebrow">Live directory</span><h2>Rooms users can search</h2></div>
          <div class="user-card-list">${liveRooms.length ? liveRooms.map(liveRoomCard).join("") : `<p class="empty-state">No live rooms found yet.</p>`}</div>
          <div class="panel-title"><span class="eyebrow">Invite friends</span><h2>Bring people in</h2></div>
          <div class="user-card-list">${state.friends.length ? state.friends.map((friend) => userCard(friend, `<button class="primary-action" onclick="inviteFriendToLiveRoom('${friend.id}')" type="button">Invite to Live</button>`)).join("") : `<p class="empty-state">Accepted friends will appear here for live room invites.</p>`}</div>
          <div class="panel-title"><span class="eyebrow">Invites</span><h2>Incoming live invites</h2></div>
          <div class="user-card-list">${pendingInvites.length ? pendingInvites.map((invite) => {
            const sender = profileById(invite.sender_id);
            return userCard(sender, `<button class="primary-action" onclick="acceptLiveInvite('${invite.id}')" type="button">Join</button><button class="ghost-action" onclick="declineLiveInvite('${invite.id}')" type="button">Decline</button>`);
          }).join("") : `<p class="empty-state">No live invites right now.</p>`}</div>
        </aside>
      </main>
    `;
  }
  if (state.page === "friend-requests") {
    const incomingPending = state.incomingRequests.filter((request) => request.status === "pending");
    const outgoingPending = state.outgoingRequests.filter((request) => request.status === "pending");
    return `
      <main class="content-layout">
        <section class="panel">
          <div class="panel-title"><span class="eyebrow">Friend requests</span><h2>Incoming requests</h2></div>
          <div class="user-card-list">${incomingPending.length ? incomingPending.map((request) => {
            const profile = state.publicProfiles.find((item) => item.id === request.sender_id) || { id: request.sender_id, username: "member", display_name: "Nakaru Member" };
            return userCard(profile, `<button class="primary-action" onclick="respondFriendRequest('${request.id}', 'accepted')" type="button">Accept</button><button class="ghost-action" onclick="respondFriendRequest('${request.id}', 'declined')" type="button">Decline</button>`);
          }).join("") : `<p class="empty-state">No incoming friend requests yet.</p>`}</div>
          ${state.socialStatus ? `<p class="status-text">${escapeHtml(state.socialStatus)}</p>` : ""}
        </section>
        <aside class="panel sidebar-panel">
          <div class="panel-title"><span class="eyebrow">Pending</span><h2>Sent requests</h2></div>
          <div class="user-card-list">${outgoingPending.length ? outgoingPending.map((request) => {
            const profile = state.publicProfiles.find((item) => item.id === request.receiver_id) || { id: request.receiver_id, username: "member", display_name: "Nakaru Member" };
            return userCard(profile, `<button class="ghost-action" type="button" disabled>Pending</button>`);
          }).join("") : `<p class="empty-state">No outgoing requests.</p>`}</div>
        </aside>
      </main>
    `;
  }
  if (state.page === "calls") {
    const ringingCalls = state.calls.filter((call) => call.status === "ringing");
    return `
      <main class="content-layout">
        <section class="panel live-panel">
          <div class="panel-title"><span class="eyebrow">Internet calls</span><h2>Audio and video calls</h2></div>
          <p class="muted">Nakaru-San calls use your internet connection through WebRTC, so they work over Wi-Fi, phone data, or any active browser connection. No phone line is required.</p>
          <div class="live-grid">
            <div class="live-stage">${state.stream ? `<video id="live-video" autoplay muted playsinline></video>` : `<div><strong>Your camera preview appears here.</strong><span>Start or accept a call to connect.</span></div>`}</div>
            <div class="live-stage remote-stage">${state.remoteStream ? `<video id="remote-video" autoplay playsinline></video>` : `<div><strong>Friend video</strong><span>Your friend appears here after they accept and connect.</span></div>`}</div>
          </div>
          <div class="hero-actions">
            <button class="ghost-action" onclick="endActiveCall()" type="button">End Call</button>
          </div>
          ${state.callStatus ? `<p class="status-text">${escapeHtml(state.callStatus)}</p>` : ""}
        </section>
        <aside class="panel sidebar-panel">
          <div class="panel-title"><span class="eyebrow">Friends</span><h2>Start a call</h2></div>
          <div class="user-card-list">${state.friends.length ? state.friends.map((friend) => userCard(friend, `<button class="primary-action" onclick="startFriendCall('${friend.id}', 'video')" type="button">Video Call</button><button class="ghost-action" onclick="startFriendCall('${friend.id}', 'audio')" type="button">Audio Call</button>`)).join("") : `<p class="empty-state">Accept a friend request before starting direct calls.</p>`}</div>
          <div class="panel-title"><span class="eyebrow">Incoming</span><h2>Call requests</h2></div>
          <div class="user-card-list">${ringingCalls.length ? ringingCalls.map((call) => {
            const otherId = call.caller_id === state.user?.id ? call.receiver_id : call.caller_id;
            const other = profileById(otherId);
            const action = call.receiver_id === state.user?.id
              ? `<button class="primary-action" onclick="acceptCall('${call.id}')" type="button">Accept ${escapeHtml(call.call_type)}</button><button class="ghost-action" onclick="declineCall('${call.id}')" type="button">Decline</button>`
              : `<button class="ghost-action" type="button" disabled>Ringing...</button>`;
            return userCard(other, action);
          }).join("") : `<p class="empty-state">No incoming calls right now.</p>`}</div>
        </aside>
      </main>
    `;
  }
  if (state.page === "inbox" || state.page === "messages") {
    const messageTargets = state.publicProfiles.filter((profile) => profile.id !== state.user?.id);
    const activeRecipient = state.publicProfiles.find((profile) => profile.id === state.activeDmRecipient);
    const dmMessages = state.activeDmRecipient ? state.dmMessages : activeThread.messages.map((message) => ({ ...message, sender_id: message.fromMe ? state.user?.id : "demo", recipient_id: state.user?.id, created_at: new Date().toISOString() }));
    return `
      <main class="inbox-layout">
        <section class="panel thread-list">
          <div class="panel-title"><span class="eyebrow">Messaging inbox</span><h2>Direct messages</h2></div>
          ${messageTargets.length ? messageTargets.map((profile) => `<div class="thread ${profile.id === state.activeDmRecipient ? "active" : ""}">${profileIdentityButton(profile)}<button class="ghost-action" onclick="setDmRecipient('${profile.id}')" type="button">Chat</button></div>`).join("") : state.threads.map((thread) => `<button class="thread ${thread.id === state.activeThread ? "active" : ""}" onclick="state.activeThread='${thread.id}'; render()" type="button">${avatar({ display_name: thread.user })}<span><strong>${escapeHtml(thread.user)}</strong><small>${escapeHtml(thread.preview)}</small></span></button>`).join("")}
        </section>
        <section class="panel dm-panel">
          <div class="panel-title"><span class="eyebrow">Conversation</span><h2>${activeRecipient?.id ? `<button class="inline-profile-link" onclick="openUserProfile('${activeRecipient.id}')" type="button">${escapeHtml(activeRecipient.display_name || activeRecipient.username)}</button>` : escapeHtml(activeThread.user)}</h2></div>
          <div class="dm-window">${dmMessages.map(renderDmBubble).join("")}</div>
          <form class="message-form media-message-form" onsubmit="sendDm(event)"><input placeholder="Message ${escapeHtml(activeRecipient?.display_name || activeThread.user)}" /><label class="attach-button">Media<input type="file" accept="image/*,video/*" /></label><button class="primary-action" type="submit">Send</button></form>
          ${state.dmStatus ? `<p class="status-text">${escapeHtml(state.dmStatus)}</p>` : ""}
        </section>
      </main>
    `;
  }
  if (state.page === "private-rooms") {
    const activePrivateRoom = privateRooms.find((room) => room.id === state.activePrivateRoom) || privateRooms[0];
    return `
      <main class="content-layout">
        <section class="panel">
          <div class="panel-title"><span class="eyebrow">Private chatrooms</span><h2>${escapeHtml(activePrivateRoom.name)}</h2></div>
          <div class="room-tabs">${privateRooms.map((room) => `<button class="${room.id === state.activePrivateRoom ? "active" : ""}" onclick="state.activePrivateRoom='${room.id}'; loadRoomMessages('${room.id}').finally(render)" type="button">${escapeHtml(room.name)}</button>`).join("")}</div>
          <div class="chat-window">${(state.roomMessages[state.activePrivateRoom] || []).map(renderChatLine).join("")}</div>
          <form class="message-form media-message-form" onsubmit="sendRoomMessage(event, state.activePrivateRoom, 'privateRoomStatus')"><input placeholder="Message ${escapeHtml(activePrivateRoom.name)}" /><label class="attach-button">Media<input type="file" accept="image/*,video/*" /></label><button class="primary-action" type="submit">Send</button></form>
          ${state.privateRoomStatus ? `<p class="status-text">${escapeHtml(state.privateRoomStatus)}</p>` : ""}
        </section>
        <aside class="panel sidebar-panel"><h3>Invite-only room</h3><p>${escapeHtml(activePrivateRoom.topic)}</p><p class="muted">For now, accepted members can use these rooms. Friend invite controls can be tied to stricter private-room membership next.</p></aside>
      </main>
    `;
  }
  return `
    <main class="page-grid">
      <section class="hero panel"><div><span class="eyebrow">Anime Forum - Gaming Rooms - Live Community</span><h1>Nakaru-San</h1><p>A dark anime-style social platform for watch parties, gaming squads, creators, public chatrooms, private messages, and live video rooms.</p><div class="hero-actions"><button class="primary-action" onclick="setPage('feed')" type="button">Open Live Feed</button><button class="ghost-action" onclick="setPage('public-rooms')" type="button">Join Chatrooms</button><button class="ghost-action" onclick="setPage('golive')" type="button">Go Live</button></div></div><div class="hero-card"><img src="./nakaru-san-logo.png" alt="Nakaru-San logo" /></div></section>
      <section class="stats-row"><span class="stat-pill"><strong>${rooms.length}</strong>Public rooms</span><span class="stat-pill"><strong>${state.posts.length}</strong>Feed posts</span><span class="stat-pill"><strong>${state.threads.length}</strong>DM threads</span><span class="stat-pill"><strong>${state.user ? "Online" : "Demo"}</strong>Account mode</span></section>
      ${renderAboutSection()}
    </main>
  `;
}

function renderKanjiRain() {
  return `
    <div class="kanji-rain" aria-hidden="true">
      ${kanjiRainItems.map(([char, left, duration, delay, tone]) => `<span class="${tone === "gold" ? "gold" : "purple"}" style="--x:${left}%; --duration:${duration}s; --delay:-${delay}s;">${char}</span>`).join("")}
    </div>
  `;
}

function renderLogoSidebar(nav) {
  return `
    <div class="sidebar-scrim ${state.sidebarOpen ? "open" : ""}" onclick="toggleSidebar(false)" aria-hidden="${state.sidebarOpen ? "false" : "true"}"></div>
    <aside class="logo-sidebar ${state.sidebarOpen ? "open" : ""}" aria-label="Nakaru-San menu">
      <div class="sidebar-head">
        <img src="./nakaru-san-logo.png" alt="" />
        <div><span class="eyebrow">Nakaru-San</span><strong>Community Menu</strong></div>
        <button class="sidebar-close" onclick="toggleSidebar(false)" type="button" aria-label="Close menu">×</button>
      </div>
      <p>Jump into the anime forum, gaming rooms, live feed, messages, and the new About Nakaru-San community story.</p>
      <div class="sidebar-links">
        ${nav.map(([id, label]) => `<button class="${state.page === id ? "active" : ""}" onclick="setPage('${id}')" type="button">${label}</button>`).join("")}
        <button onclick="openAboutSection()" type="button">About Nakaru-San</button>
      </div>
      <div class="sidebar-cta">
        <button class="primary-action" onclick="setPage('${state.user ? "feed" : "edit-profile"}')" type="button">${state.user ? "Start Posting" : "Join the Community"}</button>
      </div>
    </aside>
  `;
}

function renderMerchBanner() {
  return `
    <section class="merch-banner" aria-label="Nakaru-San hoodie banner">
      <div class="merch-copy">
        <span class="eyebrow">Nakaru-San gear</span>
        <strong>Anime x gaming x streetwear.</strong>
        <small>Built for the code. Made for the real.</small>
      </div>
      <div class="merch-image">
        <img src="./nakaru-hoodies-banner.png" alt="Nakaru-San hoodie and sweatsuit collection" onload="this.closest('.merch-banner').classList.add('has-merch-image');" onerror="this.closest('.merch-image').classList.add('use-fallback'); this.remove();" />
        <div class="hoodie-fallback" aria-hidden="true">
          <span class="hoodie-card hoodie-one"><b>ä¸­</b></span>
          <span class="hoodie-card hoodie-two"><b>N</b></span>
          <span class="hoodie-card hoodie-three"><b>çµ†</b></span>
        </div>
      </div>
    </section>
  `;
}

function render() {
  window.NAKARU_BOOT_RENDERED = true;
  const warnings = visibleBootWarnings();
  const nav = [
    ["home", "Home"],
    ["feed", "Live Feed"],
    ["public-rooms", "Public Chatrooms"],
    ["private-rooms", "Private Rooms"],
    ["profile", "Profile"],
    ["edit-profile", "Edit Profile"],
    ["video", "Video Post"],
    ["golive", "GoLive"],
    ["messages", "Messaging"],
    ["calls", "Calls"],
    ["friend-requests", "Requests"],
    ["inbox", "Inbox"]
  ];
  document.getElementById("app").innerHTML = `
    <div class="app-shell">
      ${renderKanjiRain()}
      <header class="topbar"><button class="brand" onclick="toggleSidebar()" type="button" aria-label="Open Nakaru-San menu"><img src="./nakaru-san-logo.png" alt="" /><span>Nakaru-San</span></button><nav>${nav.map(([id, label]) => `<button class="${state.page === id || (id === "messages" && state.page === "inbox") ? "active" : ""}" onclick="setPage('${id}')" type="button">${label}</button>`).join("")}</nav><form class="top-search" onsubmit="topSearch(event)"><input name="topSearch" value="${escapeHtml(state.topSearch)}" placeholder="Search users, anime images, YouTube" /><button type="submit">Search</button><button type="button" onclick="openReferenceSearch('images', this.form.topSearch.value)" title="Open Google Images">Images</button><button type="button" onclick="openReferenceSearch('youtube', this.form.topSearch.value)" title="Open YouTube search">YouTube</button></form><div class="account-tools">${state.user ? `<button class="avatar-button" onclick="openUserProfile('${state.user.id}')" type="button" aria-label="Open your profile">${avatar({ id: state.user.id, ...state.profile })}</button><button class="ghost-action" onclick="signOut()" ${state.authLoading ? "disabled" : ""} type="button">${state.authLoading ? "Signing out..." : "Sign out"}</button>` : `<button class="primary-action" onclick="setPage('edit-profile')" type="button">Sign in</button>`}</div></header>
      ${renderLogoSidebar(nav)}
      ${renderMerchBanner()}
      <div class="version-badge">${version}</div>
      ${warnings.length ? `<div class="demo-banner">${escapeHtml(warnings[warnings.length - 1])}</div>` : ""}
      ${(!config.supabaseUrl || !config.supabaseAnonKey) && !warnings.length && !state.user && state.page !== "edit-profile" ? `<div class="demo-banner">Account sign-in needs Supabase config. Public pages are still available.</div>` : ""}
      <div class="page-anchor" data-page-root="${escapeHtml(state.page)}">${renderPage()}</div>
    </div>
  `;
  if (state.stream) {
    attachMediaStreams();
  }
}

window.state = state;
window.setPage = setPage;
window.toggleSidebar = toggleSidebar;
window.openAboutSection = openAboutSection;
window.topSearch = topSearch;
window.openReferenceSearch = openReferenceSearch;
window.openUserProfile = openUserProfile;
window.submitAuth = submitAuth;
window.social = social;
window.updateProfile = updateProfile;
window.setProfileImage = setProfileImage;
window.saveProfile = saveProfile;
window.cancelProfile = cancelProfile;
window.createTextPost = createTextPost;
window.postYouTube = postYouTube;
window.postDeviceVideo = postDeviceVideo;
window.sendRoomMessage = sendRoomMessage;
window.setDmRecipient = setDmRecipient;
window.sendDm = sendDm;
window.searchUsers = searchUsers;
window.sendFriendRequest = sendFriendRequest;
window.respondFriendRequest = respondFriendRequest;
window.messageFriend = messageFriend;
window.startFriendCall = startFriendCall;
window.acceptCall = acceptCall;
window.declineCall = declineCall;
window.endActiveCall = endActiveCall;
window.startCall = startCall;
window.joinCall = joinCall;
window.createLiveRoom = createLiveRoom;
window.searchLiveRooms = searchLiveRooms;
window.joinLiveRoom = joinLiveRoom;
window.endLiveRoom = endLiveRoom;
window.inviteFriendToLiveRoom = inviteFriendToLiveRoom;
window.acceptLiveInvite = acceptLiveInvite;
window.declineLiveInvite = declineLiveInvite;
window.startCamera = startCamera;
window.stopCamera = stopCamera;
window.signOut = signOut;

init();


