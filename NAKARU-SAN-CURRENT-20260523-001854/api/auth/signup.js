import handler from "../_handler.js";

export default function signup(req, res) {
  req.query = { ...(req.query || {}), path: ["auth", "signup"] };
  return handler(req, res);
}
