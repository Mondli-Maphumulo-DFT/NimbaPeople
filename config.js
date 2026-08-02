// ============================================================
// Nimba People — per-client instance config
// Load this BEFORE the main app script in index.html:
//   <script src="config.js"></script>
// One copy of this file per client deployment (Netlify site).
// ============================================================

window.NIMBA_CONFIG = {
  COMPANY_NAME:      "Construct",  // TODO: replace with client's trading name
  SUPABASE_URL:      "https://dzcboraxecitjhlxpppt.supabase.co",
  SUPABASE_ANON_KEY: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImR6Y2JvcmF4ZWNpdGpobHhwcHB0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODU2Nzc5MzIsImV4cCI6MjEwMTI1MzkzMn0.hTMaqd_Q1P8VdQzj5NXaI-rZzcCt6zQGEkTnkPliwnA",   // public by design
  ADMIN_EMAIL:       "mondliwes@gmail.com",  // interim — swap to client HR at handover (with the nimba_config UPDATE)
  ANNUAL_LEAVE_DAYS: 15,
  CURRENCY:          "ZAR",
  // Branding (optional)
  THEME_COLOR:       "#1a3a5c",
  LOGO_URL:          ""
};

// In index.html, replace the hardcoded constants with:
//   const sb = supabase.createClient(NIMBA_CONFIG.SUPABASE_URL, NIMBA_CONFIG.SUPABASE_ANON_KEY);
//   const ADMIN_EMAIL = NIMBA_CONFIG.ADMIN_EMAIL;
//   const ANNUAL_LEAVE_DAYS = NIMBA_CONFIG.ANNUAL_LEAVE_DAYS;
// Note: keep the RLS-side admin check (nimba_config table) as the source
// of truth — this value only drives UI (showing/hiding admin tabs).
