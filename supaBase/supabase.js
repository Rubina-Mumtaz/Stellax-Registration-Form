// ============================================
// Supabase Client Configuration
// Initializes the Supabase client and exposes
// it globally as window.supabaseClient.
// (Form logic lives in JS/script.js)
// ============================================

const SUPABASE_URL = 'https://cqquvlkxoqduxtvmcjzc.supabase.co';
const SUPABASE_KEY = 'sb_publishable_JoPIcMNiUVfI3ME_BCCvlg_mFxhD5BS';

// Create the Supabase client.
// This script must load AFTER the Supabase CDN script
// so that the global `supabase` object is available.
window.supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);
