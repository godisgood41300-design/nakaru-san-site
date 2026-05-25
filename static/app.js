const version = "20260525-static-deploy-fix";
const config = window.NAKARU_CONFIG || {};
const socialProviders = [
  { provider: "google", label: "Connect with Google" },
  { provider: "apple", label: "Connect with Apple" },
  { provider: "facebook", label: "Connect with Facebook" },
  { provider: "twitter", label: "Connect with X" },
  { provider: "instagram", label: "Connect with Instagram", externalUrlKey: "instagramAuthUrl" }
];
const rooms = [
  { id: "anime", name: "Anime", topic: "Watch parties, openings, episode talk" },
  { id: "gaming", name: "Gaming", topic: "Co-op queues, builds, raids, ranked" },
  { id: "manga", name: "Manga", topic: "Chapters, panels, collecting, theories" },
  { id: "general", name: "General", topic: "Community lounge and introductions" },
  { id: "nakaru-san", name: "Nakaru-San", topic: "Platform updates and creator rooms" }
];

const demoPosts = [
  {
    id: "post-demo-1",
    user_id: "demo-ami",
    author: "Ami Arc",
    type: "text",
    content: "Moonlit Lounge is open tonight. Keep it spoiler-safe and bring opening theme recommendations.",
    likes: 18,
    comments_count: 4,
    created_at: new Date(Date.now() - 1000 * 60 * 30).toISOString()
  },
  {
    id: "post-demo-2",
    user_id: "demo-rae",
    author: "Rae Arcade",
    type: "youtube",
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
  profileStatus: "",
  posts: readLocal("nakaru-posts", demoPosts),
  postStatus: "",
  youtubeStatus: "",
  videoPosting: false,
  videoComposerOpen: true,
  lastVideoPost: null,
  activeRoom: "anime",
  roomText: "",
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
  authMode: "signin",
  authStatus: "",
  rememberedEmail: readLocal("nakaru-remember-email", ""),
  rememberEmail: Boolean(readLocal("nakaru-remember-email", "")),
  stream: null
};
state.savedProfile = { ...state.profile };

const supabase = config.supabaseUrl && config.supabaseAnonKey && window.supabase
  ? window.supabase.createClient(config.supabaseUrl, config.supabaseAnonKey, {
      auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true }
    })
  : null;

function redirectUrl() {
  const origin = config.appUrl || window.location.origin;
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
  if (supabase) {
    const { data } = await supabase.auth.getSession();
    state.user = data.session?.user || null;
    supabase.auth.onAuthStateChange((_event, session) => {
      state.user = session?.user || null;
      afterAuthChange();
    });
  } else {
    state.user = readLocal("nakaru-session", null);
  }
  await afterAuthChange();
}

async function afterAuthChange() {
  if (state.user) {
    await loadProfile();
    await loadPosts();
  }
  render();
}

async function loadProfile() {
  if (!state.user) return;
  if (supabase) {
    const { data, error } = await supabase.from("profiles").select("*").eq("id", state.user.id).maybeSingle();
    if (error) console.error("Profile load failed", error);
    state.profile = data || {
      id: state.user.id,
      username: state.user.user_metadata?.username || state.user.email?.split("@")[0] || "nakaru_member",
      display_name: state.user.user_metadata?.username || state.user.email?.split("@")[0] || "Nakaru Member",
      bio: "Anime and gaming fan building a new watch-party circle.",
      avatar_url: "",
      banner_url: ""
    };
  } else {
    const profiles = readLocal("nakaru-local-profiles", {});
    state.profile = profiles[state.user.id] || { ...state.profile, username: state.user.username || state.profile.username };
  }
  state.savedProfile = { ...state.profile };
}

async function loadPosts() {
  if (!supabase) return;
  const { data, error } = await supabase.from("posts").select("*").order("created_at", { ascending: false }).limit(80);
  if (error) {
    console.error("Post load failed", error);
    return;
  }
  state.posts = data || [];
}

function setPage(page) {
  state.page = page;
  if (page === "edit-profile" && state.user) state.profileEditing = true;
  if (page === "video") {
    state.videoComposerOpen = true;
    state.youtubeStatus = "";
  }
  render();
}

async function submitAuth(event) {
  event.preventDefault();
  const form = new FormData(event.currentTarget);
  const email = String(form.get("email") || "").trim();
  const password = String(form.get("password") || "");
  const username = String(form.get("username") || "").trim();
  state.rememberEmail = form.get("rememberEmail") === "on";
  if (state.rememberEmail) writeLocal("nakaru-remember-email", email);
  else localStorage.removeItem("nakaru-remember-email");
  state.authStatus = "";

  try {
    if (supabase) {
      if (state.authMode === "signup") {
        const { data, error } = await supabase.auth.signUp({
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
        const { data, error } = await supabase.auth.signInWithPassword({ email, password });
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

  if (!supabase) {
    state.authStatus = "Social login needs Supabase provider setup first.";
    render();
    return;
  }
  const { error } = await supabase.auth.signInWithOAuth({ provider, options: { redirectTo: redirectUrl() } });
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
  if (!state.user || !state.profileDirty) return;
  const row = {
    id: state.user.id,
    username: state.profile.username || "nakaru_member",
    display_name: state.profile.display_name || state.profile.username || "Nakaru Member",
    bio: state.profile.bio || "",
    avatar_url: state.profile.avatar_url || "",
    banner_url: state.profile.banner_url || "",
    updated_at: new Date().toISOString()
  };
  try {
    if (supabase) {
      const { error } = await supabase.from("profiles").upsert(row, { onConflict: "id" });
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
  await savePost({ type: "text", content });
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
    state.lastVideoPost = await savePost({ type: "youtube", content: "Shared a YouTube video.", youtube_url: parsed.originalUrl, youtube_embed_url: parsed.embedUrl });
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
  const post = {
    id: crypto.randomUUID(),
    user_id: state.user.id,
    author: state.profile.display_name || state.profile.username || "Nakaru Member",
    likes: 0,
    comments_count: 0,
    created_at: new Date().toISOString(),
    ...postInput
  };
  if (supabase) {
    const { data, error } = await supabase.from("posts").insert(post).select().single();
    if (error) throw error;
    state.posts = [data, ...state.posts];
    return data;
  } else {
    state.posts = [post, ...state.posts];
    writeLocal("nakaru-posts", state.posts);
    return post;
  }
}

function sendRoomMessage(event) {
  event.preventDefault();
  const input = event.currentTarget.querySelector("input");
  const text = input.value.trim();
  if (!text) return;
  const message = {
    id: crypto.randomUUID(),
    room_id: state.activeRoom,
    user_id: state.user?.id || "guest",
    author: state.profile.display_name || "Nakaru Member",
    text,
    created_at: new Date().toISOString()
  };
  state.roomMessages[state.activeRoom] = [...(state.roomMessages[state.activeRoom] || []), message];
  writeLocal("nakaru-room-messages", state.roomMessages);
  input.value = "";
  render();
}

function sendDm(event) {
  event.preventDefault();
  const input = event.currentTarget.querySelector("input");
  const text = input.value.trim();
  if (!text) return;
  state.threads = state.threads.map((thread) => {
    if (thread.id !== state.activeThread) return thread;
    return { ...thread, preview: text, messages: [...thread.messages, { id: crypto.randomUUID(), fromMe: true, text }] };
  });
  writeLocal("nakaru-dm-threads", state.threads);
  input.value = "";
  render();
}

async function startCamera() {
  try {
    state.stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
    render();
    const video = document.querySelector("#live-video");
    if (video) video.srcObject = state.stream;
  } catch (error) {
    console.error("Media permission failed", error);
  }
}

function stopCamera() {
  state.stream?.getTracks().forEach((track) => track.stop());
  state.stream = null;
  render();
}

async function signOut() {
  if (supabase) await supabase.auth.signOut();
  localStorage.removeItem("nakaru-session");
  state.user = null;
  state.profileEditing = false;
  setPage("home");
}

function renderPost(post) {
  return `
    <article class="post-card">
      <div class="post-head">${avatar({ display_name: post.author })}<div><strong>${escapeHtml(post.author || "Nakaru Member")}</strong><span>${formatTime(post.created_at)}</span></div></div>
      <p>${escapeHtml(post.content || "")}</p>
      ${post.type === "youtube" && post.youtube_embed_url ? `<div class="video-frame"><iframe src="${escapeHtml(post.youtube_embed_url)}" title="Nakaru-San YouTube post" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" allowfullscreen></iframe></div>` : ""}
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
        <button class="primary-action" type="submit">${state.authMode === "signup" ? "Create account" : "Sign in"}</button>
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
            ${state.profileDirty ? `<button class="primary-action" onclick="saveProfile()" type="button">Save Profile</button>` : `<span class="muted">Make a change to enable saving.</span>`}
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
        <div class="room-tabs">${rooms.map((room) => `<button class="${room.id === state.activeRoom ? "active" : ""}" onclick="state.activeRoom='${room.id}'; render()" type="button">${escapeHtml(room.name)}</button>`).join("")}</div>
        <div class="chat-window">${(state.roomMessages[state.activeRoom] || []).map((message) => `<div class="chat-line">${avatar({ display_name: message.author })}<div><strong>${escapeHtml(message.author)}</strong><p>${escapeHtml(message.text)}</p></div></div>`).join("")}</div>
        <form class="message-form" onsubmit="sendRoomMessage(event)"><input placeholder="Message ${escapeHtml(activeRoom.name)}" /><button class="primary-action" type="submit">Send</button></form>
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
    <main class="content-layout"><section class="panel live-panel"><div class="panel-title"><span class="eyebrow">GoLive</span><h2>Livestream room</h2></div><div class="live-stage">${state.stream ? `<video id="live-video" autoplay muted playsinline></video>` : `<div><strong>Live video rooms are ready for camera preview.</strong><span>Full multi-viewer livestreaming needs deployed WebRTC signaling or a live provider.</span></div>`}</div><div class="hero-actions"><button class="primary-action" onclick="startCamera()" type="button">Start Camera</button><button class="ghost-action" onclick="stopCamera()" type="button">Stop</button></div></section><section class="panel"><div class="panel-title"><span class="eyebrow">Calls</span><h2>FaceTime-style calls</h2></div><div class="call-actions"><button class="ghost-action" onclick="startCamera()" type="button">Video Call Preview</button><button class="ghost-action" onclick="startCamera()" type="button">Audio Call Preview</button></div><p class="muted">Camera/microphone access works in-browser. One-to-one calling needs production WebRTC signaling.</p></section></main>
  `;
  if (state.page === "inbox") return `
    <main class="inbox-layout"><section class="panel thread-list"><div class="panel-title"><span class="eyebrow">Messaging inbox</span><h2>Direct messages</h2></div>${state.threads.map((thread) => `<button class="thread ${thread.id === state.activeThread ? "active" : ""}" onclick="state.activeThread='${thread.id}'; render()" type="button">${avatar({ display_name: thread.user })}<span><strong>${escapeHtml(thread.user)}</strong><small>${escapeHtml(thread.preview)}</small></span></button>`).join("")}</section><section class="panel dm-panel"><div class="panel-title"><span class="eyebrow">Conversation</span><h2>${escapeHtml(activeThread.user)}</h2></div><div class="dm-window">${activeThread.messages.map((message) => `<p class="bubble ${message.fromMe ? "mine" : ""}">${escapeHtml(message.text)}</p>`).join("")}</div><form class="message-form" onsubmit="sendDm(event)"><input placeholder="Message ${escapeHtml(activeThread.user)}" /><button class="primary-action" type="submit">Send</button></form></section></main>
  `;
  if (state.page === "private-rooms") return `<main class="page-grid"><section class="panel"><div class="panel-title"><span class="eyebrow">Private chatrooms</span><h2>Invite-only rooms</h2></div><div class="card-grid"><article class="room-card"><h3>Crew Night</h3><p>Invite-only watch list planning.</p><span>4 members</span><button class="ghost-action" type="button">Request Invite</button></article><article class="room-card"><h3>Raid Party</h3><p>Private gaming voice room.</p><span>6 members</span><button class="ghost-action" type="button">Request Invite</button></article></div></section></main>`;
  return `
    <main class="page-grid">
      <section class="hero panel"><div><span class="eyebrow">Anime Forum - Gaming Rooms - Live Community</span><h1>Nakaru-San</h1><p>A dark anime-style social platform for watch parties, gaming squads, creators, public chatrooms, private messages, and live video rooms.</p><div class="hero-actions"><button class="primary-action" onclick="setPage('feed')" type="button">Open Live Feed</button><button class="ghost-action" onclick="setPage('public-rooms')" type="button">Join Chatrooms</button><button class="ghost-action" onclick="setPage('golive')" type="button">Go Live</button></div></div><div class="hero-card"><img src="./nakaru-san-logo.png" alt="Nakaru-San logo" /></div></section>
      <section class="stats-row"><span class="stat-pill"><strong>${rooms.length}</strong>Public rooms</span><span class="stat-pill"><strong>${state.posts.length}</strong>Feed posts</span><span class="stat-pill"><strong>${state.threads.length}</strong>DM threads</span><span class="stat-pill"><strong>${state.user ? "Online" : "Demo"}</strong>Account mode</span></section>
    </main>
  `;
}

function render() {
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
      <header class="topbar"><button class="brand" onclick="setPage('home')" type="button"><img src="./nakaru-san-logo.png" alt="" /><span>Nakaru-San</span></button><nav>${nav.map(([id, label]) => `<button class="${state.page === id ? "active" : ""}" onclick="setPage('${id}')" type="button">${label}</button>`).join("")}</nav><div class="account-tools">${state.user ? `${avatar(state.profile)}<button class="ghost-action" onclick="signOut()" type="button">Sign out</button>` : `<button class="primary-action" onclick="setPage('edit-profile')" type="button">Sign in</button>`}</div></header>
      <div class="version-badge">${version}</div>
      ${!state.user && state.page !== "edit-profile" ? `<div class="demo-banner">Demo mode is active until Supabase config is added. The UI still works locally with saved browser data.</div>` : ""}
      ${renderPage()}
    </div>
  `;
  if (state.stream) {
    const video = document.querySelector("#live-video");
    if (video) video.srcObject = state.stream;
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
window.sendDm = sendDm;
window.startCamera = startCamera;
window.stopCamera = stopCamera;
window.signOut = signOut;

init();
