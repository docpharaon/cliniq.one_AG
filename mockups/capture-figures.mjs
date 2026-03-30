// Patent Figure Batch Capture Script
// Uses Playwright to capture all mockup screens in EN + AR
import { chromium } from 'playwright';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const MOCKUPS = path.resolve(__dirname);
const OUT = path.resolve(__dirname, '..', 'patent_images', 'v3');

const PATIENT_URL = `file:///${MOCKUPS.replace(/\\/g, '/')}/patient-mockup.html`;
const DOCTOR_URL  = `file:///${MOCKUPS.replace(/\\/g, '/')}/doctor-mockup.html`;
const ADMIN_URL   = `file:///${MOCKUPS.replace(/\\/g, '/')}/admin-mockup.html`;
const REPORT_URL  = `file:///${MOCKUPS.replace(/\\/g, '/')}/report-pdf-mockup.html`;

async function delay(ms) { return new Promise(r => setTimeout(r, ms)); }

async function capturePatient(browser) {
  console.log('\n=== PATIENT APP FIGURES ===');
  const ctx = await browser.newContext({ viewport: { width: 500, height: 900 } });
  const page = await ctx.newPage();

  // FIG_01 — Splash (single capture, no lang variant)
  console.log('FIG_01 splash...');
  await page.goto(PATIENT_URL);
  await delay(1500);
  const frame = page.locator('.iphone-outer');
  await frame.screenshot({ path: path.join(OUT, 'FIG_01_patient_splash.png') });

  // Helper: capture EN + AR for a given screen setup
  async function capEN_AR(fig, name, setup) {
    // EN
    console.log(`${fig} ${name} EN...`);
    await page.goto(PATIENT_URL + '?screen=screen-login');
    await delay(500);
    await setup('en');
    await delay(800);
    await frame.screenshot({ path: path.join(OUT, `${fig}_patient_${name}_en.png`) });
    // AR
    console.log(`${fig} ${name} AR...`);
    await page.evaluate(() => { if(typeof toggleLang==='function') toggleLang(); });
    await delay(800);
    await frame.screenshot({ path: path.join(OUT, `${fig}_patient_${name}_ar.png`) });
  }

  // Simple screens — navigate via deep-link, capture EN then toggle for AR
  const simpleScreens = [
    ['FIG_02', 'login',       'screen-login'],
    ['FIG_03', 'signup',      'screen-signup'],
    ['FIG_04', 'onboarding',  'screen-onboarding'],
    ['FIG_09', 'ai_chat',     'screen-ai-chat'],
    ['FIG_10', 'waiting',     'screen-waiting'],
    ['FIG_11', 'clinical_report', 'screen-consultation-detail'],
    ['FIG_12', 'tests_referrals', 'screen-interventions'],
    ['FIG_13', 'med_verify',  'screen-med-verify'],
    ['FIG_14', 'drug_label',  'screen-drug-label'],
    ['FIG_15', 'drug_analysis', 'screen-drug-analysis'],
    ['FIG_18', 'inquiry',     'screen-inquiry'],
    ['FIG_19', 'forgot_password', 'screen-forgot-password'],
  ];

  for (const [fig, name, screenId] of simpleScreens) {
    console.log(`${fig} ${name} EN...`);
    await page.goto(PATIENT_URL + `?screen=${screenId}`);
    await delay(1200);
    await frame.screenshot({ path: path.join(OUT, `${fig}_patient_${name}_en.png`) });
    console.log(`${fig} ${name} AR...`);
    await page.evaluate(() => { if(typeof toggleLang==='function') toggleLang(); });
    await delay(800);
    await frame.screenshot({ path: path.join(OUT, `${fig}_patient_${name}_ar.png`) });
  }

  // Tab screens on home
  const tabs = [
    ['FIG_05', 'home',          'home'],
    ['FIG_06', 'consultations', 'consultations'],
    ['FIG_07', 'wallet',        'wallet'],
    ['FIG_08', 'profile',       'profile'],
  ];
  for (const [fig, name, tab] of tabs) {
    console.log(`${fig} ${name} EN...`);
    await page.goto(PATIENT_URL + '?screen=screen-home');
    await delay(1000);
    await page.evaluate((t) => { if(typeof switchTab==='function') switchTab(t); }, tab);
    await delay(800);
    await frame.screenshot({ path: path.join(OUT, `${fig}_patient_${name}_en.png`) });
    console.log(`${fig} ${name} AR...`);
    await page.evaluate(() => { if(typeof toggleLang==='function') toggleLang(); });
    await delay(800);
    await frame.screenshot({ path: path.join(OUT, `${fig}_patient_${name}_ar.png`) });
  }

  // Guard demos
  const guards = [
    ['FIG_16', 'emergency_guard', 'emergency'],
    ['FIG_17', 'gibberish_guard', 'gibberish'],
  ];
  for (const [fig, name, type] of guards) {
    console.log(`${fig} ${name} EN...`);
    await page.goto(PATIENT_URL + '?screen=screen-home');
    await delay(800);
    await page.evaluate((t) => { if(typeof showGuardDemo==='function') showGuardDemo(t); }, type);
    await delay(1000);
    await frame.screenshot({ path: path.join(OUT, `${fig}_patient_${name}_en.png`) });
    console.log(`${fig} ${name} AR...`);
    await page.evaluate(() => { if(typeof toggleLang==='function') toggleLang(); });
    await delay(500);
    await page.evaluate((t) => { if(typeof showGuardDemo==='function') showGuardDemo(t); }, type);
    await delay(800);
    await frame.screenshot({ path: path.join(OUT, `${fig}_patient_${name}_ar.png`) });
  }

  await ctx.close();
  console.log('Patient: DONE ✓');
}

async function captureDoctor(browser) {
  console.log('\n=== DOCTOR APP FIGURES ===');
  const ctx = await browser.newContext({ viewport: { width: 500, height: 900 } });
  const page = await ctx.newPage();

  // FIG_20 — Splash (single capture)
  console.log('FIG_20 splash...');
  await page.goto(DOCTOR_URL);
  await delay(1500);
  const frame = page.locator('.iphone-outer');
  await frame.screenshot({ path: path.join(OUT, 'FIG_20_doctor_splash.png') });

  // Simple screens
  const simpleScreens = [
    ['FIG_21', 'login',        'scr-login'],
    ['FIG_26', 'case_detail',  'scr-case'],
    ['FIG_27', 'response',     'scr-respond'],
    ['FIG_28', 'interventions','scr-interventions'],
  ];
  for (const [fig, name, screenId] of simpleScreens) {
    console.log(`${fig} ${name} EN...`);
    await page.goto(DOCTOR_URL + `?screen=${screenId}`);
    await delay(1200);
    await frame.screenshot({ path: path.join(OUT, `${fig}_doctor_${name}_en.png`) });
    console.log(`${fig} ${name} AR...`);
    await page.evaluate(() => { if(typeof toggleLang==='function') toggleLang(); });
    await delay(800);
    await frame.screenshot({ path: path.join(OUT, `${fig}_doctor_${name}_ar.png`) });
  }

  // Tab screens on home
  const tabs = [
    ['FIG_22', 'dashboard',  'ts-dash'],
    ['FIG_23', 'queue',      'ts-queue'],
    ['FIG_24', 'analytics',  'ts-analytics'],
    ['FIG_25', 'profile',    'ts-profile'],
  ];
  for (const [fig, name, tab] of tabs) {
    console.log(`${fig} ${name} EN...`);
    await page.goto(DOCTOR_URL + `?tab=${tab}`);
    await delay(1500);
    await frame.screenshot({ path: path.join(OUT, `${fig}_doctor_${name}_en.png`) });
    console.log(`${fig} ${name} AR...`);
    await page.evaluate(() => { if(typeof toggleLang==='function') toggleLang(); });
    await delay(800);
    await frame.screenshot({ path: path.join(OUT, `${fig}_doctor_${name}_ar.png`) });
  }

  await ctx.close();
  console.log('Doctor: DONE ✓');
}

async function captureAdmin(browser) {
  console.log('\n=== ADMIN PANEL FIGURES ===');
  const ctx = await browser.newContext({ viewport: { width: 900, height: 1000 } });
  const page = await ctx.newPage();

  // FIG_29 — Login (capture with splash visible, then login)
  console.log('FIG_29 login EN...');
  await page.goto(ADMIN_URL);
  await delay(2500);
  const frame = page.locator('.fold-outer');
  await frame.screenshot({ path: path.join(OUT, 'FIG_29_admin_login_en.png') });
  console.log('FIG_29 login AR...');
  await page.evaluate(() => { if(typeof toggleLang==='function') toggleLang(); });
  await delay(800);
  await frame.screenshot({ path: path.join(OUT, 'FIG_29_admin_login_ar.png') });

  // All admin pages via deep-link
  const adminPages = [
    ['FIG_30', 'dashboard'],
    ['FIG_31', 'consultations'],
    ['FIG_32', 'doctors'],
    ['FIG_33', 'patients'],
    ['FIG_34', 'ai'],
    ['FIG_35', 'protocols'],
    ['FIG_36', 'interventions'],
    ['FIG_37', 'scheduling'],
    ['FIG_38', 'pricing'],
    ['FIG_39', 'tokens'],
    ['FIG_40', 'kyc'],
    ['FIG_41', 'analytics'],
    ['FIG_42', 'news'],
    ['FIG_43', 'ads'],
    ['FIG_44', 'health'],
    ['FIG_45', 'errors'],
    ['FIG_46', 'audit'],
    ['FIG_47', 'settings'],
    ['FIG_48', 'admins'],
  ];

  for (const [fig, pageName] of adminPages) {
    console.log(`${fig} ${pageName} EN...`);
    await page.goto(ADMIN_URL + `?page=${pageName}&skip=1`);
    await delay(1200);
    await frame.screenshot({ path: path.join(OUT, `${fig}_admin_${pageName}_en.png`) });
    console.log(`${fig} ${pageName} AR...`);
    await page.evaluate(() => { if(typeof toggleLang==='function') toggleLang(); });
    await delay(800);
    await frame.screenshot({ path: path.join(OUT, `${fig}_admin_${pageName}_ar.png`) });
  }

  await ctx.close();
  console.log('Admin: DONE ✓');
}

async function captureReport(browser) {
  console.log('\n=== REPORT PDF FIGURE ===');
  const ctx = await browser.newContext({ viewport: { width: 900, height: 1300 } });
  const page = await ctx.newPage();

  // FIG_49 — Report (single page, capture the .page element)
  console.log('FIG_49 report EN...');
  await page.goto(REPORT_URL);
  await delay(2000);
  const reportPage = page.locator('.page').first();
  await reportPage.screenshot({ path: path.join(OUT, 'FIG_49_report_clinical_en.png') });
  console.log('FIG_49 report AR...');
  await page.evaluate(() => { if(typeof toggleLang==='function') toggleLang(); });
  await delay(1000);
  await reportPage.screenshot({ path: path.join(OUT, 'FIG_49_report_clinical_ar.png') });

  await ctx.close();
  console.log('Report: DONE ✓');
}

// ═══ MAIN ═══
(async () => {
  console.log('Starting patent figure capture...');
  console.log(`Output: ${OUT}`);
  const browser = await chromium.launch({ headless: true });
  try {
    await capturePatient(browser);
    await captureDoctor(browser);
    await captureAdmin(browser);
    await captureReport(browser);
    console.log('\n✅ ALL FIGURES CAPTURED SUCCESSFULLY');
  } catch (err) {
    console.error('❌ ERROR:', err.message);
    console.error(err.stack);
  } finally {
    await browser.close();
  }

  // Summary
  const fs = await import('fs');
  const files = fs.readdirSync(OUT).filter(f => f.endsWith('.png'));
  console.log(`\nTotal files: ${files.length}`);
  console.log('Files:', files.join(', '));
})();
