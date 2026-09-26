// auth.middleware.js
// Protects routes: reads the JWT from the httpOnly cookie, verifies it,
// and attaches req.userId for the controller to use. If anything's wrong,
// it stops the request with 401 before it reaches the controller.

const { verifyToken } = require("../utils/jwt");

function requireAuth(req, res, next) {
  const token = req.cookies?.token;
  if (!token) {
    return res.status(401).json({ error: "Not logged in." });
  }

  try {
    const payload = verifyToken(token);
    req.userId = payload.userId;
    next();
  } catch (err) {
    return res.status(401).json({ error: "Session expired or invalid. Please log in again." });
  }
}

module.exports = { requireAuth };
