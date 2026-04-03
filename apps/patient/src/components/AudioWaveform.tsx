// ─────────────────────────────────────────────────
// AudioWaveform — Canvas-based real-time audio visualization
// ─────────────────────────────────────────────────
import { useRef, useEffect } from 'react';

interface AudioWaveformProps {
    audioLevel: number;    // 0-1 normalized
    isActive: boolean;
    width?: number;
    height?: number;
    color?: string;
    barCount?: number;
}

export function AudioWaveform({
    audioLevel,
    isActive,
    width = 120,
    height = 32,
    color = '#1A8A9E',
    barCount = 16,
}: AudioWaveformProps) {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const animFrameRef = useRef<number>(0);
    const barsRef = useRef<number[]>(new Array(barCount).fill(0.1));

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;

        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        // Set actual pixel size for crisp rendering
        const dpr = window.devicePixelRatio || 1;
        canvas.width = width * dpr;
        canvas.height = height * dpr;
        ctx.scale(dpr, dpr);

        const draw = () => {
            ctx.clearRect(0, 0, width, height);

            const bars = barsRef.current;
            const barWidth = (width / barCount) * 0.6;
            const gap = (width / barCount) * 0.4;

            for (let i = 0; i < barCount; i++) {
                if (isActive) {
                    // Animate bars with organic movement
                    const target = Math.max(
                        0.08,
                        audioLevel * (0.4 + Math.random() * 0.6) *
                        (1 - Math.abs((i - barCount / 2) / barCount) * 0.5)
                    );
                    bars[i] += (target - bars[i]) * 0.3;
                } else {
                    // Fade out
                    bars[i] += (0.05 - bars[i]) * 0.15;
                }

                const barHeight = Math.max(2, bars[i] * height * 0.9);
                const x = i * (barWidth + gap) + gap / 2;
                const y = (height - barHeight) / 2;

                // Gradient color with opacity based on level
                const alpha = isActive ? 0.5 + bars[i] * 0.5 : 0.2;
                ctx.fillStyle = hexToRgba(color, alpha);
                ctx.beginPath();
                ctx.roundRect(x, y, barWidth, barHeight, barWidth / 2);
                ctx.fill();
            }

            animFrameRef.current = requestAnimationFrame(draw);
        };

        draw();

        return () => {
            cancelAnimationFrame(animFrameRef.current);
        };
    }, [audioLevel, isActive, width, height, color, barCount]);

    return (
        <canvas
            ref={canvasRef}
            style={{ width, height }}
            aria-hidden="true"
        />
    );
}

function hexToRgba(hex: string, alpha: number): string {
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}
