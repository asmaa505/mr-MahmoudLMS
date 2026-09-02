"use client";

import React, { useEffect, useRef } from "react";

export default function AtomBackground() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let animationFrameId: number;
    let width = (canvas.width = canvas.parentElement?.clientWidth || window.innerWidth);
    let height = (canvas.height = canvas.parentElement?.clientHeight || window.innerHeight);

    // Handle screen resize
    const handleResize = () => {
      if (!canvas) return;
      width = canvas.width = canvas.parentElement?.clientWidth || window.innerWidth;
      height = canvas.height = canvas.parentElement?.clientHeight || window.innerHeight;
    };
    window.addEventListener("resize", handleResize);

    // Orbits configuration (reduced speeds by ~50% for lighter/gentler movement)
    const orbits = [
      { rotation: Math.PI / 6, speed: 0.007, offset: 0 },
      { rotation: (5 * Math.PI) / 6, speed: 0.009, offset: Math.PI / 3 },
      { rotation: Math.PI / 2, speed: 0.008, offset: (2 * Math.PI) / 3 },
      { rotation: -Math.PI / 6, speed: 0.006, offset: Math.PI },
    ];

    // Nucleus components (reduced proton sizes and speed by ~50% for stability)
    const protons: { x: number; y: number; r: number; color: string; angle: number; speed: number; dist: number }[] = [];
    const colors = ["#22d3ee", "#818cf8", "#38bdf8", "#6366f1"];
    for (let i = 0; i < 12; i++) {
      protons.push({
        x: 0,
        y: 0,
        r: Math.random() * 3 + 3.5, // reduced radius (was *5 + 6)
        color: colors[i % colors.length],
        angle: Math.random() * Math.PI * 2,
        speed: (Math.random() - 0.5) * 0.008, // slower nucleus spin
        dist: Math.random() * 8 + 3, // clustered tighter together (was *12 + 4)
      });
    }

    let time = 0;

    const draw = () => {
      ctx.clearRect(0, 0, width, height);

      const centerX = width / 2;
      const centerY = height / 2;

      // Base sizes scaled to fit nicely within section bounds
      const baseSize = Math.min(width, height) * 0.35;
      const ellipseA = baseSize;
      const ellipseB = baseSize * 0.32;

      // Draw Electron Orbits
      orbits.forEach((orbit) => {
        ctx.save();
        ctx.translate(centerX, centerY);
        ctx.rotate(orbit.rotation);

        // Draw the orbit ring (thinner and low opacity: 0.08)
        ctx.beginPath();
        ctx.ellipse(0, 0, ellipseA, ellipseB, 0, 0, Math.PI * 2);
        ctx.strokeStyle = "rgba(34, 211, 238, 0.08)";
        ctx.lineWidth = 1.0;
        ctx.stroke();

        // Draw Electron Trail (fading tail, low opacity: 0.22)
        const t = time * orbit.speed + orbit.offset;
        for (let angleOffset = -0.3; angleOffset <= 0; angleOffset += 0.03) {
          const currentT = t + angleOffset;
          const tx = ellipseA * Math.cos(currentT);
          const ty = ellipseB * Math.sin(currentT);
          const alpha = (angleOffset + 0.3) / 0.3; // fade out trail

          ctx.fillStyle = `rgba(34, 211, 238, ${alpha * 0.22})`;
          ctx.beginPath();
          ctx.arc(tx, ty, 1.8, 0, Math.PI * 2); // smaller trail dots
          ctx.fill();
        }

        // Draw Electron (smaller size and lighter glow)
        const ex = ellipseA * Math.cos(t);
        const ey = ellipseB * Math.sin(t);

        ctx.shadowColor = "#22d3ee";
        ctx.shadowBlur = 6;
        ctx.fillStyle = "#22d3ee";
        ctx.beginPath();
        ctx.arc(ex, ey, 3.5, 0, Math.PI * 2); // smaller radius (was 5.0)
        ctx.fill();

        ctx.restore();
      });

      // Draw Nucleus (central protons/neutrons cluster, smaller sizes)
      protons.forEach((p) => {
        p.angle += p.speed;
        const px = centerX + Math.cos(p.angle) * p.dist;
        const py = centerY + Math.sin(p.angle) * p.dist;

        ctx.save();
        // Create glowing 3D spheres using radial gradients
        const grad = ctx.createRadialGradient(px - p.r/3, py - p.r/3, p.r * 0.1, px, py, p.r);
        grad.addColorStop(0, "#ffffff");
        grad.addColorStop(0.2, p.color);
        grad.addColorStop(1, "rgba(15, 23, 42, 0.95)");

        ctx.fillStyle = grad;
        ctx.shadowColor = p.color;
        ctx.shadowBlur = 4;
        ctx.beginPath();
        ctx.arc(px, py, p.r, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      });

      time += 1.0;
      animationFrameId = requestAnimationFrame(draw);
    };

    draw();

    return () => {
      window.removeEventListener("resize", handleResize);
      cancelAnimationFrame(animationFrameId);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="absolute inset-0 w-full h-full pointer-events-none z-0 bg-transparent opacity-22"
    />
  );
}
