// ============================================================
// Civiora Atmospheric Layered Environment
// ============================================================
// Multi-layer reactive spatial atmosphere inspired by Reference:
// Layer 1: Deep Dark Navy canvas foundation (#050A14)
// Layer 2: Silky undulating liquid smoke waves (Canvas 2D curves)
// Layer 3: Mouse-damped volumetric light fields (#527FC7 & #9FC9FF)
// Layer 4: Micro luminous civic telemetry nodes
// Layer 5: Spatial cyber grid with subtle vignetting
// ============================================================

import React, { useEffect, useRef, useState } from 'react';

export interface AtmosphericCanvasProps {
  intensity?: 'subtle' | 'vibrant' | 'emergency';
  interactive?: boolean;
}

export const AtmosphericCanvas: React.FC<AtmosphericCanvasProps> = ({
  intensity = 'subtle',
  interactive = true,
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [mousePos, setMousePos] = useState({ x: 0.5, y: 0.35 });
  const [reducedMotion, setReducedMotion] = useState(false);

  // Monitor reduced motion preference
  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    setReducedMotion(mq.matches);
    const handler = (e: MediaQueryListEvent) => setReducedMotion(e.matches);
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, []);

  // Mouse interaction tracker
  useEffect(() => {
    if (!interactive || reducedMotion) return;

    let rafId: number;
    let targetX = 0.5;
    let targetY = 0.35;
    let currentX = 0.5;
    let currentY = 0.35;

    const onMouseMove = (e: MouseEvent) => {
      targetX = e.clientX / window.innerWidth;
      targetY = e.clientY / window.innerHeight;
    };

    window.addEventListener('mousemove', onMouseMove, { passive: true });

    const loop = () => {
      currentX += (targetX - currentX) * 0.035;
      currentY += (targetY - currentY) * 0.035;
      setMousePos({ x: currentX, y: currentY });
      rafId = requestAnimationFrame(loop);
    };

    rafId = requestAnimationFrame(loop);

    return () => {
      window.removeEventListener('mousemove', onMouseMove);
      cancelAnimationFrame(rafId);
    };
  }, [interactive, reducedMotion]);

  // Liquid Silk Waves Canvas Rendering (Reference Image 0 Aesthetics)
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animId: number;
    let width = (canvas.width = window.innerWidth);
    let height = (canvas.height = window.innerHeight);

    const onResize = () => {
      if (!canvas) return;
      width = canvas.width = window.innerWidth;
      height = canvas.height = window.innerHeight;
    };

    window.addEventListener('resize', onResize);

    let t = 0;

    const render = () => {
      t += reducedMotion ? 0.001 : 0.004;
      ctx.clearRect(0, 0, width, height);

      // Deep dark navy foundation
      const bgGrad = ctx.createRadialGradient(
        width * 0.5,
        height * 0.3,
        width * 0.1,
        width * 0.5,
        height * 0.5,
        width * 0.8
      );
      bgGrad.addColorStop(0, '#0A1832');
      bgGrad.addColorStop(0.5, '#071022');
      bgGrad.addColorStop(1, '#050A14');
      ctx.fillStyle = bgGrad;
      ctx.fillRect(0, 0, width, height);

      // Render 4 layered undulating silky ribbon waves
      const waveCount = 4;
      for (let w = 0; w < waveCount; w++) {
        ctx.beginPath();
        const baseOffset = height * (0.35 + w * 0.12);
        const waveAmp = 45 + w * 18;
        const freq = 0.0015 - w * 0.0002;
        const phase = t + w * 1.4;

        ctx.moveTo(0, height);
        ctx.lineTo(0, baseOffset);

        for (let x = 0; x <= width; x += 12) {
          const mouseDistort = Math.sin((x / width) * Math.PI) * (mousePos.y - 0.5) * 60;
          const y =
            baseOffset +
            Math.sin(x * freq + phase) * waveAmp +
            Math.cos(x * freq * 1.5 + phase * 0.8) * (waveAmp * 0.4) +
            mouseDistort;
          ctx.lineTo(x, y);
        }

        ctx.lineTo(width, height);
        ctx.closePath();

        // Wave Fill Gradient with dark navy & ice highlight
        const waveGrad = ctx.createLinearGradient(0, baseOffset - 60, width, baseOffset + 180);
        if (intensity === 'emergency') {
          waveGrad.addColorStop(0, `rgba(255, 69, 58, ${0.08 - w * 0.015})`);
          waveGrad.addColorStop(1, 'rgba(10, 16, 28, 0.4)');
        } else {
          waveGrad.addColorStop(0, `rgba(82, 127, 199, ${0.12 - w * 0.02})`);
          waveGrad.addColorStop(0.5, `rgba(159, 201, 255, ${0.05 - w * 0.01})`);
          waveGrad.addColorStop(1, 'rgba(5, 10, 20, 0.7)');
        }
        ctx.fillStyle = waveGrad;
        ctx.fill();

        // Wave Crest Specular Ridge
        ctx.lineWidth = 1.2;
        ctx.strokeStyle = `rgba(159, 201, 255, ${0.18 - w * 0.03})`;
        ctx.stroke();
      }

      animId = requestAnimationFrame(render);
    };

    render();

    return () => {
      window.removeEventListener('resize', onResize);
      cancelAnimationFrame(animId);
    };
  }, [reducedMotion, intensity, mousePos]);

  const isEmergency = intensity === 'emergency';
  const orb1Color = isEmergency
    ? 'rgba(255, 69, 58, 0.22)'
    : 'rgba(82, 127, 199, 0.22)';
  const orb2Color = isEmergency
    ? 'rgba(255, 159, 10, 0.18)'
    : 'rgba(159, 201, 255, 0.16)';

  const posX1 = mousePos.x * 100;
  const posY1 = mousePos.y * 100;

  return (
    <div
      className="position-fixed top-0 start-0 w-100 h-100 overflow-hidden pointer-events-none"
      style={{ zIndex: 0, pointerEvents: 'none' }}
      aria-hidden="true"
    >
      {/* ── Layer 1: HTML5 Canvas Silky Liquid Ribbons ──────── */}
      <canvas
        ref={canvasRef}
        className="w-100 h-100 position-absolute top-0 start-0"
        style={{ display: 'block' }}
      />

      {/* ── Layer 2: Mouse-Following Volumetric Blue Light ──── */}
      <div
        style={{
          position: 'absolute',
          top: `${posY1 - 25}%`,
          left: `${posX1 - 25}%`,
          width: '680px',
          height: '680px',
          borderRadius: '50%',
          background: `radial-gradient(circle, ${orb1Color} 0%, transparent 68%)`,
          filter: 'blur(75px)',
          opacity: 0.85,
          transition: reducedMotion ? 'none' : 'transform 0.12s linear',
        }}
      />

      {/* ── Layer 3: Secondary Ambient Ice Volumetric Field ─── */}
      <div
        style={{
          position: 'absolute',
          top: '28%',
          right: '8%',
          width: '720px',
          height: '720px',
          borderRadius: '50%',
          background: `radial-gradient(circle, ${orb2Color} 0%, transparent 72%)`,
          filter: 'blur(90px)',
          opacity: 0.65,
        }}
      />

      {/* ── Layer 4: Spatial Grid & Subtle Vignette ─────────── */}
      <div
        className="w-100 h-100 bg-spatial-grid position-absolute top-0 start-0"
        style={{ opacity: 0.7 }}
      />

      <div
        className="w-100 h-100 position-absolute top-0 start-0"
        style={{
          background: 'radial-gradient(ellipse at center, transparent 40%, rgba(5, 10, 20, 0.75) 100%)',
        }}
      />
    </div>
  );
};

