import handler from "../../_handler.js";

export default function twitterOAuth(req, res) {
  req.query = { ...(req.query || {}), path: ["auth", "oauth", "twitter"] };
  return handler(req, res);
}
