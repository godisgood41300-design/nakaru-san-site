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
      setStatus("");

      const { data, error } = await supabase
        .from("profiles")
        .select("display_name, username, bio, avatar_url, banner_url")
        .eq("id", user.id)
        .single();

      if (ignore) return;

      if (error && error.code !== "PGRST116") {
        setStatus(error.message);
      }

      setProfile({
        ...emptyProfile,
        ...(data || {}),
        display_name: data?.display_name || user.user_metadata?.display_name || "",
      });

      setLoading(false);
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
    setStatus("");

    const payload = {
      id: user.id,
      email: user.email,
      display_name: profile.display_name,
      username: profile.username,
      bio: profile.bio,
      avatar_url: profile.avatar_url,
      banner_url: profile.banner_url,
      updated_at: new Date().toISOString()
    };

    const { error } = await supabase.from("profiles").upsert(payload);

    if (error) {
      setStatus(error.message);
    } else {
      setStatus("Profile saved.");
    }

    setSaving(false);
  }

  if (loading) {
    return (
      <section className="card">
        <p>Loading profile...</p>
      </section>
    );
  }

  return (
    <section className="card">
      <h2>Profile Settings</h2>
      <p className="muted">{user.email}</p>

      <form onSubmit={saveProfile}>
        <label>
          Display Name
          <input
            type="text"
            value={profile.display_name}
            onChange={(event) => updateField("display_name", event.target.value)}
            placeholder="Your display name"
          />
        </label>

        <label>
          Username
          <input
            type="text"
            value={profile.username}
            onChange={(event) => updateField("username", event.target.value)}
            placeholder="@nakaru"
          />
        </label>

        <label>
          Avatar Image URL
          <input
            type="url"
            value={profile.avatar_url}
            onChange={(event) => updateField("avatar_url", event.target.value)}
            placeholder="https://..."
          />
        </label>

        <label>
          Banner Image URL
          <input
            type="url"
            value={profile.banner_url}
            onChange={(event) => updateField("banner_url", event.target.value)}
            placeholder="https://..."
          />
        </label>

        <label>
          Bio
          <textarea
            value={profile.bio}
            onChange={(event) => updateField("bio", event.target.value)}
            placeholder="Tell the community who you are..."
            rows={5}
          />
        </label>

        <button className="primaryButton" type="submit" disabled={saving}>
          {saving ? "Saving..." : "Save Profile"}
        </button>
      </form>

      {status && <p className="message">{status}</p>}

      <div className="profilePreview">
        {profile.banner_url && <img src={profile.banner_url} alt="Profile banner preview" />}
        <div>
          {profile.avatar_url && <img className="avatar" src={profile.avatar_url} alt="Avatar preview" />}
          <h3>{profile.display_name || "Display Name"}</h3>
          <p>{profile.username || "@username"}</p>
          <p>{profile.bio || "Your bio will appear here."}</p>
        </div>
      </div>
    </section>
  );
}
