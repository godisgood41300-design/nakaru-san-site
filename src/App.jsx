import { useEffect, useMemo, useRef, useState } from "react";
import {
  Bell,
  Camera,
  Clapperboard,
  Compass,
  Gamepad2,
  Heart,
  Image,
  Lock,
  LogOut,
  MessageCircle,
  Mic,
  MonitorPlay,
  PenLine,
  Plus,
  Radio,
  Save,
  Search,
  Send,
  Shield,
  Sparkles,
  UserRound,
  Users,
  Video
} from "lucide-react";
import { hasSupabaseConfig, supabase } from "./lib/supabaseClient";
import { parseYouTubeUrl } from "./lib/youtube";
import { demoMessages, demoPosts, demoThreads, demoUsers, privateRooms, rooms } from "./data/seed";

const appVersion = "20260523-production-rebuild";
const defaultProfile = {
  username: "nakaru_member",
  display_name: "Nakaru Member",
  bio: "Anime and gaming fan building a new watch-party circle.",
  avatar_url: "",
  banner_url: ""
};

function initials(name = "NS") {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("") || "NS";
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

async function fileToDataUrl(file) {
  if (!file) return "";
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ""));
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

function formatTime(value) {
  const date = new Date(value || Date.now());
  return date.toLocaleString([], { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" });
}

function Avatar({ profile, size = "normal" }) {
  const name = profile?.display_name || profile?.username || "Nakaru Member";
  return (
    <div className={`avatar ${size}`} style={profile?.avatar_url ? { backgroundImage: `url(${profile.avatar_url})` } : undefined}>
      {!profile?.avatar_url ? initials(name) : null}
    </div>
  );
}

function StatPill({ label, value }) {
  return (
    <span className="stat-pill">
      <strong>{value}</strong>
      {label}
    </span>
  );
}

function AuthCard({ onAuthComplete }) {
  const [mode, setMode] = useState("signin");
  const [form, setForm] = useState({ email: "", password: "", username: "" });
  const [status, setStatus] = useState("");
  const [busy, setBusy] = useState(false);

  async function submitAuth(event) {
    event.preventDefault();
    setBusy(true);
    setStatus("");
    try {
      if (!hasSupabaseConfig) {
        const localUser = {
          id: "local-user",
          email: form.email || "member@nakaru.local",
          username: form.username || form.email.split("@")[0] || "nakaru_member"
        };
        writeLocal("nakaru-session", localUser);
        onAuthComplete(localUser);
        setStatus("Demo account ready.");
        return;
      }

      if (mode === "signup") {
        const { data, error } = await supabase.auth.signUp({
          email: form.email,
          password: form.password,
          options: { data: { username: form.username } }
        });
        if (error) throw error;
        if (!data.session) {
          setStatus("Check your email to confirm your account before logging in.");
          return;
        }
        onAuthComplete(data.user);
      } else {
        const { data, error } = await supabase.auth.signInWithPassword({
          email: form.email,
          password: form.password
        });
        if (error) throw error;
        onAuthComplete(data.user);
      }
      setStatus("Signed in successfully.");
    } catch (error) {
      console.error("Auth failed", error);
      setStatus(error.message?.includes("Email not confirmed") ? "Please confirm your email before logging in." : "Could not sign in. Check your information and try again.");
    } finally {
      setBusy(false);
    }
  }

  async function social(provider) {
    setBusy(true);
    setStatus("");
    if (!hasSupabaseConfig) {
      setStatus("Social login needs Supabase provider setup first.");
      setBusy(false);
      return;
    }
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider,
        options: { redirectTo: `${window.location.origin}/` }
      });
      if (error) throw error;
    } catch (error) {
      console.error("OAuth failed", error);
      setStatus("Social login is not enabled yet.");
      setBusy(false);
    }
  }

  return (
    <section className="auth-card panel">
      <div className="panel-title">
        <span className="eyebrow">Account</span>
        <h2>{mode === "signup" ? "Create your Nakaru-San account" : "Welcome back"}</h2>
      </div>
      <div className="segmented">
        <button className={mode === "signin" ? "active" : ""} onClick={() => setMode("signin")} type="button">
          Sign in
        </button>
        <button className={mode === "signup" ? "active" : ""} onClick={() => setMode("signup")} type="button">
          Sign up
        </button>
      </div>
      <form className="form-grid" onSubmit={submitAuth}>
        {mode === "signup" ? (
          <label>
            Username
            <input value={form.username} onChange={(event) => setForm({ ...form, username: event.target.value })} placeholder="nakaru_fan" />
          </label>
        ) : null}
        <label>
          Email
          <input type="email" value={form.email} onChange={(event) => setForm({ ...form, email: event.target.value })} placeholder="you@example.com" required />
        </label>
        <label>
          Password
          <input type="password" value={form.password} onChange={(event) => setForm({ ...form, password: event.target.value })} placeholder="8+ characters" required minLength={8} />
        </label>
        <button className="primary-action" disabled={busy} type="submit">
          {busy ? "Working..." : mode === "signup" ? "Create account" : "Sign in"}
        </button>
      </form>
      <div className="oauth-row">
        <button disabled={busy} onClick={() => social("google")} type="button">Google</button>
        <button disabled={busy} onClick={() => social("github")} type="button">GitHub</button>
        <button disabled={busy} onClick={() => social("facebook")} type="button">Facebook</button>
      </div>
      {status ? <p className="status-text">{status}</p> : null}
    </section>
  );
}

function ProfileCard({ profile, owner, editing, dirty, saving, status, onEdit, onSave, onCancel, onChange, onAvatar, onBanner }) {
  return (
    <section className="profile-card panel">
      <div className="profile-banner" style={profile.banner_url ? { backgroundImage: `url(${profile.banner_url})` } : undefined}>
        <Avatar profile={profile} size="large" />
      </div>
      <div className="profile-head">
        <div>
          <span className="eyebrow">{owner ? "Your profile" : "Public profile"}</span>
          <h2>{profile.display_name || profile.username}</h2>
          <p>{profile.bio}</p>
        </div>
        {owner && !editing ? (
          <button className="ghost-action" onClick={onEdit} type="button">
            <PenLine size={17} /> Edit Profile
          </button>
        ) : null}
      </div>
      {owner && editing ? (
        <div className="edit-profile-grid">
          <label>
            Display name
            <input value={profile.display_name || ""} onChange={(event) => onChange("display_name", event.target.value)} />
          </label>
          <label>
            Username
            <input value={profile.username || ""} onChange={(event) => onChange("username", event.target.value)} />
          </label>
          <label className="wide">
            Bio/About
            <textarea rows="4" value={profile.bio || ""} onChange={(event) => onChange("bio", event.target.value)} />
          </label>
          <label className="file-button">
            <Camera size={17} /> Change profile picture
            <input type="file" accept="image/*" onChange={(event) => onAvatar(event.target.files?.[0])} />
          </label>
          <label className="file-button">
            <Image size={17} /> Change banner
            <input type="file" accept="image/*" onChange={(event) => onBanner(event.target.files?.[0])} />
          </label>
          <div className="profile-save-row wide">
            <button className="primary-action" disabled={!dirty || saving} onClick={onSave} type="button">
              <Save size={17} /> {saving ? "Saving..." : dirty ? "Save Profile" : "Saved"}
            </button>
            <button className="ghost-action" onClick={onCancel} type="button">
              Cancel
            </button>
          </div>
        </div>
      ) : null}
      {status ? <p className="status-text success">{status}</p> : null}
    </section>
  );
}

function PostCard({ post }) {
  return (
    <article className="post-card">
      <div className="post-head">
        <Avatar profile={{ display_name: post.author }} />
        <div>
          <strong>{post.author || "Nakaru Member"}</strong>
          <span>{formatTime(post.created_at)}</span>
        </div>
      </div>
      <p>{post.content}</p>
      {post.type === "youtube" && post.youtube_embed_url ? (
        <div className="video-frame">
          <iframe src={post.youtube_embed_url} title="Nakaru-San YouTube post" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" allowFullScreen />
        </div>
      ) : null}
      {post.media_url ? <img className="post-image" src={post.media_url} alt="" /> : null}
      <div className="post-actions">
        <button type="button"><Heart size={16} /> {post.likes || 0}</button>
        <button type="button"><MessageCircle size={16} /> {post.comments || post.comments_count || 0}</button>
        <button type="button"><Send size={16} /> Reply</button>
      </div>
    </article>
  );
}

function App() {
  const [page, setPage] = useState("home");
  const [sessionUser, setSessionUser] = useState(null);
  const [profile, setProfile] = useState(() => readLocal("nakaru-profile", defaultProfile));
  const [savedProfile, setSavedProfile] = useState(() => readLocal("nakaru-profile", defaultProfile));
  const [profileEditing, setProfileEditing] = useState(false);
  const [profileDirty, setProfileDirty] = useState(false);
  const [profileSaving, setProfileSaving] = useState(false);
  const [profileStatus, setProfileStatus] = useState("");
  const [posts, setPosts] = useState(() => readLocal("nakaru-posts", demoPosts));
  const [postText, setPostText] = useState("");
  const [postStatus, setPostStatus] = useState("");
  const [postPosting, setPostPosting] = useState(false);
  const [activeRoom, setActiveRoom] = useState("anime");
  const [roomMessages, setRoomMessages] = useState(() => readLocal("nakaru-room-messages", demoMessages));
  const [roomText, setRoomText] = useState("");
  const [threads, setThreads] = useState(() => readLocal("nakaru-dm-threads", demoThreads));
  const [activeThreadId, setActiveThreadId] = useState(demoThreads[0].id);
  const [dmText, setDmText] = useState("");
  const [youtubeUrl, setYoutubeUrl] = useState("");
  const [youtubeStatus, setYoutubeStatus] = useState("");
  const [videoPosting, setVideoPosting] = useState(false);
  const [stream, setStream] = useState(null);
  const videoRef = useRef(null);

  const signedIn = Boolean(sessionUser);
  const activeThread = threads.find((thread) => thread.id === activeThreadId) || threads[0];
  const activeRoomInfo = rooms.find((room) => room.id === activeRoom) || rooms[0];
  const profilePosts = posts.filter((post) => post.user_id === (sessionUser?.id || "local-user"));

  const navItems = useMemo(
    () => [
      ["home", "Home", Compass],
      ["feed", "Live Feed", Radio],
      ["public-rooms", "Public Chatrooms", Users],
      ["private-rooms", "Private Rooms", Lock],
      ["profile", "Profile", UserRound],
      ["edit-profile", "Edit Profile", PenLine],
      ["video", "Video Post", MonitorPlay],
      ["golive", "GoLive", Clapperboard],
      ["inbox", "Inbox", MessageCircle]
    ],
    []
  );

  useEffect(() => {
    let authSubscription;

    async function init() {
      if (hasSupabaseConfig) {
        const { data } = await supabase.auth.getSession();
        setSessionUser(data.session?.user || null);
        const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
          setSessionUser(session?.user || null);
        });
        authSubscription = listener.subscription;
        return;
      }
      setSessionUser(readLocal("nakaru-session", null));
    }

    init();
    return () => authSubscription?.unsubscribe();
  }, []);

  useEffect(() => {
    if (!signedIn) return;
    loadProfile();
    loadPosts();
  }, [signedIn, sessionUser?.id]);

  useEffect(() => {
    if (!hasSupabaseConfig) return;
    loadRoomMessages(activeRoom);
    const channel = supabase
      .channel(`room-${activeRoom}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "room_messages", filter: `room_id=eq.${activeRoom}` }, () => loadRoomMessages(activeRoom))
      .subscribe();
    return () => supabase.removeChannel(channel);
  }, [activeRoom]);

  useEffect(() => {
    if (videoRef.current && stream) videoRef.current.srcObject = stream;
  }, [stream]);

  async function loadProfile() {
    if (!sessionUser) return;
    if (!hasSupabaseConfig) {
      const localProfile = readLocal("nakaru-profile", { ...defaultProfile, username: sessionUser.username || "nakaru_member" });
      setProfile(localProfile);
      setSavedProfile(localProfile);
      return;
    }
    const { data, error } = await supabase.from("profiles").select("*").eq("id", sessionUser.id).maybeSingle();
    if (error) console.error("Profile load failed", error);
    const nextProfile = data || {
      ...defaultProfile,
      username: sessionUser.user_metadata?.username || sessionUser.email?.split("@")[0] || "nakaru_member"
    };
    setProfile(nextProfile);
    setSavedProfile(nextProfile);
  }

  async function loadPosts() {
    if (!hasSupabaseConfig) return;
    const { data, error } = await supabase.from("posts").select("*").order("created_at", { ascending: false }).limit(60);
    if (error) {
      console.error("Post load failed", error);
      return;
    }
    setPosts(data || []);
  }

  async function loadRoomMessages(roomId) {
    if (!hasSupabaseConfig) return;
    const { data, error } = await supabase.from("room_messages").select("*").eq("room_id", roomId).order("created_at", { ascending: true }).limit(100);
    if (error) {
      console.error("Room message load failed", error);
      return;
    }
    setRoomMessages((current) => ({ ...current, [roomId]: data || [] }));
  }

  function updateProfileField(field, value) {
    setProfile((current) => ({ ...current, [field]: value }));
    setProfileDirty(true);
    setProfileStatus("");
  }

  async function uploadMedia(file, folder) {
    if (!file) return "";
    if (!hasSupabaseConfig || !sessionUser) return fileToDataUrl(file);
    const path = `${folder}/${sessionUser.id}-${Date.now()}-${file.name}`;
    const { error } = await supabase.storage.from("nakaru-media").upload(path, file, { upsert: true });
    if (error) throw error;
    const { data } = supabase.storage.from("nakaru-media").getPublicUrl(path);
    return data.publicUrl;
  }

  async function changeAvatar(file) {
    const url = await uploadMedia(file, "avatars");
    if (url) updateProfileField("avatar_url", url);
  }

  async function changeBanner(file) {
    const url = await uploadMedia(file, "banners");
    if (url) updateProfileField("banner_url", url);
  }

  async function saveProfile() {
    if (!signedIn) return;
    setProfileSaving(true);
    setProfileStatus("");
    try {
      const row = {
        id: sessionUser.id || "local-user",
        username: profile.username || "nakaru_member",
        display_name: profile.display_name || profile.username || "Nakaru Member",
        bio: profile.bio || "",
        avatar_url: profile.avatar_url || "",
        banner_url: profile.banner_url || "",
        updated_at: new Date().toISOString()
      };
      if (hasSupabaseConfig) {
        const { error } = await supabase.from("profiles").upsert(row, { onConflict: "id" });
        if (error) throw error;
      } else {
        writeLocal("nakaru-profile", row);
      }
      setProfile(row);
      setSavedProfile(row);
      setProfileDirty(false);
      setProfileEditing(false);
      setProfileStatus("Profile updated successfully.");
      setPage("profile");
    } catch (error) {
      console.error("Profile save failed", error);
      setProfileStatus("Profile could not be saved. Please try again soon.");
    } finally {
      setProfileSaving(false);
    }
  }

  async function addYouTubePost(event) {
    event.preventDefault();
    if (videoPosting) return;
    setYoutubeStatus("");
    setVideoPosting(true);
    try {
      if (!signedIn) {
        setYoutubeStatus("Sign in to post a video.");
        return;
      }
      const parsed = parseYouTubeUrl(youtubeUrl);
      if (!parsed) {
        setYoutubeStatus("Please enter a valid YouTube URL.");
        return;
      }
      const post = {
        id: crypto.randomUUID(),
        user_id: sessionUser?.id || "local-user",
        author: profile.display_name || profile.username || "Nakaru Member",
        type: "youtube",
        content: "Shared a YouTube video.",
        youtube_url: parsed.originalUrl,
        youtube_embed_url: parsed.embedUrl,
        likes: 0,
        comments_count: 0,
        created_at: new Date().toISOString()
      };
      if (hasSupabaseConfig && signedIn) {
        const { data, error } = await supabase.from("posts").insert(post).select().single();
        if (error) throw error;
        setPosts((current) => [data, ...current]);
      } else {
        const next = [post, ...posts];
        setPosts(next);
        writeLocal("nakaru-posts", next);
      }
      setYoutubeUrl("");
      setYoutubeStatus("Video posted to the live feed.");
      setPage("feed");
    } catch (error) {
      console.error("Video post failed", error);
      setYoutubeStatus("Video could not be posted. Please try again soon.");
    } finally {
      setVideoPosting(false);
    }
  }

  async function createTextPost(event) {
    event.preventDefault();
    if (postPosting) return;
    const text = postText.trim();
    if (!text) {
      setPostStatus("Write something before posting.");
      return;
    }
    setPostPosting(true);
    setPostStatus("");
    try {
      if (!signedIn) {
        setPostStatus("Sign in to create a post.");
        return;
      }
      const post = {
        id: crypto.randomUUID(),
        user_id: sessionUser?.id || "local-user",
        author: profile.display_name || profile.username || "Nakaru Member",
        type: "text",
        content: text,
        likes: 0,
        comments_count: 0,
        created_at: new Date().toISOString()
      };
      if (hasSupabaseConfig && signedIn) {
        const { data, error } = await supabase.from("posts").insert(post).select().single();
        if (error) throw error;
        setPosts((current) => [data, ...current]);
      } else {
        const next = [post, ...posts];
        setPosts(next);
        writeLocal("nakaru-posts", next);
      }
      setPostText("");
      setPostStatus("Post shared.");
    } catch (error) {
      console.error("Text post failed", error);
      setPostStatus("Post could not be shared. Please try again soon.");
    } finally {
      setPostPosting(false);
    }
  }

  async function sendRoomMessage(event) {
    event.preventDefault();
    const text = roomText.trim();
    if (!text) return;
    const message = {
      id: crypto.randomUUID(),
      room_id: activeRoom,
      user_id: sessionUser?.id || "local-user",
      author: profile.display_name || profile.username || "Nakaru Member",
      text,
      created_at: new Date().toISOString()
    };
    if (hasSupabaseConfig && signedIn) {
      const { error } = await supabase.from("room_messages").insert(message);
      if (error) console.error("Room send failed", error);
      await loadRoomMessages(activeRoom);
    } else {
      const next = { ...roomMessages, [activeRoom]: [...(roomMessages[activeRoom] || []), message] };
      setRoomMessages(next);
      writeLocal("nakaru-room-messages", next);
    }
    setRoomText("");
  }

  function sendDm(event) {
    event.preventDefault();
    const text = dmText.trim();
    if (!text) return;
    const nextThreads = threads.map((thread) => {
      if (thread.id !== activeThread.id) return thread;
      const nextMessage = { id: crypto.randomUUID(), fromMe: true, text, created_at: new Date().toISOString() };
      return { ...thread, preview: text, messages: [...thread.messages, nextMessage] };
    });
    setThreads(nextThreads);
    writeLocal("nakaru-dm-threads", nextThreads);
    setDmText("");
  }

  async function startPreview() {
    try {
      const media = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
      setStream(media);
    } catch (error) {
      console.error("Media permission failed", error);
    }
  }

  function stopPreview() {
    stream?.getTracks().forEach((track) => track.stop());
    setStream(null);
  }

  async function signOut() {
    if (hasSupabaseConfig) await supabase.auth.signOut();
    localStorage.removeItem("nakaru-session");
    setSessionUser(null);
    setProfileEditing(false);
  }

  const pageContent = {
    home: (
      <main className="page-grid">
        <section className="hero panel">
          <div>
            <span className="eyebrow">Anime Forum - Gaming Rooms - Live Community</span>
            <h1>Nakaru-San</h1>
            <p>A dark anime-style social platform for watch parties, gaming squads, creators, public chatrooms, private messages, and live video rooms.</p>
            <div className="hero-actions">
              <button className="primary-action" onClick={() => setPage("feed")} type="button"><Sparkles size={18} /> Open Live Feed</button>
              <button className="ghost-action" onClick={() => setPage("public-rooms")} type="button"><Users size={18} /> Join Chatrooms</button>
              <button className="ghost-action" onClick={() => setPage("golive")} type="button"><Video size={18} /> Go Live</button>
            </div>
          </div>
          <div className="hero-card">
            <img src="/nakaru-san-logo.png" alt="Nakaru-San logo" />
          </div>
        </section>
        <section className="stats-row">
          <StatPill value={rooms.length} label="Public rooms" />
          <StatPill value={posts.length} label="Feed posts" />
          <StatPill value={threads.length} label="DM threads" />
          <StatPill value={signedIn ? "Online" : "Demo"} label="Account mode" />
        </section>
      </main>
    ),
    feed: (
      <main className="content-layout">
        <section className="panel">
          <div className="panel-title inline">
            <div>
              <span className="eyebrow">Public live feed</span>
              <h2>Anime and gaming posts</h2>
            </div>
            <button className="primary-action" onClick={() => setPage("video")} type="button"><Plus size={17} /> Post Video</button>
          </div>
          <form className="composer" onSubmit={createTextPost}>
            <Avatar profile={profile} />
            <input value={postText} onChange={(event) => setPostText(event.target.value)} placeholder="Share an anime theory, gaming update, or watch-party plan" />
            <button className="primary-action" disabled={postPosting} type="submit">{postPosting ? "Posting..." : "Post"}</button>
          </form>
          {postStatus ? <p className="status-text">{postStatus}</p> : null}
          <div className="feed-list">{posts.map((post) => <PostCard key={post.id} post={post} />)}</div>
        </section>
        <aside className="panel sidebar-panel">
          <h3>Search</h3>
          <label className="search-box"><Search size={17} /><input placeholder="Search users or posts" /></label>
          <h3>Suggested members</h3>
          {demoUsers.map((user) => (
            <div className="mini-user" key={user.id}><Avatar profile={user} /><div><strong>{user.display_name}</strong><span>@{user.username}</span></div></div>
          ))}
        </aside>
      </main>
    ),
    "public-rooms": (
      <main className="content-layout">
        <section className="panel">
          <div className="panel-title">
            <span className="eyebrow">Public chatrooms</span>
            <h2>{activeRoomInfo.name} Room</h2>
          </div>
          <div className="room-tabs">
            {rooms.map((room) => (
              <button key={room.id} className={activeRoom === room.id ? "active" : ""} onClick={() => setActiveRoom(room.id)} type="button" style={{ "--room-color": room.color }}>
                {room.name}
              </button>
            ))}
          </div>
          <div className="chat-window">
            {(roomMessages[activeRoom] || []).map((message) => (
              <div className="chat-line" key={message.id}>
                <Avatar profile={{ display_name: message.author }} />
                <div><strong>{message.author}</strong><p>{message.text}</p></div>
              </div>
            ))}
          </div>
          <form className="message-form" onSubmit={sendRoomMessage}>
            <input value={roomText} onChange={(event) => setRoomText(event.target.value)} placeholder={`Message ${activeRoomInfo.name}`} />
            <button className="primary-action" type="submit"><Send size={17} /> Send</button>
          </form>
        </section>
        <aside className="panel sidebar-panel">
          <h3>Room topic</h3>
          <p>{activeRoomInfo.topic}</p>
          <p className="muted">Supabase Realtime powers live updates when configured.</p>
        </aside>
      </main>
    ),
    "private-rooms": (
      <main className="page-grid">
        <section className="panel">
          <div className="panel-title"><span className="eyebrow">Private chatrooms</span><h2>Invite-only rooms</h2></div>
          <div className="card-grid">
            {privateRooms.map((room) => (
              <article className="room-card" key={room.id}>
                <Lock size={22} />
                <h3>{room.name}</h3>
                <p>{room.topic}</p>
                <span>{room.members} members</span>
                <button className="ghost-action" type="button">Request Invite</button>
              </article>
            ))}
          </div>
        </section>
      </main>
    ),
    profile: (
      <main className="content-layout">
        <ProfileCard profile={profile} owner={signedIn} editing={false} dirty={profileDirty} saving={profileSaving} status={profileStatus} onEdit={() => { setProfileEditing(true); setPage("edit-profile"); }} onSave={saveProfile} onCancel={() => {}} onChange={updateProfileField} onAvatar={changeAvatar} onBanner={changeBanner} />
        <section className="panel">
          <div className="panel-title"><span className="eyebrow">Profile feed</span><h2>Posts by {profile.display_name}</h2></div>
          <div className="feed-list">{profilePosts.length ? profilePosts.map((post) => <PostCard key={post.id} post={post} />) : <p className="empty-state">No posts yet.</p>}</div>
        </section>
      </main>
    ),
    "edit-profile": (
      <main className="page-grid">
        {signedIn ? (
          <ProfileCard profile={profile} owner={signedIn} editing={profileEditing} dirty={profileDirty} saving={profileSaving} status={profileStatus} onEdit={() => setProfileEditing(true)} onSave={saveProfile} onCancel={() => { setProfile(savedProfile); setProfileDirty(false); setProfileEditing(false); setPage("profile"); }} onChange={updateProfileField} onAvatar={changeAvatar} onBanner={changeBanner} />
        ) : (
          <AuthCard onAuthComplete={setSessionUser} />
        )}
      </main>
    ),
    video: (
      <main className="page-grid">
        <section className="panel video-post-panel">
          <div className="panel-title"><span className="eyebrow">Video post/upload</span><h2>Post a YouTube link</h2></div>
          <form className="form-grid" onSubmit={addYouTubePost}>
            <label>
              YouTube URL
              <input value={youtubeUrl} onChange={(event) => setYoutubeUrl(event.target.value)} placeholder="https://www.youtube.com/watch?v=..." />
            </label>
            <button className="primary-action" disabled={videoPosting} type="submit"><MonitorPlay size={17} /> {videoPosting ? "Posting..." : "Post Video Link"}</button>
          </form>
          {youtubeStatus ? <p className="status-text">{youtubeStatus}</p> : null}
        </section>
      </main>
    ),
    golive: (
      <main className="content-layout">
        <section className="panel live-panel">
          <div className="panel-title"><span className="eyebrow">GoLive</span><h2>Livestream room</h2></div>
          <div className="live-stage">
            {stream ? <video ref={videoRef} autoPlay muted playsInline /> : <div><Radio size={38} /><strong>Live video rooms are ready for camera preview.</strong><span>Full multi-viewer livestreaming needs deployed WebRTC signaling or a live provider.</span></div>}
          </div>
          <div className="hero-actions">
            <button className="primary-action" onClick={startPreview} type="button"><Video size={17} /> Start Camera</button>
            <button className="ghost-action" onClick={stopPreview} type="button"><Shield size={17} /> Stop</button>
          </div>
        </section>
        <section className="panel">
          <div className="panel-title"><span className="eyebrow">Calls</span><h2>FaceTime-style calls</h2></div>
          <div className="call-actions">
            <button className="ghost-action" onClick={startPreview} type="button"><Camera size={17} /> Video Call Preview</button>
            <button className="ghost-action" onClick={startPreview} type="button"><Mic size={17} /> Audio Call Preview</button>
          </div>
          <p className="muted">Camera/microphone access works in-browser. One-to-one calling needs a Supabase Realtime signaling table or a WebRTC provider for production peer connections.</p>
        </section>
      </main>
    ),
    inbox: (
      <main className="inbox-layout">
        <section className="panel thread-list">
          <div className="panel-title"><span className="eyebrow">Messaging inbox</span><h2>Direct messages</h2></div>
          {threads.map((thread) => (
            <button key={thread.id} className={activeThreadId === thread.id ? "thread active" : "thread"} onClick={() => { setActiveThreadId(thread.id); setPage("dm"); }} type="button">
              <Avatar profile={{ display_name: thread.user }} />
              <span><strong>{thread.user}</strong><small>{thread.preview}</small></span>
            </button>
          ))}
        </section>
        <section className="panel dm-panel">
          <div className="panel-title"><span className="eyebrow">Conversation</span><h2>{activeThread.user}</h2></div>
          <div className="dm-window">
            {activeThread.messages.map((message) => <p className={message.fromMe ? "bubble mine" : "bubble"} key={message.id}>{message.text}</p>)}
          </div>
          <form className="message-form" onSubmit={sendDm}>
            <input value={dmText} onChange={(event) => setDmText(event.target.value)} placeholder={`Message ${activeThread.user}`} />
            <button className="primary-action" type="submit"><Send size={17} /> Send</button>
          </form>
        </section>
      </main>
    ),
    dm: null
  };
  pageContent.dm = pageContent.inbox;

  return (
    <div className="app-shell">
      <header className="topbar">
        <button className="brand" onClick={() => setPage("home")} type="button">
          <img src="/nakaru-san-logo.png" alt="" />
          <span>Nakaru-San</span>
        </button>
        <nav>
          {navItems.map(([id, label, Icon]) => (
            <button key={id} className={page === id ? "active" : ""} onClick={() => { if (id === "edit-profile" && signedIn) setProfileEditing(true); setPage(id); }} type="button">
              <Icon size={16} /> {label}
            </button>
          ))}
        </nav>
        <div className="account-tools">
          <button className="icon-only" type="button"><Bell size={18} /></button>
          {signedIn ? (
            <>
              <Avatar profile={profile} />
              <button className="ghost-action" onClick={signOut} type="button"><LogOut size={16} /> Sign out</button>
            </>
          ) : (
            <button className="primary-action" onClick={() => setPage("edit-profile")} type="button">Sign in</button>
          )}
        </div>
      </header>
      <div className="version-badge">{appVersion}</div>
      {!signedIn && page !== "edit-profile" ? (
        <div className="demo-banner">Demo mode is active until Supabase env variables are added. The UI still works locally with saved demo data.</div>
      ) : null}
      {pageContent[page] || pageContent.home}
    </div>
  );
}

export default App;
