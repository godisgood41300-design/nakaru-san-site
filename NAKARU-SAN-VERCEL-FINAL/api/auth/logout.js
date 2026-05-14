import handler from "../_handler.js";

export default function logout(req, res) {
  req.query.path = ["auth", "logout"];
  return handler(req, res);
}
