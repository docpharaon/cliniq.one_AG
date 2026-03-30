# cliniq.one — Future Plans & Enhancements

## 🔜 Branding & Trust

### Custom Supabase Domain for OAuth
- **Priority:** Medium
- **Effort:** ~30 minutes
- **Requires:** Supabase Pro plan ($25/month)
- **Goal:** Replace `uabbndansgxpvogteyxc.supabase.co` with `auth.cliniq.one` on the Google OAuth consent screen for a professional, branded sign-in experience.
- **Steps:**
  1. Go to Supabase Dashboard → Project Settings → Custom Domains
  2. Add custom domain: `auth.cliniq.one`
  3. Add DNS CNAME record: `auth.cliniq.one → uabbndansgxpvogteyxc.supabase.co`
  4. Verify domain in Supabase Dashboard
  5. Update Google Cloud Console OAuth redirect URIs to use `auth.cliniq.one`
  6. Update `EXPO_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_URL` env vars across all apps
