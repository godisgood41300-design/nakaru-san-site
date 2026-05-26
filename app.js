const version = "20260526-full-diagnostics-fix";
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
const supabaseRetryLimit = 20;
const rooms = [
  { id: "anime", name: "Anime", topic: "Watch parties, openings, episode talk" },
  { id: "gaming", name: "Gaming", topic: "Co-op queues, builds, raids, ranked" },
  { id: "manga", name: "Manga", topic: "Chapters, panels, collecting, theories" },
  { id: "general", name: "General", topic: "Community lounge and introductions" },
  { id: "nakaru-san", name: "Nakaru-San", topic: "Platform updates and creator rooms" }
];

const kanjiRainItems = [
  ["絆", 4, 18, 0], ["夢", 12, 23, 6], ["光", 20, 17, 12], ["心", 28, 28, 3],
  ["武", 36, 19, 9], ["影", 44, 25, 15], ["魂", 52, 18, 5], ["月", 60, 24, 11],
  ["火", 68, 16, 2], ["空", 76, 27, 8], ["道", 84, 20, 14], ["和", 92, 26, 4],
  ["絆", 8, 31, 17], ["夢", 32, 22, 20], ["光", 57, 29, 22], ["心", 88, 18, 19]
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
  activeRoom: "anime",
  roomText: "",
  roomStatus: "",
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
  dmMessages: readLocal("nakaru-direct-messages", []),
  dmStatus: "",
  publicProfiles: [],
  authMode: "signin",
  authStatus: "",
  authLoading: false,
  rememberedEmail: readLocal("nakaru-remember-email", ""),
  rememberEmail: Boolean(readLocal("nakaru-remember-email", "")),
  stream: null,
  remoteStream: null,
  peer: null,
  callChannel: null,
  callRoom: "nakaru-lounge",
  callMode: "video",
  callStatus: "",
  callStarting: false,
  inCall: false
};
state.savedProfile = { ...state.profile };

let supabaseClient = null;
let supabaseRetryCount = 0;

function validHttpUrl(value) {
  try {
    const parsed = new URL(String(value || ""));
    return parsed.protocol === "https:" || parsed.protocol === "http:";
  } catch {
    return false;
  }
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

async function hashPassword(password) {
  const encoded = new TextEncoder().encode(password);
  const digest = await crypto.subtle.digest("SHA-256", encoded);
  return [...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, "0")).join("");
}

async function init() {
  state.user = readLocal("nakaru-session", null);
  render();

  if (!supabaseClient) {
    scheduleSupabaseRetry();
  }

  if (!supabaseClient) return;

  await initSupabaseSession();
}

async function initSupabaseSession() {
  try {
    const { data, error } = await supabaseClient.auth.getSession();
    if (error) throw error;
    state.user = data.session?.user || state.user;
    supabaseClient.auth.onAuthStateChange((_event, session) => {
      state.user = session?.user || readLocal("nakaru-session", null);
      afterAuthChange();
    });
    await afterAuthChange();
  } catch (error) {
    console.error("Supabase session load failed", error);
    clearStoredSession();
    try {
      await supabaseClient.auth.signOut({ scope: "local" });
    } catch (signOutError) {
      console.warn("Could not clear local Supabase session", signOutError);
    }
    render();
  }
}

async function afterAuthChange() {
  await loadPublicProfiles();
  await loadPosts();
  await loadRoomMessages(state.activeRoom);
  if (state.user) {
    try {
      await loadProfile();
      await loadDirectMessages();
    } catch (error) {
      console.error("Data load failed", error);
      bootWarnings.push("Some account data could not load. The public app is still available.");
    }
  }
  render();
}

async function loadProfile() {
  if (!state.user) return;
  if (supabaseClient) {
    let { data, error } = await supabaseClient.from("profiles").select(profileSelectColumns(true)).eq("id", state.user.id).maybeSingle();
    if (error && isMissingColumnError(error, "banner_url")) {
      ({ data, error } = await supabaseClient.from("profiles").select(profileSelectColumns(false)).eq("id", state.user.id).maybeSingle());
    }
    if (error) console.error("Profile load failed", error);
    state.profile = { id: state.user.id, ...defaultProfileForUser(), ...(data || {}) };
  } else {
    const profiles = readLocal("nakaru-local-profiles", {});
    state.profile = profiles[state.user.id] || { id: state.user.id, ...defaultProfileForUser(state.user) };
  }
  state.savedProfile = { ...state.profile };
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
  const { data, error } = await supabaseClient
    .from("room_messages")
    .select("id,room_id,user_id,author,text,created_at")
    .eq("room_id", roomId)
    .order("created_at", { ascending: true })
    .limit(100);
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
  const query = `and(sender_id.eq.${state.user.id},recipient_id.eq.${state.activeDmRecipient}),and(sender_id.eq.${state.activeDmRecipient},recipient_id.eq.${state.user.id})`;
  const { data, error } = await supabaseClient
    .from("direct_messages")
    .select("id,sender_id,recipient_id,text,created_at")
    .or(query)
    .order("created_at", { ascending: true })
    .limit(100);
  if (error) {
    console.error("Direct message load failed", error);
    state.dmStatus = "Messaging is temporarily unavailable. Please try again soon.";
    return;
  }
  state.dmMessages = data || [];
  state.dmStatus = "";
}

function setPage(page) {
  state.page = page;
  if (page === "edit-profile" && state.user) state.profileEditing = true;
  if (page === "public-rooms") loadRoomMessages(state.activeRoom).finally(render);
  if (page === "inbox") {
    loadPublicProfiles()
      .then(loadDirectMessages)
      .finally(render);
  }
  if (page === "video") {
    state.videoComposerOpen = true;
    state.youtubeStatus = "";
  }
  render();
}

async function submitAuth(event) {
  event.preventDefault();
  if (state.authLoading) return;
  const form = new FormData(event.currentTarget);
  const email = String(form.get("email") || "").trim();
  const password = String(form.get("password") || "");
  const username = cleanUsername(form.get("username") || email, `nakaru_${crypto.randomUUID().slice(0, 6)}`);
  state.rememberEmail = form.get("rememberEmail") === "on";
  if (state.rememberEmail) writeLocal("nakaru-remember-email", email);
  else localStorage.removeItem("nakaru-remember-email");
  state.authStatus = "";
  state.authLoading = true;
  render();

  try {
    if (ensureSupabaseClient()) {
      if (state.authMode === "signup") {
        const { data, error } = await supabaseClient.auth.signUp({
          email,
          password,
          options: {
            data: { username },
            emailRedirectTo: `${window.location.origin}/`
          }
        });
        if (error) throw error;
        if (!data.session) {
          state.authStatus = "Check your email to confirm your account before logging in.";
          render();
          return;
        }
        state.user = data.user;
      } else {
        const { data, error } = await supabaseClient.auth.signInWithPassword({ email, password });
        if (error) throw error;
        state.user = data.user;
      }
    } else {
      const users = readLocal("nakaru-local-users", {});
      if (state.authMode === "signup") {
        if (users[email]) throw new Error("Account already exists.");
        const id = crypto.randomUUID();
        users[email] = { id, email, username: username || email.split("@")[0], passwordHash: await hashPassword(password) };
        writeLocal("nakaru-local-users", users);
        state.user = { id, email, username: users[email].username };
      } else {
        const user = users[email];
        if (!user || user.passwordHash !== await hashPassword(password)) throw new Error("Invalid login.");
        state.user = { id: user.id, email, username: user.username };
      }
      writeLocal("nakaru-session", state.user);
    }
    state.authStatus = "Signed in successfully.";
    await afterAuthChange();
    setPage("profile");
  } catch (error) {
    console.error("Auth failed", error);
    state.authStatus = error.message?.includes("Email not confirmed") ? "Please confirm your email before logging in." : "Could not sign in. Check your information and try again.";
    render();
  } finally {
    state.authLoading = false;
    render();
  }
}

async function social(provider) {
  const option = socialProviders.find((item) => item.provider === provider);
  if (option?.externalUrlKey) {
    const externalUrl = config[option.externalUrlKey];
    if (externalUrl) {
      window.location.href = externalUrl;
      return;
    }
    state.authStatus = "Instagram login needs a custom OAuth setup first.";
    render();
    return;
  }

  if (!ensureSupabaseClient()) {
    state.authStatus = "Social login needs Supabase provider setup first.";
    render();
    return;
  }
  const { error } = await supabaseClient.auth.signInWithOAuth({ provider, options: { redirectTo: redirectUrl() } });
  if (error) {
    console.error("OAuth failed", error);
    state.authStatus = `${option?.label || "Social login"} is not enabled yet.`;
    render();
  }
}

function updateProfile(field, value) {
  state.profile = { ...state.profile, [field]: value };
  state.profileDirty = true;
  state.profileStatus = "";
  render();
}

function fileToDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ""));
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

async function setProfileImage(field, input) {
  const file = input.files?.[0];
  if (!file) return;
  const dataUrl = await fileToDataUrl(file);
  updateProfile(field, dataUrl);
}

async function saveProfile() {
  if (!state.user || !state.profileDirty || state.profileSaving) return;
  state.profileSaving = true;
  state.profileStatus = "";
  render();
  const defaults = defaultProfileForUser(state.user);
  const suffix = String(state.user.id || crypto.randomUUID()).slice(0, 6);
  const row = {
    id: state.user.id,
    username: cleanUsername(state.profile.username || defaults.username, `nakaru_${suffix}`),
    display_name: state.profile.display_name || state.profile.username || defaults.display_name || "Nakaru Member",
    bio: state.profile.bio || "",
    avatar_url: state.profile.avatar_url || "",
    banner_url: state.profile.banner_url || "",
    updated_at: new Date().toISOString()
  };
  if (row.username === "nakaru_member") row.username = `nakaru_${suffix}`;
  try {
    if (supabaseClient) {
      let { error } = await supabaseClient.from("profiles").upsert(row, { onConflict: "id" });
      if (error && isMissingColumnError(error, "banner_url")) {
        const { banner_url, ...rowWithoutBanner } = row;
        ({ error } = await supabaseClient.from("profiles").upsert(rowWithoutBanner, { onConflict: "id" }));
      }
      if (error && String(error.message || "").toLowerCase().includes("duplicate")) {
        row.username = `${row.username}_${suffix}`.slice(0, 31);
        const { banner_url, ...retryRow } = row;
        ({ error } = await supabaseClient.from("profiles").upsert(retryRow, { onConflict: "id" }));
      }
      if (error) throw error;
    } else {
      const profiles = readLocal("nakaru-local-profiles", {});
      profiles[state.user.id] = row;
      writeLocal("nakaru-local-profiles", profiles);
      writeLocal("nakaru-profile", row);
    }
    state.profile = row;
    state.savedProfile = { ...row };
    state.profileDirty = false;
    state.profileEditing = false;
    state.profileStatus = "Profile updated successfully.";
    setPage("profile");
  } catch (error) {
    console.error("Profile save failed", error);
    state.profileStatus = "Profile could not be saved. Please try again soon.";
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

async function sendRoomMessage(event) {
  event.preventDefault();
  const input = event.currentTarget.querySelector("input");
  const text = input.value.trim();
  if (!text) return;
  if (!state.user) {
    state.roomStatus = "Sign in to chat in live rooms.";
    render();
    return;
  }
  const message = {
    id: crypto.randomUUID(),
    room_id: state.activeRoom,
    user_id: state.user.id,
    author: state.profile.display_name || "Nakaru Member",
    text,
    created_at: new Date().toISOString()
  };
  try {
    if (supabaseClient) {
      const { data, error } = await supabaseClient.from("room_messages").insert({
        room_id: message.room_id,
        user_id: message.user_id,
        author: message.author,
        text: message.text
      }).select("id,room_id,user_id,author,text,created_at").single();
      if (error) throw error;
      state.roomMessages[state.activeRoom] = [...(state.roomMessages[state.activeRoom] || []), data];
    } else {
      state.roomMessages[state.activeRoom] = [...(state.roomMessages[state.activeRoom] || []), message];
      writeLocal("nakaru-room-messages", state.roomMessages);
    }
    state.roomStatus = "";
    input.value = "";
  } catch (error) {
    console.error("Room message send failed", error);
    state.roomStatus = "Chat is temporarily unavailable. Please try again soon.";
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
  const text = input.value.trim();
  if (!text) return;
  if (!state.user) {
    state.dmStatus = "Sign in to send direct messages.";
    render();
    return;
  }
  if (state.activeDmRecipient && supabaseClient) {
    try {
      const { data, error } = await supabaseClient
        .from("direct_messages")
        .insert({ sender_id: state.user.id, recipient_id: state.activeDmRecipient, text })
        .select("id,sender_id,recipient_id,text,created_at")
        .single();
      if (error) throw error;
      state.dmMessages = [...state.dmMessages, data];
      input.value = "";
      state.dmStatus = "";
      render();
      return;
    } catch (error) {
      console.error("Direct message send failed", error);
      state.dmStatus = "Messaging is temporarily unavailable. Please try again soon.";
      render();
      return;
    }
  }
  state.threads = state.threads.map((thread) => {
    if (thread.id !== state.activeThread) return thread;
    return { ...thread, preview: text, messages: [...thread.messages, { id: crypto.randomUUID(), fromMe: true, text }] };
  });
  writeLocal("nakaru-dm-threads", state.threads);
  input.value = "";
  render();
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
  if (state.callChannel && supabaseClient) await supabaseClient.removeChannel(state.callChannel);
  state.stream = null;
  state.remoteStream = null;
  state.peer = null;
  state.callChannel = null;
  state.inCall = false;
  if (shouldRender) state.callStatus = "Call ended.";
  if (shouldRender) render();
}

async function signOut() {
  await stopCamera(false);
  if (supabaseClient) await supabaseClient.auth.signOut();
  localStorage.removeItem("nakaru-session");
  state.user = null;
  state.profileEditing = false;
  setPage("home");
}

function renderPost(post) {
  const postType = post.post_type || post.type || "text";
  return `
    <article class="post-card">
      <div class="post-head">${avatar({ display_name: post.author })}<div><strong>${escapeHtml(post.author || "Nakaru Member")}</strong><span>${formatTime(post.created_at)}</span></div></div>
      <p>${escapeHtml(post.content || "")}</p>
      ${postType === "youtube" && post.youtube_embed_url ? `<div class="video-frame"><iframe src="${escapeHtml(post.youtube_embed_url)}" title="Nakaru-San YouTube post" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" allowfullscreen></iframe></div>` : ""}
      <div class="post-actions"><button type="button">${post.likes || 0} Likes</button><button type="button">${post.comments_count || post.comments || 0} Comments</button><button type="button">Reply</button></div>
    </article>
  `;
}

function renderVideoOnly(post) {
  if (!post?.youtube_embed_url) {
    return `<p class="empty-state">Video posted. Open the live feed to view it.</p>`;
  }
  return `<div class="posted-video-only"><div class="video-frame"><iframe src="${escapeHtml(post.youtube_embed_url)}" title="Posted Nakaru-San YouTube video" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" allowfullscreen></iframe></div></div>`;
}

function authView() {
  return `
    <section class="auth-card panel">
      <div class="panel-title"><span class="eyebrow">Account</span><h2>${state.authMode === "signup" ? "Create your Nakaru-San account" : "Welcome back"}</h2></div>
      <div class="segmented">
        <button class="${state.authMode === "signin" ? "active" : ""}" onclick="state.authMode='signin'; render()" type="button">Sign in</button>
        <button class="${state.authMode === "signup" ? "active" : ""}" onclick="state.authMode='signup'; render()" type="button">Sign up</button>
      </div>
      <form class="form-grid" onsubmit="submitAuth(event)">
        ${state.authMode === "signup" ? `<label>Username<input name="username" autocomplete="username" placeholder="nakaru_fan" /></label>` : ""}
        <label>Email<input name="email" autocomplete="email" type="email" value="${escapeHtml(state.rememberedEmail)}" placeholder="you@example.com" required /></label>
        <label>Password<input name="password" autocomplete="${state.authMode === "signup" ? "new-password" : "current-password"}" type="password" placeholder="8+ characters" required minlength="8" /></label>
        <label class="remember-row"><input name="rememberEmail" type="checkbox" ${state.rememberEmail ? "checked" : ""} /> Remember this email on this device</label>
        <small class="auth-hint">Nakaru-San keeps your sign-in session and remembered email. Your browser can save the password securely.</small>
        <button class="primary-action" ${state.authLoading ? "disabled" : ""} type="submit">${state.authLoading ? "Working..." : state.authMode === "signup" ? "Create account" : "Sign in"}</button>
      </form>
      <div class="oauth-row social-grid">${socialProviders.map((item) => `<button onclick="social('${item.provider}')" type="button">${escapeHtml(item.label)}</button>`).join("")}</div>
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
            ${state.profileDirty ? `<button class="primary-action" ${state.profileSaving ? "disabled" : ""} onclick="saveProfile()" type="button">${state.profileSaving ? "Saving..." : "Save Profile"}</button>` : `<span class="muted">Make a change to enable saving.</span>`}
            <button class="ghost-action" onclick="cancelProfile()" type="button">Cancel</button>
          </div>
        </div>
      ` : ""}
      ${state.profileStatus ? `<p class="status-text success">${escapeHtml(state.profileStatus)}</p>` : ""}
    </section>
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
        <div class="chat-window">${(state.roomMessages[state.activeRoom] || []).map((message) => `<div class="chat-line">${avatar({ display_name: message.author })}<div><strong>${escapeHtml(message.author)}</strong><p>${escapeHtml(message.text)}</p></div></div>`).join("")}</div>
        <form class="message-form" onsubmit="sendRoomMessage(event)"><input placeholder="Message ${escapeHtml(activeRoom.name)}" /><button class="primary-action" type="submit">Send</button></form>
        ${state.roomStatus ? `<p class="status-text">${escapeHtml(state.roomStatus)}</p>` : ""}
      </section>
      <aside class="panel sidebar-panel"><h3>Room topic</h3><p>${escapeHtml(activeRoom.topic)}</p></aside>
    </main>
  `;
  if (state.page === "profile") return `<main class="content-layout">${profileCard(false)}<section class="panel"><div class="panel-title"><span class="eyebrow">Profile feed</span><h2>Posts by ${escapeHtml(state.profile.display_name || state.profile.username)}</h2></div><div class="feed-list">${profilePosts.length ? profilePosts.map(renderPost).join("") : `<p class="empty-state">No posts yet.</p>`}</div></section></main>`;
  if (state.page === "edit-profile") return `<main class="page-grid">${state.user ? profileCard(state.profileEditing) : authView()}</main>`;
  if (state.page === "video") return `
    <main class="page-grid"><section class="panel video-post-panel"><div class="panel-title"><span class="eyebrow">Video link post</span><h2>Post a YouTube link</h2></div>
      ${state.videoComposerOpen ? `<form class="form-grid" onsubmit="postYouTube(event)"><label>YouTube URL<input placeholder="https://www.youtube.com/watch?v=..." /></label><button class="primary-action" ${state.videoPosting ? "disabled" : ""} type="submit">${state.videoPosting ? "Posting..." : "Post Video Link"}</button></form>` : renderVideoOnly(state.lastVideoPost)}
      ${state.youtubeStatus ? `<p class="status-text">${escapeHtml(state.youtubeStatus)}</p>` : ""}
    </section></main>
  `;
  if (state.page === "golive") return `
    <main class="content-layout">
      <section class="panel live-panel">
        <div class="panel-title"><span class="eyebrow">GoLive</span><h2>Livestream and call room</h2></div>
        <label class="call-room-label">Room name<input value="${escapeHtml(state.callRoom)}" oninput="state.callRoom=this.value" placeholder="nakaru-lounge" /></label>
        <div class="live-grid">
          <div class="live-stage">${state.stream ? `<video id="live-video" autoplay muted playsinline></video>` : `<div><strong>Your camera preview appears here.</strong><span>Start or join a room to connect over Wi-Fi/WebRTC.</span></div>`}</div>
          <div class="live-stage remote-stage">${state.remoteStream ? `<video id="remote-video" autoplay playsinline></video>` : `<div><strong>Remote user</strong><span>The other user appears here after joining the same room.</span></div>`}</div>
        </div>
        <div class="hero-actions">
          <button class="primary-action" ${state.callStarting ? "disabled" : ""} onclick="startCall('video')" type="button">Start Video Call</button>
          <button class="ghost-action" ${state.callStarting ? "disabled" : ""} onclick="joinCall('video')" type="button">Join Video Call</button>
          <button class="ghost-action" ${state.callStarting ? "disabled" : ""} onclick="startCall('audio')" type="button">Start Audio Call</button>
          <button class="ghost-action" ${state.callStarting ? "disabled" : ""} onclick="joinCall('audio')" type="button">Join Audio Call</button>
          <button class="ghost-action" onclick="stopCamera()" type="button">End Call</button>
        </div>
        ${state.callStatus ? `<p class="status-text">${escapeHtml(state.callStatus)}</p>` : ""}
      </section>
      <section class="panel"><div class="panel-title"><span class="eyebrow">How calls work</span><h2>Same room, two users</h2></div><p class="muted">One person starts a call, the other joins the exact same room name. Supabase Realtime carries the WebRTC connection setup; the audio/video travels browser-to-browser.</p></section>
    </main>
  `;
  if (state.page === "inbox") {
    const messageTargets = state.publicProfiles.filter((profile) => profile.id !== state.user?.id);
    const activeRecipient = state.publicProfiles.find((profile) => profile.id === state.activeDmRecipient);
    const dmMessages = state.activeDmRecipient ? state.dmMessages : activeThread.messages.map((message) => ({ ...message, sender_id: message.fromMe ? state.user?.id : "demo", recipient_id: state.user?.id, created_at: new Date().toISOString() }));
    return `
      <main class="inbox-layout">
        <section class="panel thread-list">
          <div class="panel-title"><span class="eyebrow">Messaging inbox</span><h2>Direct messages</h2></div>
          ${messageTargets.length ? messageTargets.map((profile) => `<button class="thread ${profile.id === state.activeDmRecipient ? "active" : ""}" onclick="setDmRecipient('${profile.id}')" type="button">${avatar(profile)}<span><strong>${escapeHtml(profile.display_name || profile.username)}</strong><small>@${escapeHtml(profile.username || "member")}</small></span></button>`).join("") : state.threads.map((thread) => `<button class="thread ${thread.id === state.activeThread ? "active" : ""}" onclick="state.activeThread='${thread.id}'; render()" type="button">${avatar({ display_name: thread.user })}<span><strong>${escapeHtml(thread.user)}</strong><small>${escapeHtml(thread.preview)}</small></span></button>`).join("")}
        </section>
        <section class="panel dm-panel">
          <div class="panel-title"><span class="eyebrow">Conversation</span><h2>${escapeHtml(activeRecipient?.display_name || activeRecipient?.username || activeThread.user)}</h2></div>
          <div class="dm-window">${dmMessages.map((message) => `<p class="bubble ${message.sender_id === state.user?.id || message.fromMe ? "mine" : ""}">${escapeHtml(message.text)}</p>`).join("")}</div>
          <form class="message-form" onsubmit="sendDm(event)"><input placeholder="Message ${escapeHtml(activeRecipient?.display_name || activeThread.user)}" /><button class="primary-action" type="submit">Send</button></form>
          ${state.dmStatus ? `<p class="status-text">${escapeHtml(state.dmStatus)}</p>` : ""}
        </section>
      </main>
    `;
  }
  if (state.page === "private-rooms") return `<main class="page-grid"><section class="panel"><div class="panel-title"><span class="eyebrow">Private chatrooms</span><h2>Invite-only rooms</h2></div><div class="card-grid"><article class="room-card"><h3>Crew Night</h3><p>Invite-only watch list planning.</p><span>4 members</span><button class="ghost-action" type="button">Request Invite</button></article><article class="room-card"><h3>Raid Party</h3><p>Private gaming voice room.</p><span>6 members</span><button class="ghost-action" type="button">Request Invite</button></article></div></section></main>`;
  return `
    <main class="page-grid">
      <section class="hero panel"><div><span class="eyebrow">Anime Forum - Gaming Rooms - Live Community</span><h1>Nakaru-San</h1><p>A dark anime-style social platform for watch parties, gaming squads, creators, public chatrooms, private messages, and live video rooms.</p><div class="hero-actions"><button class="primary-action" onclick="setPage('feed')" type="button">Open Live Feed</button><button class="ghost-action" onclick="setPage('public-rooms')" type="button">Join Chatrooms</button><button class="ghost-action" onclick="setPage('golive')" type="button">Go Live</button></div></div><div class="hero-card"><img src="./nakaru-san-logo.png" alt="Nakaru-San logo" /></div></section>
      <section class="stats-row"><span class="stat-pill"><strong>${rooms.length}</strong>Public rooms</span><span class="stat-pill"><strong>${state.posts.length}</strong>Feed posts</span><span class="stat-pill"><strong>${state.threads.length}</strong>DM threads</span><span class="stat-pill"><strong>${state.user ? "Online" : "Demo"}</strong>Account mode</span></section>
    </main>
  `;
}

function renderKanjiRain() {
  return `
    <div class="kanji-rain" aria-hidden="true">
      ${kanjiRainItems.map(([char, left, duration, delay]) => `<span style="--x:${left}%; --duration:${duration}s; --delay:-${delay}s;">${char}</span>`).join("")}
    </div>
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
  const nav = [
    ["home", "Home"],
    ["feed", "Live Feed"],
    ["public-rooms", "Public Chatrooms"],
    ["private-rooms", "Private Rooms"],
    ["profile", "Profile"],
    ["edit-profile", "Edit Profile"],
    ["video", "Video Post"],
    ["golive", "GoLive"],
    ["inbox", "Inbox"]
  ];
  document.getElementById("app").innerHTML = `
    <div class="app-shell">
      ${renderKanjiRain()}
      <header class="topbar"><button class="brand" onclick="setPage('home')" type="button"><img src="./nakaru-san-logo.png" alt="" /><span>Nakaru-San</span></button><nav>${nav.map(([id, label]) => `<button class="${state.page === id ? "active" : ""}" onclick="setPage('${id}')" type="button">${label}</button>`).join("")}</nav><div class="account-tools">${state.user ? `${avatar(state.profile)}<button class="ghost-action" onclick="signOut()" type="button">Sign out</button>` : `<button class="primary-action" onclick="setPage('edit-profile')" type="button">Sign in</button>`}</div></header>
      ${renderMerchBanner()}
      <div class="version-badge">${version}</div>
      ${bootWarnings.length ? `<div class="demo-banner">${escapeHtml(bootWarnings[bootWarnings.length - 1])}</div>` : ""}
      ${(!config.supabaseUrl || !config.supabaseAnonKey) && !bootWarnings.length && !state.user && state.page !== "edit-profile" ? `<div class="demo-banner">Demo mode is active until Supabase config is added. The UI still works locally with saved browser data.</div>` : ""}
      ${renderPage()}
    </div>
  `;
  if (state.stream) {
    attachMediaStreams();
  }
}

window.state = state;
window.setPage = setPage;
window.submitAuth = submitAuth;
window.social = social;
window.updateProfile = updateProfile;
window.setProfileImage = setProfileImage;
window.saveProfile = saveProfile;
window.cancelProfile = cancelProfile;
window.createTextPost = createTextPost;
window.postYouTube = postYouTube;
window.sendRoomMessage = sendRoomMessage;
window.setDmRecipient = setDmRecipient;
window.sendDm = sendDm;
window.startCall = startCall;
window.joinCall = joinCall;
window.startCamera = startCamera;
window.stopCamera = stopCamera;
window.signOut = signOut;

init();


