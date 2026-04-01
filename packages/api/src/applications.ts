import { supabase } from './client';

// ──────────────────────────────────────────
// Doctor Application API
// Used by the doctor app for self-registration
// ──────────────────────────────────────────

export interface ApplicationData {
    full_name: string;
    display_name: string;
    email: string;
    phone?: string;
    license_number: string;
    license_authority: string;
    specialty: 'dermatology' | 'family_medicine' | 'psychiatry' | 'orthopedics';
    sub_specialty?: string;
    years_experience?: number;
    languages?: string[];
    hospital?: string;
    city?: string;
    bio?: string;
    doctor_type?: 'permanent' | 'locum';
    locum_invite_code?: string;
}

export interface ApplicationDocument {
    id: string;
    application_id: string;
    document_type: string;
    file_name: string;
    storage_path: string;
    file_size_bytes: number | null;
    mime_type: string | null;
    verified: boolean;
    rejection_reason: string | null;
    uploaded_at: string;
}

export interface DoctorApplication {
    id: string;
    user_id: string;
    email: string;
    phone: string | null;
    full_name: string;
    display_name: string;
    license_number: string;
    license_authority: string;
    specialty: string;
    sub_specialty: string | null;
    years_experience: number | null;
    languages: string[];
    hospital: string | null;
    city: string | null;
    bio: string | null;
    status: string;
    interview_scheduled_at: string | null;
    interview_type: string | null;
    interview_meeting_url: string | null;
    interview_phone_number: string | null;
    interview_notes: string | null;
    interview_completed_at: string | null;
    reviewed_by: string | null;
    review_notes: string | null;
    rejection_reason: string | null;
    resubmission_feedback: string | null;
    disclaimer_accepted_at: string | null;
    submitted_at: string | null;
    created_at: string;
    updated_at: string;
    documents?: ApplicationDocument[];
}

/**
 * Get the current user's application (if one exists).
 */
export async function getMyApplication(userId: string): Promise<DoctorApplication | null> {
    const { data, error } = await supabase
        .from('doctor_applications')
        .select('*')
        .eq('user_id', userId)
        .single();

    if (error) {
        if (error.code === 'PGRST116') return null; // Not found
        console.error('[getMyApplication]', error.message);
        return null;
    }
    return data as DoctorApplication;
}

/**
 * Get the current user's application with documents.
 */
export async function getMyApplicationWithDocs(userId: string): Promise<DoctorApplication | null> {
    const { data, error } = await supabase
        .from('doctor_applications')
        .select(`
            *,
            documents:doctor_application_documents(*)
        `)
        .eq('user_id', userId)
        .single();

    if (error) {
        if (error.code === 'PGRST116') return null;
        console.error('[getMyApplicationWithDocs]', error.message);
        return null;
    }
    return data as DoctorApplication;
}

/**
 * Create a new doctor application (draft).
 * Also ensures the user has a public.users row with role='doctor'.
 */
export async function createApplication(userId: string, data: ApplicationData): Promise<DoctorApplication> {
    // Ensure users row exists (OAuth may not have created one with role='doctor')
    const { data: existingUser } = await supabase
        .from('users')
        .select('id, role')
        .eq('id', userId)
        .single();

    if (!existingUser) {
        // Create users row
        const { error: userErr } = await supabase.from('users').insert({
            id: userId,
            email: data.email,
            nickname: data.display_name,
            role: 'doctor',
            status: 'pending',
        });
        if (userErr) console.warn('[createApplication:users]', userErr.message);
    }

    // Create the application
    const { data: app, error } = await supabase
        .from('doctor_applications')
        .insert({
            user_id: userId,
            email: data.email,
            phone: data.phone || null,
            full_name: data.full_name,
            display_name: data.display_name,
            license_number: data.license_number,
            license_authority: data.license_authority,
            specialty: data.specialty,
            sub_specialty: data.sub_specialty || null,
            years_experience: data.years_experience || null,
            languages: data.languages || ['en'],
            hospital: data.hospital || null,
            city: data.city || null,
            bio: data.bio || null,
            doctor_type: data.doctor_type || 'permanent',
            locum_invite_code: data.locum_invite_code || null,
            status: 'draft',
        })
        .select()
        .single();

    if (error) throw error;
    return app as DoctorApplication;
}

/**
 * Update an existing application (only in draft or resubmission_requested status).
 */
export async function updateApplication(applicationId: string, updates: Partial<ApplicationData>): Promise<DoctorApplication> {
    const { data, error } = await supabase
        .from('doctor_applications')
        .update(updates)
        .eq('id', applicationId)
        .select()
        .single();

    if (error) throw error;
    return data as DoctorApplication;
}

/**
 * Upload a document for the application.
 */
export async function uploadApplicationDocument(
    applicationId: string,
    file: File,
    documentType: string,
): Promise<ApplicationDocument> {
    const fileExt = file.name.split('.').pop() || 'pdf';
    const filePath = `${applicationId}/${documentType}_${Date.now()}.${fileExt}`;

    // Upload to storage
    const { error: uploadErr } = await supabase.storage
        .from('doctor-applications')
        .upload(filePath, file, {
            contentType: file.type,
            upsert: false,
        });

    if (uploadErr) throw uploadErr;

    // Create document record
    const { data, error } = await supabase
        .from('doctor_application_documents')
        .insert({
            application_id: applicationId,
            document_type: documentType,
            file_name: file.name,
            storage_path: filePath,
            file_size_bytes: file.size,
            mime_type: file.type,
        })
        .select()
        .single();

    if (error) throw error;
    return data as ApplicationDocument;
}

/**
 * Remove a document from the application.
 */
export async function removeApplicationDocument(documentId: string, storagePath: string): Promise<void> {
    // Delete from storage
    await supabase.storage
        .from('doctor-applications')
        .remove([storagePath]);

    // Delete record
    const { error } = await supabase
        .from('doctor_application_documents')
        .delete()
        .eq('id', documentId);

    if (error) throw error;
}

/**
 * Get all documents for an application.
 */
export async function getApplicationDocuments(applicationId: string): Promise<ApplicationDocument[]> {
    const { data, error } = await supabase
        .from('doctor_application_documents')
        .select('*')
        .eq('application_id', applicationId)
        .order('uploaded_at', { ascending: true });

    if (error) throw error;
    return (data || []) as ApplicationDocument[];
}

/**
 * Accept disclaimer and mark timestamp.
 */
export async function acceptDisclaimer(applicationId: string): Promise<void> {
    const { error } = await supabase
        .from('doctor_applications')
        .update({ disclaimer_accepted_at: new Date().toISOString() })
        .eq('id', applicationId);

    if (error) throw error;
}

/**
 * Submit the application for admin review.
 * Changes status from 'draft' to 'submitted'.
 */
export async function submitApplication(applicationId: string): Promise<DoctorApplication> {
    const { data, error } = await supabase
        .from('doctor_applications')
        .update({
            status: 'submitted',
            submitted_at: new Date().toISOString(),
        })
        .eq('id', applicationId)
        .select()
        .single();

    if (error) throw error;
    const app = data as DoctorApplication;

    // Fire-and-forget: notify the doctor via email
    try {
        await supabase.functions.invoke('application-notification', {
            body: {
                type: 'application_received',
                doctor_name: app.full_name,
                doctor_email: app.email,
            },
        });
    } catch (e) {
        console.warn('[submitApplication] notification failed (non-blocking):', e);
    }

    return app;
}

/**
 * Resubmit application after fixing issues.
 * Changes status from 'resubmission_requested' back to 'submitted'.
 */
export async function resubmitApplication(applicationId: string): Promise<DoctorApplication> {
    const { data, error } = await supabase
        .from('doctor_applications')
        .update({
            status: 'submitted',
            submitted_at: new Date().toISOString(),
            resubmission_feedback: null, // Clear old feedback
        })
        .eq('id', applicationId)
        .select()
        .single();

    if (error) throw error;
    return data as DoctorApplication;
}

/**
 * Get a signed URL for a document (for preview).
 */
export async function getDocumentUrl(storagePath: string): Promise<string | null> {
    const { data, error } = await supabase.storage
        .from('doctor-applications')
        .createSignedUrl(storagePath, 3600); // 1 hour

    if (error) {
        console.error('[getDocumentUrl]', error.message);
        return null;
    }
    return data.signedUrl;
}

/**
 * Get audit trail for the current user's application.
 */
export async function getMyApplicationAudit(applicationId: string) {
    const { data, error } = await supabase
        .from('doctor_application_audit')
        .select('*')
        .eq('application_id', applicationId)
        .order('created_at', { ascending: false });

    if (error) {
        console.error('[getMyApplicationAudit]', error.message);
        return [];
    }
    return data || [];
}
