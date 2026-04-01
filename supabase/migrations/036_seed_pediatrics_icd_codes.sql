-- ============================================
-- cliniq.one Migration: Seed ICD-10 Codes
-- Pediatrics
-- ============================================

INSERT INTO public.icd_codes (code, description, description_ar, category, specialty_tags) VALUES

-- ═══════════════════════════════════════════
-- RESPIRATORY
-- ═══════════════════════════════════════════
('J21.9', 'Acute bronchiolitis, unspecified', 'التهاب القصيبات الحاد غير محدد', 'Diseases of the respiratory system', '{pediatrics,family_medicine}'),
('J05.0', 'Acute obstructive laryngitis (croup)', 'التهاب الحنجرة الانسدادي الحاد (الخانوق)', 'Diseases of the respiratory system', '{pediatrics}'),
('J45.20', 'Mild intermittent asthma, uncomplicated', 'ربو متقطع خفيف بدون مضاعفات', 'Diseases of the respiratory system', '{pediatrics,family_medicine}'),
('J45.30', 'Mild persistent asthma, uncomplicated', 'ربو مستمر خفيف بدون مضاعفات', 'Diseases of the respiratory system', '{pediatrics,family_medicine}'),
('J18.9', 'Pneumonia, unspecified organism', 'التهاب رئوي بكائن غير محدد', 'Diseases of the respiratory system', '{pediatrics,family_medicine}'),
('J06.9', 'Acute upper respiratory infection, unspecified', 'عدوى الجهاز التنفسي العلوي الحادة', 'Diseases of the respiratory system', '{pediatrics,family_medicine}'),
('R06.2', 'Wheezing', 'أزيز', 'Symptoms and signs', '{pediatrics,family_medicine}'),

-- ═══════════════════════════════════════════
-- ENT / INFECTIOUS
-- ═══════════════════════════════════════════
('H66.90', 'Otitis media, unspecified, unspecified ear', 'التهاب الأذن الوسطى غير محدد', 'Diseases of the ear', '{pediatrics,family_medicine}'),
('H66.91', 'Otitis media, unspecified, right ear', 'التهاب الأذن الوسطى الأيمن', 'Diseases of the ear', '{pediatrics}'),
('H66.92', 'Otitis media, unspecified, left ear', 'التهاب الأذن الوسطى الأيسر', 'Diseases of the ear', '{pediatrics}'),
('H65.90', 'Serous otitis media (glue ear), unspecified', 'التهاب الأذن الوسطى المصلي', 'Diseases of the ear', '{pediatrics}'),
('J02.9', 'Acute pharyngitis, unspecified', 'التهاب البلعوم الحاد غير محدد', 'Diseases of the respiratory system', '{pediatrics,family_medicine}'),
('J03.90', 'Acute tonsillitis, unspecified', 'التهاب اللوزتين الحاد غير محدد', 'Diseases of the respiratory system', '{pediatrics,family_medicine}'),
('J35.01', 'Chronic tonsillitis', 'التهاب اللوزتين المزمن', 'Diseases of the respiratory system', '{pediatrics}'),
('A08.4', 'Viral intestinal infection, unspecified', 'عدوى معوية فيروسية', 'Infectious diseases', '{pediatrics,family_medicine}'),
('A09', 'Infectious gastroenteritis and colitis, unspecified', 'التهاب المعدة والأمعاء المعدي', 'Infectious diseases', '{pediatrics,family_medicine}'),
('B08.4', 'Enteroviral vesicular stomatitis (hand foot mouth)', 'التهاب الفم الحويصلي (مرض اليد والقدم والفم)', 'Infectious diseases', '{pediatrics}'),
('B01.9', 'Varicella (chickenpox) without complication', 'الجدري المائي بدون مضاعفات', 'Infectious diseases', '{pediatrics}'),
('B05.9', 'Measles without complication', 'الحصبة بدون مضاعفات', 'Infectious diseases', '{pediatrics}'),

-- ═══════════════════════════════════════════
-- GASTROINTESTINAL
-- ═══════════════════════════════════════════
('K59.00', 'Constipation, unspecified', 'إمساك غير محدد', 'Diseases of the digestive system', '{pediatrics,family_medicine}'),
('K59.04', 'Chronic idiopathic constipation', 'إمساك مزمن مجهول السبب', 'Diseases of the digestive system', '{pediatrics}'),
('K21.0', 'Gastro-esophageal reflux disease (GERD)', 'مرض الارتجاع المعدي المريئي', 'Diseases of the digestive system', '{pediatrics,family_medicine}'),
('K52.29', 'Allergic and dietetic gastroenteritis and colitis', 'التهاب المعدة والأمعاء التحسسي والغذائي', 'Diseases of the digestive system', '{pediatrics}'),
('R11.10', 'Vomiting, unspecified', 'قيء غير محدد', 'Symptoms and signs', '{pediatrics,family_medicine}'),
('R10.9', 'Unspecified abdominal pain', 'ألم بطني غير محدد', 'Symptoms and signs', '{pediatrics,family_medicine}'),
('K52.9', 'Noninfective gastroenteritis and colitis, unspecified', 'التهاب المعدة والأمعاء غير المعدي', 'Diseases of the digestive system', '{pediatrics}'),

-- ═══════════════════════════════════════════
-- DEVELOPMENTAL & BEHAVIORAL
-- ═══════════════════════════════════════════
('F80.9', 'Developmental disorder of speech and language, unspecified', 'اضطراب النمو في الكلام واللغة غير محدد', 'Mental and behavioural disorders', '{pediatrics}'),
('F82', 'Specific developmental disorder of motor function', 'اضطراب النمو الحركي المحدد', 'Mental and behavioural disorders', '{pediatrics}'),
('F84.0', 'Autistic disorder', 'اضطراب التوحد', 'Mental and behavioural disorders', '{pediatrics,psychiatry}'),
('F90.9', 'Attention-deficit hyperactivity disorder, unspecified', 'اضطراب فرط الحركة وتشتت الانتباه غير محدد', 'Mental and behavioural disorders', '{pediatrics,psychiatry}'),
('R62.51', 'Failure to thrive (child)', 'فشل النمو عند الطفل', 'Symptoms and signs', '{pediatrics}'),
('R62.52', 'Short stature (child)', 'قصر القامة عند الطفل', 'Symptoms and signs', '{pediatrics}'),
('R63.3', 'Feeding difficulties', 'صعوبات في التغذية', 'Symptoms and signs', '{pediatrics}'),
('F98.0', 'Enuresis not due to a substance or known physiological condition', 'سلس البول الليلي (تبول لاإرادي)', 'Mental and behavioural disorders', '{pediatrics}'),

-- ═══════════════════════════════════════════
-- NEONATAL
-- ═══════════════════════════════════════════
('P59.9', 'Neonatal jaundice, unspecified', 'يرقان وليدي غير محدد', 'Conditions originating in the perinatal period', '{pediatrics}'),
('P22.9', 'Respiratory distress of newborn, unspecified', 'ضيق تنفس المولود غير محدد', 'Conditions originating in the perinatal period', '{pediatrics}'),
('P07.39', 'Preterm newborn, unspecified weeks of gestation', 'مولود خديج غير محدد أسابيع الحمل', 'Conditions originating in the perinatal period', '{pediatrics}'),
('P92.9', 'Feeding problem of newborn, unspecified', 'مشكلة تغذية المولود غير محددة', 'Conditions originating in the perinatal period', '{pediatrics}'),
('P36.9', 'Bacterial sepsis of newborn, unspecified', 'إنتان بكتيري وليدي غير محدد', 'Conditions originating in the perinatal period', '{pediatrics}'),

-- ═══════════════════════════════════════════
-- GROWTH & METABOLIC
-- ═══════════════════════════════════════════
('E66.01', 'Morbid (severe) obesity due to excess calories', 'سمنة مفرطة بسبب زيادة السعرات', 'Endocrine diseases', '{pediatrics,diet}'),
('E66.09', 'Other obesity due to excess calories', 'سمنة أخرى بسبب زيادة السعرات', 'Endocrine diseases', '{pediatrics,diet}'),
('E46', 'Unspecified protein-calorie malnutrition', 'سوء تغذية بروتيني حراري غير محدد', 'Endocrine diseases', '{pediatrics}'),
('E55.9', 'Vitamin D deficiency, unspecified', 'نقص فيتامين د غير محدد', 'Endocrine diseases', '{pediatrics,family_medicine,diet}'),
('D50.9', 'Iron deficiency anemia, unspecified', 'فقر الدم بعوز الحديد غير محدد', 'Diseases of the blood', '{pediatrics,family_medicine,diet}'),

-- ═══════════════════════════════════════════
-- DERMATOLOGIC (pediatric-common)
-- ═══════════════════════════════════════════
('L22', 'Diaper dermatitis', 'التهاب الجلد الحفاظي', 'Diseases of the skin', '{pediatrics,dermatology}'),
('L20.83', 'Infantile (acute) (chronic) eczema', 'أكزيما الرضع', 'Diseases of the skin', '{pediatrics,dermatology}'),
('L20.9', 'Atopic dermatitis, unspecified', 'التهاب الجلد التأتبي غير محدد', 'Diseases of the skin', '{pediatrics,dermatology,family_medicine}'),
('B08.1', 'Molluscum contagiosum', 'المليساء المعدية', 'Infectious diseases', '{pediatrics,dermatology}'),

-- ═══════════════════════════════════════════
-- ALLERGIC
-- ═══════════════════════════════════════════
('T78.1', 'Other adverse food reactions, not elsewhere classified', 'تفاعلات غذائية ضارة أخرى', 'Injury and poisoning', '{pediatrics,diet}'),
('J30.9', 'Allergic rhinitis, unspecified', 'التهاب الأنف التحسسي غير محدد', 'Diseases of the respiratory system', '{pediatrics,family_medicine}'),
('T78.2', 'Anaphylactic shock, unspecified', 'صدمة تأقية غير محددة', 'Injury and poisoning', '{pediatrics,family_medicine}'),
('L50.0', 'Allergic urticaria', 'الشرى التحسسي', 'Diseases of the skin', '{pediatrics,dermatology,family_medicine}'),

-- ═══════════════════════════════════════════
-- NEUROLOGICAL & OTHER
-- ═══════════════════════════════════════════
('R56.00', 'Simple febrile convulsions', 'نوبات حمى بسيطة', 'Symptoms and signs', '{pediatrics}'),
('R56.01', 'Complex febrile convulsions', 'نوبات حمى معقدة', 'Symptoms and signs', '{pediatrics}'),
('N39.0', 'Urinary tract infection, site not specified', 'عدوى المسالك البولية غير محددة الموقع', 'Diseases of the genitourinary system', '{pediatrics,family_medicine}'),
('R50.9', 'Fever, unspecified', 'حمى غير محددة', 'Symptoms and signs', '{pediatrics,family_medicine}')

ON CONFLICT (code) DO NOTHING;
