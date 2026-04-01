import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

// Ads have been merged into Campaigns — redirect
export default function AdsPage() {
    const navigate = useNavigate();
    useEffect(() => {
        navigate('/dashboard/news', { replace: true });
    }, [navigate]);

    return (
        <div className="flex items-center justify-center h-64">
            <div className="w-8 h-8 border-2 border-accent border-t-transparent rounded-full animate-spin" />
        </div>
    );
}
