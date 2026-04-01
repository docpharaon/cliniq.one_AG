-- ============================================
-- cliniq.one Migration: Seed ICD-10 Codes
-- Diet & Nutrition
-- ============================================

INSERT INTO public.icd_codes (code, description, description_ar, category, specialty_tags) VALUES

-- ═══════════════════════════════════════════
-- NUTRITIONAL DEFICIENCIES
-- ═══════════════════════════════════════════
('E61.1', 'Iron deficiency', 'نقص الحديد', 'Endocrine diseases', '{diet,family_medicine}'),
('E53.8', 'Deficiency of other specified B group vitamins (B12)', 'نقص فيتامينات ب أخرى محددة', 'Endocrine diseases', '{diet,family_medicine}'),
('E56.9', 'Vitamin deficiency, unspecified', 'نقص فيتامين غير محدد', 'Endocrine diseases', '{diet,family_medicine}'),
('E53.9', 'Vitamin B deficiency, unspecified', 'نقص فيتامين ب غير محدد', 'Endocrine diseases', '{diet,family_medicine}'),
('E60', 'Dietary zinc deficiency', 'نقص الزنك الغذائي', 'Endocrine diseases', '{diet}'),
('E61.2', 'Magnesium deficiency', 'نقص المغنيسيوم', 'Endocrine diseases', '{diet}'),
('E58', 'Dietary calcium deficiency', 'نقص الكالسيوم الغذائي', 'Endocrine diseases', '{diet}'),
('E53.0', 'Riboflavin (B2) deficiency', 'نقص الريبوفلافين', 'Endocrine diseases', '{diet}'),
('E52', 'Niacin (B3) deficiency / pellagra', 'نقص النياسين / البلاجرا', 'Endocrine diseases', '{diet}'),
('E56.0', 'Vitamin E deficiency', 'نقص فيتامين هـ', 'Endocrine diseases', '{diet}'),
('E56.1', 'Vitamin K deficiency', 'نقص فيتامين ك', 'Endocrine diseases', '{diet}'),
('E51.9', 'Thiamine (B1) deficiency, unspecified', 'نقص الثيامين غير محدد', 'Endocrine diseases', '{diet}'),

-- ═══════════════════════════════════════════
-- OBESITY & OVERWEIGHT
-- ═══════════════════════════════════════════
('E66.9', 'Obesity, unspecified', 'سمنة غير محددة', 'Endocrine diseases', '{diet,family_medicine}'),
('E66.01', 'Morbid (severe) obesity due to excess calories', 'سمنة مفرطة بسبب زيادة السعرات', 'Endocrine diseases', '{diet,family_medicine}'),
('E66.3', 'Overweight', 'زيادة الوزن', 'Endocrine diseases', '{diet,family_medicine}'),
('Z68.30', 'Body mass index (BMI) 30.0-30.9, adult', 'مؤشر كتلة الجسم 30-30.9', 'Factors influencing health status', '{diet}'),
('Z68.35', 'Body mass index (BMI) 35.0-35.9, adult', 'مؤشر كتلة الجسم 35-35.9', 'Factors influencing health status', '{diet}'),
('Z68.41', 'Body mass index (BMI) 40.0-44.9, adult', 'مؤشر كتلة الجسم 40-44.9', 'Factors influencing health status', '{diet}'),

-- ═══════════════════════════════════════════
-- MALNUTRITION & UNDERWEIGHT
-- ═══════════════════════════════════════════
('E46', 'Unspecified protein-calorie malnutrition', 'سوء تغذية بروتيني حراري غير محدد', 'Endocrine diseases', '{diet,pediatrics}'),
('E44.1', 'Mild protein-calorie malnutrition', 'سوء تغذية بروتيني حراري خفيف', 'Endocrine diseases', '{diet}'),
('R63.4', 'Abnormal weight loss', 'فقدان وزن غير طبيعي', 'Symptoms and signs', '{diet,family_medicine}'),
('R63.6', 'Underweight', 'نقص الوزن', 'Symptoms and signs', '{diet}'),
('M62.84', 'Sarcopenia', 'ضمور العضلات (ساركوبينيا)', 'Diseases of the musculoskeletal system', '{diet,orthopedics}'),

-- ═══════════════════════════════════════════
-- METABOLIC & ENDOCRINE
-- ═══════════════════════════════════════════
('E11.9', 'Type 2 diabetes mellitus without complications', 'داء السكري النوع الثاني بدون مضاعفات', 'Endocrine diseases', '{diet,family_medicine}'),
('R73.03', 'Prediabetes', 'مرحلة ما قبل السكري', 'Symptoms and signs', '{diet,family_medicine}'),
('E28.2', 'Polycystic ovarian syndrome (PCOS)', 'متلازمة تكيس المبايض', 'Endocrine diseases', '{diet,family_medicine}'),
('E03.9', 'Hypothyroidism, unspecified', 'قصور الغدة الدرقية غير محدد', 'Endocrine diseases', '{diet,family_medicine}'),
('E78.5', 'Dyslipidemia, unspecified', 'اضطراب الدهون غير محدد', 'Endocrine diseases', '{diet,family_medicine}'),
('E78.0', 'Pure hypercholesterolemia', 'فرط الكوليسترول النقي', 'Endocrine diseases', '{diet,family_medicine}'),
('E78.1', 'Pure hypertriglyceridemia', 'فرط الدهون الثلاثية النقي', 'Endocrine diseases', '{diet,family_medicine}'),
('E88.81', 'Metabolic syndrome', 'متلازمة الأيض', 'Endocrine diseases', '{diet,family_medicine}'),
('I10', 'Essential (primary) hypertension', 'ارتفاع ضغط الدم الأساسي', 'Diseases of the circulatory system', '{diet,family_medicine}'),

-- ═══════════════════════════════════════════
-- GI & MALABSORPTION
-- ═══════════════════════════════════════════
('K90.0', 'Celiac disease', 'الداء الزلاقي (حساسية القمح)', 'Diseases of the digestive system', '{diet,family_medicine}'),
('E73.9', 'Lactose intolerance, unspecified', 'عدم تحمل اللاكتوز غير محدد', 'Endocrine diseases', '{diet}'),
('K58.9', 'Irritable bowel syndrome without diarrhea', 'متلازمة القولون العصبي بدون إسهال', 'Diseases of the digestive system', '{diet,family_medicine}'),
('K21.0', 'Gastro-esophageal reflux disease', 'مرض الارتجاع المعدي المريئي', 'Diseases of the digestive system', '{diet,family_medicine}'),
('K90.9', 'Intestinal malabsorption, unspecified', 'سوء الامتصاص المعوي غير محدد', 'Diseases of the digestive system', '{diet}'),
('K59.00', 'Constipation, unspecified', 'إمساك غير محدد', 'Diseases of the digestive system', '{diet,family_medicine}'),
('R14.0', 'Abdominal distension (bloating)', 'انتفاخ البطن', 'Symptoms and signs', '{diet,family_medicine}'),

-- ═══════════════════════════════════════════
-- EATING DISORDERS
-- ═══════════════════════════════════════════
('F50.00', 'Anorexia nervosa, unspecified', 'فقدان الشهية العصبي غير محدد', 'Mental and behavioural disorders', '{diet,psychiatry}'),
('F50.2', 'Bulimia nervosa', 'الشره المرضي العصبي', 'Mental and behavioural disorders', '{diet,psychiatry}'),
('F50.81', 'Binge eating disorder', 'اضطراب نهم الطعام', 'Mental and behavioural disorders', '{diet,psychiatry}'),
('F50.82', 'Avoidant/restrictive food intake disorder (ARFID)', 'اضطراب تجنب/تقييد تناول الطعام', 'Mental and behavioural disorders', '{diet,psychiatry,pediatrics}'),
('R63.0', 'Anorexia (loss of appetite)', 'فقدان الشهية', 'Symptoms and signs', '{diet,family_medicine}'),

-- ═══════════════════════════════════════════
-- FOOD ALLERGY & INTOLERANCE
-- ═══════════════════════════════════════════
('T78.1', 'Other adverse food reactions', 'تفاعلات غذائية ضارة أخرى', 'Injury and poisoning', '{diet,pediatrics}'),
('Z91.010', 'Allergy status to peanuts', 'حالة حساسية للفول السوداني', 'Factors influencing health status', '{diet,pediatrics}'),
('Z91.011', 'Allergy status to milk products', 'حالة حساسية لمنتجات الحليب', 'Factors influencing health status', '{diet,pediatrics}'),
('Z91.012', 'Allergy status to eggs', 'حالة حساسية للبيض', 'Factors influencing health status', '{diet,pediatrics}'),
('Z91.013', 'Allergy status to seafood', 'حالة حساسية للمأكولات البحرية', 'Factors influencing health status', '{diet,pediatrics}'),
('K52.21', 'Food protein-induced enterocolitis syndrome (FPIES)', 'متلازمة التهاب الأمعاء والقولون بالبروتين الغذائي', 'Diseases of the digestive system', '{diet,pediatrics}'),

-- ═══════════════════════════════════════════
-- POST-BARIATRIC & OTHER
-- ═══════════════════════════════════════════
('Z98.84', 'Bariatric surgery status', 'حالة ما بعد جراحة السمنة', 'Factors influencing health status', '{diet}'),
('E64.9', 'Sequelae of unspecified nutritional deficiency', 'آثار نقص غذائي غير محدد', 'Endocrine diseases', '{diet}'),
('Z71.3', 'Dietary counseling and surveillance', 'استشارة ومراقبة غذائية', 'Factors influencing health status', '{diet}'),
('Z72.4', 'Inappropriate diet and eating habits', 'عادات غذائية غير مناسبة', 'Factors influencing health status', '{diet}')

ON CONFLICT (code) DO NOTHING;
