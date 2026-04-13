# Meta WhatsApp Business — Approved Message Templates

This document contains the message templates for cliniq.one's WhatsApp integration. These must be submitted via the Meta Developer Dashboard for approval before they can be sent to patients.

> [!IMPORTANT]
> Meta templates use double curly braces for variables (e.g., `{{1}}`, `{{2}}`). When submitting, ensure you provide "sample values" for each variable to avoid rejection.

---

## 1. Appointment Confirmation
**Category:** Utility / Transactional
**Variables:**
1. `{{1}}`: Patient Name
2. `{{2}}`: Doctor Name
3. `{{3}}`: Location Name
4. `{{4}}`: Date (e.g. Oct 15)
5. `{{5}}`: Time (e.g. 10:30 AM)

### English (en)
> Hello {{1}}, your appointment with Dr. {{2}} at {{3}} is confirmed for {{4}} at {{5}}. We look forward to seeing you.

### Arabic (ar)
> مرحبًا {{1}}، تم تأكيد موعدك مع د. {{2}} في {{3}} بتاريخ {{4}} الساعة {{5}}. نتطلع لرؤيتك.

---

## 2. 24-Hour Reminder
**Category:** Utility / Transactional
**Variables:**
1. `{{1}}`: Patient Name
2. `{{2}}`: Doctor Name
3. `{{3}}`: Date
4. `{{4}}`: Time

### English (en)
> Hi {{1}}, this is a reminder for your appointment tomorrow with Dr. {{2}} at {{3}}, {{4}}. Please let us know if you need to reschedule.

### Arabic (ar)
> مرحبًا {{1}}، تذكير بموعدك غداً مع د. {{2}} في تاريخ {{3}} الساعة {{4}}. يرجى إبلاغنا في حال رغبتك في تغيير الموعد.

---

## 3. 2-Hour Reminder
**Category:** Utility / Transactional
**Variables:**
1. `{{1}}`: Patient Name
2. `{{2}}`: Time

### English (en)
> Quick reminder, {{1}}! Your appointment is today in 2 hours at {{2}}. See you soon.

### Arabic (ar)
> تذكير سريع {{1}}! موعدك اليوم بعد ساعتين، الساعة {{2}}. نراك قريباً.

---

## 4. Cancellation Notice
**Category:** Utility / Transactional
**Variables:**
1. `{{1}}`: Patient Name
2. `{{2}}`: Doctor Name
3. `{{3}}`: Date

### English (en)
> Hello {{1}}, your appointment with Dr. {{2}} on {{3}} has been cancelled as requested. If this was a mistake, please reach out to us.

### Arabic (ar)
> مرحبًا {{1}}، تم إلغاء موعدك مع د. {{2}} بتاريخ {{3}} بناءً على طلبك. إذا كان هذا الإلغاء عن طريق الخطأ، يرجى التواصل معنا.

---

## 5. Intake Report Ready
**Category:** Utility / Transactional
**Variables:**
1. `{{1}}`: Patient Name
2. `{{2}}`: Link to the patient portal/report

### English (en)
> Hello {{1}}, your medical intake report is now ready for your doctor to review. You can view your summary here: {{2}}

### Arabic (ar)
> مرحبًا {{1}}، تقريرك الطبي جاهز الآن ليقوم الطبيب بمراجعته. يمكنك عرض الملخص الخاص بك هنا: {{2}}

---

## 6. Doctor Notification (Internal)
**Category:** Utility
**Variables:**
1. `{{1}}`: Doctor Name
2. `{{2}}`: Patient Name
3. `{{3}}`: Pathway/Reason

### English (en)
> Dr. {{1}}, a new patient ({{2}}) has completed their WhatsApp intake for {{3}}. The report is available in your dashboard.

### Arabic (ar)
> د. {{1}}، قام مريض جديد ({{2}}) بإكمال التقييم الأولي عبر واتساب بخصوص {{3}}. التقرير متاح الآن في لوحة التحكم الخاصة بك.
