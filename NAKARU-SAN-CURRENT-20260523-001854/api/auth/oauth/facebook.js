import handler from "../../_handler.js";

export default function facebookOAuth(req, res) {
  req.query = { ...(req.query || {}), path: ["auth", "oauth", "facebook"] };
  return handler(req, res);
}
