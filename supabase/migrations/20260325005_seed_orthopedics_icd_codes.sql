-- ══════════════════════════════════════════════════════════════════
-- Seed: Orthopedics ICD-10 Codes
-- Non-surgical / Conservative Orthopedics + shared with family_medicine
-- ══════════════════════════════════════════════════════════════════

-- Ensure icd_codes table exists (idempotent — safe if 027 already ran)
CREATE EXTENSION IF NOT EXISTS pg_trgm;

CREATE TABLE IF NOT EXISTS public.icd_codes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT NOT NULL UNIQUE,
  description TEXT NOT NULL,
  description_ar TEXT NOT NULL DEFAULT '',
  category TEXT NOT NULL DEFAULT '',
  specialty_tags TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

INSERT INTO public.icd_codes (code, description, description_ar, category, specialty_tags) VALUES

-- ═══════════════════════════════════════════
-- OSTEOARTHRITIS
-- ═══════════════════════════════════════════
('M17.0', 'Primary osteoarthritis of knee, bilateral', 'فصال عظمي أولي في الركبة، ثنائي الجانب', 'Diseases of the musculoskeletal system', '{orthopedics}'),
('M17.11', 'Primary osteoarthritis, right knee', 'فصال عظمي أولي، الركبة اليمنى', 'Diseases of the musculoskeletal system', '{orthopedics,family_medicine}'),
('M17.12', 'Primary osteoarthritis, left knee', 'فصال عظمي أولي، الركبة اليسرى', 'Diseases of the musculoskeletal system', '{orthopedics,family_medicine}'),
('M17.9', 'Osteoarthritis of knee, unspecified', 'فصال عظمي في الركبة غير محدد', 'Diseases of the musculoskeletal system', '{orthopedics,family_medicine}'),
('M16.0', 'Primary osteoarthritis of hip, bilateral', 'فصال عظمي أولي في الورك، ثنائي', 'Diseases of the musculoskeletal system', '{orthopedics}'),
('M16.11', 'Primary osteoarthritis, right hip', 'فصال عظمي أولي، الورك الأيمن', 'Diseases of the musculoskeletal system', '{orthopedics}'),
('M16.12', 'Primary osteoarthritis, left hip', 'فصال عظمي أولي، الورك الأيسر', 'Diseases of the musculoskeletal system', '{orthopedics}'),
('M19.011', 'Primary osteoarthritis, right shoulder', 'فصال عظمي أولي، الكتف الأيمن', 'Diseases of the musculoskeletal system', '{orthopedics}'),
('M19.012', 'Primary osteoarthritis, left shoulder', 'فصال عظمي أولي، الكتف الأيسر', 'Diseases of the musculoskeletal system', '{orthopedics}'),
('M19.90', 'Osteoarthritis, unspecified site', 'فصال عظمي، موقع غير محدد', 'Diseases of the musculoskeletal system', '{orthopedics,family_medicine}'),
('M15.0', 'Primary generalized osteoarthritis', 'فصال عظمي أولي معمم', 'Diseases of the musculoskeletal system', '{orthopedics}'),

-- ═══════════════════════════════════════════
-- SPINE DISORDERS
-- ═══════════════════════════════════════════
('M54.50', 'Low back pain, unspecified', 'ألم أسفل الظهر غير محدد', 'Diseases of the musculoskeletal system', '{orthopedics,family_medicine}'),
('M54.2', 'Cervicalgia (neck pain)', 'ألم الرقبة', 'Diseases of the musculoskeletal system', '{orthopedics,family_medicine}'),
('M54.6', 'Pain in thoracic spine', 'ألم في العمود الفقري الصدري', 'Diseases of the musculoskeletal system', '{orthopedics}'),
('M54.41', 'Lumbago with sciatica, right side', 'ألم قطني مع عرق النسا، الجانب الأيمن', 'Diseases of the musculoskeletal system', '{orthopedics}'),
('M54.42', 'Lumbago with sciatica, left side', 'ألم قطني مع عرق النسا، الجانب الأيسر', 'Diseases of the musculoskeletal system', '{orthopedics}'),
('M47.816', 'Spondylosis without myelopathy, lumbar', 'داء الفقار بدون اعتلال نخاعي، قطني', 'Diseases of the musculoskeletal system', '{orthopedics}'),
('M47.812', 'Spondylosis without myelopathy, cervical', 'داء الفقار بدون اعتلال نخاعي، رقبي', 'Diseases of the musculoskeletal system', '{orthopedics}'),
('M51.16', 'Lumbar disc herniation with radiculopathy', 'انزلاق غضروفي قطني مع اعتلال جذري', 'Diseases of the musculoskeletal system', '{orthopedics}'),
('M51.26', 'Lumbar disc degeneration', 'تنكس القرص القطني', 'Diseases of the musculoskeletal system', '{orthopedics}'),
('M48.06', 'Spinal stenosis, lumbar region', 'تضيق القناة الشوكية، المنطقة القطنية', 'Diseases of the musculoskeletal system', '{orthopedics}'),

-- ═══════════════════════════════════════════
-- SHOULDER DISORDERS
-- ═══════════════════════════════════════════
('M75.10', 'Rotator cuff syndrome, unspecified', 'متلازمة الكفة المدورة غير محددة', 'Diseases of the musculoskeletal system', '{orthopedics}'),
('M75.11', 'Rotator cuff tear/rupture, right shoulder, not traumatic', 'تمزق الكفة المدورة، الكتف الأيمن', 'Diseases of the musculoskeletal system', '{orthopedics}'),
('M75.12', 'Rotator cuff tear/rupture, left shoulder, not traumatic', 'تمزق الكفة المدورة، الكتف الأيسر', 'Diseases of the musculoskeletal system', '{orthopedics}'),
('M75.0', 'Adhesive capsulitis of shoulder (frozen shoulder)', 'التهاب المحفظة اللاصق (الكتف المتجمد)', 'Diseases of the musculoskeletal system', '{orthopedics}'),
('M25.511', 'Pain in right shoulder', 'ألم في الكتف الأيمن', 'Diseases of the musculoskeletal system', '{orthopedics,family_medicine}'),
('M25.512', 'Pain in left shoulder', 'ألم في الكتف الأيسر', 'Diseases of the musculoskeletal system', '{orthopedics,family_medicine}'),
('M75.4', 'Impingement syndrome of shoulder', 'متلازمة الانحشار في الكتف', 'Diseases of the musculoskeletal system', '{orthopedics}'),

-- ═══════════════════════════════════════════
-- TENDINOPATHIES & ENTHESOPATHIES
-- ═══════════════════════════════════════════
('M77.10', 'Lateral epicondylitis (tennis elbow), unspecified', 'التهاب اللقيمة الوحشية (مرفق التنس)', 'Diseases of the musculoskeletal system', '{orthopedics}'),
('M77.00', 'Medial epicondylitis (golfer''s elbow), unspecified', 'التهاب اللقيمة الإنسية (مرفق لاعب الغولف)', 'Diseases of the musculoskeletal system', '{orthopedics}'),
('M76.60', 'Achilles tendinitis, unspecified', 'التهاب وتر أخيل غير محدد', 'Diseases of the musculoskeletal system', '{orthopedics}'),
('M65.4', 'De Quervain tenosynovitis', 'التهاب غمد الوتر لدي كيرفان', 'Diseases of the musculoskeletal system', '{orthopedics}'),
('M72.0', 'Palmar fascial fibromatosis (Dupuytren)', 'تليف اللفافة الراحية (دوبويتران)', 'Diseases of the musculoskeletal system', '{orthopedics}'),
('M76.10', 'Psoas tendinitis, unspecified', 'التهاب وتر العضلة القطنية غير محدد', 'Diseases of the musculoskeletal system', '{orthopedics}'),
('M67.40', 'Ganglion, unspecified site', 'كيس عقدي غير محدد الموقع', 'Diseases of the musculoskeletal system', '{orthopedics}'),

-- ═══════════════════════════════════════════
-- INFLAMMATORY ARTHRITIS & GOUT
-- ═══════════════════════════════════════════
('M10.9', 'Gout, unspecified', 'النقرس غير محدد', 'Diseases of the musculoskeletal system', '{orthopedics,family_medicine}'),
('M10.071', 'Gout, right ankle and foot', 'النقرس، الكاحل والقدم الأيمن', 'Diseases of the musculoskeletal system', '{orthopedics}'),
('M06.9', 'Rheumatoid arthritis, unspecified', 'التهاب المفاصل الروماتويدي غير محدد', 'Diseases of the musculoskeletal system', '{orthopedics,family_medicine}'),
('M45.9', 'Ankylosing spondylitis, unspecified', 'التهاب الفقار اللاصق غير محدد', 'Diseases of the musculoskeletal system', '{orthopedics}'),
('M07.60', 'Psoriatic arthropathy, unspecified', 'اعتلال المفاصل الصدفي غير محدد', 'Diseases of the musculoskeletal system', '{orthopedics}'),

-- ═══════════════════════════════════════════
-- OSTEOPOROSIS
-- ═══════════════════════════════════════════
('M81.0', 'Age-related osteoporosis without fracture', 'هشاشة العظام المرتبطة بالعمر بدون كسر', 'Diseases of the musculoskeletal system', '{orthopedics,family_medicine}'),
('M80.00', 'Age-related osteoporosis with pathological fracture', 'هشاشة العظام مع كسر مرضي', 'Diseases of the musculoskeletal system', '{orthopedics}'),
('M85.80', 'Osteopenia (low bone mass)', 'هشاشة عظام خفيفة (قلة كثافة العظام)', 'Diseases of the musculoskeletal system', '{orthopedics,family_medicine}'),

-- ═══════════════════════════════════════════
-- BURSITIS
-- ═══════════════════════════════════════════
('M71.10', 'Infective bursitis, unspecified site', 'التهاب الجراب الإنتاني غير محدد الموقع', 'Diseases of the musculoskeletal system', '{orthopedics}'),
('M70.60', 'Trochanteric bursitis, unspecified hip', 'التهاب الجراب المدوري، ورك غير محدد', 'Diseases of the musculoskeletal system', '{orthopedics}'),
('M70.20', 'Olecranon bursitis, unspecified elbow', 'التهاب الجراب الزجي، المرفق غير محدد', 'Diseases of the musculoskeletal system', '{orthopedics}'),
('M71.50', 'Bursitis, unspecified, unspecified site', 'التهاب الجراب غير محدد', 'Diseases of the musculoskeletal system', '{orthopedics,family_medicine}'),

-- ═══════════════════════════════════════════
-- LIGAMENT / SPRAINS / STRAINS
-- ═══════════════════════════════════════════
('S83.50', 'Sprain of unspecified cruciate ligament of knee', 'التواء الرباط الصليبي غير محدد في الركبة', 'Injury and poisoning', '{orthopedics}'),
('S83.511', 'Sprain of anterior cruciate ligament, right knee', 'التواء الرباط الصليبي الأمامي، الركبة اليمنى', 'Injury and poisoning', '{orthopedics}'),
('S83.512', 'Sprain of anterior cruciate ligament, left knee', 'التواء الرباط الصليبي الأمامي، الركبة اليسرى', 'Injury and poisoning', '{orthopedics}'),
('S83.40', 'Sprain of collateral ligament of knee, unspecified', 'التواء الرباط الجانبي للركبة غير محدد', 'Injury and poisoning', '{orthopedics}'),
('S86.011', 'Achilles tendon strain, right leg', 'إجهاد وتر أخيل، الساق اليمنى', 'Injury and poisoning', '{orthopedics}'),
('S93.401', 'Sprain of ankle, right', 'التواء الكاحل الأيمن', 'Injury and poisoning', '{orthopedics,family_medicine}'),
('S93.402', 'Sprain of ankle, left', 'التواء الكاحل الأيسر', 'Injury and poisoning', '{orthopedics,family_medicine}'),
('M79.10', 'Myalgia, unspecified site', 'ألم عضلي غير محدد الموقع', 'Diseases of the musculoskeletal system', '{orthopedics,family_medicine}'),

-- ═══════════════════════════════════════════
-- MENISCUS & KNEE
-- ═══════════════════════════════════════════
('M23.20', 'Derangement of meniscus, unspecified knee', 'اضطراب الغضروف الهلالي، ركبة غير محددة', 'Diseases of the musculoskeletal system', '{orthopedics}'),
('M22.0', 'Recurrent dislocation of patella', 'خلع متكرر للرضفة', 'Diseases of the musculoskeletal system', '{orthopedics}'),
('M22.40', 'Chondromalacia patellae, unspecified knee', 'لين غضروف الرضفة غير محدد', 'Diseases of the musculoskeletal system', '{orthopedics}'),
('M25.561', 'Pain in right knee', 'ألم في الركبة اليمنى', 'Diseases of the musculoskeletal system', '{orthopedics,family_medicine}'),
('M25.562', 'Pain in left knee', 'ألم في الركبة اليسرى', 'Diseases of the musculoskeletal system', '{orthopedics,family_medicine}'),

-- ═══════════════════════════════════════════
-- NERVE ENTRAPMENT / NEUROPATHY
-- ═══════════════════════════════════════════
('G56.00', 'Carpal tunnel syndrome, unspecified upper limb', 'متلازمة النفق الرسغي، الطرف العلوي غير محدد', 'Diseases of the nervous system', '{orthopedics}'),
('G57.50', 'Tarsal tunnel syndrome, unspecified lower limb', 'متلازمة النفق الرسغي للقدم، الطرف السفلي غير محدد', 'Diseases of the nervous system', '{orthopedics}'),
('G56.10', 'Cubital tunnel syndrome (ulnar neuropathy), unspecified', 'متلازمة النفق الزندي (اعتلال العصب الزندي) غير محدد', 'Diseases of the nervous system', '{orthopedics}'),

-- ═══════════════════════════════════════════
-- SOFT TISSUE / OTHER
-- ═══════════════════════════════════════════
('M79.3', 'Panniculitis, unspecified / soft tissue disorder', 'اضطراب الأنسجة الرخوة غير محدد', 'Diseases of the musculoskeletal system', '{orthopedics,family_medicine}'),
('M25.50', 'Pain in unspecified joint', 'ألم في مفصل غير محدد', 'Diseases of the musculoskeletal system', '{orthopedics,family_medicine}'),
('M62.830', 'Muscle spasm of back', 'تشنج عضلي في الظهر', 'Diseases of the musculoskeletal system', '{orthopedics,family_medicine}'),
('M79.601', 'Pain in right limb', 'ألم في الطرف الأيمن', 'Diseases of the musculoskeletal system', '{orthopedics,family_medicine}'),
('M79.602', 'Pain in left limb', 'ألم في الطرف الأيسر', 'Diseases of the musculoskeletal system', '{orthopedics,family_medicine}'),
('M25.60', 'Stiffness of unspecified joint', 'تيبس مفصل غير محدد', 'Diseases of the musculoskeletal system', '{orthopedics}'),
('M62.81', 'Muscle weakness (generalized)', 'ضعف عضلي عام', 'Diseases of the musculoskeletal system', '{orthopedics,family_medicine}'),
('M79.89', 'Other specified soft tissue disorder', 'اضطراب أنسجة رخوة محدد آخر', 'Diseases of the musculoskeletal system', '{orthopedics}')

ON CONFLICT (code) DO NOTHING;
