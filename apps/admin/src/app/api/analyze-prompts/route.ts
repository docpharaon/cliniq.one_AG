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

async function getModelConfig(): Promise<{ model: string }> {
    try {
        const { data } = await supabase
            .from('platform_settings')
            .select('value')
            .eq('key', 'openai_model')
            .single();
        return { model: data?.value || 'gpt-4o-mini' };
    } catch {
        return { model: 'gpt-4o-mini' };
    }
}

const ANALYSIS_SYSTEM_PROMPT = `You are a senior prompt engineering consultant specializing in medical AI chatbots for intake interviews.

You are analyzing a test run of an AI chatbot sequence. The report contains:
- Each section of the interview sequence with its prompt content and the actual conversation
- Metadata about which prompts were used and how many turns each section took
- Debug data (when available): token usage, latency, guard events, and prompt resolution details

Your job is to provide specific, actionable feedback. Assess:
1. **Prompt Quality**: Is each prompt clear, focused, and well-structured?
2. **Conversation Flow**: Did the AI ask good questions? Did it get stuck or repeat itself?
3. **Information Gathering**: Was the AI efficient at collecting medical information?
4. **Patient Experience**: Would a real patient find this natural and comfortable?
5. **Transition Smoothness**: Are the handoffs between sections clean?
6. **Performance**: If debug data is present, note any sections with high latency or excessive token usage
7. **Guard Events**: If guards were triggered (first-turn-guard, empty-response-retry, max-turn-force), explain what they mean and if the underlying prompt needs fixing

Return your analysis as a JSON object with this EXACT structure (no markdown, pure JSON):
{
    "overallScore": <1-10 integer>,
    "overallNotes": "<2-3 sentence summary of the test run quality>",
    "promptSuggestions": [
        {
            "nodeLabel": "<section label, e.g. Present Illness>",
            "promptId": "<the prompt ID>",
            "currentIssues": ["<issue 1>", "<issue 2>"],
            "suggestedContent": "<the complete improved prompt text>",
            "reasoning": "<why this change improves the prompt>"
        }
    ],
    "sequenceSuggestions": [
        "<suggestion about sequence structure>"
    ]
}

Rules:
- Only include entries in promptSuggestions for prompts that actually need improvement
- suggestedContent must be a COMPLETE replacement prompt, not a diff
- Keep suggestions practical and specific to medical intake workflows
- If a section performed well, don't suggest changes just for the sake of it
- sequenceSuggestions should address structural issues (missing sections, wrong order, etc.)`;

export async function POST(req: NextRequest) {
    try {
        const { report, guidance } = await req.json();

        if (!report) {
            return NextResponse.json({ error: 'Missing report data' }, { status: 400 });
        }

        const apiKey = await getOpenAIKey();
        if (!apiKey) {
            return NextResponse.json({ error: 'No OpenAI API key configured' }, { status: 500 });
        }

        const { model } = await getModelConfig();

        // Build a concise text representation of the report for analysis
        let reportText = `# Test Report\n`;
        reportText += `Profile: ${report.profileLabel}\n`;
        reportText += `Sequence: ${report.sequenceName}\n`;
        reportText += `Total sections: ${report.sections?.length || 0}\n`;
        reportText += `Completed: ${report.completed ? 'Yes' : 'No'}\n\n`;

        for (const section of (report.sections || [])) {
            reportText += `## ${section.emoji} ${section.label}\n`;
            reportText += `Prompt: ${section.promptName || 'None'} (ID: ${section.promptId || 'N/A'})\n`;
            reportText += `Turns: ${section.turnCount}\n`;
            reportText += `Status: ${section.completed ? 'Complete' : 'Incomplete'}\n\n`;

            if (section.promptContent) {
                reportText += `### Prompt Content:\n${section.promptContent}\n\n`;
            }

            // Include debug data if available
            if (section.debugData) {
                reportText += `### Debug Info:\n`;
                reportText += `Model: ${section.debugData.model} | Source: ${section.debugData.promptSource}\n`;
                reportText += `Tokens: ${section.debugData.totalTokens} | Latency: ${section.debugData.totalLatencyMs}ms\n`;
                reportText += `AI Turns: ${section.debugData.aiTurns}${section.debugData.maxTurns ? '/' + section.debugData.maxTurns : ''}\n`;
                if (section.debugData.guardsTriggered.length > 0) {
                    reportText += `⚠️ Guards Triggered: ${section.debugData.guardsTriggered.join(', ')}\n`;
                }
                reportText += `\n`;
            }

            reportText += `### Conversation:\n`;
            for (const msg of (section.messages || [])) {
                const role = msg.role === 'ai' ? 'AI' : msg.role === 'user' ? 'Patient' : 'System';
                reportText += `[${role}]: ${msg.content}\n`;
            }
            reportText += `\n---\n\n`;
        }

        const res = await fetch('https://api.openai.com/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${apiKey}`,
            },
            body: JSON.stringify({
                model,
                temperature: 0.3,
                max_tokens: 4000,
                response_format: { type: 'json_object' },
                messages: [
                    { role: 'system', content: ANALYSIS_SYSTEM_PROMPT },
                    { role: 'user', content: reportText + (guidance ? `\n\n# Administrator Instructions\nThe administrator has provided the following specific guidance for this analysis. Prioritize these instructions when crafting your suggestions:\n${guidance}\n` : '') },
                ],
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
        const content = data.choices?.[0]?.message?.content || '{}';

        try {
            const analysis = JSON.parse(content);
            return NextResponse.json({ analysis });
        } catch {
            return NextResponse.json({ error: 'Failed to parse AI response', raw: content }, { status: 500 });
        }
    } catch (err) {
        return NextResponse.json(
            { error: err instanceof Error ? err.message : 'Internal error' },
            { status: 500 },
        );
    }
}
