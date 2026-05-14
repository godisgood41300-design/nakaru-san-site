import handler from "../_handler.js";

export default function login(req, res) {
  req.query.path = ["auth", "login"];
  return handler(req, res);
}
