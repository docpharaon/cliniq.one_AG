# cliniq.one — Comprehensive Platform Documentation

> **Version:** 1.0 · **Generated:** 2026-03-21
> AI-powered telemedicine platform connecting patients with doctors through intelligent medical intake, specialty routing, and structured clinical consultations.

---

## Table of Contents

1. [Platform Overview](#1-platform-overview)
2. [Patient App](#2-patient-app)
3. [Doctor App](#3-doctor-app)
4. [Doctor Web Portal](#4-doctor-web-portal)
5. [Admin Dashboard](#5-admin-dashboard)
6. [Shared Packages](#6-shared-packages)
7. [Backend — Supabase](#7-backend--supabase)
8. [AI Integration Deep Dive](#8-ai-integration-deep-dive)
9. [Data Flows & Business Logic](#9-data-flows--business-logic)

---

## 1. Platform Overview

### 1.1 Architecture

cliniq.one is a **Turborepo monorepo** comprising four applications, five shared packages, and a Supabase backend:

```
cliniq.one ag/
├── apps/
│   ├── patient/          # Expo / React Native — Mobile + Web
│   ├── doctor/           # Expo / React Native — Mobile + Web
│   ├── doctor-web/       # Next.js — Web Portal
│   └── admin/            # Next.js — Admin Dashboard
├── packages/
│   ├── api/              # Supabase client & data layer
│   ├── config/           # Shared constants
│   ├── i18n/             # Internationalization (EN/AR)
│   ├── types/            # TypeScript type definitions
│   └── ui/               # Shared components & design tokens
├── supabase/
│   ├── functions/        # Edge Functions (Deno)
│   └── migrations/       # Database schema
└── turbo.json            # Build orchestration
```

### 1.2 Technology Stack

| Layer | Technology |
|-------|-----------|
| **Patient & Doctor Mobile** | Expo SDK, React Native, Expo Router (file-based routing) |
| **Doctor & Admin Web** | Next.js (App Router), React, Tailwind CSS |
| **State Management** | Zustand (patient), React Query (@tanstack/react-query) |
| **Backend** | Supabase (PostgreSQL, Auth, Storage, Edge Functions, Realtime) |
| **AI** | OpenAI GPT-4o-mini via Supabase Edge Functions |
| **Identity Verification** | Sumsub KYC SDK |
| **Auth** | Supabase Auth (email/password + Google OAuth) |
| **Payments** | Token-based economy (Apple IAP + Google Play Billing) |
| **Languages** | TypeScript throughout, Deno for edge functions |

### 1.3 Design System

- **Theme:** Dark mode primary, glassmorphism accents
- **Colors:** Teal (`#00D4AA`) accent, dark backgrounds, consistent status color mapping
- **Typography:** Inter font family, shared typography scale
- **Shared tokens:** `colors`, `spacing`, `typography`, `radius`, `shadows` from `@cliniqone/ui`
- **Bilingual:** Full Arabic (RTL) + English support with locale-aware formatting

---

## 2. Patient App

**Tech:** Expo / React Native · **File:** `apps/patient/` · **~30 screens**

### 2.1 Auth Flow

| Screen | File | Description |
|--------|------|-------------|
| **Landing** | `(auth)/landing.tsx` (9KB) | App entry with branding, sign-in and sign-up buttons, animated logo |
| **Login** | `(auth)/login.tsx` (11KB) | Email/password login + **Google OAuth** via `@react-native-google-signin`. Includes **RBAC validation** — verifies the authenticated user has role `patient` in the `users` table; immediately signs out non-patients with an error message |
| **Sign Up** | `(auth)/signup.tsx` (15KB) | Email + phone + nickname registration. Creates Supabase Auth user, then inserts a `users` row with **100 token welcome bonus**, `role: 'patient'`, `language: 'en'`, `onboarding_completed: false` |
| **Forgot Password** | `(auth)/forgot-password.tsx` (6KB) | Calls `supabase.auth.resetPasswordForEmail` and shows confirmation |
| **Verify Email** | `(auth)/verify-email.tsx` (9KB) | Email confirmation status checking and resend functionality |
| **Personal Details** | `(auth)/personal-details.tsx` (23KB) | Collects year of birth, gender (male/female/prefer not to say), country, city. Updates `users` table and marks `onboarding_completed: true` |
| **Welcome** | `(auth)/welcome.tsx` (6KB) | Post-signup success screen with CTA to start first consultation |
| **Legal** | `(auth)/legal.tsx` (6KB) | Terms of Service, Privacy Policy, and **AI Disclosure** acceptance. Calls `acceptLegalTerms()` which stamps `legal_accepted_at` |

**UI/UX:** Dark-theme forms with teal accent buttons, input fields with `bgTertiary` backgrounds, form validation with inline error messages, password visibility toggle.

**State:** `authStore.ts` (Zustand) — holds `user` (full User object), `session` (Supabase session), `isLoading`. Persists session across restarts.

---

### 2.2 Onboarding

| Screen | File | Description |
|--------|------|-------------|
| **Splash** | `splash.tsx` (6KB) | Animated splash with app logo, checks auth state, routes to onboarding or tabs |
| **Onboarding** | `onboarding.tsx` (6KB) | **3-slide FlatList carousel** with animated pagination dots. Slides: 🤖 AI Intake, 👨‍⚕️ Licensed Doctors, 📋 Easy Tracking. Stored in `AsyncStorage` as `onboarding_complete`. Skip button available |

**UI/UX:** Full-screen slides with large emoji icons in colored circles, animated dot indicator (width interpolation from 8→24px for active dot), "Get Started" button on final slide.

---

### 2.3 Main Tab Bar (4 tabs)

#### 2.3.1 Home Dashboard — `(tabs)/index.tsx` (21KB)

**Layout (top to bottom):**
1. **Greeting row** — personalized "Hello, {name}" + language toggle button (🇬🇧 ↔ 🇸🇦)
2. **Active consultation banner** — shown when any consultation is in `submitted`, `assigned`, or `in_progress` status. Taps navigate to waiting room. Pulsing blue dot indicator
3. **Token balance card** — large teal number with unit label + "Buy Tokens" pill button
4. **Start Consultation CTA** — teal-accented card with stethoscope emoji, navigates to `/intake`
5. **Quick Actions grid** — 5 items in 2-column layout: New Consultation, View History, My Tests, Buy Tokens, Help
6. **Recent Consultations** — last 3 from live API (React Query, 30s stale time), each shows complaint + date + status badge with emoji + color. "View All" link if >3 exist
7. **Health Tips** — horizontal scrolling cards (💧 Hydrate, 🚶 Stay Active, 😴 Sleep Well)
8. **Quick Info** — 2-column: response time (⏱️) and consultation cost (💰)

**Logic:**
- `useConsultations(userId)` hook fetches from `consultations` table, ordered by `created_at DESC`
- Pull-to-refresh via `RefreshControl`
- Language toggle triggers app restart via `expo-updates`

#### 2.3.2 Consultations Tab — `(tabs)/consultations.tsx` (15KB)

**Content:** Full scrollable list of all patient consultations with status filtering, search, and pull-to-refresh.

**9 consultation statuses** (each with unique color + emoji):
| Status | Emoji | Color |
|--------|-------|-------|
| `draft` | 📝 | Gray |
| `intake_in_progress` | 🤖 | Teal |
| `pending_payment` | 💳 | Yellow |
| `submitted` | 📧 | Blue |
| `assigned` | 👨‍⚕️ | Dark teal |
| `in_progress` | 🔄 | Blue |
| `report_ready` | 📋 | Purple |
| `completed` | ✅ | Green |
| `cancelled` | ❌ | Red |

Tapping a consultation navigates to `/consultation/[id]`.

#### 2.3.3 Wallet Tab — `(tabs)/wallet.tsx` (15KB)

**Layout:**
1. **Balance card** — large 52px teal number, glow effect overlay, "Buy Tokens" button
2. **Quick stats row** — 3 cards: total spent, total earned (bonuses), total purchased
3. **Token Packages** — 3-card row from `TOKEN_PACKAGES` constant:
   - Basic: 3 tokens / $9.99 / 37.49 SAR
   - **Standard (Popular):** 7 tokens / $19.99 / 74.99 SAR — highlighted with teal border + "Popular" badge
   - Premium: 15 tokens / $39.99 / 149.99 SAR
4. **Transaction History** — filterable (All / Purchases / Spent / Earned / Bonuses) with type-specific icons (💰/🩺/⭐/↩️/🎁/🔑) and color-coded amounts (green for credit, red for debit)

**Logic:** `useTokenHistory(userId)` hook fetches from `token_transactions` table, 60s stale time. Falls back to mock data if empty.

#### 2.3.4 Profile Tab — `(tabs)/profile.tsx` (22KB)

User profile display with avatar, nickname, email, phone, country, city. Insurance info section. Navigation links to all settings screens.

---

### 2.4 Intake Flow — AI Medical Interview

This is the **core patient experience** — an AI-driven medical intake interview that replaces traditional forms.

| Screen | File | Purpose |
|--------|------|---------|
| **Intake Home** | `intake/index.tsx` (14KB) | Launcher screen: checks if chatbot is admin-enabled, shows AI disclaimer banner, detects existing in-progress session (offers resume or start new), specialty selection |
| **Complaint** | `intake/complaint.tsx` (5KB) | Free-text chief complaint entry |
| **AI Chat** | `intake/ai-chat.tsx` (82KB, 2046 lines) | **Full AI interview** — see [Section 8](#8-ai-integration-deep-dive) for complete detail |
| **Allergies** | `intake/allergies.tsx` (9KB) | Manual allergy input (legacy fallback when AI chat is disabled) |
| **Medications** | `intake/medications.tsx` (9KB) | Manual medication input (legacy fallback) |
| **Questions** | `intake/questions.tsx` (8KB) | Structured Q&A form (legacy fallback) |
| **Review** | `intake/review.tsx` (18KB) | Pre-submission summary displaying AI-generated clinical summary, medications, allergies, attached photos |
| **Submit** | `intake/submit.tsx` (6KB) | Final submission: deducts tokens via `deduct_tokens` RPC, transitions status to `submitted`, enters doctor queue |
| **Analyzing** | `intake/analyzing.tsx` (4KB) | Loading animation displayed while AI generates the final clinical summary |
| **Report Chat** | `intake/report-chat.tsx` (12KB) | Post-intake conversational follow-up with the AI |

**State Management — `intakeStore.ts` (Zustand, 221 lines):**

The intake store holds 30+ fields tracking the entire interview state:

```
sessionId, specialty, chiefComplaint, photos[],
messages[] (ChatMessage), currentSection (legacy), progressPercent,
isAiTyping, protocolFlags[], gibberishCount,
lastFailedMessage, aiErrorType,
sequenceNodes[], currentNodeIndex, activePathway,
qaHistory[] ({question, answer}),
aiSummary, patientAddendum,
medications[], allergies[]
```

**Session Persistence:**
- `buildSnapshot()` captures the full store state + local state (conversationHistory, sectionTurnCount)
- Auto-saved to `consultations.ai_entities` column after every AI turn
- On re-entry, `getActiveIntakeSession(patientId)` retrieves and `restoreFromSnapshot()` restores the full state
- Session cleanup via `deleteIntakeSession()` on completion or explicit discard

---

### 2.5 Consultation Detail

| Screen | File | Description |
|--------|------|-------------|
| **Detail View** | `consultation/[id].tsx` (22KB) | Complete consultation display: doctor info (name, specialty, hospital, rating), AI summary with structured sections, prescription list with medication details, patient education, warning signs, follow-up info, attached photos. **Realtime status updates** via `subscribeToConsultation()` |
| **Waiting Room** | `consultation/waiting-room.tsx` (13KB) | Live 4-step progress stepper: Submitted → Assigned → In Review → Report Ready. Each step has animated dot (spring animation), active step has pulsing teal glow. Shows estimated wait time (2–N hours), rotating health tips (5 tips on 8s interval). On completion: 🎉 "Report Ready" with CTA. **Supabase Realtime** subscription for instant status changes |
| **Feedback** | `consultation/feedback.tsx` (6KB) | 1–5 star doctor rating with optional comment text field. Submitted to `doctor_ratings` table |
| **Intervention Booking** | `consultation/intervention-booking.tsx` (14KB) | Patient-side view of doctor-ordered interventions. Shows ordered lab tests, imaging, referrals with cost estimates, provider selection, and scheduling |

---

### 2.6 Settings

| Screen | File | Description |
|--------|------|-------------|
| **Edit Profile** | `settings/edit-profile.tsx` (10KB) | Update nickname, phone, city, country. Calls `updateUserProfile()` |
| **Language** | `settings/language.tsx` (6KB) | EN/AR toggle. Persists to `users.language` + i18n locale. Triggers app restart |
| **Security** | `settings/security.tsx` (8KB) | Password change form |
| **Insurance** | `settings/insurance.tsx` (10KB) | Insurance provider name + policy number entry |
| **Notifications** | `settings/notifications.tsx` (5KB) | Push notification preferences toggle |
| **Help** | `settings/help.tsx` (5KB) | FAQ list and support contact |
| **Privacy & Terms** | `settings/privacy-terms.tsx` (7KB) | Legal documents viewer |
| **Verify Identity** | `settings/verify-identity.tsx` (11KB) | **KYC via Sumsub SDK.** Calls `kyc-token` edge function to get access token, launches Sumsub native SDK. Status tracked as `KycStatus`: not_started → pending → approved/rejected/resubmission_requested/exempt |
| **Delete Account** | `settings/delete-account.tsx` (7KB) | Confirmation flow + calls `delete-account` edge function for complete data removal |

---

### 2.7 Key Components

| Component | File | Detail |
|-----------|------|--------|
| **SkinPhotoCapture** | `components/SkinPhotoCapture.tsx` (17KB) | Camera interface with overlay guides for skin condition photography. Supports multi-photo capture, local URI management, integrates with intake store via `addPhoto()` |
| **TokenPurchaseModal** | `components/TokenPurchaseModal.tsx` (8KB) | Bottom-sheet modal displaying 3 purchase tiers with Apple IAP product IDs (`com.cliniqone.tokens.basic/standard/premium`) and Google Play IDs (`tokens_basic/standard/premium`) |
| **PhotoUpload** | `components/PhotoUpload.tsx` (6KB) | Generic image picker utility |
| **DisclaimerBanner** | `components/DisclaimerBanner.tsx` (1.6KB) | Yellow/amber banner: "AI is not a substitute for in-person medical care" |
| **ErrorBoundary** | `components/ErrorBoundary.tsx` (3.8KB) | Crash recovery UI with error details and retry button |
| **ToastProvider** | `components/ToastProvider.tsx` (5KB) | Animated slide-in toast notifications with success/error/info variants |

---

### 2.8 Services

| Service | File | Purpose |
|---------|------|---------|
| **AI Service** | `services/aiService.ts` (435 lines) | 7 AI action callers (`analyzeConcern`, `generateQuestion`, `checkSection`, `analyzeQA`, `detectMedication`, `chatWithSequence`, `chatSection`), sequence fetching (`fetchDefaultSequence`), chatbot status checks, protocol config loading. Includes timeout (25s) + retry (1x) logic via `callAI<T>()` generic wrapper |
| **Protocol Detection** | `services/protocolDetection.ts` (381 lines) | Client-side safety system. See [Section 8.4](#84-safety--quality-systems) for full documentation |
| **Google Auth** | `services/googleAuth.ts` (3KB) | `@react-native-google-signin` configuration and helper |
| **Notifications** | `services/notifications.ts` (4KB) | Expo push notification token registration and incoming notification handling |

---

## 3. Doctor App

**Tech:** Expo / React Native · **File:** `apps/doctor/` · **~10 screens**

### 3.1 Auth

| Screen | File | Description |
|--------|------|-------------|
| **Login** | `(auth)/login.tsx` (7KB) | Email/password with RBAC validation (must be `doctor` role). Checks `must_change_password` flag |
| **Forgot Password** | `(auth)/forgot-password.tsx` (4KB) | Password reset via email |
| **Change Password** | `(auth)/change-password.tsx` (8KB) | Forced on first login when `must_change_password: true` |

### 3.2 Dashboard Tabs

| Tab | File | Description |
|-----|------|-------------|
| **Home** | `(tabs)/index.tsx` (10KB) | Dashboard stats: pending consultations count, today's completed, average rating, total earned tokens |
| **Queue** | `(tabs)/queue.tsx` (12KB) | Live queue of assigned consultations. Filters by status, specialty. Claim/release actions. Shows patient complaint preview + priority badge |
| **Analytics** | `(tabs)/analytics.tsx` (12KB) | Charts: consultations over time, average response time, rating distribution, earnings |
| **Profile** | `(tabs)/profile.tsx` (10KB) | Doctor profile: full name, display name, specialty, sub-specialty, license, hospital, city, years experience, rating (avg + count), avatar |
| **Settings** | `(tabs)/settings.tsx` (9KB) | `is_accepting` toggle (availability), daily consultation limit, notification preferences |

### 3.3 Consultation Screens

| Screen | File | Description |
|--------|------|-------------|
| **Detail** | `consultation/[id].tsx` (13KB) | Full consultation view: patient demographics, chief complaint, AI summary (structured: HPI, PMH, medications, allergies, assessment, Dx), attached photos, protocol flags. Action buttons: Respond, Order Interventions |
| **Respond** | `consultation/respond.tsx` (24KB) | **6-section structured medical response form** (detailed below) |
| **Intervention Order** | `consultation/intervention-order.tsx` (27KB) | **Specialty-specific intervention catalog** (detailed below) |

#### Respond Screen — Clinical Response Form

The doctor response form is divided into 6 structured sections:

**1. 🔬 Clinical Assessment**
- Primary Diagnosis (required) — free text
- ICD-10 Code — e.g., "L25.1"
- Differential Diagnoses — multiline
- Clinical Reasoning — multiline explanation

**2. 💊 Treatment Plan**
- **Pharmacologic** — dynamic medication list (add/remove). Each medication captures:
  - Drug name, Strength, Form (default: "Cream"), Quantity, Sig (directions), Duration
  - "Add to Prescription" toggle per medication
- **Non-Pharmacologic** — free text (e.g., "Cool compresses, avoid irritants")

**3. 📖 Patient Education**
- About Your Condition — plain-language explanation
- What to Expect — timeline and course
- Prevention Tips

**4. 🚨 Warning Signs & Follow-Up**
- Red Flag Symptoms — 5 checkboxes: Fever >38.5°C, Rapid spread, Difficulty breathing, Severe swelling, Worsening despite treatment
- Follow-Up Recommendation — free text

**5. 📝 Additional Notes** — Optional clinical notes

**6. 🧪 Suggest Interventions** — Links to intervention catalog for the consultation's specialty

**Actions:** Preview Patient View (modal), Save Draft, **Submit & Generate E-Prescription** (generates structured report + prescription JSON, updates consultation status to `report_ready`)

#### Intervention Order Screen

**Specialty-based catalog with pre-populated interventions:**

**Dermatology interventions (13 items):**
| Name | Type | Category | Est. Cost (SAR) |
|------|------|----------|----------------|
| Skin Biopsy | lab_test | Dermatopathology | 450 |
| Patch Testing | lab_test | Allergy | 600 |
| Skin Prick Test | lab_test | Allergy | 350 |
| CBC | lab_test | Hematology | 80 |
| IgE Total | lab_test | Immunology | 120 |
| Fungal Culture | lab_test | Microbiology | 180 |
| ANA | lab_test | Immunology | 200 |
| Dermoscopy | imaging | Dermatoscopy | 200 |
| Wood's Lamp | imaging | Dermatoscopy | 150 |
| Cryotherapy | therapy | Procedural | 300 |
| Phototherapy (UV) | therapy | Light Therapy | 250 |
| Excision | referral | Surgery | 800 |
| Follow-up | follow_up | Follow-up | 150 |

**Family Medicine interventions (14 items):** CBC, CMP, Lipid Panel, HbA1c, Thyroid Panel, Urinalysis, Vitamin D, Iron Studies, Chest X-Ray, Abdominal US, ECG, Cardiology Referral, GI Referral, Follow-up.

Each includes patient instructions (e.g., "Fast for 12 hours before test"), insurance pre-auth status tracking, and provider assignment.

---

## 4. Doctor Web Portal

**Tech:** Next.js (App Router) · **File:** `apps/doctor-web/` · **Middleware:** Auth-protected routes with role verification

### 4.1 Pages

| Page | Path | Description |
|------|------|-------------|
| Login | `/login` | Web-based doctor authentication |
| Forgot Password | `/forgot-password` | Password reset |
| Reset Password | `/reset-password` | Token-based reset completion |
| **Dashboard** | `/dashboard` (16KB) | Overview stats, pending queue count, recent activity |
| Queue | `/dashboard/queue` | Web version of consultation queue with table view |
| Consultations | `/dashboard/consultations` | Searchable/filterable consultation list |
| Consultation Detail | `/dashboard/consultation/[id]` | Full consultation view with response actions |
| Analytics | `/dashboard/analytics` | Charts and metrics |
| Schedule | `/dashboard/schedule` | Weekly availability management |
| Notifications | `/dashboard/notifications` | Notification center |
| Profile | `/dashboard/profile` | Profile editing |
| Settings | `/dashboard/settings` | Preferences |

### 4.2 Components

| Component | File | Purpose |
|-----------|------|---------|
| **DoctorSidebar** | `DoctorSidebar.tsx` (8KB) | Navigation sidebar with active route highlighting, doctor avatar, collapsible |
| **InterventionOrderForm** | `InterventionOrderForm.tsx` (16KB) | Web version of intervention ordering with specialty catalog |
| **Header** | `Header.tsx` (3KB) | Top header with breadcrumbs, notifications bell, profile avatar |
| **StatCard** | `StatCard.tsx` (1.4KB) | Reusable stat display card |
| **StatusBadge** | `StatusBadge.tsx` (2.3KB) | Colored consultation status badge |
| **Toast** | `Toast.tsx` (3.8KB) | Slide-in notification toast |

---

## 5. Admin Dashboard

**Tech:** Next.js (App Router) · **File:** `apps/admin/` · **16 dashboard sections, 14 components**

### 5.1 Dashboard Sections

| Section | Path | Description |
|---------|------|-------------|
| **Overview** | `/dashboard` (19KB) | Platform-wide stats: total users, doctors, consultations, revenue. Live activity feed, system health |
| **AI Management** | `/dashboard/ai` (88KB!) | **Full AI prompt & sequence management** — see [Section 8.5](#85-admin-ai-management-tools) |
| **Consultations** | `/dashboard/consultations` | All consultations with advanced filtering, status management, assignment |
| **Doctors** | `/dashboard/doctors` | Doctor CRUD: add, verify, suspend, set daily limits, review credentials |
| **Users** | `/dashboard/users` | Patient management: view profiles, KYC review, token grants, account actions |
| **Protocols** | `/dashboard/protocols` (5KB) | Protocol configuration panel: manage emergency keywords, refusal detection, escalation rules |
| **Interventions** | `/dashboard/interventions` | Intervention order management, provider oversight |
| **Scheduling** | `/dashboard/scheduling` | Doctor schedule slot management across the platform |
| **Pricing** | `/dashboard/pricing` | Token package configuration, consultation cost management |
| **Tokens** | `/dashboard/tokens` | Manual token grants, transaction audit, balance adjustments |
| **KYC** | `/dashboard/kyc` | Identity verification queue — Sumsub review integration |
| **Analytics** | `/dashboard/analytics` | Platform metrics, charts, export |
| **News** | `/dashboard/news` | Bilingual article management (title/content in EN + AR), publishing workflow |
| **Ads** | `/dashboard/ads` | Advertisement management with placement targeting (dashboard/consultation/profile), impression/click tracking |
| **HR** | `/dashboard/hr` | Staff management |
| **Errors** | `/dashboard/errors` | Error report triage: categories (chat/payment/UI/other), status tracking (open → investigating → resolved/dismissed) |
| **Settings** | `/dashboard/settings` | Platform settings: OpenAI API key, model selection, temperature, chatbot version, feature flags |

### 5.2 Key Components

| Component | Size | Purpose |
|-----------|------|---------|
| **ChatTestWindow** | 165KB | Full AI simulation sandbox. Tests prompts in **draft mode** (unpublished). Simulated patient conversations with full prompt resolution, violation tracking, response inspection, version display. Admin can test changes before publishing to patients |
| **SequenceBuilderContent** | 84KB | Visual interview sequence editor. **Drag-and-drop** node reordering. Features: pathway conditions (dermatology vs family_medicine), gender conditions (male/female-only nodes), prompt assignment per node, set as default/active sequence. Controls the entire patient interview flow |
| **PromptEditorModal** | 44KB | Prompt CRUD with **draft ↔ active lifecycle**. Create/edit prompt content, name, type (`system`/`intake`/`summary`/`suggestion`/`global_guard`). Version tracking. Preview in ChatTestWindow before publishing |
| **DoctorDetailPanel** | 34KB | Full doctor management: profile editing, status transitions (pending → active → probation → limited → suspended → inactive), credential verification, daily limit adjustment, rating history |
| **ConsultationDetailPanel** | 30KB | Deep consultation inspection: full AI summary display, chat log review, protocol flag analysis, status transitions, doctor assignment |
| **PatientDetailPanel** | 25KB | Patient management: profile view, KYC status management, token balance display, consultation history, account actions |
| **ChatReportsPanel** | 23KB | AI conversation log analysis. Filter by date range, patient, status. Review complete AI transcripts, flag issues, analyze bot performance |
| **AddDoctorModal** | 24KB | Doctor onboarding wizard: email, full name, display name, specialty, sub-specialty, license number + authority, hospital, city, languages, experience years |
| **ScheduleSlotModal** | 15KB | Weekly schedule editor: day-of-week selection, start/end time, active toggle |
| **DataTable** | 8KB | Reusable paginated, searchable, sortable data table component |
| **Sidebar** | 7KB | Admin navigation sidebar with 16 sections, active highlighting, collapsible |
| **Header** | 2.8KB | Top header: page title, admin name, logout |
| **StatCard** | 1.5KB | Dashboard statistics display card |
| **StatusBadge** | 2.3KB | Consultation status pill badge |

---

## 6. Shared Packages

### 6.1 `@cliniqone/api` — Data Layer

**File:** `packages/api/src/` · 7 modules

| Module | File | Exports |
|--------|------|---------|
| **Client** | `client.ts` (1.6KB) | `supabase` client singleton, `safeFetch()` wrapper with timeout + retry + error handling |
| **Auth** | `auth.ts` (6KB) | `signUp`, `signIn`, `signOut`, `resetPassword`, `getSession`, `getCurrentUserRole`, `getUserProfile`, `updateUserProfile`, `acceptLegalTerms`, `signInWithGoogle`, `requestKycToken` |
| **Consultations** | `consultations.ts` (8.5KB) | `getConsultations`, `getConsultation` (with doctor join), `createConsultation` (with token deduction via RPC), `getMessages`, `sendMessage`, `getTokenHistory`, **`saveIntakeSession`**, **`getActiveIntakeSession`**, **`deleteIntakeSession`**, **`subscribeToConsultation`** (Realtime), **`subscribeToMessages`** (Realtime) |
| **Doctor** | `doctor.ts` (6.4KB) | Doctor-specific queries: queue, consultation claims, report submission, intervention ordering |
| **Admin** | `admin.ts` (13.5KB) | Admin CRUD operations: doctors, users, consultations, prompts, sequences, settings |
| **Async** | `async.ts` (3.9KB) | `safeFetch()` implementation — wraps Supabase calls with configurable timeout, retry count, error label |
| **Index** | `index.ts` (1.6KB) | Re-exports all modules |

### 6.2 `@cliniqone/config` — Constants

Shared configuration: consultation status labels, max wait hours, consultation cost mappings.

### 6.3 `@cliniqone/i18n` — Internationalization

| Export | Purpose |
|--------|---------|
| `t(key, params?)` | Translation function with parameter interpolation |
| `getLocale()` | Returns current locale: `'en'` or `'ar'` |
| `setLocale(locale)` | Persists locale choice to AsyncStorage |
| `toLocalNum(n)` | Converts numbers to **Arabic-Indic numerals** (٠١٢٣٤٥٦٧٨٩) when locale is `ar` |
| `localDate(isoString)` | Formats dates using locale-appropriate format |

**Locale files:** `locales/en.json` and `locales/ar.json` with 200+ translation keys covering all screens.

### 6.4 `@cliniqone/types` — Type Definitions

**File:** `packages/types/src/index.ts` (553 lines, 20+ entity types)

| Type | Key Fields |
|------|-----------|
| `User` | id, email, phone, nickname, year_of_birth, gender, country, city, language, role, status, tokens_balance, insurance_*, onboarding_completed, kyc_status/applicant_id/verified_at/rejection_reason, legal_accepted_at |
| `Doctor` | user_id, full_name, display_name, license_number/authority, specialty, sub_specialty, years_experience, languages[], hospital, city, status (6 levels), daily_limit, rating_avg/count, tokens_earned, is_accepting, must_change_password |
| `Consultation` | patient_id, doctor_id, specialty, **status** (9 values), priority, chief_complaint, ai_summary, ai_entities, token_cost, payment_method, report, prescription, protocol_flags[], follow_up_id |
| `Message` | consultation_id, sender_id, sender_role, content, message_type, metadata |
| `TokenTransaction` | user_id, type (purchase/spend/earn/refund/bonus/admin_grant), amount, balance_after, description |
| `AISession` | consultation_id, round_number, questions[], answers[], entities_extracted |
| `ProtocolLog` | consultation_id, patient_id, protocol_code (A-I), severity, trigger_text, action_taken, resolved |
| `DoctorRating` | consultation_id, patient_id, doctor_id, rating (1-5), comment |
| `TokenPackage` | name, tokens, price_usd, price_sar, apple_product_id, google_product_id |
| `DoctorSchedule` | doctor_id, day_of_week (0-6), start_time, end_time, is_active |
| `NewsArticle` | title/title_ar, content/content_ar, image_url, category, is_published |
| `Advertisement` | title, image_url, link_url, placement (dashboard/consultation/profile), start/end_date, impressions, clicks |
| `ErrorReport` | user_id, category (chat/payment/UI/other), description, screenshot_url, status (4 levels), admin_notes |
| `AIPromptTemplate` | name, specialty, prompt_type, content, is_active, version |
| `PlatformSetting` | key, value, description, updated_by |
| `Intervention` | consultation_id, patient_id, doctor_id, type (6 types), **status** (9 levels), priority, title, description, clinical_indication, category, specific_test, instructions, doctor_notes, provider_id, scheduled_at, costs (estimated/actual in SAR), insurance_pre_auth_required/status, results_url/summary |
| `ServiceProvider` | name/name_ar, type, address/address_ar, city, lat/lng, phone/email/website, operating_hours, rating, insurance_accepted[], services_offered[], home_collection_available |
| `ServiceCatalogItem` | category, subcategory, name/name_ar, type, sample_required, fasting_required, avg_cost_sar, avg_turnaround_days |

**Constants also exported:**
- `TOKEN_PACKAGES` — 3 purchase tiers with Apple/Google product IDs
- `CONSULTATION_COSTS` — new: 3, follow_up: 1, refill: 1, multi_specialty: 5
- `SPECIALTY_INTERVENTIONS` — dermatology (13) + family_medicine (14) catalogs
- `INTERVENTION_TYPE_LABELS` / `INTERVENTION_STATUS_LABELS` — bilingual labels with colors
- `LAB_TEST_CATEGORIES`, `IMAGING_CATEGORIES`, `REFERRAL_SPECIALTIES`

### 6.5 `@cliniqone/ui` — Design System

**Exports:** `Card`, `Button` components + design tokens (`colors`, `spacing`, `typography`, `radius`, `shadows`).

- Dark theme with teal accent color system
- Card variants: default, outlined
- Button variants: primary (teal), outline, ghost. Sizes: sm, md, lg
- Shadow utilities including `shadows.glow(color)` for active state effects

---

## 7. Backend — Supabase

### 7.1 Edge Functions

| Function | File | Purpose |
|----------|------|---------|
| **`ai-intake`** | `supabase/functions/ai-intake/index.ts` (879 lines) | All AI operations — see [Section 8](#8-ai-integration-deep-dive) |
| **`delete-account`** | `supabase/functions/delete-account/` | Complete user data deletion: removes from `users`, `consultations`, `messages`, `token_transactions`, Supabase Auth |
| **`kyc-token`** | `supabase/functions/kyc-token/` | Generates Sumsub SDK access tokens for KYC. Creates or retrieves existing applicant for the authenticated user |
| **`kyc-webhook`** | `supabase/functions/kyc-webhook/` | Receives Sumsub verification callbacks. Updates `users.kyc_status`, `kyc_verified_at`, `kyc_rejection_reason` |

### 7.2 Database Schema (Key Tables)

| Table | Purpose |
|-------|---------|
| `users` | Patient/doctor/admin profiles with auth, tokens, insurance, KYC, legal status |
| `doctors` | Doctor professional profiles: license, specialty, rating, availability |
| `consultations` | Core entity: tracks consultation lifecycle through 9 status stages, stores AI summary + entities |
| `messages` | Chat messages between patient/doctor/system within a consultation |
| `token_transactions` | Full token economy audit trail (purchase/spend/earn/refund/bonus/admin_grant) |
| `ai_prompts` | Version-controlled AI prompt templates with draft/active lifecycle |
| `prompt_sequences` | Interview flow definitions (which sequence is default/active) |
| `prompt_sequence_nodes` | Individual nodes within a sequence: step_key, prompt assignment, sort order, pathway/gender conditions |
| `protocol_logs` | Safety event audit trail: protocol code, severity, trigger text, action taken |
| `platform_settings` | Key-value configuration: OpenAI settings, chatbot version, feature flags, protocol keywords |
| `doctor_schedules` | Weekly availability slots per doctor |
| `doctor_ratings` | Patient feedback: 1-5 star ratings + comments |
| `interventions` | Doctor-ordered tests, imaging, referrals with full lifecycle tracking |
| `service_providers` | Lab, imaging center, specialist directory with geolocation, insurance, services |
| `service_catalog` | Available tests/procedures with bilingual names, cost estimates, turnaround times |
| `news_articles` | Bilingual health articles for patient dashboard |
| `advertisements` | Ad placements with impression/click tracking |
| `error_reports` | User-reported issues with admin triage workflow |

### 7.3 Realtime Subscriptions

Two realtime channels are used for live updates:

1. **Consultation status** — `subscribeToConsultation(id, onUpdate)` listens for `UPDATE` events on the `consultations` table, filtered by consultation ID. Used in the waiting room for instant status transitions.

2. **New messages** — `subscribeToMessages(consultationId, onMessage)` listens for `INSERT` events on the `messages` table, filtered by consultation ID. Used for live doctor-patient messaging.

Both use Supabase's `postgres_changes` channel with filters.

### 7.4 RPC Functions

- **`deduct_tokens(p_user_id, p_amount, p_consultation_id)`** — Atomic token deduction with balance verification. Creates a `token_transactions` record and updates `users.tokens_balance`.

---

## 8. AI Integration Deep Dive

### 8.1 Architecture

```
┌─────────────┐     ┌──────────────────┐     ┌──────────────┐
│ Patient App │     │ Supabase Edge Fn │     │  OpenAI API  │
│ (ai-chat.tsx│────▶│ (ai-intake)      │────▶│ GPT-4o-mini  │
│  82KB)      │     │ (879 lines)      │     │              │
└─────────────┘     └────────┬─────────┘     └──────────────┘
                             │
              ┌──────────────┼──────────────┐
              ▼              ▼              ▼
        platform_settings  ai_prompts  prompt_sequences
        (config)           (content)   + nodes (flow)
```

**Key design principle:** Prompt resolution, behavioral rules, and safety checks are all **server-side** in the edge function. The client sends minimal data (section key, prompt ID, conversation history, language) and receives a clean response.

### 8.2 Seven AI Actions

| # | Action | Input | Output | Tokens |
|---|--------|-------|--------|--------|
| 1 | `analyze-concern` | Patient complaint text, language | `{ specialty, category, urgency, keywords[], confidence, reasoning }` | 500 |
| 2 | `generate-question` | Concern, previous Q&A[], section, language | `{ question, options[], type, required, helperText }` | 500 |
| 3 | `check-section` | Section, answers[], concern, language | `{ complete: boolean, nextSection }` | 200 |
| 4 | `analyze-qa` | Full Q&A[], patient info, language | `{ summary, keyFindings[], redFlags[], hpi, pmh, medications[], allergies[], assessment, recommendedSpecialty, priorityLevel, suggestedWorkup[], preliminaryDiagnosis[], recommendedTreatment[], patientEducation[], followUp }` | 2000 |
| 5 | `detect-medication` | Free text | `[{ name, genericName, dose, unit, frequency, route, indication, confidence }]` | 500 |
| 6 | `chat` (legacy) | System prompt, conversation history | `{ response }` | 1000 |
| 7 | **`chat-section`** (primary) | Section, promptId, history[], language, patientContext, mode (draft/active) | `{ response, sectionComplete, addendumDone, violation, promptVersion, chatbotVersion }` | 1000 |

**`chat-section` is the primary action** used by the patient app. It handles:
1. Prompt resolution from database (by promptId)
2. Behavioral suffix injection
3. Section isolation enforcement
4. Language instruction appending
5. Global guard prepending
6. Gibberish pre-check (saves tokens)
7. OpenAI call
8. Post-processing: tag stripping, violation detection, first-turn guard

### 8.3 Prompt Engineering System

#### 8.3.1 Global Guard Prompt
Auto-prepended to **every AI call**. Managed via admin AI page as a `prompt_type: 'global_guard'` prompt. Cached server-side for 60 seconds. Establishes universal behavior rules and safety constraints across all sections.

#### 8.3.2 BEHAVIOR_SUFFIX (Applied to all interview sections)

```
IMPORTANT behavioral rules:
- EVERY message must contain a question
- Do NOT say "Thank you for sharing" or gratitude phrases
- Do NOT use concluding/farewell language
- SINGLE QUESTION: Each message = exactly ONE question
- SECTION COMPLETION: Append [SECTION_COMPLETE] when done
- PRIOR INFORMATION: If context has relevant info, confirm then ask to add
- Accept "no"/"none"/"nothing" and emit [SECTION_COMPLETE]
- Keep responses concise (1-2 sentences + ONE question)
- SKIP HANDLING: Accept "skip"/"next"/"pass" immediately
- Must ask at least ONE question before completing
```

#### 8.3.3 SUMMARY_SUFFIX (Summary section only)

```
- Provide ONLY exhaustive recap of what patient said
- Do NOT include treatment plan, assessment, workup, or diagnosis
- Do NOT add clinical interpretation
- Simply summarize patient's own words organized by section
```

#### 8.3.4 ADDENDUM_SUFFIX (Patient addendum section only)

```
- First message = clinical summary in paragraph format with 12 headings:
  Chief Complaint, HPI, PMH, Medications, Allergies, Family History,
  Social History, Gyn/OB History (if assessed), Review of Systems,
  Clinical Impression, Recommended Specialty, Priority Level
- Ask "Please review - anything to add or clarify?"
- WHEN PATIENT ADDS INFO: Acknowledge, do NOT emit [ADDENDUM_DONE]
- WHEN PATIENT CONFIRMS: Respond briefly + [ADDENDUM_DONE]
- Reject contradictions gracefully
- Only use [ADDENDUM_DONE], never [SECTION_COMPLETE]
```

#### 8.3.5 CONCISE_SECTIONS_SUFFIX (Non-HPI sections)

Applied to: medications, allergies, family_history, social_history, review_of_systems

```
- Keep section SHORT. 1-2 questions max
- Accept "no"/"none"/"nothing" immediately + [SECTION_COMPLETE]
- Do NOT break into sub-topics. Ask ONE comprehensive question
- Example: instead of smoking/alcohol/exercise separately, ask all together
```

#### 8.3.6 Section Isolation

For every non-greeting/pathway/summary section:
```
CRITICAL — NEW SECTION STARTING: This is "[SECTION NAME]".
This is completely new and independent. You MUST NOT skip this
section. If patient already mentioned relevant info, confirm
and ask if anything to add. Must have at least one exchange
before completing.
```

### 8.4 Safety & Quality Systems

#### 8.4.1 Client-Side Protocol Detection (`protocolDetection.ts`)

**9 protocol codes** (A through I, plus O for off-topic):

| Protocol | Trigger | Severity | Action |
|----------|---------|----------|--------|
| **A — Emergency** | 24 EN + 17 AR keywords (chest pain, suicide, seizure, stroke, anaphylaxis, poisoning, head injury, car accident, etc.) | Critical | Immediate emergency UI with GCC hotlines |
| **I — Gibberish** | Vowel ratio <5%, repeated chars (5+), emoji-only, all-caps screaming (30+ chars), single random word (no common bigrams), low vowel single words | Medium → Critical | Progressive escalation |
| **I — Refusal** | 16 EN + 6 AR refusal phrases ("none of your business", "not telling", "skip", "لا أريد أن أقول") | Medium | Counted as strike |
| **I — Repetition** | 3rd identical message in recent buffer | Medium | Counted as strike |

**Progressive Discipline (Escalation Levels):**

| Level | Strike Count | Action |
|-------|-------------|--------|
| None | 0-2 | Normal operation |
| **Warning** | 3+ | Yellow banner: "Please provide clear responses" |
| **Cooldown** | 5+ | Orange banner, **30-second input lockout** with countdown timer |
| **Terminated** | 7+ | Red banner, session ended, logged for staff review |

**Strike Decay:** Each cooperative (non-flagged) message reduces the strike counter by 1, rewarding good behavior.

**Valid Short Answer Whitelist (60+ words):** Bypasses gibberish detection for: hi, ok, yes/no variants (ya, yep, nope, nah), numeric scales 0-10, medical terms (pain, rash, acne, cough), navigation words (skip, next, done), Arabic yes/no (لا, نعم, اي).

**GCC Emergency Numbers:**
| Country | Ambulance | Police | Fire |
|---------|-----------|--------|------|
| Saudi Arabia | 997 | 999 | 998 |
| UAE | 998 | 999 | 997 |
| Kuwait | 112 | 112 | 112 |
| Bahrain | 999 | 999 | 999 |
| Qatar | 999 | 999 | 999 |
| Oman | 9999 | 9999 | 9999 |

#### 8.4.2 Server-Side Safety (Edge Function)

| System | Detail |
|--------|--------|
| **Server gibberish detection** | Mirrors client detection server-side before OpenAI call. Saves tokens on gibberish messages. Tracks consecutive gibberish (3+ triggers escalated response) |
| **Soft redirect detection** | 15+ EN + 8 AR phrases the AI commonly uses to deflect off-topic messages (e.g., "I'm here to help with your medical intake", "أنا هنا لمساعدتك في المقابلة الطبية"). Flagged as `off_topic` violation |
| **Prompt injection protection** | Allowed prefix whitelist: "You are a medical intake AI", "You are a clinical", "You are a warm", "You are a friendly", "Continue the medical". Non-matching prompts get safety wrapper prepended |
| **First-turn guard** | If AI emits `[SECTION_COMPLETE]` on the very first turn of a section (empty history), the flag is stripped. Ensures at least one patient interaction per section |
| **Input validation** | Message truncation at 3000 characters. Conversation history capped at 40 messages (sliding window: keeps first + last N-1) |
| **Global guard caching** | Guard prompt cached for 60 seconds to avoid repeated DB queries |

### 8.5 Admin AI Management Tools

#### 8.5.1 AI Page (`/dashboard/ai` — 88KB)

The admin AI page is the command center for managing the entire AI interview system. It provides:

- **Overview** — active sequence name, chatbot version, enabled/disabled toggle, active model display
- **Prompt Management** — create, edit, version, activate/deactivate prompts
- **Sequence Management** — create, reorder, configure interview sequences
- **Live Testing** — test prompts before publishing to patients
- **Conversation Reports** — review real patient conversations

#### 8.5.2 Prompt Editor Modal (44KB)

- Create new prompts with name, type, and content
- **Draft ↔ Active lifecycle:** Edit prompts in draft mode, preview in ChatTestWindow, then activate to publish
- Version tracking — each edit increments the version number
- Prompt types: `system`, `intake`, `summary`, `suggestion`, `global_guard`

#### 8.5.3 Sequence Builder (84KB)

Visual interview flow editor:
- **Drag-and-drop** node reordering
- Each node has: step_key, label, emoji, prompt assignment (links to ai_prompts)
- **Pathway conditions:** e.g., "only show if pathway = dermatology"
- **Gender conditions:** e.g., "only show for female patients" (for OB/GYN sections)
- Set a sequence as default/active
- Admin-configured `ai_active_sequence_id` in platform_settings determines which sequence patients use

#### 8.5.4 Chat Test Window (165KB)

Full AI simulation sandbox:
- Tests prompts in **draft mode** — changes not visible to patients until activated
- Simulates complete conversation with all behavioral rules applied
- Shows: response text, section completion status, violations detected, prompt version, chatbot version
- Admin can walk through the entire interview flow as if they were a patient
- Useful for validating prompt changes before publishing

#### 8.5.5 Chat Reports Panel (23KB)

- Filter conversations by date range, patient, status
- View complete AI transcripts
- Analyze violations, gibberish counts, protocol events
- Review bot performance metrics

#### 8.5.6 Protocol Configuration

Admin-configurable via `platform_settings`:
- `protocol_emergency_keywords_en` / `_ar` — JSON arrays of keywords
- `protocol_refusal_keywords` — JSON array
- `protocol_escalation_thresholds` — `{ warning: 3, cooldown: 5, terminated: 7 }`
- `protocol_cooldown_seconds` — default 30

### 8.6 Complete Interview Flow

**From the patient's perspective:**

```
Step 1: GREETING
├── AI greets patient warmly, asks what brings them in
├── Patient describes chief complaint
└── Auto-advances to pathway detection

Step 2: PATHWAY DETECTION  
├── AI analyzes complaint → routes to specialty
├── [PATHWAY:derma_single] OR [PATHWAY:family_general]
├── Applicable nodes are recalculated based on pathway
└── Auto-advances to first interview section

Step 3: HPI (History of Present Illness)
├── AI asks about onset, duration, severity, location
├── Multiple turns allowed (max 8)
├── "Skip" button appears after 3 turns
└── [SECTION_COMPLETE] advances to next section

Steps 4-9: Interview Sections (CONCISE rules applied)
├── PMH → Medications → Allergies → Family History
├── Social History → Review of Systems
├── Each: 1-2 questions max, accept "none" immediately
└── Context from previous sections available but NOT used to skip

Step 10: PHOTO CAPTURE (dermatology pathway only)
├── Client-side camera UI (SkinPhotoCapture component)
├── Overlay guides for skin photography
├── Photos stored locally, URIs tracked in intakeStore
└── Skippable

Step 11: SUMMARY
├── Server generates comprehensive clinical summary
├── Uses all conversation history
├── ONLY recaps patient's words — NO diagnosis or treatment
└── Auto-advances to addendum

Step 12: PATIENT ADDENDUM
├── AI presents clinical summary with 12 headings
├── Asks "Anything to add or clarify?"
├── Patient can add info (summary regenerated, max 2x)
├── Patient confirms → [ADDENDUM_DONE]
├── Max 5 turns
└── → Review screen → Submit → Token deduction → Doctor queue
```

### 8.7 Control Tags

| Tag | Emitter | Consumer | Purpose |
|-----|---------|----------|---------|
| `[SECTION_COMPLETE]` | AI response | Edge function → Client | Signals current section has sufficient data; triggers advance to next sequence node |
| `[ADDENDUM_DONE]` | AI response | Edge function → Client | Patient confirmed the clinical summary; interview is complete |
| `[PATHWAY:xxx]` | AI response | Client | Routes to specialty pathway (e.g., `derma_single`, `family_general`). Triggers node recalculation |
| `[ROUTE:xxx]` | AI response | Client (stripped) | Internal routing directive, filtered before display |
| `[NO_RESPONSE_NEEDED]` | AI response | Client (stripped) | Auto-advance marker, filtered before display |
| `[VIOLATION:xxx]` | AI response | Edge function → Client | Protocol violation flag (e.g., `off_topic`, `nonsense`). Counted as a strike |

All tags are **stripped before display** to the patient via `stripInternalTags()`.

### 8.8 OpenAI Configuration

Managed via `platform_settings` table:

| Setting Key | Default | Purpose |
|-------------|---------|---------|
| `openai_api_key` | Env variable fallback | API authentication |
| `openai_model` | `gpt-4o-mini` | Model selection |
| `openai_temperature` | `0.3` | Response randomness (low for clinical consistency) |
| `chatbot_version` | — | Display version for debugging |
| `ai_chatbot_enabled` | `true` | Global kill switch |
| `ai_active_sequence_id` | — | Which prompt sequence patients use |

### 8.9 Bilingual Support

| Aspect | Implementation |
|--------|---------------|
| **Language Detection** | `getLocale()` reads persisted locale from `@cliniqone/i18n` |
| **Prompt Injection** | Arabic: `IMPORTANT: Respond entirely in Arabic (العربية). Use formal Arabic (فصحى) with a warm, patient-friendly tone. Transliterate any medical terms.` English: `IMPORTANT: Respond in English.` |
| **Section Labels** | 14 Arabic translations in `NODE_LABELS_AR_SA` map (e.g., `hpi → 📋 تفاصيل الحالة الحالية`) |
| **Emergency Keywords** | Separate EN (24) and AR (17) keyword lists |
| **Refusal Keywords** | EN (16) and AR (6) phrases |
| **Protocol Messages** | All user-facing messages via `t()` function |
| **Numbers** | `toLocalNum()` converts to Arabic-Indic numerals (٠١٢...) |
| **Dates** | `localDate()` formats with locale-appropriate pattern |

---

## 9. Data Flows & Business Logic

### 9.1 Consultation Lifecycle

```
draft
  │
  ▼
intake_in_progress ─── (AI interview in progress, auto-saved)
  │
  ▼
pending_payment ─── (token balance check)
  │
  ▼
submitted ─── (enters doctor queue)
  │
  ▼
assigned ─── (doctor claims from queue)
  │
  ▼
in_progress ─── (doctor reviewing + writing response)
  │
  ▼
report_ready ─── (response submitted, patient notified)
  │
  ▼
completed ─── (patient viewed report + optional feedback)

cancelled ─── (can happen from any stage)
```

### 9.2 Token Economy

| Event | Tokens | Direction |
|-------|--------|-----------|
| Welcome signup bonus | +100 | Credit |
| New consultation | -3 | Debit |
| Follow-up consultation | -1 | Debit |
| Refill request | -1 | Debit |
| Multi-specialty consultation | -5 | Debit |
| Basic package purchase | +3 | Credit ($9.99 / 37.49 SAR) |
| Standard package purchase | +7 | Credit ($19.99 / 74.99 SAR) |
| Premium package purchase | +15 | Credit ($39.99 / 149.99 SAR) |
| Admin grant | +N | Credit (manual) |
| Refund | +N | Credit |

Token deduction is **atomic** via the `deduct_tokens` PostgreSQL RPC function, ensuring no race conditions.

### 9.3 Doctor Workflow

```
1. Doctor logs in → Queue tab shows pending consultations
2. Doctor claims a consultation → status: assigned
3. Doctor reviews:
   - Patient demographics
   - AI-generated clinical summary
   - Attached photos
   - Protocol flags (if any)
4. Doctor writes response via 6-section form
5. Optionally orders interventions from specialty catalog
6. Submits → auto-generates e-prescription → status: report_ready
7. Patient receives notification → views report
8. Patient submits feedback (1-5 stars + comment)
9. Status: completed
```

### 9.4 KYC Flow

```
1. Patient navigates to Settings > Verify Identity
2. App calls kyc-token edge function → gets Sumsub access token
3. Sumsub SDK launches natively (camera + document capture)
4. User completes verification → Sumsub webhook fires
5. kyc-webhook edge function receives callback
6. Updates users table: kyc_status, kyc_verified_at, or kyc_rejection_reason
7. Status progression: not_started → pending → approved/rejected/resubmission_requested
```

### 9.5 Intervention Flow

```
1. Doctor orders intervention via catalog (e.g., "CBC - Hematology")
2. Intervention created: status=ordered, priority, cost estimate, patient instructions
3. If insurance pre-auth required: status=pending_auth → authorized/denied
4. Patient notified about ordered intervention
5. Patient books with a service provider
6. Status progression: ordered → scheduled → in_progress → completed
7. Results uploaded → status: results_ready
8. Doctor reviews results → status: reviewed
9. Follow-up intervention may be ordered
```

---

*End of Documentation · cliniq.one Platform v1.0*
