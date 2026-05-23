import handler from "../../../_handler.js";

export default function twitterOAuthCallback(req, res) {
  req.query = { ...(req.query || {}), path: ["auth", "oauth", "twitter", "callback"] };
  return handler(req, res);
}
