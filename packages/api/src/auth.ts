import { supabase } from './client';
import type { User } from '@cliniqone/types';

// ──────────────────────────────────────────
// Auth Functions
// ──────────────────────────────────────────

interface SignUpParams {
    email: string;
    password: string;
    nickname: string;
    phone?: string;
}

interface SignInParams {
    email: string;
    password: string;
}

/**
 * Register a new patient account.
 * Creates Supabase Auth user + inserts row in public.users.
 */
export async function signUp({ email, password, nickname, phone }: SignUpParams) {
    // 1. Create auth user
    const { data: authData, error: authError } = await supabase.auth.signUp({
        email,
        password,
        options: {
            data: { nickname, phone, role: 'patient' },
        },
    });

    if (authError) throw authError;
    if (!authData.user) throw new Error('Registration failed');

    // 2. Create public profile (handled by database trigger in production,
    //    but we do it explicitly for reliability)
    try {
        const { error: profileError } = await supabase.from('users').insert({
            id: authData.user.id,
            email,
            phone: phone || null,
            nickname,
            role: 'patient',
            status: 'active',
            tokens_balance: 100, // Welcome bonus
            language: 'en',
            onboarding_completed: false,
        });

        if (profileError) {
            console.warn('Profile insert failed (will retry on next login):', profileError.message);
        }
    } catch (err) {
        console.warn('Profile insert skipped:', err);
    }

    return authData;
}

/**
 * Sign in with email + password.
 */
export async function signIn({ email, password }: SignInParams) {
    const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
    });

    if (error) throw error;
    return data;
}

/**
 * Sign out and clear session.
 */
export async function signOut() {
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
}

/**
 * Send password reset email.
 */
export async function resetPassword(email: string) {
    const { error } = await supabase.auth.resetPasswordForEmail(email);
    if (error) throw error;
}

/**
 * Get current session.
 */
export async function getSession() {
    const { data, error } = await supabase.auth.getSession();
    if (error) throw error;
    return data.session;
}

/**
 * Get current user's role from their profile.
 */
export async function getCurrentUserRole(): Promise<string | null> {
    const session = await getSession();
    if (!session) return null;

    const { data, error } = await supabase
        .from('users')
        .select('role')
        .eq('id', session.user.id)
        .single();

    if (error) return null;
    return data?.role || null;
}

/**
 * Get current user profile from public.users table.
 */
export async function getUserProfile(): Promise<User | null> {
    const session = await getSession();
    if (!session) return null;

    const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('id', session.user.id)
        .single();

    if (error) throw error;
    return data as User;
}

/**
 * Update user profile.
 */
export async function updateUserProfile(updates: Partial<User>) {
    const session = await getSession();
    if (!session) throw new Error('Not authenticated');

    const { data, error } = await supabase
        .from('users')
        .update(updates)
        .eq('id', session.user.id)
        .select()
        .single();

    if (error) throw error;
    return data as User;
}

/**
 * Accept legal terms (Terms of Service, Privacy Policy, AI Disclosure).
 */
export async function acceptLegalTerms() {
    return updateUserProfile({
        legal_accepted_at: new Date().toISOString(),
    } as Partial<User>);
}

/**
 * Sign in with Google ID token (from @react-native-google-signin).
 * Creates a user profile in public.users if one doesn't exist.
 * @param role - The role to assign if creating a new profile (default: 'patient')
 */
export async function signInWithGoogle(idToken: string, displayName?: string | null, role: 'patient' | 'doctor' | 'admin' | 'superadmin' = 'patient') {
    const { data, error } = await supabase.auth.signInWithIdToken({
        provider: 'google',
        token: idToken,
    });

    if (error) throw error;
    if (!data.user) throw new Error('Google sign-in failed');

    // Check if user profile exists — if not, create one (first-time OAuth user)
    const { data: existingProfile } = await supabase
        .from('users')
        .select('id')
        .eq('id', data.user.id)
        .single();

    if (!existingProfile) {
        try {
            const nickname = displayName || data.user.email?.split('@')[0] || 'User';
            await supabase.from('users').insert({
                id: data.user.id,
                email: data.user.email,
                nickname,
                role,
                status: 'active',
                tokens_balance: role === 'patient' ? 100 : 0, // Welcome bonus for patients only
                language: 'en',
                onboarding_completed: false,
            });
        } catch (err) {
            console.warn('Profile insert for OAuth user skipped:', err);
        }
    }

    return data;
}

/**
 * Sign in with Apple ID token (from expo-apple-authentication or ASAuthorizationController).
 * Creates a user profile in public.users if one doesn't exist.
 * @param role - The role to assign if creating a new profile (default: 'patient')
 */
export async function signInWithApple(idToken: string, displayName?: string | null, nonce?: string, role: 'patient' | 'doctor' | 'admin' | 'superadmin' = 'patient') {
    const { data, error } = await supabase.auth.signInWithIdToken({
        provider: 'apple',
        token: idToken,
        nonce,
    });

    if (error) throw error;
    if (!data.user) throw new Error('Apple sign-in failed');

    // Check if user profile exists — if not, create one (first-time OAuth user)
    const { data: existingProfile } = await supabase
        .from('users')
        .select('id')
        .eq('id', data.user.id)
        .single();

    if (!existingProfile) {
        try {
            const nickname = displayName || data.user.email?.split('@')[0] || 'User';
            await supabase.from('users').insert({
                id: data.user.id,
                email: data.user.email,
                nickname,
                role,
                status: 'active',
                tokens_balance: role === 'patient' ? 100 : 0, // Welcome bonus for patients only
                language: 'en',
                onboarding_completed: false,
            });
        } catch (err) {
            console.warn('Profile insert for Apple user skipped:', err);
        }
    }

    return data;
}

/**
 * Ensure a public.users row exists for the given authenticated user.
 * Called after OAuth redirect flows where Supabase auto-creates auth.users
 * but the app's public.users row may not exist yet.
 *
 * @param userId  - The auth user's UUID
 * @param email   - Email from auth metadata
 * @param name    - Display name / nickname (falls back to email prefix)
 * @param role    - Role to assign (default: 'patient')
 * @returns The existing or newly-created public.users row, or null on failure
 */
export async function ensureUserProfile(
    userId: string,
    email?: string | null,
    name?: string | null,
    role: 'patient' | 'doctor' | 'admin' | 'superadmin' = 'patient',
) {
    // 1. Check if profile already exists
    const { data: existing } = await supabase
        .from('users')
        .select('*')
        .eq('id', userId)
        .single();

    if (existing) return existing;

    // 2. Profile doesn't exist — create one (first-time OAuth user)
    const nickname = name || email?.split('@')[0] || 'User';
    console.log(`[Auth] Creating public.users profile for OAuth user ${userId} (${role})`);

    try {
        const { data: newProfile, error } = await supabase.from('users').insert({
            id: userId,
            email: email || null,
            nickname,
            role,
            status: 'active',
            tokens_balance: role === 'patient' ? 100 : 0,
            language: 'en',
            onboarding_completed: false,
        }).select('*').single();

        if (error) {
            console.warn('[Auth] ensureUserProfile insert failed:', error.message);
            // Re-fetch in case of race condition (another tab/request created it)
            const { data: reFetched } = await supabase.from('users').select('*').eq('id', userId).single();
            return reFetched || null;
        }

        return newProfile;
    } catch (err) {
        console.warn('[Auth] ensureUserProfile error:', err);
        return null;
    }
}

/**
 * Request a Sumsub SDK access token for identity verification.
 * Calls the kyc-token edge function.
 */
export async function requestKycToken(): Promise<{ token: string; applicantId: string } | { status: string; message: string }> {
    const session = await getSession();
    if (!session) throw new Error('Not authenticated');

    const { data, error } = await supabase.functions.invoke('kyc-token', {
        headers: { Authorization: `Bearer ${session.access_token}` },
    });

    if (error) throw error;
    return data;
}
