import handler from "./_handler.js";

export default function status(req, res) {
  req.query = { ...(req.query || {}), path: ["status"] };
  return handler(req, res);
}
