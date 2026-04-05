import React, { useRef, useState } from 'react';
import { X } from '@cliniqone/ui';

interface PhotoUploadProps {
    photos: string[];
    onAdd: (dataUrl: string) => void;
    onRemove: (dataUrl: string) => void;
    maxPhotos?: number;
    label?: string;
}

/**
 * Web-native photo upload using file input.
 * Converts selected files to data URLs for preview and upload.
 */
export function PhotoUpload({ photos, onAdd, onRemove, maxPhotos = 5, label }: PhotoUploadProps) {
    const inputRef = useRef<HTMLInputElement>(null);

    function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
        const files = e.target.files;
        if (!files) return;

        Array.from(files).forEach((file) => {
            if (photos.length >= maxPhotos) return;
            const reader = new FileReader();
            reader.onload = () => {
                if (typeof reader.result === 'string') {
                    onAdd(reader.result);
                }
            };
            reader.readAsDataURL(file);
        });

        // Reset input so same file can be selected again
        e.target.value = '';
    }

    return (
        <div>
            {label && <p style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 8 }}>{label}</p>}
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, marginBottom: 12 }}>
                {photos.map((photo, idx) => (
                    <div key={idx} style={{ position: 'relative', width: 80, height: 80, borderRadius: 10, overflow: 'hidden' }}>
                        <img src={photo} alt={`Photo ${idx + 1}`} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                        <button
                            onClick={() => onRemove(photo)}
                            style={{
                                position: 'absolute', top: 2, right: 2, width: 22, height: 22, borderRadius: 11,
                                backgroundColor: 'rgba(220,38,38,0.9)', color: '#fff', border: 'none',
                                cursor: 'pointer', fontSize: 12, fontWeight: 700,
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                            }}
                        >
                            <X size={10} color="#fff" strokeWidth={3} />
                        </button>
                    </div>
                ))}
                {photos.length < maxPhotos && (
                    <button
                        onClick={() => inputRef.current?.click()}
                        style={{
                            width: 80, height: 80, borderRadius: 10, border: '2px dashed var(--border)',
                            backgroundColor: 'var(--bg-card)', color: 'var(--text-tertiary)', fontSize: 28,
                            cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
                        }}
                    >
                        +
                    </button>
                )}
            </div>
            <input
                ref={inputRef}
                type="file"
                accept="image/*"
                multiple
                onChange={handleFileChange}
                style={{ display: 'none' }}
            />
            <p style={{ fontSize: 12, color: 'var(--text-tertiary)' }}>
                {photos.length}/{maxPhotos} photos
            </p>
        </div>
    );
}
