import handler from "../../../_handler.js";

export default function oauthCallback(req, res) {
  const requestUrl = new URL(req.url || "/", `https://${req.headers.host || "localhost"}`);
  const parts = requestUrl.pathname.split("/").filter(Boolean);
  const provider = req.query?.provider || parts.at(-2);
  req.query = { ...(req.query || {}), path: ["auth", "oauth", provider, "callback"] };
  return handler(req, res);
}
