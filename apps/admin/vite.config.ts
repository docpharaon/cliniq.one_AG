import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import path from 'path';

export default defineConfig(({ mode }) => {
    const env = loadEnv(mode, path.resolve(__dirname), ['VITE_', 'SUPABASE_']);

    return {
        plugins: [
            react(),
            tailwindcss(),
            // ── Server-side proxy plugin for /api/chat-test ──
            // Routes admin chat-test requests through the Vite dev server.
            // Proxies to the deployed ai-intake edge function using raw fetch
            // with the service role key for authentication.
            {
                name: 'chat-test-proxy',
                configureServer(server) {
                    server.middlewares.use('/api/chat-test', async (req, res) => {
                        if (req.method === 'OPTIONS') {
                            res.writeHead(204, {
                                'Access-Control-Allow-Origin': '*',
                                'Access-Control-Allow-Methods': 'POST, OPTIONS',
                                'Access-Control-Allow-Headers': 'Content-Type',
                            });
                            res.end();
                            return;
                        }
                        if (req.method !== 'POST') {
                            res.writeHead(405, { 'Content-Type': 'application/json' });
                            res.end(JSON.stringify({ error: 'Method not allowed' }));
                            return;
                        }

                        // Read body
                        let body = '';
                        for await (const chunk of req) body += chunk;

                        const supabaseUrl = env.VITE_SUPABASE_URL || '';
                        const anonKey = env.VITE_SUPABASE_ANON_KEY || '';
                        const serviceKey = env.VITE_SUPABASE_SERVICE_ROLE_KEY
                            || env.SUPABASE_SERVICE_ROLE_KEY || '';

                        try {
                            const parsed = JSON.parse(body);

                            // Forward to deployed ai-intake edge function.
                            // Use anon key for gateway identification (apikey header)
                            // and service role key for auth (bearer) + admin bypass (x-admin-key).
                            const targetUrl = `${supabaseUrl}/functions/v1/ai-intake`;
                            console.log('[chat-test-proxy] POST', targetUrl);

                            const response = await fetch(targetUrl, {
                                method: 'POST',
                                headers: {
                                    'Content-Type': 'application/json',
                                    'apikey': anonKey,
                                    'Authorization': `Bearer ${serviceKey}`,
                                    'x-admin-key': serviceKey,
                                },
                                body: JSON.stringify({
                                    action: 'chat-section',
                                    section: parsed.section || 'greeting',
                                    promptId: parsed.promptId,
                                    language: parsed.language || 'en',
                                    mode: parsed.mode || 'active',
                                    conversationHistory: parsed.conversationHistory || [],
                                    patientContext: parsed.patientContext,
                                    maxTokens: parsed.maxTokens || 1000,
                                }),
                            });

                            const data = await response.text();
                            console.log(`[chat-test-proxy] Response status: ${response.status}`);
                            console.log(`[chat-test-proxy] Response body: ${data.substring(0, 300)}`);

                            res.writeHead(response.status, {
                                'Content-Type': response.headers.get('content-type') || 'application/json',
                                'Access-Control-Allow-Origin': '*',
                            });
                            res.end(data);
                        } catch (err: any) {
                            console.error('[chat-test-proxy] Error:', err.message);
                            res.writeHead(500, { 'Content-Type': 'application/json' });
                            res.end(JSON.stringify({ error: err.message }));
                        }
                    });
                },
            },
        ],
        define: {
            'process.env': {},
        },
        resolve: {
            alias: {
                '@': path.resolve(__dirname, 'src'),
                '@cliniqone/types': path.resolve(__dirname, '../../packages/types/src'),
                '@cliniqone/config': path.resolve(__dirname, '../../packages/config/src'),
                '@cliniqone/ui': path.resolve(__dirname, '../../packages/ui/src'),
            },
        },
        build: {
            outDir: 'dist',
            sourcemap: false,
        },
        server: {
            port: 3001,
        },
    };
});
