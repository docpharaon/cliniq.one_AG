'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

// Ads have been merged into Campaigns — redirect
export default function AdsPage() {
    const router = useRouter();
    useEffect(() => {
        router.replace('/dashboard/news');
    }, [router]);

    return (
        <div className="flex items-center justify-center h-64">
            <div className="w-8 h-8 border-2 border-accent border-t-transparent rounded-full animate-spin" />
        </div>
    );
}
