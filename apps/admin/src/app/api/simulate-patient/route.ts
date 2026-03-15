import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

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
            model: modelRes.data?.value || 'gpt-4o-mini',
            temperature: tempRes.data?.value ? parseFloat(tempRes.data.value) : 0.7,
        };
    } catch {
        return { model: 'gpt-4o-mini', temperature: 0.7 };
    }
}

export async function POST(req: NextRequest) {
    try {
        const { messages, profileSystemPrompt } = await req.json();

        if (!profileSystemPrompt) {
            return NextResponse.json({ error: 'Missing profileSystemPrompt' }, { status: 400 });
        }

        const apiKey = await getOpenAIKey();
        if (!apiKey) {
            return NextResponse.json({ error: 'No OpenAI API key configured' }, { status: 500 });
        }

        const { model, temperature } = await getModelConfig();

        // Build messages for the patient simulator:
        // The AI doctor's messages become "user" role (the doctor asking questions)
        // The patient's messages become "assistant" role (what the patient said before)
        const simMessages = [
            { role: 'system', content: profileSystemPrompt },
            ...(messages || []).map((m: { role: string; content: string }) => ({
                role: m.role === 'assistant' ? 'user' : m.role === 'user' ? 'assistant' : m.role,
                content: m.content,
            })),
        ];

        const res = await fetch('https://api.openai.com/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${apiKey}`,
            },
            body: JSON.stringify({
                model,
                temperature: Math.min(temperature + 0.2, 1.0), // slightly more creative for patient replies
                max_tokens: 200, // patient replies should be short
                messages: simMessages,
            }),
        });

        if (!res.ok) {
            const err = await res.json().catch(() => ({ error: { message: 'Unknown error' } }));
            return NextResponse.json(
                { error: err.error?.message || `OpenAI ${res.status}` },
                { status: res.status },
            );
        }

        const data = await res.json();
        const reply = data.choices?.[0]?.message?.content?.trim() || 'I\'m not sure what to say.';

        return NextResponse.json({ reply });
    } catch (err) {
        return NextResponse.json(
            { error: err instanceof Error ? err.message : 'Internal error' },
            { status: 500 },
        );
    }
}
