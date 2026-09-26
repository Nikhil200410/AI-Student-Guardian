// auth.controller.js
// Implements the two-step OTP flow:
//   1. POST /request-otp  { email }         -> emails a 6-digit code
//   2. POST /verify-otp   { email, code }   -> checks it, logs the user in
//
// "Logging in" here means: find or create a `users` row for that email,
// sign a JWT containing their user id, and set it as an httpOnly cookie.

const db = require("../db");
const { signToken } = require("../utils/jwt");
const {
  generateOtp,
  hashOtp,
  verifyOtpHash,
  getExpiryTimestamp,
  MAX_ATTEMPTS,
} = require("../utils/otp");
const { sendOtpEmail } = require("../utils/email");

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const RESEND_COOLDOWN_SECONDS = 60;

function isProduction() {
  return process.env.NODE_ENV === "production";
}

function cookieOptions() {
  return {
    httpOnly: true,
    secure: isProduction(), // only require HTTPS in production
    sameSite: "lax",
    maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days, matches JWT_EXPIRES_IN default
  };
}

// POST /api/auth/request-otp
async function requestOtp(req, res) {
  const email = (req.body.email || "").trim().toLowerCase();
  if (!EMAIL_REGEX.test(email)) {
    return res.status(400).json({ error: "A valid email is required." });
  }

  try {
    // Cooldown: don't let someone spam-send OTPs to the same address.
    const recent = await db.query(
      `SELECT created_at FROM otp_codes
       WHERE email = $1
       ORDER BY created_at DESC
       LIMIT 1`,
      [email]
    );
    if (recent.rows.length > 0) {
      const secondsSinceLast = (Date.now() - new Date(recent.rows[0].created_at).getTime()) / 1000;
      if (secondsSinceLast < RESEND_COOLDOWN_SECONDS) {
        return res.status(429).json({
          error: `Please wait ${Math.ceil(RESEND_COOLDOWN_SECONDS - secondsSinceLast)}s before requesting another code.`,
        });
      }
    }

    const code = generateOtp();
    const codeHash = await hashOtp(code);
    const expiresAt = getExpiryTimestamp();

    await db.query(
      `INSERT INTO otp_codes (email, code_hash, expires_at) VALUES ($1, $2, $3)`,
      [email, codeHash, expiresAt]
    );

    await sendOtpEmail(email, code);

    return res.json({ message: "Code sent. Check your email." });
  } catch (err) {
    console.error("requestOtp error:", err);
    return res.status(500).json({ error: "Could not send the code. Please try again." });
  }
}

// POST /api/auth/verify-otp
async function verifyOtp(req, res) {
  const email = (req.body.email || "").trim().toLowerCase();
  const code = (req.body.code || "").trim();

  if (!EMAIL_REGEX.test(email) || !code) {
    return res.status(400).json({ error: "Email and code are required." });
  }

  try {
    const { rows } = await db.query(
      `SELECT id, code_hash, attempts, expires_at FROM otp_codes
       WHERE email = $1
       ORDER BY created_at DESC
       LIMIT 1`,
      [email]
    );

    if (rows.length === 0) {
      return res.status(400).json({ error: "No code was requested for this email." });
    }

    const otpRow = rows[0];

    if (new Date(otpRow.expires_at) < new Date()) {
      return res.status(400).json({ error: "This code has expired. Request a new one." });
    }

    if (otpRow.attempts >= MAX_ATTEMPTS) {
      return res.status(429).json({ error: "Too many incorrect attempts. Request a new code." });
    }

    const isValid = await verifyOtpHash(code, otpRow.code_hash);
    if (!isValid) {
      await db.query(`UPDATE otp_codes SET attempts = attempts + 1 WHERE id = $1`, [otpRow.id]);
      return res.status(400).json({ error: "Incorrect code." });
    }

    // Correct code — consume it so it can't be reused.
    await db.query(`DELETE FROM otp_codes WHERE id = $1`, [otpRow.id]);

    // Find or create the user.
    let userResult = await db.query(`SELECT id, email FROM users WHERE email = $1`, [email]);
    let user;
    if (userResult.rows.length === 0) {
      const inserted = await db.query(
        `INSERT INTO users (email) VALUES ($1) RETURNING id, email`,
        [email]
      );
      user = inserted.rows[0];
    } else {
      user = userResult.rows[0];
    }

    const token = signToken({ userId: user.id });
    res.cookie("token", token, cookieOptions());

    return res.json({ user });
  } catch (err) {
    console.error("verifyOtp error:", err);
    return res.status(500).json({ error: "Could not verify the code. Please try again." });
  }
}

// POST /api/auth/logout
function logout(req, res) {
  res.clearCookie("token", cookieOptions());
  return res.status(204).send();
}

// GET /api/auth/me
async function me(req, res) {
  try {
    const { rows } = await db.query(`SELECT id, email FROM users WHERE id = $1`, [req.userId]);
    if (rows.length === 0) {
      return res.status(401).json({ error: "User not found." });
    }
    return res.json({ user: rows[0] });
  } catch (err) {
    console.error("me error:", err);
    return res.status(500).json({ error: "Something went wrong." });
  }
}

module.exports = { requestOtp, verifyOtp, logout, me };
