import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const DEFAULT_MODEL = 'gpt-4o-mini';
const DEFAULT_TEMPERATURE = 0.3;

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function getOpenAIKey(): Promise<string> {
    try {
        const { data } = await supabase
            .from('platform_settings')
            .select('value')
            .eq('key', 'openai_api_key')
            .single();
        if (data?.value) return data.value;
    } catch { /* fallback */ }
    return process.env.OPENAI_API_KEY || '';
}

async function getModelConfig(): Promise<{ model: string; temperature: number }> {
    try {
        const [modelRes, tempRes] = await Promise.all([
            supabase.from('platform_settings').select('value').eq('key', 'openai_model').single(),
            supabase.from('platform_settings').select('value').eq('key', 'openai_temperature').single(),
        ]);
        return {
            model: modelRes.data?.value || DEFAULT_MODEL,
            temperature: tempRes.data?.value ? parseFloat(tempRes.data.value) : DEFAULT_TEMPERATURE,
        };
    } catch {
        return { model: DEFAULT_MODEL, temperature: DEFAULT_TEMPERATURE };
    }
}

const META_PROMPT = `You are an expert prompt engineer and medical AI specialist. Your task is to improve the given AI prompt while preserving its original intent and structure.

Apply these improvements:
1. **Grammar & spelling**: Fix any grammatical errors, typos, or awkward phrasing
2. **Clarity**: Make instructions clearer and more precise
3. **Structure**: Improve formatting, bullet points, and section organization
4. **Medical accuracy**: Ensure medical terminology is used correctly
5. **Consistency**: Standardize tone and instruction style

Rules:
- Do NOT change the fundamental purpose or behavior of the prompt
- Do NOT add major new sections or remove existing ones
- Do NOT change placeholder variables like {section}, {patient_name}, etc.
- Keep the same approximate length (minor additions/removals are fine)
- Return ONLY the improved prompt text — no explanations, no markdown code fences, no preamble`;

export async function POST(req: NextRequest) {
    try {
        const { content, promptType } = await req.json();

        if (!content?.trim()) {
            return NextResponse.json({ error: 'No prompt content provided' }, { status: 400 });
        }

        const [OPENAI_API_KEY, modelConfig] = await Promise.all([
            getOpenAIKey(),
            getModelConfig(),
        ]);

        if (!OPENAI_API_KEY) {
            return NextResponse.json(
                { error: 'OpenAI API key not configured. Set it in API Key settings.' },
                { status: 500 },
            );
        }

        const res = await fetch('https://api.openai.com/v1/chat/completions', {
            method: 'POST',
            headers: {
                Authorization: `Bearer ${OPENAI_API_KEY}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                model: modelConfig.model,
                temperature: 0.2, // Low temperature for precise improvements
                max_tokens: 4000,
                messages: [
                    { role: 'system', content: META_PROMPT },
                    {
                        role: 'user',
                        content: `Prompt type: ${promptType || 'system'}\n\n--- PROMPT TO IMPROVE ---\n${content}\n--- END ---`,
                    },
                ],
            }),
        });

        if (!res.ok) {
            const err = await res.text();
            console.error('OpenAI error:', err);
            return NextResponse.json({ error: `OpenAI error: ${res.status}` }, { status: 502 });
        }

        const data = await res.json();
        const improved = data.choices?.[0]?.message?.content?.trim() || '';

        return NextResponse.json({ improved });
    } catch (err) {
        console.error('Improve prompt error:', err);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
