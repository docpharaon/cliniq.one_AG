# Build bilingual patent PDF HTML with figures
$ErrorActionPreference = "Stop"
$out = "C:\Users\docph\Desktop\cliniq.one ag\patent_translation\CLINIQ_ONE_PATENT_FULL_BILINGUAL.html"
$imgDir = "C:\Users\docph\Desktop\cliniq.one ag\patent_images\v2"

# Read source files
$summary_ar = Get-Content "C:\Users\docph\Desktop\cliniq.one ag\patent_translation\FILE_1_SUMMARY_translate_to_arabic.txt" -Raw -Encoding UTF8
$desc_ar = Get-Content "C:\Users\docph\Desktop\cliniq.one ag\patent_translation\FILE_2_DESCRIPTION_translate_to_arabic.txt" -Raw -Encoding UTF8
$claims_ar = Get-Content "C:\Users\docph\Desktop\cliniq.one ag\patent_translation\FILE_3_CLAIMS_translate_to_arabic.txt" -Raw -Encoding UTF8
$english = Get-Content "C:\Users\docph\.gemini\antigravity\brain\66893f52-7df7-47f2-8b5c-303d65b2a05b\patent_filing_content.md" -Raw -Encoding UTF8

# Clean
$english = $english -replace '#{1,3}\s', '' -replace '\*\*', '' -replace '> ', '' -replace '---', '' -replace '`', ''
$summary_ar = ($summary_ar -split "`n" | Select-Object -Skip 4) -join "`n"
$desc_ar = ($desc_ar -split "`n" | Select-Object -Skip 8) -join "`n"
$claims_ar = ($claims_ar -split "`n" | Select-Object -Skip 5) -join "`n"

# Escape HTML
function EscapeHtml($t) { $t -replace '&','&amp;' -replace '<','&lt;' -replace '>','&gt;' }
$summary_ar_h = EscapeHtml $summary_ar
$desc_ar_h = EscapeHtml $desc_ar
$claims_ar_h = EscapeHtml $claims_ar
$english_h = EscapeHtml $english

# Build figure gallery HTML
$figuresHtml = ""
$figFiles = Get-ChildItem "$imgDir\*.png" | Sort-Object Name
$figLabels = @{
  "FIG_01"="Admin - Admins Management";"FIG_02"="Admin - Advertisements";"FIG_03"="Admin - AI Management"
  "FIG_04"="Admin - Analytics";"FIG_05"="Admin - Audit Log";"FIG_06"="Admin - Consultations"
  "FIG_07"="Admin - Dashboard";"FIG_08"="Admin - Doctors";"FIG_09"="Admin - Error Tracking"
  "FIG_10"="Admin - Health Tips";"FIG_11"="Admin - Interventions Catalog";"FIG_12"="Admin - KYC Verification"
  "FIG_13"="Admin - News";"FIG_14"="Admin - Patients";"FIG_15"="Admin - Pricing Config"
  "FIG_16"="Admin - Safety Protocols";"FIG_17"="Admin - Scheduling";"FIG_18"="Admin - Settings"
  "FIG_19"="Admin - Token Management";"FIG_20"="Doctor - Analytics";"FIG_21"="Doctor - AI Clinical Summary (EN)"
  "FIG_22"="Doctor - AI Clinical Summary (AR)";"FIG_23"="Doctor - Interventions";"FIG_24"="Doctor - Clinical Response (EN)"
  "FIG_25"="Doctor - Clinical Response (AR)";"FIG_26"="Doctor - Home";"FIG_27"="Doctor - Home (Audit)"
  "FIG_28"="Doctor - Profile";"FIG_29"="Doctor - Queue (EN)";"FIG_30"="Doctor - Queue (AR)"
  "FIG_31"="Patient - Active Consultation Stepper";"FIG_32"="Patient - AI Interview (Ongoing)"
  "FIG_33"="Patient - AI Interview (Start)";"FIG_34"="Patient - Consultations List"
  "FIG_35"="Patient - Emergency Protocol";"FIG_36"="Patient - Home (AR)";"FIG_37"="Patient - Home (EN)"
  "FIG_38"="Patient - Home v2";"FIG_39"="Patient - Splash Screen";"FIG_40"="Patient - Login"
  "FIG_41"="Patient - Profile";"FIG_42"="Patient - Clinical Case Report";"FIG_43"="Patient - Wallet (AR)"
  "FIG_44"="Patient - Wallet (EN)";"FIG_45"="Report PDF - Header + Demographics"
  "FIG_46"="Report PDF - Clinical Photos + Diagnosis";"FIG_47"="Report PDF - Treatment Plan"
  "FIG_48"="Report PDF - Follow-up + Signature";"FIG_49"="Patient - Photo Capture Node"
  "FIG_50"="Report PDF - Clinical Photographs";"FIG_51"="Patient - Clinical Summary"
  "FIG_52"="Patient - Addendum Confirmation"
}

foreach ($f in $figFiles) {
  $key = $f.Name.Substring(0, 6)
  $label = if ($figLabels.ContainsKey($key)) { $figLabels[$key] } else { $f.BaseName }
  $relPath = "../patent_images/v2/$($f.Name)"
  $figuresHtml += @"
<div class="fig-card">
  <img src="$relPath" alt="$label" loading="lazy">
  <div class="fig-caption"><span class="fig-num">$key</span> $label</div>
</div>
"@
}

$html = @"
<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<title>cliniq.one Patent Filing - Full Bilingual Document</title>
<style>
@import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;600;700;900&family=Noto+Sans+Arabic:wght@300;400;600;700;900&display=swap');
*{margin:0;padding:0;box-sizing:border-box}
body{font-family:'Inter','Noto Sans Arabic',sans-serif;color:#1E293B;background:#F8FAFC;padding:0}
@media print{body{background:white}.no-print{display:none!important}.page-break{page-break-before:always}.fig-card{break-inside:avoid}.fig-card img{max-height:500px}}
.cover{background:linear-gradient(135deg,#0F172A,#1E293B 60%,#0F4F4A);color:white;padding:80px 60px;min-height:100vh;display:flex;flex-direction:column;justify-content:center}
.cover h1{font-size:48px;font-weight:900;margin-bottom:12px}
.cover h1 span{color:#2DD4BF}
.cover h2{font-size:22px;font-weight:300;opacity:0.7;margin-bottom:40px}
.cover .meta{font-size:14px;opacity:0.5;line-height:2}
.toolbar{position:fixed;top:0;left:0;right:0;background:#0F172A;color:white;padding:10px 24px;display:flex;align-items:center;justify-content:space-between;z-index:100;font-size:13px}
.toolbar button{padding:8px 20px;border-radius:8px;border:none;background:#2DD4BF;color:#0F172A;font-weight:700;cursor:pointer;font-family:inherit}
.section{max-width:900px;margin:0 auto;padding:40px 60px}
.section-title{font-size:12px;font-weight:800;color:#14B8A6;text-transform:uppercase;letter-spacing:3px;margin-bottom:8px;padding-bottom:6px;border-bottom:2px solid #2DD4BF}
.section h2{font-size:24px;font-weight:800;margin-bottom:16px}
.lang-label{display:inline-block;padding:3px 10px;border-radius:4px;font-size:10px;font-weight:800;letter-spacing:1px;margin-bottom:12px}
.lang-en{background:#DBEAFE;color:#2563EB}
.lang-ar{background:#D1FAE5;color:#059669}
.content-block{background:white;border:1px solid #E2E8F0;border-radius:12px;padding:24px 28px;margin-bottom:24px;font-size:13px;line-height:1.9;white-space:pre-wrap;word-wrap:break-word}
.content-block.rtl{direction:rtl;text-align:right;font-family:'Noto Sans Arabic','Inter',sans-serif}
.divider{height:3px;background:linear-gradient(90deg,#2DD4BF,#3B82F6);margin:40px auto;max-width:900px;border-radius:2px}
/* FIGURES */
.fig-grid{display:grid;grid-template-columns:1fr 1fr;gap:20px;max-width:1100px;margin:0 auto;padding:20px 40px}
.fig-card{background:white;border:1px solid #E2E8F0;border-radius:12px;overflow:hidden;break-inside:avoid}
.fig-card img{width:100%;height:auto;display:block;border-bottom:1px solid #E2E8F0}
.fig-caption{padding:10px 14px;font-size:12px;font-weight:600;color:#475569}
.fig-num{color:#14B8A6;font-weight:800;margin-right:6px}
</style>
</head>
<body>
<div class="toolbar no-print">
<span style="font-weight:800;color:#2DD4BF">cliniq.one</span> <span style="opacity:0.4">|</span> Patent Filing - Full Bilingual Document
<button onclick="window.print()">Print / Save PDF</button>
</div>

<div class="cover">
<h1><span>cliniq.</span>one</h1>
<h2>Patent Application - Full Bilingual Filing Document</h2>
<div style="width:60px;height:3px;background:#2DD4BF;margin-bottom:40px;border-radius:2px"></div>
<div class="meta">
<p>Filing Authority: Saudi Authority for Intellectual Property (SAIP)</p>
<p>Application Type: Invention Patent</p>
<p>Total Claims: 31 (11 Independent + 20 Dependent)</p>
<p>Total Figures: 52</p>
<p>Languages: English + Arabic</p>
<p>Document Generated: March 29, 2026</p>
<p>Applicant: Momen Pharaon</p>
</div>
</div>

<div class="page-break"></div>

<!-- TOC -->
<div class="section" style="padding-top:80px">
<div class="section-title">Table of Contents</div>
<h2>Document Structure</h2>
<div class="content-block" style="font-size:14px;line-height:2.5">
1. Summary (English) ............................................. Field 2
2. Summary (Arabic) ............................................... Field 1
3. Description (English) .......................................... Field 4
4. Description (Arabic) ............................................ Field 3
5. Claims - Arabic (31 Claims) ................................ Field 6
6. Patent Figures (52 Figures) ................................. Field 7
   - Patient App (FIG 31-44, 49, 51-52)
   - Doctor App (FIG 20-30)
   - Admin Panel (FIG 01-19)
   - Report PDF (FIG 45-48, 50)
</div>
</div>

<div class="divider"></div>
<div class="page-break"></div>

<!-- SUMMARY EN -->
<div class="section">
<div class="section-title">Field 2 - Summary</div>
<h2>Patent Summary</h2>
<span class="lang-label lang-en">ENGLISH</span>
<div class="content-block">A computer-implemented telemedicine system and method comprising a patient mobile application, a doctor application, an administrative dashboard, and a backend server with edge computing functions. The system provides a dynamically adaptive interview control system that conditionally generates and sequences clinical prompts based on patient input using a configurable sequence-node architecture with server-side prompt orchestration, structured conversational constraints, and specialty-based pathway routing. A bidirectional adaptive behavioral control system monitors patient interactions through multilingual emergency detection, input validity assessment with clinical vocabulary allowlisting, progressive escalation with configurable thresholds, and cooperative recovery. The system implements a tokenized consultation economy with context-sensitive pricing based on clinical complexity and atomic concurrent-safe transactional processing. An AI-driven classification engine, including but not limited to large language models, classifies patient clinical concerns into medical and surgical disciplines with confidence scoring, dynamically reconfigures interview flows based on detected pathways, and routes completed consultations to specialty-filtered physician queues. A cross-specialty medical intervention ordering subsystem provides automated insurance pre-authorization workflows, cross-specialty diagnostic and surgical ordering within a unified consultation session, and multi-stage lifecycle tracking with service provider matching. An AI-mediated bidirectional clinical clarification mechanism enables physicians to request additional patient information through structured, turn-limited interactions with automated communication refinement.</div>
</div>

<div class="divider"></div>

<!-- SUMMARY AR -->
<div class="section">
<div class="section-title">Field 1 - Summary (Arabic)</div>
<h2 style="direction:rtl;text-align:right">&#x0645;&#x0644;&#x062E;&#x0635; &#x0627;&#x0644;&#x0628;&#x0631;&#x0627;&#x0621;&#x0629;</h2>
<span class="lang-label lang-ar">Arabic</span>
<div class="content-block rtl">$summary_ar_h</div>
</div>

<div class="divider"></div>
<div class="page-break"></div>

<!-- DESCRIPTION EN -->
<div class="section">
<div class="section-title">Field 4 - Description (English)</div>
<h2>Patent Description</h2>
<span class="lang-label lang-en">ENGLISH - FULL DESCRIPTION</span>
<div class="content-block">$english_h</div>
</div>

<div class="divider"></div>
<div class="page-break"></div>

<!-- DESCRIPTION AR -->
<div class="section">
<div class="section-title">Field 3 - Description (Arabic)</div>
<h2 style="direction:rtl;text-align:right">&#x0648;&#x0635;&#x0641; &#x0627;&#x0644;&#x0627;&#x062E;&#x062A;&#x0631;&#x0627;&#x0639;</h2>
<span class="lang-label lang-ar">Arabic</span>
<div class="content-block rtl">$desc_ar_h</div>
</div>

<div class="divider"></div>
<div class="page-break"></div>

<!-- CLAIMS AR -->
<div class="section">
<div class="section-title">Field 6 - Protection Elements / Claims (Arabic)</div>
<h2 style="direction:rtl;text-align:right">&#x0627;&#x0644;&#x0645;&#x0637;&#x0627;&#x0644;&#x0628;&#x0627;&#x062A; (31)</h2>
<span class="lang-label lang-ar">Arabic - 31 Claims</span>
<div class="content-block rtl">$claims_ar_h</div>
</div>

<div class="divider"></div>
<div class="page-break"></div>

<!-- FIGURES -->
<div class="section" style="max-width:1100px">
<div class="section-title">Field 7 - Patent Figures</div>
<h2>Patent Figures (52 Total)</h2>
<p style="color:#64748B;font-size:13px;margin-bottom:24px">High-fidelity screenshots from Patient, Doctor, Admin, and Report PDF mockup applications demonstrating all patentable innovations.</p>
</div>

<div class="fig-grid">
$figuresHtml
</div>

<div class="divider"></div>

<!-- FOOTER -->
<div style="text-align:center;padding:40px;color:#94A3B8;font-size:11px">
<p style="font-weight:700;color:#14B8A6;margin-bottom:8px">cliniq.one - Patent Filing Document</p>
<p>This document contains confidential intellectual property. For SAIP submission only.</p>
<p>Generated March 29, 2026 - 31 Claims (11 Independent + 20 Dependent) - 52 Figures</p>
</div>

</body>
</html>
"@

$utf8BOM = New-Object System.Text.UTF8Encoding($true)
[System.IO.File]::WriteAllText($out, $html, $utf8BOM)
Write-Host "SUCCESS: Bilingual patent document with 52 figures created at:"
Write-Host $out
