'use client';

import { createContext, useContext, useState, useCallback, ReactNode } from 'react';

export type Locale = 'en' | 'ar';

interface I18nContextType {
    locale: Locale;
    dir: 'ltr' | 'rtl';
    toggleLocale: () => void;
    t: (key: string) => string;
}

const translations: Record<string, Record<Locale, string>> = {
    // ─── HEADER ───
    'nav.about': { en: 'About', ar: 'عن المنصة' },
    'nav.howItWorks': { en: 'How It Works', ar: 'كيف يعمل' },
    'nav.doctors': { en: 'Our Doctors', ar: 'أطباؤنا' },
    'nav.story': { en: 'Our Story', ar: 'قصتنا' },
    'nav.safety': { en: 'Safety', ar: 'السلامة' },
    'nav.download': { en: 'Download', ar: 'التحميل' },
    'nav.tester': { en: 'Become a Tester', ar: 'انضم للتجربة' },
    'nav.consultation': { en: 'Join Early Access', ar: 'جرّب الآن' },

    // ─── HERO ───
    'hero.badge': { en: 'Licensed Doctors · KSA & UAE', ar: 'أطباء مرخّصون · السعودية والإمارات' },
    'hero.h1_1': { en: 'Medical Consultations', ar: 'استشارات طبية' },
    'hero.h1_2': { en: 'with Licensed Doctors.', ar: 'مع أطباء مرخّصين.' },
    'hero.h1_3': { en: 'Online. Safe. Bilingual.', ar: 'عن بُعد. آمنة. ثنائية اللغة.' },
    'hero.sub': { en: 'Describe your symptoms once. Our AI structures your medical interview, routes you to the right specialist, and generates a professional clinical note — all reviewed by a licensed doctor. No guessing. No repeating. Just structured care.', ar: 'اشرح أعراضك مرة واحدة. ذكاؤنا الاصطناعي يُنظّم مقابلتك الطبية، يوجّهك للتخصص المناسب، وينتج ملاحظة سريرية احترافية — كل ذلك بمراجعة طبيب مرخّص. بدون تخمين. بدون تكرار. رعاية منظّمة فقط.' },
    'hero.cta_primary': { en: 'Enroll as Early Tester', ar: 'ابدأ التجربة الآن' },
    'hero.cta_secondary': { en: 'How It Works', ar: 'كيف يعمل' },
    'hero.download': { en: 'Download APK', ar: 'نزّل التطبيق' },
    'hero.tester': { en: 'Become a Tester', ar: 'انضم للتجربة' },
    'hero.stat1_val': { en: '5+', ar: '5+' },
    'hero.stat1_label': { en: 'Medical Specialties', ar: 'تخصصات طبية' },
    'hero.stat2_val': { en: '< 30 min', ar: '< 30 دقيقة' },
    'hero.stat2_label': { en: 'Avg. Response', ar: 'متوسط الاستجابة' },
    'hero.stat3_val': { en: '19', ar: '19' },
    'hero.stat3_label': { en: 'Safety Checks', ar: 'فحوصات أمان' },
    'hero.stat4_val': { en: '2', ar: '2' },
    'hero.stat4_label': { en: 'Languages', ar: 'لغات' },
    'hero.trust_doctors': { en: 'Licensed Doctors', ar: 'أطباء مرخّصون' },
    'hero.trust_bilingual': { en: 'Arabic & English', ar: 'العربية والإنجليزية' },
    'hero.trust_prescription': { en: 'E-Prescription', ar: 'وصفة إلكترونية' },
    'hero.trust_privacy': { en: 'Privacy Protected', ar: 'خصوصية محمية' },
    'hero.overlay_title': { en: 'Doctor-Reviewed Care', ar: 'رعاية يراجعها طبيب' },
    'hero.overlay_sub': { en: 'Every case reviewed by a licensed physician', ar: 'كل حالة يراجعها طبيب مرخّص' },
    'hero.safety_title': { en: '19 Safety Checks', ar: '19 فحص أمان' },
    'hero.safety_sub': { en: 'Multi-layered protection', ar: 'حماية متعددة الطبقات' },
    'hero.scroll_hint': { en: 'Scroll for more', ar: 'اسحب للمزيد' },

    // ─── TRUST BAR ───
    'trust.doctors': { en: 'Doctor Reviewed', ar: 'مراجعة من طبيب' },
    'trust.privacy': { en: 'Privacy Protected', ar: 'خصوصية محمية' },
    'trust.bilingual': { en: 'Arabic & English', ar: 'العربية والإنجليزية' },
    'trust.prescription': { en: 'E-Prescription', ar: 'وصفة إلكترونية' },
    'trust.multispecialty': { en: 'Multi-Specialty', ar: 'متعدد التخصصات' },

    // ─── INNOVATION ───
    'innov.tag': { en: 'Our Innovation', ar: 'ابتكارنا' },
    'innov.h2_1': { en: 'A New Model for', ar: 'نموذج جديد في' },
    'innov.h2_2': { en: 'Medical Consultation', ar: 'الاستشارات الطبية' },
    'innov.sub': { en: 'cliniq.one reimagines the telemedicine experience. Instead of choosing a doctor and hoping for the best, you describe your symptoms once — and our system does the rest.', ar: 'cliniq.one يعيد تصوّر تجربة الطب عن بُعد. بدلاً من اختيار طبيب والأمل بالأفضل، تصف أعراضك مرة واحدة — ونظامنا يتولى الباقي.' },

    'innov.old_title': { en: 'Traditional Telemedicine', ar: 'الطب عن بُعد التقليدي' },
    'innov.old_sub': { en: 'Fragmented and patient-dependent', ar: 'مُجزّأ ويعتمد على المريض' },
    'innov.old_1': { en: 'You must guess which specialty you need before booking', ar: 'يجب أن تخمّن التخصص المطلوب قبل الحجز' },
    'innov.old_2': { en: 'Each doctor asks the same intake questions from scratch', ar: 'كل طبيب يسأل نفس أسئلة الاستقبال من الصفر' },
    'innov.old_3': { en: 'No structured clinical documentation — just chat', ar: 'لا توثيق سريري منظّم — مجرد محادثة' },
    'innov.old_4': { en: 'Safety checks depend entirely on the individual doctor', ar: 'فحوصات الأمان تعتمد كلياً على الطبيب الفرد' },

    'innov.new_title': { en: 'The cliniq.one Model', ar: 'نموذج cliniq.one' },
    'innov.new_sub': { en: 'Structured, intelligent, and doctor-reviewed', ar: 'منظّم، ذكي، ومُراجَع من طبيب' },
    'innov.new_1': { en: 'AI conducts a thorough medical interview and routes you to the right specialist automatically', ar: 'الذكاء الاصطناعي يُجري مقابلة طبية شاملة ويوجّهك تلقائياً إلى التخصص المناسب' },
    'innov.new_2': { en: 'One consultation can span multiple specialties — no re-explaining', ar: 'استشارة واحدة تشمل تخصصات متعددة — بدون إعادة شرح' },
    'innov.new_3': { en: 'Every case produces a professional clinical note (HPI, ROS, assessment)', ar: 'كل حالة تنتج ملاحظة سريرية احترافية (HPI, ROS, تقييم)' },
    'innov.new_4': { en: '19 automated safety checks run before a doctor even sees the case', ar: '19 فحص أمان آلي يعمل قبل أن يرى الطبيب الحالة' },

    'innov.pillars_title': { en: 'What Makes This Different', ar: 'ما الذي يجعل هذا مختلفاً' },
    'innov.pillars_sub': { en: 'Core innovations that power the cliniq.one consultation experience', ar: 'ابتكارات أساسية تدعم تجربة الاستشارة في cliniq.one' },

    'innov.p1': { en: 'AI-Structured Medical Interview', ar: 'مقابلة طبية مُنظّمة بالذكاء الاصطناعي' },
    'innov.p1_desc': { en: 'A clinically-trained AI chatbot gathers symptoms, history, medications, and allergies — following real clinical interview protocols used by physicians.', ar: 'روبوت محادثة مدرّب سريرياً يجمع الأعراض والتاريخ المرضي والأدوية والحساسيات — متبعاً بروتوكولات المقابلة السريرية الحقيقية.' },

    'innov.p2': { en: 'Smart Multi-Specialty Routing', ar: 'توجيه ذكي متعدد التخصصات' },
    'innov.p2_desc': { en: 'Your symptoms are analyzed and routed to the right specialist — or multiple specialists for complex cases. No more guessing which doctor to see.', ar: 'أعراضك تُحلّل وتُوجَّه للتخصص المناسب — أو تخصصات متعددة للحالات المعقدة. لا مزيد من التخمين.' },

    'innov.p3': { en: 'Professional Clinical Notes', ar: 'ملاحظات سريرية احترافية' },
    'innov.p3_desc': { en: 'AI generates structured clinical documentation (HPI, ROS, assessment) — giving doctors a complete picture before they even start reviewing.', ar: 'الذكاء الاصطناعي ينتج توثيقاً سريرياً منظّماً (HPI, ROS, تقييم) — يمنح الأطباء صورة كاملة قبل البدء بالمراجعة.' },

    'innov.p4': { en: '19 Safety Verification Layers', ar: '19 طبقة تحقق أمان' },
    'innov.p4_desc': { en: 'Drug interactions, allergy conflicts, dosage checks, red-flag symptoms, and more — all verified automatically before a doctor reviews the case.', ar: 'تفاعلات دوائية، تعارضات حساسية، فحص جرعات، أعراض خطرة، والمزيد — كلها تُتحقق آلياً قبل مراجعة الطبيب.' },

    'innov.p5': { en: 'Real-Time Bilingual Support', ar: 'دعم ثنائي اللغة فوري' },
    'innov.p5_desc': { en: 'The entire consultation — intake, clinical note, and doctor review — works seamlessly in both Arabic and English with full medical accuracy.', ar: 'الاستشارة بالكامل — الاستقبال، الملاحظة السريرية، ومراجعة الطبيب — تعمل بسلاسة بالعربية والإنجليزية بدقة طبية كاملة.' },

    'innov.p6': { en: 'Doctor-Final Decision Model', ar: 'نموذج القرار النهائي للطبيب' },
    'innov.p6_desc': { en: 'AI assists — doctors decide. Every diagnosis, treatment plan, and prescription is made by a licensed physician. AI never acts independently.', ar: 'الذكاء الاصطناعي يساعد — الطبيب يقرر. كل تشخيص وخطة علاج ووصفة تُصدر من طبيب مرخّص. الذكاء الاصطناعي لا يعمل بشكل مستقل أبداً.' },

    'innov.p7': { en: 'Clinical Image Capture', ar: 'التقاط الصور السريرية' },
    'innov.p7_desc': { en: 'Upload photos of skin conditions, wounds, or affected areas directly during your AI interview — automatically linked to the right specialty pathway.', ar: 'ارفع صور الحالات الجلدية أو الجروح أو المناطق المتأثرة أثناء المقابلة الذكية — تُربط تلقائياً بمسار التخصص المناسب.' },

    'innov.p8': { en: 'Insurance Pre-Authorization', ar: 'الموافقة المسبقة من التأمين' },
    'innov.p8_desc': { en: 'Integrated insurance verification and pre-authorization — reducing claim denials and streamlining the payment process for both patients and providers.', ar: 'تحقق متكامل من التأمين والموافقة المسبقة — يقلل رفض المطالبات ويُسهّل عملية الدفع للمرضى ومقدمي الخدمة.' },

    'innov.patent': { en: '🔬 Patented AI-driven clinical platform — Saudi Patent No. SA 1020262581 · Saudi Authority for Intellectual Property (SAIP)', ar: '🔬 منصة سريرية مدعومة بالذكاء الاصطناعي حاصلة على براءة اختراع — براءة اختراع سعودية رقم SA 1020262581 · الهيئة السعودية للملكية الفكرية (SAIP)' },

    // ─── ABOUT ───
    'about.tag': { en: 'The Platform', ar: 'المنصة' },
    'about.h2_1': { en: 'A Complete', ar: 'عيادة' },
    'about.h2_2': { en: 'Virtual Clinic', ar: 'افتراضية شاملة' },
    'about.sub': { en: "cliniq.one is not just another telemedicine app — it's a comprehensive multi-specialty virtual medical clinic that serves as your complete primary care destination.", ar: 'cliniq.one ليست مجرد تطبيق طب عن بُعد عادي — بل هي عيادة طبية افتراضية شاملة متعددة التخصصات، وتخدمك كوجهتك الكاملة للرعاية الصحية الأولية.' },
    'about.f1_title': { en: 'AI-Powered Medical Intake', ar: 'استقبال طبي مدعوم بالذكاء الاصطناعي' },
    'about.f1_desc': { en: 'Our advanced AI chatbot conducts a comprehensive medical interview, replacing traditional forms with an intelligent conversation that adapts to your symptoms.', ar: 'يقوم الشات بوت المدعوم بالذكاء الاصطناعي المتقدم بإجراء مقابلة طبية شاملة، ويستبدل النماذج التقليدية بمحادثة ذكية تتكيف مع أعراضك.' },
    'about.f2_title': { en: 'Smart Specialty Routing', ar: 'توجيه ذكي للتخصصات' },
    'about.f2_desc': { en: "Don't know which doctor to see? Our AI analyzes your symptoms and automatically routes you to the right specialist — or multiple specialists for complex cases.", ar: 'لا تعرف أي طبيب تحتاج؟ يحلل الذكاء الاصطناعي أعراضك ويوجّهك تلقائيًا إلى التخصص المناسب — أو إلى أكثر من تخصص في الحالات المعقدة.' },
    'about.f3_title': { en: 'Structured Clinical Reports', ar: 'تقارير سريرية منظّمة' },
    'about.f3_desc': { en: 'Every consultation produces professional medical documentation including diagnosis, treatment plan, e-prescriptions, and patient education.', ar: 'كل استشارة تنتج توثيقًا طبيًا احترافيًا يشمل التشخيص، وخطة العلاج، والوصفات الإلكترونية، وتثقيف المريض.' },
    'about.f4_title': { en: 'Bilingual Arabic & English', ar: 'ثنائي اللغة: العربية والإنجليزية' },
    'about.f4_desc': { en: 'Full RTL Arabic support with 600+ translation keys. Medical accuracy maintained in both languages with locale-aware formatting.', ar: 'دعم عربي كامل باتجاه الكتابة من اليمين إلى اليسار، مع أكثر من 600 مفتاح ترجمة، مع الحفاظ على الدقة الطبية في اللغتين وتنسيق مناسب لكل لغة.' },
    'about.f5_title': { en: '19 Safety Verification Layers', ar: '19 طبقة تحقق للسلامة' },
    'about.f5_desc': { en: 'From drug interaction detection to allergy cross-checking, dosage validation to red-flag symptom detection — safety is built into every step.', ar: 'من اكتشاف التداخلات الدوائية إلى التحقق من الحساسية، ومن مراجعة الجرعات إلى رصد الأعراض التحذيرية — السلامة مدمجة في كل خطوة.' },
    'about.f6_title': { en: 'Zero-Storage Philosophy', ar: 'فلسفة عدم التخزين' },
    'about.f6_desc': { en: 'Your medical data is never stored long-term. Session-based processing with automatic purging after your consultation is complete and your report is generated. Your data belongs to you.', ar: 'بياناتك الطبية لا تُخزَّن على المدى الطويل مطلقًا. تتم المعالجة على مستوى الجلسة مع حذف تلقائي بعد اكتمال استشارتك وإنشاء تقريرك. وتبقى بياناتك ملكًا لك.' },

    // ─── HOW IT WORKS ───
    'how.tag': { en: 'The Journey', ar: 'الرحلة' },
    'how.h2_1': { en: 'How', ar: 'كيف' },
    'how.h2_2': { en: 'Works', ar: 'يعمل' },
    'how.sub': { en: 'From symptom to treatment plan in four intelligent steps', ar: 'من الأعراض إلى خطة العلاج في أربع خطوات ذكية' },
    'how.step': { en: 'Step', ar: 'الخطوة' },
    'how.s1_title': { en: 'Describe Your Symptoms', ar: 'اشرح أعراضك' },
    'how.s1_desc': { en: "Tell our AI chatbot what's bothering you in your own words — in English or Arabic. No medical jargon needed. The AI understands natural language and extracts medical context automatically.", ar: 'أخبر المساعد الذكي بما يزعجك بكلماتك أنت — بالعربية أو بالإنجليزية. لا تحتاج إلى مصطلحات طبية. يفهم الذكاء الاصطناعي اللغة الطبيعية ويستخرج السياق الطبي تلقائيًا.' },
    'how.s1_detail': { en: 'The AI detects symptoms, medications, body systems affected, and even auto-recognizes drug names mentioned casually in conversation.', ar: 'يكتشف الذكاء الاصطناعي الأعراض، والأدوية، وأجهزة الجسم المتأثرة، وحتى يتعرف تلقائيًا على أسماء الأدوية المذكورة بشكل عفوي أثناء الكلام.' },
    'how.s2_title': { en: 'AI Clinical Interview', ar: 'المقابلة السريرية بالذكاء الاصطناعي' },
    'how.s2_desc': { en: 'Our advanced AI chatbot conducts a comprehensive medical intake — History of Present Illness, Review of Systems, Family History, Medications, and more.', ar: 'يجري المساعد المدعوم بالذكاء الاصطناعي مقابلة طبية شاملة — تشمل تاريخ الشكوى الحالية، ومراجعة الأجهزة، والتاريخ العائلي، والأدوية، وغير ذلك.' },
    'how.s2_detail': { en: 'Adaptive questioning adjusts follow-ups based on your answers. The entire interview takes 8-10 minutes at your own pace.', ar: 'الأسئلة التكيفية تضبط المتابعة بحسب إجاباتك. والمقابلة كاملة تستغرق تقريبًا من 8 إلى 10 دقائق وعلى راحتك.' },
    'how.s3_title': { en: 'Smart Specialty Routing', ar: 'توجيه ذكي للتخصصات' },
    'how.s3_desc': { en: 'The AI analyzes your symptoms and intelligently routes you to the right specialist. Dermatology, Family Medicine, or even multiple specialties working together.', ar: 'يحلل الذكاء الاصطناعي أعراضك ويوجّهك بذكاء إلى التخصص المناسب: جلدية، أو طب الأسرة، أو حتى أكثر من تخصص يعمل معًا.' },
    'how.s3_detail': { en: "'One consultation. Multiple specialties. One decision.' — You never have to guess which doctor to see.", ar: '"استشارة واحدة. تخصصات متعددة. قرار واحد." — لم تعد بحاجة إلى الحيرة في اختيار الطبيب المناسب.' },
    'how.s4_title': { en: 'Licensed Doctor Review', ar: 'مراجعة طبيب مرخّص' },
    'how.s4_desc': { en: 'A licensed physician receives your complete clinical note and provides a structured response: diagnosis, treatment plan, e-prescriptions, and patient education.', ar: 'يستلم طبيب مرخّص ملاحظتك السريرية الكاملة ويقدّم ردًا منظّمًا يشمل: التشخيص، وخطة العلاج، والوصفات الإلكترونية، وتثقيف المريض.' },
    'how.s4_detail': { en: 'Doctors focus on diagnosis and treatment — not repeating intake questions. Integrated with MOH e-Prescription system for KSA/UAE.', ar: 'يركّز الأطباء على التشخيص والعلاج بدلًا من تكرار أسئلة التقييم الأولي. كما أن المنصة متكاملة مع نظام الوصفة الإلكترونية التابع لوزارة الصحة في السعودية والإمارات.' },

    // ─── FOR WHO ───
    'who.tag': { en: "Who It's For", ar: 'لمن هذه المنصة' },
    'who.h2_1': { en: 'Built for', ar: 'مصممة' },
    'who.h2_2': { en: 'Everyone', ar: 'للجميع' },
    'who.patients': { en: 'For Patients', ar: 'للمرضى' },
    'who.p1': { en: 'No need to guess which specialist you need', ar: 'ما تحتاج تحتار أي تخصص يناسب حالتك' },
    'who.p2': { en: 'AI interview at your own pace — 8-10 minutes', ar: 'مقابلة ذكاء اصطناعي على راحتك — من 8 إلى 10 دقائق' },
    'who.p3': { en: 'Full Arabic & English with RTL support', ar: 'دعم كامل للعربية والإنجليزية مع دعم اتجاه الكتابة من اليمين إلى اليسار' },
    'who.p4': { en: 'E-prescriptions via MOH system (KSA/UAE)', ar: 'وصفات إلكترونية عبر نظام وزارة الصحة (السعودية/الإمارات)' },
    'who.p5': { en: 'Zero long-term data retention — your privacy first', ar: 'بدون احتفاظ طويل الأمد بالبيانات — خصوصيتك أولًا' },
    'who.p6': { en: 'Complete mobile experience with native Android & iOS apps', ar: 'تجربة جوال كاملة عبر تطبيقات Android و iOS الأصلية' },
    'who.p_footer1': { en: '🆕 New Complaint • 📋 Follow-Up • 💊 Medication Refill', ar: '🆕 شكوى جديدة • 📋 متابعة • 💊 إعادة صرف دواء' },
    'who.p_footer2': { en: 'Three consultation types to fit your needs', ar: 'ثلاثة أنواع استشارات تناسب احتياجك' },
    'who.doctors': { en: 'For Doctors', ar: 'للأطباء' },
    'who.d1': { en: 'Receive complete AI-generated clinical notes', ar: 'استلام ملاحظات سريرية كاملة مولّدة بالذكاء الاصطناعي' },
    'who.d2': { en: 'Focus on diagnosis — not intake questions', ar: 'التركيز على التشخيص — وليس أسئلة الاستقبال' },
    'who.d3': { en: 'Specialty-specific intervention catalogs', ar: 'كتالوجات تدخلات خاصة بكل تخصص' },
    'who.d4': { en: 'Analytics dashboard with performance metrics', ar: 'لوحة تحليلات مع مؤشرات أداء' },
    'who.d5': { en: 'Token-based compensation system', ar: 'نظام تعويض قائم على الرموز' },
    'who.d6': { en: 'Multi-specialty collaboration for complex cases', ar: 'تعاون متعدد التخصصات للحالات المعقدة' },
    'who.d_footer1': { en: '🩺 Dermatology • 🏥 Family Medicine • 🔀 Multi-Specialty', ar: '🩺 الأمراض الجلدية • 🏥 طب الأسرة • 🔀 متعدد التخصصات' },
    'who.d_footer2': { en: 'Currently supporting two core specialties with more planned', ar: 'ندعم حاليًا تخصصين أساسيين مع خطط لإضافة المزيد' },

    // ─── STORY / DOCTORS ───
    'story.tag': { en: 'Your Doctors', ar: 'أطباؤكم' },
    'story.h2_1': { en: 'Meet Your', ar: 'تعرّف على' },
    'story.h2_2': { en: 'Doctors', ar: 'أطبائك' },
    'story.intro': { en: 'Your care is led by experienced, licensed physicians with deep expertise in their fields.', ar: 'رعايتك بقيادة أطباء مرخّصين ذوي خبرة واسعة وتخصص عميق في مجالاتهم.' },
    'story.m_title': { en: 'Consultant Dermatologist & Venereologist · Founder & CEO', ar: 'استشاري أمراض جلدية وتناسلية · المؤسس والرئيس التنفيذي' },
    'story.m_bio1': { en: 'Dr. Momen Pharaon is a Saudi physician, consultant dermatologist, inventor, and serial entrepreneur operating under the Momencraft trade name. With over 15 years of clinical experience, he has built a career at the intersection of medicine, technology, and innovation.', ar: 'د. مؤمن فرعون طبيب سعودي، واستشاري أمراض جلدية، ومخترع، ورائد أعمال متسلسل يعمل تحت الاسم التجاري Momencraft. وعلى مدى أكثر من 15 سنة من الخبرة السريرية، بنى مسيرته عند تقاطع الطب والتقنية والابتكار.' },
    'story.m_bio2': { en: 'He graduated from King Saud University in Riyadh, then pursued advanced training in France, completing his Dermatology residency (2010–2014) and obtaining the DES in Dermatology in Nice. Fluent in multiple languages, he has authored several medical publications.', ar: 'تخرّج من جامعة الملك سعود في الرياض، ثم أكمل تدريبه المتقدم في فرنسا، حيث أنهى برنامج الإقامة في الأمراض الجلدية (2010–2014) وحصل على شهادة DES في الأمراض الجلدية في نيس. ويتحدث عدة لغات بطلاقة، وله عدد من المنشورات الطبية.' },
    'story.m_bio3': { en: 'As both a practicing physician and innovator, Dr. Momen identified persistent challenges in traditional healthcare — long wait times, uncertainty in choosing a specialty, fragmented care pathways, and inefficiencies in multidisciplinary decision-making. These insights directly inspired cliniq.one.', ar: 'وبصفته طبيبًا ممارسًا ومبتكرًا في الوقت نفسه، لاحظ د. مؤمن تحديات مستمرة في الرعاية الصحية التقليدية — مثل طول فترات الانتظار، والحيرة في اختيار التخصص المناسب، وتشتت مسارات الرعاية، وضعف الكفاءة في اتخاذ القرار متعدد التخصصات. وهذه الرؤى كانت هي الإلهام المباشر وراء cliniq.one.' },
    'story.m_tag1': { en: 'Dermatology', ar: 'الأمراض الجلدية' },
    'story.m_tag2': { en: 'AI Healthcare', ar: 'الذكاء الاصطناعي الصحي' },
    'story.m_tag3': { en: 'Patent Holder', ar: 'مالك براءات اختراع' },
    'story.m_tag4': { en: 'Serial Entrepreneur', ar: 'رائد أعمال متسلسل' },
    'story.mo_title': { en: 'Family Medicine Specialist · Co-Founder & Clinical Strategist', ar: 'اختصاصي طب الأسرة · الشريك المؤسس والاستراتيجي السريري' },
    'story.mo_bio1': { en: 'cliniq.one is co-developed with Dr. Mohammad Pharaon, a pioneering Family Medicine specialist and nationally recognized figure in primary care innovation in Saudi Arabia.', ar: 'تم تطوير cliniq.one بالشراكة مع د. محمد فرعون، وهو اختصاصي رائد في طب الأسرة وشخصية معروفة على المستوى الوطني في ابتكار الرعاية الأولية في السعودية.' },
    'story.mo_bio2': { en: "Known for his leadership in Family Medicine and patient-centered clinical philosophy, Dr. Mohammad's deep expertise in primary care and system-level clinical decision-making shaped cliniq.one's core philosophy as a true virtual primary care clinic — not a fragmented telemedicine service.", ar: 'وبفضل قيادته في طب الأسرة وفلسفته السريرية المرتكزة على المريض، ساهمت خبرته العميقة في الرعاية الأولية واتخاذ القرار السريري على مستوى الأنظمة في تشكيل الفلسفة الأساسية لـ cliniq.one كعيادة رعاية أولية افتراضية حقيقية — وليست خدمة طب عن بُعد مجزأة.' },
    'story.mo_bio3': { en: 'Together, the Pharaon brothers unite specialty medicine and family medicine under one intelligent, AI-orchestrated consultation model — ensuring every consultation balances specialist depth with holistic primary care oversight.', ar: 'معًا، يوحّد الأخوان فرعون بين الطب التخصصي وطب الأسرة ضمن نموذج استشارة ذكي يُدار بالذكاء الاصطناعي — بما يضمن أن كل استشارة تجمع بين عمق التخصص ونظرة الرعاية الأولية الشاملة.' },
    'story.mo_tag1': { en: 'Family Medicine', ar: 'طب الأسرة' },
    'story.mo_tag2': { en: 'Primary Care Innovation', ar: 'ابتكار الرعاية الأولية' },
    'story.mo_tag3': { en: 'Clinical Strategy', ar: 'الاستراتيجية السريرية' },
    'story.mo_tag4': { en: 'Award Winner', ar: 'حائز على جوائز' },
    'story.ip_title': { en: 'Intellectual Property & Patent Protection', ar: 'الملكية الفكرية وحماية البراءات' },
    'story.ip_desc': { en: 'The cliniq.one concept, workflow architecture, and AI-driven multi-specialty consultation model are protected under Saudi Patent No. SA 1020262581, granted by the Saudi Authority for Intellectual Property (SAIP). This includes proprietary methodologies for single-intake multi-specialty routing, AI-generated clinical documentation, session-based zero-storage consultations, and intelligent specialty collaboration.', ar: 'إن مفهوم cliniq.one، وبنية سير العمل، ونموذج الاستشارات متعددة التخصصات المدعوم بالذكاء الاصطناعي محمية ببراءة اختراع سعودية رقم SA 1020262581، الممنوحة من الهيئة السعودية للملكية الفكرية (SAIP). ويشمل ذلك المنهجيات الخاصة بالتوجيه متعدد التخصصات من خلال استقبال واحد، والتوثيق السريري المُولّد بالذكاء الاصطناعي، والاستشارات القائمة على الجلسة بدون تخزين دائم، والتعاون الذكي بين التخصصات.' },

    // ─── SAFETY ───
    'safety.tag': { en: 'Patient Safety', ar: 'سلامة المريض' },
    'safety.h2_1': { en: '19 Safety Layers', ar: '19 طبقة أمان' },
    'safety.h2_2': { en: 'Protecting You', ar: 'نحميك' },
    'safety.sub': { en: 'Multi-layered AI verification systems that operate continuously and simultaneously, creating redundant safety layers. If one system misses something, another catches it.', ar: 'أنظمة تحقق متعددة الطبقات تعمل بشكل مستمر ومتزامن، لتكوين مستويات أمان احتياطية. وإذا فات شيء على نظام، يلتقطه نظام آخر.' },
    'safety.l1_name': { en: 'Diagnosis Verification', ar: 'التحقق من التشخيص' },
    'safety.l1_desc': { en: 'Cross-checks diagnoses against symptom patterns and clinical guidelines', ar: 'يطابق التشخيصات مع أنماط الأعراض والإرشادات السريرية' },
    'safety.l2_name': { en: 'Medical Spelling', ar: 'التدقيق الإملائي الطبي' },
    'safety.l2_desc': { en: 'Auto-corrects medical terminology, drug names, and condition names', ar: 'يصحح تلقائيًا المصطلحات الطبية، وأسماء الأدوية، وأسماء الحالات' },
    'safety.l3_name': { en: 'Response Relevance', ar: 'ملاءمة الاستجابة' },
    'safety.l3_desc': { en: 'Validates patient responses are relevant to clinical questions', ar: 'يتحقق من أن إجابات المريض مرتبطة بالأسئلة السريرية' },
    'safety.l4_name': { en: 'Medication Verification', ar: 'التحقق من الأدوية' },
    'safety.l4_desc': { en: 'Validates medication names against pharmaceutical databases', ar: 'يتحقق من أسماء الأدوية بمقارنتها بقواعد البيانات الدوائية' },
    'safety.l5_name': { en: 'Drug Interaction Detection', ar: 'اكتشاف التداخلات الدوائية' },
    'safety.l5_desc': { en: 'Scans for dangerous drug-drug interactions before prescriptions', ar: 'يفحص التداخلات الخطيرة بين الأدوية قبل إصدار الوصفة' },
    'safety.l6_name': { en: 'Allergy Cross-Checking', ar: 'التحقق المتقاطع من الحساسية' },
    'safety.l6_desc': { en: 'Validates prescriptions against patient allergy profiles', ar: 'يراجع الوصفات مقارنةً بملف حساسية المريض' },
    'safety.l7_name': { en: 'Dosage Validation', ar: 'التحقق من الجرعة' },
    'safety.l7_desc': { en: 'Ensures age, weight, and indication-appropriate dosing', ar: 'يضمن ملاءمة الجرعات للعمر، والوزن، والاستطباب' },
    'safety.l8_name': { en: 'Contraindication Detection', ar: 'اكتشاف موانع الاستعمال' },
    'safety.l8_desc': { en: 'Identifies conditions where certain medications are unsafe', ar: 'يحدد الحالات التي تكون فيها بعض الأدوية غير آمنة' },
    'safety.l9_name': { en: 'Duplicate Medication', ar: 'تكرار الدواء' },
    'safety.l9_desc': { en: 'Prevents duplicate prescriptions in the same therapeutic class', ar: 'يمنع تكرار وصف أدوية من نفس الفئة العلاجية' },
    'safety.l10_name': { en: 'Red Flag Symptoms', ar: 'الأعراض التحذيرية' },
    'safety.l10_desc': { en: 'Identifies emergency symptoms requiring immediate evaluation', ar: 'يحدد الأعراض التحذيرية التي تتطلب تقييمًا فوريًا' },
    'safety.l11_name': { en: 'Age-Appropriate Checking', ar: 'التحقق من ملاءمة العمر' },
    'safety.l11_desc': { en: 'Validates pediatric and geriatric medication safety', ar: 'يراجع سلامة الأدوية للأطفال وكبار السن' },
    'safety.l12_name': { en: 'Pregnancy Safety', ar: 'سلامة الحمل' },
    'safety.l12_desc': { en: 'Screens medications for pregnancy and lactation safety', ar: 'يفحص الأدوية من ناحية السلامة أثناء الحمل والرضاعة' },
    'safety.l13_name': { en: 'Lab Interpretation', ar: 'تفسير التحاليل' },
    'safety.l13_desc': { en: 'Interprets lab results and flags abnormal values', ar: 'يفسّر نتائج التحاليل ويرصد القيم غير الطبيعية' },
    'safety.l14_name': { en: 'Vital Signs Validation', ar: 'التحقق من العلامات الحيوية' },
    'safety.l14_desc': { en: 'Detects physiologically impossible vital sign values', ar: 'يكشف القيم غير المنطقية فسيولوجيًا في العلامات الحيوية' },
    'safety.l15_name': { en: 'History Consistency', ar: 'اتساق التاريخ المرضي' },
    'safety.l15_desc': { en: 'Detects contradictions in patient medical history', ar: 'يرصد التناقضات في التاريخ الطبي للمريض' },
    'safety.l16_name': { en: 'Severity Assessment', ar: 'تقييم الشدة' },
    'safety.l16_desc': { en: 'Triages urgency based on symptom severity', ar: 'يحدّد درجة الاستعجال بناءً على شدة الأعراض' },
    'safety.l17_name': { en: 'Follow-Up Evaluation', ar: 'تقييم المتابعة' },
    'safety.l17_desc': { en: 'Determines if follow-up appointments are clinically necessary', ar: 'يحدد ما إذا كانت مواعيد المتابعة ضرورية سريريًا' },
    'safety.l18_name': { en: 'Prescription Appropriateness', ar: 'ملاءمة الوصفة الطبية' },
    'safety.l18_desc': { en: 'Validates prescriptions match diagnoses and guidelines', ar: 'يتحقق من توافق الوصفات الطبية مع التشخيصات والإرشادات' },
    'safety.l19_name': { en: 'Guideline Compliance', ar: 'الالتزام بالإرشادات' },
    'safety.l19_desc': { en: 'Ensures adherence to WHO, ACP, AAFP, and local regulations', ar: 'يضمن الالتزام بإرشادات منظمة الصحة العالمية وACP وAAFP والأنظمة المحلية' },
    'safety.showAll': { en: 'Show All 19 Safety Layers', ar: 'عرض طبقات الأمان التسع عشرة كاملة' },
    'safety.zero_title': { en: 'Zero-Storage Philosophy', ar: 'فلسفة عدم التخزين' },
    'safety.zero_desc': { en: 'At cliniq.one, patient privacy is a fundamental principle. Your medical data is processed in real-time session memory — never committed to permanent databases. Data is retained only for the consultation window needed to complete your assessment and generate your medical report, then automatically purged. Long-term records are available only on hardcopy or local server per medico-legal standards.', ar: 'في cliniq.one، خصوصية المريض مبدأ أساسي. تتم معالجة بياناتك الطبية لحظيًا داخل ذاكرة الجلسة — من دون حفظها في قواعد بيانات دائمة. يُحتفظ بالبيانات فقط خلال نافذة الاستشارة اللازمة لإتمام التقييم وإنشاء التقرير الطبي، ثم تُحذف تلقائيًا. السجلات طويلة الأمد متاحة فقط كنسخة ورقية أو على الخادم المحلي وفق المعايير الطبية القانونية.' },
    'safety.z1': { en: 'Session-based processing only', ar: 'معالجة قائمة على الجلسة فقط' },
    'safety.z2': { en: 'Auto-purged after consultation', ar: 'حذف تلقائي بعد الاستشارة' },
    'safety.z3': { en: 'No third-party data sharing', ar: 'عدم مشاركة البيانات مع أطراف خارجية' },
    'safety.z4': { en: 'Enterprise-grade encryption', ar: 'تشفير بمستوى مؤسسي' },
    'safety.z5': { en: 'HIPAA-aligned practices', ar: 'ممارسات متوافقة مع HIPAA' },
    'safety.z6': { en: 'You own your medical data', ar: 'أنت تملك بياناتك الطبية' },

    // ─── APP AVAILABILITY ───
    'avail.tag': { en: 'Now Open for Testing', ar: 'التجربة متاحة الآن' },
    'avail.h2_1': { en: 'Available on', ar: 'متاح على' },
    'avail.h2_2': { en: 'Android & iOS', ar: 'Android و iOS' },
    'avail.sub': { en: 'We\'re actively onboarding testers on both platforms. Register below to get early access to all four apps.', ar: 'نستقبل المختبرين حالياً على كلا المنصتين. سجّل أدناه للحصول على وصول مبكر لجميع التطبيقات الأربعة.' },
    'avail.android_title': { en: 'Android', ar: 'Android' },
    'avail.android_status': { en: 'Open for Testing', ar: 'مفتوح للاختبار' },
    'avail.android_desc': { en: 'The Android APK is available now for approved testers in KSA & UAE. Sign up below to get access to all four apps — Patient, Doctor, Locum, and Admin.', ar: 'ملف Android APK متاح الآن للمختبِرين المعتمدين في السعودية والإمارات. سجّل أدناه للحصول على التطبيقات الأربعة: المريض، والطبيب، وLocum، والإدارة.' },
    'avail.android_cta': { en: 'Join Android Beta', ar: 'انضم لنسخة Android التجريبية' },
    'avail.ios_title': { en: 'iOS', ar: 'iOS' },
    'avail.ios_status': { en: 'Open for Testing', ar: 'مفتوح للاختبار' },
    'avail.ios_desc': { en: 'iOS apps are now available via Apple TestFlight for approved testers in KSA & UAE. Sign up below to receive your TestFlight invite for all four apps.', ar: 'تطبيقات iOS متاحة الآن عبر Apple TestFlight للمختبِرين المعتمدين في السعودية والإمارات. سجّل أدناه لتلقي دعوة TestFlight لجميع التطبيقات الأربعة.' },
    'avail.ios_cta': { en: 'Join iOS Beta', ar: 'انضم لنسخة iOS التجريبية' },
    'avail.ios_email_ph': { en: 'your@email.com', ar: 'your@email.com' },
    'avail.ios_success': { en: 'You\'re registered! You\'ll receive a TestFlight invite once approved.', ar: 'تم تسجيلك! ستصلك دعوة TestFlight بعد الموافقة.' },
    'avail.ios_note': { en: 'You\'ll receive a TestFlight invite via email once your application is approved.', ar: 'ستصلك دعوة TestFlight على بريدك الإلكتروني فور الموافقة على طلبك.' },
    'avail.notify_title': { en: 'Stay Informed', ar: 'ابقَ على اطلاع' },
    'avail.notify_sub': { en: 'Register once and we\'ll keep you updated on all platform launches.', ar: 'سجّل مرة واحدة وسنُبقيك على اطلاع بجميع الإطلاقات.' },
    'avail.notify_cta': { en: 'Register Interest', ar: 'أبي أجرّب' },

    // ─── DOWNLOADS ───
    'dl.tag': { en: 'Get Started', ar: 'ابدأ الآن' },
    'dl.h2_1': { en: 'Download', ar: 'تحميل' },
    'dl.h2_2': { en: 'APK', ar: 'APK' },
    'dl.sub': { en: 'Install the Android APKs directly or join the iOS TestFlight beta. Currently in tester phase — available for KSA & UAE.', ar: 'ثبّت ملفات APK الخاصة بنظام Android مباشرة أو انضم لنسخة iOS التجريبية عبر TestFlight. المنصة حاليًا في مرحلة الاختبار، وهي متاحة في السعودية والإمارات.' },
    'dl.patient_name': { en: 'Patient App', ar: 'تطبيق المريض' },
    'dl.patient_desc': { en: 'Full patient experience: AI intake, specialist routing, consultations, wallet & prescriptions.', ar: 'تجربة المريض الكاملة: استقبال بالذكاء الاصطناعي، توجيه للتخصصات، استشارات، محفظة، ووصفات طبية.' },
    'dl.doctor_name': { en: 'Doctor App', ar: 'تطبيق الطبيب' },
    'dl.doctor_desc': { en: 'View queue, review AI clinical notes, respond with structured reports & e-prescriptions.', ar: 'اعرض قائمة الانتظار، وراجع الملاحظات السريرية المولّدة بالذكاء الاصطناعي، وقدّم تقارير منظّمة ووصفات إلكترونية.' },
    'dl.locum_name': { en: 'Locum App', ar: 'تطبيق Locum' },
    'dl.locum_desc': { en: 'Locum doctor portal with tiered access — Sandbox, Locum, and Staff levels.', ar: 'بوابة أطباء Locum مع مستويات صلاحية متدرجة: Sandbox وLocum وStaff.' },
    'dl.admin_name': { en: 'Admin Panel', ar: 'لوحة الإدارة' },
    'dl.admin_desc': { en: 'Platform management: AI prompts, doctors, patients, analytics & system configuration.', ar: 'إدارة المنصة: توجيهات الذكاء الاصطناعي، والأطباء، والمرضى، والتحليلات، وإعدادات النظام.' },
    'dl.apk': { en: 'Android APK', ar: 'Android APK' },
    'dl.btn': { en: 'Download APK', ar: 'نزّل APK' },
    'dl.locked_title': { en: 'Access Required', ar: 'يتطلب صلاحية' },
    'dl.locked_msg': { en: 'Downloads are available to approved testers only. Sign up below to request access.', ar: 'التنزيل متاح فقط للمختبرين المعتمدين. سجّل أدناه لطلب الوصول.' },
    'dl.invalid_token': { en: 'Invalid or expired access token.', ar: 'رمز الوصول غير صالح أو منتهي الصلاحية.' },
    'dl.version': { en: 'v1.0.0-beta', ar: 'v1.0.0-beta' },
    'dl.coming_soon': { en: 'Coming soon', ar: 'قريبًا' },
    'dl.warning': { en: 'Android: You may need to enable "Install from Unknown Sources". iOS: Apps are distributed via TestFlight. These are tester builds — not yet on public app stores.', ar: 'Android: ممكن تحتاج تفعّل "التثبيت من مصادر غير معروفة". iOS: التطبيقات توزّع عبر TestFlight. هذي نسخ تجريبية وما نزلت على المتاجر الرسمية بعد.' },
    'dl.testflight_title': { en: 'iOS Apps via TestFlight', ar: 'تطبيقات iOS عبر TestFlight' },
    'dl.testflight_desc': { en: 'All four iOS apps are available via Apple TestFlight. Sign up as a tester and receive your invite link by email.', ar: 'جميع تطبيقات iOS الأربعة متاحة عبر Apple TestFlight. سجّل كمختبِر وستصلك دعوة على بريدك الإلكتروني.' },
    'dl.testflight_cta': { en: 'Join TestFlight Beta', ar: 'انضم لنسخة TestFlight التجريبية' },

    // ─── TESTER SIGNUP ───
    'signup.tag': { en: 'Join Us', ar: 'انضم لنا' },
    'signup.h2_1': { en: 'Become a', ar: 'سجّل' },
    'signup.h2_2': { en: 'Tester', ar: 'كمختبِر' },
    'signup.sub': { en: 'Help shape the future of telemedicine in the GCC. Join our tester program and get early access to cliniq.one.', ar: 'ساهم في تطوير مستقبل الطب عن بُعد في الخليج. انضم لبرنامج التجربة واحصل على وصول مبكر لـ cliniq.one.' },
    'signup.name': { en: 'Full Name', ar: 'الاسم الكامل' },
    'signup.name_ph': { en: 'Dr. John Smith', ar: 'د. أحمد محمد' },
    'signup.email': { en: 'Email Address', ar: 'البريد الإلكتروني' },
    'signup.email_ph': { en: 'you@example.com', ar: 'you@example.com' },
    'signup.role': { en: "I'm interested as a...", ar: 'أنا مهتم بصفتي...' },
    'signup.role_default': { en: 'Select a role', ar: 'اختر الدور' },
    'signup.role_patient': { en: '🧑‍🤝‍🧑 Patient Tester', ar: '🧑‍🤝‍🧑 مختبِر كمريض' },
    'signup.role_doctor': { en: '👨‍⚕️ Doctor Tester', ar: '👨‍⚕️ مختبِر كطبيب' },
    'signup.role_both': { en: '🔀 Both', ar: '🔀 كلاهما' },
    'signup.role_investor': { en: '💼 Investor / Partner', ar: '💼 مستثمر / شريك' },
    'signup.message': { en: 'Message', ar: 'الرسالة' },
    'signup.optional': { en: '(optional)', ar: '(اختياري)' },
    'signup.message_ph': { en: 'Tell us about yourself or your interest in cliniq.one...', ar: 'عرّفنا بنفسك وباهتمامك بـ cliniq.one...' },
    'signup.submit': { en: 'Send Tester Request', ar: 'أرسل طلب التجربة' },
    'signup.note': { en: "We'll review your application and get back to you shortly.", ar: 'بنراجع طلبك ونرد عليك بأسرع وقت.' },
    'signup.thanks': { en: 'Thank You!', ar: 'شكراً لك!' },
    'signup.thanks_msg': { en: 'Your tester request has been submitted successfully! If you have any questions, feel free to email us at', ar: 'تم إرسال طلبك بنجاح! لو عندك أي سؤال، تواصل معنا على' },
    'signup.another': { en: 'Submit Another Request', ar: 'أرسل طلب ثاني' },
    'signup.sending': { en: '⏳ Sending...', ar: '⏳ جارٍ الإرسال...' },
    'signup.error_generic': { en: 'Something went wrong. Please try again.', ar: 'صار خطأ. حاول مرة ثانية.' },

    // ─── TESTER SIGNUP — Role-specific fields ───
    // Patient
    'signup.patient_section_title': { en: 'Patient Tester', ar: 'مختبِر مريض' },
    'signup.patient_info': { en: 'As a patient tester you\'ll receive the Patient app to test the AI health intake flow.', ar: 'بصفتك مختبِرًا من المرضى، ستحصل على تطبيق المريض لاختبار رحلة التقييم الصحي بالذكاء الاصطناعي.' },
    'signup.motivation': { en: 'Why do you want to test cliniq.one?', ar: 'لماذا تريد اختبار cliniq.one؟' },
    'signup.motivation_ph': { en: 'I\'m interested in testing because...', ar: 'أنا مهتم بالاختبار لأن...' },

    // Doctor
    'signup.doctor_section_title': { en: 'Medical Credentials', ar: 'بيانات الترخيص الطبي' },
    'signup.country': { en: 'Country', ar: 'الدولة' },
    'signup.country_default': { en: 'Select country', ar: 'اختر الدولة' },
    'signup.country_sa': { en: 'Saudi Arabia', ar: 'المملكة العربية السعودية' },
    'signup.country_ae': { en: 'United Arab Emirates', ar: 'الإمارات العربية المتحدة' },
    'signup.license_type': { en: 'License Type', ar: 'نوع الرخصة' },
    'signup.license_default': { en: 'Select license type', ar: 'اختر نوع الرخصة' },
    'signup.license_scfhs': { en: 'SCFHS — Saudi Commission for Health Specialties', ar: 'SCFHS — الهيئة السعودية للتخصصات الصحية' },
    'signup.license_dha': { en: 'DHA — Dubai Health Authority', ar: 'DHA — هيئة الصحة بدبي' },
    'signup.license_doh': { en: 'DOH — Department of Health (Abu Dhabi)', ar: 'DOH — دائرة الصحة (أبوظبي)' },
    'signup.license_moh': { en: 'MOH — Ministry of Health', ar: 'MOH — وزارة الصحة' },
    'signup.license_number': { en: 'License Number', ar: 'رقم الرخصة' },
    'signup.license_number_ph': { en: 'e.g. 12345678', ar: 'مثلاً: 12345678' },
    'signup.specialty': { en: 'Specialty', ar: 'التخصص' },
    'signup.specialty_default': { en: 'Select your specialty', ar: 'اختر تخصصك' },
    'signup.credential_upload': { en: 'Upload License / SCFHS Card', ar: 'رفع الرخصة / بطاقة SCFHS' },
    'signup.file_drop': { en: 'Click to upload your credential card', ar: 'اضغط لرفع بطاقة الترخيص' },
    'signup.file_formats': { en: 'PNG, JPG, or PDF — max 5 MB', ar: 'PNG أو JPG أو PDF — الحد الأقصى 5 MB' },
    'signup.file_click_change': { en: 'Click to change file', ar: 'اضغط لتغيير الملف' },
    'signup.file_too_large': { en: 'File is too large. Maximum size is 5 MB.', ar: 'الملف كبير جدًا. الحد الأقصى 5 MB.' },
    'signup.doctor_note': { en: 'Your credential will be verified before granting access to Doctor and Locum apps.', ar: 'سيتم التحقق من بيانات الترخيص قبل منحك الوصول إلى تطبيقي الطبيب وLocum.' },

    // Investor
    'signup.investor_section_title': { en: 'Investor Profile', ar: 'ملف المستثمر' },
    'signup.linkedin': { en: 'LinkedIn Profile URL', ar: 'رابط ملف LinkedIn' },
    'signup.linkedin_ph': { en: 'https://linkedin.com/in/yourname', ar: 'https://linkedin.com/in/yourname' },
    'signup.linkedin_title': { en: 'Please enter a valid LinkedIn URL', ar: 'يرجى إدخال رابط LinkedIn صالح' },
    'signup.organization': { en: 'Organization / Fund Name', ar: 'اسم المنظمة / الصندوق' },
    'signup.organization_ph': { en: 'e.g. Acme Ventures', ar: 'مثلاً: Acme Ventures' },
    'signup.portfolio': { en: 'Portfolio / Deck URL', ar: 'رابط Portfolio / Deck' },
    'signup.portfolio_ph': { en: 'https://angellist.com/...', ar: 'https://angellist.com/...' },
    'signup.zoom_availability': { en: 'Zoom Call Availability', ar: 'أوقات متاحة لمكالمة Zoom' },
    'signup.zoom_ph': { en: 'When are you available for a 30-min intro call? (include timezone)', ar: 'متى تكون متاحًا لمكالمة تعريفية لمدة 30 دقيقة؟ (اذكر المنطقة الزمنية)' },
    'signup.investor_note': { en: 'Verified investors receive read-only access to the admin analytics dashboard + a personal intro call with the founder.', ar: 'يحصل المستثمرون المعتمدون على صلاحية عرض فقط للوصول إلى لوحة التحليلات الإدارية، بالإضافة إلى مكالمة تعريفية شخصية مع المؤسس.' },

    // ─── FOOTER ───
    'footer.tagline': { en: 'Online medical consultations with licensed doctors for KSA & UAE. Safe, bilingual, privacy-first digital care.', ar: 'استشارات طبية عن بُعد مع أطباء مرخّصين في السعودية والإمارات. رعاية رقمية آمنة، ثنائية اللغة، وخصوصيتك أولًا.' },
    'footer.platform': { en: 'Platform', ar: 'المنصة' },
    'footer.contact': { en: 'Contact', ar: 'اتصل بنا' },
    'footer.markets': { en: 'Markets', ar: 'الأسواق' },
    'footer.ksa': { en: '🇸🇦 KSA', ar: '🇸🇦 السعودية' },
    'footer.uae': { en: '🇦🇪 UAE', ar: '🇦🇪 الإمارات' },
    'footer.patent': { en: 'Saudi Patent No. SA 1020262581', ar: 'براءة اختراع سعودية رقم SA 1020262581' },
    'footer.copyright': { en: '© 2026 cliniq.one. All rights reserved. A Momencraft venture.', ar: '© 2026 cliniq.one. جميع الحقوق محفوظة. إحدى مشاريع Momencraft.' },
    'footer.terms': { en: 'Terms of Service', ar: 'شروط الاستخدام' },
    'footer.privacy': { en: 'Privacy Policy', ar: 'سياسة الخصوصية' },
    'footer.ai': { en: 'AI Disclosure', ar: 'إفصاح الذكاء الاصطناعي' },

    // ─── NAV (additional) ───
    'nav.availability': { en: 'App Status', ar: 'حالة التطبيق' },

    // ─── COOKIE CONSENT ───
    'cookie.title': { en: 'Cookie Notice', ar: 'إشعار ملفات تعريف الارتباط' },
    'cookie.message': { en: 'We use essential cookies to ensure the best experience on our platform. No tracking cookies are used.', ar: 'نستخدم ملفات تعريف الارتباط الأساسية لضمان أفضل تجربة على منصتنا. لا نستخدم ملفات تتبع.' },
    'cookie.learn_more': { en: 'Learn more', ar: 'تعرّف على المزيد' },
    'cookie.accept': { en: 'Accept', ar: 'قبول' },
    'cookie.decline': { en: 'Decline', ar: 'رفض' },

    // ─── APP SHOWCASE ───
    'showcase.tag': { en: 'Experience the Platform', ar: 'جرّب المنصة' },
    'showcase.h2_1': { en: 'See Our', ar: 'تعرّف على' },
    'showcase.h2_2': { en: 'Apps in Action', ar: 'تطبيقاتنا عملياً' },
    'showcase.sub': { en: 'Explore interactive demos of the Patient, Doctor, and Admin experiences. Click any app to try the full interactive mockup.', ar: 'استكشف عروضاً تفاعلية لتجارب المريض والطبيب والإدارة. اضغط على أي تطبيق لتجربة النموذج التفاعلي الكامل.' },
    'showcase.patient_title': { en: 'Patient App', ar: 'تطبيق المريض' },
    'showcase.patient_desc': { en: 'AI-powered medical intake, smart specialty routing, consultations, wallet, and e-prescriptions — all in one app.', ar: 'استقبال طبي بالذكاء الاصطناعي، توجيه ذكي للتخصصات، استشارات، محفظة، ووصفات إلكترونية — كل ذلك في تطبيق واحد.' },
    'showcase.doctor_title': { en: 'Doctor Dashboard', ar: 'لوحة الطبيب' },
    'showcase.doctor_desc': { en: 'Review AI-generated clinical notes, manage patient queue, submit reports with e-prescriptions, and track performance analytics.', ar: 'راجع الملاحظات السريرية المولّدة بالذكاء الاصطناعي، أدِر قائمة المرضى، قدّم التقارير مع الوصفات الإلكترونية، وتابع تحليلات الأداء.' },
    'showcase.admin_title': { en: 'Admin Panel', ar: 'لوحة الإدارة' },
    'showcase.admin_desc': { en: 'Full platform control — AI prompt management, doctor onboarding, patient oversight, safety protocols, and real-time analytics.', ar: 'تحكم كامل بالمنصة — إدارة توجيهات الذكاء الاصطناعي، تسجيل الأطباء، متابعة المرضى، بروتوكولات السلامة، وتحليلات لحظية.' },
    'showcase.try_it': { en: 'Try it', ar: 'جرّبه' },
    'showcase.explore': { en: 'Open Interactive Demo', ar: 'افتح العرض التفاعلي' },
    'showcase.note': { en: 'Interactive mockups — click to explore the full app experience', ar: 'نماذج تفاعلية — اضغط لاستكشاف تجربة التطبيق الكاملة' },
    'showcase.wa_intake_title': { en: 'WhatsApp Intake', ar: 'استقبال واتساب' },
    'showcase.wa_intake_desc': { en: 'Complete your medical intake via a simple web link shared by your doctor — no app download needed. Works on any device.', ar: 'أكمل تقييمك الطبي عبر رابط بسيط يشاركه طبيبك — بدون تحميل تطبيق. يعمل على أي جهاز.' },

    // ─── CHANNELS (NEW SECTION) ───
    'channels.tag': { en: 'Multiple Access Points', ar: 'نقاط وصول متعددة' },
    'channels.h2_1': { en: 'Start Your Consultation', ar: 'ابدأ استشارتك' },
    'channels.h2_2': { en: 'Your Way', ar: 'بطريقتك' },
    'channels.sub': { en: 'Choose the channel that works best for you — mobile app, WhatsApp, or a web link from your doctor. Same quality care, three convenient ways.', ar: 'اختر الطريقة الأنسب لك — تطبيق الجوال، واتساب، أو رابط من طبيبك. نفس جودة الرعاية، بثلاث طرق مريحة.' },

    'channels.app_title': { en: 'Mobile App', ar: 'تطبيق الجوال' },
    'channels.app_desc': { en: 'Download the full cliniq.one app for the complete experience — AI intake, consultations, wallet, prescriptions, and follow-ups.', ar: 'حمّل تطبيق cliniq.one الكامل لتجربة شاملة — استقبال ذكي، استشارات، محفظة، وصفات، ومتابعات.' },
    'channels.app_badge': { en: 'Full Experience', ar: 'التجربة الكاملة' },
    'channels.app_f1': { en: 'AI-powered medical interview', ar: 'مقابلة طبية بالذكاء الاصطناعي' },
    'channels.app_f2': { en: 'Token wallet & e-prescriptions', ar: 'محفظة رموز ووصفات إلكترونية' },
    'channels.app_f3': { en: 'Consultation history & follow-ups', ar: 'سجل الاستشارات والمتابعات' },
    'channels.app_f4': { en: 'Available on iOS & Android', ar: 'متاح على iOS و Android' },

    'channels.wa_title': { en: 'WhatsApp', ar: 'واتساب' },
    'channels.wa_desc': { en: 'Send a message to start your medical intake directly in WhatsApp. Share photos, voice messages, and complete your assessment without leaving the app.', ar: 'أرسل رسالة لبدء تقييمك الطبي مباشرة عبر واتساب. شارك صوراً ورسائل صوتية وأكمل تقييمك بدون مغادرة التطبيق.' },
    'channels.wa_badge': { en: 'Zero Friction', ar: 'سهولة تامة' },
    'channels.wa_f1': { en: 'No app download required', ar: 'بدون تحميل تطبيق' },
    'channels.wa_f2': { en: 'Voice messages supported', ar: 'دعم الرسائل الصوتية' },
    'channels.wa_f3': { en: 'Photo sharing during intake', ar: 'مشاركة الصور أثناء التقييم' },
    'channels.wa_f4': { en: 'Automated appointment booking', ar: 'حجز مواعيد تلقائي' },

    'channels.web_title': { en: 'Doctor Link', ar: 'رابط الطبيب' },
    'channels.web_desc': { en: 'Your doctor shares a personalized link. Open it in any browser to complete your intake — no accounts, no downloads, instant access.', ar: 'طبيبك يشاركك رابطاً مخصصاً. افتحه في أي متصفح لإكمال تقييمك — بدون حسابات، بدون تحميل، وصول فوري.' },
    'channels.web_badge': { en: 'Instant Access', ar: 'وصول فوري' },
    'channels.web_f1': { en: 'Personalized link from your doctor', ar: 'رابط مخصص من طبيبك' },
    'channels.web_f2': { en: 'Works on any device & browser', ar: 'يعمل على أي جهاز ومتصفح' },
    'channels.web_f3': { en: 'No account or download needed', ar: 'بدون حساب أو تحميل' },
    'channels.web_f4': { en: 'Same AI-powered intake quality', ar: 'نفس جودة التقييم الذكي' },

    'channels.note': { en: 'All channels connect to the same licensed doctors and AI-powered clinical system', ar: 'جميع القنوات تتصل بنفس الأطباء المرخّصين ونظام الذكاء الاصطناعي السريري' },

    // ─── UPDATED HOW IT WORKS ───
    'how.s5_title': { en: 'Book an Appointment', ar: 'احجز موعداً' },
    'how.s5_desc': { en: 'Need an in-person visit? Book directly through the platform — select your location, preferred date, and available time slot.', ar: 'تحتاج زيارة شخصية؟ احجز مباشرة عبر المنصة — اختر الموقع والتاريخ والوقت المتاح.' },
    'how.s5_detail': { en: 'Integrated scheduling with doctor availability. Automatic reminders via WhatsApp.', ar: 'جدولة متكاملة مع توافر الطبيب. تذكيرات تلقائية عبر واتساب.' },
    'how.channels_intro': { en: 'Choose how you want to start', ar: 'اختر كيف تريد أن تبدأ' },
    'how.channel_app': { en: '📱 Mobile App', ar: '📱 تطبيق الجوال' },
    'how.channel_wa': { en: '💬 WhatsApp', ar: '💬 واتساب' },
    'how.channel_web': { en: '🌐 Doctor Link', ar: '🌐 رابط الطبيب' },

    // ─── UPDATED FOR WHO — PATIENTS ───
    'who.p7': { en: 'WhatsApp intake — no app download needed', ar: 'تقييم عبر واتساب — بدون تحميل تطبيق' },
    'who.p8': { en: 'Voice messages for easier symptom description', ar: 'رسائل صوتية لوصف الأعراض بسهولة' },
    'who.p9': { en: 'Doctor-shared personalized intake links', ar: 'روابط تقييم مخصصة من طبيبك' },
    'who.p10': { en: 'Appointment booking with automated reminders', ar: 'حجز مواعيد مع تذكيرات تلقائية' },

    // ─── UPDATED FOR WHO — DOCTORS ───
    'who.d7': { en: 'Share personalized intake links with patients', ar: 'شارك روابط تقييم مخصصة مع مرضاك' },
    'who.d8': { en: 'WhatsApp notifications for new consultations', ar: 'إشعارات واتساب للاستشارات الجديدة' },
    'who.d9': { en: 'Integrated appointment scheduling', ar: 'جدولة مواعيد متكاملة' },

    // ─── UPDATED HERO ───
    'hero.badge_v2': { en: 'App · WhatsApp · Web — Licensed Doctors · KSA & UAE', ar: 'تطبيق · واتساب · ويب — أطباء مرخّصون · السعودية والإمارات' },
    'hero.stat5_val': { en: '3', ar: '3' },
    'hero.stat5_label': { en: 'Access Channels', ar: 'قنوات وصول' },

    // ─── UPDATED ABOUT ───
    'about.f7_title': { en: 'WhatsApp Integration', ar: 'تكامل واتساب' },
    'about.f7_desc': { en: 'Complete your medical intake via WhatsApp — send messages, photos, and voice notes. No app download needed for the patient.', ar: 'أكمل تقييمك الطبي عبر واتساب — أرسل رسائل وصوراً وملاحظات صوتية. بدون تحميل تطبيق للمريض.' },
    'about.f8_title': { en: 'Doctor-Shared Links', ar: 'روابط مخصصة من الطبيب' },
    'about.f8_desc': { en: 'Doctors share personalized web links with patients. One click opens the intake — no accounts, no downloads, works on any device.', ar: 'يشارك الأطباء روابط مخصصة مع مرضاهم. ضغطة واحدة تفتح التقييم — بدون حسابات، بدون تحميل، يعمل على أي جهاز.' },
    'about.f9_title': { en: 'Appointment Booking', ar: 'حجز المواعيد' },
    'about.f9_desc': { en: 'Integrated scheduling system — patients select location, date, and time slot. Automated reminders via WhatsApp keep everyone on track.', ar: 'نظام جدولة متكامل — المريض يختار الموقع والتاريخ والوقت. تذكيرات تلقائية عبر واتساب تبقي الجميع على المسار.' },

    // ─── UPDATED INNOVATION ───
    'innov.p9': { en: 'Multi-Channel Patient Access', ar: 'وصول متعدد القنوات للمريض' },
    'innov.p9_desc': { en: 'Patients choose their preferred channel — mobile app, WhatsApp, or a web link from their doctor. Same clinical quality across every touchpoint.', ar: 'المريض يختار قناته المفضلة — تطبيق جوال، واتساب، أو رابط من طبيبه. نفس الجودة السريرية في كل نقطة وصول.' },
    'innov.p10': { en: 'Voice-Powered Intake', ar: 'تقييم بالصوت' },
    'innov.p10_desc': { en: 'Patients can describe symptoms via voice messages — automatically transcribed and processed by the AI clinical engine.', ar: 'المريض يقدر يوصف أعراضه برسائل صوتية — تُنسخ وتُعالج تلقائياً بواسطة محرك الذكاء الاصطناعي السريري.' },

    // ─── NAV (channels) ───
    'nav.channels': { en: 'Channels', ar: 'القنوات' },

    // ─── PASSWORD GATE ───
    'gate.title': { en: 'Cut the ribbon to enter', ar: 'قص الشريط للدخول' },
    'gate.sub': { en: 'This is a private MVP preview. Enter the access code shared with you to continue.', ar: 'هذه نسخة معاينة خاصة للمنصة. أدخل رمز الوصول المشترك معك للمتابعة.' },
    'gate.placeholder': { en: 'Enter access code', ar: 'أدخل رمز الوصول' },
    'gate.error': { en: 'Invalid access code. Please try again.', ar: 'رمز الوصول غير صالح. يرجى المحاولة مرة أخرى.' },
    'gate.submit': { en: 'Enter private access', ar: 'دخول الوصول الخاص' },
    'gate.verifying': { en: 'Verifying...', ar: 'جاري التحقق...' },
    'gate.tag1': { en: 'Founder access', ar: 'وصول المؤسسين' },
    'gate.tag2': { en: 'Pre-release build', ar: 'نسخة ما قبل الإطلاق' },
    'gate.tag3': { en: 'Password protected', ar: 'محمي بكلمة مرور' },
    'gate.copyright': { en: '© 2026 cliniq.one · A Momencraft venture', ar: '© 2026 cliniq.one · إحدى مشاريع Momencraft' },
};

const I18nContext = createContext<I18nContextType | null>(null);

export function I18nProvider({ children }: { children: ReactNode }) {
    const [locale, setLocale] = useState<Locale>('ar');

    const toggleLocale = useCallback(() => {
        setLocale((prev) => (prev === 'en' ? 'ar' : 'en'));
    }, []);

    const t = useCallback(
        (key: string) => {
            const entry = translations[key];
            if (!entry) return key;
            return entry[locale] || entry.en || key;
        },
        [locale]
    );

    const dir = locale === 'ar' ? 'rtl' : 'ltr';

    return (
        <I18nContext.Provider value={{ locale, dir, toggleLocale, t }}>
            {children}
        </I18nContext.Provider>
    );
}

export function useI18n() {
    const ctx = useContext(I18nContext);
    if (!ctx) throw new Error('useI18n must be used within I18nProvider');
    return ctx;
}
