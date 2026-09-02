"use client";

import React from "react";

export default function UnlockCourseButton() {
  const handleClick = () => {
    // 1. Find the input
    const input = document.getElementById("activation-code-input") as HTMLInputElement;
    if (input) {
      // 2. Find the unlock card and apply a brief visual focus/glow effect
      const card = document.getElementById("activation-card");
      if (card) {
        card.scrollIntoView({ behavior: "smooth", block: "center" });
        
        // Add styling classes for the glow effect
        card.classList.add("ring-2", "ring-physicsCyan-500", "shadow-lg", "shadow-physicsCyan-500/20", "scale-[1.02]");
        
        // Remove styling classes after 1.5 seconds
        setTimeout(() => {
          card.classList.remove("ring-2", "ring-physicsCyan-500", "shadow-lg", "shadow-physicsCyan-500/20", "scale-[1.02]");
        }, 1500);
      }

      // Focus the input
      setTimeout(() => {
        input.focus();
      }, 300);
    }
  };

  return (
    <button
      onClick={handleClick}
      className="inline-flex w-full justify-center items-center py-2.5 bg-slate-100 text-slate-500 hover:bg-physicsCyan-50 hover:text-physicsCyan-600 text-xs font-bold rounded-xl border border-dashed border-slate-200 cursor-pointer transition-all duration-350 text-center focus:outline-none focus:ring-2 focus:ring-physicsCyan-500/40"
    >
      أدخل كود التفعيل بالجانب لفتحه
    </button>
  );
}
