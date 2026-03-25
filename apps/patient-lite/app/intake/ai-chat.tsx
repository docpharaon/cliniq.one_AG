import { useState, useRef, useEffect, useCallback } from 'react';
import {
    View, Text, ScrollView, StyleSheet, TouchableOpacity,
    TextInput, KeyboardAvoidingView, Platform, Animated,
    ActivityIndicator, Pressable, Image,
} from 'react-native';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors, spacing, typography, radius } from '@cliniqone/ui';
import { t, getLocale } from '@cliniqone/i18n';
import { useIntakeStore, ChatMessage, buildSnapshot } from '../../stores/intakeStore';
import { useAuthStore } from '../../stores/authStore';
import {
    fetchDefaultSequence, chatSection, analyzeQA,
    checkChatbotEnabled, fetchProtocolConfig, logProtocolEvent,
    fetchChatbotVersion,
    SequenceNode, INTERVIEW_SECTIONS, SectionId,
    AITimeoutError, ChatSectionResult,
} from '../../services/aiService';
import { detectProtocols, EMERGENCY_NUMBERS, getEscalationLevel, getEscalationMessage, getEscalationColor, getCooldownMs, setProtocolConfig } from '../../services/protocolDetection';
import { saveIntakeSession, getActiveIntakeSession, deleteIntakeSession } from '@cliniqone/api';
import { SkinPhotoCapture } from '../../components/SkinPhotoCapture';
import { DisclaimerBanner } from '../../components/DisclaimerBanner';
import { Button } from '@cliniqone/ui';

// eslint-disable-next-line @typescript-eslint/no-var-requires
const AI_DOCTOR_AVATAR = require('../../assets/ai-doctor-avatar.jpg');

// ── Unique ID helper ────────────────────────────
let msgCounter = 0;
function uid() {
    return `msg_${Date.now()}_${++msgCounter}`;
}

// ── Arabic (Gulf) node labels for section badges ──
const NODE_LABELS_AR_SA: Record<string, string> = {
    greeting: 'الترحيب',
    pathway: 'تحديد المسار',
    hpi: '📋 تفاصيل الحالة الحالية',
    pmh: '🏥 التاريخ المرضي السابق',
    medications: '💊 الأدوية الحالية',
    allergies: '⚠️ الحساسية',
    family_history: '👨‍👩‍👧‍👦 التاريخ المرضي للعائلة',
    social_history: '🏠 نمط الحياة',
    review_of_systems: '🔍 مراجعة الأعراض',
    physical_exam: '🩺 الفحص السريري',
    skin_photo: '📸 صورة الحالة',
    photo_capture: '📸 صورة الحالة',
    summary: '📝 ملخص الحالة',
    patient_addendum: '📝 مراجعة أخيرة',
};

/** Get the localized label for a sequence node */
function getNodeLabel(node: SequenceNode): string {
    if (getLocale() === 'ar' && NODE_LABELS_AR_SA[node.step_key]) {
        return NODE_LABELS_AR_SA[node.step_key];
    }
    return `${node.emoji} ${node.label}`;
}

/** Strip internal AI control tags before displaying to patient */
function stripInternalTags(text: string): string {
    return text
        .replace(/\[ROUTE:\w+\]/gi, '')
        .replace(/\[PATHWAY:\w+\]/gi, '')
        .replace(/\[SECTION_COMPLETE\]/gi, '')
        .replace(/\[NO_RESPONSE_NEEDED\]/gi, '')
        .trim();
}

/**
 * Extract patient answers that belong to a specific section from the messages array.
 * Uses sectionLabel on system messages to determine section boundaries.
 */
function extractSectionAnswers(msgs: ChatMessage[], sectionKeywords: string[]): string[] {
    const answers: string[] = [];
    let inTargetSection = false;

    for (const msg of msgs) {
        // Detect section transitions
        if (msg.role === 'system' && msg.sectionLabel) {
            const label = msg.sectionLabel.toLowerCase();
            inTargetSection = sectionKeywords.some((kw) => label.includes(kw));
            continue;
        }
        // Collect patient answers while in the target section
        if (inTargetSection && msg.role === 'patient') {
            const text = msg.content.trim();
            if (text && !text.startsWith('📸')) {
                answers.push(text);
            }
        }
    }
    return answers;
}

/**
 * Build a structured summary object from raw AI text and the chat messages.
 * This is used as a fallback when the AI summary is not valid JSON.
 */
function buildStructuredSummary(
    rawSummaryText: string,
    msgs: ChatMessage[],
): Record<string, unknown> {
    // Map section labels to their structured keys
    const sectionMap: { keywords: string[]; key: string; label: string }[] = [
        { keywords: ['present illness', 'hpi'], key: 'hpi', label: 'History of Present Illness' },
        { keywords: ['past medical', 'pmh'], key: 'pmh', label: 'Past Medical History' },
        { keywords: ['medication'], key: 'medicationsText', label: 'Medications' },
        { keywords: ['allerg'], key: 'allergiesText', label: 'Allergies' },
        { keywords: ['family'], key: 'familyHistory', label: 'Family History' },
        { keywords: ['social'], key: 'socialHistory', label: 'Social History' },
        { keywords: ['review of systems', 'ros'], key: 'reviewOfSystems', label: 'Review of Systems' },
    ];

    const structured: Record<string, unknown> = {
        summary: rawSummaryText,
        raw: true,
    };

    // Build each section from the chat messages
    for (const sec of sectionMap) {
        const answers = extractSectionAnswers(msgs, sec.keywords);
        if (answers.length > 0) {
            structured[sec.key] = answers.join('. ');
        }
    }

    return structured;
}

// ── Get the applicable nodes for a pathway + gender ──
function getApplicableNodes(nodes: SequenceNode[], pathway: string | null, gender?: string | null): SequenceNode[] {
    return nodes.filter((n) => {
        // Pathway filtering
        if (n.pathway_condition) {
            if (!pathway || n.pathway_condition !== pathway) return false;
        }
        // Gender filtering
        if (n.gender_condition) {
            if (!gender || n.gender_condition !== gender) return false;
        }
        return true;
    });
}

// ── Section turn limits ─────────────────────────
const MAX_SECTION_TURNS = 8;   // Auto-complete after this many patient messages in a section
const SHOW_SKIP_AFTER = 3;     // Show "Skip" button after this many turns

// Note: Behavioral rules (PROMPT_BEHAVIOR_SUFFIX) have been moved to the edge function.
// The client now calls chatSection() which handles prompt construction server-side.

export default function AIChatScreen() {
    const {
        chiefComplaint, messages, progressPercent,
        isAiTyping, gibberishCount,
        sequenceNodes, currentNodeIndex, activePathway,
        sessionId, aiErrorType, lastFailedMessage,
        addMessage, setProgress, setAiTyping,
        addProtocolFlag, addQA, setAiSummary,
        setMedications, setAllergies, addPhoto,
        setSequenceNodes, setCurrentNodeIndex, setActivePathway,
        setSessionId, restoreFromSnapshot,
        setAiError, clearAiError,
        setPatientAddendum,
    } = useIntakeStore();
    const { user, session } = useAuthStore();

    // ── Auth guard ──────────────────────────────
    if (!session) {
        return (
            <SafeAreaView style={styles.container}>
                <View style={styles.authRequired}>
                    <Text style={styles.authIcon}>🔐</Text>
                    <Text style={styles.authTitle}>{t('aiChat.signInRequired')}</Text>
                    <Text style={styles.authSubtitle}>
                        {t('aiChat.signInToAccess')}
                    </Text>
                    <Pressable
                        style={styles.authButton}
                        onPress={() => router.replace('/(auth)/landing')}
                    >
                        <Text style={styles.authButtonText}>{t('auth.signIn')}</Text>
                    </Pressable>
                    <TouchableOpacity onPress={() => router.back()} style={{ marginTop: spacing.md }}>
                        <Text style={styles.backText}>← {t('common.back')}</Text>
                    </TouchableOpacity>
                </View>
            </SafeAreaView>
        );
    }

    const [inputText, setInputText] = useState('');
    const [isEmergency, setIsEmergency] = useState(false);
    const [isTerminated, setIsTerminated] = useState(false);
    const [localGibberishCount, setLocalGibberishCount] = useState(gibberishCount);
    const [conversationHistory, setConversationHistory] = useState<{ role: string; content: string }[]>([]);
    const [sectionHistory, setSectionHistory] = useState<{ role: string; content: string }[]>([]);
    const [patientContext, setPatientContext] = useState('');
    const [applicableNodes, setApplicableNodes] = useState<SequenceNode[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [recentPatientMessages, setRecentPatientMessages] = useState<string[]>([]);
    const [cooldownUntil, setCooldownUntil] = useState<number | null>(null);
    const [cooldownRemaining, setCooldownRemaining] = useState(0);
    const [sectionTurnCount, setSectionTurnCount] = useState(0);
    const [isReported, setIsReported] = useState(false);
    const [showPhotoCapture, setShowPhotoCapture] = useState(false);
    const [aiConsentGiven, setAiConsentGiven] = useState(false);

    // ── Addendum state ───────────────────────
    const MAX_ADDENDUM_TURNS = 5;
    const MAX_ADDENDUM_REGENERATIONS = 2;
    const [isInAddendum, setIsInAddendum] = useState(false);
    const [addendumTurnCount, setAddendumTurnCount] = useState(0);
    const [addendumHistory, setAddendumHistory] = useState<{ role: string; content: string }[]>([]);
    const [addendumTexts, setAddendumTexts] = useState<string[]>([]);
    const [addendumRegenerationCount, setAddendumRegenerationCount] = useState(0);

    const scrollRef = useRef<ScrollView>(null);
    const typingAnim = useRef(new Animated.Value(0)).current;

    // ── Typing indicator animation ──────────────
    useEffect(() => {
        if (isAiTyping) {
            Animated.loop(
                Animated.sequence([
                    Animated.timing(typingAnim, { toValue: 1, duration: 600, useNativeDriver: true }),
                    Animated.timing(typingAnim, { toValue: 0, duration: 600, useNativeDriver: true }),
                ])
            ).start();
        }
    }, [isAiTyping]);

    // ── Scroll to bottom on new message ─────────
    useEffect(() => {
        setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 100);
    }, [messages.length, isAiTyping]);

    // ── Cooldown countdown timer ────────────────
    useEffect(() => {
        if (!cooldownUntil) return;
        const interval = setInterval(() => {
            const remaining = Math.max(0, cooldownUntil - Date.now());
            setCooldownRemaining(remaining);
            if (remaining <= 0) {
                setCooldownUntil(null);
                setCooldownRemaining(0);
            }
        }, 1000);
        return () => clearInterval(interval);
    }, [cooldownUntil]);

    // ── Initialize chat on mount ────────────────
    useEffect(() => {
        initializeChat();
    }, []);

    /** Auto-save session to the database (fire-and-forget) */
    async function autoSaveSession() {
        if (!user?.id) return;
        try {
            const storeState = useIntakeStore.getState();
            const snapshot = buildSnapshot(storeState, {
                conversationHistory,
                sectionTurnCount,
            });
            const result = await saveIntakeSession({
                sessionId: storeState.sessionId || undefined,
                patientId: user.id,
                specialty: storeState.specialty || 'general',
                chiefComplaint: storeState.chiefComplaint || undefined,
                snapshot: snapshot as unknown as Record<string, unknown>,
            });
            // Store the session ID for subsequent updates
            if (!storeState.sessionId) {
                setSessionId(result.id);
            }
        } catch (err) {
            console.warn('Auto-save failed:', err);
        }
    }

    async function initializeChat() {
        setIsLoading(true);

        // Load admin-configured protocol rules
        try {
            const protocolCfg = await fetchProtocolConfig();
            if (Object.keys(protocolCfg).length > 0) {
                setProtocolConfig(protocolCfg as Parameters<typeof setProtocolConfig>[0]);
            }
        } catch { /* use defaults */ }

        // ── Check for an existing in-progress session ──
        if (user?.id) {
            try {
                const existing = await getActiveIntakeSession(user.id);
                if (existing?.ai_entities) {
                    const snap = existing.ai_entities as Record<string, unknown>;
                    // Restore into the store
                    restoreFromSnapshot(existing.id, snap as any);
                    // Restore local state
                    setConversationHistory((snap.conversationHistory || []) as { role: string; content: string }[]);
                    setSectionTurnCount((snap.sectionTurnCount as number) ?? 0);
                    // Recompute applicable nodes from restored sequence
                    const restoredNodes = (snap.sequenceNodes || []) as SequenceNode[];
                    const pathway = (snap.activePathway as string) ?? null;
                    setApplicableNodes(getApplicableNodes(restoredNodes, pathway, user?.gender));
                    setIsLoading(false);
                    return; // Skip fresh initialization
                }
            } catch (err) {
                console.warn('Could not restore session:', err);
            }
        }

        setAiTyping(true);

        try {
            // 0a. Fetch chatbot version for troubleshooting
            const chatbotVersion = await fetchChatbotVersion();
            addMessage({
                id: uid(),
                role: 'system',
                content: `cliniq.one AI  ${chatbotVersion}`,
                timestamp: Date.now(),
            });

            // 0b. Check if chatbot is enabled by admin
            const enabled = await checkChatbotEnabled();
            if (!enabled) {
                addMessage({
                    id: uid(),
                    role: 'system',
                    content: t('aiChat.chatbotDisabled'),
                    timestamp: Date.now(),
                });
                setAiTyping(false);
                setIsLoading(false);
                return;
            }

            // 1. Fetch the active sequence from admin config
            const nodes = await fetchDefaultSequence();

            if (!nodes || nodes.length === 0) {
                // Fallback: no sequence configured, show error
                addMessage({
                    id: uid(),
                    role: 'system',
                    content: t('aiChat.noSequenceConfigured'),
                    timestamp: Date.now(),
                });
                setAiTyping(false);
                setIsLoading(false);
                return;
            }

            setSequenceNodes(nodes);

            // 2. Start with the first node (should be "greeting")
            const initial = getApplicableNodes(nodes, null, user?.gender);
            setApplicableNodes(initial);
            setCurrentNodeIndex(0);

            const firstNode = initial[0];
            if (!firstNode) {
                setAiTyping(false);
                setIsLoading(false);
                return;
            }

            // 3. Show section badge
            addMessage({
                id: uid(),
                role: 'system',
                content: getNodeLabel(firstNode),
                timestamp: Date.now(),
                sectionLabel: firstNode.label,
            });

            // 4. Send the first node's prompt to the AI (server-side resolution)
            const initResult = await chatSection({
                section: firstNode.step_key,
                promptId: firstNode.prompt_id || undefined,
                conversationHistory: [],
                language: getLocale(),
            });

            // 5. Display AI greeting
            addMessage({
                id: uid(),
                role: 'ai',
                content: stripInternalTags(initResult.response),
                timestamp: Date.now(),
            });

            setConversationHistory([
                { role: 'ai', content: initResult.response },
            ]);
            setSectionHistory([
                { role: 'ai', content: initResult.response },
            ]);

            setProgress(Math.round(((0 + 1) / initial.length) * 100));
        } catch (err) {
            console.error('AI init error:', err);
            addMessage({
                id: uid(),
                role: 'ai',
                content: t('aiChat.fallbackGreeting'),
                timestamp: Date.now(),
            });
        }

        setAiTyping(false);
        setIsLoading(false);
    }

    // ── Handle patient sending a message ────────
    async function handleSend(text?: string) {
        const msgText = (text || inputText).trim();
        if (!msgText || isAiTyping || isEmergency || isTerminated) return;

        // If in addendum mode, delegate to addendum handler
        if (isInAddendum) {
            await handleAddendumSend(msgText);
            return;
        }

        // Block during cooldown
        if (cooldownUntil && Date.now() < cooldownUntil) return;

        // Protocol detection (synchronous) — now includes recent messages for repeat detection
        const { violations, newGibberishCount } = detectProtocols(msgText, localGibberishCount, recentPatientMessages);
        setLocalGibberishCount(newGibberishCount);

        // Check for protocol violations
        for (const v of violations) {
            if (v.code === 'A') {
                setIsEmergency(true);
                addProtocolFlag('A');
                addMessage({
                    id: uid(),
                    role: 'system',
                    content: `🚨 ${v.message}`,
                    timestamp: Date.now(),
                });
                return;
            }
            if (v.code === 'I' || v.code === 'O') {
                addMessage({
                    id: uid(),
                    role: 'patient',
                    content: msgText,
                    timestamp: Date.now(),
                });
                addMessage({
                    id: uid(),
                    role: 'system',
                    content: `⚠️ ${v.message}`,
                    timestamp: Date.now(),
                });
                const level = getEscalationLevel(newGibberishCount);
                if (level === 'terminated') {
                    setIsTerminated(true);
                    addProtocolFlag('I_TERMINATED');
                    // Log for staff review
                    if (user?.id) {
                        logProtocolEvent({
                            patientId: user.id,
                            protocolCode: 'I',
                            severity: 'critical',
                            triggerText: msgText,
                            actionTaken: 'session_terminated_client',
                        });
                    }
                } else if (level === 'cooldown') {
                    setCooldownUntil(Date.now() + getCooldownMs());
                    setCooldownRemaining(getCooldownMs());
                }
                setInputText('');
                return;
            }
        }

        // Strike decay: reward cooperative messages by reducing strike count
        if (violations.length === 0 && localGibberishCount > 0) {
            setLocalGibberishCount(prev => Math.max(0, prev - 1));
        }

        // Clear any previous error state
        clearAiError();
        setIsReported(false);

        // Add patient message
        addMessage({
            id: uid(),
            role: 'patient',
            content: msgText,
            timestamp: Date.now(),
        });
        setInputText('');

        // Track recent messages for repeat detection (keep last 5)
        setRecentPatientMessages(prev => [...prev.slice(-4), msgText]);

        // Track conversation history (full for summary, section for AI calls)
        const newHistory = [...conversationHistory, { role: 'patient', content: msgText }];
        setConversationHistory(newHistory);
        const newSectionHistory = [...sectionHistory, { role: 'patient', content: msgText }];
        setSectionHistory(newSectionHistory);

        // Track Q&A (store last AI message as the question)
        const lastAiMsg = [...messages].reverse().find((m) => m.role === 'ai');
        if (lastAiMsg) {
            addQA(lastAiMsg.content.split('\n\n💡')[0], msgText);
        }

        // Increment section turn counter
        const newTurnCount = sectionTurnCount + 1;
        setSectionTurnCount(newTurnCount);

        // Auto-save before AI call so progress is never lost
        autoSaveSession();

        // Send to AI
        setAiTyping(true);
        try {
            const currentNodes = applicableNodes;
            let currentIdx = currentNodeIndex;
            let currentNode = currentNodes[currentIdx];

            if (!currentNode) {
                // Should not happen, but handle gracefully
                setAiTyping(false);
                return;
            }

            // Auto-advance past greeting/pathway after first user message (like admin does)
            const noCompleteSections = ['greeting', 'pathway', 'summary'];
            if (noCompleteSections.includes(currentNode.step_key) && currentNode.step_key !== 'summary') {
                const nextIdx = currentIdx + 1;
                if (nextIdx < currentNodes.length) {
                    currentIdx = nextIdx;
                    currentNode = currentNodes[nextIdx];
                    setCurrentNodeIndex(nextIdx);

                    // Show section transition
                    addMessage({
                        id: uid(),
                        role: 'system',
                        content: getNodeLabel(currentNode),
                        timestamp: Date.now(),
                        sectionLabel: currentNode.label,
                    });
                    setProgress(Math.round(((nextIdx + 1) / currentNodes.length) * 100));
                    setSectionTurnCount(0);
                    setSectionHistory([]);
                    setRecentPatientMessages([]);
                }
            }

            // Build system prompt — server-side via chatSection
            // KEY: Send only sectionHistory (per-section isolation) + patientContext
            const aiResult = await chatSection({
                section: currentNode.step_key,
                promptId: currentNode.prompt_id || undefined,
                conversationHistory: newSectionHistory,
                language: getLocale(),
                patientContext,
            });

            const aiResponse = aiResult.response;

            // If AI flagged a violation (returned from server), increment strike count
            if (aiResult.violation) {
                const newCount = localGibberishCount + 1;
                setLocalGibberishCount(newCount);
                const level = getEscalationLevel(newCount);
                if (level === 'terminated') {
                    setIsTerminated(true);
                    addProtocolFlag('O_TERMINATED');
                    // Log for staff review
                    if (user?.id) {
                        logProtocolEvent({
                            patientId: user.id,
                            protocolCode: 'I',
                            severity: 'critical',
                            triggerText: `AI flagged violation: ${aiResult.violation}`,
                            actionTaken: 'session_terminated_ai',
                        });
                    }
                } else if (level === 'cooldown') {
                    setCooldownUntil(Date.now() + getCooldownMs());
                    setCooldownRemaining(getCooldownMs());
                }
            }

            // Update conversation history with AI response
            const updatedHistory = [...newHistory, { role: 'ai', content: aiResponse }];
            setConversationHistory(updatedHistory);
            const updatedSectionHistory = [...newSectionHistory, { role: 'ai', content: aiResponse }];
            setSectionHistory(updatedSectionHistory);

            // Build patient context from chief complaint after pathway
            // Check for pathway detection
            const pathwayMatch = aiResponse.match(/\[PATHWAY:(\w+)\]/);
            if (pathwayMatch) {
                const pathway = pathwayMatch[1];
                setActivePathway(pathway);

                // Build patient context from the greeting/pathway exchange
                const chiefComplaintMsg = newHistory.find(m => m.role === 'patient');
                const newPatientContext = `Chief complaint: ${chiefComplaintMsg?.content || msgText}\nPathway: ${pathway}`;
                setPatientContext(newPatientContext);

                // Recalculate applicable nodes with this pathway
                const newApplicable = getApplicableNodes(sequenceNodes, pathway, user?.gender);
                setApplicableNodes(newApplicable);

                // Find the next node after current
                const currentStepKey = currentNode.step_key;
                const nextApplicableIdx = newApplicable.findIndex(
                    (n) => n.sort_order > currentNode.sort_order
                );

                const nextNodeIdx = nextApplicableIdx >= 0 ? nextApplicableIdx : newApplicable.length;
                setCurrentNodeIndex(nextNodeIdx);

                // Show response (strip pathway tag)
                const cleanResponse = stripInternalTags(aiResponse);
                addMessage({
                    id: uid(),
                    role: 'ai',
                    content: cleanResponse,
                    timestamp: Date.now(),
                });

                // Auto-advance: show next section badge and ask first question
                // Reset section history for the new section
                if (nextNodeIdx < newApplicable.length) {
                    const nextNode = newApplicable[nextNodeIdx];
                    addMessage({
                        id: uid(),
                        role: 'system',
                        content: getNodeLabel(nextNode),
                        timestamp: Date.now(),
                        sectionLabel: nextNode.label,
                    });
                    setProgress(Math.round(((nextNodeIdx + 1) / newApplicable.length) * 100));

                    // Photo capture node — handled by client UI, no AI call
                    if (nextNode.step_key === 'photo_capture') {
                        setShowPhotoCapture(true);
                        setAiTyping(false);
                        return;
                    }

                    // Fresh section history — no prior conversation
                    let nextResult = await chatSection({
                        section: nextNode.step_key,
                        promptId: nextNode.prompt_id || undefined,
                        conversationHistory: [],
                        language: getLocale(),
                        patientContext: newPatientContext,
                    });

                    const nextResponse = nextResult.response;

                    const autoHistory = [...updatedHistory, { role: 'ai', content: nextResponse }];
                    setConversationHistory(autoHistory);
                    // Start new section history with just the AI's first message
                    setSectionHistory([{ role: 'ai', content: nextResponse }]);

                    addMessage({
                        id: uid(),
                        role: 'ai',
                        content: stripInternalTags(nextResponse),
                        timestamp: Date.now(),
                    });
                }

                setAiTyping(false);
                return;
            }

            // Check for section completion (server tells us OR turn limit exceeded)
            const sectionComplete = aiResult.sectionComplete || newTurnCount >= MAX_SECTION_TURNS;

            if (sectionComplete) {
                // Show response (strip tag)
                const cleanResponse = stripInternalTags(aiResponse);
                if (cleanResponse) {
                    addMessage({
                        id: uid(),
                        role: 'ai',
                        content: cleanResponse,
                        timestamp: Date.now(),
                    });
                }

                // Advance to next node
                const nextIdx = currentIdx + 1;

                if (nextIdx >= currentNodes.length) {
                    // All sections complete — generate final summary
                    await generateFinalSummary();
                    return;
                }

                const nextNode = currentNodes[nextIdx];
                setCurrentNodeIndex(nextIdx);
                setProgress(Math.round(((nextIdx + 1) / currentNodes.length) * 100));
                setSectionTurnCount(0);
                setSectionHistory([]);
                setRecentPatientMessages([]);

                // Check if this is the summary node
                if (nextNode.step_key === 'summary') {
                    await generateFinalSummary();
                    return;
                }

                // Show section transition
                addMessage({
                    id: uid(),
                    role: 'system',
                    content: getNodeLabel(nextNode),
                    timestamp: Date.now(),
                    sectionLabel: nextNode.label,
                });

                // Photo capture node — handled by client UI, no AI call
                if (nextNode.step_key === 'photo_capture') {
                    setShowPhotoCapture(true);
                    setAiTyping(false);
                    return;
                }

                // Fresh section history for the new section
                let nextResult = await chatSection({
                    section: nextNode.step_key,
                    promptId: nextNode.prompt_id || undefined,
                    conversationHistory: [],
                    language: getLocale(),
                    patientContext,
                });

                const nextResponse = nextResult.response;

                const finalHistory = [...updatedHistory, { role: 'ai', content: nextResponse }];
                setConversationHistory(finalHistory);
                // Start new section history with just this AI message
                setSectionHistory([{ role: 'ai', content: nextResponse }]);

                addMessage({
                    id: uid(),
                    role: 'ai',
                    content: stripInternalTags(nextResponse),
                    timestamp: Date.now(),
                });
            } else {
                // Continue in current section
                addMessage({
                    id: uid(),
                    role: 'ai',
                    content: stripInternalTags(aiResponse),
                    timestamp: Date.now(),
                });

                // Advance progress slightly within section
                const nodeProgress = Math.round(((currentIdx + 1) / currentNodes.length) * 100);
                const currentProgress = progressPercent;
                if (currentProgress < nodeProgress) {
                    setProgress(Math.min(currentProgress + 2, nodeProgress));
                }
            }
        } catch (err) {
            console.error('Chat error:', err);
            const isTimeout = err instanceof AITimeoutError;
            setAiError(isTimeout ? 'timeout' : 'error', msgText);
            // Don't add a message — the retry banner will show instead
        } finally {
            setAiTyping(false);
        }

        // Auto-save session after AI responds (or errors)
        autoSaveSession();
    }

    // ── Retry last failed message ────────────────
    async function handleRetry() {
        clearAiError();
        setIsReported(false);

        // The patient message + conversation history already exist from the first attempt.
        // We just need to re-run the AI call portion.
        setAiTyping(true);
        try {
            const currentNodes = applicableNodes;
            let currentIdx = currentNodeIndex;
            let currentNode = currentNodes[currentIdx];

            if (!currentNode) {
                setAiTyping(false);
                return;
            }

            const noCompleteSections = ['greeting', 'pathway', 'summary'];

            const retryResult = await chatSection({
                section: currentNode.step_key,
                promptId: currentNode.prompt_id || undefined,
                conversationHistory: sectionHistory,
                language: getLocale(),
                patientContext,
            });

            const aiResponse = retryResult.response;
            const updatedHistory = [...conversationHistory, { role: 'ai', content: aiResponse }];
            setConversationHistory(updatedHistory);
            setSectionHistory([...sectionHistory, { role: 'ai', content: aiResponse }]);

            // Check for section completion (server tells us OR turn limit exceeded)
            const sectionComplete = retryResult.sectionComplete || sectionTurnCount >= MAX_SECTION_TURNS;

            if (sectionComplete) {
                const cleanResponse = stripInternalTags(aiResponse);
                if (cleanResponse) {
                    addMessage({ id: uid(), role: 'ai', content: cleanResponse, timestamp: Date.now() });
                }
                const nextIdx = currentIdx + 1;
                if (nextIdx >= currentNodes.length) {
                    await generateFinalSummary();
                    return;
                }
                const nextNode = currentNodes[nextIdx];
                setCurrentNodeIndex(nextIdx);
                setProgress(Math.round(((nextIdx + 1) / currentNodes.length) * 100));
                setSectionTurnCount(0);
                setSectionHistory([]);
                setRecentPatientMessages([]);
                if (nextNode.step_key === 'summary') {
                    await generateFinalSummary();
                    return;
                }
                addMessage({ id: uid(), role: 'system', content: getNodeLabel(nextNode), timestamp: Date.now(), sectionLabel: nextNode.label });
                let nextResult = await chatSection({
                    section: nextNode.step_key,
                    promptId: nextNode.prompt_id || undefined,
                    conversationHistory: [],
                    language: getLocale(),
                    patientContext,
                });
                const nextResponse = nextResult.response;
                setConversationHistory([...updatedHistory, { role: 'ai', content: nextResponse }]);
                setSectionHistory([{ role: 'ai', content: nextResponse }]);
                addMessage({ id: uid(), role: 'ai', content: stripInternalTags(nextResponse), timestamp: Date.now() });
            } else {
                addMessage({ id: uid(), role: 'ai', content: stripInternalTags(aiResponse), timestamp: Date.now() });
            }
        } catch (err) {
            console.error('Retry error:', err);
            const isTimeout = err instanceof AITimeoutError;
            setAiError(isTimeout ? 'timeout' : 'error', lastFailedMessage);
        } finally {
            setAiTyping(false);
        }
        autoSaveSession();
    }

    // ── Report issue to admin ────────────────────
    async function handleReportIssue() {
        if (!user?.id || isReported) return;
        setIsReported(true);
        try {
            const currentNode = applicableNodes[currentNodeIndex];
            await logProtocolEvent({
                patientId: user.id,
                protocolCode: 'AI_ERROR',
                severity: 'high',
                triggerText: `Error: ${aiErrorType || 'unknown'} | Section: ${currentNode?.label || 'unknown'} | Messages: ${messages.length} | Last msg: ${(lastFailedMessage || '').slice(0, 200)}`,
                actionTaken: 'patient_reported_ai_issue',
            });
        } catch (reportErr) {
            console.error('Failed to report issue:', reportErr);
        }
    }

    // ── Generate final AI summary ───────────────
    async function generateFinalSummary() {
        setProgress(100);
        addMessage({
            id: uid(),
            role: 'system',
            content: `🧠 ${t('aiChat.analyzingFinal')}`,
            timestamp: Date.now(),
        });

        try {
            // Use the summary node's prompt if available
            const summaryNode = sequenceNodes.find((n) => n.step_key === 'summary');
            const qaHistory = useIntakeStore.getState().qaHistory;

            if (summaryNode?.ai_prompts?.content) {
                // Use sequence-driven summary with admin prompt via chatSection
                const summaryResult = await chatSection({
                    section: 'summary',
                    promptId: summaryNode.prompt_id || undefined,
                    conversationHistory,
                    language: getLocale(),
                });
                const summaryResponse = summaryResult.response;

                try {
                    // Try to parse as JSON
                    const parsed = JSON.parse(summaryResponse);
                    setAiSummary(parsed);
                    if (parsed.medications?.length) setMedications(parsed.medications);
                    if (parsed.allergies?.length) setAllergies(parsed.allergies);
                } catch {
                    // If not JSON, build structured summary from chat messages
                    const allMessages = useIntakeStore.getState().messages;
                    setAiSummary(buildStructuredSummary(summaryResponse, allMessages));
                }
            } else {
                // Fallback: use the legacy analyzeQA
                const summary = await analyzeQA(
                    qaHistory,
                    {
                        nickname: user?.nickname || '',
                        yearOfBirth: user?.year_of_birth ?? null,
                        gender: user?.gender ?? null,
                        country: user?.country ?? null,
                    },
                    getLocale(),
                );

                setAiSummary(summary as unknown as Record<string, unknown>);
                if (summary.medications?.length) setMedications(summary.medications);
                if (summary.allergies?.length) setAllergies(summary.allergies);
            }

            // Fallback: extract medications & allergies from chat messages if not set by AI
            const allMessages = useIntakeStore.getState().messages;
            const currentMeds = useIntakeStore.getState().medications;
            const currentAllergies = useIntakeStore.getState().allergies;

            if (!currentMeds.length) {
                const medsAnswers = extractSectionAnswers(allMessages, ['medication']);
                if (medsAnswers.length > 0) {
                    // Filter out negative answers
                    const nonNegative = medsAnswers.filter(
                        (a) => !/^(no|none|nothing|i('m| am) not|nope|n\/a)$/i.test(a.trim()),
                    );
                    if (nonNegative.length > 0) setMedications(nonNegative);
                }
            }

            if (!currentAllergies.length) {
                const allergyAnswers = extractSectionAnswers(allMessages, ['allerg']);
                if (allergyAnswers.length > 0) {
                    const nonNegative = allergyAnswers.filter(
                        (a) => !/^(no|none|nothing|nkda|nope|n\/a)$/i.test(a.trim()),
                    );
                    if (nonNegative.length > 0) setAllergies(nonNegative);
                }
            }

            addMessage({
                id: uid(),
                role: 'system',
                content: `✅ ${t('aiChat.analysisComplete')}`,
                timestamp: Date.now(),
            });

            // ── Start Patient Addendum step ───────────────
            // Instead of navigating to review, let the patient review the summary in-chat
            addMessage({
                id: uid(),
                role: 'system',
                content: t('aiChat.finalReview'),
                timestamp: Date.now(),
                sectionLabel: t('aiChat.finalReview'),
            });

            // Build context from the summary for the addendum AI
            const currentSummary = useIntakeStore.getState().aiSummary;
            const summaryContext = currentSummary
                ? `INTAKE SUMMARY FOR PATIENT REVIEW:\n${JSON.stringify(currentSummary, null, 2)}`
                : '';

            // Call the addendum AI to present the summary
            const addendumResult = await chatSection({
                section: 'patient_addendum',
                conversationHistory: [],
                language: getLocale(),
                patientContext: summaryContext,
            });

            const addendumResponse = addendumResult.response;

            addMessage({
                id: uid(),
                role: 'ai',
                content: stripInternalTags(addendumResponse),
                timestamp: Date.now(),
            });

            // Initialize addendum state
            setIsInAddendum(true);
            setAddendumTurnCount(0);
            setAddendumHistory([{ role: 'ai', content: addendumResponse }]);
            setAddendumTexts([]);

            setAiTyping(false);
        } catch (err) {
            console.error('Final analysis error:', err);
            addMessage({
                id: uid(),
                role: 'system',
                content: `⚠️ ${t('aiChat.analysisError')}`,
                timestamp: Date.now(),
            });
            setAiTyping(false);
        }
    }

    // ── Finalize addendum and navigate to review ──
    async function finalizeAddendum() {
        // Combine all patient addendum texts
        const combinedAddendum = addendumTexts.join('\n');
        if (combinedAddendum.trim()) {
            setPatientAddendum(combinedAddendum.trim());
        }

        // Clean up in-progress session from DB
        const currentSessionId = useIntakeStore.getState().sessionId;
        if (currentSessionId) {
            try {
                await deleteIntakeSession(currentSessionId);
                setSessionId(null);
            } catch (err) {
                console.warn('Session cleanup failed:', err);
            }
        }

        setIsInAddendum(false);
        setTimeout(() => {
            router.push('/intake/review');
        }, 1000);
    }

    // ── Handle patient message during addendum ───
    async function handleAddendumSend(msgText: string) {
        // Add patient message
        addMessage({
            id: uid(),
            role: 'patient',
            content: msgText,
            timestamp: Date.now(),
        });
        setInputText('');

        // Track addendum texts
        const newTexts = [...addendumTexts, msgText];
        setAddendumTexts(newTexts);

        // Track addendum turn count
        const newTurnCount = addendumTurnCount + 1;
        setAddendumTurnCount(newTurnCount);

        // Update addendum history
        const newHistory = [...addendumHistory, { role: 'patient', content: msgText }];
        setAddendumHistory(newHistory);

        // Check turn limit
        if (newTurnCount >= MAX_ADDENDUM_TURNS) {
            addMessage({
                id: uid(),
                role: 'system',
                content: t('aiChat.addendumTurnLimit'),
                timestamp: Date.now(),
            });
            await finalizeAddendum();
            return;
        }

        // Call AI for addendum response
        setAiTyping(true);
        try {
            const currentSummary = useIntakeStore.getState().aiSummary;
            const summaryContext = currentSummary
                ? `INTAKE SUMMARY FOR PATIENT REVIEW:\n${JSON.stringify(currentSummary, null, 2)}`
                : '';

            const addendumResult = await chatSection({
                section: 'patient_addendum',
                conversationHistory: newHistory,
                language: getLocale(),
                patientContext: summaryContext,
            });

            const aiResponse = addendumResult.response;

            // Check if AI signaled addendum is done (patient confirmed)
            if (addendumResult.addendumDone) {
                // Update history with AI response
                setAddendumHistory([...newHistory, { role: 'ai', content: aiResponse }]);
                addMessage({
                    id: uid(),
                    role: 'ai',
                    content: stripInternalTags(aiResponse),
                    timestamp: Date.now(),
                });
                await finalizeAddendum();
                return;
            }

            // Patient added new info — regenerate summary if within limit
            if (addendumRegenerationCount < MAX_ADDENDUM_REGENERATIONS) {
                setAddendumRegenerationCount(prev => prev + 1);

                // Show acknowledgement
                addMessage({
                    id: uid(),
                    role: 'system',
                    content: t('aiChat.updatingSummary'),
                    timestamp: Date.now(),
                });

                // Add the patient's addendum to qaHistory so the summary includes it
                addQA('Patient addendum', msgText);

                // Regenerate summary with updated QA
                const summaryNode = sequenceNodes.find((n) => n.step_key === 'summary');
                const qaHistory = useIntakeStore.getState().qaHistory;

                if (summaryNode?.ai_prompts?.content) {
                    const summaryResult = await chatSection({
                        section: 'summary',
                        promptId: summaryNode.prompt_id || undefined,
                        conversationHistory,
                        language: getLocale(),
                    });
                    try {
                        const parsed = JSON.parse(summaryResult.response);
                        setAiSummary(parsed);
                        if (parsed.medications?.length) setMedications(parsed.medications);
                        if (parsed.allergies?.length) setAllergies(parsed.allergies);
                    } catch {
                        const allMessages = useIntakeStore.getState().messages;
                        setAiSummary(buildStructuredSummary(summaryResult.response, allMessages));
                    }
                } else {
                    const summary = await analyzeQA(
                        qaHistory,
                        {
                            nickname: user?.nickname || '',
                            yearOfBirth: user?.year_of_birth ?? null,
                            gender: user?.gender ?? null,
                            country: user?.country ?? null,
                        },
                        getLocale(),
                    );
                    setAiSummary(summary as unknown as Record<string, unknown>);
                    if (summary.medications?.length) setMedications(summary.medications);
                    if (summary.allergies?.length) setAllergies(summary.allergies);
                }

                addMessage({
                    id: uid(),
                    role: 'system',
                    content: t('aiChat.summaryUpdated'),
                    timestamp: Date.now(),
                });

                // Re-present the updated summary via addendum prompt
                const updatedSummary = useIntakeStore.getState().aiSummary;
                const updatedSummaryContext = updatedSummary
                    ? `INTAKE SUMMARY FOR PATIENT REVIEW:\n${JSON.stringify(updatedSummary, null, 2)}`
                    : '';

                const regenResult = await chatSection({
                    section: 'patient_addendum',
                    conversationHistory: [],  // Fresh — so the AI presents the full updated summary
                    language: getLocale(),
                    patientContext: updatedSummaryContext,
                });

                const regenResponse = regenResult.response;
                setAddendumHistory([{ role: 'ai', content: regenResponse }]);
                setAddendumTurnCount(0);  // Reset turns for the new summary

                addMessage({
                    id: uid(),
                    role: 'ai',
                    content: stripInternalTags(regenResponse),
                    timestamp: Date.now(),
                });
            } else {
                // Max regenerations reached — just acknowledge and finalize
                setAddendumHistory([...newHistory, { role: 'ai', content: aiResponse }]);
                addMessage({
                    id: uid(),
                    role: 'ai',
                    content: stripInternalTags(aiResponse),
                    timestamp: Date.now(),
                });
            }
        } catch (err) {
            console.error('Addendum error:', err);
            // On error, just finalize with what we have
            await finalizeAddendum();
        } finally {
            setAiTyping(false);
        }
    }

    // ── Handle "Looks Good" quick action ──────────
    async function handleAddendumConfirm() {
        if (isAiTyping) return;
        addMessage({
            id: uid(),
            role: 'patient',
            content: t('aiChat.looksGoodMessage'),
            timestamp: Date.now(),
        });

        addMessage({
            id: uid(),
            role: 'system',
            content: t('aiChat.finalizingReport'),
            timestamp: Date.now(),
        });

        await finalizeAddendum();
    }

    // ── Get current section label from sequence ─
    const currentNode = applicableNodes[currentNodeIndex];
    const currentLabel = currentNode ? `${currentNode.emoji} ${currentNode.label}` : '';
    const showSkipButton = sectionTurnCount >= SHOW_SKIP_AFTER && !isAiTyping && !isEmergency && !isTerminated;

    // ── Photo capture handlers ──────────────────
    async function advanceFromPhotoCapture() {
        setShowPhotoCapture(false);
        const currentNodes = applicableNodes;
        const nextIdx = currentNodeIndex + 1;

        if (nextIdx >= currentNodes.length) {
            await generateFinalSummary();
            return;
        }

        const nextNode = currentNodes[nextIdx];
        if (nextNode.step_key === 'summary') {
            await generateFinalSummary();
            return;
        }

        setCurrentNodeIndex(nextIdx);
        setProgress(Math.round(((nextIdx + 1) / currentNodes.length) * 100));
        setSectionTurnCount(0);
        setSectionHistory([]);
        setRecentPatientMessages([]);

        // Show section transition
        addMessage({
            id: uid(),
            role: 'system',
            content: getNodeLabel(nextNode),
            timestamp: Date.now(),
            sectionLabel: nextNode.label,
        });

        // Start the next section's AI
        setAiTyping(true);
        try {
            const result = await chatSection({
                section: nextNode.step_key,
                promptId: nextNode.prompt_id || undefined,
                conversationHistory: [],
                language: getLocale(),
                patientContext,
            });

            const response = result.response;
            setConversationHistory(prev => [...prev, { role: 'ai', content: response }]);
            setSectionHistory([{ role: 'ai', content: response }]);

            addMessage({
                id: uid(),
                role: 'ai',
                content: stripInternalTags(response),
                timestamp: Date.now(),
            });
        } catch (err) {
            console.error('Post-photo section error:', err);
        } finally {
            setAiTyping(false);
        }
        autoSaveSession();
    }

    function handlePhotoComplete(photoUris: string[]) {
        // Add photos as a message in the chat
        if (photoUris.length > 0) {
            addMessage({
                id: uid(),
                role: 'patient',
                content: t('aiChat.photosUploaded', { count: String(photoUris.length) }),
                timestamp: Date.now(),
                imageUrls: photoUris,
            });
            // Also store in the intake store
            photoUris.forEach(uri => addPhoto(uri));
        }
        advanceFromPhotoCapture();
    }

    function handlePhotoSkip() {
        addMessage({
            id: uid(),
            role: 'system',
            content: t('aiChat.photoSkipped'),
            timestamp: Date.now(),
        });
        advanceFromPhotoCapture();
    }

    // ── Skip Section handler ────────────────────
    async function handleSkipSection() {
        if (isAiTyping) return;
        const currentNodes = applicableNodes;
        const nextIdx = currentNodeIndex + 1;

        if (nextIdx >= currentNodes.length) {
            await generateFinalSummary();
            return;
        }

        const nextNode = currentNodes[nextIdx];
        if (nextNode.step_key === 'summary') {
            await generateFinalSummary();
            return;
        }

        setCurrentNodeIndex(nextIdx);
        setProgress(Math.round(((nextIdx + 1) / currentNodes.length) * 100));
        setSectionTurnCount(0);
        setRecentPatientMessages([]);

        addMessage({
            id: uid(),
            role: 'system',
            content: getNodeLabel(nextNode),
            timestamp: Date.now(),
            sectionLabel: nextNode.label,
        });

        // Ask the first question of the next section (via unified chatSection)
        setAiTyping(true);
        try {
            const skipResult = await chatSection({
                section: nextNode.step_key,
                promptId: nextNode.prompt_id || undefined,
                conversationHistory,
                language: getLocale(),
            });

            // Response is already clean from server
            const nextResponse = skipResult.response;

            setConversationHistory(prev => [...prev, { role: 'ai', content: nextResponse }]);
            addMessage({
                id: uid(),
                role: 'ai',
                content: stripInternalTags(nextResponse),
                timestamp: Date.now(),
            });
        } catch (err) {
            console.error('Skip section error:', err);
        }
        setAiTyping(false);
    }

    // ── AI Consent Screen (Apple 2025 requirement) ──
    if (!aiConsentGiven) {
        return (
            <SafeAreaView style={styles.container}>
                <View style={styles.consentContainer}>
                    <Text style={styles.consentIcon}>🤖</Text>
                    <Text style={styles.consentTitle}>{t('aiChat.consentTitle')}</Text>
                    <Text style={styles.consentBody}>
                        {t('aiChat.consentBody')}
                    </Text>
                    <DisclaimerBanner variant="compact" />
                    <View style={{ marginTop: spacing.xl, width: '100%' }}>
                        <Button
                            title={t('aiChat.consentButton')}
                            onPress={() => setAiConsentGiven(true)}
                            size="lg"
                        />
                    </View>
                    <TouchableOpacity
                        onPress={() => router.back()}
                        style={{ marginTop: spacing.lg }}
                    >
                        <Text style={[styles.backText, { textAlign: 'center' }]}>{t('aiChat.goBack')}</Text>
                    </TouchableOpacity>
                </View>
            </SafeAreaView>
        );
    }

    // ── Render ──────────────────────────────────
    return (
        <SafeAreaView style={styles.container}>
            <KeyboardAvoidingView
                style={{ flex: 1 }}
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                keyboardVerticalOffset={90}
            >
                {/* Header */}
                <View style={styles.header}>
                    <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
                        <Text style={styles.backText}>← {t('common.back')}</Text>
                    </TouchableOpacity>
                    <View style={styles.headerRight}>
                        <Image source={AI_DOCTOR_AVATAR} style={styles.headerAvatar} />
                        <Text style={styles.headerTitle} numberOfLines={1}>{t('aiChat.title')}</Text>
                    </View>
                    <TouchableOpacity
                        onPress={() => router.push('/intake/report-chat' as any)}
                        style={styles.headerReportBtn}
                        hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                    >
                        <Text style={styles.headerReportBtnText}>⚑</Text>
                    </TouchableOpacity>
                </View>

                {/* Progress Bar */}
                <View style={styles.progressContainer}>
                    <View style={styles.progressBar}>
                        <Animated.View style={[styles.progressFill, { width: `${progressPercent}%` }]} />
                    </View>
                    <Text style={styles.progressText}>{Math.round(progressPercent)}%</Text>
                </View>

                {/* Section Label + Skip Button */}
                {currentLabel ? (
                    <View style={styles.sectionRow}>
                        <View style={styles.sectionBadge}>
                            <Text style={styles.sectionBadgeText}>{currentLabel}</Text>
                        </View>
                        {showSkipButton && (
                            <TouchableOpacity style={styles.skipButton} onPress={handleSkipSection}>
                                <Text style={styles.skipButtonText}>{t('aiChat.nextSection')}</Text>
                            </TouchableOpacity>
                        )}
                    </View>
                ) : null}

                {/* Loading State */}
                {isLoading && (
                    <View style={styles.loadingContainer}>
                        <ActivityIndicator size="large" color={colors.accentTeal} />
                        <Text style={styles.loadingText}>{t('aiChat.loadingSequence')}</Text>
                    </View>
                )}

                {/* Messages */}
                <ScrollView
                    ref={scrollRef}
                    style={styles.messageList}
                    contentContainerStyle={styles.messageListContent}
                    showsVerticalScrollIndicator={false}
                    keyboardShouldPersistTaps="handled"
                >
                    {messages.map((msg) => (
                        <MessageBubble key={msg.id} message={msg} />
                    ))}

                    {/* Skin Photo Capture Card (inline in chat) */}
                    {showPhotoCapture && (
                        <SkinPhotoCapture
                            onComplete={handlePhotoComplete}
                            onSkip={handlePhotoSkip}
                        />
                    )}

                    {/* Typing indicator */}
                    {isAiTyping && !isLoading && (
                        <View style={[styles.bubble, styles.bubbleAi]}>
                            <Animated.Text style={[styles.typingDots, { opacity: typingAnim }]}>
                                ● ● ●
                            </Animated.Text>
                        </View>
                    )}
                </ScrollView>

                {/* Emergency Banner */}
                {isEmergency && (
                    <View style={styles.emergencyBanner}>
                        <Text style={styles.emergencyTitle}>🚨 {t('aiChat.emergencyTitle')}</Text>
                        <Text style={styles.emergencyText}>{t('aiChat.emergencyInstructions')}</Text>
                        <View style={styles.emergencyNumbers}>
                            <Text style={styles.emergencyNumber}>{t('aiChat.ambulance')}</Text>
                            <Text style={styles.emergencyNumber}>{t('aiChat.police')}</Text>
                            <Text style={styles.emergencyNumber}>{t('aiChat.fire')}</Text>
                        </View>
                        <TouchableOpacity
                            style={styles.emergencyButton}
                            onPress={() => router.replace('/(tabs)')}
                        >
                            <Text style={styles.emergencyButtonText}>{t('aiChat.backToSafety')}</Text>
                        </TouchableOpacity>
                    </View>
                )}

                {/* Violation Warning Banner */}
                {getEscalationLevel(localGibberishCount) !== 'none' && !isEmergency && !isTerminated && (
                    <View style={{
                        marginHorizontal: spacing.lg,
                        marginBottom: spacing.sm,
                        paddingHorizontal: spacing.lg,
                        paddingVertical: spacing.md,
                        borderRadius: radius.lg,
                        backgroundColor: `${getEscalationColor(getEscalationLevel(localGibberishCount))}15`,
                        borderWidth: 1,
                        borderColor: `${getEscalationColor(getEscalationLevel(localGibberishCount))}40`,
                    }}>
                        <Text style={{
                            ...typography.bodySm,
                            color: getEscalationColor(getEscalationLevel(localGibberishCount)),
                            textAlign: 'center',
                            fontWeight: '600',
                        }}>
                            {getEscalationMessage(localGibberishCount)}
                        </Text>
                        {cooldownRemaining > 0 && (
                            <Text style={{
                                ...typography.bodySm,
                                color: getEscalationColor(getEscalationLevel(localGibberishCount)),
                                textAlign: 'center',
                                fontWeight: '800',
                                marginTop: spacing.xs,
                                fontSize: 18,
                            }}>
                                ⏱ {Math.ceil(cooldownRemaining / 1000)}s
                            </Text>
                        )}
                    </View>
                )}

                {/* Retry / Report Banner */}
                {aiErrorType && !isEmergency && !isTerminated && (
                    <View style={styles.retryBanner}>
                        <Text style={styles.retryBannerIcon}>
                            {aiErrorType === 'timeout' ? '⏱' : '⚠️'}
                        </Text>
                        <Text style={styles.retryBannerText}>
                            {aiErrorType === 'timeout'
                                ? t('aiChat.errorTimeout')
                                : t('aiChat.errorGeneric')}
                        </Text>
                        <View style={styles.retryBannerButtons}>
                            <TouchableOpacity
                                style={styles.retryButton}
                                onPress={handleRetry}
                            >
                                <Text style={styles.retryButtonText}>{t('aiChat.retryButton')}</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={[
                                    styles.reportButton,
                                    isReported && { opacity: 0.5 },
                                ]}
                                onPress={handleReportIssue}
                                disabled={isReported}
                            >
                                <Text style={styles.reportButtonText}>
                                    {isReported ? t('aiChat.reportedConfirm') : t('aiChat.reportIssueButton')}
                                </Text>
                            </TouchableOpacity>
                        </View>
                        {isReported && (
                            <Text style={styles.retryBannerHint}>
                                {t('aiChat.reportedHint')}
                            </Text>
                        )}
                    </View>
                )}

                {/* Addendum Quick Reply */}
                {isInAddendum && !isAiTyping && !isEmergency && !isTerminated && (
                    <View style={styles.addendumQuickReply}>
                        <TouchableOpacity
                            style={styles.addendumConfirmButton}
                            onPress={handleAddendumConfirm}
                        >
                            <Text style={styles.addendumConfirmText}>{t('aiChat.looksGoodButton')}</Text>
                        </TouchableOpacity>
                    </View>
                )}

                {/* Input Bar */}
                {!isEmergency && !isTerminated && (
                    <View style={[styles.inputBar, (cooldownRemaining > 0 || aiErrorType) && { opacity: 0.4 }]}>
                        <TextInput
                            style={styles.textInput}
                            value={inputText}
                            onChangeText={setInputText}
                            placeholder={cooldownRemaining > 0 ? t('aiChat.chatPaused') : t('aiChat.inputPlaceholder')}
                            placeholderTextColor={colors.textTertiary}
                            multiline
                            maxLength={2000}
                            editable={!isAiTyping && cooldownRemaining <= 0 && !aiErrorType}
                        />
                        <TouchableOpacity
                            style={[styles.sendButton, (!inputText.trim() || isAiTyping || cooldownRemaining > 0 || aiErrorType) && styles.sendButtonDisabled]}
                            onPress={() => handleSend()}
                            disabled={!inputText.trim() || isAiTyping || cooldownRemaining > 0 || !!aiErrorType}
                        >
                            <Text style={styles.sendButtonText}>↑</Text>
                        </TouchableOpacity>
                    </View>
                )}

                {/* Terminated Banner */}
                {isTerminated && (
                    <View style={styles.terminatedBanner}>
                        <Text style={styles.terminatedText}>⛔ {t('aiChat.sessionTerminated')}</Text>
                        <TouchableOpacity
                            style={styles.emergencyButton}
                            onPress={() => router.replace('/(tabs)')}
                        >
                            <Text style={styles.emergencyButtonText}>{t('common.back')}</Text>
                        </TouchableOpacity>
                    </View>
                )}
            </KeyboardAvoidingView>
        </SafeAreaView>
    );
}

// ── Message Bubble Component ────────────────────
function MessageBubble({ message }: { message: ChatMessage }) {
    const isPatient = message.role === 'patient';
    const isSystem = message.role === 'system';

    return (
        <View
            style={[
                styles.bubbleWrap,
                isPatient && styles.bubbleWrapPatient,
                isSystem && styles.bubbleWrapSystem,
            ]}
        >
            {!isPatient && !isSystem && (
                <View style={styles.aiAvatar}>
                    <Image source={AI_DOCTOR_AVATAR} style={styles.aiAvatarImage} />
                </View>
            )}
            <View
                style={[
                    styles.bubble,
                    isPatient ? styles.bubblePatient : isSystem ? styles.bubbleSystem : styles.bubbleAi,
                ]}
            >
                <Text
                    style={[
                        styles.bubbleText,
                        isPatient ? styles.bubbleTextPatient : isSystem ? styles.bubbleTextSystem : styles.bubbleTextAi,
                    ]}
                >
                    {message.content}
                </Text>
            </View>
        </View>
    );
}

// ── Styles ──────────────────────────────────────
const styles = StyleSheet.create({
    // Auth Required
    authRequired: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        paddingHorizontal: spacing['2xl'],
    },
    authIcon: { fontSize: 48, marginBottom: spacing.lg },
    authTitle: { ...typography.h3, color: colors.textPrimary, marginBottom: spacing.sm },
    authSubtitle: { ...typography.body, color: colors.textSecondary, textAlign: 'center' as const, marginBottom: spacing['2xl'] },
    authButton: {
        backgroundColor: colors.accentTeal,
        paddingHorizontal: spacing['2xl'],
        paddingVertical: spacing.md,
        borderRadius: radius.lg,
    },
    authButtonText: { ...typography.body, color: '#fff', fontWeight: '700' },

    container: { flex: 1, backgroundColor: colors.bgPrimary },

    // Header
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: spacing.lg,
        paddingVertical: spacing.md,
        borderBottomWidth: 1,
        borderBottomColor: colors.border,
    },
    backButton: { paddingRight: spacing.md },
    backText: { ...typography.body, color: colors.accentTeal },
    headerRight: { flexDirection: 'row', alignItems: 'center', flex: 1, marginLeft: spacing.sm },
    headerTitle: { ...typography.h4, color: colors.textPrimary, flexShrink: 1 },

    // Progress
    progressContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: spacing.lg,
        paddingVertical: spacing.sm,
        gap: spacing.sm,
    },
    progressBar: {
        flex: 1,
        height: 6,
        backgroundColor: colors.bgTertiary,
        borderRadius: 3,
        overflow: 'hidden',
    },
    progressFill: {
        height: 6,
        backgroundColor: colors.accentTeal,
        borderRadius: 3,
    },
    progressText: {
        ...typography.caption,
        color: colors.textTertiary,
        width: 36,
        textAlign: 'right' as const,
    },

    // Section Badge
    sectionBadge: {
        alignSelf: 'center',
        paddingHorizontal: spacing.lg,
        paddingVertical: spacing.xs,
        backgroundColor: colors.accentTealFaded,
        borderRadius: radius.full,
        marginBottom: spacing.xs,
    },
    sectionBadgeText: {
        ...typography.caption,
        color: colors.accentTeal,
        fontWeight: '600',
    },

    // Loading
    loadingContainer: {
        alignItems: 'center',
        justifyContent: 'center',
        padding: spacing['2xl'],
        gap: spacing.md,
    },
    loadingText: {
        ...typography.body,
        color: colors.textSecondary,
    },

    // Messages
    messageList: { flex: 1 },
    messageListContent: {
        paddingHorizontal: spacing.lg,
        paddingVertical: spacing.md,
        gap: spacing.sm,
    },

    bubbleWrap: {
        flexDirection: 'row',
        alignItems: 'flex-end',
        marginBottom: spacing.sm,
        gap: spacing.sm,
        maxWidth: '85%',
    },
    bubbleWrapPatient: {
        alignSelf: 'flex-end',
        flexDirection: 'row-reverse',
    },
    bubbleWrapSystem: {
        alignSelf: 'center',
        maxWidth: '90%',
    },

    aiAvatar: {
        width: 28,
        height: 28,
        borderRadius: 14,
        backgroundColor: colors.accentTealFaded,
        justifyContent: 'center',
        alignItems: 'center',
        overflow: 'hidden',
    },
    aiAvatarImage: { width: 28, height: 28, borderRadius: 14 },
    aiAvatarText: { fontSize: 14 },
    headerAvatar: { width: 24, height: 24, borderRadius: 12, marginRight: spacing.xs },

    bubble: {
        paddingHorizontal: spacing.lg,
        paddingVertical: spacing.md,
        borderRadius: radius.lg,
        maxWidth: '100%',
    },
    bubbleAi: {
        backgroundColor: colors.bgCard,
        borderBottomLeftRadius: 4,
    },
    bubblePatient: {
        backgroundColor: colors.accentTeal,
        borderBottomRightRadius: 4,
    },
    bubbleSystem: {
        backgroundColor: colors.bgTertiary,
        paddingVertical: spacing.sm,
        paddingHorizontal: spacing.md,
        borderRadius: radius.md,
    },

    bubbleText: { ...typography.body, lineHeight: 22 },
    bubbleTextAi: { color: colors.textPrimary },
    bubbleTextPatient: { color: '#fff' },
    bubbleTextSystem: { ...typography.bodySm, color: colors.textTertiary, textAlign: 'center' as const, fontStyle: 'italic' as const },

    typingDots: {
        ...typography.body,
        color: colors.accentTeal,
        letterSpacing: 4,
    },

    // Input Bar
    inputBar: {
        flexDirection: 'row',
        alignItems: 'flex-end',
        paddingHorizontal: spacing.lg,
        paddingVertical: spacing.sm,
        borderTopWidth: 1,
        borderTopColor: colors.border,
        backgroundColor: colors.bgPrimary,
        gap: spacing.sm,
    },
    textInput: {
        flex: 1,
        backgroundColor: colors.bgTertiary,
        borderRadius: radius.lg,
        paddingHorizontal: spacing.lg,
        paddingVertical: spacing.md,
        ...typography.body,
        color: colors.textPrimary,
        maxHeight: 100,
        borderWidth: 1,
        borderColor: colors.border,
    },
    sendButton: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: colors.accentTeal,
        justifyContent: 'center',
        alignItems: 'center',
    },
    sendButtonDisabled: { opacity: 0.4 },
    sendButtonText: { color: '#fff', fontSize: 18, fontWeight: '700' },

    // Emergency Banner
    emergencyBanner: {
        backgroundColor: '#dc2626',
        padding: spacing.xl,
        margin: spacing.lg,
        borderRadius: radius.lg,
    },
    emergencyTitle: { ...typography.h3, color: '#fff', marginBottom: spacing.sm },
    emergencyText: { ...typography.body, color: '#fff', marginBottom: spacing.md, lineHeight: 22 },
    emergencyNumbers: { gap: spacing.sm, marginBottom: spacing.lg },
    emergencyNumber: { ...typography.h4, color: '#fff' },
    emergencyButton: {
        backgroundColor: '#fff',
        paddingVertical: spacing.md,
        borderRadius: radius.md,
        alignItems: 'center',
    },
    emergencyButtonText: { ...typography.label, color: '#dc2626', fontWeight: '700' },

    // Terminated Banner
    terminatedBanner: {
        backgroundColor: colors.bgCard,
        padding: spacing.xl,
        margin: spacing.lg,
        borderRadius: radius.lg,
        alignItems: 'center',
        gap: spacing.md,
    },
    terminatedText: { ...typography.body, color: colors.error, textAlign: 'center' as const },

    // Section Row (label + skip button)
    sectionRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: spacing.sm,
        marginBottom: spacing.xs,
    },

    // Skip Button
    skipButton: {
        backgroundColor: `${colors.accentTeal}20`,
        borderWidth: 1,
        borderColor: colors.accentTeal,
        paddingHorizontal: spacing.md,
        paddingVertical: spacing.xs,
        borderRadius: radius.full,
    },
    skipButtonText: {
        ...typography.bodySm,
        color: colors.accentTeal,
        fontWeight: '600',
    },

    // Retry / Report Banner
    retryBanner: {
        backgroundColor: `${colors.warning || '#f59e0b'}15`,
        borderWidth: 1,
        borderColor: `${colors.warning || '#f59e0b'}40`,
        borderRadius: radius.lg,
        marginHorizontal: spacing.lg,
        marginBottom: spacing.sm,
        paddingHorizontal: spacing.lg,
        paddingVertical: spacing.md,
        alignItems: 'center' as const,
        gap: spacing.sm,
    },
    retryBannerIcon: {
        fontSize: 28,
    },
    retryBannerText: {
        ...typography.bodySm,
        color: colors.textSecondary,
        textAlign: 'center' as const,
    },
    retryBannerButtons: {
        flexDirection: 'row' as const,
        gap: spacing.sm,
        marginTop: spacing.xs,
    },
    retryButton: {
        backgroundColor: colors.accentTeal,
        paddingHorizontal: spacing.lg,
        paddingVertical: spacing.sm,
        borderRadius: radius.full,
    },
    retryButtonText: {
        ...typography.bodySm,
        color: '#fff',
        fontWeight: '700' as const,
    },
    reportButton: {
        backgroundColor: 'transparent',
        borderWidth: 1,
        borderColor: `${colors.warning || '#f59e0b'}80`,
        paddingHorizontal: spacing.lg,
        paddingVertical: spacing.sm,
        borderRadius: radius.full,
    },
    reportButtonText: {
        ...typography.bodySm,
        color: colors.warning || '#f59e0b',
        fontWeight: '600' as const,
    },
    retryBannerHint: {
        ...typography.bodySm,
        color: colors.accentTeal,
        textAlign: 'center' as const,
        fontStyle: 'italic' as const,
        marginTop: spacing.xs,
    },

    // Header Report Button
    headerReportBtn: {
        paddingHorizontal: spacing.sm,
        paddingVertical: spacing.xs,
    },
    headerReportBtnText: {
        fontSize: 20,
        color: colors.warning || '#f59e0b',
    },

    // Addendum Quick Reply
    addendumQuickReply: {
        paddingHorizontal: spacing.lg,
        paddingVertical: spacing.sm,
        borderTopWidth: 1,
        borderTopColor: colors.border,
    },
    addendumConfirmButton: {
        backgroundColor: `${colors.accentTeal}15`,
        borderWidth: 1,
        borderColor: colors.accentTeal,
        paddingVertical: spacing.md,
        borderRadius: radius.lg,
        alignItems: 'center' as const,
    },
    addendumConfirmText: {
        ...typography.body,
        color: colors.accentTeal,
        fontWeight: '600' as const,
    },

    // AI Consent Screen
    consentContainer: {
        flex: 1,
        justifyContent: 'center' as const,
        alignItems: 'center' as const,
        paddingHorizontal: spacing.xl,
    },
    consentIcon: { fontSize: 56, marginBottom: spacing.xl },
    consentTitle: {
        ...typography.h2,
        color: colors.textPrimary,
        marginBottom: spacing.md,
        textAlign: 'center' as const,
    },
    consentBody: {
        ...typography.body,
        color: colors.textSecondary,
        textAlign: 'center' as const,
        lineHeight: 22,
        marginBottom: spacing.xl,
    },
});
