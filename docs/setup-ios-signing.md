# 🍎 iOS Signing & Codemagic Setup Guide

> **No Mac required** — Codemagic handles code signing automatically via App Store Connect API.

---

## Prerequisites

- ✅ Apple Developer Program enrollment ($99/year) — **DONE**
- [ ] Codemagic account — [Sign up free](https://codemagic.io/signup)
- [ ] App Store Connect API Key
- [ ] App IDs registered in Apple Developer Portal

---

## Step 1: Register App IDs in Apple Developer Portal

Go to [Certificates, Identifiers & Profiles](https://developer.apple.com/account/resources/identifiers/list)

Create **4 App IDs** (type: App):

| App | Bundle ID | Description |
|-----|-----------|-------------|
| Patient | `com.cliniqone.patient.cap` | cliniq.one Patient |
| Doctor | `com.cliniqone.doctor` | cliniq.one Doctor |
| Admin | `com.cliniqone.admin` | cliniq.one Admin |
| Locum | `com.cliniqone.locum` | cliniq.one Locum |

For each:
1. Click **"+"** → Select **"App IDs"** → **"App"**
2. Enter the **Description** and **Bundle ID** (Explicit)
3. Enable capabilities: Push Notifications (if needed)
4. Click **Register**

---

## Step 2: Create App Store Connect API Key

1. Go to [App Store Connect → Users and Access → Integrations → Keys](https://appstoreconnect.apple.com/access/integrations/api)
2. Click **"+"** to generate a new key
3. Name: `Codemagic CI`
4. Access: **App Manager** (minimum for TestFlight uploads)
5. Click **Generate**
6. **Download the `.p8` file** — you can only download it ONCE!
7. Note down:
   - **Issuer ID** (shown at the top of the page)
   - **Key ID** (shown in the table)

---

## Step 3: Set Up Codemagic

### 3a. Connect Repository

1. Go to [codemagic.io](https://codemagic.io) → Sign in with GitHub
2. Click **"Add application"**
3. Select your `cliniq.one AG` repository
4. Choose **"codemagic.yaml"** as the project type
5. Click **"Finish: Add application"**

### 3b. Configure App Store Connect Integration

1. In Codemagic, go to **Teams → Integrations**
2. Under **App Store Connect**, click **"Connect"**
3. Enter:
   - **Issuer ID** — from Step 2
   - **Key ID** — from Step 2
   - **API Private Key** — paste contents of the `.p8` file
4. Name this integration: `codemagic`

### 3c. Add Environment Variable Groups

In Codemagic, go to **Teams → Environment variables** and create two groups:

**Group: `app_store_credentials`** (mark as "Secure"):
| Variable | Value |
|----------|-------|
| `APP_STORE_CONNECT_ISSUER_ID` | Your Issuer ID |
| `APP_STORE_CONNECT_KEY_ID` | Your Key ID |
| `APP_STORE_CONNECT_PRIVATE_KEY` | Contents of `.p8` file |
| `CERTIFICATE_PRIVATE_KEY` | _(Leave empty — Codemagic auto-generates)_ |

**Group: `supabase_credentials`** (mark as "Secure"):
| Variable | Value |
|----------|-------|
| `NEXT_PUBLIC_SUPABASE_URL` | Your Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Your Supabase anon key |
| `EXPO_PUBLIC_SUPABASE_URL` | Same as NEXT_PUBLIC_SUPABASE_URL |
| `EXPO_PUBLIC_SUPABASE_ANON_KEY` | Same as NEXT_PUBLIC_SUPABASE_ANON_KEY |

---

## Step 4: Create Apps in App Store Connect

1. Go to [App Store Connect → My Apps](https://appstoreconnect.apple.com/apps)
2. Click **"+"** → **"New App"**
3. For each app:
   - **Platform**: iOS
   - **Name**: e.g., `cliniq.one`, `cliniq.one Doctor`, etc.
   - **Bundle ID**: Select the one you registered in Step 1
   - **SKU**: e.g., `cliniqone-patient`, `cliniqone-doctor`, etc.
   - **Access**: Full Access
4. Create a **TestFlight beta group** called `Cliniq Testers`

---

## Step 5: Trigger Your First Build

### Option A: Manual Trigger (Recommended for first build)
1. In Codemagic dashboard, select your app
2. Click **"Start new build"**
3. Select branch: `main`
4. Select workflow: e.g., `doctor-ios`
5. Click **"Start new build"**

### Option B: Push to main
Pushing to the `main` branch will auto-trigger all 4 iOS workflows.

---

## Step 6: Install on iPhone via TestFlight

1. After a successful build, the IPA is automatically uploaded to TestFlight
2. On your iPhone, install **[TestFlight](https://apps.apple.com/app/testflight/id899247664)** from the App Store
3. You'll receive an email invite — accept it
4. Open TestFlight → Install the app

---

## Troubleshooting

| Issue | Solution |
|-------|----------|
| **Code signing errors** | Ensure App Store Connect integration is set up correctly in Codemagic |
| **CocoaPods install fails** | Check that `@capacitor/ios` version matches other Capacitor packages |
| **Build timeout** | Increase `max_build_duration` in `codemagic.yaml` |
| **TestFlight not showing** | Ensure the app is created in App Store Connect with matching Bundle ID |
| **First build is slow** | Normal — `npx cap add ios` generates the entire iOS project on first run |

---

## Notes

- **Automatic code signing**: Codemagic manages certificates and provisioning profiles automatically via the App Store Connect API — no need to manually create/export certificates
- **No Mac needed**: Everything runs on Codemagic's Mac mini M2 instances
- **Free tier**: 500 build minutes/month (each build ≈ 10-15 min)
- **The `ios/` directories** are generated by Codemagic during the first build — they don't need to exist in your repo
