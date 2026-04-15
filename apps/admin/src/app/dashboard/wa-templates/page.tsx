'use client';

import Header from '@/components/Header';
import StatCard from '@/components/StatCard';
import StatusBadge from '@/components/StatusBadge';
import {
    Layout, CheckCircle2, Clock, XCircle,
    Plus, Search, Globe, RefreshCw, FileJson,
    Loader2, Trash2, Edit3, MoreVertical,
    Check, AlertCircle, Info, Smartphone
} from 'lucide-react';
import { useEffect, useState, useCallback } from 'react';
import {
    fetchMetaWaTemplates,
    fetchTemplateStats,
    saveMetaWaTemplate,
    removeMetaWaTemplate,
    doSyncWaTemplates,
    doTestMetaConnection
} from '@/lib/actions';

export default function WaTemplatesPage() {
    const [loading, setLoading] = useState(true);
    const [statsLoading, setStatsLoading] = useState(true);
    const [templates, setTemplates] = useState<any[]>([]);
    const [stats, setStats] = useState({ approved: 0, pending: 0, rejected: 0, total: 0 });
    const [testing, setTesting] = useState(false);
    
    // Filters
    const [statusFilter, setStatusFilter] = useState('');
    const [categoryFilter, setCategoryFilter] = useState('');
    const [searchTerm, setSearchTerm] = useState('');
    
    // Modal Management
    const [isAddModalOpen, setIsAddModalOpen] = useState(false);
    const [selectedTemplate, setSelectedTemplate] = useState<any>(null);
    const [isJsonViewOpen, setIsJsonViewOpen] = useState(false);

    const loadStats = useCallback(async () => {
        setStatsLoading(true);
        try {
            const s = await fetchTemplateStats();
            setStats(s);
        } catch (e) { console.error(e); }
        setStatsLoading(false);
    }, []);

    const loadTemplates = useCallback(async () => {
        setLoading(true);
        try {
            const data = await fetchMetaWaTemplates({
                status: statusFilter || undefined,
                category: categoryFilter || undefined,
                search: searchTerm || undefined,
            });
            setTemplates(data);
        } catch (e) { console.error(e); }
        setLoading(false);
    }, [statusFilter, categoryFilter, searchTerm]);

    useEffect(() => {
        loadStats();
    }, [loadStats]);

    useEffect(() => {
        loadTemplates();
    }, [loadTemplates]);

    const handleTestConnection = async () => {
        setTesting(true);
        try {
            const res = await doTestMetaConnection();
            if (res.success) {
                alert(`Connection Successful! Linked to account: ${res.data?.name || 'WhatsApp Business Account'}`);
            } else {
                alert(`Connection Failed: ${res.error}\n\nCheck your WABA ID and Token in Settings.`);
            }
        } catch (e: any) {
            alert('System error: ' + e.message);
        }
        setTesting(false);
    };

    const handleSync = async () => {
        setLoading(true);
        try {
            const res = await doSyncWaTemplates();
            if (res.success) {
                alert(`Successfully synchronized ${res.count} templates from Meta.`);
                await loadTemplates();
                await loadStats();
            } else {
                alert('Sync failed: ' + res.error);
            }
        } catch (e: any) {
            alert('System error during sync: ' + e.message);
        }
        setLoading(false);
    };

    const handleDelete = async (id: string, name: string) => {
        if (!confirm(`Are you sure you want to delete template "${name}"? This only removes it from cliniq.one database, not from Meta.`)) return;
        try {
            await removeMetaWaTemplate(id);
            loadTemplates();
            loadStats();
        } catch (e) { alert('Delete failed: ' + (e as Error).message); }
    };

    const fmtDate = (d: string) => {
        if (!d) return 'Never';
        return new Date(d).toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
            year: 'numeric'
        });
    };

    return (
        <div className="space-y-6">
            <Header
                title="WhatsApp Templates"
                subtitle="Manage and sync Meta-approved message templates for automated delivery"
                icon={Layout}
                actions={
                    <div className="flex gap-3">
                        <button 
                            onClick={handleTestConnection}
                            disabled={testing || loading}
                            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-500/10 text-slate-600 border border-slate-500/20 hover:bg-slate-500/20 transition-all text-sm font-medium disabled:opacity-50"
                        >
                            {testing ? (
                                <Loader2 className="w-4 h-4 animate-spin" />
                            ) : (
                                <Smartphone className="w-4 h-4" />
                            )}
                            Test Connection
                        </button>
                        <button 
                            onClick={handleSync}
                            disabled={loading}
                            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-accent/10 text-accent border border-accent/20 hover:bg-accent/20 transition-all text-sm font-medium"
                        >
                            <RefreshCw className={`w-4 h-4 ${loading && !templates.length ? 'animate-spin' : ''}`} /> Sync from Meta
                        </button>
                        <button 
                            onClick={() => setIsAddModalOpen(true)}
                            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-accent text-white hover:opacity-90 transition-all text-sm font-medium"
                        >
                            <Plus className="w-4 h-4" /> Add Template
                        </button>
                    </div>
                }
            />

            {/* Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <StatCard label="Total Templates" value={stats.total} icon={Layout} />
                <StatCard label="Approved" value={stats.approved} icon={CheckCircle2} color="#10b981" />
                <StatCard label="Pending Approval" value={stats.pending} icon={Clock} color="#f59e0b" />
                <StatCard label="Rejected" value={stats.rejected} icon={XCircle} color="#ef4444" />
            </div>

            {/* Filters */}
            <div className="flex flex-col md:flex-row gap-4 items-center justify-between bg-[var(--card-bg)] p-4 rounded-2xl border border-[var(--border-color)]">
                <div className="flex flex-wrap gap-3 items-center w-full md:w-auto">
                    <div className="relative min-w-[240px]">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--text-muted)]" />
                        <input
                            type="text"
                            placeholder="Search templates..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-[var(--hover-bg)] border border-[var(--border-color)] text-sm focus:ring-2 focus:ring-[var(--accent-color)] outline-none"
                        />
                    </div>
                    
                    <select
                        value={categoryFilter}
                        onChange={(e) => setCategoryFilter(e.target.value)}
                        className="px-3 py-2.5 rounded-xl bg-[var(--hover-bg)] border border-[var(--border-color)] text-sm outline-none focus:ring-2 focus:ring-[var(--accent-color)] min-w-[140px]"
                    >
                        <option value="">All Categories</option>
                        <option value="MARKETING">Marketing</option>
                        <option value="UTILITY">Utility</option>
                        <option value="AUTHENTICATION">Authentication</option>
                    </select>

                    <select
                        value={statusFilter}
                        onChange={(e) => setStatusFilter(e.target.value)}
                        className="px-3 py-2.5 rounded-xl bg-[var(--hover-bg)] border border-[var(--border-color)] text-sm outline-none focus:ring-2 focus:ring-[var(--accent-color)] min-w-[140px]"
                    >
                        <option value="">All Statuses</option>
                        <option value="approved">Approved</option>
                        <option value="pending">Pending</option>
                        <option value="rejected">Rejected</option>
                    </select>
                </div>
                
                <div className="text-xs text-[var(--text-muted)] font-medium">
                    {templates.length} Templates Registered
                </div>
            </div>

            {/* Data Table */}
            <div className="bg-[var(--card-bg)] rounded-2xl border border-[var(--border-color)] overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                        <thead>
                            <tr className="bg-[var(--hover-bg)] border-b border-[var(--border-color)] text-[var(--text-muted)] font-medium">
                                <th className="text-left px-6 py-4">Template Name</th>
                                <th className="text-left px-6 py-4">Category</th>
                                <th className="text-left px-6 py-4">Language</th>
                                <th className="text-left px-6 py-4">Status</th>
                                <th className="text-left px-6 py-4">Last Sync</th>
                                <th className="text-right px-6 py-4">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-[var(--border-color)]">
                            {loading && templates.length === 0 ? (
                                <tr>
                                    <td colSpan={6} className="px-6 py-12 text-center">
                                        <Loader2 className="w-8 h-8 animate-spin mx-auto text-[var(--accent-color)] mb-2" />
                                        <p className="text-[var(--text-muted)]">Loading templates...</p>
                                    </td>
                                </tr>
                            ) : templates.length === 0 ? (
                                <tr>
                                    <td colSpan={6} className="px-6 py-12 text-center text-[var(--text-muted)]">
                                        No templates found. Try syncing from Meta.
                                    </td>
                                </tr>
                            ) : (
                                templates.map(t => (
                                    <tr key={t.id} className="hover:bg-[var(--hover-bg)] transition-colors group">
                                        <td className="px-6 py-4">
                                            <div className="font-semibold text-[var(--text-primary)]">
                                                {t.name}
                                            </div>
                                            <div className="text-[10px] text-[var(--text-muted)] font-mono">
                                                ID: {t.meta_id || '—'}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                                                t.category === 'MARKETING' ? 'bg-indigo-500/10 text-indigo-500' :
                                                t.category === 'AUTHENTICATION' ? 'bg-amber-500/10 text-amber-500' :
                                                'bg-emerald-500/10 text-emerald-500'
                                            }`}>
                                                {t.category}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-1.5 uppercase font-medium text-xs">
                                                <Globe className="w-3 h-3 text-[var(--text-muted)]" />
                                                {t.language}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <StatusBadge status={t.status} />
                                        </td>
                                        <td className="px-6 py-4 text-[var(--text-muted)] whitespace-nowrap">
                                            {fmtDate(t.last_synced_at || t.updated_at)}
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            <div className="flex justify-end gap-2">
                                                <button
                                                    onClick={() => { setSelectedTemplate(t); setIsJsonViewOpen(true); }}
                                                    className="p-2 rounded-lg bg-[var(--hover-bg)] border border-[var(--border-color)] hover:border-accent hover:text-accent transition-all"
                                                    title="View JSON Components"
                                                >
                                                    <FileJson className="w-4 h-4" />
                                                </button>
                                                <button
                                                    onClick={() => handleDelete(t.id, t.name)}
                                                    className="p-2 rounded-lg bg-[var(--hover-bg)] border border-[var(--border-color)] hover:border-red-500 hover:text-red-500 transition-all text-red-500/60"
                                                    title="Delete Template"
                                                >
                                                    <Trash2 className="w-4 h-4" />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* JSON View Modal */}
            {isJsonViewOpen && selectedTemplate && (
                <div 
                    className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4"
                    onClick={() => setIsJsonViewOpen(false)}
                >
                    <div 
                        className="w-full max-w-2xl bg-[var(--card-bg)] rounded-3xl border border-[var(--border-color)] shadow-2xl overflow-hidden"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div className="p-6 border-b border-[var(--border-color)] flex items-center justify-between">
                            <div>
                                <h3 className="font-bold text-lg">Template Definition: {selectedTemplate.name}</h3>
                                <p className="text-xs text-[var(--text-muted)]">Meta WhatsApp Business API Components</p>
                            </div>
                            <button onClick={() => setIsJsonViewOpen(false)} className="p-2 hover:bg-[var(--hover-bg)] rounded-xl">
                                <XCircle className="w-5 h-5 text-[var(--text-muted)]" />
                            </button>
                        </div>
                        <div className="p-6">
                            <div className="bg-slate-950 rounded-2xl p-4 overflow-auto max-h-[400px]">
                                <pre className="text-emerald-400 font-mono text-xs">
                                    {JSON.stringify(selectedTemplate.components, null, 2)}
                                </pre>
                            </div>
                            
                            <div className="mt-6 flex flex-col gap-3 p-4 rounded-2xl bg-accent/5 border border-accent/10">
                                <div className="flex items-center gap-2 text-accent text-sm font-bold">
                                    <Smartphone className="w-4 h-4" />
                                    Mobile Preview (Raw Body)
                                </div>
                                <div className="p-3 bg-white border border-slate-200 rounded-xl text-black text-xs shadow-sm max-w-[80%]">
                                    {selectedTemplate.components.find((c: any) => c.type === 'BODY')?.text || 'No Body component defined.'}
                                </div>
                            </div>
                        </div>
                        <div className="p-6 bg-[var(--hover-bg)] border-t border-[var(--border-color)] flex gap-3">
                            <button 
                                onClick={() => setIsJsonViewOpen(false)}
                                className="flex-1 py-3 rounded-xl border border-[var(--border-color)] font-bold hover:bg-[var(--card-bg)]"
                            >
                                Close
                            </button>
                            <button 
                                onClick={() => { setIsJsonViewOpen(false); alert('Editing logic requires dedicated Meta Component Builder UI. Coming soon.'); }}
                                className="flex-1 py-3 rounded-xl bg-accent text-white font-bold hover:opacity-90"
                            >
                                Edit Components
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
