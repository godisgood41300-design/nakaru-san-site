import handler from "../../../_handler.js";

export default function facebookOAuthCallback(req, res) {
  req.query = { ...(req.query || {}), path: ["auth", "oauth", "facebook", "callback"] };
  return handler(req, res);
}
