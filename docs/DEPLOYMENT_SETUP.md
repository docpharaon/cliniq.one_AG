# Vercel Deployment Setup

## Required GitHub Secrets

Configure these in your GitHub repo: **Settings → Secrets and Variables → Actions**

| Secret | Description | How to get |
|--------|-------------|------------|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase project URL | Supabase Dashboard → Settings → API |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase anon key | Supabase Dashboard → Settings → API |
| `SUPABASE_ACCESS_TOKEN` | Supabase CLI access token | `npx supabase login` → copy token |
| `SUPABASE_DB_PASSWORD` | Database password | Supabase Dashboard → Settings → Database |
| `SUPABASE_PROJECT_REF` | Project reference ID | `uabbndansgxpvogteyxc` |
| `VERCEL_TOKEN` | Vercel deploy token | [Vercel Tokens](https://vercel.com/account/tokens) |
| `VERCEL_ORG_ID` | Vercel org/team ID | `.vercel/project.json` after `vercel link` |
| `VERCEL_PROJECT_ID_ADMIN` | Admin project ID | `vercel link` in `apps/admin/` |
| `VERCEL_PROJECT_ID_DOCTOR_WEB` | Doctor-web project ID | `vercel link` in `apps/doctor-web/` |

## Vercel Project Linking

Run these once per machine to link Vercel projects:

```bash
# Install Vercel CLI
npm i -g vercel

# Link admin project
cd apps/admin
vercel link
# → Select your team, link to existing or create new project

# Link doctor-web project 
cd ../doctor-web
vercel link

# Get org and project IDs from .vercel/project.json
cat .vercel/project.json
```

## Testing Deployment

```bash
# Test admin build + deploy
cd apps/admin && vercel --prod

# Test doctor-web build + deploy
cd apps/doctor-web && vercel --prod
```

## CI/CD Workflows

| Workflow | Trigger | Action |
|----------|---------|--------|
| `ci.yml` | PR + push to main | Lint → Typecheck → Build → E2E |
| `deploy.yml` | Push to main | Supabase migrations → Vercel deploy → Edge functions |
| `build-apk.yml` | Push to main + manual | Capacitor APK builds (doctor/admin/patient) |
