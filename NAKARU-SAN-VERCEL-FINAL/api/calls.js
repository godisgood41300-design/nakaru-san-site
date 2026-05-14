import handler from "./_handler.js";

export default function calls(req, res) {
  req.query.path = ["calls"];
  return handler(req, res);
}
