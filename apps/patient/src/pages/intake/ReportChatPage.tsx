import { useState, useRef, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { supabase } from '@cliniqone/api';
import { t } from '@cliniqone/i18n';
import { useAuthStore } from '../../stores/authStore';
import { BackButton } from '../../components/BackButton';

export default function ReportChatPage() {
    const [searchParams] = useSearchParams();
    const consultationId = searchParams.get('consultationId') || '';
    const { user } = useAuthStore();
    const [messages, setMessages] = useState<any[]>([]);
    const [input, setInput] = useState('');
    const [sending, setSending] = useState(false);
    const chatEndRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (!consultationId) return;
        loadMessages();
        const channel = supabase.channel(`report_chat_${consultationId}`)
            .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages', filter: `consultation_id=eq.${consultationId}` },
                (payload) => setMessages(prev => [...prev, payload.new]))
            .subscribe();
        return () => { channel.unsubscribe(); };
    }, [consultationId]);

    useEffect(() => { chatEndRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages]);

    async function loadMessages() {
        const { data } = await supabase.from('messages').select('*').eq('consultation_id', consultationId).order('created_at', { ascending: true });
        setMessages(data || []);
    }

    async function handleSend() {
        if (!input.trim() || sending) return;
        setSending(true);
        await supabase.from('messages').insert({ consultation_id: consultationId, sender_id: user?.id, sender_role: 'patient', content: input.trim(), context: 'report_followup' });
        setInput('');
        setSending(false);
    }

    return (
        <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', backgroundColor: 'var(--bg-primary)' }}>
            <div style={{ padding: '12px 20px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: 12, flexShrink: 0 }}>
                <BackButton />
                <div>
                    <p style={{ fontSize: 15, fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>Report Follow-up</p>
                    <p style={{ fontSize: 11, color: 'var(--text-tertiary)', margin: 0 }}>Ask questions about your report</p>
                </div>
            </div>

            <div style={{ flex: 1, overflowY: 'auto', padding: '16px 20px' }}>
                {messages.map((msg: any) => (
                    <div key={msg.id} style={{ display: 'flex', justifyContent: msg.sender_role === 'patient' ? 'flex-end' : 'flex-start', marginBottom: 10 }}>
                        <div style={{
                            maxWidth: '80%', padding: '10px 14px',
                            borderRadius: msg.sender_role === 'patient' ? '14px 14px 4px 14px' : '14px 14px 14px 4px',
                            backgroundColor: msg.sender_role === 'patient' ? '#1A8A9E' : 'var(--bg-card)',
                            color: msg.sender_role === 'patient' ? '#fff' : 'var(--text-primary)', fontSize: 14, lineHeight: '20px',
                        }}>
                            <p style={{ margin: 0, whiteSpace: 'pre-wrap' }}>{msg.content}</p>
                        </div>
                    </div>
                ))}
                <div ref={chatEndRef} />
            </div>

            <div style={{ padding: '12px 20px', borderTop: '1px solid var(--border)', display: 'flex', gap: 10, flexShrink: 0 }}>
                <input value={input} onChange={e => setInput(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleSend()}
                    placeholder="Ask about your report…"
                    style={{ flex: 1, padding: '12px 16px', borderRadius: 12, border: '1px solid var(--border)', backgroundColor: 'var(--bg-card)', color: 'var(--text-primary)', fontSize: 15, outline: 'none' }} />
                <button onClick={handleSend} disabled={sending || !input.trim()}
                    style={{ padding: '12px 20px', borderRadius: 12, border: 'none', backgroundColor: input.trim() ? '#1A8A9E' : '#334155', color: '#fff', fontSize: 15, fontWeight: 700, cursor: 'pointer' }}>↑</button>
            </div>
        </div>
    );
}
