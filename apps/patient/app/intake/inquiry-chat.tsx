import { useState, useRef, useEffect } from 'react';
import { View, Text, ScrollView, TextInput, TouchableOpacity, StyleSheet, ActivityIndicator, KeyboardAvoidingView, Platform, Alert } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors, typography } from '@cliniqone/ui';
import { supabase, submitInquiryResponse } from '@cliniqone/api';
import { chatSection } from '../../services/aiService';

const MAX_TURNS = 7;

export default function InquiryChatScreen() {
    const { inquiryId: rawInquiryId, consultationId } = useLocalSearchParams<{ inquiryId?: string; consultationId?: string }>();

    const [inquiry, setInquiry] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [messages, setMessages] = useState<{ role: string; content: string }[]>([]);
    const [inputText, setInputText] = useState('');
    const [isSending, setIsSending] = useState(false);
    const [isComplete, setIsComplete] = useState(false);
    const [turnCount, setTurnCount] = useState(0);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [resolvedInquiryId, setResolvedInquiryId] = useState<string | undefined>(rawInquiryId);
    const scrollRef = useRef<ScrollView>(null);

    // Load inquiry details
    useEffect(() => {
        (async () => {
            let data: any = null;

            if (rawInquiryId) {
                // Direct inquiry ID lookup
                const { data: d, error } = await supabase
                    .from('doctor_inquiries')
                    .select('*')
                    .eq('id', rawInquiryId)
                    .single();
                if (error || !d) {
                    Alert.alert('Error', 'Could not load inquiry');
                    router.back();
                    return;
                }
                data = d;
            } else if (consultationId) {
                // Find pending inquiry for this consultation
                const { data: d, error } = await supabase
                    .from('doctor_inquiries')
                    .select('*')
                    .eq('consultation_id', consultationId)
                    .eq('status', 'pending')
                    .order('created_at', { ascending: false })
                    .limit(1)
                    .single();
                if (error || !d) {
                    Alert.alert('No Inquiry', 'No pending inquiry found for this consultation.');
                    router.back();
                    return;
                }
                data = d;
                setResolvedInquiryId(d.id);
            } else {
                Alert.alert('Error', 'Missing inquiry or consultation ID');
                router.back();
                return;
            }

            setInquiry(data);
            setLoading(false);

            // Initial AI message presenting the doctor's question
            const doctorQuestion = data.ai_improved_text || data.question_text;
            const initialResponse = await chatSection({
                section: 'doctor_inquiry',
                conversationHistory: [],
                language: 'en',
                patientContext: doctorQuestion,
            });

            setMessages([{ role: 'assistant', content: initialResponse.response }]);
        })();
    }, [rawInquiryId, consultationId]);

    const handleSend = async () => {
        if (!inputText.trim() || isSending || isComplete) return;

        const userMessage = inputText.trim();
        setInputText('');
        const newTurnCount = turnCount + 1;
        setTurnCount(newTurnCount);

        const updatedMessages = [...messages, { role: 'user', content: userMessage }];
        setMessages(updatedMessages);
        setIsSending(true);

        try {
            const doctorQuestion = inquiry?.ai_improved_text || inquiry?.question_text || '';

            const response = await chatSection({
                section: 'doctor_inquiry',
                conversationHistory: updatedMessages,
                language: 'en',
                patientContext: doctorQuestion,
            });

            const aiMessages = [...updatedMessages, { role: 'assistant', content: response.response }];
            setMessages(aiMessages);

            // Check if done (AI signals or max turns reached)
            if (response.sectionComplete || newTurnCount >= MAX_TURNS) {
                setIsComplete(true);
            }
        } catch (err: any) {
            setMessages([...updatedMessages, {
                role: 'assistant',
                content: 'I apologize, I had trouble processing that. Could you please try again?',
            }]);
        } finally {
            setIsSending(false);
            setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 100);
        }
    };

    const handleSubmitToDoctor = async () => {
        if (!resolvedInquiryId || isSubmitting) return;
        setIsSubmitting(true);

        try {
            // Build summary from conversation
            const patientAnswers = messages.filter(m => m.role === 'user').map(m => m.content);
            const summary = {
                summary: patientAnswers.join(' | '),
                answers: patientAnswers,
                turnCount,
                completedAt: new Date().toISOString(),
            };

            await submitInquiryResponse({
                inquiryId: resolvedInquiryId,
                responseSummary: summary,
                chatHistory: messages,
                turnCount,
            });

            Alert.alert(
                '✅ Submitted!',
                'Your responses have been sent back to your doctor. They will review your answers shortly.',
                [{ text: 'OK', onPress: () => router.dismissAll() }],
            );
        } catch (err: any) {
            Alert.alert('Error', err.message || 'Failed to submit. Please try again.');
        } finally {
            setIsSubmitting(false);
        }
    };

    if (loading) {
        return (
            <SafeAreaView style={styles.container}>
                <View style={styles.centered}>
                    <ActivityIndicator size="large" color={colors.accentTeal} />
                    <Text style={styles.loadingText}>Loading inquiry...</Text>
                </View>
            </SafeAreaView>
        );
    }

    return (
        <SafeAreaView style={styles.container}>
            {/* Header */}
            <View style={styles.header}>
                <TouchableOpacity onPress={() => router.back()}>
                    <Text style={styles.backBtn}>← Back</Text>
                </TouchableOpacity>
                <Text style={styles.headerTitle}>🩺 Doctor's Question</Text>
                <Text style={styles.turnBadge}>{turnCount}/{MAX_TURNS}</Text>
            </View>

            {/* Progress bar */}
            <View style={styles.progressContainer}>
                <View style={[styles.progressBar, { width: `${(turnCount / MAX_TURNS) * 100}%` }]} />
            </View>

            <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
                {/* Messages */}
                <ScrollView
                    ref={scrollRef}
                    style={styles.messagesContainer}
                    contentContainerStyle={{ paddingBottom: 20 }}
                    onContentSizeChange={() => scrollRef.current?.scrollToEnd({ animated: true })}
                >
                    {messages.map((msg, i) => (
                        <View
                            key={i}
                            style={[
                                styles.messageBubble,
                                msg.role === 'user' ? styles.userBubble : styles.aiBubble,
                            ]}
                        >
                            <Text style={[
                                styles.messageText,
                                msg.role === 'user' ? styles.userText : styles.aiText,
                            ]}>
                                {msg.content}
                            </Text>
                        </View>
                    ))}

                    {isSending && (
                        <View style={[styles.messageBubble, styles.aiBubble]}>
                            <ActivityIndicator color={colors.accentTeal} size="small" />
                        </View>
                    )}

                    {/* Submit button when complete */}
                    {isComplete && (
                        <View style={styles.completionCard}>
                            <Text style={styles.completionTitle}>✅ Information Gathered</Text>
                            <Text style={styles.completionSubtitle}>
                                Thank you for answering. Tap below to send your responses to your doctor.
                            </Text>
                            <TouchableOpacity
                                style={styles.submitButton}
                                onPress={handleSubmitToDoctor}
                                disabled={isSubmitting}
                            >
                                {isSubmitting ? (
                                    <ActivityIndicator color={colors.bgPrimary} />
                                ) : (
                                    <Text style={styles.submitText}>📤 Submit to Doctor</Text>
                                )}
                            </TouchableOpacity>
                        </View>
                    )}
                </ScrollView>

                {/* Input bar */}
                {!isComplete && (
                    <View style={styles.inputBar}>
                        <TextInput
                            style={styles.input}
                            value={inputText}
                            onChangeText={setInputText}
                            placeholder="Type your answer..."
                            placeholderTextColor={colors.textTertiary}
                            multiline
                            editable={!isSending}
                        />
                        <TouchableOpacity
                            style={[styles.sendBtn, (!inputText.trim() || isSending) && styles.sendBtnDisabled]}
                            onPress={handleSend}
                            disabled={!inputText.trim() || isSending}
                        >
                            <Text style={styles.sendBtnText}>➤</Text>
                        </TouchableOpacity>
                    </View>
                )}
            </KeyboardAvoidingView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.bgPrimary },
    centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    loadingText: { ...typography.body, color: colors.textTertiary, marginTop: 12 },
    header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: colors.border },
    backBtn: { ...typography.body, color: colors.accentTeal },
    headerTitle: { ...typography.h3, color: colors.textPrimary, fontSize: 16 },
    turnBadge: { ...typography.caption, color: colors.warning, backgroundColor: colors.warningFaded, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8, fontWeight: '700' },
    progressContainer: { height: 3, backgroundColor: colors.bgTertiary },
    progressBar: { height: '100%', backgroundColor: colors.accentTeal, borderRadius: 3 },
    messagesContainer: { flex: 1, paddingHorizontal: 16, paddingTop: 16 },
    messageBubble: { maxWidth: '85%', padding: 14, borderRadius: 18, marginBottom: 10 },
    userBubble: { alignSelf: 'flex-end', backgroundColor: colors.accentTeal, borderBottomRightRadius: 4 },
    aiBubble: { alignSelf: 'flex-start', backgroundColor: colors.bgSecondary, borderBottomLeftRadius: 4, borderWidth: 1, borderColor: colors.border },
    messageText: { ...typography.body, lineHeight: 22 },
    userText: { color: colors.bgPrimary },
    aiText: { color: colors.textPrimary },
    completionCard: { backgroundColor: colors.bgSecondary, borderRadius: 16, padding: 20, marginTop: 8, borderWidth: 1, borderColor: colors.border, alignItems: 'center' },
    completionTitle: { ...typography.h3, color: colors.success, marginBottom: 8 },
    completionSubtitle: { ...typography.body, color: colors.textSecondary, textAlign: 'center', marginBottom: 16, lineHeight: 22 },
    submitButton: { backgroundColor: colors.accentTeal, borderRadius: 14, paddingVertical: 14, paddingHorizontal: 32, alignItems: 'center', width: '100%' },
    submitText: { ...typography.button, color: colors.bgPrimary, fontWeight: '700', fontSize: 15 },
    inputBar: { flexDirection: 'row', alignItems: 'flex-end', paddingHorizontal: 12, paddingVertical: 10, borderTopWidth: 1, borderTopColor: colors.border, backgroundColor: colors.bgSecondary },
    input: { flex: 1, backgroundColor: colors.bgTertiary, borderRadius: 20, paddingHorizontal: 16, paddingVertical: 10, color: colors.textPrimary, ...typography.body, maxHeight: 100, borderWidth: 1, borderColor: colors.border },
    sendBtn: { width: 44, height: 44, borderRadius: 22, backgroundColor: colors.accentTeal, justifyContent: 'center', alignItems: 'center', marginLeft: 8 },
    sendBtnDisabled: { opacity: 0.4 },
    sendBtnText: { fontSize: 20, color: colors.bgPrimary },
});
