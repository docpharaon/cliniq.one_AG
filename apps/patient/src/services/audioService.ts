// ─────────────────────────────────────────────────
// Audio Service — Re-exports from shared @cliniqone/api voice module
// Patient app thin layer — all logic lives in the shared package
// ─────────────────────────────────────────────────
export {
    transcribeAudio,
    getVoiceConfig,
    TranscriptionError,
    VoiceDisabledError,
} from '@cliniqone/api';

export type {
    VoiceConfig,
    TranscriptionResult,
} from '@cliniqone/api';
