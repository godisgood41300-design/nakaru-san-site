import handler from "../../../_handler.js";

export default function instagramOAuthCallback(req, res) {
  req.query = { ...(req.query || {}), path: ["auth", "oauth", "instagram", "callback"] };
  return handler(req, res);
}
