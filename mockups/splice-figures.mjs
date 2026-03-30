// Splice v3 figures into the patent document
import fs from 'fs';

const patentPath = 'c:\\Users\\docph\\Desktop\\cliniq.one ag\\patent_translation\\CLINIQ_ONE_PATENT_FULL_BILINGUAL.html';
const figuresPath = 'c:\\Users\\docph\\Desktop\\cliniq.one ag\\patent_translation\\figures_section.html';

const patent = fs.readFileSync(patentPath, 'utf8');
const figures = fs.readFileSync(figuresPath, 'utf8');
const lines = patent.split('\n');

// Replace lines 809-955 (the old figures section) with the new v3 figures
// Line 809 = "<!-- FIGURES -->" ... Line 955 = last fig-card before </div> of extras
// Keep line 808 (page-break before) and line 956+ (divider + footer after)
const before = lines.slice(0, 808).join('\n'); // lines 1-808
const after = lines.slice(955).join('\n');       // lines 956+

// Also update the cover page stats and footer
let result = before + '\n' + figures + '\n' + after;

// Update cover stats: 56 → 49 figures, 112 → 96 images
result = result.replace('Total Figures: 56 (112 images: English + Arabic)', 'Total Figures: 49 (96 images: English + Arabic)');

// Update TOC
result = result.replace(
  `6. Patent Figures — Bilingual (56 × 2 = 112) .......... Field 7
   🖥️ Admin Panel (FIG 01–19) — EN + AR
   👨‍⚕️ Doctor App (FIG 20–30) — EN + AR
   📱 Patient App (FIG 31–44) — EN + AR
   📄 Report PDF (FIG 45–48) — EN + AR
   🚀 Innovations (FIG 49–56) — EN + AR`,
  `6. Patent Figures — Bilingual (49 × 2 = 96) ............ Field 7
   📱 Patient App (FIG 01–19) — EN + AR
   👨‍⚕️ Doctor App (FIG 20–28) — EN + AR
   🖥️ Admin Panel (FIG 29–48) — EN + AR
   📄 Report PDF (FIG 49) — EN + AR`
);

// Update footer
result = result.replace(
  '56 Figures (112 images: EN + AR)',
  '49 Figures (96 images: EN + AR)'
);

fs.writeFileSync(patentPath, result, 'utf8');
console.log('Patent document updated with v3 figures ✓');
console.log(`New line count: ${result.split('\n').length}`);
