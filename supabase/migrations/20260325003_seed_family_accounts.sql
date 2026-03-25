-- ══════════════════════════════════════════════════════════════
-- 20260325003_seed_family_accounts.sql
-- Seed accounts for family & friends testing
-- Auth users MUST be created first via Supabase CLI (see below)
-- ══════════════════════════════════════════════════════════════
--
-- Run these Supabase CLI commands BEFORE applying this migration:
--
-- npx supabase auth admin create-user --email momen@cliniq.one --password Cliniq2026! --user-metadata '{"full_name":"Momen Pharaon"}'
-- npx supabase auth admin create-user --email mohd@cliniq.one --password Cliniq2026! --user-metadata '{"full_name":"Mohd Pharaon"}'
-- npx supabase auth admin create-user --email mazen@cliniq.one --password Cliniq2026! --user-metadata '{"full_name":"Mazen Noor"}'
-- npx supabase auth admin create-user --email moustafa@cliniq.one --password Cliniq2026! --user-metadata '{"full_name":"Moustafa Mohdalsaeed"}'
-- npx supabase auth admin create-user --email sawsan@cliniq.one --password Cliniq2026! --user-metadata '{"full_name":"Sawsan Yasmin"}'
-- npx supabase auth admin create-user --email noor@cliniq.one --password Cliniq2026! --user-metadata '{"full_name":"Noor Majzoub"}'
-- npx supabase auth admin create-user --email mulham@cliniq.one --password Cliniq2026! --user-metadata '{"full_name":"Mulham Ahmadsultan"}'

-- ══════════════════════════════════════════════════════════════
-- 1. ADMIN + DOCTOR: Dr. Momen Pharaon (Dermatology)
-- ══════════════════════════════════════════════════════════════
INSERT INTO public.users (id, email, phone, nickname, year_of_birth, gender, country, city, language, role, status, tokens_balance, onboarding_completed, legal_accepted_at)
SELECT
  au.id,
  'momen@cliniq.one',
  '+971501234001',
  'Dr. Momen',
  1988,
  'male',
  'UAE',
  'Abu Dhabi',
  'en',
  'admin',       -- admin role (also a doctor)
  'active',
  500,
  true,
  now()
FROM auth.users au WHERE au.email = 'momen@cliniq.one'
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.doctors (user_id, full_name, display_name, license_number, license_authority, specialty, sub_specialty, years_experience, languages, hospital, city, bio, status, daily_limit, is_accepting, identifier_code, doctor_type, sandbox_mode)
SELECT
  u.id,
  'Dr. Momen Pharaon',
  'Dr. Momen',
  'DHA-DERM-2024-001',
  'Dubai Health Authority',
  'dermatology',
  'Cosmetic Dermatology',
  12,
  ARRAY['en', 'ar'],
  'Cleveland Clinic Abu Dhabi',
  'Abu Dhabi',
  'Board-certified dermatologist specializing in medical and cosmetic dermatology. Fellow of the American Academy of Dermatology. Special interest in acne, psoriasis, and skin cancer screening.',
  'active',
  15,
  true,
  'DR-MP01',
  'permanent',
  false
FROM public.users u WHERE u.email = 'momen@cliniq.one'
ON CONFLICT (user_id) DO NOTHING;

-- ══════════════════════════════════════════════════════════════
-- 2. DOCTOR: Dr. Mohd Pharaon (Family Medicine)
-- ══════════════════════════════════════════════════════════════
INSERT INTO public.users (id, email, phone, nickname, year_of_birth, gender, country, city, language, role, status, tokens_balance, onboarding_completed, legal_accepted_at)
SELECT
  au.id,
  'mohd@cliniq.one',
  '+971501234002',
  'Dr. Mohd',
  1991,
  'male',
  'UAE',
  'Dubai',
  'en',
  'doctor',
  'active',
  200,
  true,
  now()
FROM auth.users au WHERE au.email = 'mohd@cliniq.one'
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.doctors (user_id, full_name, display_name, license_number, license_authority, specialty, sub_specialty, years_experience, languages, hospital, city, bio, status, daily_limit, is_accepting, identifier_code, doctor_type, sandbox_mode)
SELECT
  u.id,
  'Dr. Mohd Pharaon',
  'Dr. Mohd',
  'DHA-FM-2024-002',
  'Dubai Health Authority',
  'family_medicine',
  'Internal Medicine',
  8,
  ARRAY['en', 'ar'],
  'Mediclinic City Hospital',
  'Dubai',
  'Experienced family medicine physician with a focus on chronic disease management, preventive health, and adolescent medicine. Passionate about holistic patient care.',
  'active',
  20,
  true,
  'DR-MP02',
  'permanent',
  false
FROM public.users u WHERE u.email = 'mohd@cliniq.one'
ON CONFLICT (user_id) DO NOTHING;

-- ══════════════════════════════════════════════════════════════
-- 3. PATIENT: Mazen Noor
-- ══════════════════════════════════════════════════════════════
INSERT INTO public.users (id, email, phone, nickname, year_of_birth, gender, country, city, language, role, status, tokens_balance, onboarding_completed, legal_accepted_at)
SELECT
  au.id,
  'mazen@cliniq.one',
  '+971551234003',
  'Mazen',
  1995,
  'male',
  'UAE',
  'Sharjah',
  'ar',
  'patient',
  'active',
  50,
  true,
  now()
FROM auth.users au WHERE au.email = 'mazen@cliniq.one'
ON CONFLICT (id) DO NOTHING;

-- ══════════════════════════════════════════════════════════════
-- 4. PATIENT: Moustafa Mohdalsaeed
-- ══════════════════════════════════════════════════════════════
INSERT INTO public.users (id, email, phone, nickname, year_of_birth, gender, country, city, language, role, status, tokens_balance, onboarding_completed, legal_accepted_at)
SELECT
  au.id,
  'moustafa@cliniq.one',
  '+971551234004',
  'Moustafa',
  1992,
  'male',
  'UAE',
  'Abu Dhabi',
  'ar',
  'patient',
  'active',
  30,
  true,
  now()
FROM auth.users au WHERE au.email = 'moustafa@cliniq.one'
ON CONFLICT (id) DO NOTHING;

-- ══════════════════════════════════════════════════════════════
-- 5. PATIENT: Sawsan Yasmin
-- ══════════════════════════════════════════════════════════════
INSERT INTO public.users (id, email, phone, nickname, year_of_birth, gender, country, city, language, role, status, tokens_balance, onboarding_completed, legal_accepted_at)
SELECT
  au.id,
  'sawsan@cliniq.one',
  '+971551234005',
  'Sawsan',
  1998,
  'female',
  'UAE',
  'Dubai',
  'ar',
  'patient',
  'active',
  40,
  true,
  now()
FROM auth.users au WHERE au.email = 'sawsan@cliniq.one'
ON CONFLICT (id) DO NOTHING;

-- ══════════════════════════════════════════════════════════════
-- 6. PATIENT: Noor Majzoub
-- ══════════════════════════════════════════════════════════════
INSERT INTO public.users (id, email, phone, nickname, year_of_birth, gender, country, city, language, role, status, tokens_balance, onboarding_completed, legal_accepted_at)
SELECT
  au.id,
  'noor@cliniq.one',
  '+971551234006',
  'Noor',
  2000,
  'female',
  'UAE',
  'Ajman',
  'en',
  'patient',
  'active',
  25,
  true,
  now()
FROM auth.users au WHERE au.email = 'noor@cliniq.one'
ON CONFLICT (id) DO NOTHING;

-- ══════════════════════════════════════════════════════════════
-- 7. PATIENT: Mulham Ahmadsultan
-- ══════════════════════════════════════════════════════════════
INSERT INTO public.users (id, email, phone, nickname, year_of_birth, gender, country, city, language, role, status, tokens_balance, onboarding_completed, legal_accepted_at)
SELECT
  au.id,
  'mulham@cliniq.one',
  '+971551234007',
  'Mulham',
  1993,
  'male',
  'UAE',
  'Ras Al Khaimah',
  'ar',
  'patient',
  'active',
  35,
  true,
  now()
FROM auth.users au WHERE au.email = 'mulham@cliniq.one'
ON CONFLICT (id) DO NOTHING;

-- ══════════════════════════════════════════════════════════════
-- Give all patients initial token grants
-- ══════════════════════════════════════════════════════════════
INSERT INTO public.token_transactions (user_id, type, amount, balance_after, description)
SELECT u.id, 'bonus', 50, 50, 'Welcome bonus — beta testing'
FROM public.users u
WHERE u.email IN ('mazen@cliniq.one', 'moustafa@cliniq.one', 'sawsan@cliniq.one', 'noor@cliniq.one', 'mulham@cliniq.one')
ON CONFLICT DO NOTHING;
