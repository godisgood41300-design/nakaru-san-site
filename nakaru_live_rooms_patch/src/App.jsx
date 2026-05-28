import { useEffect, useState } from "react";
import { LogOut } from "lucide-react";
import AuthCard from "./components/AuthCard.jsx";
import ProfileEditor from "./components/ProfileEditor.jsx";
import LiveRooms from "./components/LiveRooms.jsx";
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
    return <main className="page"><div className="card">Loading Nakaru-San...</div></main>;
  }

  if (!hasSupabaseConfig) {
    return (
      <main className="page">
        <section className="card warning">
          <h1>Supabase Setup Needed</h1>
          <p>Add your Supabase URL and anon key to <strong>.env.local</strong>.</p>
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
          <span>Anime • Gaming • Live Rooms</span>
        </div>
        <button className="secondaryButton" onClick={handleSignOut}>
          <LogOut size={18} />
          Sign Out
        </button>
      </nav>

      <Hero />

      <section className="layout">
        <div className="mainColumn">
          <LiveRooms user={session.user} />
        </div>
        <aside className="sideColumn">
          <ProfileEditor user={session.user} />
        </aside>
      </section>
    </main>
  );
}

function Hero() {
  return (
    <header className="hero">
      <p className="eyebrow">NakamaChan / Nakaru-San Platform</p>
      <h1>Search rooms. Join the community. Go live.</h1>
      <p>
        A working foundation for anime and gaming rooms, local creator preview, and future full livestream upgrades.
      </p>
    </header>
  );
}
