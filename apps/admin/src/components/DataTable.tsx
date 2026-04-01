import { Search, ChevronLeft, ChevronRight, Download } from 'lucide-react';
import { useState } from 'react';

interface Column<T> {
    key: string;
    label: string;
    render?: (row: T) => React.ReactNode;
    sortable?: boolean;
    /** If true, show this column in the mobile card view. Max 3-4 recommended. */
    mobileVisible?: boolean;
}

interface DataTableProps<T> {
    title: string;
    subtitle?: string;
    columns: Column<T>[];
    data: T[];
    totalCount?: number;
    searchPlaceholder?: string;
    onSearch?: (query: string) => void;
    actions?: React.ReactNode;
    rowKey: (row: T) => string;
    onRowClick?: (row: T) => void;
}

export default function DataTable<T>({
    title,
    subtitle,
    columns,
    data,
    totalCount,
    searchPlaceholder = 'Search...',
    onSearch,
    actions,
    rowKey,
    onRowClick,
}: DataTableProps<T>) {
    const [search, setSearch] = useState('');
    const [page, setPage] = useState(1);
    const perPage = 25;

    const handleSearch = (val: string) => {
        setSearch(val);
        setPage(1);
        onSearch?.(val);
    };

    const filteredData = search.trim() && !onSearch
        ? data.filter((row) => {
            const q = search.toLowerCase();
            return Object.values(row as Record<string, unknown>).some((val) => {
                if (val === null || val === undefined) return false;
                return String(val).toLowerCase().includes(q);
            });
        })
        : data;

    const totalItems = totalCount ?? filteredData.length;
    const totalPages = Math.ceil(totalItems / perPage);
    const paginatedData = filteredData.slice((page - 1) * perPage, page * perPage);

    // For mobile cards, pick columns marked mobileVisible or first 3
    const mobileColumns = columns.filter(c => c.mobileVisible !== false).slice(0, 4);

    return (
        <div className="glass rounded-2xl p-4 md:p-6 animate-fade-in">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 md:gap-4 pb-3 md:pb-4 border-b border-border">
                <div>
                    <h2 className="text-lg md:text-xl font-bold text-text-primary">{title}</h2>
                    {subtitle && <p className="text-xs md:text-sm text-text-muted mt-0.5">{subtitle}</p>}
                </div>
                {totalCount !== undefined && (
                    <span className="text-sm text-text-muted">
                        {search.trim() && !onSearch ? (
                            <>
                                <span className="text-text-secondary font-semibold">{filteredData.length}</span> of{' '}
                                <span className="text-text-secondary font-semibold">{totalCount.toLocaleString()}</span>
                            </>
                        ) : (
                            <>
                                Total: <span className="text-text-secondary font-semibold">{totalCount.toLocaleString()}</span>
                            </>
                        )}
                    </span>
                )}
            </div>

            {/* Toolbar */}
            <div className="flex flex-wrap items-center gap-3 py-3 md:py-4">
                <div className="relative flex-1 min-w-0 max-w-full md:max-w-[320px]">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" />
                    <input
                        type="text"
                        value={search}
                        onChange={(e) => handleSearch(e.target.value)}
                        placeholder={searchPlaceholder}
                        className="w-full bg-bg-elevated border border-border rounded-xl py-2.5 pl-10 pr-4 text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:border-accent focus:ring-2 focus:ring-accent-faded transition-all"
                    />
                </div>

                <div className="flex items-center gap-2 ml-auto">
                    <button className="hidden sm:flex items-center gap-2 px-4 py-2.5 rounded-xl border border-border text-sm text-accent hover:bg-accent-faded transition-colors">
                        <Download className="w-4 h-4" />
                        Export
                    </button>
                    {actions}
                </div>
            </div>

            {/* Mobile Card View */}
            <div className="md:hidden space-y-3">
                {paginatedData.length === 0 ? (
                    <div className="text-center py-12 text-text-muted text-sm">
                        {search.trim() ? 'No results match your search' : 'No data found'}
                    </div>
                ) : (
                    paginatedData.map((row) => (
                        <div
                            key={rowKey(row)}
                            onClick={() => onRowClick?.(row)}
                            className={`bg-bg-card border border-border rounded-2xl p-4 transition-all ${onRowClick ? 'cursor-pointer hover:border-accent/30 active:scale-[0.98]' : ''
                                }`}
                        >
                            {mobileColumns.map((col, i) => (
                                <div key={col.key} className={`${i > 0 ? 'mt-1.5' : ''}`}>
                                    <p className="text-[10px] uppercase tracking-wider text-text-muted font-semibold">{col.label}</p>
                                    <div className="text-sm text-text-primary">
                                        {col.render
                                            ? col.render(row)
                                            : String((row as Record<string, unknown>)[col.key] ?? '')}
                                    </div>
                                </div>
                            ))}
                        </div>
                    ))
                )}
            </div>

            {/* Desktop Table View */}
            <div className="hidden md:block overflow-x-auto">
                <table className="w-full border-separate" style={{ borderSpacing: '0 6px' }}>
                    <thead>
                        <tr>
                            {columns.map((col) => (
                                <th
                                    key={col.key}
                                    className={`px-4 py-3 text-left text-xs uppercase tracking-wider font-semibold text-text-secondary bg-bg-elevated first:rounded-l-xl last:rounded-r-xl ${col.sortable ? 'cursor-pointer hover:text-accent' : ''
                                        }`}
                                >
                                    {col.label}
                                </th>
                            ))}
                        </tr>
                    </thead>
                    <tbody>
                        {paginatedData.length === 0 ? (
                            <tr>
                                <td colSpan={columns.length} className="text-center py-12 text-text-muted text-sm">
                                    {search.trim() ? 'No results match your search' : 'No data found'}
                                </td>
                            </tr>
                        ) : (
                            paginatedData.map((row) => (
                                <tr
                                    key={rowKey(row)}
                                    onClick={() => onRowClick?.(row)}
                                    className={`group ${onRowClick ? 'cursor-pointer' : ''}`}
                                >
                                    {columns.map((col) => (
                                        <td
                                            key={col.key}
                                            className="px-4 py-4 text-sm text-text-primary bg-bg-card group-hover:bg-bg-elevated transition-colors first:rounded-l-xl last:rounded-r-xl"
                                        >
                                            {col.render
                                                ? col.render(row)
                                                : String((row as Record<string, unknown>)[col.key] ?? '')}
                                        </td>
                                    ))}
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
                <div className="flex items-center justify-between pt-3 md:pt-4 border-t border-border mt-2">
                    <button
                        onClick={() => setPage(Math.max(1, page - 1))}
                        disabled={page <= 1}
                        className="flex items-center gap-1 px-3 md:px-4 py-2 rounded-lg border border-border text-sm text-accent hover:bg-accent-faded transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                    >
                        <ChevronLeft className="w-4 h-4" />
                        <span className="hidden sm:inline">Previous</span>
                    </button>
                    <span className="text-sm text-text-secondary font-medium">
                        {page} / {totalPages}
                    </span>
                    <button
                        onClick={() => setPage(Math.min(totalPages, page + 1))}
                        disabled={page >= totalPages}
                        className="flex items-center gap-1 px-3 md:px-4 py-2 rounded-lg border border-border text-sm text-accent hover:bg-accent-faded transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                    >
                        <span className="hidden sm:inline">Next</span>
                        <ChevronRight className="w-4 h-4" />
                    </button>
                </div>
            )}
        </div>
    );
}
