export default function status(req, res) {
  const proto = req.headers["x-forwarded-proto"] || "https";
  const baseUrl = process.env.APP_BASE_URL || `${proto}://${req.headers.host || "nakaru-san.com"}`;
  const providers = {
    google: ["GOOGLE_CLIENT_ID", "GOOGLE_CLIENT_SECRET"],
    facebook: ["FACEBOOK_CLIENT_ID", "FACEBOOK_CLIENT_SECRET"],
    instagram: ["INSTAGRAM_CLIENT_ID", "INSTAGRAM_CLIENT_SECRET"],
    twitter: ["X_CLIENT_ID"]
  };
  const oauth = Object.fromEntries(
    Object.entries(providers).map(([provider, keys]) => [
      provider,
      {
        configured: keys.every((key) => Boolean(process.env[key] || (provider === "twitter" && process.env.TWITTER_CLIENT_ID))),
        missing: keys.filter((key) => !process.env[key] && !(provider === "twitter" && key === "X_CLIENT_ID" && process.env.TWITTER_CLIENT_ID)),
        redirectUri: `${baseUrl}/api/auth/oauth/${provider}/callback`
      }
    ])
  );

  return res.status(200).json({
    ok: true,
    appBaseUrl: baseUrl,
    supabaseConfigured: Boolean(process.env.SUPABASE_URL && (process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SECRET_KEY)),
    googleSearchConfigured: Boolean(process.env.GOOGLE_API_KEY && process.env.GOOGLE_CX),
    oauth
  });
}
