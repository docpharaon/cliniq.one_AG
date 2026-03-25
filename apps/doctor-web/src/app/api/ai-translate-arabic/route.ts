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

const DEFAULT_SYSTEM_PROMPT = `You are a professional medical translator. Translate the following English medical text into Modern Standard Arabic (العربية الفصحى).

RULES:
- Use formal, clear Arabic suitable for a patient medical report
- Preserve medical terminology accuracy
- Do not add explanations or notes — output ONLY the Arabic translation
- Maintain the same structure (bullet points, numbered lists, etc.)
- Use Arabic numerals (١٢٣) instead of Western numerals`;

export async function POST(req: NextRequest) {
    try {
        const supabase = await getSupabase();

        // Auth check
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        // Load settings
        const { data: settings } = await supabase
            .from('platform_settings')
            .select('key, value')
            .in('key', [
                'translation_enabled',
                'translation_system_prompt',
                'translation_model',
                'openai_api_key',
                'openai_model',
            ]);

        const settingsMap: Record<string, string> = {};
        (settings || []).forEach((s: { key: string; value: string }) => {
            settingsMap[s.key] = s.value;
        });

        // Check if translation is enabled
        if (settingsMap['translation_enabled'] === 'false') {
            return NextResponse.json(
                { error: 'Arabic translation is currently disabled by the administrator' },
                { status: 403 },
            );
        }

        const apiKey = settingsMap['openai_api_key'] || process.env.OPENAI_API_KEY || '';
        if (!apiKey) {
            return NextResponse.json({ error: 'OpenAI API key not configured' }, { status: 500 });
        }

        const model = settingsMap['translation_model'] || settingsMap['openai_model'] || 'gpt-4o-mini';
        const systemPrompt = settingsMap['translation_system_prompt'] || DEFAULT_SYSTEM_PROMPT;

        const { text, field } = await req.json();
        if (!text || typeof text !== 'string' || !text.trim()) {
            return NextResponse.json({ error: 'Text is required' }, { status: 400 });
        }

        // Add field-specific context to the system prompt
        let contextHint = '';
        switch (field) {
            case 'treatment_plan':
                contextHint = '\n\nContext: This is a medical treatment plan for a patient.';
                break;
            case 'patient_education':
                contextHint = '\n\nContext: This is patient education text. Use a warm, supportive tone while remaining formal.';
                break;
            case 'non_pharmacologic':
                contextHint = '\n\nContext: This is non-pharmacologic treatment advice (lifestyle, home remedies).';
                break;
            case 'follow_up':
                contextHint = '\n\nContext: This is a follow-up recommendation for the patient.';
                break;
            case 'warning_signs':
                contextHint = '\n\nContext: These are medical warning signs. Use clear, urgent language.';
                break;
        }

        // Call OpenAI
        const aiRes = await fetch('https://api.openai.com/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${apiKey}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                model,
                temperature: 0.2,
                max_tokens: 2000,
                messages: [
                    { role: 'system', content: systemPrompt + contextHint },
                    { role: 'user', content: text.trim() },
                ],
            }),
        });

        if (!aiRes.ok) {
            const errText = await aiRes.text();
            console.error('[ai-translate-arabic] OpenAI error:', aiRes.status, errText);
            return NextResponse.json({ error: 'Translation service error' }, { status: 502 });
        }

        const aiData = await aiRes.json();
        const arabic = aiData.choices?.[0]?.message?.content?.trim() || '';

        if (!arabic) {
            return NextResponse.json({ error: 'Empty translation returned' }, { status: 500 });
        }

        return NextResponse.json({ arabic });
    } catch (err) {
        console.error('[ai-translate-arabic] Error:', err);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
