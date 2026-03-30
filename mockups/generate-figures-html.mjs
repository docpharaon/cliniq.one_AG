// Generate the HTML for patent figures section using v3 captures
import fs from 'fs';

const figures = [
  // PATIENT APP
  { section: 'patient', title: '📱 Patient App — تطبيق المريض', range: 'FIG 01–19', items: [
    { fig: 'FIG_01', en_file: 'FIG_01_patient_splash.png', en_label: 'Splash Screen', ar_label: 'شاشة البداية', splash: true },
    { fig: 'FIG_02', en_file: 'FIG_02_patient_login_en.png', ar_file: 'FIG_02_patient_login_ar.png', en_label: 'Login', ar_label: 'تسجيل الدخول' },
    { fig: 'FIG_03', en_file: 'FIG_03_patient_signup_en.png', ar_file: 'FIG_03_patient_signup_ar.png', en_label: 'Sign Up', ar_label: 'إنشاء حساب' },
    { fig: 'FIG_04', en_file: 'FIG_04_patient_onboarding_en.png', ar_file: 'FIG_04_patient_onboarding_ar.png', en_label: 'Onboarding', ar_label: 'إعداد الحساب' },
    { fig: 'FIG_05', en_file: 'FIG_05_patient_home_en.png', ar_file: 'FIG_05_patient_home_ar.png', en_label: 'Home Dashboard', ar_label: 'الرئيسية' },
    { fig: 'FIG_06', en_file: 'FIG_06_patient_consultations_en.png', ar_file: 'FIG_06_patient_consultations_ar.png', en_label: 'Consultations List', ar_label: 'قائمة الاستشارات' },
    { fig: 'FIG_07', en_file: 'FIG_07_patient_wallet_en.png', ar_file: 'FIG_07_patient_wallet_ar.png', en_label: 'Token Wallet', ar_label: 'المحفظة' },
    { fig: 'FIG_08', en_file: 'FIG_08_patient_profile_en.png', ar_file: 'FIG_08_patient_profile_ar.png', en_label: 'Profile', ar_label: 'الملف الشخصي' },
    { fig: 'FIG_09', en_file: 'FIG_09_patient_ai_chat_en.png', ar_file: 'FIG_09_patient_ai_chat_ar.png', en_label: 'AI Medical Interview', ar_label: 'المقابلة الطبية الذكية' },
    { fig: 'FIG_10', en_file: 'FIG_10_patient_waiting_en.png', ar_file: 'FIG_10_patient_waiting_ar.png', en_label: 'Waiting Room Stepper', ar_label: 'غرفة الانتظار' },
    { fig: 'FIG_11', en_file: 'FIG_11_patient_clinical_report_en.png', ar_file: 'FIG_11_patient_clinical_report_ar.png', en_label: 'Clinical Case Report', ar_label: 'تقرير الحالة السريرية' },
    { fig: 'FIG_12', en_file: 'FIG_12_patient_tests_referrals_en.png', ar_file: 'FIG_12_patient_tests_referrals_ar.png', en_label: 'Tests & Referrals', ar_label: 'الفحوصات والإحالات' },
    { fig: 'FIG_13', en_file: 'FIG_13_patient_med_verify_en.png', ar_file: 'FIG_13_patient_med_verify_ar.png', en_label: 'Medication Verification', ar_label: 'التحقق من الأدوية' },
    { fig: 'FIG_14', en_file: 'FIG_14_patient_drug_label_en.png', ar_file: 'FIG_14_patient_drug_label_ar.png', en_label: 'Drug Label Photography', ar_label: 'تصوير ملصق الدواء' },
    { fig: 'FIG_15', en_file: 'FIG_15_patient_drug_analysis_en.png', ar_file: 'FIG_15_patient_drug_analysis_ar.png', en_label: 'Drug Image Analysis', ar_label: 'تحليل صورة الدواء' },
    { fig: 'FIG_16', en_file: 'FIG_16_patient_emergency_guard_en.png', ar_file: 'FIG_16_patient_emergency_guard_ar.png', en_label: 'Emergency Guard Protocol', ar_label: 'بروتوكول حارس الطوارئ' },
    { fig: 'FIG_17', en_file: 'FIG_17_patient_gibberish_guard_en.png', ar_file: 'FIG_17_patient_gibberish_guard_ar.png', en_label: 'Gibberish Guard Protocol', ar_label: 'بروتوكول حارس الإدخال' },
    { fig: 'FIG_18', en_file: 'FIG_18_patient_inquiry_en.png', ar_file: 'FIG_18_patient_inquiry_ar.png', en_label: 'Doctor Inquiry Response', ar_label: 'رد استفسار الطبيب' },
    { fig: 'FIG_19', en_file: 'FIG_19_patient_forgot_password_en.png', ar_file: 'FIG_19_patient_forgot_password_ar.png', en_label: 'Forgot Password', ar_label: 'نسيت كلمة المرور' },
  ]},
  // DOCTOR APP
  { section: 'doctor', title: '👨‍⚕️ Doctor App — تطبيق الطبيب', range: 'FIG 20–28', items: [
    { fig: 'FIG_20', en_file: 'FIG_20_doctor_splash.png', en_label: 'Splash Screen', ar_label: 'شاشة البداية', splash: true },
    { fig: 'FIG_21', en_file: 'FIG_21_doctor_login_en.png', ar_file: 'FIG_21_doctor_login_ar.png', en_label: 'Doctor Login', ar_label: 'تسجيل دخول الطبيب' },
    { fig: 'FIG_22', en_file: 'FIG_22_doctor_dashboard_en.png', ar_file: 'FIG_22_doctor_dashboard_ar.png', en_label: 'Doctor Dashboard', ar_label: 'لوحة معلومات الطبيب' },
    { fig: 'FIG_23', en_file: 'FIG_23_doctor_queue_en.png', ar_file: 'FIG_23_doctor_queue_ar.png', en_label: 'Patient Queue', ar_label: 'قائمة انتظار المرضى' },
    { fig: 'FIG_24', en_file: 'FIG_24_doctor_analytics_en.png', ar_file: 'FIG_24_doctor_analytics_ar.png', en_label: 'Doctor Analytics', ar_label: 'تحليلات الطبيب' },
    { fig: 'FIG_25', en_file: 'FIG_25_doctor_profile_en.png', ar_file: 'FIG_25_doctor_profile_ar.png', en_label: 'Doctor Profile', ar_label: 'الملف الشخصي للطبيب' },
    { fig: 'FIG_26', en_file: 'FIG_26_doctor_case_detail_en.png', ar_file: 'FIG_26_doctor_case_detail_ar.png', en_label: 'AI Clinical Summary', ar_label: 'الملخص السريري الذكي' },
    { fig: 'FIG_27', en_file: 'FIG_27_doctor_response_en.png', ar_file: 'FIG_27_doctor_response_ar.png', en_label: 'Clinical Response Form', ar_label: 'نموذج الاستجابة السريرية' },
    { fig: 'FIG_28', en_file: 'FIG_28_doctor_interventions_en.png', ar_file: 'FIG_28_doctor_interventions_ar.png', en_label: 'Interventions Ordering', ar_label: 'طلب الإجراءات الطبية' },
  ]},
  // ADMIN PANEL
  { section: 'admin', title: '🖥️ Admin Panel — لوحة التحكم الإدارية', range: 'FIG 29–48', items: [
    { fig: 'FIG_29', en_file: 'FIG_29_admin_login_en.png', ar_file: 'FIG_29_admin_login_ar.png', en_label: 'Admin Login', ar_label: 'تسجيل دخول المسؤول' },
    { fig: 'FIG_30', en_file: 'FIG_30_admin_dashboard_en.png', ar_file: 'FIG_30_admin_dashboard_ar.png', en_label: 'Dashboard', ar_label: 'لوحة المعلومات' },
    { fig: 'FIG_31', en_file: 'FIG_31_admin_consultations_en.png', ar_file: 'FIG_31_admin_consultations_ar.png', en_label: 'Consultations', ar_label: 'الاستشارات' },
    { fig: 'FIG_32', en_file: 'FIG_32_admin_doctors_en.png', ar_file: 'FIG_32_admin_doctors_ar.png', en_label: 'Doctors Management', ar_label: 'إدارة الأطباء' },
    { fig: 'FIG_33', en_file: 'FIG_33_admin_patients_en.png', ar_file: 'FIG_33_admin_patients_ar.png', en_label: 'Patients Management', ar_label: 'إدارة المرضى' },
    { fig: 'FIG_34', en_file: 'FIG_34_admin_ai_en.png', ar_file: 'FIG_34_admin_ai_ar.png', en_label: 'AI Management', ar_label: 'إدارة الذكاء الاصطناعي' },
    { fig: 'FIG_35', en_file: 'FIG_35_admin_protocols_en.png', ar_file: 'FIG_35_admin_protocols_ar.png', en_label: 'Safety Protocols', ar_label: 'بروتوكولات السلامة' },
    { fig: 'FIG_36', en_file: 'FIG_36_admin_interventions_en.png', ar_file: 'FIG_36_admin_interventions_ar.png', en_label: 'Interventions Catalog', ar_label: 'كتالوج الإجراءات' },
    { fig: 'FIG_37', en_file: 'FIG_37_admin_scheduling_en.png', ar_file: 'FIG_37_admin_scheduling_ar.png', en_label: 'Scheduling', ar_label: 'الجدولة' },
    { fig: 'FIG_38', en_file: 'FIG_38_admin_pricing_en.png', ar_file: 'FIG_38_admin_pricing_ar.png', en_label: 'Pricing Configuration', ar_label: 'تكوين التسعير' },
    { fig: 'FIG_39', en_file: 'FIG_39_admin_tokens_en.png', ar_file: 'FIG_39_admin_tokens_ar.png', en_label: 'Token Management', ar_label: 'إدارة وحدات الرصيد' },
    { fig: 'FIG_40', en_file: 'FIG_40_admin_kyc_en.png', ar_file: 'FIG_40_admin_kyc_ar.png', en_label: 'KYC Verification', ar_label: 'التحقق من الهوية' },
    { fig: 'FIG_41', en_file: 'FIG_41_admin_analytics_en.png', ar_file: 'FIG_41_admin_analytics_ar.png', en_label: 'Analytics', ar_label: 'التحليلات' },
    { fig: 'FIG_42', en_file: 'FIG_42_admin_news_en.png', ar_file: 'FIG_42_admin_news_ar.png', en_label: 'News Management', ar_label: 'إدارة الأخبار' },
    { fig: 'FIG_43', en_file: 'FIG_43_admin_ads_en.png', ar_file: 'FIG_43_admin_ads_ar.png', en_label: 'Advertisements', ar_label: 'الإعلانات' },
    { fig: 'FIG_44', en_file: 'FIG_44_admin_health_en.png', ar_file: 'FIG_44_admin_health_ar.png', en_label: 'Health Tips', ar_label: 'نصائح صحية' },
    { fig: 'FIG_45', en_file: 'FIG_45_admin_errors_en.png', ar_file: 'FIG_45_admin_errors_ar.png', en_label: 'Error Tracking', ar_label: 'تتبع الأخطاء' },
    { fig: 'FIG_46', en_file: 'FIG_46_admin_audit_en.png', ar_file: 'FIG_46_admin_audit_ar.png', en_label: 'Audit Log', ar_label: 'سجل التدقيق' },
    { fig: 'FIG_47', en_file: 'FIG_47_admin_settings_en.png', ar_file: 'FIG_47_admin_settings_ar.png', en_label: 'Settings', ar_label: 'الإعدادات' },
    { fig: 'FIG_48', en_file: 'FIG_48_admin_admins_en.png', ar_file: 'FIG_48_admin_admins_ar.png', en_label: 'Admin Management', ar_label: 'إدارة المسؤولين' },
  ]},
  // REPORT PDF
  { section: 'report', title: '📄 Clinical Report PDF — تقرير الحالة السريرية', range: 'FIG 49', items: [
    { fig: 'FIG_49', en_file: 'FIG_49_report_clinical_en.png', ar_file: 'FIG_49_report_clinical_ar.png', en_label: 'Clinical Report (Full Page)', ar_label: 'التقرير السريري (صفحة كاملة)' },
  ]},
];

const P = '../patent_images/v3/';
let html = '';

html += `<!-- FIGURES -->\n`;
html += `<div class="section" style="max-width:1200px">\n`;
html += `<div class="section-title">Field 7 - Patent Figures (Bilingual)</div>\n`;
html += `<h2>Patent Figures — 49 Total (English + Arabic / إنجليزي + عربي)</h2>\n`;
html += `<p style="color:#64748B;font-size:13px;margin-bottom:8px">High-fidelity screenshots from Patient, Doctor, Admin, and Report PDF mockup applications demonstrating all patentable innovations. Each figure is shown in both English (left) and Arabic (right).</p>\n`;
html += `<p style="color:#64748B;font-size:13px;margin-bottom:24px;direction:rtl;text-align:right;font-family:'Noto Sans Arabic',sans-serif">لقطات شاشة عالية الجودة من تطبيقات المريض والطبيب ولوحة التحكم وتقرير PDF توضح جميع الابتكارات المحمية ببراءة. كل شكل معروض بالإنجليزية (يسار) والعربية (يمين).</p>\n`;
html += `</div>\n\n`;

for (const sec of figures) {
  html += `<!-- ══════════ ${sec.section.toUpperCase()} (${sec.range}) ══════════ -->\n`;
  html += `<div class="section" style="max-width:1200px"><h2 style="color:#14B8A6;font-size:16px;border-bottom:2px solid #2DD4BF;padding-bottom:8px">${sec.title} (${sec.range})</h2></div>\n`;
  html += `<div class="fig-grid">\n`;

  for (const item of sec.items) {
    if (item.splash) {
      // Single splash — spans both columns
      html += `<div class="fig-card" style="grid-column:span 2"><img src="${P}${item.en_file}" alt="${item.fig}" loading="lazy" style="max-height:600px;margin:0 auto"><div class="fig-caption"><span class="fig-num">${item.fig}</span> ${item.en_label} / ${item.ar_label}</div></div>\n`;
    } else {
      // EN card
      html += `<div class="fig-card"><img src="${P}${item.en_file}" alt="${item.fig} EN" loading="lazy"><div class="fig-caption"><span class="fig-num">${item.fig}</span> ${item.en_label} <span class="lang-label lang-en">EN</span></div></div>\n`;
      // AR card
      html += `<div class="fig-card"><img src="${P}${item.ar_file}" alt="${item.fig} AR" loading="lazy"><div class="fig-caption"><span class="fig-num">${item.fig}</span> ${item.ar_label} <span class="lang-label lang-ar">AR</span></div></div>\n`;
    }
  }
  html += `</div>\n\n`;
  html += `<div class="page-break"></div>\n\n`;
}

fs.writeFileSync('c:\\Users\\docph\\Desktop\\cliniq.one ag\\patent_translation\\figures_section.html', html, 'utf8');
console.log('Generated figures_section.html');
console.log(`Lines: ${html.split('\n').length}`);
