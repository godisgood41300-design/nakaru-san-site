import { useEffect, useState } from "react";
import { supabase } from "../lib/supabaseClient.js";

const emptyProfile = {
  display_name: "",
  username: "",
  bio: "",
  avatar_url: "",
  banner_url: ""
};

export default function ProfileEditor({ user }) {
  const [profile, setProfile] = useState(emptyProfile);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState("");

  useEffect(() => {
    let ignore = false;

    async function loadProfile() {
      setLoading(true);

      const { data } = await supabase
        .from("profiles")
        .select("display_name, username, bio, avatar_url, banner_url")
        .eq("id", user.id)
        .maybeSingle();

      if (!ignore) {
        setProfile({
          ...emptyProfile,
          ...(data || {}),
          display_name: data?.display_name || user.user_metadata?.display_name || ""
        });
        setLoading(false);
      }
    }

    loadProfile();

    return () => {
      ignore = true;
    };
  }, [user.id, user.user_metadata?.display_name]);

  function updateField(field, value) {
    setProfile((current) => ({
      ...current,
      [field]: value
    }));
  }

  async function saveProfile(event) {
    event.preventDefault();
    setSaving(true);

    const { error } = await supabase.from("profiles").upsert({
      id: user.id,
      email: user.email,
      ...profile,
      updated_at: new Date().toISOString()
    });

    setStatus(error ? error.message : "Profile saved.");
    setSaving(false);
  }

  if (loading) return <section className="card">Loading profile...</section>;

  return (
    <section className="card">
      <h2>Profile</h2>
      <p className="muted">{user.email}</p>

      <form onSubmit={saveProfile}>
        <label>
          Display Name
          <input value={profile.display_name} onChange={(event) => updateField("display_name", event.target.value)} />
        </label>

        <label>
          Username
          <input value={profile.username} onChange={(event) => updateField("username", event.target.value)} />
        </label>

        <label>
          Bio
          <textarea rows={4} value={profile.bio} onChange={(event) => updateField("bio", event.target.value)} />
        </label>

        <button className="primaryButton" disabled={saving}>
          {saving ? "Saving..." : "Save Profile"}
        </button>
      </form>

      {status && <p className="message">{status}</p>}
    </section>
  );
}
