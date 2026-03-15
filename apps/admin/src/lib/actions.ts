'use server';

import {
    getUsers,
    getUserById,
    updateUser,
    deleteUser,
    getUserStats,
    getDoctors,
    getDoctorById,
    updateDoctor,
    deleteDoctor,
    getDoctorStats,
    createDoctor,
    resetDoctorPassword,
    getConsultations,
    getConsultationById,
    getConsultationStats,
    getOverdueConsultations,
    archiveConsultation,
    purgeConsultationData,
    assignConsultationToDoctor,
    getProtocolLogs,
    getTokenTransactions,
    getDashboardStats,
    getSchedules,
    createSchedule,
    updateSchedule,
    deleteSchedule,
    getNewsArticles,
    getAdvertisements,
    getAIPrompts,
    getAIPromptById,
    createAIPrompt,
    updateAIPrompt,
    deleteAIPrompt,
    getPromptVersions,
    rollbackPrompt,
    getActivePromptByType,
    getDraftCount,
    publishDrafts,
    getPromptSequences,
    getSequenceWithNodes,
    getDefaultSequence,
    createPromptSequence,
    updatePromptSequence,
    deletePromptSequence,
    createSequenceNode,
    updateSequenceNode,
    deleteSequenceNode,
    reorderSequenceNodes,
    getErrorReports,
    getSettings,
    upsertPlatformSetting,
    getPlatformSetting,
    getInterventions,
    getInterventionStats,
    getServiceCatalog,
    createServiceCatalogItem,
    updateServiceCatalogItem,
    deleteServiceCatalogItem,
    getServiceProviders,
    createServiceProvider,
    updateServiceProvider,
    deleteServiceProvider,
} from './queries';

// ──────────────────────────────────────────
// Server Actions — callable from 'use client' pages
// ──────────────────────────────────────────

export async function fetchUsers(page = 1, perPage = 50, search?: string, status?: string, role?: string) {
    return getUsers(page, perPage, search, status, role);
}

export async function fetchUserById(id: string) {
    return getUserById(id);
}

export async function editUser(id: string, updates: Record<string, unknown>) {
    return updateUser(id, updates);
}

export async function removeUser(id: string) {
    return deleteUser(id);
}

export async function fetchUserStats() {
    return getUserStats();
}

export async function fetchDoctors(page = 1, perPage = 50, search?: string, status?: string) {
    return getDoctors(page, perPage, search, status);
}

export async function fetchDoctorById(id: string) {
    return getDoctorById(id);
}

export async function editDoctor(id: string, updates: Record<string, unknown>) {
    return updateDoctor(id, updates);
}

export async function removeDoctor(id: string) {
    return deleteDoctor(id);
}

export async function fetchDoctorStats() {
    return getDoctorStats();
}

export async function addDoctor(doctor: {
    email: string;
    password: string;
    phone?: string;
    full_name: string;
    display_name: string;
    license_number: string;
    license_authority: string;
    specialty: 'dermatology' | 'family_medicine';
    sub_specialty?: string;
    years_experience?: number;
    languages?: string[];
    hospital?: string;
    city?: string;
    bio?: string;
    daily_limit?: number;
    is_accepting?: boolean;
}) {
    return createDoctor(doctor);
}

export async function resetDoctorPasswordAction(doctorId: string, newPassword: string) {
    return resetDoctorPassword(doctorId, newPassword);
}

export async function fetchConsultations(page = 1, perPage = 50, search?: string, status?: string) {
    return getConsultations(page, perPage, search, status);
}

export async function fetchConsultationById(id: string) {
    return getConsultationById(id);
}

export async function fetchConsultationStats() {
    return getConsultationStats();
}

export async function fetchOverdueConsultations(page = 1, perPage = 50) {
    return getOverdueConsultations(page, perPage);
}

export async function doArchiveConsultation(id: string, adminUserId: string) {
    return archiveConsultation(id, adminUserId);
}

export async function doPurgeConsultation(id: string, adminUserId: string) {
    return purgeConsultationData(id, adminUserId);
}

export async function doAssignDoctor(consultationId: string, doctorId: string) {
    return assignConsultationToDoctor(consultationId, doctorId);
}

export async function fetchProtocolLogs(page = 1, perPage = 50, search?: string) {
    return getProtocolLogs(page, perPage, search);
}

export async function fetchTokenTransactions(page = 1, perPage = 50, search?: string) {
    return getTokenTransactions(page, perPage, search);
}

export async function fetchDashboardStats() {
    return getDashboardStats();
}

export async function fetchSchedules(page = 1, perPage = 50, search?: string, dayOfWeek?: number, doctorId?: string) {
    return getSchedules(page, perPage, search, dayOfWeek, doctorId);
}

export async function addSchedule(schedule: {
    doctor_id: string;
    day_of_week: number;
    start_time: string;
    end_time: string;
    is_active?: boolean;
    daily_limit?: number;
}) {
    return createSchedule(schedule);
}

export async function editSchedule(id: string, updates: Record<string, unknown>) {
    return updateSchedule(id, updates);
}

export async function removeSchedule(id: string) {
    return deleteSchedule(id);
}

export async function fetchNewsArticles(page = 1, perPage = 50, search?: string) {
    return getNewsArticles(page, perPage, search);
}

export async function fetchAdvertisements(page = 1, perPage = 50, search?: string) {
    return getAdvertisements(page, perPage, search);
}

export async function fetchAIPrompts(page = 1, perPage = 50, search?: string) {
    return getAIPrompts(page, perPage, search);
}

export async function fetchAIPromptById(id: string) {
    return getAIPromptById(id);
}

export async function createPrompt(data: {
    name: string;
    specialty: string;
    prompt_type: string;
    content: string;
    is_active: boolean;
}) {
    return createAIPrompt(data);
}

export async function updatePrompt(id: string, data: {
    name?: string;
    specialty?: string;
    prompt_type?: string;
    content?: string;
    is_active?: boolean;
}) {
    return updateAIPrompt(id, data);
}

export async function deletePrompt(id: string) {
    return deleteAIPrompt(id);
}

export async function fetchPromptVersions(promptId: string) {
    return getPromptVersions(promptId);
}

export async function rollbackToVersion(promptId: string, versionId: string) {
    return rollbackPrompt(promptId, versionId);
}

export async function fetchActivePromptByType(promptType: string, specialty?: string) {
    return getActivePromptByType(promptType, specialty);
}

export async function fetchDraftCount() {
    return getDraftCount();
}

export async function doPublishDrafts() {
    return publishDrafts();
}

// ── Prompt Sequences ──────────────────────

export async function fetchPromptSequences() {
    return getPromptSequences();
}

export async function fetchSequenceWithNodes(sequenceId: string) {
    return getSequenceWithNodes(sequenceId);
}

export async function fetchDefaultSequence() {
    return getDefaultSequence();
}

export async function addPromptSequence(name: string, isDefault?: boolean) {
    return createPromptSequence(name, isDefault);
}

export async function editPromptSequence(id: string, updates: { name?: string; is_default?: boolean }) {
    return updatePromptSequence(id, updates);
}

export async function removePromptSequence(id: string) {
    return deletePromptSequence(id);
}

export async function addSequenceNode(node: {
    sequence_id: string;
    step_key: string;
    label: string;
    emoji?: string;
    prompt_id?: string | null;
    sort_order: number;
    parent_node_id?: string | null;
    pathway_condition?: string | null;
}) {
    return createSequenceNode(node);
}

export async function editSequenceNode(id: string, updates: {
    step_key?: string;
    label?: string;
    emoji?: string;
    prompt_id?: string | null;
    sort_order?: number;
    parent_node_id?: string | null;
    pathway_condition?: string | null;
}) {
    return updateSequenceNode(id, updates);
}

export async function removeSequenceNode(id: string) {
    return deleteSequenceNode(id);
}

export async function reorderNodes(sequenceId: string, orderedIds: string[]) {
    return reorderSequenceNodes(sequenceId, orderedIds);
}

export async function fetchErrorReports(page = 1, perPage = 50, search?: string) {
    return getErrorReports(page, perPage, search);
}

export async function fetchSettings(category?: string) {
    return getSettings(category);
}

export async function savePlatformSetting(key: string, value: string, category: string, description?: string) {
    return upsertPlatformSetting(key, value, category, description);
}

export async function fetchPlatformSetting(key: string) {
    return getPlatformSetting(key);
}

// ── Interventions ──────────────────────────

export async function fetchInterventions(page = 1, perPage = 50, search?: string, status?: string, type?: string) {
    return getInterventions(page, perPage, search, status, type);
}

export async function fetchInterventionStats() {
    return getInterventionStats();
}

export async function fetchServiceCatalog(page = 1, perPage = 50, search?: string, type?: string) {
    return getServiceCatalog(page, perPage, search, type);
}

export async function addServiceCatalogItem(item: {
    category: string;
    subcategory?: string | null;
    name: string;
    name_ar: string;
    description?: string | null;
    description_ar?: string | null;
    type: string;
    sample_required?: string | null;
    fasting_required: boolean;
    avg_cost_sar?: number | null;
    avg_turnaround_days?: number | null;
    is_active: boolean;
}) {
    return createServiceCatalogItem(item);
}

export async function editServiceCatalogItem(id: string, updates: Record<string, unknown>) {
    return updateServiceCatalogItem(id, updates);
}

export async function removeServiceCatalogItem(id: string) {
    return deleteServiceCatalogItem(id);
}

export async function fetchServiceProviders(page = 1, perPage = 50, search?: string, type?: string) {
    return getServiceProviders(page, perPage, search, type);
}

export async function addServiceProvider(provider: Record<string, unknown>) {
    return createServiceProvider(provider);
}

export async function editServiceProvider(id: string, updates: Record<string, unknown>) {
    return updateServiceProvider(id, updates);
}

export async function removeServiceProvider(id: string) {
    return deleteServiceProvider(id);
}

