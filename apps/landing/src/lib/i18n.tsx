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
    'nav.story': { en: 'Our Story', ar: 'قصتنا' },
    'nav.safety': { en: 'Safety', ar: 'السلامة' },
    'nav.download': { en: 'Download', ar: 'التحميل' },
    'nav.tester': { en: 'Become a Tester', ar: 'سجّل كمختبِر' },

    // ─── HERO ───
    'hero.badge': { en: 'Now accepting testers in KSA & UAE', ar: 'نستقبل الآن المختبِرين في السعودية والإمارات' },
    'hero.h1_1': { en: 'One Consultation.', ar: 'استشارة واحدة.' },
    'hero.h1_2': { en: 'Multiple Specialties.', ar: 'تخصصات متعددة.' },
    'hero.h1_3': { en: 'One Decision.', ar: 'قرار واحد.' },
    'hero.sub': { en: 'AI-powered telemedicine that intelligently routes your symptoms to the right specialist. No guessing which doctor to see.', ar: 'طبّ عن بُعد مدعوم بالذكاء الاصطناعي يوجّه أعراضك بذكاء إلى التخصص المناسب، من دون حيرة في اختيار الطبيب المناسب.' },
    'hero.download': { en: 'Download APK', ar: 'تحميل APK' },
    'hero.tester': { en: 'Become a Tester', ar: 'سجّل كمختبِر' },
    'hero.stat1_val': { en: '15K+', ar: '15K+' },
    'hero.stat1_label': { en: 'Lines of Code', ar: 'سطر برمجي' },
    'hero.stat2_val': { en: '50+', ar: '50+' },
    'hero.stat2_label': { en: 'Components', ar: 'مكوّنات' },
    'hero.stat3_val': { en: '19', ar: '19' },
    'hero.stat3_label': { en: 'Safety Layers', ar: 'طبقات أمان' },
    'hero.stat4_val': { en: '600+', ar: '600+' },
    'hero.stat4_label': { en: 'Translation Keys', ar: 'مفاتيح ترجمة' },
    'hero.gpt_title': { en: 'Human-Trained', ar: 'مدرَّب بشريًا' },
    'hero.gpt_sub': { en: 'Automated Analysis', ar: 'تحليل آلي بمعايير طبية بشرية' },
    'hero.safety_title': { en: '19 Safety Layers', ar: '19 طبقة أمان' },
    'hero.safety_sub': { en: 'Multi-layered protection', ar: 'حماية متعددة الطبقات' },

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
    'about.f6_desc': { en: 'Your medical data is never stored long-term. Session-based processing with automatic 24-hour purging. Your data belongs to you.', ar: 'بياناتك الطبية لا تُخزَّن على المدى الطويل مطلقًا. تتم المعالجة على مستوى الجلسة مع حذف تلقائي خلال 24 ساعة. وتبقى بياناتك ملكًا لك.' },

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
    'who.p6': { en: 'Complete mobile experience with native Android app', ar: 'تجربة جوال كاملة عبر تطبيق Android أصلي' },
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

    // ─── STORY ───
    'story.tag': { en: 'Our Story', ar: 'قصتنا' },
    'story.h2_1': { en: 'Meet the', ar: 'تعرّف على' },
    'story.h2_2': { en: 'Creators', ar: 'المؤسسين' },
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
    'story.ip_desc': { en: 'The cliniq.one concept, workflow architecture, and AI-driven multi-specialty consultation model are currently under patent filing in Saudi Arabia and the broader Middle East region. This includes proprietary methodologies for single-intake multi-specialty routing, AI-generated clinical documentation, session-based zero-storage consultations, and intelligent specialty collaboration.', ar: 'إن مفهوم cliniq.one، وبنية سير العمل، ونموذج الاستشارات متعددة التخصصات المدعوم بالذكاء الاصطناعي، تخضع حاليًا لإجراءات تسجيل براءة اختراع في السعودية ومنطقة الشرق الأوسط الأوسع. ويشمل ذلك المنهجيات الخاصة بالتوجيه متعدد التخصصات من خلال استقبال واحد، والتوثيق السريري المُولّد بالذكاء الاصطناعي، والاستشارات القائمة على الجلسة بدون تخزين دائم، والتعاون الذكي بين التخصصات.' },

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
    'safety.zero_desc': { en: 'At cliniq.one, patient privacy is a fundamental principle. Your medical data is processed in real-time session memory — never committed to permanent databases. Data is stored temporarily for a maximum of 24 hours to allow the medical team to complete their assessment, then automatically purged.', ar: 'في cliniq.one، خصوصية المريض مبدأ أساسي. تتم معالجة بياناتك الطبية لحظيًا داخل ذاكرة الجلسة — من دون حفظها في قواعد بيانات دائمة. وتُخزَّن البيانات مؤقتًا لمدة أقصاها 24 ساعة فقط حتى يتمكّن الفريق الطبي من استكمال التقييم، ثم تُحذف تلقائيًا.' },
    'safety.z1': { en: 'Session-based processing only', ar: 'معالجة قائمة على الجلسة فقط' },
    'safety.z2': { en: 'Automatic 24h data purging', ar: 'حذف تلقائي للبيانات خلال 24 ساعة' },
    'safety.z3': { en: 'No third-party data sharing', ar: 'عدم مشاركة البيانات مع أطراف خارجية' },
    'safety.z4': { en: 'Enterprise-grade encryption', ar: 'تشفير بمستوى مؤسسي' },
    'safety.z5': { en: 'HIPAA-aligned practices', ar: 'ممارسات متوافقة مع HIPAA' },
    'safety.z6': { en: 'You own your medical data', ar: 'أنت تملك بياناتك الطبية' },

    // ─── APP AVAILABILITY ───
    'avail.tag': { en: 'Now Open for Testing', ar: 'مفتوح للاختبار الآن' },
    'avail.h2_1': { en: 'Available on', ar: 'متاح على' },
    'avail.h2_2': { en: 'Android Today', ar: 'Android اليوم' },
    'avail.sub': { en: 'We\'re actively onboarding testers. Register your interest and be the first to know when new platforms launch.', ar: 'نستقبل المختبِرين حاليًا. سجّل اهتمامك وكن أول من يعرف عند إطلاق منصات جديدة.' },
    'avail.android_title': { en: 'Android', ar: 'Android' },
    'avail.android_status': { en: 'Open for Testing', ar: 'مفتوح للاختبار' },
    'avail.android_desc': { en: 'The Android APK is available now for approved testers in KSA & UAE. Sign up below to get access to all four apps — Patient, Doctor, Locum, and Admin.', ar: 'ملف Android APK متاح الآن للمختبِرين المعتمدين في السعودية والإمارات. سجّل أدناه للحصول على التطبيقات الأربعة: المريض، والطبيب، وLocum، والإدارة.' },
    'avail.android_cta': { en: 'Join Android Beta', ar: 'انضم لنسخة Android التجريبية' },
    'avail.ios_title': { en: 'iOS', ar: 'iOS' },
    'avail.ios_status': { en: 'Coming Soon', ar: 'قريبًا' },
    'avail.ios_desc': { en: 'iOS support is in development. Register your interest now and we\'ll notify you as soon as the iPhone and iPad apps are ready for testing.', ar: 'دعم iOS قيد التطوير. سجّل اهتمامك الآن وسنُبلغك فور جاهزية تطبيقي iPhone وiPad للاختبار.' },
    'avail.ios_cta': { en: 'Notify Me', ar: 'أبلغني' },
    'avail.ios_email_ph': { en: 'your@email.com', ar: 'your@email.com' },
    'avail.ios_success': { en: "You're on the list! We'll email you when iOS testing opens.", ar: 'تم تسجيلك! سنُبلغك عبر البريد عند فتح اختبار iOS.' },
    'avail.ios_note': { en: 'We\'ll only email you when iOS is ready. No spam.', ar: 'سنراسلك فقط عند جاهزية iOS. بدون رسائل مزعجة.' },
    'avail.notify_title': { en: 'Stay Informed', ar: 'ابقَ على اطلاع' },
    'avail.notify_sub': { en: 'Register once and we\'ll keep you updated on all platform launches.', ar: 'سجّل مرة واحدة وسنُبقيك على اطلاع بجميع الإطلاقات.' },
    'avail.notify_cta': { en: 'Register Interest', ar: 'سجّل اهتمامك' },

    // ─── DOWNLOADS ───
    'dl.tag': { en: 'Get Started', ar: 'ابدأ الآن' },
    'dl.h2_1': { en: 'Download', ar: 'تحميل' },
    'dl.h2_2': { en: 'APK', ar: 'APK' },
    'dl.sub': { en: 'Install the Android APKs directly. Currently in tester phase — available for KSA & UAE.', ar: 'ثبّت ملفات APK الخاصة بنظام Android مباشرة. المنصة حاليًا في مرحلة الاختبار، وهي متاحة في السعودية والإمارات.' },
    'dl.patient_name': { en: 'Patient App', ar: 'تطبيق المريض' },
    'dl.patient_desc': { en: 'Full patient experience: AI intake, specialist routing, consultations, wallet & prescriptions.', ar: 'تجربة المريض الكاملة: استقبال بالذكاء الاصطناعي، توجيه للتخصصات، استشارات، محفظة، ووصفات طبية.' },
    'dl.doctor_name': { en: 'Doctor App', ar: 'تطبيق الطبيب' },
    'dl.doctor_desc': { en: 'View queue, review AI clinical notes, respond with structured reports & e-prescriptions.', ar: 'اعرض قائمة الانتظار، وراجع الملاحظات السريرية المولّدة بالذكاء الاصطناعي، وقدّم تقارير منظّمة ووصفات إلكترونية.' },
    'dl.locum_name': { en: 'Locum App', ar: 'تطبيق Locum' },
    'dl.locum_desc': { en: 'Locum doctor portal with tiered access — Sandbox, Locum, and Staff levels.', ar: 'بوابة أطباء Locum مع مستويات صلاحية متدرجة: Sandbox وLocum وStaff.' },
    'dl.admin_name': { en: 'Admin Panel', ar: 'لوحة الإدارة' },
    'dl.admin_desc': { en: 'Platform management: AI prompts, doctors, patients, analytics & system configuration.', ar: 'إدارة المنصة: توجيهات الذكاء الاصطناعي، والأطباء، والمرضى، والتحليلات، وإعدادات النظام.' },
    'dl.apk': { en: 'Android APK', ar: 'Android APK' },
    'dl.btn': { en: 'Download APK', ar: 'تحميل APK' },
    'dl.locked_title': { en: 'Access Required', ar: 'يتطلب صلاحية' },
    'dl.locked_msg': { en: 'Downloads are available to approved testers only. Sign up below to request access.', ar: 'التحميل متاح فقط للمختبِرين المعتمدين. سجّل أدناه لطلب الوصول.' },
    'dl.invalid_token': { en: 'Invalid or expired access token.', ar: 'رمز الوصول غير صالح أو منتهي الصلاحية.' },
    'dl.version': { en: 'v1.0.0-beta', ar: 'v1.0.0-beta' },
    'dl.coming_soon': { en: 'Coming soon', ar: 'قريبًا' },
    'dl.warning': { en: 'You may need to enable "Install from Unknown Sources" in your Android settings. These are tester builds — not yet available on Google Play.', ar: 'قد تحتاج إلى تفعيل خيار "التثبيت من مصادر غير معروفة" في إعدادات Android. هذه إصدارات اختبارية وليست متاحة بعد على Google Play.' },

    // ─── TESTER SIGNUP ───
    'signup.tag': { en: 'Join Us', ar: 'انضم إلينا' },
    'signup.h2_1': { en: 'Become a', ar: 'سجّل' },
    'signup.h2_2': { en: 'Tester', ar: 'كمختبِر' },
    'signup.sub': { en: 'Help shape the future of telemedicine in the GCC. Join our tester program and get early access to cliniq.one.', ar: 'ساعدنا في تشكيل مستقبل الطب عن بُعد في الخليج. انضم إلى برنامج المختبِرين واحصل على وصول مبكر إلى cliniq.one.' },
    'signup.name': { en: 'Full Name', ar: 'الاسم الكامل' },
    'signup.name_ph': { en: 'Dr. John Smith', ar: 'Dr. John Smith' },
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
    'signup.submit': { en: 'Send Tester Request', ar: 'إرسال طلب الاختبار' },
    'signup.note': { en: "We'll review your application and get back to you shortly.", ar: 'سنراجع طلبك ونتواصل معك قريبًا.' },
    'signup.thanks': { en: 'Thank You!', ar: 'شكرًا لك!' },
    'signup.thanks_msg': { en: 'Your tester request has been submitted successfully! If you have any questions, feel free to email us at', ar: 'تم إرسال طلب الانضمام كمختبِر بنجاح! إذا كان لديك أي أسئلة، لا تتردد في مراسلتنا على' },
    'signup.another': { en: 'Submit Another Request', ar: 'إرسال طلب آخر' },
    'signup.sending': { en: '⏳ Sending...', ar: '⏳ جارٍ الإرسال...' },
    'signup.error_generic': { en: 'Something went wrong. Please try again.', ar: 'حدث خطأ. يرجى المحاولة مرة أخرى.' },

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
    'footer.tagline': { en: 'AI-powered telemedicine for the GCC region. One consultation. Multiple specialties. One decision.', ar: 'طب عن بُعد مدعوم بالذكاء الاصطناعي لمنطقة الخليج. استشارة واحدة. تخصصات متعددة. قرار واحد.' },
    'footer.platform': { en: 'Platform', ar: 'المنصة' },
    'footer.contact': { en: 'Contact', ar: 'اتصل بنا' },
    'footer.markets': { en: 'Markets', ar: 'الأسواق' },
    'footer.ksa': { en: '🇸🇦 KSA', ar: '🇸🇦 السعودية' },
    'footer.uae': { en: '🇦🇪 UAE', ar: '🇦🇪 الإمارات' },
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
};

const I18nContext = createContext<I18nContextType | null>(null);

export function I18nProvider({ children }: { children: ReactNode }) {
    const [locale, setLocale] = useState<Locale>('en');

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
