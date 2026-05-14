import handler from "./_handler.js";

export default function dm(req, res) {
  req.query.path = ["dm"];
  return handler(req, res);
}
