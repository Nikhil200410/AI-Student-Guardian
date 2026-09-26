// otp.js
// Handles generating and checking one-time codes. Codes are hashed with
// bcrypt before being stored — same principle as password hashing — so
// that anyone who reads the database can't see valid codes directly.

const bcrypt = require("bcryptjs");
const { randomInt } = require("crypto");

const OTP_LENGTH = 6;
const OTP_EXPIRY_MINUTES = Number(process.env.OTP_EXPIRY_MINUTES || 10);
const MAX_ATTEMPTS = 5;
const SALT_ROUNDS = 10;
const OTP_MAX_EXCLUSIVE = 10 ** OTP_LENGTH; // 1,000,000 for a 6-digit code

function generateOtp() {
  // Random 6-digit code, e.g. "042917" (leading zeros allowed and kept).
  // Uses crypto.randomInt (a cryptographically secure RNG), not Math.random,
  // since Math.random() is predictable and unsafe for anything security-sensitive
  // like a login code.
  const code = randomInt(0, OTP_MAX_EXCLUSIVE).toString().padStart(OTP_LENGTH, "0");
  return code;
}

async function hashOtp(code) {
  return bcrypt.hash(code, SALT_ROUNDS);
}

async function verifyOtpHash(code, hash) {
  return bcrypt.compare(code, hash);
}

function getExpiryTimestamp() {
  return new Date(Date.now() + OTP_EXPIRY_MINUTES * 60 * 1000);
}

module.exports = {
  OTP_LENGTH,
  OTP_EXPIRY_MINUTES,
  MAX_ATTEMPTS,
  generateOtp,
  hashOtp,
  verifyOtpHash,
  getExpiryTimestamp,
};
