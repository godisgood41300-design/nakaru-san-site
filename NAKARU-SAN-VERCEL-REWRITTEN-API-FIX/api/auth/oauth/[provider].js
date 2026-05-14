import handler from "../../_handler.js";

export default function oauthProvider(req, res) {
  const requestUrl = new URL(req.url || "/", `https://${req.headers.host || "localhost"}`);
  const provider = req.query?.provider || requestUrl.pathname.split("/").filter(Boolean).at(-1);
  req.query = { ...(req.query || {}), path: ["auth", "oauth", provider] };
  return handler(req, res);
}
