"use client";

import React, { useEffect, useRef } from "react";

interface Point {
  tx: number; // Normalized target X (0 to 400)
  ty: number; // Normalized target Y (0 to 400)
  x: number;  // Current scrambled/floating X
  y: number;  // Current scrambled/floating Y
  ox: number; // Scrambled floating velocity X
  oy: number; // Scrambled floating velocity Y
  angle: number; // Noise angle for floating drift
}

interface TargetPath {
  points: Point[];
  strokeColor: string;
  strokeWidth: number;
  isDashed?: boolean;
  opacity: number;
  useWaveGradient?: boolean;
}

interface PrismWaveBackgroundProps {
  containerRef: React.RefObject<HTMLDivElement | null>;
}

export default function PrismWaveBackground({ containerRef }: PrismWaveBackgroundProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let animationFrameId: number;
    let width = (canvas.width = window.innerWidth);
    let height = (canvas.height = window.innerHeight);

    const featuresEl = document.getElementById("features");
    const coursesEl = document.getElementById("courses");

    // Helper to generate points between two coordinate sets (linear interpolation)
    const interpolatePoints = (x1: number, y1: number, x2: number, y2: number, count: number): Point[] => {
      const pts: Point[] = [];
      for (let i = 0; i <= count; i++) {
        const t = i / count;
        const tx = x1 + (x2 - x1) * t;
        const ty = y1 + (y2 - y1) * t;
        pts.push({
          tx,
          ty,
          x: Math.random() * width,
          y: Math.random() * height,
          ox: (Math.random() - 0.5) * 0.4, // slower drifting velocity (was 1.8)
          oy: (Math.random() - 0.5) * 0.4,
          angle: Math.random() * Math.PI * 2,
        });
      }
      return pts;
    };

    // Helper to generate points for a chain of quadratic Bezier curves
    const generateQuadBezierPathPoints = (
      segments: { p0: { x: number; y: number }; p1: { x: number; y: number }; p2: { x: number; y: number } }[],
      pointsPerSegment: number
    ): Point[] => {
      const pts: Point[] = [];
      segments.forEach((seg, segIdx) => {
        const start = segIdx === 0 ? 0 : 1;
        for (let i = start; i <= pointsPerSegment; i++) {
          const t = i / pointsPerSegment;
          const mt = 1 - t;
          const tx = mt * mt * seg.p0.x + 2 * mt * t * seg.p1.x + t * t * seg.p2.x;
          const ty = mt * mt * seg.p0.y + 2 * mt * t * seg.p1.y + t * t * seg.p2.y;
          pts.push({
            tx,
            ty,
            x: Math.random() * width,
            y: Math.random() * height,
            ox: (Math.random() - 0.5) * 0.4, // slower drifting velocity
            oy: (Math.random() - 0.5) * 0.4,
            angle: Math.random() * Math.PI * 2,
          });
        }
      });
      return pts;
    };

    // Initialize all paths (normalized 0-400 coordinates from the target SVG)
    const initPaths = (): TargetPath[] => {
      const paths: TargetPath[] = [];

      // 1. Sine Wave 1 (oscillating sine wave)
      const wave1Segments = [
        { p0: { x: 20, y: 200 }, p1: { x: 70, y: 120 }, p2: { x: 120, y: 200 } },
        { p0: { x: 120, y: 200 }, p1: { x: 170, y: 280 }, p2: { x: 220, y: 200 } },
        { p0: { x: 220, y: 200 }, p1: { x: 270, y: 120 }, p2: { x: 320, y: 200 } },
        { p0: { x: 320, y: 200 }, p1: { x: 370, y: 280 }, p2: { x: 380, y: 200 } },
      ];
      // Reduced step count from 12 to 8 to decrease line density, and thinner strokes (1.2)
      paths.push({
        points: generateQuadBezierPathPoints(wave1Segments, 8),
        strokeColor: "#22D3EE",
        strokeWidth: 1.2,
        opacity: 0.16,
        useWaveGradient: true,
      });

      // 2. Sine Wave 2 (Cosine Offset, dashed)
      const wave2Segments = [
        { p0: { x: 20, y: 200 }, p1: { x: 70, y: 280 }, p2: { x: 120, y: 200 } },
        { p0: { x: 120, y: 200 }, p1: { x: 170, y: 120 }, p2: { x: 220, y: 200 } },
        { p0: { x: 220, y: 200 }, p1: { x: 270, y: 280 }, p2: { x: 320, y: 200 } },
        { p0: { x: 320, y: 200 }, p1: { x: 370, y: 120 }, p2: { x: 380, y: 200 } },
      ];
      paths.push({
        points: generateQuadBezierPathPoints(wave2Segments, 8),
        strokeColor: "#22D3EE",
        strokeWidth: 1.2,
        isDashed: true,
        opacity: 0.16,
        useWaveGradient: true,
      });

      // 3. Prism Geometry (Closed triangle 200,80 -> 130,260 -> 270,260 -> 200,80)
      const prismSegments = [
        { p0: { x: 200, y: 80 }, p1: { x: 130, y: 260 } },
        { p0: { x: 130, y: 260 }, p1: { x: 270, y: 260 } },
        { p0: { x: 270, y: 260 }, p1: { x: 200, y: 80 } },
      ];
      const prismPts: Point[] = [];
      prismSegments.forEach((seg, segIdx) => {
        const start = segIdx === 0 ? 0 : 1;
        const count = 10;
        for (let i = start; i <= count; i++) {
          const t = i / count;
          const tx = seg.p0.x + (seg.p1.x - seg.p0.x) * t;
          const ty = seg.p0.y + (seg.p1.y - seg.p0.y) * t;
          prismPts.push({
            tx,
            ty,
            x: Math.random() * width,
            y: Math.random() * height,
            ox: (Math.random() - 0.5) * 0.4,
            oy: (Math.random() - 0.5) * 0.4,
            angle: Math.random() * Math.PI * 2,
          });
        }
      });
      paths.push({
        points: prismPts,
        strokeColor: "#22D3EE",
        strokeWidth: 1.0,
        opacity: 0.12,
      });

      // 4. Light Ray 1 (50,200 L 165,170)
      paths.push({
        points: interpolatePoints(50, 200, 165, 170, 8),
        strokeColor: "#67E8F9",
        strokeWidth: 1.0,
        opacity: 0.15,
      });

      // 5. Light Ray 2 (235,170 L 330,130)
      paths.push({
        points: interpolatePoints(235, 170, 330, 130, 8),
        strokeColor: "#22D3EE",
        strokeWidth: 1.0,
        opacity: 0.15,
      });

      // 6. Light Ray 3 (235,170 L 340,180)
      paths.push({
        points: interpolatePoints(235, 170, 340, 180, 8),
        strokeColor: "#38BDF8",
        strokeWidth: 1.0,
        opacity: 0.1,
      });

      // 7. Light Ray 4 (235,170 L 330,230)
      paths.push({
        points: interpolatePoints(235, 170, 330, 230, 8),
        strokeColor: "#0284C7",
        strokeWidth: 1.0,
        opacity: 0.08,
      });

      return paths;
    };

    let targetPaths = initPaths();

    // Handle screen resize
    const handleResize = () => {
      width = canvas.width = window.innerWidth;
      height = canvas.height = window.innerHeight;
      targetPaths = initPaths();
    };
    window.addEventListener("resize", handleResize);

    // Floating background particles (reduced count to 8, extremely slow drift)
    const bgParticles = Array.from({ length: 8 }, () => ({
      x: Math.random() * width,
      y: Math.random() * height,
      vx: (Math.random() - 0.5) * 0.1,
      vy: (Math.random() - 0.5) * 0.1,
      r: Math.random() * 2 + 1,
    }));

    // Animation Loop
    const draw = () => {
      ctx.clearRect(0, 0, width, height);

      // Get scroll progress (between 0 and 1)
      let progress = 0;
      let sectionOpacityMult = 1.0;

      if (containerRef && containerRef.current) {
        const container = containerRef.current;
        const scrollTop = container.scrollTop;

        // Dynamic offsets matching actual section layout positions
        const featuresTop = featuresEl ? featuresEl.offsetTop : window.innerHeight;
        const coursesTop = coursesEl ? coursesEl.offsetTop : window.innerHeight * 2;

        if (scrollTop < featuresTop) {
          // Hero Section: lines are scrambled and fade out as we scroll down
          progress = 0;
          sectionOpacityMult = Math.max(0, 1 - scrollTop / featuresTop);
        } else if (scrollTop >= featuresTop && scrollTop < coursesTop) {
          // Transition features -> courses: morph from scrambled to converged prism
          const range = coursesTop - featuresTop;
          progress = range > 0 ? (scrollTop - featuresTop) / range : 0;

          // Completely clean in Features, fades back in during transition to Courses
          const featuresActiveEnd = featuresTop + range * 0.2;
          if (scrollTop < featuresActiveEnd) {
            sectionOpacityMult = 0.0;
          } else {
            sectionOpacityMult = Math.min(1.0, (scrollTop - featuresActiveEnd) / (range * 0.8));
          }
        } else {
          // At or past Courses: lines are fully converged
          progress = 1.0;
          sectionOpacityMult = 1.0;
        }
      }

      if (sectionOpacityMult > 0) {
        // 1. Draw drifting environment particles (fainter: 0.015 opacity)
        ctx.fillStyle = `rgba(34, 211, 238, ${0.015 * sectionOpacityMult})`;
        bgParticles.forEach((p) => {
          p.x += p.vx;
          p.y += p.vy;

          if (p.x < 0 || p.x > width) p.vx *= -1;
          if (p.y < 0 || p.y > height) p.vy *= -1;

          ctx.beginPath();
          ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
          ctx.fill();
        });

        // Scaled up Prism & Waves to span across curriculum cards
        const size = Math.min(width, height) * 1.15;
        const startX = (width - size) / 2;
        const startY = (height - size) / 2;

        // 2. Render and morph target paths
        targetPaths.forEach((path) => {
          // Set styling per path
          if (path.useWaveGradient) {
            const grad = ctx.createLinearGradient(startX, 0, startX + size, 0);
            const baseOpacity = 0.06 * (1 - progress);
            const o1 = (baseOpacity + 0.06 * progress) * sectionOpacityMult;
            const o2 = (baseOpacity + 0.16 * progress) * sectionOpacityMult; // lighter wave peak (0.16)
            const o3 = (baseOpacity + 0.06 * progress) * sectionOpacityMult;
            grad.addColorStop(0, `rgba(34, 211, 238, ${o1})`);
            grad.addColorStop(0.5, `rgba(34, 211, 238, ${o2})`);
            grad.addColorStop(1, `rgba(2, 132, 199, ${o3})`);
            ctx.strokeStyle = grad;
            ctx.globalAlpha = 1.0;
          } else {
            ctx.strokeStyle = path.strokeColor;
            const baseOpacity = 0.06 * (1 - progress);
            ctx.globalAlpha = (baseOpacity + path.opacity * progress) * sectionOpacityMult;
          }

          ctx.lineWidth = path.strokeWidth;
          ctx.lineCap = "round";
          ctx.lineJoin = "round";

          if (path.isDashed) {
            ctx.setLineDash([4, 4]);
          } else {
            ctx.setLineDash([]);
          }

          // Resolve points coordinates and handle drift/interpolation
          const resolvedPoints = path.points.map((pt) => {
            const screenTx = startX + (pt.tx / 400) * size;
            const screenTy = startY + (pt.ty / 400) * size;

            // Slowed down noise shift speed (0.008) and size (18)
            pt.angle += 0.008;
            const noiseX = Math.sin(pt.angle) * 18 * (1 - progress);
            const noiseY = Math.cos(pt.angle) * 18 * (1 - progress);

            const currentX = (screenTx + noiseX) * progress + pt.x * (1 - progress);
            const currentY = (screenTy + noiseY) * progress + pt.y * (1 - progress);

            pt.x += pt.ox * (1 - progress);
            pt.y += pt.oy * (1 - progress);

            if (pt.x < 0 || pt.x > width) pt.ox *= -1;
            if (pt.y < 0 || pt.y > height) pt.oy *= -1;

            return { x: currentX, y: currentY };
          });

          // Draw smoothed curve using quadratic Bezier curve interpolation (Smoothing AC)
          ctx.beginPath();
          if (resolvedPoints.length > 0) {
            ctx.moveTo(resolvedPoints[0].x, resolvedPoints[0].y);
            if (resolvedPoints.length === 2) {
              ctx.lineTo(resolvedPoints[1].x, resolvedPoints[1].y);
            } else {
              for (let i = 1; i < resolvedPoints.length - 1; i++) {
                const xc = (resolvedPoints[i].x + resolvedPoints[i + 1].x) / 2;
                const yc = (resolvedPoints[i].y + resolvedPoints[i + 1].y) / 2;
                ctx.quadraticCurveTo(resolvedPoints[i].x, resolvedPoints[i].y, xc, yc);
              }
              ctx.lineTo(resolvedPoints[resolvedPoints.length - 1].x, resolvedPoints[resolvedPoints.length - 1].y);
            }
          }
          ctx.stroke();
        });

        // Reset styles
        ctx.globalAlpha = 1.0;
        ctx.setLineDash([]);
      }

      animationFrameId = requestAnimationFrame(draw);
    };

    draw();

    return () => {
      window.removeEventListener("resize", handleResize);
      cancelAnimationFrame(animationFrameId);
    };
  }, [containerRef]);

  return (
    <canvas
      ref={canvasRef}
      className="fixed inset-0 w-full h-full pointer-events-none z-0 bg-transparent"
      style={{ filter: "drop-shadow(0 0 10px rgba(34,211,238,0.18))" }}
    />
  );
}
