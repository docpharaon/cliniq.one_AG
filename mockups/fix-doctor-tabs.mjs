// Fix Doctor dashboard capture (FIG_22) — must fight the 3s splash auto-redirect
import { chromium } from 'playwright';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const MOCKUPS = path.resolve(__dirname);
const OUT = path.resolve(__dirname, '..', 'patent_images', 'v3');
const DOCTOR_URL = `file:///${MOCKUPS.replace(/\\/g, '/')}/doctor-mockup.html`;

async function delay(ms) { return new Promise(r => setTimeout(r, ms)); }

(async () => {
  const browser = await chromium.launch({ headless: true });
  const ctx = await browser.newContext({ viewport: { width: 500, height: 900 } });
  const page = await ctx.newPage();
  const frame = page.locator('.iphone-outer');

  const tabs = [
    ['FIG_22', 'dashboard', 'dash'],
    ['FIG_23', 'queue',     'queue'],
    ['FIG_24', 'analytics', 'analytics'],
    ['FIG_25', 'profile',   'profile'],
  ];

  for (const [fig, name, tabId] of tabs) {
    console.log(`${fig} ${name} EN...`);
    await page.goto(DOCTOR_URL);
    // Wait for the 3s splash auto-redirect to fire first
    await delay(3500);
    // Now navigate to home and tab 
    await page.evaluate(() => { show('scr-home'); });
    await delay(300);
    await page.evaluate((t) => { stab(t); }, tabId);
    await delay(800);
    await frame.screenshot({ path: path.join(OUT, `${fig}_doctor_${name}_en.png`) });

    console.log(`${fig} ${name} AR...`);
    await page.evaluate(() => { toggleLang(); });
    await delay(800);
    await frame.screenshot({ path: path.join(OUT, `${fig}_doctor_${name}_ar.png`) });
  }

  await ctx.close();
  await browser.close();
  console.log('Doctor tabs fixed ✓');
})();
