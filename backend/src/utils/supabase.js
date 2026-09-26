// supabase.js
// One shared Supabase client, used server-side only to verify tokens
// (getClaims) and to refresh sessions (refreshSession) on the user's
// behalf. Uses the ANON key only — this backend never holds or needs the
// service-role key, since it never calls Supabase's admin API; identity
// lookups happen against our own local `users` table instead.

const { createClient } = require("@supabase/supabase-js");

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_ANON_KEY, {
  auth: {
    // This client is used server-side, per-request, stateless — it must
    // never try to persist or auto-refresh a session of its own.
    persistSession: false,
    autoRefreshToken: false,
  },
});

module.exports = { supabase };
