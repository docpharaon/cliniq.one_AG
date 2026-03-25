'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { Search, Sparkles, Loader2, X, ChevronDown, AlertCircle } from 'lucide-react';
import { searchIcdCodes } from '@/lib/actions';

type IcdResult = {
    id: string;
    code: string;
    description: string;
    description_ar: string;
    category: string;
    specialty_tags: string[];
};

type AiSuggestion = {
    code: string;
    description: string;
    confidence: 'high' | 'moderate' | 'low';
    reasoning: string;
};

const CONFIDENCE_STYLES: Record<string, string> = {
    high: 'bg-success-faded text-success',
    moderate: 'bg-warning-faded text-warning',
    low: 'bg-bg-elevated text-text-muted',
};

export default function IcdCodePicker({
    value,
    onChange,
    specialty,
    consultationId,
}: {
    value: string;
    onChange: (code: string, description?: string) => void;
    specialty?: string;
    consultationId?: string;
}) {
    const [query, setQuery] = useState('');
    const [results, setResults] = useState<IcdResult[]>([]);
    const [searching, setSearching] = useState(false);
    const [open, setOpen] = useState(false);
    const [selectedDesc, setSelectedDesc] = useState('');

    // AI suggest
    const [aiSuggestions, setAiSuggestions] = useState<AiSuggestion[]>([]);
    const [aiLoading, setAiLoading] = useState(false);
    const [aiError, setAiError] = useState('');
    const [showAiPanel, setShowAiPanel] = useState(false);

    const wrapperRef = useRef<HTMLDivElement>(null);
    const debounceRef = useRef<ReturnType<typeof setTimeout>>(undefined);

    // Close dropdown on outside click
    useEffect(() => {
        function handleClick(e: MouseEvent) {
            if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
                setOpen(false);
            }
        }
        document.addEventListener('mousedown', handleClick);
        return () => document.removeEventListener('mousedown', handleClick);
    }, []);

    // Debounced search
    const doSearch = useCallback(async (q: string) => {
        if (q.length < 2) { setResults([]); return; }
        setSearching(true);
        try {
            const data = await searchIcdCodes(q, specialty);
            setResults(data as IcdResult[]);
            setOpen(true);
        } catch {
            setResults([]);
        }
        setSearching(false);
    }, [specialty]);

    function handleInput(val: string) {
        setQuery(val);
        onChange(val); // keep the text synced
        clearTimeout(debounceRef.current);
        debounceRef.current = setTimeout(() => doSearch(val), 300);
    }

    function handleSelect(item: IcdResult) {
        setQuery(item.code);
        setSelectedDesc(item.description);
        onChange(item.code, item.description);
        setOpen(false);
    }

    function handleClear() {
        setQuery('');
        setSelectedDesc('');
        onChange('');
        setResults([]);
    }

    // AI suggestion
    async function handleAiSuggest() {
        if (!consultationId) return;
        setAiLoading(true);
        setAiError('');
        setShowAiPanel(true);
        try {
            const res = await fetch('/api/ai-suggest-icd', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ consultationId }),
            });
            const data = await res.json();
            if (data.suggestions) {
                setAiSuggestions(data.suggestions);
            } else {
                setAiError(data.error || 'Failed to get suggestions');
            }
        } catch {
            setAiError('Failed to connect to AI service');
        }
        setAiLoading(false);
    }

    function selectSuggestion(s: AiSuggestion) {
        setQuery(s.code);
        setSelectedDesc(s.description);
        onChange(s.code, s.description);
        setShowAiPanel(false);
    }

    return (
        <div ref={wrapperRef} className="relative">
            <label className="block text-xs text-text-muted uppercase tracking-wider font-semibold mb-2">
                ICD-10 Code
            </label>

            <div className="flex gap-2">
                {/* Search input */}
                <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" />
                    <input
                        type="text"
                        value={value || query}
                        onChange={e => handleInput(e.target.value)}
                        onFocus={() => { if (results.length > 0) setOpen(true); }}
                        placeholder="Search ICD code or description..."
                        className="w-full pl-10 pr-8 py-3 bg-bg-elevated border border-border rounded-xl text-text-primary placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-accent/50 transition-all text-sm font-mono"
                    />
                    {(value || query) && (
                        <button
                            type="button"
                            onClick={handleClear}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-text-muted hover:text-text-primary"
                        >
                            <X className="w-4 h-4" />
                        </button>
                    )}
                    {searching && (
                        <div className="absolute right-10 top-1/2 -translate-y-1/2">
                            <Loader2 className="w-4 h-4 animate-spin text-accent" />
                        </div>
                    )}
                </div>

                {/* AI Suggest button */}
                {consultationId && (
                    <button
                        type="button"
                        onClick={handleAiSuggest}
                        disabled={aiLoading}
                        className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-gradient-to-r from-purple/20 to-accent/20 border border-purple/30 text-purple hover:from-purple/30 hover:to-accent/30 transition-all text-xs font-semibold whitespace-nowrap disabled:opacity-50"
                        title="AI Suggest ICD Codes"
                    >
                        {aiLoading ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                            <Sparkles className="w-4 h-4" />
                        )}
                        AI Suggest
                    </button>
                )}
            </div>

            {/* Selected description */}
            {selectedDesc && (
                <p className="text-xs text-accent mt-1.5 font-medium">{selectedDesc}</p>
            )}

            {/* Search results dropdown */}
            {open && results.length > 0 && (
                <div className="absolute z-50 mt-1 w-full max-h-60 overflow-y-auto bg-bg-primary border border-border rounded-xl shadow-2xl animate-fade-in">
                    {results.map(item => (
                        <button
                            key={item.id}
                            type="button"
                            onClick={() => handleSelect(item)}
                            className="w-full flex items-start gap-3 px-4 py-3 text-left hover:bg-accent-faded transition-colors border-b border-border/30 last:border-0"
                        >
                            <span className="font-mono text-sm font-bold text-accent whitespace-nowrap">{item.code}</span>
                            <div className="flex-1 min-w-0">
                                <span className="text-sm text-text-primary block truncate">{item.description}</span>
                                {item.description_ar && (
                                    <span className="text-xs text-text-muted block truncate" dir="rtl">{item.description_ar}</span>
                                )}
                            </div>
                        </button>
                    ))}
                </div>
            )}

            {/* AI Suggestions panel */}
            {showAiPanel && (
                <div className="mt-3 bg-gradient-to-br from-purple/5 to-accent/5 border border-purple/20 rounded-xl p-4 animate-fade-in">
                    <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-2">
                            <Sparkles className="w-4 h-4 text-purple" />
                            <span className="text-sm font-bold text-text-primary">AI Suggested Codes</span>
                        </div>
                        <button type="button" onClick={() => setShowAiPanel(false)} className="text-text-muted hover:text-text-primary">
                            <X className="w-4 h-4" />
                        </button>
                    </div>

                    {aiLoading ? (
                        <div className="flex items-center justify-center py-6">
                            <Loader2 className="w-5 h-5 animate-spin text-purple" />
                            <span className="ml-2 text-sm text-text-muted">Analyzing clinical data...</span>
                        </div>
                    ) : aiError ? (
                        <div className="flex items-center gap-2 text-sm text-error py-3">
                            <AlertCircle className="w-4 h-4" />
                            {aiError}
                        </div>
                    ) : aiSuggestions.length === 0 ? (
                        <p className="text-sm text-text-muted py-3">No suggestions available for this consultation.</p>
                    ) : (
                        <div className="space-y-2">
                            {aiSuggestions.map((s, i) => (
                                <button
                                    key={i}
                                    type="button"
                                    onClick={() => selectSuggestion(s)}
                                    className="w-full flex items-start gap-3 px-3 py-2.5 rounded-lg hover:bg-bg-elevated transition-colors text-left group"
                                >
                                    <span className="font-mono text-sm font-bold text-accent whitespace-nowrap">{s.code}</span>
                                    <div className="flex-1 min-w-0">
                                        <span className="text-sm text-text-primary block">{s.description}</span>
                                        <span className="text-xs text-text-muted block mt-0.5">{s.reasoning}</span>
                                    </div>
                                    <span className={`px-2 py-0.5 rounded-lg text-[10px] font-bold uppercase whitespace-nowrap ${CONFIDENCE_STYLES[s.confidence] || CONFIDENCE_STYLES.low}`}>
                                        {s.confidence}
                                    </span>
                                </button>
                            ))}
                            <p className="text-[10px] text-text-muted mt-2 opacity-70">
                                AI suggestions are for reference only. Confirm clinical accuracy before use.
                            </p>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
