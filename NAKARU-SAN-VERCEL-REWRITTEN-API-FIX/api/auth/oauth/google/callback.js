import handler from "../../../_handler.js";

export default function googleOAuthCallback(req, res) {
  req.query = { ...(req.query || {}), path: ["auth", "oauth", "google", "callback"] };
  return handler(req, res);
}
