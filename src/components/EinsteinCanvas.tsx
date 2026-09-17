"use client";

import React, { useEffect, useRef } from "react";
import { useScroll } from "framer-motion";

// Silhouette paths (coordinates normalized 0-100) for a realistic, detailed Einstein portrait
const EINSTEIN_PATHS = [
  // Forehead creases (iconic wrinkles)
  [[42, 28], [50, 26], [58, 28]],
  [[38, 33], [50, 31], [62, 33]],
  [[45, 37], [50, 36], [55, 37]],

  // Right Eyebrow (expressive arched line)
  [[55, 41], [58, 38], [63, 40], [66, 43]],
  // Left Eyebrow
  [[45, 41], [42, 38], [37, 40], [34, 43]],

  // Right Eye (eyelid and shape)
  [[56, 46], [59, 44], [62, 46], [59, 48], [56, 46]],
  [[58, 46], [60, 46]], // pupil

  // Left Eye
  [[44, 46], [41, 44], [38, 46], [41, 48], [44, 46]],
  [[40, 46], [42, 46]], // pupil

  // Nose Bridge & Base
  [[50, 42], [49, 48], [48, 55], [45, 58], [50, 60], [55, 58], [52, 55], [51, 48]],

  // Nasolabial folds (cheek wrinkles for age lines)
  [[44, 52], [42, 60], [39, 68]],
  [[56, 52], [58, 60], [61, 68]],

  // Iconic bushy mustache
  [[40, 68], [43, 64], [50, 66], [57, 64], [60, 68], [50, 74], [40, 68]],
  [[42, 69], [37, 72], [35, 75]],
  [[58, 69], [63, 72], [65, 75]],
  [[46, 70], [50, 72], [54, 70]],

  // Mouth & Chin crease
  [[47, 77], [53, 77]],
  [[45, 80], [50, 82], [55, 80]],

  // Face/Jaw Outline
  [[33, 44], [32, 52], [34, 62], [37, 72], [44, 82], [50, 85], [56, 82], [63, 72], [66, 62], [68, 52], [67, 44]],

  // Messy wild hair - Layer 1 (Outer outline)
  [[33, 44], [25, 42], [20, 36], [18, 28], [22, 18], [30, 12], [40, 10], [50, 8], [60, 10], [70, 12], [78, 18], [82, 28], [80, 36], [75, 42], [67, 44]],
  
  // Messy wild hair - Layer 2 (Curly details left)
  [[22, 18], [15, 14], [18, 6], [30, 12]],
  [[18, 28], [8, 25], [10, 15], [22, 18]],
  [[25, 42], [14, 45], [12, 34], [20, 36]],
  [[28, 32], [22, 30], [24, 24], [32, 26]],

  // Messy wild hair - Layer 3 (Curly details right)
  [[78, 18], [85, 14], [82, 6], [70, 12]],
  [[82, 28], [92, 25], [90, 15], [78, 18]],
  [[75, 42], [86, 45], [88, 34], [80, 36]],
  [[72, 32], [78, 30], [76, 24], [68, 26]],

  // Messy wild hair - Layer 4 (Top volume spikes)
  [[40, 10], [38, 0], [45, 4]],
  [[50, 8], [50, -2], [53, 4]],
  [[60, 10], [62, 0], [57, 4]],

  // Neck and Coat Collar
  [[42, 85], [35, 96], [48, 94], [50, 88], [52, 94], [65, 96], [58, 85]]
];

export default function EinsteinCanvas() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const { scrollYProgress } = useScroll();

  useEffect(() => {
    const isMobile = window.innerWidth < 768;
    if (isMobile) return;

    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let animationFrameId: number;
    let width = (canvas.width = window.innerWidth);
    let height = (canvas.height = window.innerHeight);

    // Track particles / morph states
    interface Point {
      tx: number; // Target X
      ty: number; // Target Y
      x: number;  // Current X
      y: number;  // Current Y
      ox: number; // Offset X noise speed
      oy: number; // Offset Y noise speed
      angle: number;
    }

    // Convert EINSTEIN_PATHS coordinates into actual canvas relative coordinates
    const generatePaths = (): Point[][] => {
      // Calculate scale and center offset
      const size = Math.min(width, height) * 0.45;
      const startX = (width - size) / 2;
      const startY = (height - size) / 2 + size * 0.1;

      return EINSTEIN_PATHS.map((path) => {
        return path.map(([px, py]) => {
          const tx = startX + (px / 100) * size;
          const ty = startY + (py / 100) * size;
          // Random initial positions across the screen
          const rx = Math.random() * width;
          const ry = Math.random() * height;
          return {
            tx,
            ty,
            x: rx,
            y: ry,
            ox: (Math.random() - 0.5) * 1.5,
            oy: (Math.random() - 0.5) * 1.5,
            angle: Math.random() * Math.PI * 2,
          };
        });
      });
    };

    let paths = generatePaths();

    // Handle resize
    const handleResize = () => {
      width = canvas.width = window.innerWidth;
      height = canvas.height = window.innerHeight;
      paths = generatePaths();
    };
    window.addEventListener("resize", handleResize);

    // Particle background paths that float around
    interface BackgroundLine {
      x1: number;
      y1: number;
      x2: number;
      y2: number;
      vx1: number;
      vy1: number;
      vx2: number;
      vy2: number;
    }
    const bgLines: BackgroundLine[] = Array.from({ length: 15 }, () => ({
      x1: Math.random() * width,
      y1: Math.random() * height,
      x2: Math.random() * width,
      y2: Math.random() * height,
      vx1: (Math.random() - 0.5) * 0.5,
      vy1: (Math.random() - 0.5) * 0.5,
      vx2: (Math.random() - 0.5) * 0.5,
      vy2: (Math.random() - 0.5) * 0.5,
    }));

    // Animation Loop
    const draw = () => {
      ctx.clearRect(0, 0, width, height);

      // Get scroll progress (value between 0 and 1)
      const progress = scrollYProgress.get();

      // 1. Draw subtle background lines floating around
      ctx.strokeStyle = "rgba(6, 182, 212, 0.05)";
      ctx.lineWidth = 1;
      bgLines.forEach((line) => {
        line.x1 += line.vx1;
        line.y1 += line.vy1;
        line.x2 += line.vx2;
        line.y2 += line.vy2;

        if (line.x1 < 0 || line.x1 > width) line.vx1 *= -1;
        if (line.y1 < 0 || line.y1 > height) line.vy1 *= -1;
        if (line.x2 < 0 || line.x2 > width) line.vx2 *= -1;
        if (line.y2 < 0 || line.y2 > height) line.vy2 *= -1;

        ctx.beginPath();
        ctx.moveTo(line.x1, line.y1);
        ctx.lineTo(line.x2, line.y2);
        ctx.stroke();
      });

      // 2. Render and morph Einstein face silhouette (highly muted to protect readability)
      const opacity = 0.04 + progress * 0.08; // subtle: maxes out at 12% opacity
      ctx.strokeStyle = `rgba(34, 211, 238, ${opacity})`;
      ctx.shadowColor = "rgba(34, 211, 238, 0.2)";
      ctx.shadowBlur = progress * 4;
      ctx.lineWidth = 1.2 + progress * 0.6;
      ctx.lineCap = "round";
      ctx.lineJoin = "round";

      paths.forEach((path) => {
        ctx.beginPath();
        path.forEach((pt, idx) => {
          pt.angle += 0.01;
          const noiseX = Math.sin(pt.angle) * 15 * (1 - progress);
          const noiseY = Math.cos(pt.angle) * 15 * (1 - progress);

          const currentX = (pt.tx + noiseX) * progress + pt.x * (1 - progress);
          const currentY = (pt.ty + noiseY) * progress + pt.y * (1 - progress);

          if (idx === 0) {
            ctx.moveTo(currentX, currentY);
          } else {
            ctx.lineTo(currentX, currentY);
          }

          pt.x += pt.ox * (1 - progress);
          pt.y += pt.oy * (1 - progress);

          if (pt.x < 0 || pt.x > width) pt.ox *= -1;
          if (pt.y < 0 || pt.y > height) pt.oy *= -1;
        });
        ctx.stroke();
      });

      ctx.shadowBlur = 0;
      animationFrameId = requestAnimationFrame(draw);
    };

    draw();

    return () => {
      window.removeEventListener("resize", handleResize);
      cancelAnimationFrame(animationFrameId);
    };
  }, [scrollYProgress]);

  return (
    <canvas
      ref={canvasRef}
      className="fixed inset-0 w-full h-full pointer-events-none z-[-10] bg-transparent"
    />
  );
}
