// jwt.js
// Wraps jsonwebtoken so the rest of the app just calls signToken/verifyToken
// and never touches process.env.JWT_SECRET directly.

const jwt = require("jsonwebtoken");

const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || "7d";

function signToken(payload) {
  return jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });
}

function verifyToken(token) {
  // Throws if invalid/expired — callers should try/catch.
  return jwt.verify(token, process.env.JWT_SECRET);
}

module.exports = { signToken, verifyToken };
