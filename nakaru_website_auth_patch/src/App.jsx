import { useEffect, useState } from "react";
import { LogOut, User, MessageCircle, Gamepad2, Radio } from "lucide-react";
import AuthCard from "./components/AuthCard.jsx";
import ProfileEditor from "./components/ProfileEditor.jsx";
import { supabase, hasSupabaseConfig } from "./lib/supabaseClient.js";

export default function App() {
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let subscription;

    async function loadSession() {
      if (!hasSupabaseConfig) {
        setLoading(false);
        return;
      }

      const { data } = await supabase.auth.getSession();
      setSession(data.session ?? null);

      const listener = supabase.auth.onAuthStateChange((_event, nextSession) => {
        setSession(nextSession);
      });

      subscription = listener.data.subscription;
      setLoading(false);
    }

    loadSession();

    return () => {
      if (subscription) subscription.unsubscribe();
    };
  }, []);

  async function handleSignOut() {
    if (!supabase) return;
    await supabase.auth.signOut();
    setSession(null);
  }

  if (loading) {
    return (
      <main className="page">
        <div className="card">
          <p>Loading Nakaru-San...</p>
        </div>
      </main>
    );
  }

  if (!hasSupabaseConfig) {
    return (
      <main className="page">
        <section className="card warning">
          <h1>Nakaru-San Setup Needed</h1>
          <p>
            Add your Supabase keys to <strong>.env.local</strong> before auth will work.
          </p>
          <pre>{`VITE_SUPABASE_URL=your_project_url
VITE_SUPABASE_ANON_KEY=your_anon_key`}</pre>
        </section>
      </main>
    );
  }

  if (!session) {
    return (
      <main className="page">
        <Hero />
        <AuthCard />
      </main>
    );
  }

  return (
    <main className="page">
      <nav className="topbar">
        <div>
          <strong>Nakaru-San</strong>
          <span>Anime • Gaming • Community</span>
        </div>
        <button className="secondaryButton" onClick={handleSignOut}>
          <LogOut size={18} />
          Sign Out
        </button>
      </nav>

      <Hero />

      <section className="grid">
        <ProfileEditor user={session.user} />

        <div className="card">
          <h2>Community Hub</h2>
          <div className="featureList">
            <Feature icon={<MessageCircle />} title="Live Chat Rooms" text="Build anime and gaming discussion rooms." />
            <Feature icon={<Radio />} title="Go Live Area" text="Reserve this section for future streaming features." />
            <Feature icon={<Gamepad2 />} title="Gaming Feed" text="Post updates, links, and community news." />
            <Feature icon={<User />} title="Profiles" text="Users can save identity details without broken input typing." />
          </div>
        </div>
      </section>
    </main>
  );
}

function Hero() {
  return (
    <header className="hero">
      <div>
        <p className="eyebrow">NakamaChan / Nakaru-San Platform</p>
        <h1>Your anime and gaming world starts here.</h1>
        <p>
          A clean foundation for login, profile saving, community features, and future live-room upgrades.
        </p>
      </div>
    </header>
  );
}

function Feature({ icon, title, text }) {
  return (
    <div className="feature">
      <div className="featureIcon">{icon}</div>
      <div>
        <h3>{title}</h3>
        <p>{text}</p>
      </div>
    </div>
  );
}
