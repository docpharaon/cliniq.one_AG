import { useState, useRef, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { t, getLocale, isRTL } from '@cliniqone/i18n';
import { useIntakeStore, buildSnapshot, buildFlowEntry, type ChatMessage, SPECIALTY_PATHWAY_MAP } from '../../stores/intakeStore';
import { useAuthStore } from '../../stores/authStore';
import {
    chatSection, fetchDefaultSequence, fetchSequenceByType, filterNodesBySpecialty,
    fetchProtocolConfig, fetchChatbotVersion, checkChatbotEnabled,
    analyzeConcern, checkSpecialtyGate, analyzeIntegrity, classifyPathway,
    type SequenceNode, type SequenceResult, type ChatSectionResult,
} from '../../services/aiService';
import { getVoiceConfig, type VoiceConfig } from '../../services/audioService';
import { supabase } from '@cliniqone/api';
import {
    detectProtocols, setProtocolConfig, parseViolationTag,
    getEscalationLevel, getCooldownMs, getEscalationMessage,
    EMERGENCY_NUMBERS,
} from '../../services/protocolDetection';
import { useVoiceInput } from '../../hooks/useVoiceInput';

import { DisclaimerBanner } from '../../components/DisclaimerBanner';
import { BackButton } from '../../components/BackButton';
import { VoiceInputBar, RecordingIndicator } from '../../components/VoiceInputBar';
import { useToast } from '../../components/ToastProvider';
import { Search, Siren, AlertTriangle, Ban, Mic, ArrowUp } from '@cliniqone/ui';
import aiDoctorAvatar from '../../../assets/ai-doctor-avatar.jpg';

// ── Strip internal AI routing tags before display ──
function stripInternalTags(text: string): string {
    return text
        .replace(/\[ROUTE:\w+\]/gi, '')
        .replace(/\[PATHWAY:\w+\]/gi, '')
        .replace(/\[SECTION_COMPLETE\]/gi, '')
        .replace(/\[ADDENDUM_DONE\]/gi, '')
        .replace(/\[NO_RESPONSE_NEEDED\]/gi, '')
        .replace(/\[VIOLATION:[^\]]+\]/gi, '')
        .trim();
}

// ── Constants (defaults — overridden by platform_settings on mount) ────────────────────────────
const DEFAULT_MAX_TURNS = 40;
const DEFAULT_SECTION_MAX_TURNS = 8;
const AUTO_SAVE_INTERVAL = 30_000;

export default function AiChatPage() {
    const navigate = useNavigate();
    const toast = useToast(s => s.show);
    const lang = getLocale() as 'en' | 'ar';
    const { user } = useAuthStore();

    // Intake store
    const {
        messages, chiefComplaint, specialty, sessionId,
        sequenceNodes, currentNodeIndex, activePathway,
        currentPhase, detectedPathway,
        progressPercent, isAiTyping, protocolFlags, gibberishCount,
        qaHistory, medications, allergies,
        locumDoctor, locumGreetingPrompt,
        addMessage, setAiTyping, setProgress, setSequenceNodes,
        setCurrentNodeIndex, setActivePathway, setSessionId,
        setCurrentPhase, setDetectedPathway, addSequenceFlowEntry,
        setAiSummary, incrementGibberish, resetGibberish,
        addProtocolFlag, addQA, setMedications, setAllergies,
        setAiError, clearAiError, setSpecialty, setChiefComplaint,
    } = useIntakeStore();

    // ── Helper: persist sequence flow to DB (best-effort, non-blocking) ──
    async function persistSequenceFlow() {
        try {
            const state = useIntakeStore.getState();
            if (!state.sessionId) return;
            await supabase.from('intake_sessions').update({
                sequence_flow: state.sequenceFlow,
                detected_pathway: state.detectedPathway,
                current_phase: state.currentPhase,
            }).eq('id', state.sessionId);
        } catch (err) {
            console.warn('[AiChat] persistSequenceFlow failed (migration pending?):', err);
        }
    }

    // Local state
    const [input, setInput] = useState('');
    const [conversationHistory, setConversationHistory] = useState<{ role: string; content: string }[]>([]);
    const [fullConversationHistory, setFullConversationHistory] = useState<{ role: string; content: string }[]>([]);
    const [sectionTurnCount, setSectionTurnCount] = useState(0);
    const sectionTurnCountRef = useRef(0);
    const [cooldownUntil, setCooldownUntil] = useState(0);
    const [chatbotVersion, setChatbotVersion] = useState('');
    const [sectionTimings, setSectionTimings] = useState<Record<string, { startedAt: string; completedAt: string; turnCount: number }>>({});
    const [intakeStartTime] = useState(Date.now());
    const initializedRef = useRef(false);
    const [keyboardHeight, setKeyboardHeight] = useState(0);

    // DB-driven turn limits + voice timing (loaded from platform_settings)
    const [MAX_TURNS, setMaxTurns] = useState(DEFAULT_MAX_TURNS);
    const [SECTION_MAX_TURNS, setSectionMaxTurns] = useState(DEFAULT_SECTION_MAX_TURNS);
    const [autoSendDelayMs, setAutoSendDelayMs] = useState(2500); // default 2.5s, overridden by DB
    useEffect(() => {
        (async () => {
            try {
                const { data } = await supabase
                    .from('platform_settings')
                    .select('key, value')
                    .in('key', ['ai_section_max_turns', 'ai_session_max_turns', 'voice_auto_send_delay_ms']);
                if (data) {
                    for (const row of data) {
                        if (row.key === 'ai_section_max_turns') setSectionMaxTurns(parseInt(row.value) || DEFAULT_SECTION_MAX_TURNS);
                        if (row.key === 'ai_session_max_turns') setMaxTurns(parseInt(row.value) || DEFAULT_MAX_TURNS);
                        if (row.key === 'voice_auto_send_delay_ms') setAutoSendDelayMs(parseInt(row.value) || 2500);
                    }
                }
            } catch { /* fallback to defaults */ }
        })();
    }, []);

    // Voice input state
    const [voiceConfig, setVoiceConfig] = useState<VoiceConfig>({
        enabled: false, defaultMode: 'push_to_talk', maxDuration: 60, silenceThreshold: 2200,
    });
    const [showVoiceInput, setShowVoiceInput] = useState(true); // true = voice mode visible (vs text-only)
    const [autoSendVoice, setAutoSendVoice] = useState(true); // auto-send after transcription (like admin)
    const pendingAutoSendRef = useRef(false);
    const autoSendTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const rtl = isRTL();

    // Voice input hook
    const voiceInput = useVoiceInput({
        onTranscriptReady: (text) => {
            // Inject transcribed text into input
            setInput(prev => prev ? `${prev} ${text.trim()}` : text.trim());
            // If auto-send is on, mark for auto-send
            if (autoSendVoice) {
                pendingAutoSendRef.current = true;
            }
        },
        language: lang,
        voiceConfig,
        enabled: voiceConfig.enabled,
    });

    // Auto-send after voice transcription — with a short delay so the patient
    // has time to read / correct the transcription before it fires.
    // Delay is admin-controllable via platform_settings → voice_auto_send_delay_ms
    useEffect(() => {
        if (pendingAutoSendRef.current && input.trim() && !isAiTyping) {
            pendingAutoSendRef.current = false;
            // Clear any previous pending timer (e.g. if user edits the text)
            if (autoSendTimerRef.current) clearTimeout(autoSendTimerRef.current);
            // If delay is 0, send immediately (no review time)
            if (autoSendDelayMs <= 0) {
                handleSendDirect(input.trim());
                return;
            }
            autoSendTimerRef.current = setTimeout(() => {
                const currentInput = input.trim();
                if (currentInput) handleSendDirect(currentInput);
                autoSendTimerRef.current = null;
            }, autoSendDelayMs);
        }
        return () => {
            if (autoSendTimerRef.current) {
                clearTimeout(autoSendTimerRef.current);
                autoSendTimerRef.current = null;
            }
        };
    }, [input, autoSendDelayMs]);

    // Load voice config on mount
    useEffect(() => {
        getVoiceConfig().then(cfg => setVoiceConfig(cfg));
    }, []);

    // System node UI state
    const [showAnnouncedModal, setShowAnnouncedModal] = useState(false);
    const [showBlockedScreen, setShowBlockedScreen] = useState(false);
    const [gateMessage, setGateMessage] = useState('');
    const [pendingNodeIdx, setPendingNodeIdx] = useState<number | null>(null);

    const chatEndRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLInputElement>(null);

    // Scroll to bottom on new messages
    useEffect(() => {
        chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    // Track keyboard height via visualViewport (works with resize: 'none')
    useEffect(() => {
        const vv = window.visualViewport;
        if (!vv) return;
        const onResize = () => {
            const kbH = window.innerHeight - vv.height;
            setKeyboardHeight(kbH > 50 ? kbH : 0);
            if (kbH > 50) {
                setTimeout(() => chatEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 100);
            }
        };
        vv.addEventListener('resize', onResize);
        vv.addEventListener('scroll', onResize);
        return () => { vv.removeEventListener('resize', onResize); vv.removeEventListener('scroll', onResize); };
    }, []);

    // ── System Node Processing ─────────────────
    async function processSystemNode(nodeIdx: number, nodes: SequenceNode[]) {
        const node = nodes[nodeIdx];
        if (!node) return;

        // ── Pathway Classification (Node ③) ──────────────
        if (node.node_type === 'system_classify' && node.step_key === 'pathway_classify') {
            // Silent processing — no UI message (matches admin sandbox behavior)
            setAiTyping(true);

            try {
                if (locumDoctor) {
                    // Locum: skip classification, use doctor's specialty directly
                    setSpecialty(locumDoctor.specialty);
                    setDetectedPathway('new_visit');
                    if (SPECIALTY_PATHWAY_MAP[locumDoctor.specialty]) {
                        setActivePathway(SPECIALTY_PATHWAY_MAP[locumDoctor.specialty]);
                    }

                    // Load the locum doctor's specialty sequence
                    let result = await fetchSequenceByType('specialty', locumDoctor.specialty);
                    if (result.nodes.length === 0) {
                        result = await fetchSequenceByType('specialty', 'family_medicine');
                    }

                    addSequenceFlowEntry(buildFlowEntry('specialty', result));
                    setSequenceNodes(result.nodes);
                    setCurrentPhase('specialty');
                    setCurrentNodeIndex(0);
                    setAiTyping(false);
                    await persistSequenceFlow();
                    await advanceToNode(0, result.nodes);
                    return;
                }

                // 1. Classify pathway (refill / follow_up / new_visit)
                const pathwayResult = await classifyPathway(
                    [...fullConversationHistory, ...conversationHistory],
                    lang,
                );
                setDetectedPathway(pathwayResult.pathway);
                console.log('[AiChat] Pathway classified:', pathwayResult);

                if (pathwayResult.pathway === 'new_visit') {
                    // 2. Analyze specialty
                    const patientMsgs = messages.filter(m => m.role === 'patient');
                    const complaintText = patientMsgs.map(m => m.content).join(' ') || chiefComplaint;
                    const analysis = await analyzeConcern(complaintText, lang);
                    const determined = analysis.specialty || 'family_medicine';
                    setSpecialty(determined);
                    setChiefComplaint(complaintText);
                    console.log('[AiChat] Specialty detected:', determined, 'complaint:', complaintText);

                    // 3. Load specialty sequence
                    let specialtyResult = await fetchSequenceByType('specialty', determined);
                    console.log(`[AiChat] Specialty sequence "${determined}":`, specialtyResult.nodes.length, 'nodes');
                    if (specialtyResult.nodes.length === 0) {
                        console.warn(`[AiChat] No specialty sequence for "${determined}", falling back to FM`);
                        specialtyResult = await fetchSequenceByType('specialty', 'family_medicine');
                        console.log('[AiChat] FM fallback:', specialtyResult.nodes.length, 'nodes');
                    }

                    // 4. If still no nodes, fall back to legacy flow
                    if (specialtyResult.nodes.length === 0) {
                        console.warn('[AiChat] No specialty sequences available, falling back to legacy flow');
                        const legacyResult = await fetchDefaultSequence();
                        addSequenceFlowEntry(buildFlowEntry('specialty', legacyResult));
                        const filtered = filterNodesBySpecialty(legacyResult.nodes, determined);
                        setSequenceNodes(filtered);
                        const firstChat = filtered.findIndex(n => n.node_type === 'chat' && n.step_key !== 'greeting');
                        setCurrentNodeIndex(firstChat >= 0 ? firstChat : 0);
                        setAiTyping(false);
                        await persistSequenceFlow();
                        await advanceToNode(firstChat >= 0 ? firstChat : 0, filtered);
                        return;
                    }

                    // Filter to chat nodes only, skip greeting (already done in global_intake)
                    // This matches admin sandbox behavior exactly
                    const chatNodes = specialtyResult.nodes.filter(
                        n => (n.node_type === 'chat' || !n.node_type) && n.step_key !== 'greeting'
                    );
                    console.log('[AiChat] Specialty chat nodes (post-filter):', chatNodes.length, chatNodes.map(n => n.step_key));

                    if (chatNodes.length === 0) {
                        // All nodes were system/greeting — fall back to FM
                        console.warn('[AiChat] Specialty sequence had no usable chat nodes, falling back to FM');
                        specialtyResult = await fetchSequenceByType('specialty', 'family_medicine');
                        const fmChatNodes = specialtyResult.nodes.filter(
                            n => (n.node_type === 'chat' || !n.node_type) && n.step_key !== 'greeting'
                        );
                        if (fmChatNodes.length > 0) {
                            addSequenceFlowEntry(buildFlowEntry('specialty', specialtyResult));
                            setSequenceNodes(fmChatNodes);
                            setCurrentPhase('specialty');
                            setCurrentNodeIndex(0);
                            setAiTyping(false);
                            await persistSequenceFlow();
                            await advanceToNode(0, fmChatNodes);
                            return;
                        }
                    }

                    addSequenceFlowEntry(buildFlowEntry('specialty', specialtyResult));
                    setSequenceNodes(chatNodes);
                    setCurrentPhase('specialty');
                    setCurrentNodeIndex(0);
                    setAiTyping(false);
                    await persistSequenceFlow();
                    await advanceToNode(0, chatNodes);
                } else if (pathwayResult.pathway === 'refill') {
                    // ── Refill Pathway ──────────────────────────
                    console.log('[AiChat] Loading refill pathway');
                    const patientMsgs = messages.filter(m => m.role === 'patient');
                    const complaintText = patientMsgs.map(m => m.content).join(' ') || chiefComplaint;
                    setChiefComplaint(complaintText);
                    setSpecialty('family_medicine'); // Refills default to FM

                    // 1. Try loading the dedicated refill sequence
                    let refillResult = await fetchSequenceByType('refill');

                    // 2. Fallback: FM specialty sequence
                    if (refillResult.nodes.length === 0) {
                        console.warn('[AiChat] No refill sequence found, falling back to FM specialty');
                        refillResult = await fetchSequenceByType('specialty', 'family_medicine');
                    }

                    // 3. Ultimate fallback: legacy
                    if (refillResult.nodes.length === 0) {
                        const legacyResult = await fetchDefaultSequence();
                        refillResult = { ...legacyResult, nodes: filterNodesBySpecialty(legacyResult.nodes, 'family_medicine') };
                    }

                    addSequenceFlowEntry(buildFlowEntry('refill', refillResult));
                    setSequenceNodes(refillResult.nodes);
                    setCurrentPhase('refill');
                    setCurrentNodeIndex(0);
                    setAiTyping(false);
                    await persistSequenceFlow();
                    await advanceToNode(0, refillResult.nodes);

                } else {
                    // ── Follow-Up Pathway ───────────────────────
                    console.log('[AiChat] Loading follow-up pathway');
                    const patientMsgs = messages.filter(m => m.role === 'patient');
                    const complaintText = patientMsgs.map(m => m.content).join(' ') || chiefComplaint;
                    setChiefComplaint(complaintText);

                    // Analyze specialty for the follow-up context
                    const analysis = await analyzeConcern(complaintText, lang);
                    setSpecialty(analysis.specialty || 'family_medicine');

                    // 1. Try loading the dedicated follow-up sequence
                    let followupResult = await fetchSequenceByType('followup');

                    // 2. Fallback: specialty sequence for the detected concern
                    if (followupResult.nodes.length === 0) {
                        console.warn('[AiChat] No follow-up sequence found, falling back to specialty');
                        const determined = useIntakeStore.getState().specialty;
                        followupResult = await fetchSequenceByType('specialty', determined);
                        if (followupResult.nodes.length === 0) {
                            followupResult = await fetchSequenceByType('specialty', 'family_medicine');
                        }
                    }

                    // 3. Ultimate fallback: legacy
                    if (followupResult.nodes.length === 0) {
                        const legacyResult = await fetchDefaultSequence();
                        followupResult = { ...legacyResult, nodes: filterNodesBySpecialty(legacyResult.nodes, 'family_medicine') };
                    }

                    addSequenceFlowEntry(buildFlowEntry('followup', followupResult));
                    setSequenceNodes(followupResult.nodes);
                    setCurrentPhase('followup');
                    setCurrentNodeIndex(0);
                    setAiTyping(false);
                    await persistSequenceFlow();
                    await advanceToNode(0, followupResult.nodes);
                }
            } catch (err) {
                console.error('[AiChat] Pathway/specialty classification failed:', err);
                setAiTyping(false);
                // Fallback: load FM sequence
                const fmResult = await fetchSequenceByType('specialty', 'family_medicine');
                if (fmResult.nodes.length > 0) {
                    addSequenceFlowEntry(buildFlowEntry('specialty', fmResult));
                    setSequenceNodes(fmResult.nodes);
                    setCurrentPhase('specialty');
                    setCurrentNodeIndex(0);
                    await persistSequenceFlow();
                    await advanceToNode(0, fmResult.nodes);
                } else {
                    // Ultimate fallback: legacy flow
                    const legacyResult = await fetchDefaultSequence();
                    addSequenceFlowEntry(buildFlowEntry('specialty', legacyResult));
                    setSequenceNodes(legacyResult.nodes);
                    setCurrentNodeIndex(0);
                    await persistSequenceFlow();
                    await advanceToNode(0, legacyResult.nodes);
                }
            }
            return;
        }

        // ── Legacy: Complaint Analysis (for backward compat with legacy sequences) ──
        if (node.node_type === 'system_analysis' && node.step_key === 'complaint_analysis') {
            // Silent processing — no UI message (matches admin sandbox behavior)
            setAiTyping(true);

            try {
                if (locumDoctor) {
                    setSpecialty(locumDoctor.specialty);
                    if (SPECIALTY_PATHWAY_MAP[locumDoctor.specialty]) {
                        setActivePathway(SPECIALTY_PATHWAY_MAP[locumDoctor.specialty]);
                    }
                } else {
                    const patientMsgs = messages.filter(m => m.role === 'patient');
                    const complaintText = patientMsgs.map(m => m.content).join(' ') || chiefComplaint;
                    const analysis = await analyzeConcern(complaintText, lang);
                    const determined = analysis.specialty || 'family_medicine';
                    setSpecialty(determined);
                    setChiefComplaint(complaintText);
                    if (SPECIALTY_PATHWAY_MAP[determined]) {
                        setActivePathway(SPECIALTY_PATHWAY_MAP[determined]);
                    }
                }
            } catch (err) {
                console.error('[AiChat] Complaint analysis failed, defaulting to family_medicine:', err);
                setSpecialty('family_medicine');
            }

            setAiTyping(false);

            const currentSpecialty = useIntakeStore.getState().specialty;
            const filteredNodes = filterNodesBySpecialty(nodes, currentSpecialty);
            setSequenceNodes(filteredNodes);

            const gateIdx = filteredNodes.findIndex(n => n.step_key === 'specialty_gate');
            if (gateIdx >= 0) {
                await processSystemNode(gateIdx, filteredNodes);
            } else {
                const analysisIdx = filteredNodes.findIndex(n => n.step_key === 'complaint_analysis');
                const nextIdx = analysisIdx >= 0 ? analysisIdx + 1 : nodeIdx + 1;
                await advanceToNode(nextIdx, filteredNodes);
            }
            return;
        }

        if (node.node_type === 'system_gate' && node.step_key === 'specialty_gate') {
            // 🛡️ Specialty Gate — check availability
            const currentSpecialty = useIntakeStore.getState().specialty;
            try {
                const gate = await checkSpecialtyGate(currentSpecialty, chiefComplaint || 'general concern', lang);

                if (gate.allowed) {
                    await advanceToNode(nodeIdx + 1, nodes);
                    return;
                }

                if (gate.redirected && gate.mode === 'silent') {
                    setSpecialty('family_medicine');
                    // In phase model: reload FM specialty sequence
                    const phase = useIntakeStore.getState().currentPhase;
                    if (phase === 'specialty') {
                        const fmResult = await fetchSequenceByType('specialty', 'family_medicine');
                        if (fmResult.nodes.length > 0) {
                            addSequenceFlowEntry(buildFlowEntry('specialty', fmResult));
                            setSequenceNodes(fmResult.nodes);
                            setCurrentNodeIndex(0);
                            await persistSequenceFlow();
                            await advanceToNode(0, fmResult.nodes);
                            return;
                        }
                    }
                    await advanceToNode(nodeIdx + 1, nodes);
                    return;
                }

                if (gate.redirected && gate.mode === 'announced') {
                    setGateMessage(gate.patientMessage || 'This specialty is temporarily unavailable. We can connect you with Family Medicine instead.');
                    setPendingNodeIdx(nodeIdx + 1);
                    setShowAnnouncedModal(true);
                    return;
                }

                if (gate.blocked) {
                    setGateMessage(gate.apologyMessage || 'We are unable to process this type of concern at this time. Please contact your healthcare provider directly.');
                    setShowBlockedScreen(true);
                    return;
                }

                await advanceToNode(nodeIdx + 1, nodes);
            } catch (err) {
                console.error('[AiChat] Specialty gate failed, proceeding:', err);
                await advanceToNode(nodeIdx + 1, nodes);
            }
            return;
        }

        // ── System Integrity Node — silent end-of-session analysis ──
        if (node.node_type === 'system_integrity') {
            try {
                const state = useIntakeStore.getState();
                const report = await analyzeIntegrity({
                    conversationHistory,
                    sectionTimings,
                    metadata: {
                        totalDurationMs: Date.now() - intakeStartTime,
                        interruptions: 0,
                        pathway: state.detectedPathway || state.activePathway || 'new_visit',
                        detectedSpecialty: state.specialty,
                        strikeCount: state.gibberishCount,
                        violationTypes: state.protocolFlags,
                    },
                });

                if (sessionId) {
                    await supabase
                        .from('intake_sessions')
                        .update({ integrity_report: report })
                        .eq('id', sessionId);
                }
            } catch (err) {
                console.warn('[AiChat] Integrity analysis failed (non-blocking):', err);
            }

            await advanceToNode(nodeIdx + 1, nodes);
            return;
        }

        // Unknown system node — skip it
        await advanceToNode(nodeIdx + 1, nodes);
    }

    // ── Advance to a chat node ─────────────────
    async function advanceToNode(nodeIdx: number, nodes: SequenceNode[]) {
        const activeNodes = nodes || sequenceNodes;
        console.log(`[AiChat] advanceToNode(${nodeIdx}/${activeNodes.length})`, activeNodes[nodeIdx]?.step_key || 'END', 'type:', activeNodes[nodeIdx]?.node_type);
        if (nodeIdx >= activeNodes.length) {
            // ── Phase transition: end of current phase ──
            const phase = useIntakeStore.getState().currentPhase;
            console.log(`[AiChat] Phase "${phase}" exhausted, checking transitions...`);

            if (phase === 'intake') {
                // ── Intake → Specialty phase transition (matches admin sandbox) ──
                console.log('[AiChat] Intake complete → detecting specialty & loading Phase 2');
                setAiTyping(true);
                try {
                    const patientMsgs = messages.filter(m => m.role === 'patient');
                    const complaintText = patientMsgs.map(m => m.content).join(' ') || chiefComplaint;
                    setChiefComplaint(complaintText);

                    // Classify pathway
                    const pathwayResult = await classifyPathway(
                        [...fullConversationHistory, ...conversationHistory],
                        lang,
                    );
                    setDetectedPathway(pathwayResult.pathway);
                    console.log('[AiChat] Pathway:', pathwayResult.pathway);

                    // Analyze specialty
                    const analysis = await analyzeConcern(complaintText, lang);
                    const determined = analysis.specialty || 'family_medicine';
                    setSpecialty(determined);
                    console.log('[AiChat] Specialty:', determined);

                    // Load specialty sequence
                    let specResult = await fetchSequenceByType('specialty', determined);
                    console.log(`[AiChat] Specialty "${determined}":`, specResult.nodes.length, 'raw nodes');
                    if (specResult.nodes.length === 0) {
                        specResult = await fetchSequenceByType('specialty', 'family_medicine');
                        console.log('[AiChat] FM fallback:', specResult.nodes.length, 'raw nodes');
                    }

                    // Filter to chat-only, skip greeting (matches admin)
                    const chatNodes = specResult.nodes.filter(
                        n => (n.node_type === 'chat' || !n.node_type) && n.step_key !== 'greeting'
                    );
                    console.log('[AiChat] Specialty chat nodes:', chatNodes.length, chatNodes.map(n => n.step_key));

                    if (chatNodes.length > 0) {
                        addSequenceFlowEntry(buildFlowEntry('specialty', specResult));
                        setSequenceNodes(chatNodes);
                        setCurrentPhase('specialty');
                        setCurrentNodeIndex(0);
                        setAiTyping(false);
                        setFullConversationHistory(prev => [...prev, ...conversationHistory]);
                        setConversationHistory([]);
                        await persistSequenceFlow();
                        await advanceToNode(0, chatNodes);
                        return;
                    }
                } catch (err) {
                    console.error('[AiChat] Intake→specialty failed:', err);
                }
                setAiTyping(false);
            }

            if (phase === 'specialty' || phase === 'refill' || phase === 'followup') {
                // Specialty/refill/followup done → load global_wrapup
                console.log(`[AiChat] Phase "${phase}" complete → wrapup`);
                const wrapupResult = await fetchSequenceByType('global_wrapup');
                const wrapupChatNodes = wrapupResult.nodes.filter(
                    n => (n.node_type === 'chat' || !n.node_type) && n.step_key !== 'greeting'
                );
                console.log(`[AiChat] Wrapup: ${wrapupResult.nodes.length} total, ${wrapupChatNodes.length} chat`);
                if (wrapupChatNodes.length > 0) {
                    addSequenceFlowEntry(buildFlowEntry('wrapup', wrapupResult));
                    setSequenceNodes(wrapupChatNodes);
                    setCurrentPhase('wrapup');
                    setCurrentNodeIndex(0);
                    await persistSequenceFlow();
                    await advanceToNode(0, wrapupChatNodes);
                    return;
                }
            }

            // All phases done → review
            console.log('[AiChat] All phases exhausted → review');
            navigate('/intake/review');
            return;
        }

        const node = activeNodes[nodeIdx];

        // Skip system nodes silently (matches admin sandbox — system logic runs at phase boundaries)
        if (node.node_type && node.node_type !== 'chat') {
            console.log(`[AiChat] Skipping system node: ${node.step_key} (${node.node_type})`);
            await advanceToNode(nodeIdx + 1, activeNodes);
            return;
        }

        // Record completion time for previous section
        const prevNode = activeNodes[currentNodeIndex];
        if (prevNode && sectionTimings[prevNode.step_key]?.startedAt) {
            setSectionTimings(prev => ({
                ...prev,
                [prevNode.step_key]: { ...prev[prevNode.step_key], completedAt: new Date().toISOString(), turnCount: sectionTurnCount },
            }));
        }

        // Normal chat node — send first AI message for this section
        setCurrentNodeIndex(nodeIdx);
        setSectionTurnCount(0);
        sectionTurnCountRef.current = 0;
        setProgress(getProgressForNode(nodeIdx, activeNodes.length));
        // Accumulate full history across sections for context continuity
        setFullConversationHistory(prev => [...prev, ...conversationHistory]);
        setConversationHistory([]); // Reset per-section history for section-scoped logic

        // Record start time for this section
        setSectionTimings(prev => ({
            ...prev,
            [node.step_key]: { startedAt: new Date().toISOString(), completedAt: '', turnCount: 0 },
        }));

        if (!node.prompt_id || !node.ai_prompts?.content) {
            // No prompt — auto-advance
            await advanceToNode(nodeIdx + 1, activeNodes);
            return;
        }

        // Auto-ask: immediately get the AI's first question for this section
        // (matches admin sandbox behavior — seamless section transitions)
        setAiTyping(true);
        try {
            const currentState = useIntakeStore.getState();
            const patientContext = `Chief Complaint: ${currentState.chiefComplaint}\nSpecialty: ${currentState.specialty}\nMedications: ${currentState.medications.join(', ')}\nAllergies: ${currentState.allergies.join(', ')}\n\nPrevious conversation summary (${fullConversationHistory.length} messages exchanged so far).`;

            const result = await chatSection({
                section: node.step_key,
                promptId: node.prompt_id || undefined,
                conversationHistory: [],  // Fresh section — context comes via patientContext
                language: lang,
                patientContext,
            });

            const { cleanContent } = parseViolationTag(result.response);
            const displayContent = stripInternalTags(cleanContent);
            addMessage(createAiMsg(displayContent, node.label));
            setConversationHistory([
                { role: 'assistant', content: displayContent },
            ]);
        } catch (err) {
            console.error('[AiChat] Section start error:', err);
            addMessage(createAiMsg(t('aiChat.errorMessage'), node.label));
        } finally {
            setAiTyping(false);
        }
    }

    // ── Gate modal handlers ────────────────────
    function handleAnnouncedContinue() {
        setShowAnnouncedModal(false);
        setSpecialty('family_medicine');
        if (pendingNodeIdx !== null) {
            advanceToNode(pendingNodeIdx, sequenceNodes);
        }
    }

    function handleAnnouncedCancel() {
        setShowAnnouncedModal(false);
        navigate('/', { replace: true });
    }

    function handleBlockedReturn() {
        setShowBlockedScreen(false);
        navigate('/', { replace: true });
    }

    // ── Initialize sequence + first AI message ──
    useEffect(() => {
        if (initializedRef.current) return;
        initializedRef.current = true;

        (async () => {
            try {
                // Load protocol config
                const config = await fetchProtocolConfig();
                if (Object.keys(config).length > 0) setProtocolConfig(config as any);

                // Load chatbot version
                const ver = await fetchChatbotVersion();
                setChatbotVersion(ver);

                // Check if enabled
                const enabled = await checkChatbotEnabled();
                if (!enabled) {
                    toast('AI Chatbot is currently disabled by admin.', 'warning');
                    navigate('/intake', { replace: true });
                    return;
                }

                // ── Three-Phase Model: load global_intake sequence first ──
                let intakeResult = await fetchSequenceByType('global_intake');
                if (intakeResult.nodes.length === 0) {
                    // Fallback: legacy monolithic sequence
                    console.warn('[AiChat] No global_intake sequence found, falling back to legacy');
                    intakeResult = await fetchDefaultSequence();
                }
                addSequenceFlowEntry(buildFlowEntry('intake', intakeResult));
                const nodes = intakeResult.nodes;
                setSequenceNodes(nodes);
                setCurrentPhase('intake');

                // Create session
                const { data: session, error: sessionErr } = await supabase
                    .from('intake_sessions')
                    .insert({
                        patient_id: user?.id,
                        chief_complaint: chiefComplaint || 'Pending — captured in chat',
                        specialty: locumDoctor?.specialty || 'pending',
                        status: 'in_progress',
                    })
                    .select('id')
                    .single();

                if (!sessionErr && session) {
                    setSessionId(session.id);
                }

                // Send first AI message (greeting node)
                if (nodes.length > 0) {
                    await sendFirstMessage(nodes);
                }
            } catch (err) {
                console.error('[AiChat] Init error:', err);
                toast('Failed to start AI chat. Please try again.', 'error');
            }
        })();
    }, []);

    async function sendFirstMessage(nodes: SequenceNode[]) {
        const firstNode = nodes[0];

        // If first node is a system node, skip to first chat node
        if (firstNode.node_type !== 'chat') {
            const firstChatIdx = nodes.findIndex(n => n.node_type === 'chat');
            if (firstChatIdx >= 0) {
                await advanceToNode(firstChatIdx, nodes);
            }
            return;
        }

        // Check if locum — use locum greeting instead
        if (locumDoctor && locumGreetingPrompt) {
            setAiTyping(true);
            try {
                const result = await chatSection({
                    section: 'greeting',
                    promptId: firstNode.prompt_id || undefined,
                    conversationHistory: [{ role: 'user', content: `Locum greeting for Dr. ${locumDoctor.display_name}` }],
                    language: lang,
                    patientContext: `Locum doctor: ${locumDoctor.display_name}, Specialty: ${locumDoctor.specialty}`,
                });

                const { cleanContent } = parseViolationTag(result.response);
                const displayContent = stripInternalTags(cleanContent);
                addMessage(createAiMsg(displayContent, `Welcome • Dr. ${locumDoctor.display_name}`));
                setConversationHistory([{ role: 'assistant', content: displayContent }]);
            } catch {
                addMessage(createAiMsg(
                    `Welcome! Dr. ${locumDoctor.display_name} will be reviewing your case. What health concern brought you in today?`,
                    `Welcome • Dr. ${locumDoctor.display_name}`
                ));
            } finally {
                setAiTyping(false);
            }
            setProgress(getProgressForNode(0, nodes.length));
            return;
        }

        // Normal greeting
        if (!firstNode.prompt_id || !firstNode.ai_prompts?.content) {
            addMessage(createAiMsg(t('aiChat.welcomeMessage')));
            setProgress(getProgressForNode(0, nodes.length));
            return;
        }

        setAiTyping(true);
        try {
            const result = await chatSection({
                section: firstNode.step_key,
                promptId: firstNode.prompt_id || undefined,
                conversationHistory: [{ role: 'user', content: 'Patient has just started the interview.' }],
                language: lang,
                patientContext: 'New patient — greeting phase',
            });

            const { cleanContent } = parseViolationTag(result.response);
            const displayContent = stripInternalTags(cleanContent);
            addMessage(createAiMsg(displayContent, firstNode.label));
            setConversationHistory([
                { role: 'assistant', content: displayContent },
            ]);
            setProgress(getProgressForNode(0, nodes.length));
        } catch (err) {
            console.error('[AiChat] First message error:', err);
            addMessage(createAiMsg(t('aiChat.welcomeMessage')));
        } finally {
            setAiTyping(false);
        }
    }

    async function handleSend() {
        handleSendDirect(input.trim());
    }

    async function handleSendDirect(textToSend?: string) {
        const text = (textToSend || input).trim();
        if (!text || isAiTyping) return;
        if (Date.now() < cooldownUntil) return;
        if (!navigator.onLine) {
            toast(t('common.offlineAction'), 'error');
            return;
        }

        setInput('');

        // Protocol detection (client-side)
        const recentPatientMsgs = messages.filter(m => m.role === 'patient').slice(-5).map(m => m.content);
        const { violations, newGibberishCount } = detectProtocols(text, gibberishCount, recentPatientMsgs);

        if (violations.length > 0) {
            const v = violations[0];

            // Persist updated gibberish count to store
            for (let i = gibberishCount; i < newGibberishCount; i++) {
                incrementGibberish();
            }

            if (v.code === 'A') {
                addMessage(createPatientMsg(text));
                addMessage(createSystemMsg(`EMERGENCY: ${v.message}\n\nEmergency Numbers (Saudi Arabia):\nAmbulance: 997\nPolice: 999\nFire: 998`));
                addProtocolFlag('EMERGENCY');
                return;
            }

            const escalation = getEscalationLevel(newGibberishCount);
            if (escalation === 'terminated') {
                addMessage(createPatientMsg(text));
                addMessage(createSystemMsg(getEscalationMessage(newGibberishCount)));
                return;
            }
            if (escalation === 'cooldown') {
                setCooldownUntil(Date.now() + getCooldownMs());
                addMessage(createPatientMsg(text));
                addMessage(createSystemMsg(getEscalationMessage(newGibberishCount)));
                return;
            }
            if (escalation === 'warning') {
                addMessage(createPatientMsg(text));
                addMessage(createSystemMsg(v.message));
                return; // Block sending gibberish to AI at warning level
            }
        } else {
            resetGibberish();
        }

        // Add patient message
        addMessage(createPatientMsg(text));

        // Check turn limit
        const totalTurns = messages.filter(m => m.role === 'patient').length + 1;
        if (totalTurns >= MAX_TURNS) {
            addMessage(createAiMsg(t('aiChat.maxTurnsReached')));
            navigate('/intake/review');
            return;
        }

        // Send to AI
        setAiTyping(true);
        try {
            const currentNode = sequenceNodes[currentNodeIndex];
            const section = currentNode?.step_key || 'hpi';
            const currentState = useIntakeStore.getState();
            const patientContext = `Chief Complaint: ${currentState.chiefComplaint}\nSpecialty: ${currentState.specialty}\nMedications: ${currentState.medications.join(', ')}\nAllergies: ${currentState.allergies.join(', ')}`;

            // ── Greeting auto-advance (matches admin sandbox) ──
            // After user's first message in greeting, immediately advance to next section.
            // The greeting is a 1-turn section — user says what brought them in, we move on.
            if (section === 'greeting') {
                // Add QA pair for greeting
                const lastAiMsg = messages.filter(m => m.role === 'ai').pop();
                if (lastAiMsg) addQA(lastAiMsg.content, text);

                // Save greeting context
                setFullConversationHistory(prev => [...prev, ...conversationHistory, { role: 'user', content: text }]);
                setConversationHistory([]);
                setSectionTurnCount(0);
                sectionTurnCountRef.current = 0;

                // Advance immediately — no follow-up in greeting
                const nextIdx = currentNodeIndex + 1;
                setAiTyping(false);
                await advanceToNode(nextIdx, sequenceNodes);

                clearAiError();
                return;
            }

            const newHistory = [...conversationHistory, { role: 'user', content: text }];

            const result = await chatSection({
                section,
                promptId: currentNode?.prompt_id || undefined,
                conversationHistory: newHistory,
                language: lang,
                patientContext,
            });

            const { cleanContent, violation } = parseViolationTag(result.response);
            const displayContent = stripInternalTags(cleanContent);

            // Add QA pair
            const lastAiMsg = messages.filter(m => m.role === 'ai').pop();
            if (lastAiMsg) addQA(lastAiMsg.content, text);

            // Update conversation history
            setConversationHistory([...newHistory, { role: 'assistant', content: displayContent }]);
            addMessage(createAiMsg(displayContent, currentNode?.label));

            // Check section completion
            const newTurnCount = sectionTurnCountRef.current + 1;
            sectionTurnCountRef.current = newTurnCount;
            setSectionTurnCount(newTurnCount);

            // Use per-node max_turns if set, otherwise global default
            const nodeMaxTurns = currentNode?.max_turns || SECTION_MAX_TURNS;
            if (result.sectionComplete || newTurnCount >= nodeMaxTurns) {
                const nextIdx = currentNodeIndex + 1;
                await advanceToNode(nextIdx, sequenceNodes);
            }

            clearAiError();
        } catch (err: any) {
            const isTimeout = err?.name === 'AITimeoutError';
            setAiError(isTimeout ? 'timeout' : 'error', text);
            addMessage(createSystemMsg(
                isTimeout ? t('aiChat.timeoutMessage') : t('aiChat.errorMessage'),
            ));
        } finally {
            setAiTyping(false);
        }
    }

    // ── Phase 2: Auto-Listen ─────────────────────
    // When AI finishes responding and voice is in auto-mic mode, auto-reopen mic
    useEffect(() => {
        if (
            !isAiTyping &&
            voiceConfig.enabled &&
            showVoiceInput &&
            voiceInput.voiceMode === 'auto_mic' &&
            voiceInput.voiceState === 'idle' &&
            messages.length > 0 &&
            messages[messages.length - 1]?.role === 'ai'
        ) {
            // Brief delay so the patient can read the AI response
            const timer = setTimeout(() => {
                voiceInput.startListening();
            }, 1200);
            return () => clearTimeout(timer);
        }
    }, [isAiTyping, voiceInput.voiceMode, voiceInput.voiceState, messages.length]);

    // Auto-save snapshot periodically (includes sequence flow tracking)
    useEffect(() => {
        if (!sessionId) return;
        const timer = setInterval(async () => {
            const state = useIntakeStore.getState();
            const snapshot = buildSnapshot(state, { conversationHistory, sectionTurnCount });
            // Always save the snapshot
            await supabase.from('intake_sessions').update({
                snapshot: snapshot as any,
            }).eq('id', sessionId);
            // Best-effort: persist sequence tracking (columns may not exist yet)
            persistSequenceFlow();
        }, AUTO_SAVE_INTERVAL);
        return () => clearInterval(timer);
    }, [sessionId, conversationHistory, sectionTurnCount]);

    return (
        <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', backgroundColor: 'var(--bg-primary)', paddingBottom: keyboardHeight > 0 ? keyboardHeight : 0, transition: 'padding-bottom 0.15s ease-out' }}>
            {/* Header */}
            <div style={{ padding: '12px 20px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: 12, flexShrink: 0 }}>
                <BackButton />
                <img
                    src={aiDoctorAvatar}
                    alt="AI Doctor"
                    style={{
                        width: 36, height: 36, borderRadius: '50%', objectFit: 'cover',
                        border: '2px solid #1A8A9E', flexShrink: 0,
                    }}
                />
                <div style={{ flex: 1 }}>
                    <p style={{ fontSize: 15, fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>{t('aiChat.headerTitle')}</p>
                    <p style={{ fontSize: 11, color: 'var(--text-tertiary)', margin: 0 }}>
                        {sequenceNodes[currentNodeIndex]?.label || t('aiChat.gettingStarted')}
                        {chatbotVersion && ` • ${chatbotVersion}`}
                        {locumDoctor && ` • Dr. ${locumDoctor.display_name}`}
                    </p>
                </div>
                {voiceInput.voiceState === 'listening' && <RecordingIndicator isRTL={rtl} />}
            </div>

            {/* Progress Bar */}
            <div style={{ height: 3, backgroundColor: 'var(--bg-card)', flexShrink: 0 }}>
                <div style={{ height: 3, width: `${progressPercent}%`, backgroundColor: '#1A8A9E', transition: 'width 0.5s' }} />
            </div>

            {/* Messages */}
            <div style={{ flex: 1, overflowY: 'auto', padding: '16px 20px' }}>
                {messages.map((msg) => (
                    <div key={msg.id} style={{
                        display: 'flex',
                        justifyContent: msg.role === 'patient' ? 'flex-end' : 'flex-start',
                        alignItems: 'flex-end',
                        gap: 8,
                        marginBottom: 10,
                    }}>
                        {/* AI avatar — shown for ai messages */}
                        {msg.role === 'ai' && (
                            <img
                                src={aiDoctorAvatar}
                                alt="AI"
                                style={{
                                    width: 28, height: 28, borderRadius: '50%', objectFit: 'cover',
                                    border: '1.5px solid #1A8A9E', flexShrink: 0,
                                }}
                            />
                        )}
                        <div style={{
                            maxWidth: msg.role === 'ai' ? 'calc(80% - 36px)' : '80%',
                            padding: '10px 14px',
                            borderRadius: msg.role === 'patient' ? '14px 14px 4px 14px' : '14px 14px 14px 4px',
                            backgroundColor: msg.role === 'patient' ? '#1A8A9E' : msg.role === 'system' ? '#D9770620' : 'var(--bg-card)',
                            color: msg.role === 'patient' ? '#fff' : msg.role === 'system' ? '#D97706' : 'var(--text-primary)',
                            fontSize: 14, lineHeight: '20px',
                            border: msg.role === 'system' ? '1px solid #D9770640' : 'none',
                        }}>
                            {msg.sectionLabel && msg.role === 'ai' && (
                                <p style={{ fontSize: 10, fontWeight: 700, color: '#1A8A9E', margin: '0 0 4px', textTransform: 'uppercase' }}>
                                    {msg.sectionLabel}
                                </p>
                            )}
                            <p style={{ margin: 0, whiteSpace: 'pre-wrap' }}>{msg.content}</p>
                            {msg.options && msg.options.length > 0 && (
                                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 8 }}>
                                    {msg.options.map((opt, i) => (
                                        <button key={i} onClick={() => { setInput(opt); }}
                                            style={{
                                                padding: '6px 12px', borderRadius: 16, border: '1px solid var(--border)',
                                                backgroundColor: 'var(--bg-primary)', color: 'var(--text-secondary)', fontSize: 12,
                                                cursor: 'pointer',
                                            }}>
                                            {opt}
                                        </button>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                ))}

                {isAiTyping && (
                    <div style={{ display: 'flex', justifyContent: 'flex-start', alignItems: 'flex-end', gap: 8, marginBottom: 10 }}>
                        <img
                            src={aiDoctorAvatar}
                            alt="AI"
                            style={{
                                width: 28, height: 28, borderRadius: '50%', objectFit: 'cover',
                                border: '1.5px solid #1A8A9E', flexShrink: 0,
                            }}
                        />
                        <div style={{ padding: '10px 14px', borderRadius: '14px 14px 14px 4px', backgroundColor: 'var(--bg-card)' }}>
                            <span className="typing-dots" style={{ display: 'inline-flex', gap: 4, alignItems: 'center' }}>
                                <span style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--text-tertiary)', animation: 'typingBounce 1.4s ease infinite', animationDelay: '0s' }} />
                                <span style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--text-tertiary)', animation: 'typingBounce 1.4s ease infinite', animationDelay: '0.2s' }} />
                                <span style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--text-tertiary)', animation: 'typingBounce 1.4s ease infinite', animationDelay: '0.4s' }} />
                            </span>
                        </div>
                    </div>
                )}

                <div ref={chatEndRef} />
            </div>

            {/* Input */}
            <div style={{ padding: '12px 20px', borderTop: '1px solid var(--border)', display: 'flex', flexDirection: 'column', gap: 8, flexShrink: 0 }}>
                {/* Voice Input Bar (shown when voice mode is active and listening/processing/error) */}
                {voiceConfig.enabled && showVoiceInput && voiceInput.voiceState !== 'idle' && (
                    <VoiceInputBar
                        voiceState={voiceInput.voiceState}
                        audioLevel={voiceInput.audioLevel}
                        error={voiceInput.error}
                        voiceMode={voiceInput.voiceMode}
                        recordingDuration={voiceInput.recordingDuration}
                        isSupported={voiceInput.isSupported}
                        enabled={voiceConfig.enabled}
                        isRTL={rtl}
                        onStartListening={voiceInput.startListening}
                        onStopListening={voiceInput.stopListening}
                        onCancel={voiceInput.cancelRecording}
                        onSetVoiceMode={voiceInput.setVoiceMode}
                        onSwitchToText={() => setShowVoiceInput(false)}
                        onDismissError={voiceInput.cancelRecording}
                    />
                )}

                {/* Text input row */}
                <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                    <input
                        ref={inputRef}
                        value={input}
                        onChange={e => setInput(e.target.value)}
                        onKeyDown={e => e.key === 'Enter' && handleSend()}
                        placeholder={Date.now() < cooldownUntil ? 'Chat paused…' : t('aiChat.inputPlaceholder')}
                        disabled={Date.now() < cooldownUntil || showBlockedScreen || showAnnouncedModal || voiceInput.voiceState === 'listening' || voiceInput.voiceState === 'processing'}
                        style={{
                            flex: 1, padding: '12px 16px', borderRadius: 12,
                            border: '1px solid var(--border)', backgroundColor: 'var(--bg-card)',
                            color: 'var(--text-primary)', fontSize: 15, outline: 'none',
                        }}
                    />

                    {/* Voice mic button (idle state) */}
                    {voiceConfig.enabled && showVoiceInput && voiceInput.voiceState === 'idle' && (
                        <VoiceInputBar
                            voiceState={voiceInput.voiceState}
                            audioLevel={voiceInput.audioLevel}
                            error={voiceInput.error}
                            voiceMode={voiceInput.voiceMode}
                            recordingDuration={voiceInput.recordingDuration}
                            isSupported={voiceInput.isSupported}
                            enabled={voiceConfig.enabled}
                            isRTL={rtl}
                            onStartListening={voiceInput.startListening}
                            onStopListening={voiceInput.stopListening}
                            onCancel={voiceInput.cancelRecording}
                            onSetVoiceMode={voiceInput.setVoiceMode}
                            onSwitchToText={() => setShowVoiceInput(false)}
                            onDismissError={voiceInput.cancelRecording}
                        />
                    )}

                    {/* Show mic toggle if voice was hidden */}
                    {voiceConfig.enabled && !showVoiceInput && (
                        <button
                            onClick={() => setShowVoiceInput(true)}
                            aria-label={rtl ? 'تبديل إلى الصوت' : 'Switch to voice'}
                            title={rtl ? 'تبديل إلى الصوت' : 'Switch to voice'}
                            style={{
                                width: 40, height: 40, borderRadius: '50%',
                                border: '1px solid var(--border)', background: 'transparent',
                                color: 'var(--text-muted)', fontSize: 18, cursor: 'pointer',
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                flexShrink: 0,
                            }}
                        >
                            <Mic size={18} color="currentColor" />
                        </button>
                    )}

                    <button onClick={handleSend} disabled={!input.trim() || isAiTyping}
                        style={{
                            padding: '12px 20px', borderRadius: 12, border: 'none',
                            backgroundColor: input.trim() ? '#1A8A9E' : '#334155',
                            color: '#fff', fontSize: 15, fontWeight: 700, cursor: input.trim() ? 'pointer' : 'not-allowed',
                            flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center',
                        }}>
                        <ArrowUp size={18} color="#fff" strokeWidth={2.5} />
                    </button>
                </div>

                {/* Auto-send voice toggle (like admin) */}
                {voiceConfig.enabled && showVoiceInput && (
                    <div style={{
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        gap: 6, paddingTop: 4,
                    }}>
                        <label style={{
                            display: 'inline-flex', alignItems: 'center', gap: 5,
                            cursor: 'pointer', userSelect: 'none',
                        }}>
                            <input
                                type="checkbox"
                                checked={autoSendVoice}
                                onChange={e => setAutoSendVoice(e.target.checked)}
                                style={{ width: 13, height: 13, accentColor: '#1A8A9E', cursor: 'pointer' }}
                            />
                            <span style={{
                                fontSize: 11,
                                fontWeight: autoSendVoice ? 600 : 400,
                                color: autoSendVoice ? '#1A8A9E' : 'var(--text-tertiary)',
                                transition: 'color 0.2s',
                            }}>
                                {rtl ? 'إرسال تلقائي بالصوت' : 'Auto-send voice'}
                            </span>
                        </label>
                    </div>
                )}
            </div>

            {/* ── Announced Modal ─────────────── */}
            {showAnnouncedModal && (
                <div style={{
                    position: 'fixed', inset: 0, backgroundColor: '#00000090',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100,
                    padding: 20,
                }}>
                    <div style={{
                        maxWidth: 400, width: '100%', backgroundColor: 'var(--bg-card)',
                        borderRadius: 20, padding: 28, border: '1px solid var(--border)',
                    }}>
                        <div style={{ textAlign: 'center', marginBottom: 20 }}>
                            <AlertTriangle size={48} color="#D97706" style={{ display: 'block', marginBottom: 12 }} />
                            <h3 style={{ fontSize: 18, fontWeight: 700, color: 'var(--text-primary)', margin: '0 0 8px' }}>
                                {t('aiChat.specialtyUnavailableTitle')}
                            </h3>
                            <p style={{ fontSize: 14, color: 'var(--text-secondary)', lineHeight: '22px', margin: 0 }}>
                                {gateMessage}
                            </p>
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                            <button onClick={handleAnnouncedContinue} style={{
                                width: '100%', padding: '14px', borderRadius: 12, border: 'none',
                                backgroundColor: '#1A8A9E', color: '#fff', fontSize: 15, fontWeight: 700,
                                cursor: 'pointer',
                            }}>
                                {t('aiChat.continueWithFM')}
                            </button>
                            <button onClick={handleAnnouncedCancel} style={{
                                width: '100%', padding: '14px', borderRadius: 12, border: '1px solid #475569',
                                backgroundColor: 'transparent', color: 'var(--text-secondary)', fontSize: 15, fontWeight: 600,
                                cursor: 'pointer',
                            }}>
                                {t('common.cancel')}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* ── Blocked Screen ──────────────── */}
            {showBlockedScreen && (
                <div style={{
                    position: 'fixed', inset: 0, backgroundColor: 'var(--bg-primary)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100,
                    padding: 20,
                }}>
                    <div style={{ maxWidth: 400, width: '100%', textAlign: 'center' }}>
                        <Ban size={64} color="#DC2626" style={{ display: 'block', marginBottom: 20 }} />
                        <h2 style={{ fontSize: 22, fontWeight: 700, color: 'var(--text-primary)', margin: '0 0 12px' }}>
                            {t('aiChat.serviceUnavailable')}
                        </h2>
                        <p style={{ fontSize: 14, color: 'var(--text-secondary)', lineHeight: '22px', margin: '0 0 28px' }}>
                            {gateMessage}
                        </p>
                        <button onClick={handleBlockedReturn} style={{
                            padding: '14px 40px', borderRadius: 14, border: 'none',
                            backgroundColor: '#1A8A9E', color: '#fff', fontSize: 16, fontWeight: 700,
                            cursor: 'pointer',
                        }}>
                            {t('aiChat.returnHome')}
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}

// ── Helpers ──────────────────────
function createAiMsg(content: string, sectionLabel?: string): ChatMessage {
    return { id: `ai_${Date.now()}_${Math.random()}`, role: 'ai', content, timestamp: Date.now(), sectionLabel };
}
function createPatientMsg(content: string): ChatMessage {
    return { id: `pt_${Date.now()}_${Math.random()}`, role: 'patient', content, timestamp: Date.now() };
}
function createSystemMsg(content: string): ChatMessage {
    return { id: `sys_${Date.now()}_${Math.random()}`, role: 'system', content, timestamp: Date.now() };
}
function getProgressForNode(nodeIndex: number, totalNodes: number): number {
    if (totalNodes === 0) return 0;
    return Math.round(((nodeIndex + 1) / totalNodes) * 95);
}
