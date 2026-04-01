import { useEffect, useState, useCallback } from 'react';
import { supabase } from '@cliniqone/api';

export type HealthTip = {
    id: string;
    icon: string;
    title_en: string;
    title_ar: string | null;
    text_en: string;
    text_ar: string | null;
};

export type Campaign = {
    id: string;
    type: string;
    title_en: string;
    title_ar: string | null;
    body_en: string | null;
    body_ar: string | null;
    icon: string;
    image_url: string | null;
    link_url: string | null;
};

export type HomeContent = {
    tips: HealthTip[];
    campaigns: Campaign[];
    responseTime: string;
    responseTimeAr: string;
    consultationPrice: string;
    consultationPriceAr: string;
    isLoading: boolean;
    refresh: () => void;
};

// Hardcoded fallbacks
const DEFAULT_TIPS: HealthTip[] = [
    { id: 'default-1', icon: '💧', title_en: 'Stay Hydrated', title_ar: 'حافظ على ترطيبك', text_en: 'Drink 8 glasses of water daily for better health.', text_ar: 'اشرب ٨ أكواب من الماء يومياً لصحة أفضل.' },
    { id: 'default-2', icon: '🚶', title_en: 'Stay Active', title_ar: 'ابقَ نشيطاً', text_en: 'A 30-min daily walk boosts mood and heart health.', text_ar: 'المشي ٣٠ دقيقة يومياً يعزز المزاج وصحة القلب.' },
    { id: 'default-3', icon: '😴', title_en: 'Sleep Well', title_ar: 'نم جيداً', text_en: 'Adults need 7-9 hours of sleep each night.', text_ar: 'يحتاج البالغون ٧-٩ ساعات نوم كل ليلة.' },
];

/**
 * Fetch all home screen content in a single bundled call.
 * Falls back to hardcoded defaults if no data in DB.
 */
export function useHomeContent(): HomeContent {
    const [tips, setTips] = useState<HealthTip[]>(DEFAULT_TIPS);
    const [campaigns, setCampaigns] = useState<Campaign[]>([]);
    const [responseTime, setResponseTime] = useState('2-4 hours');
    const [responseTimeAr, setResponseTimeAr] = useState('٢-٤ ساعات');
    const [consultationPrice, setConsultationPrice] = useState('3 tokens');
    const [consultationPriceAr, setConsultationPriceAr] = useState('٣ رموز');
    const [isLoading, setIsLoading] = useState(true);

    const fetchAll = useCallback(async () => {
        try {
            const now = new Date().toISOString();

            const [tipsRes, campaignsRes, settingsRes] = await Promise.all([
                supabase
                    .from('health_tips')
                    .select('id, icon, title_en, title_ar, text_en, text_ar')
                    .eq('is_active', true)
                    .order('sort_order'),

                supabase
                    .from('campaigns')
                    .select('id, type, title_en, title_ar, body_en, body_ar, icon, image_url, link_url')
                    .eq('is_active', true)
                    .or(`starts_at.is.null,starts_at.lte.${now}`)
                    .or(`expires_at.is.null,expires_at.gte.${now}`)
                    .order('sort_order')
                    .limit(10),

                supabase
                    .from('platform_settings')
                    .select('key, value')
                    .in('key', ['response_time_value', 'response_time_value_ar', 'consultation_price_value', 'consultation_price_value_ar']),
            ]);

            if (tipsRes.data && tipsRes.data.length > 0) {
                setTips(tipsRes.data as HealthTip[]);
            } else {
                setTips(DEFAULT_TIPS);
            }

            if (campaignsRes.data) {
                setCampaigns(campaignsRes.data as Campaign[]);
            }

            if (settingsRes.data) {
                const settings = new Map(settingsRes.data.map((s: { key: string; value: string }) => [s.key, s.value]));
                if (settings.has('response_time_value')) setResponseTime(settings.get('response_time_value')!);
                if (settings.has('response_time_value_ar')) setResponseTimeAr(settings.get('response_time_value_ar')!);
                if (settings.has('consultation_price_value')) setConsultationPrice(settings.get('consultation_price_value')!);
                if (settings.has('consultation_price_value_ar')) setConsultationPriceAr(settings.get('consultation_price_value_ar')!);
            }
        } catch (error) {
            console.warn('[useHomeContent] Failed to fetch, using defaults:', error);
        } finally {
            setIsLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchAll();
    }, [fetchAll]);

    return {
        tips,
        campaigns,
        responseTime,
        responseTimeAr,
        consultationPrice,
        consultationPriceAr,
        isLoading,
        refresh: fetchAll,
    };
}
