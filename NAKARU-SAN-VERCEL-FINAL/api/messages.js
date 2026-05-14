import handler from "./_handler.js";

export default function messages(req, res) {
  req.query.path = ["messages"];
  return handler(req, res);
}
