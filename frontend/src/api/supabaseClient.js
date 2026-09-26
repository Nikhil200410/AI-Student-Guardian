// supabaseClient.js
// Used ONLY for direct Supabase actions: signUp, signInWithPassword,
// signOut, resetPasswordForEmail, updateUser, and handling the
// email-link callback session. persistSession: false is deliberate — we
// never want Supabase's tokens sitting in localStorage. Immediately after
// any of these calls succeeds, the resulting tokens are handed to
// POST /api/auth/session so they live only in httpOnly cookies from then on.

import { createClient } from "@supabase/supabase-js";

export const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_ANON_KEY,
  {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      // Deliberately false: with persistSession disabled, automatic URL
      // detection is unreliable to depend on. AuthCallback.jsx and
      // ResetPasswordPage.jsx instead call exchangeCodeForSession()
      // explicitly, which is predictable and testable on its own.
      detectSessionInUrl: false,
    },
  }
);
