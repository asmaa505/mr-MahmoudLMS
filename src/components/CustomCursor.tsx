"use client";

import React, { useEffect, useState } from "react";
import { motion, useMotionValue, useSpring } from "framer-motion";

export default function CustomCursor() {
  const [isHovered, setIsHovered] = useState(false);
  const [isVisible, setIsVisible] = useState(false);

  // Position motion values
  const cursorX = useMotionValue(-100);
  const cursorY = useMotionValue(-100);

  // Smooth springs for lag-behind stretch look
  const springConfig = { stiffness: 450, damping: 28 };
  const cursorXSpring = useSpring(cursorX, springConfig);
  const cursorYSpring = useSpring(cursorY, springConfig);

  useEffect(() => {
    // Disable on mobile/touch devices to save main-thread JS execution
    const isMobile = window.innerWidth < 1024 || window.matchMedia("(pointer: coarse)").matches;
    if (isMobile) return;

    const moveCursor = (e: MouseEvent) => {
      cursorX.set(e.clientX - 10);
      cursorY.set(e.clientY - 10);
      if (!isVisible) setIsVisible(true);
    };

    const handleMouseLeave = () => {
      setIsVisible(false);
    };

    window.addEventListener("mousemove", moveCursor);
    document.addEventListener("mouseleave", handleMouseLeave);

    // Track hovered elements
    const handleMouseOver = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (!target) return;
      if (
        target.tagName === "BUTTON" ||
        target.tagName === "A" ||
        target.closest("a") ||
        target.closest("button") ||
        target.closest("[data-hover]") ||
        target.classList.contains("hoverable")
      ) {
        setIsHovered(true);
      } else {
        setIsHovered(false);
      }
    };

    window.addEventListener("mouseover", handleMouseOver);

    return () => {
      window.removeEventListener("mousemove", moveCursor);
      document.removeEventListener("mouseleave", handleMouseLeave);
      window.removeEventListener("mouseover", handleMouseOver);
    };
  }, [cursorX, cursorY, isVisible]);

  if (!isVisible) return null;

  return (
    <motion.div
      className="fixed top-0 left-0 w-5 h-5 rounded-full bg-physicsCyan-400/80 pointer-events-none z-50 mix-blend-screen hidden lg:block"
      style={{
        x: cursorXSpring,
        y: cursorYSpring,
        originY: 0, // Pivots stretch from the top, pushing it down
        boxShadow: "0 0 12px rgba(34, 211, 238, 0.6)",
      }}
      animate={{
        scaleX: isHovered ? 0.8 : 1,
        scaleY: isHovered ? 1.4 : 1,
        y: isHovered ? 10 : 0, // Smoothly drops downward on hover
      }}
      transition={{
        type: "spring",
        stiffness: 300,
        damping: 15,
      }}
    />
  );
}
