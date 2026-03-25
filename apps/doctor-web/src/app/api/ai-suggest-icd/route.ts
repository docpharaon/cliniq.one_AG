import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

async function getSupabase() {
    const cookieStore = await cookies();
    return createServerClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        {
            cookies: {
                getAll: () => cookieStore.getAll(),
                setAll: (cookiesToSet) => {
                    try {
                        cookiesToSet.forEach(({ name, value, options }) => {
                            cookieStore.set(name, value, options);
                        });
                    } catch { /* server component */ }
                },
            },
        },
    );
}

export async function POST(req: NextRequest) {
    try {
        const supabase = await getSupabase();

        // Auth check
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { consultationId } = await req.json();
        if (!consultationId) {
            return NextResponse.json({ error: 'consultationId is required' }, { status: 400 });
        }

        // 1. Fetch consultation data
        const { data: consultation, error: consultErr } = await supabase
            .from('consultations')
            .select('chief_complaint, specialty, ai_summary, ai_entities')
            .eq('id', consultationId)
            .single();

        if (consultErr || !consultation) {
            return NextResponse.json({ error: 'Consultation not found' }, { status: 404 });
        }

        // 2. Fetch active ICD codes for this specialty
        let icdQuery = supabase
            .from('icd_codes')
            .select('code, description')
            .eq('is_active', true)
            .order('code', { ascending: true });

        if (consultation.specialty) {
            icdQuery = icdQuery.contains('specialty_tags', [consultation.specialty]);
        }

        const { data: icdCodes } = await icdQuery;
        if (!icdCodes || icdCodes.length === 0) {
            return NextResponse.json({ suggestions: [], message: 'No ICD codes available for this specialty' });
        }

        // 3. Build the code list for the prompt
        const codeList = icdCodes.map(c => `${c.code} - ${c.description}`).join('\n');

        // 4. Build clinical context
        const summary = consultation.ai_summary;
        const clinicalContext = [
            `Chief Complaint: ${consultation.chief_complaint || 'Not provided'}`,
            `Specialty: ${consultation.specialty || 'General'}`,
            summary?.summary ? `Clinical Summary: ${summary.summary}` : '',
            summary?.hpi ? `HPI: ${summary.hpi}` : '',
            summary?.assessment ? `Assessment: ${summary.assessment}` : '',
            summary?.preliminaryDiagnosis ? `Preliminary Diagnoses: ${JSON.stringify(summary.preliminaryDiagnosis)}` : '',
            summary?.keyFindings ? `Key Findings: ${summary.keyFindings.join(', ')}` : '',
        ].filter(Boolean).join('\n');

        // 5. Get OpenAI config
        const { data: settings } = await supabase
            .from('platform_settings')
            .select('key, value')
            .in('key', ['openai_api_key', 'openai_model']);

        const settingsMap: Record<string, string> = {};
        (settings || []).forEach((s: { key: string; value: string }) => { settingsMap[s.key] = s.value; });

        const apiKey = settingsMap['openai_api_key'] || process.env.OPENAI_API_KEY || '';
        const model = settingsMap['openai_model'] || 'gpt-4o-mini';

        if (!apiKey) {
            return NextResponse.json({ error: 'OpenAI API key not configured' }, { status: 500 });
        }

        // 6. Call OpenAI
        const systemPrompt = `You are a clinical ICD-10 coding assistant. Given a patient's clinical data and a list of available ICD-10 codes, select the TOP 3 most likely ICD-10 codes.

AVAILABLE ICD-10 CODES:
${codeList}

RULES:
- You MUST only select from the provided list above.
- Return exactly 3 suggestions (or fewer if less than 3 are relevant).
- Rank by clinical likelihood.
- For each suggestion, provide a brief reasoning (1 sentence).
- Respond in JSON: { "suggestions": [{ "code": string, "description": string, "confidence": "high"|"moderate"|"low", "reasoning": string }] }`;

        const aiRes = await fetch('https://api.openai.com/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${apiKey}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                model,
                temperature: 0.2,
                max_tokens: 500,
                response_format: { type: 'json_object' },
                messages: [
                    { role: 'system', content: systemPrompt },
                    { role: 'user', content: clinicalContext },
                ],
            }),
        });

        if (!aiRes.ok) {
            const errText = await aiRes.text();
            console.error('[ai-suggest-icd] OpenAI error:', aiRes.status, errText);
            return NextResponse.json({ error: 'AI service error' }, { status: 502 });
        }

        const aiData = await aiRes.json();
        const content = aiData.choices?.[0]?.message?.content || '{}';

        let parsed;
        try {
            parsed = JSON.parse(content);
        } catch {
            console.error('[ai-suggest-icd] JSON parse error:', content);
            return NextResponse.json({ error: 'Invalid AI response' }, { status: 500 });
        }

        return NextResponse.json({ suggestions: parsed.suggestions || [] });
    } catch (err) {
        console.error('[ai-suggest-icd] Error:', err);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
