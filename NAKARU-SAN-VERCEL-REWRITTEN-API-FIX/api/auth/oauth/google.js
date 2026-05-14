import handler from "../../_handler.js";

export default function googleOAuth(req, res) {
  req.query = { ...(req.query || {}), path: ["auth", "oauth", "google"] };
  return handler(req, res);
}
