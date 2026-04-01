import { useState, useRef, type CSSProperties } from 'react';
import { colors, spacing, radius } from '@cliniqone/ui';

interface DocumentUploaderProps {
    label: string;
    documentType: string;
    accept?: string;
    maxSizeMB?: number;
    file: File | null;
    existingUrl?: string;
    existingName?: string;
    onFileSelect: (file: File) => void;
    onRemove: () => void;
    uploading?: boolean;
    verified?: boolean;
    rejectionReason?: string;
}

export function DocumentUploader({
    label,
    documentType,
    accept = '.pdf,.jpg,.jpeg,.png',
    maxSizeMB = 10,
    file,
    existingUrl,
    existingName,
    onFileSelect,
    onRemove,
    uploading = false,
    verified,
    rejectionReason,
}: DocumentUploaderProps) {
    const inputRef = useRef<HTMLInputElement>(null);
    const [dragOver, setDragOver] = useState(false);
    const [error, setError] = useState('');

    const hasFile = file || existingName;

    function handleFileChange(f: File | undefined) {
        if (!f) return;

        // Validate size
        if (f.size > maxSizeMB * 1024 * 1024) {
            setError(`File too large. Maximum ${maxSizeMB}MB.`);
            return;
        }

        // Validate type
        const ext = f.name.split('.').pop()?.toLowerCase() || '';
        const validExts = accept.split(',').map(e => e.replace('.', '').trim());
        if (!validExts.includes(ext)) {
            setError(`Invalid file type. Accepted: ${accept}`);
            return;
        }

        setError('');
        onFileSelect(f);
    }

    const typeEmoji: Record<string, string> = {
        national_id: '🪪',
        medical_license: '🏥',
        cv: '📄',
        specialization_cert: '🎓',
        disclaimer_signed: '✅',
        other: '📎',
    };

    return (
        <div style={s.container}>
            <div style={s.header}>
                <span style={s.label}>
                    {typeEmoji[documentType] || '📎'} {label}
                </span>
                {verified === true && <span style={s.verifiedBadge}>✅ Verified</span>}
                {verified === false && rejectionReason && (
                    <span style={s.rejectedBadge}>❌ Rejected</span>
                )}
            </div>

            {rejectionReason && (
                <div style={s.rejectionCard}>
                    <span style={{ fontSize: 12, color: '#dc2626' }}>
                        ⚠️ {rejectionReason}
                    </span>
                </div>
            )}

            {hasFile ? (
                <div style={s.fileCard}>
                    <div style={s.fileInfo}>
                        <span style={s.fileIcon}>
                            {file?.type?.startsWith('image/') ? '🖼️' : '📄'}
                        </span>
                        <div style={{ flex: 1, minWidth: 0 }}>
                            <p style={s.fileName}>{file?.name || existingName}</p>
                            {file && (
                                <p style={s.fileSize}>
                                    {(file.size / 1024).toFixed(1)} KB
                                </p>
                            )}
                        </div>
                        {uploading ? (
                            <div style={s.spinner} />
                        ) : (
                            <button style={s.removeBtn} onClick={onRemove}>
                                ✕
                            </button>
                        )}
                    </div>

                    {/* Image preview */}
                    {file?.type?.startsWith('image/') && (
                        <img
                            src={URL.createObjectURL(file)}
                            alt="Preview"
                            style={s.imagePreview}
                        />
                    )}
                </div>
            ) : (
                <div
                    style={{
                        ...s.dropZone,
                        ...(dragOver ? s.dropZoneActive : {}),
                    }}
                    onClick={() => inputRef.current?.click()}
                    onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
                    onDragLeave={() => setDragOver(false)}
                    onDrop={(e) => {
                        e.preventDefault();
                        setDragOver(false);
                        handleFileChange(e.dataTransfer.files[0]);
                    }}
                >
                    <span style={{ fontSize: 32, marginBottom: 8, display: 'block' }}>
                        {typeEmoji[documentType] || '📎'}
                    </span>
                    <span style={s.dropText}>
                        Tap to upload or drag & drop
                    </span>
                    <span style={s.dropHint}>
                        PDF, JPG, PNG • Max {maxSizeMB}MB
                    </span>
                </div>
            )}

            {error && (
                <span style={s.errorText}>⚠️ {error}</span>
            )}

            <input
                ref={inputRef}
                type="file"
                accept={accept}
                style={{ display: 'none' }}
                onChange={(e) => handleFileChange(e.target.files?.[0])}
            />
        </div>
    );
}

const s: Record<string, CSSProperties> = {
    container: {
        marginBottom: spacing.lg,
    },
    header: {
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: spacing.sm,
    },
    label: {
        fontSize: 13,
        fontWeight: 600,
        color: colors.textPrimary,
        textTransform: 'uppercase' as const,
        letterSpacing: 0.5,
    },
    verifiedBadge: {
        fontSize: 10,
        fontWeight: 700,
        color: colors.success,
        backgroundColor: `${colors.success}15`,
        padding: '2px 8px',
        borderRadius: 8,
    },
    rejectedBadge: {
        fontSize: 10,
        fontWeight: 700,
        color: '#dc2626',
        backgroundColor: '#dc262615',
        padding: '2px 8px',
        borderRadius: 8,
    },
    rejectionCard: {
        backgroundColor: '#dc262610',
        border: '1px solid #dc262630',
        borderRadius: radius.md,
        padding: spacing.sm,
        marginBottom: spacing.sm,
    },
    dropZone: {
        display: 'flex',
        flexDirection: 'column' as const,
        alignItems: 'center',
        justifyContent: 'center',
        padding: spacing.xl,
        borderRadius: radius.lg,
        border: `2px dashed ${colors.border}`,
        backgroundColor: colors.bgTertiary,
        cursor: 'pointer',
        transition: 'all 0.2s ease',
    },
    dropZoneActive: {
        borderColor: colors.accentTeal,
        backgroundColor: `${colors.accentTeal}08`,
    },
    dropText: {
        fontSize: 14,
        fontWeight: 600,
        color: colors.textSecondary,
        marginBottom: 4,
    },
    dropHint: {
        fontSize: 11,
        color: colors.textTertiary,
    },
    fileCard: {
        backgroundColor: colors.bgCard,
        border: `1px solid ${colors.border}`,
        borderRadius: radius.lg,
        padding: spacing.md,
    },
    fileInfo: {
        display: 'flex',
        alignItems: 'center',
        gap: spacing.md,
    },
    fileIcon: {
        fontSize: 24,
        flexShrink: 0,
    },
    fileName: {
        fontSize: 13,
        fontWeight: 600,
        color: colors.textPrimary,
        overflow: 'hidden',
        textOverflow: 'ellipsis',
        whiteSpace: 'nowrap' as const,
        margin: 0,
    },
    fileSize: {
        fontSize: 11,
        color: colors.textTertiary,
        margin: 0,
    },
    removeBtn: {
        width: 28,
        height: 28,
        borderRadius: 14,
        border: `1px solid ${colors.border}`,
        backgroundColor: 'transparent',
        color: colors.textSecondary,
        fontSize: 12,
        cursor: 'pointer',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        flexShrink: 0,
    },
    spinner: {
        width: 20,
        height: 20,
        border: `2px solid ${colors.border}`,
        borderTop: `2px solid ${colors.accentTeal}`,
        borderRadius: '50%',
        animation: 'spin 1s linear infinite',
        flexShrink: 0,
    },
    imagePreview: {
        marginTop: spacing.sm,
        width: '100%',
        maxHeight: 200,
        objectFit: 'cover' as const,
        borderRadius: radius.md,
    },
    errorText: {
        display: 'block',
        fontSize: 12,
        color: '#dc2626',
        marginTop: spacing.xs,
    },
};
