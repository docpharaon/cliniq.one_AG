import React, { useEffect, useRef } from 'react';

interface AudioWaveformProps {
    audioLevel: number;
    isActive: boolean;
    width?: number;
    height?: number;
    color?: string;
}

export function AudioWaveform({
    audioLevel,
    isActive,
    width = 200,
    height = 40,
    color = '#1A8A9E',
}: AudioWaveformProps) {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const barsRef = useRef<number[]>(new Array(30).fill(2));

    useEffect(() => {
        if (!isActive) return;

        // Smooth the audio level into the bars
        const currentBars = barsRef.current;
        const targetHeight = Math.max(2, audioLevel * height);
        
        // Offset the bars (shift left)
        currentBars.shift();
        currentBars.push(targetHeight);
        
        // Draw to canvas
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        ctx.clearRect(0, 0, width, height);
        ctx.fillStyle = color;

        const barWidth = width / currentBars.length;
        const gap = 2;

        currentBars.forEach((h, i) => {
            const x = i * barWidth;
            const y = (height - h) / 2;
            
            // Rounded bars
            ctx.beginPath();
            ctx.roundRect(x + gap/2, y, barWidth - gap, h, 4);
            ctx.fill();
        });

    }, [audioLevel, isActive, color, width, height]);

    return (
        <canvas
            ref={canvasRef}
            width={width}
            height={height}
            style={{
                width,
                height,
                opacity: isActive ? 1 : 0.3,
                transition: 'opacity 0.3s ease',
            }}
        />
    );
}
