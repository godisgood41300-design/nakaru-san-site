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
let localStream;
let broadcastStream;
let peerConnection;
let callPollTimer;
let lastSignalAt = 0;
let searchTimer;

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
const supabaseKey = supabaseConfig.SUPABASE_PUBLISHABLE_KEY || "";
const useSupabaseDirect = Boolean(supabaseUrl && supabaseKey);

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
  if (!response.ok) throw new Error(`Supabase request failed: ${response.status}`);
  if (response.status === 204) return null;
  return response.json();
}

async function supabaseAuth(path, body) {
  const response = await fetch(`${supabaseUrl}/auth/v1/${path}`, {
    method: "POST",
    headers: supabaseHeaders(),
    body: JSON.stringify(body)
  });
  if (!response.ok) throw new Error(`Auth request failed: ${response.status}`);
  return response.json();
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
    const stored = localStorage.getItem("nakaruAccount");
    return { account: stored ? JSON.parse(stored) : null };
  }

  if (route === "/auth/signup" && method === "POST") {
    const result = await supabaseAuth("signup", {
      email: body.email,
      password: body.password,
      data: { username: body.username }
    });
    const account = {
      id: result.user?.id || crypto.randomUUID(),
      username: body.username,
      email: body.email
    };
    if (result.access_token) localStorage.setItem("nakaruSupabaseAccessToken", result.access_token);
    localStorage.setItem("nakaruAccount", JSON.stringify(account));
    await supabaseRest("accounts", {
      method: "POST",
      headers: { Prefer: "resolution=merge-duplicates,return=minimal" },
      body: JSON.stringify([{ id: account.id, username: account.username, email: account.email }])
    }).catch(() => {});
    return { account };
  }

  if (route === "/auth/login" && method === "POST") {
    const result = await supabaseAuth("token?grant_type=password", {
      email: body.email,
      password: body.password
    });
    const username = result.user?.user_metadata?.username || body.email.split("@")[0];
    const account = { id: result.user?.id || crypto.randomUUID(), username, email: body.email };
    localStorage.setItem("nakaruSupabaseAccessToken", result.access_token);
    localStorage.setItem("nakaruAccount", JSON.stringify(account));
    return { account };
  }

  if (route === "/auth/logout" && method === "POST") {
    localStorage.removeItem("nakaruSupabaseAccessToken");
    localStorage.removeItem("nakaruAccount");
    return { ok: true };
  }

  if (route === "/feed" && method === "GET") {
    const posts = await supabaseRest("feed_posts?appropriate=eq.true&order=at.desc");
    return { posts };
  }

  if (route === "/feed" && method === "POST") {
    const image = await uploadImageToSupabase(body.image, "posts");
    const youtubeUrl = getYouTubeUrlFromText(body.text || "");
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

async function api(path, options = {}) {
  if (useSupabaseDirect) return supabaseApi(path, options);
  const response = await fetch(path, {
    headers: { "Content-Type": "application/json", ...(options.headers || {}) },
    ...options
  });
  if (!response.ok) throw new Error(`Request failed: ${response.status}`);
  return response.json();
}

function showToast(title, text) {
  clearTimeout(toastTimer);
  document.querySelector(".toast")?.remove();
  const toast = document.createElement("div");
  toast.className = "toast";
  toast.innerHTML = `<strong>${title}</strong><span>${text}</span>`;
  document.body.appendChild(toast);
  toastTimer = setTimeout(() => toast.remove(), 4200);
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
    const data = await api(`/api/messages?room=${encodeURIComponent(activeRoom)}`);
    renderMessages(data.messages, messageFeed);
    activeRoomStatus.textContent = `${data.roomCount} online`;
  } catch {
    showToast("Connection issue", "Public chat could not reach the local server.");
  }
}

async function syncDmMessages() {
  try {
    const data = await api(`/api/dm?thread=${encodeURIComponent(activeThread)}`);
    const thread = dmThreads.find((item) => item.name === activeThread);
    thread.messages = data.messages;
    if (data.messages.length) thread.preview = data.messages[data.messages.length - 1].text;
    renderActiveThread();
  } catch {
    showToast("Connection issue", "Direct messages could not reach the local server.");
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

function loadYouTubeVideo(value) {
  const videoId = getYouTubeId(value);
  if (!videoId) {
    watchStatus.textContent = "Invalid link";
    showToast("YouTube link needed", "Paste a valid youtube.com or youtu.be video link.");
    return;
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
  showToast("Video loaded", "The YouTube video is ready in the shared player.");
}

function setAuthMode(mode) {
  authMode = mode;
  const signingUp = mode === "signup";
  authTitle.textContent = signingUp ? "Create account" : "Log in";
  authSubmitButton.textContent = signingUp ? "Create account" : "Log in";
  authUsername.closest("label").style.display = signingUp ? "grid" : "none";
  signupTab.classList.toggle("active", signingUp);
  loginTab.classList.toggle("active", !signingUp);
  authMessage.textContent = "Social login needs provider credentials before launch.";
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

async function syncAccount() {
  const data = await api("/api/auth/me");
  currentAccount = data.account;
  updateAccountUi();
}

async function submitAuth() {
  const path = authMode === "signup" ? "/api/auth/signup" : "/api/auth/login";
  try {
    const data = await api(path, {
      method: "POST",
      body: JSON.stringify({
        username: authUsername.value,
        email: authEmail.value,
        password: authPassword.value
      })
    });
    currentAccount = data.account;
    authModal.close();
    updateAccountUi();
    showToast("Welcome", `Signed in as ${displayName()}.`);
  } catch (error) {
    authMessage.textContent = authMode === "signup"
      ? "Could not create account. Use a valid email and an 8+ character password."
      : "Could not log in. Check the email and password.";
  }
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
    await api("/api/messages", {
      method: "POST",
      body: JSON.stringify({ room: roomName, from: "System", text: `${displayName()} went live. Chat is open.` })
  });

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
  await api("/api/messages", { method: "POST", body: JSON.stringify({ room: activeRoom, from: displayName(), text }) });
  messageInput.value = "";
  syncPublicMessages();
});

dmForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  const text = dmInput.value.trim();
  if (!text) return;
  await api("/api/dm", { method: "POST", body: JSON.stringify({ thread: activeThread, from: displayName(), text }) });
  dmInput.value = "";
  syncDmMessages();
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
youtubeForm.addEventListener("submit", (event) => {
  event.preventDefault();
  loadYouTubeVideo(youtubeInput.value);
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
  button.addEventListener("click", () => {
    const provider = button.dataset.provider;
    window.location.href = `/api/auth/oauth/${provider}`;
  });
});
saveProfileButton.addEventListener("click", async () => {
  const photo = await readImage(profilePhotoInput);
  const banner = await readImage(profileBannerInput);
  profile = {
    ...profile,
    name: profileNameInput.value.trim() || displayName(),
    bio: profileBioInput.value.trim() || "Anime fan, watch-party host, and co-op teammate.",
    photo: photo || profile.photo || "",
    banner: banner || profile.banner || ""
  };
  localStorage.setItem("nakaruProfile", JSON.stringify(profile));
  renderProfile();
  showToast("Profile saved", "Your profile picture, banner, and details were updated.");
});
postForm.addEventListener("submit", async (event) => {
  event.preventDefault();
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
  syncFeed();
});
byId("startRoomButton").addEventListener("click", startLiveRoom);
byId("stopStreamButton").addEventListener("click", stopLiveStream);
byId("exploreRoomsButton").addEventListener("click", () => scrollToSection("rooms"));
byId("viewRequestsButton").addEventListener("click", () => scrollToSection("friends"));
byId("notificationsButton").addEventListener("click", () => showToast("Notifications", "Friend requests, room invites, and DMs update through the local app server."));
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
