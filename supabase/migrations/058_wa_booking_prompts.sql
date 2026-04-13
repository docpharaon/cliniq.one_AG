-- ══════════════════════════════════════════════════════════════
-- 058_wa_booking_prompts.sql
-- AI Prompts + Sequence Nodes for Booking Flow
-- Adds intent router, booking offer, phone collection, confirmation
-- ══════════════════════════════════════════════════════════════


-- ═══════════════════════════════════════════════════
-- 1. NEW PROMPTS
-- ═══════════════════════════════════════════════════

-- ── WA Intent Router (replaces Visit Type) ───────
INSERT INTO public.ai_prompts (name, specialty, prompt_type, content, is_active, version)
VALUES (
    'WA — Intent Router',
    'general',
    'intake',
    'You are a medical intake AI for cliniq.one. Your ONLY task is to understand what the patient needs today.

Ask ONE simple question presenting the available options:

If booking is enabled ([FEATURES] context includes "booking":true):
"How can I help you today?
1. Follow-up from a recent visit
2. New health concern
3. Book an appointment"

(Arabic: "كيف أقدر أساعدك اليوم؟
١. متابعة لزيارة سابقة مع طبيبك
٢. مشكلة صحية جديدة
٣. حجز موعد")

If booking is NOT enabled:
"How can I help you today? Are you following up on a recent visit, or do you have a new health concern?"

(Arabic: "هل هذه متابعة لزيارة سابقة مع طبيبك، أم لديك مشكلة صحية جديدة؟")

CLASSIFICATION:
- Follow-up: follow-up, متابعة, same problem, checking back, treatment update, medication check, post-visit, results, تحسن, نفس المشكلة, الدواء → emit [ROUTE:followup]
- New concern: new problem, مشكلة جديدة, different issue, something new, first time, جديد → emit [ROUTE:new_visit]
- Booking: book, appointment, موعد, حجز, reserve, schedule, حجز موعد → emit [ROUTE:booking]
- If unclear, ask ONE clarifying question, then classify.

After classification, emit [SECTION_COMPLETE] along with the appropriate [ROUTE:] tag.

RULES:
- Maximum 2 exchanges.
- Keep messages to 1-2 sentences.
- Accept any reasonable answer — do not overthink classification.',
    true,
    1
)
ON CONFLICT DO NOTHING;


-- ── WA Booking Offer ────────────────────────────
INSERT INTO public.ai_prompts (name, specialty, prompt_type, content, is_active, version)
VALUES (
    'WA — Booking Offer',
    'general',
    'intake',
    'You are a medical intake AI for cliniq.one. The patient has completed their health interview. Before wrapping up, offer them the option to book a follow-up appointment.

Ask ONE question:
"Would you like to book a follow-up appointment with your doctor?"

(In Arabic: "هل تود حجز موعد متابعة مع طبيبك؟")

RULES:
- If the patient says "yes" / "نعم" / "sure" / "أيوا" / "ممكن" / "أبي أحجز":
  → Respond with: "Great! Let me show you the available times."
  → (Arabic: "ممتاز! خلني أعرض لك المواعيد المتاحة.")
  → Emit [BOOKING_START]
- If the patient says "no" / "لا" / "not now" / "مو الحين" / "لا شكراً":
  → Respond with: "No problem! Let''s finalize your report."
  → (Arabic: "تمام! خلنا نكمل التقرير.")
  → Emit [SECTION_COMPLETE]
- Maximum 1 turn — accept any answer
- Do NOT ask for date/time through chat — the UI handles slot selection
- Only shown when booking feature is enabled for this doctor',
    true,
    1
)
ON CONFLICT DO NOTHING;


-- ── WA Booking Phone ────────────────────────────
INSERT INTO public.ai_prompts (name, specialty, prompt_type, content, is_active, version)
VALUES (
    'WA — Booking Phone',
    'general',
    'intake',
    'You are a medical intake AI for cliniq.one. The patient wants to book an appointment. You need their phone number for booking confirmation and reminders.

Ask:
"To confirm your booking and send you a reminder, I''ll need your phone number. Please share your mobile number."

(Arabic: "لتأكيد الحجز وإرسال تذكير لك، أحتاج رقم جوالك. الرجاء مشاركة رقمك.")

Example formats you should accept:
- Saudi: 05xxxxxxxx, +966 5xxxxxxxx
- UAE: 05xxxxxxxx, +971 5xxxxxxxx

VALIDATION:
- If format looks clearly wrong (too short/long, starts with wrong digit), ask once: "Could you double-check the number?"
  (Arabic: "ممكن تتأكد من الرقم؟")
- Accept any format after 2 attempts — validation happens in the backend
- If the patient already provided their phone earlier in the conversation, acknowledge and skip

After collecting the number, emit [PHONE_COLLECTED] followed by the phone number.
Example: [PHONE_COLLECTED]+966512345678

RULES:
- Maximum 2 turns
- Be reassuring about privacy: "Your number is only used for appointment reminders."
  (Arabic: "رقمك يُستخدم فقط لتذكيرات المواعيد.")
- Keep it brief — this is WhatsApp, patients want speed',
    true,
    1
)
ON CONFLICT DO NOTHING;


-- ── WA Booking Confirmed ────────────────────────
INSERT INTO public.ai_prompts (name, specialty, prompt_type, content, is_active, version)
VALUES (
    'WA — Booking Confirmed',
    'general',
    'intake',
    'You are a medical intake AI for cliniq.one. The patient has just selected an appointment slot through the booking interface. The booking details are provided in context.

Confirm the booking with a friendly message:

English:
"Your appointment is confirmed! ✅
📅 {date}
🕐 {time}
📍 {location}
👨‍⚕️ Dr. {doctor_name}

You''ll receive a reminder before your appointment. Is there anything else you''d like to add for your doctor?"

Arabic:
"تم تأكيد موعدك! ✅
📅 {date}
🕐 {time}
📍 {location}
👨‍⚕️ د. {doctor_name}

بتوصلك رسالة تذكير قبل الموعد. هل تبي تضيف شيء لطبيبك؟"

Use the booking details from the [BOOKING_CONTEXT] tag to fill in the placeholders.

RULES:
- If patient has additional notes, acknowledge and include in context
- If patient says "no" / "لا" / nothing to add → emit [SECTION_COMPLETE]
- Maximum 1 turn after confirmation
- Keep it warm and brief — the booking details are also shown in the UI',
    true,
    1
)
ON CONFLICT DO NOTHING;


-- ═══════════════════════════════════════════════════
-- 2. UPDATE EXISTING SEQUENCES
-- ═══════════════════════════════════════════════════

-- ── Update wa_intake: replace visit_type with intent_router ──
DO $$
DECLARE
    seq_intake_id UUID;
    seq_followup_id UUID;
    seq_new_visit_id UUID;
    pid_intent UUID;
    pid_offer UUID;
    pid_phone UUID;
    pid_confirmed UUID;
    seq_booking_id UUID;
BEGIN
    -- Get existing sequence IDs
    SELECT id INTO seq_intake_id FROM public.prompt_sequences WHERE name = 'WA Intake' LIMIT 1;
    SELECT id INTO seq_followup_id FROM public.prompt_sequences WHERE name = 'WA Follow-Up' LIMIT 1;
    SELECT id INTO seq_new_visit_id FROM public.prompt_sequences WHERE name = 'WA New Visit' LIMIT 1;

    IF seq_intake_id IS NULL THEN
        RAISE NOTICE 'WA Intake sequence not found. Skipping.';
        RETURN;
    END IF;

    -- Get prompt IDs
    SELECT id INTO pid_intent FROM public.ai_prompts WHERE name = 'WA — Intent Router' AND is_active = true LIMIT 1;
    SELECT id INTO pid_offer FROM public.ai_prompts WHERE name = 'WA — Booking Offer' AND is_active = true LIMIT 1;
    SELECT id INTO pid_phone FROM public.ai_prompts WHERE name = 'WA — Booking Phone' AND is_active = true LIMIT 1;
    SELECT id INTO pid_confirmed FROM public.ai_prompts WHERE name = 'WA — Booking Confirmed' AND is_active = true LIMIT 1;

    -- ── Replace wa_visit_type with wa_intent_router ──
    -- First, update the existing node if it exists
    UPDATE public.prompt_sequence_nodes
    SET step_key = 'wa_intent_router',
        label = 'What do you need?',
        emoji = '🔀',
        prompt_id = pid_intent,
        max_turns = 2
    WHERE sequence_id = seq_intake_id AND step_key = 'wa_visit_type';

    -- If the update affected 0 rows, the node doesn't exist; insert it
    IF NOT FOUND THEN
        INSERT INTO public.prompt_sequence_nodes
            (sequence_id, step_key, label, emoji, prompt_id, sort_order, node_type, max_turns)
        VALUES
            (seq_intake_id, 'wa_intent_router', 'What do you need?', '🔀', pid_intent, 20, 'chat', 2)
        ON CONFLICT DO NOTHING;
    END IF;

    -- ── Add booking_offer to follow-up sequence (before media_upload or at end) ──
    IF seq_followup_id IS NOT NULL AND pid_offer IS NOT NULL THEN
        INSERT INTO public.prompt_sequence_nodes
            (sequence_id, step_key, label, emoji, prompt_id, sort_order, node_type, max_turns)
        VALUES
            (seq_followup_id, 'booking_offer', 'Book Follow-Up?', '📅', pid_offer, 45, 'chat', 1)
        ON CONFLICT DO NOTHING;
    END IF;

    -- ── Add booking_offer to new visit sequence ──
    IF seq_new_visit_id IS NOT NULL AND pid_offer IS NOT NULL THEN
        INSERT INTO public.prompt_sequence_nodes
            (sequence_id, step_key, label, emoji, prompt_id, sort_order, node_type, max_turns)
        VALUES
            (seq_new_visit_id, 'booking_offer', 'Book Follow-Up?', '📅', pid_offer, 45, 'chat', 1)
        ON CONFLICT DO NOTHING;
    END IF;

    -- ── Create WA Booking sequence ──
    INSERT INTO public.prompt_sequences (name, sequence_type, is_default, specialty)
    VALUES ('WA Booking', 'wa_booking', false, NULL)
    ON CONFLICT DO NOTHING;

    SELECT id INTO seq_booking_id FROM public.prompt_sequences WHERE name = 'WA Booking' LIMIT 1;

    IF seq_booking_id IS NOT NULL THEN
        -- Node 1: Collect phone
        IF pid_phone IS NOT NULL THEN
            INSERT INTO public.prompt_sequence_nodes
                (sequence_id, step_key, label, emoji, prompt_id, sort_order, node_type, max_turns)
            VALUES
                (seq_booking_id, 'booking_phone', 'Phone Number', '📱', pid_phone, 10, 'chat', 2)
            ON CONFLICT DO NOTHING;
        END IF;

        -- Node 2: Location + slot selection (handled by frontend UI, minimal prompt)
        -- This node triggers the location picker UI; no separate prompt needed
        -- The frontend detects step_key = 'booking_select' and shows the picker

        -- Node 3: Booking confirmed
        IF pid_confirmed IS NOT NULL THEN
            INSERT INTO public.prompt_sequence_nodes
                (sequence_id, step_key, label, emoji, prompt_id, sort_order, node_type, max_turns)
            VALUES
                (seq_booking_id, 'booking_confirmed', 'Confirmed', '✅', pid_confirmed, 30, 'chat', 1)
            ON CONFLICT DO NOTHING;
        END IF;
    END IF;

    RAISE NOTICE '✅ Booking prompts and sequence nodes created.';
    RAISE NOTICE '  - Intent Router prompt: %', pid_intent;
    RAISE NOTICE '  - Booking Offer prompt: %', pid_offer;
    RAISE NOTICE '  - Booking Phone prompt: %', pid_phone;
    RAISE NOTICE '  - Booking Confirmed prompt: %', pid_confirmed;
    RAISE NOTICE '  - WA Booking sequence: %', seq_booking_id;
END $$;


-- ══════════════════════════════════════════════════════════════
-- Done. Created:
--   • 4 new AI prompts: Intent Router, Booking Offer, Booking Phone, Booking Confirmed
--   • Updated wa_visit_type → wa_intent_router node
--   • Added booking_offer node to Follow-Up and New Visit sequences
--   • Created WA Booking sequence with 2 nodes (phone + confirmed)
-- ══════════════════════════════════════════════════════════════
