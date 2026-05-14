import handler from "./_handler.js";

export default function feed(req, res) {
  req.query = { ...(req.query || {}), path: ["feed"] };
  return handler(req, res);
}
