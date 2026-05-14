import handler from "../_handler.js";

export default function me(req, res) {
  req.query = { ...(req.query || {}), path: ["auth", "me"] };
  return handler(req, res);
}
