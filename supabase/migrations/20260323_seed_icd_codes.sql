-- ============================================
-- cliniq.one Migration 027b: Seed ICD-10 Codes
-- Dermatology, Family Medicine, Psychiatry
-- ============================================

INSERT INTO public.icd_codes (code, description, description_ar, category, specialty_tags) VALUES

-- ═══════════════════════════════════════════
-- DERMATOLOGY
-- ═══════════════════════════════════════════

-- Acne
('L70.0', 'Acne vulgaris', 'حب الشباب الشائع', 'Diseases of the skin', '{dermatology,family_medicine}'),
('L70.1', 'Acne conglobata', 'حب الشباب العقدي', 'Diseases of the skin', '{dermatology}'),
('L70.8', 'Other acne', 'حب شباب آخر', 'Diseases of the skin', '{dermatology}'),

-- Eczema / Dermatitis
('L20.0', 'Besnier prurigo (atopic dermatitis)', 'التهاب الجلد التأتبي', 'Diseases of the skin', '{dermatology,family_medicine}'),
('L20.9', 'Atopic dermatitis, unspecified', 'التهاب الجلد التأتبي غير محدد', 'Diseases of the skin', '{dermatology,family_medicine}'),
('L23.9', 'Allergic contact dermatitis, unspecified', 'التهاب الجلد التماسي التحسسي', 'Diseases of the skin', '{dermatology,family_medicine}'),
('L24.9', 'Irritant contact dermatitis, unspecified', 'التهاب الجلد التماسي المهيج', 'Diseases of the skin', '{dermatology,family_medicine}'),
('L30.9', 'Dermatitis, unspecified', 'التهاب جلدي غير محدد', 'Diseases of the skin', '{dermatology,family_medicine}'),
('L21.0', 'Seborrheic dermatitis of scalp', 'التهاب الجلد الدهني في فروة الرأس', 'Diseases of the skin', '{dermatology}'),
('L21.9', 'Seborrheic dermatitis, unspecified', 'التهاب الجلد الدهني غير محدد', 'Diseases of the skin', '{dermatology,family_medicine}'),

-- Psoriasis
('L40.0', 'Psoriasis vulgaris', 'الصدفية الشائعة', 'Diseases of the skin', '{dermatology}'),
('L40.1', 'Generalized pustular psoriasis', 'الصدفية البثرية المعممة', 'Diseases of the skin', '{dermatology}'),
('L40.4', 'Guttate psoriasis', 'الصدفية النقطية', 'Diseases of the skin', '{dermatology}'),
('L40.9', 'Psoriasis, unspecified', 'صدفية غير محددة', 'Diseases of the skin', '{dermatology,family_medicine}'),

-- Urticaria
('L50.0', 'Allergic urticaria', 'الشرى التحسسي', 'Diseases of the skin', '{dermatology,family_medicine}'),
('L50.1', 'Idiopathic urticaria', 'الشرى مجهول السبب', 'Diseases of the skin', '{dermatology,family_medicine}'),
('L50.9', 'Urticaria, unspecified', 'شرى غير محدد', 'Diseases of the skin', '{dermatology,family_medicine}'),

-- Fungal infections
('B35.0', 'Tinea barbae and tinea capitis', 'سعفة الذقن وسعفة الرأس', 'Infectious diseases', '{dermatology,family_medicine}'),
('B35.1', 'Tinea unguium (onychomycosis)', 'سعفة الأظافر', 'Infectious diseases', '{dermatology}'),
('B35.3', 'Tinea pedis (athlete''s foot)', 'سعفة القدم', 'Infectious diseases', '{dermatology,family_medicine}'),
('B35.4', 'Tinea corporis (ringworm)', 'سعفة الجسم', 'Infectious diseases', '{dermatology,family_medicine}'),
('B36.0', 'Pityriasis versicolor', 'النخالية المبرقشة', 'Infectious diseases', '{dermatology}'),
('B37.2', 'Candidiasis of skin and nail', 'داء المبيضات الجلدي', 'Infectious diseases', '{dermatology,family_medicine}'),

-- Viral infections
('B07.9', 'Viral wart, unspecified', 'ثؤلول فيروسي غير محدد', 'Infectious diseases', '{dermatology,family_medicine}'),
('B00.1', 'Herpes simplex dermatitis', 'التهاب جلدي بالهربس البسيط', 'Infectious diseases', '{dermatology,family_medicine}'),
('B02.9', 'Herpes zoster (shingles)', 'الحزام الناري', 'Infectious diseases', '{dermatology,family_medicine}'),

-- Pigmentation
('L81.0', 'Post-inflammatory hyperpigmentation', 'فرط التصبغ التالي للالتهاب', 'Diseases of the skin', '{dermatology}'),
('L81.1', 'Chloasma (melasma)', 'الكلف', 'Diseases of the skin', '{dermatology}'),
('L80', 'Vitiligo', 'البهاق', 'Diseases of the skin', '{dermatology}'),

-- Hair disorders
('L65.9', 'Nonscarring hair loss, unspecified', 'تساقط الشعر غير الندبي', 'Diseases of the skin', '{dermatology}'),
('L63.9', 'Alopecia areata, unspecified', 'الثعلبة البقعية', 'Diseases of the skin', '{dermatology}'),
('L64.9', 'Androgenic alopecia, unspecified', 'الصلع الوراثي', 'Diseases of the skin', '{dermatology}'),

-- Other skin
('L71.9', 'Rosacea, unspecified', 'الوردية غير محددة', 'Diseases of the skin', '{dermatology}'),
('L43.9', 'Lichen planus, unspecified', 'الحزاز المسطح', 'Diseases of the skin', '{dermatology}'),
('L57.0', 'Actinic keratosis', 'التقران السفعي', 'Diseases of the skin', '{dermatology}'),
('L82.1', 'Seborrheic keratosis', 'التقران الدهني', 'Diseases of the skin', '{dermatology}'),
('L98.9', 'Disorder of skin, unspecified', 'اضطراب جلدي غير محدد', 'Diseases of the skin', '{dermatology,family_medicine}'),
('L29.9', 'Pruritus, unspecified', 'حكة غير محددة', 'Diseases of the skin', '{dermatology,family_medicine}'),
('L73.9', 'Follicular disorder, unspecified', 'اضطراب جريبي غير محدد', 'Diseases of the skin', '{dermatology}'),
('D22.9', 'Melanocytic naevi, unspecified', 'وحمة ميلانينية غير محددة', 'Neoplasms', '{dermatology}'),
('C44.9', 'Malignant neoplasm of skin, unspecified', 'ورم خبيث في الجلد غير محدد', 'Neoplasms', '{dermatology}'),

-- ═══════════════════════════════════════════
-- FAMILY MEDICINE
-- ═══════════════════════════════════════════

-- Respiratory
('J06.9', 'Acute upper respiratory infection, unspecified', 'عدوى الجهاز التنفسي العلوي الحادة', 'Diseases of the respiratory system', '{family_medicine}'),
('J20.9', 'Acute bronchitis, unspecified', 'التهاب القصبات الحاد', 'Diseases of the respiratory system', '{family_medicine}'),
('J02.9', 'Acute pharyngitis, unspecified', 'التهاب البلعوم الحاد', 'Diseases of the respiratory system', '{family_medicine}'),
('J01.9', 'Acute sinusitis, unspecified', 'التهاب الجيوب الأنفية الحاد', 'Diseases of the respiratory system', '{family_medicine}'),
('J45.9', 'Asthma, unspecified', 'ربو غير محدد', 'Diseases of the respiratory system', '{family_medicine}'),
('J44.1', 'COPD with acute exacerbation', 'مرض الانسداد الرئوي المزمن مع تفاقم حاد', 'Diseases of the respiratory system', '{family_medicine}'),

-- Cardiovascular
('I10', 'Essential (primary) hypertension', 'ارتفاع ضغط الدم الأساسي', 'Diseases of the circulatory system', '{family_medicine}'),
('I25.9', 'Chronic ischemic heart disease, unspecified', 'مرض القلب الإقفاري المزمن', 'Diseases of the circulatory system', '{family_medicine}'),
('I48.91', 'Atrial fibrillation, unspecified', 'الرجفان الأذيني', 'Diseases of the circulatory system', '{family_medicine}'),

-- Endocrine / Metabolic
('E11.9', 'Type 2 diabetes mellitus without complications', 'داء السكري النوع الثاني بدون مضاعفات', 'Endocrine diseases', '{family_medicine}'),
('E11.65', 'Type 2 diabetes mellitus with hyperglycemia', 'داء السكري النوع الثاني مع ارتفاع سكر الدم', 'Endocrine diseases', '{family_medicine}'),
('E03.9', 'Hypothyroidism, unspecified', 'قصور الغدة الدرقية غير محدد', 'Endocrine diseases', '{family_medicine}'),
('E05.9', 'Thyrotoxicosis (hyperthyroidism), unspecified', 'فرط الدرقية غير محدد', 'Endocrine diseases', '{family_medicine}'),
('E78.5', 'Dyslipidemia, unspecified', 'اضطراب الدهون غير محدد', 'Endocrine diseases', '{family_medicine}'),
('E66.9', 'Obesity, unspecified', 'سمنة غير محددة', 'Endocrine diseases', '{family_medicine}'),
('E55.9', 'Vitamin D deficiency, unspecified', 'نقص فيتامين د غير محدد', 'Endocrine diseases', '{family_medicine}'),

-- Gastrointestinal
('K21.0', 'Gastro-esophageal reflux disease (GERD)', 'مرض الارتجاع المعدي المريئي', 'Diseases of the digestive system', '{family_medicine}'),
('K29.7', 'Gastritis, unspecified', 'التهاب المعدة غير محدد', 'Diseases of the digestive system', '{family_medicine}'),
('K58.9', 'Irritable bowel syndrome (IBS)', 'متلازمة القولون العصبي', 'Diseases of the digestive system', '{family_medicine}'),
('K30', 'Functional dyspepsia', 'عسر الهضم الوظيفي', 'Diseases of the digestive system', '{family_medicine}'),

-- Musculoskeletal
('M54.5', 'Low back pain', 'ألم أسفل الظهر', 'Diseases of the musculoskeletal system', '{family_medicine}'),
('M79.3', 'Panniculitis, unspecified / soft tissue pain', 'ألم الأنسجة الرخوة', 'Diseases of the musculoskeletal system', '{family_medicine}'),
('M25.5', 'Pain in joint', 'ألم المفصل', 'Diseases of the musculoskeletal system', '{family_medicine}'),

-- Genitourinary
('N39.0', 'Urinary tract infection, site not specified', 'عدوى المسالك البولية', 'Diseases of the genitourinary system', '{family_medicine}'),
('N30.0', 'Acute cystitis', 'التهاب المثانة الحاد', 'Diseases of the genitourinary system', '{family_medicine}'),

-- General / Symptoms
('R50.9', 'Fever, unspecified', 'حمى غير محددة', 'Symptoms and signs', '{family_medicine}'),
('R51', 'Headache', 'صداع', 'Symptoms and signs', '{family_medicine}'),
('R05', 'Cough', 'سعال', 'Symptoms and signs', '{family_medicine}'),
('R53.83', 'Fatigue / malaise', 'إرهاق وتعب', 'Symptoms and signs', '{family_medicine}'),
('R42', 'Dizziness and giddiness', 'دوخة', 'Symptoms and signs', '{family_medicine}'),
('R10.9', 'Abdominal pain, unspecified', 'ألم بطني غير محدد', 'Symptoms and signs', '{family_medicine}'),
('R11.0', 'Nausea', 'غثيان', 'Symptoms and signs', '{family_medicine}'),

-- Infections
('A09', 'Infectious gastroenteritis', 'التهاب المعدة والأمعاء المعدي', 'Infectious diseases', '{family_medicine}'),
('B34.9', 'Viral infection, unspecified', 'عدوى فيروسية غير محددة', 'Infectious diseases', '{family_medicine}'),

-- Iron / Anemia
('D50.9', 'Iron deficiency anemia, unspecified', 'فقر الدم بعوز الحديد', 'Diseases of the blood', '{family_medicine}'),
('D64.9', 'Anemia, unspecified', 'فقر الدم غير محدد', 'Diseases of the blood', '{family_medicine}'),

-- ═══════════════════════════════════════════
-- PSYCHIATRY
-- ═══════════════════════════════════════════

-- Depressive disorders
('F32.0', 'Major depressive disorder, single episode, mild', 'اضطراب اكتئابي رئيسي، نوبة واحدة، خفيف', 'Mental and behavioural disorders', '{psychiatry,family_medicine}'),
('F32.1', 'Major depressive disorder, single episode, moderate', 'اضطراب اكتئابي رئيسي، نوبة واحدة، متوسط', 'Mental and behavioural disorders', '{psychiatry,family_medicine}'),
('F32.2', 'Major depressive disorder, single episode, severe', 'اضطراب اكتئابي رئيسي، نوبة واحدة، شديد', 'Mental and behavioural disorders', '{psychiatry}'),
('F33.0', 'Major depressive disorder, recurrent, mild', 'اضطراب اكتئابي رئيسي، متكرر، خفيف', 'Mental and behavioural disorders', '{psychiatry}'),
('F33.1', 'Major depressive disorder, recurrent, moderate', 'اضطراب اكتئابي رئيسي، متكرر، متوسط', 'Mental and behavioural disorders', '{psychiatry}'),
('F34.1', 'Dysthymia (persistent depressive disorder)', 'اكتئاب جزئي مستمر', 'Mental and behavioural disorders', '{psychiatry}'),

-- Anxiety disorders
('F41.1', 'Generalized anxiety disorder', 'اضطراب القلق المعمم', 'Mental and behavioural disorders', '{psychiatry,family_medicine}'),
('F41.0', 'Panic disorder', 'اضطراب الهلع', 'Mental and behavioural disorders', '{psychiatry}'),
('F40.10', 'Social anxiety disorder (social phobia)', 'اضطراب القلق الاجتماعي', 'Mental and behavioural disorders', '{psychiatry}'),
('F40.9', 'Phobic anxiety disorder, unspecified', 'اضطراب القلق الرهابي غير محدد', 'Mental and behavioural disorders', '{psychiatry}'),
('F41.9', 'Anxiety disorder, unspecified', 'اضطراب القلق غير محدد', 'Mental and behavioural disorders', '{psychiatry,family_medicine}'),
('F42.9', 'Obsessive-compulsive disorder, unspecified', 'اضطراب الوسواس القهري', 'Mental and behavioural disorders', '{psychiatry}'),

-- Trauma and stress
('F43.10', 'Post-traumatic stress disorder (PTSD)', 'اضطراب ما بعد الصدمة', 'Mental and behavioural disorders', '{psychiatry}'),
('F43.20', 'Adjustment disorder, unspecified', 'اضطراب التكيف غير محدد', 'Mental and behavioural disorders', '{psychiatry,family_medicine}'),
('F43.0', 'Acute stress reaction', 'رد فعل الإجهاد الحاد', 'Mental and behavioural disorders', '{psychiatry}'),

-- Bipolar
('F31.9', 'Bipolar disorder, unspecified', 'اضطراب ثنائي القطب غير محدد', 'Mental and behavioural disorders', '{psychiatry}'),
('F31.30', 'Bipolar disorder, current episode depressed, mild', 'ثنائي القطب، نوبة اكتئابية حالية، خفيف', 'Mental and behavioural disorders', '{psychiatry}'),
('F31.10', 'Bipolar disorder, current episode manic, without psychosis', 'ثنائي القطب، نوبة هوسية بدون ذهان', 'Mental and behavioural disorders', '{psychiatry}'),

-- Psychotic disorders
('F20.9', 'Schizophrenia, unspecified', 'فصام غير محدد', 'Mental and behavioural disorders', '{psychiatry}'),
('F23', 'Brief psychotic disorder', 'اضطراب ذهاني قصير', 'Mental and behavioural disorders', '{psychiatry}'),
('F25.9', 'Schizoaffective disorder, unspecified', 'اضطراب فصامي عاطفي غير محدد', 'Mental and behavioural disorders', '{psychiatry}'),

-- ADHD
('F90.0', 'ADHD, predominantly inattentive', 'اضطراب فرط الحركة وتشتت الانتباه، النمط الغافل', 'Mental and behavioural disorders', '{psychiatry}'),
('F90.1', 'ADHD, predominantly hyperactive-impulsive', 'اضطراب فرط الحركة وتشتت الانتباه، النمط مفرط النشاط', 'Mental and behavioural disorders', '{psychiatry}'),
('F90.2', 'ADHD, combined type', 'اضطراب فرط الحركة وتشتت الانتباه، النمط المختلط', 'Mental and behavioural disorders', '{psychiatry}'),

-- Sleep disorders
('G47.00', 'Insomnia, unspecified', 'أرق غير محدد', 'Diseases of the nervous system', '{psychiatry,family_medicine}'),
('G47.9', 'Sleep disorder, unspecified', 'اضطراب النوم غير محدد', 'Diseases of the nervous system', '{psychiatry,family_medicine}'),

-- Eating disorders
('F50.00', 'Anorexia nervosa, unspecified', 'فقدان الشهية العصبي', 'Mental and behavioural disorders', '{psychiatry}'),
('F50.2', 'Bulimia nervosa', 'الشره المرضي العصبي', 'Mental and behavioural disorders', '{psychiatry}'),
('F50.81', 'Binge eating disorder', 'اضطراب نهم الطعام', 'Mental and behavioural disorders', '{psychiatry}'),

-- Substance use
('F10.10', 'Alcohol use disorder, mild', 'اضطراب تعاطي الكحول، خفيف', 'Mental and behavioural disorders', '{psychiatry}'),
('F10.20', 'Alcohol use disorder, moderate to severe', 'اضطراب تعاطي الكحول، متوسط إلى شديد', 'Mental and behavioural disorders', '{psychiatry}'),
('F17.210', 'Nicotine dependence, cigarettes', 'الاعتماد على النيكوتين، سجائر', 'Mental and behavioural disorders', '{psychiatry,family_medicine}'),
('F19.10', 'Other psychoactive substance use disorder, mild', 'اضطراب تعاطي مواد مؤثرة نفسياً، خفيف', 'Mental and behavioural disorders', '{psychiatry}'),

-- Personality disorders
('F60.3', 'Borderline personality disorder', 'اضطراب الشخصية الحدية', 'Mental and behavioural disorders', '{psychiatry}'),
('F60.9', 'Personality disorder, unspecified', 'اضطراب الشخصية غير محدد', 'Mental and behavioural disorders', '{psychiatry}'),

-- Somatic / Other
('F45.9', 'Somatoform disorder, unspecified', 'اضطراب جسدي الشكل غير محدد', 'Mental and behavioural disorders', '{psychiatry}'),
('F48.9', 'Nonpsychotic mental disorder, unspecified', 'اضطراب نفسي غير ذهاني غير محدد', 'Mental and behavioural disorders', '{psychiatry}'),
('F99', 'Mental disorder, not otherwise specified', 'اضطراب نفسي غير محدد بخلاف ذلك', 'Mental and behavioural disorders', '{psychiatry}'),
('R45.851', 'Suicidal ideation', 'أفكار انتحارية', 'Symptoms and signs', '{psychiatry}')

ON CONFLICT (code) DO NOTHING;
