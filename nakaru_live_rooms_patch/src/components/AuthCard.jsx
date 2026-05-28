import { useState } from "react";
import { supabase } from "../lib/supabaseClient.js";

export default function AuthCard() {
  const [mode, setMode] = useState("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);

  const isSignup = mode === "signup";

  async function handleSubmit(event) {
    event.preventDefault();
    setBusy(true);
    setMessage("");

    try {
      if (isSignup) {
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: { data: { display_name: displayName } }
        });

        if (error) throw error;

        if (data.user) {
          await supabase.from("profiles").upsert({
            id: data.user.id,
            email,
            display_name: displayName,
            username: "",
            bio: "",
            avatar_url: "",
            banner_url: ""
          });
        }

        setMessage("Account created. Check your email if confirmation is enabled.");
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        setMessage("Signed in.");
      }
    } catch (error) {
      setMessage(error.message || "Something went wrong.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="card authCard">
      <h2>{isSignup ? "Create Account" : "Sign In"}</h2>
      <p className="muted">Email and password login. Broken social login buttons are intentionally removed.</p>

      <form onSubmit={handleSubmit}>
        {isSignup && (
          <label>
            Display Name
            <input value={displayName} onChange={(event) => setDisplayName(event.target.value)} placeholder="Nakaru" />
          </label>
        )}

        <label>
          Email
          <input type="email" value={email} onChange={(event) => setEmail(event.target.value)} required />
        </label>

        <label>
          Password
          <input type="password" minLength={6} value={password} onChange={(event) => setPassword(event.target.value)} required />
        </label>

        <button className="primaryButton" type="submit" disabled={busy}>
          {busy ? "Please wait..." : isSignup ? "Sign Up" : "Sign In"}
        </button>
      </form>

      {message && <p className="message">{message}</p>}

      <button className="linkButton" onClick={() => setMode(isSignup ? "signin" : "signup")}>
        {isSignup ? "Already have an account? Sign in." : "Need an account? Sign up."}
      </button>
    </section>
  );
}
