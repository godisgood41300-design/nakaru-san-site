import handler from "./_handler.js";

export default function search(req, res) {
  req.query.path = ["search"];
  return handler(req, res);
}
