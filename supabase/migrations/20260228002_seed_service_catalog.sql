-- ══════════════════════════════════════════════════════════════════
-- Seed: Common Family Medicine & Dermatology Interventions
-- Populates the service_catalog table with realistic medical services
-- Run AFTER 004_intervention_management.sql
-- ══════════════════════════════════════════════════════════════════

-- ╔════════════════════════════════════════════════════════════════╗
-- ║  FAMILY MEDICINE — LAB TESTS                                  ║
-- ╚════════════════════════════════════════════════════════════════╝

INSERT INTO service_catalog (category, subcategory, name, name_ar, type, sample_required, fasting_required, avg_cost_sar, avg_turnaround_days, is_active) VALUES
-- Hematology
('Hematology', 'Complete Blood Count', 'CBC with Differential', 'تحليل الدم الشامل مع التفريق', 'lab_test', 'Blood (EDTA)', false, 80, 1, true),
('Hematology', 'Coagulation', 'PT/INR', 'زمن البروثرومبين', 'lab_test', 'Blood (citrate)', false, 90, 1, true),
('Hematology', 'Coagulation', 'PTT (Partial Thromboplastin Time)', 'زمن الثرومبوبلاستين الجزئي', 'lab_test', 'Blood (citrate)', false, 90, 1, true),
('Hematology', 'Anemia Panel', 'Iron Studies (Fe, TIBC, Ferritin)', 'دراسات الحديد', 'lab_test', 'Blood (serum)', true, 180, 2, true),
('Hematology', 'Anemia Panel', 'Reticulocyte Count', 'عدد الخلايا الشبكية', 'lab_test', 'Blood (EDTA)', false, 70, 1, true),
('Hematology', 'ESR', 'Erythrocyte Sedimentation Rate (ESR)', 'سرعة ترسيب الدم', 'lab_test', 'Blood (EDTA)', false, 50, 1, true),

-- Biochemistry / Metabolic
('Biochemistry', 'Metabolic Panel', 'Basic Metabolic Panel (BMP)', 'اللوحة الأيضية الأساسية', 'lab_test', 'Blood (serum)', true, 150, 1, true),
('Biochemistry', 'Metabolic Panel', 'Comprehensive Metabolic Panel (CMP)', 'اللوحة الأيضية الشاملة', 'lab_test', 'Blood (serum)', true, 200, 1, true),
('Biochemistry', 'Renal', 'Kidney Function (Creatinine, BUN, eGFR)', 'وظائف الكلى', 'lab_test', 'Blood (serum)', false, 120, 1, true),
('Biochemistry', 'Hepatic', 'Liver Function Tests (ALT, AST, ALP, Bilirubin, Albumin)', 'وظائف الكبد', 'lab_test', 'Blood (serum)', true, 160, 1, true),
('Biochemistry', 'Glucose', 'Fasting Blood Glucose', 'سكر الدم الصائم', 'lab_test', 'Blood (serum)', true, 40, 1, true),
('Biochemistry', 'Glucose', 'HbA1c (Glycated Hemoglobin)', 'الهيموغلوبين السكري', 'lab_test', 'Blood (EDTA)', false, 100, 1, true),
('Biochemistry', 'Glucose', 'Oral Glucose Tolerance Test (OGTT)', 'اختبار تحمل الغلوكوز الفموي', 'lab_test', 'Blood (serum)', true, 150, 1, true),
('Biochemistry', 'Lipids', 'Lipid Panel (Total Cholesterol, HDL, LDL, Triglycerides)', 'تحليل الدهون', 'lab_test', 'Blood (serum)', true, 130, 1, true),
('Biochemistry', 'Uric Acid', 'Uric Acid Level', 'مستوى حمض اليوريك', 'lab_test', 'Blood (serum)', false, 50, 1, true),
('Biochemistry', 'Electrolytes', 'Electrolytes (Na, K, Cl, CO2)', 'الشوارد الكهربائية', 'lab_test', 'Blood (serum)', false, 100, 1, true),
('Biochemistry', 'Calcium', 'Calcium, Phosphorus, Magnesium', 'الكالسيوم والفوسفور والمغنيسيوم', 'lab_test', 'Blood (serum)', false, 120, 1, true),

-- Endocrine / Thyroid
('Endocrine', 'Thyroid', 'TSH (Thyroid Stimulating Hormone)', 'الهرمون المنبه للغدة الدرقية', 'lab_test', 'Blood (serum)', false, 100, 2, true),
('Endocrine', 'Thyroid', 'Free T4 (Thyroxine)', 'هرمون الثيروكسين الحر', 'lab_test', 'Blood (serum)', false, 100, 2, true),
('Endocrine', 'Thyroid', 'Free T3 (Triiodothyronine)', 'هرمون ثلاثي يودوثيرونين الحر', 'lab_test', 'Blood (serum)', false, 100, 2, true),
('Endocrine', 'Thyroid', 'Thyroid Panel (TSH, Free T3, Free T4)', 'لوحة الغدة الدرقية', 'lab_test', 'Blood (serum)', false, 250, 2, true),
('Endocrine', 'Vitamins', 'Vitamin D (25-OH)', 'فيتامين د', 'lab_test', 'Blood (serum)', false, 150, 2, true),
('Endocrine', 'Vitamins', 'Vitamin B12', 'فيتامين ب12', 'lab_test', 'Blood (serum)', false, 120, 2, true),
('Endocrine', 'Vitamins', 'Folate (Folic Acid)', 'حمض الفوليك', 'lab_test', 'Blood (serum)', false, 100, 2, true),

-- Urinalysis
('Urinalysis', 'Routine', 'Urinalysis with Microscopy', 'تحليل البول مع الفحص المجهري', 'lab_test', 'Urine (midstream)', false, 60, 1, true),
('Urinalysis', 'Culture', 'Urine Culture & Sensitivity', 'مزرعة بول وحساسية', 'lab_test', 'Urine (midstream, sterile)', false, 120, 3, true),
('Urinalysis', 'Renal', 'Urine Albumin/Creatinine Ratio (ACR)', 'نسبة الألبومين للكرياتينين في البول', 'lab_test', 'Urine (spot)', false, 80, 1, true),

-- Inflammatory / Autoimmune
('Immunology', 'Inflammatory', 'C-Reactive Protein (CRP)', 'البروتين التفاعلي سي', 'lab_test', 'Blood (serum)', false, 80, 1, true),
('Immunology', 'Inflammatory', 'Rheumatoid Factor (RF)', 'العامل الروماتويدي', 'lab_test', 'Blood (serum)', false, 100, 2, true),
('Immunology', 'Autoimmune', 'Antinuclear Antibody (ANA)', 'الأجسام المضادة للنواة', 'lab_test', 'Blood (serum)', false, 200, 3, true),

-- Infectious Disease
('Microbiology', 'Stool', 'Stool Culture & Sensitivity', 'مزرعة براز وحساسية', 'lab_test', 'Stool sample', false, 150, 3, true),
('Microbiology', 'Stool', 'Stool for Ova & Parasites', 'فحص البراز للبيوض والطفيليات', 'lab_test', 'Stool sample', false, 80, 2, true),
('Microbiology', 'Throat', 'Throat Swab Culture', 'مسحة حلق', 'lab_test', 'Throat swab', false, 100, 2, true),
('Microbiology', 'STI', 'Hepatitis B Panel (HBsAg, Anti-HBs, Anti-HBc)', 'لوحة التهاب الكبد ب', 'lab_test', 'Blood (serum)', false, 250, 2, true),
('Microbiology', 'STI', 'Hepatitis C Antibody', 'أجسام مضادة لالتهاب الكبد سي', 'lab_test', 'Blood (serum)', false, 120, 2, true),
('Microbiology', 'STI', 'HIV 1/2 Ag/Ab Combo', 'فحص فيروس نقص المناعة', 'lab_test', 'Blood (serum)', false, 150, 2, true),

-- Cardiac
('Cardiology', 'Cardiac Markers', 'Troponin I', 'تروبونين', 'lab_test', 'Blood (serum)', false, 150, 1, true),
('Cardiology', 'Cardiac Markers', 'BNP / NT-proBNP', 'الببتيد الدماغي المدر للصوديوم', 'lab_test', 'Blood (serum)', false, 200, 1, true),

-- Hormonal (Female)
('Endocrine', 'Reproductive', 'Beta-hCG (Pregnancy Test)', 'اختبار الحمل الرقمي', 'lab_test', 'Blood (serum)', false, 80, 1, true),
('Endocrine', 'Reproductive', 'Prolactin', 'هرمون البرولاكتين', 'lab_test', 'Blood (serum)', false, 120, 2, true),

-- PSA
('Oncology', 'Screening', 'PSA (Prostate-Specific Antigen)', 'مستضد البروستات النوعي', 'lab_test', 'Blood (serum)', false, 120, 2, true),

-- Allergy
('Immunology', 'Allergy', 'Total IgE', 'الغلوبولين المناعي هـ الكلي', 'lab_test', 'Blood (serum)', false, 150, 2, true),
('Immunology', 'Allergy', 'Specific IgE Panel (Food)', 'لوحة حساسية الطعام', 'lab_test', 'Blood (serum)', false, 500, 5, true),
('Immunology', 'Allergy', 'Specific IgE Panel (Inhalants)', 'لوحة حساسية الاستنشاق', 'lab_test', 'Blood (serum)', false, 500, 5, true)

ON CONFLICT DO NOTHING;


-- ╔════════════════════════════════════════════════════════════════╗
-- ║  FAMILY MEDICINE — IMAGING                                    ║
-- ╚════════════════════════════════════════════════════════════════╝

INSERT INTO service_catalog (category, subcategory, name, name_ar, type, sample_required, fasting_required, avg_cost_sar, avg_turnaround_days, is_active) VALUES
('Radiology', 'X-Ray', 'Chest X-Ray (PA)', 'أشعة صدر', 'imaging', NULL, false, 150, 1, true),
('Radiology', 'X-Ray', 'Abdomen X-Ray', 'أشعة بطن', 'imaging', NULL, false, 150, 1, true),
('Radiology', 'X-Ray', 'Spine X-Ray (Lumbar/Cervical)', 'أشعة العمود الفقري', 'imaging', NULL, false, 200, 1, true),
('Radiology', 'X-Ray', 'Extremity X-Ray (Hand/Foot/Knee)', 'أشعة الأطراف', 'imaging', NULL, false, 150, 1, true),
('Radiology', 'Ultrasound', 'Abdominal Ultrasound', 'أشعة صوتية للبطن', 'imaging', NULL, true, 300, 1, true),
('Radiology', 'Ultrasound', 'Pelvic Ultrasound', 'أشعة صوتية للحوض', 'imaging', NULL, false, 300, 1, true),
('Radiology', 'Ultrasound', 'Thyroid Ultrasound', 'أشعة صوتية للغدة الدرقية', 'imaging', NULL, false, 250, 1, true),
('Radiology', 'Ultrasound', 'Renal Ultrasound', 'أشعة صوتية للكلى', 'imaging', NULL, false, 300, 1, true),
('Radiology', 'Ultrasound', 'Musculoskeletal Ultrasound', 'أشعة صوتية للعضلات والمفاصل', 'imaging', NULL, false, 350, 1, true),
('Radiology', 'CT', 'CT Head (without contrast)', 'أشعة مقطعية للرأس', 'imaging', NULL, false, 800, 1, true),
('Radiology', 'CT', 'CT Abdomen/Pelvis (with contrast)', 'أشعة مقطعية للبطن والحوض', 'imaging', NULL, true, 1200, 1, true),
('Radiology', 'MRI', 'MRI Brain', 'رنين مغناطيسي للدماغ', 'imaging', NULL, false, 2000, 2, true),
('Radiology', 'MRI', 'MRI Lumbar Spine', 'رنين مغناطيسي للعمود الفقري القطني', 'imaging', NULL, false, 2000, 2, true),
('Radiology', 'MRI', 'MRI Knee', 'رنين مغناطيسي للركبة', 'imaging', NULL, false, 1800, 2, true),
('Cardiology', 'Cardiac Imaging', 'ECG (12-Lead Electrocardiogram)', 'تخطيط القلب الكهربائي', 'imaging', NULL, false, 100, 1, true),
('Cardiology', 'Cardiac Imaging', 'Echocardiogram (Transthoracic)', 'تخطيط صدى القلب', 'imaging', NULL, false, 600, 1, true),
('Radiology', 'DEXA', 'Bone Density Scan (DEXA)', 'قياس كثافة العظام', 'imaging', NULL, false, 400, 1, true),
('Radiology', 'Mammography', 'Digital Mammography (Screening)', 'تصوير الثدي الشعاعي', 'imaging', NULL, false, 500, 2, true)

ON CONFLICT DO NOTHING;


-- ╔════════════════════════════════════════════════════════════════╗
-- ║  FAMILY MEDICINE — REFERRALS                                  ║
-- ╚════════════════════════════════════════════════════════════════╝

INSERT INTO service_catalog (category, subcategory, name, name_ar, type, sample_required, fasting_required, avg_cost_sar, avg_turnaround_days, is_active) VALUES
('Cardiology', NULL, 'Cardiology Consultation', 'استشارة طب القلب', 'referral', NULL, false, 300, 7, true),
('Endocrinology', NULL, 'Endocrinology Consultation', 'استشارة غدد صماء', 'referral', NULL, false, 300, 7, true),
('Gastroenterology', NULL, 'Gastroenterology Consultation', 'استشارة جهاز هضمي', 'referral', NULL, false, 300, 7, true),
('Neurology', NULL, 'Neurology Consultation', 'استشارة أعصاب', 'referral', NULL, false, 350, 7, true),
('Orthopedics', NULL, 'Orthopedics Consultation', 'استشارة عظام', 'referral', NULL, false, 300, 7, true),
('Psychiatry', NULL, 'Psychiatry Consultation', 'استشارة نفسية', 'referral', NULL, false, 350, 7, true),
('Ophthalmology', NULL, 'Ophthalmology Consultation', 'استشارة عيون', 'referral', NULL, false, 250, 7, true),
('ENT', NULL, 'ENT Consultation', 'استشارة أنف وأذن وحنجرة', 'referral', NULL, false, 250, 7, true),
('Urology', NULL, 'Urology Consultation', 'استشارة مسالك بولية', 'referral', NULL, false, 300, 7, true),
('Pulmonology', NULL, 'Pulmonology Consultation', 'استشارة صدرية', 'referral', NULL, false, 300, 7, true),
('Rheumatology', NULL, 'Rheumatology Consultation', 'استشارة روماتيزم', 'referral', NULL, false, 350, 10, true),
('Gynecology', NULL, 'OB/GYN Consultation', 'استشارة نسائية وتوليد', 'referral', NULL, false, 300, 7, true),
('Nutrition', NULL, 'Clinical Nutrition / Dietitian Referral', 'إحالة تغذية علاجية', 'referral', NULL, false, 200, 5, true),
('Physiotherapy', NULL, 'Physiotherapy Referral', 'إحالة علاج طبيعي', 'referral', NULL, false, 200, 5, true),
('Psychology', NULL, 'Clinical Psychology / CBT Referral', 'إحالة علاج نفسي سلوكي', 'referral', NULL, false, 300, 7, true)

ON CONFLICT DO NOTHING;


-- ╔════════════════════════════════════════════════════════════════╗
-- ║  DERMATOLOGY — LAB TESTS                                      ║
-- ╚════════════════════════════════════════════════════════════════╝

INSERT INTO service_catalog (category, subcategory, name, name_ar, type, sample_required, fasting_required, avg_cost_sar, avg_turnaround_days, is_active) VALUES
('Dermatology', 'Skin Biopsy', 'Punch Biopsy (Histopathology)', 'خزعة جلد بالمثقب', 'lab_test', 'Skin tissue (punch)', false, 400, 7, true),
('Dermatology', 'Skin Biopsy', 'Shave Biopsy (Histopathology)', 'خزعة جلد بالحلاقة', 'lab_test', 'Skin tissue (shave)', false, 350, 7, true),
('Dermatology', 'Skin Biopsy', 'Excisional Biopsy', 'خزعة جلد استئصالية', 'lab_test', 'Skin tissue (excision)', false, 600, 7, true),
('Dermatology', 'Mycology', 'KOH Preparation (Fungal Smear)', 'فحص الفطريات المباشر', 'lab_test', 'Skin scraping / nail clipping', false, 80, 1, true),
('Dermatology', 'Mycology', 'Fungal Culture', 'مزرعة فطريات', 'lab_test', 'Skin scraping / nail clipping', false, 150, 14, true),
('Dermatology', 'Skin Swab', 'Wound / Skin Swab Culture & Sensitivity', 'مسحة جلد ومزرعة وحساسية', 'lab_test', 'Wound swab', false, 120, 3, true),
('Dermatology', 'Allergy', 'Skin Prick Test (Common Allergens)', 'اختبار وخز الجلد للحساسية', 'lab_test', 'In-clinic test', false, 400, 1, true),
('Dermatology', 'Allergy', 'Patch Test (Contact Dermatitis Panel)', 'اختبار الرقعة لالتهاب الجلد التماسي', 'lab_test', 'In-clinic test', false, 600, 3, true),
('Dermatology', 'Autoimmune', 'Direct Immunofluorescence (DIF)', 'التألق المناعي المباشر', 'lab_test', 'Skin biopsy (perilesional)', false, 500, 7, true),
('Dermatology', 'STI', 'RPR/VDRL (Syphilis Screen)', 'فحص الزهري', 'lab_test', 'Blood (serum)', false, 80, 2, true),
('Dermatology', 'Viral', 'HSV PCR (Herpes Simplex)', 'فحص الهربس بالتفاعل التسلسلي', 'lab_test', 'Vesicle fluid / swab', false, 250, 3, true),
('Dermatology', 'Viral', 'Tzanck Smear', 'مسحة تزانك', 'lab_test', 'Vesicle base scraping', false, 80, 1, true)

ON CONFLICT DO NOTHING;


-- ╔════════════════════════════════════════════════════════════════╗
-- ║  DERMATOLOGY — IMAGING                                        ║
-- ╚════════════════════════════════════════════════════════════════╝

INSERT INTO service_catalog (category, subcategory, name, name_ar, type, sample_required, fasting_required, avg_cost_sar, avg_turnaround_days, is_active) VALUES
('Dermatology', 'Dermoscopy', 'Dermoscopy (Digital Mole Mapping)', 'فحص الشامات بالمنظار الجلدي', 'imaging', NULL, false, 300, 1, true),
('Dermatology', 'Photography', 'Clinical Photography (Baseline/Follow-up)', 'تصوير سريري للمتابعة', 'imaging', NULL, false, 100, 1, true),
('Dermatology', 'Wood Lamp', 'Wood''s Lamp Examination', 'فحص مصباح وود', 'imaging', NULL, false, 80, 1, true)

ON CONFLICT DO NOTHING;


-- ╔════════════════════════════════════════════════════════════════╗
-- ║  DERMATOLOGY — PROCEDURES / THERAPY                           ║
-- ╚════════════════════════════════════════════════════════════════╝

INSERT INTO service_catalog (category, subcategory, name, name_ar, type, sample_required, fasting_required, avg_cost_sar, avg_turnaround_days, is_active) VALUES
('Dermatology', 'Cryotherapy', 'Cryotherapy / Liquid Nitrogen (Warts, Keratoses)', 'العلاج بالتبريد', 'therapy', NULL, false, 200, 1, true),
('Dermatology', 'Excision', 'Lesion Excision (Cyst, Lipoma)', 'استئصال آفة جلدية', 'therapy', NULL, false, 800, 1, true),
('Dermatology', 'Electrosurgery', 'Electrocautery / Electrodessication', 'الكي الكهربائي', 'therapy', NULL, false, 300, 1, true),
('Dermatology', 'Curettage', 'Curettage & Cautery (BCC, Keratoses)', 'كحت وكي', 'therapy', NULL, false, 500, 1, true),
('Dermatology', 'Phototherapy', 'Narrowband UVB Phototherapy (per session)', 'العلاج بالأشعة فوق البنفسجية', 'therapy', NULL, false, 150, 1, true),
('Dermatology', 'Injection', 'Intralesional Corticosteroid Injection', 'حقن كورتيزون موضعي', 'therapy', NULL, false, 200, 1, true),
('Dermatology', 'Injection', 'Intralesional 5-FU (Keloid Treatment)', 'حقن موضعي لعلاج الجدرة', 'therapy', NULL, false, 300, 1, true),
('Dermatology', 'Chemical Peel', 'Chemical Peel (Glycolic / Salicylic)', 'تقشير كيميائي', 'therapy', NULL, false, 400, 1, true),
('Dermatology', 'Acne', 'Comedone Extraction (Acne)', 'استخراج الرؤوس السوداء', 'therapy', NULL, false, 250, 1, true),
('Dermatology', 'Nail', 'Partial Nail Avulsion (Ingrown Nail)', 'إزالة جزئية للظفر الناشب', 'therapy', NULL, false, 400, 1, true),
('Dermatology', 'Wound Care', 'Wound Debridement', 'تنظيف الجرح', 'therapy', NULL, false, 300, 1, true),
('Dermatology', 'I&D', 'Incision & Drainage (Abscess)', 'شق وتفريغ الخراج', 'therapy', NULL, false, 500, 1, true)

ON CONFLICT DO NOTHING;


-- ╔════════════════════════════════════════════════════════════════╗
-- ║  DERMATOLOGY — REFERRALS                                      ║
-- ╚════════════════════════════════════════════════════════════════╝

INSERT INTO service_catalog (category, subcategory, name, name_ar, type, sample_required, fasting_required, avg_cost_sar, avg_turnaround_days, is_active) VALUES
('Dermatology', 'Specialist', 'Dermatologic Surgery Referral', 'إحالة جراحة جلدية', 'referral', NULL, false, 400, 7, true),
('Dermatology', 'Specialist', 'Mohs Surgery Referral (Skin Cancer)', 'إحالة جراحة موس لسرطان الجلد', 'referral', NULL, false, 3000, 14, true),
('Dermatology', 'Specialist', 'Pediatric Dermatology Referral', 'إحالة جلدية أطفال', 'referral', NULL, false, 350, 7, true),
('Dermatology', 'Specialist', 'Laser/Cosmetic Dermatology Referral', 'إحالة ليزر وتجميل جلدي', 'referral', NULL, false, 400, 7, true),
('Dermatology', 'Follow-up', 'Dermatology Follow-up (6-week review)', 'متابعة جلدية بعد 6 أسابيع', 'follow_up', NULL, false, 200, 42, true),
('Dermatology', 'Follow-up', 'Post-Procedure Wound Check', 'فحص الجرح بعد الإجراء', 'follow_up', NULL, false, 100, 7, true)

ON CONFLICT DO NOTHING;


-- ╔════════════════════════════════════════════════════════════════╗
-- ║  FAMILY MEDICINE — THERAPY / PROCEDURES                       ║
-- ╚════════════════════════════════════════════════════════════════╝

INSERT INTO service_catalog (category, subcategory, name, name_ar, type, sample_required, fasting_required, avg_cost_sar, avg_turnaround_days, is_active) VALUES
('Family Medicine', 'Vaccination', 'Influenza Vaccine', 'لقاح الإنفلونزا', 'therapy', NULL, false, 100, 1, true),
('Family Medicine', 'Vaccination', 'Pneumococcal Vaccine (PCV13 / PPSV23)', 'لقاح المكورات الرئوية', 'therapy', NULL, false, 250, 1, true),
('Family Medicine', 'Vaccination', 'Hepatitis B Vaccine (3-dose series)', 'لقاح التهاب الكبد ب', 'therapy', NULL, false, 150, 1, true),
('Family Medicine', 'Vaccination', 'Tdap Vaccine (Tetanus/Diphtheria/Pertussis)', 'لقاح الكزاز والدفتيريا والسعال الديكي', 'therapy', NULL, false, 120, 1, true),
('Family Medicine', 'Wound', 'Wound Closure (Suturing)', 'إغلاق الجرح بالخياطة', 'therapy', NULL, false, 400, 1, true),
('Family Medicine', 'Joint', 'Joint Aspiration (Arthrocentesis)', 'سحب سائل المفصل', 'therapy', NULL, false, 500, 1, true),
('Family Medicine', 'Joint', 'Intra-articular Corticosteroid Injection', 'حقن كورتيزون داخل المفصل', 'therapy', NULL, false, 400, 1, true),
('Family Medicine', 'Respiratory', 'Spirometry (Pulmonary Function Test)', 'اختبار وظائف الرئة', 'therapy', NULL, false, 200, 1, true),
('Family Medicine', 'Screening', 'Pap Smear (Cervical Screening)', 'مسحة عنق الرحم', 'lab_test', 'Cervical cells', false, 150, 5, true),
('Family Medicine', 'Follow-up', 'Chronic Disease Follow-up (Diabetes/HTN)', 'متابعة أمراض مزمنة', 'follow_up', NULL, false, 150, 30, true),
('Family Medicine', 'Follow-up', 'Post-Visit Follow-up (2-week check)', 'متابعة بعد أسبوعين', 'follow_up', NULL, false, 100, 14, true)

ON CONFLICT DO NOTHING;
