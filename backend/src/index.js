// index.js
// This is the entrypoint: it creates the Express app, wires up middleware
// and routes, and starts the server listening on a port.

require("dotenv").config();
const express = require("express");
const cors = require("cors");
const cookieParser = require("cookie-parser");

const profileRoutes = require("./routes/profile.routes");
// Old custom OTP auth (auth.routes.js) is retired — Supabase Auth now
// owns signup/login/verification/reset. Its files are intentionally left
// on disk, unused, pending your local verification before deletion (see
// implementation report) rather than deleted sight-unseen.
const authSessionRoutes = require("./routes/authSession.routes");
const educationRoutes = require("./routes/education.routes");
const goalsRoutes = require("./routes/goals.routes");
const skillCategoriesRoutes = require("./routes/skillCategories.routes");
const skillsRoutes = require("./routes/skills.routes");
const interestsRoutes = require("./routes/interests.routes");
const preferencesRoutes = require("./routes/preferences.routes");
const availabilityRoutes = require("./routes/availability.routes");
const hobbiesRoutes = require("./routes/hobbies.routes");
const digitalTwinRoutes = require("./routes/digitalTwin.routes");
const { pool } = require("./db");

const app = express();

// --- Middleware ---
// credentials: true + an explicit origin (not "*") are both required for the
// browser to send/receive the httpOnly auth cookie across origins.
app.use(
  cors({
    origin: process.env.CORS_ORIGIN || "http://localhost:5173",
    credentials: true,
  })
);
app.use(express.json()); // lets us read JSON request bodies as req.body
app.use(cookieParser()); // lets us read cookies as req.cookies

// --- Routes ---

// Health check: confirms the server is running AND can reach the database.
app.get("/api/health", async (req, res) => {
  try {
    await pool.query("SELECT 1");
    res.json({ status: "ok", database: "connected" });
  } catch (err) {
    console.error("Health check DB error:", err);
    res.status(500).json({ status: "error", database: "unreachable" });
  }
});

app.use("/api/auth", authSessionRoutes);
app.use("/api/profile", profileRoutes);
app.use("/api/education", educationRoutes);
app.use("/api/goals", goalsRoutes);
app.use("/api/skill-categories", skillCategoriesRoutes);
app.use("/api/skills", skillsRoutes);
app.use("/api/interests", interestsRoutes);
app.use("/api/preferences", preferencesRoutes);
app.use("/api/availability", availabilityRoutes);
app.use("/api/hobbies", hobbiesRoutes);
app.use("/api/digital-twin", digitalTwinRoutes);

// Catch-all for unknown routes
app.use((req, res) => {
  res.status(404).json({ error: `No route for ${req.method} ${req.originalUrl}` });
});

// Generic error handler (catches anything thrown/passed to next(err))
app.use((err, req, res, next) => {
  console.error("Unhandled error:", err);
  res.status(500).json({ error: "Internal server error" });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`AI Student Guardian backend running on http://localhost:${PORT}`);
});
