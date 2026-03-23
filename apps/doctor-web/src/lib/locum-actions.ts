'use server';

import { supabaseAdmin } from './supabase';

// ── Validate Invitation ──────────────────────────

export async function validateInvitation(code: string) {
    const { data, error } = await supabaseAdmin
        .from('locum_invitations')
        .select('id, invite_code, qr_payload, specialty, status, expires_at')
        .eq('invite_code', code.toUpperCase())
        .single();

    if (error || !data) return { valid: false, error: 'Invitation not found' };
    if (data.status !== 'pending') return { valid: false, error: `Invitation already ${data.status}` };
    if (new Date(data.expires_at) < new Date()) return { valid: false, error: 'Invitation has expired' };

    return { valid: true, invitation: data };
}

// ── Submit Locum Signup ──────────────────────────

export async function submitLocumSignup(payload: {
    inviteCode: string;
    fullName: string;
    displayName: string;
    email: string;
    phone: string;
    password: string;
    specialty: string;
}) {
    // 1. Validate invitation again
    const validation = await validateInvitation(payload.inviteCode);
    if (!validation.valid) return { error: validation.error };

    // 2. Create auth user
    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
        email: payload.email,
        password: payload.password,
        email_confirm: true,
        user_metadata: { full_name: payload.fullName },
    });

    if (authError) {
        console.error('[locumSignup:auth]', authError.message);
        return { error: authError.message };
    }
    const userId = authData.user.id;

    // 3. Create users row
    const { error: userError } = await supabaseAdmin
        .from('users')
        .insert({
            id: userId,
            email: payload.email,
            nickname: payload.displayName,
            phone: payload.phone,
            role: 'doctor',
        });

    if (userError) {
        console.error('[locumSignup:users]', userError.message);
        await supabaseAdmin.auth.admin.deleteUser(userId);
        return { error: userError.message };
    }

    // 4. Generate identifier code
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let identCode = 'DR-';
    for (let i = 0; i < 4; i++) identCode += chars[Math.floor(Math.random() * chars.length)];

    // 5. Create doctor record
    const { data: doctor, error: docError } = await supabaseAdmin
        .from('doctors')
        .insert({
            user_id: userId,
            full_name: payload.fullName,
            display_name: payload.displayName,
            specialty: payload.specialty,
            doctor_type: 'locum',
            identifier_code: identCode,
            sandbox_mode: true,
            onboarding_status: 'documents_pending',
            status: 'suspended', // until admin approves
            consultation_fee_tokens: 3,
        })
        .select('id')
        .single();

    if (docError) {
        console.error('[locumSignup:doctors]', docError.message);
        await supabaseAdmin.from('users').delete().eq('id', userId);
        await supabaseAdmin.auth.admin.deleteUser(userId);
        return { error: docError.message };
    }

    // 6. Mark invitation as claimed
    await supabaseAdmin
        .from('locum_invitations')
        .update({ status: 'claimed', claimed_by: doctor.id })
        .eq('invite_code', payload.inviteCode.toUpperCase());

    return { success: true, doctorId: doctor.id };
}

// ── Upload Document ──────────────────────────────

export async function uploadLocumDocument(
    doctorId: string,
    documentType: 'national_id' | 'medical_license' | 'cv' | 'disclaimer_signed',
    fileName: string,
    fileBase64: string,
    fileSize: number,
) {
    // Decode base64 to Uint8Array
    const binaryStr = atob(fileBase64);
    const bytes = new Uint8Array(binaryStr.length);
    for (let i = 0; i < binaryStr.length; i++) bytes[i] = binaryStr.charCodeAt(i);

    const storagePath = `locum-documents/${doctorId}/${documentType}/${fileName}`;

    // Upload to Supabase Storage
    const { error: uploadError } = await supabaseAdmin.storage
        .from('locum-documents')
        .upload(storagePath, bytes, {
            contentType: 'application/octet-stream',
            upsert: true,
        });

    if (uploadError) {
        console.error('[uploadLocumDocument:storage]', uploadError.message);
        return { error: uploadError.message };
    }

    // Record in locum_documents table
    const { error: dbError } = await supabaseAdmin
        .from('locum_documents')
        .insert({
            doctor_id: doctorId,
            document_type: documentType,
            file_name: fileName,
            storage_path: storagePath,
            file_size_bytes: fileSize,
        });

    if (dbError) {
        console.error('[uploadLocumDocument:db]', dbError.message);
        return { error: dbError.message };
    }

    return { success: true };
}

// ── Finalize Onboarding (mark as review_pending) ─

export async function finalizeLocumOnboarding(doctorId: string) {
    const { error } = await supabaseAdmin
        .from('doctors')
        .update({ onboarding_status: 'review_pending' })
        .eq('id', doctorId);

    if (error) return { error: error.message };
    return { success: true };
}
