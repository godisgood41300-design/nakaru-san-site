import handler from "./_handler.js";

export default function presence(req, res) {
  req.query = { ...(req.query || {}), path: ["presence"] };
  return handler(req, res);
}
