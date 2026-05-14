import handler from "../../_handler.js";

export default function instagramOAuth(req, res) {
  req.query = { ...(req.query || {}), path: ["auth", "oauth", "instagram"] };
  return handler(req, res);
}
