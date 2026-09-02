"use client";

import React, { useEffect, useState } from "react";

const SECTION_NAMES: { [key: string]: string } = {
  hero: "الرئيسية (البداية)",
  features: "ميزات المنصة",
  courses: "المراحل التعليمية والمناهج",
};

export default function LandingClientHelpers({ hoveredLinkText = null }: { hoveredLinkText?: string | null }) {
  const [activeSection, setActiveSection] = useState<string | null>(null);
  const [showToast, setShowToast] = useState(false);
  const [toastText, setToastText] = useState("");

  useEffect(() => {
    const sections = document.querySelectorAll("section[id]");
    
    const observerOptions = {
      root: null,
      rootMargin: "-40% 0px -40% 0px", // triggers when section occupies center stage
      threshold: 0,
    };

    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          const id = entry.target.getAttribute("id");
          if (id && SECTION_NAMES[id]) {
            setActiveSection(id);
            setToastText(SECTION_NAMES[id]);
            setShowToast(true);
          }
        }
      });
    }, observerOptions);

    sections.forEach((section) => observer.observe(section));

    return () => {
      sections.forEach((section) => observer.unobserve(section));
    };
  }, []);

  // Handle toast timeout to fade out (only when NOT hovering a link)
  useEffect(() => {
    if (showToast && !hoveredLinkText) {
      const timer = setTimeout(() => {
        setShowToast(false);
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [showToast, toastText, hoveredLinkText]);

  return (
    <>
      {/* Floating Section Indicator Toast with Integrated 3D Fish */}
      <div
        className={`fixed bottom-6 right-6 z-50 transition-all duration-500 transform ${
          (showToast || !!hoveredLinkText) ? "opacity-100 translate-y-0 scale-100" : "opacity-0 translate-y-4 scale-95 pointer-events-none"
        }`}
      >
        <div className="relative flex items-center gap-3 pr-16 pl-6 py-4 bg-slate-950/95 backdrop-blur-md border border-physicsCyan-500/30 rounded-2xl shadow-2xl shadow-physicsCyan-950/50 text-right select-none min-w-[245px]">
          
          {/* Integrated 3D Cute Front-Facing Fish Character popping out of bottom-right of toast */}
          <div className="absolute -bottom-6 -right-6 w-20 h-20 pointer-events-none animate-bounce" style={{ animationDuration: "3s" }}>
            <svg viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-full filter drop-shadow-[0_8px_16px_rgba(6,182,212,0.5)]">
              <defs>
                {/* 3D Shading Body Gradient - Spherical Shading centered */}
                <radialGradient id="body3DFront" cx="50%" cy="40%" r="50%">
                  <stop offset="0%" stopColor="#cffafe" /> {/* Centered shiny highlight */}
                  <stop offset="60%" stopColor="#22d3ee" /> {/* Mid-tone body */}
                  <stop offset="90%" stopColor="#0891b2" /> {/* Deep teal sphere edge */}
                  <stop offset="100%" stopColor="#0f172a" /> {/* Deep shadow border */}
                </radialGradient>

                {/* Translucent Symmetrical Fin Gradient */}
                <linearGradient id="finGradFront" x1="0%" y1="0%" x2="0%" y2="100%">
                  <stop offset="0%" stopColor="#22d3ee" stopOpacity="0.8" />
                  <stop offset="100%" stopColor="#0891b2" stopOpacity="0.3" />
                </linearGradient>

                {/* Rosy Cheek radial glow */}
                <radialGradient id="rosyCheek" cx="50%" cy="50%" r="50%">
                  <stop offset="0%" stopColor="#f472b6" stopOpacity="0.9" />
                  <stop offset="100%" stopColor="#f472b6" stopOpacity="0" />
                </radialGradient>
              </defs>

              {/* Symmetrical Tail Fin showing behind body at bottom */}
              <path d="M 50 70 Q 30 95, 50 92 Q 70 95, 50 70 Z" fill="url(#finGradFront)" />
              <path d="M 50 70 Q 40 98, 50 95 Q 60 98, 50 70 Z" fill="url(#finGradFront)" opacity="0.8" />

              {/* Dorsal Fin showing behind body at top */}
              <path d="M 50 30 Q 50 5, 42 8 Q 50 18, 50 30 Z" fill="url(#finGradFront)" />

              {/* Left Pectoral Fin */}
              <path d="M 28 55 Q 10 50, 18 68 Q 28 62, 28 55 Z" fill="url(#finGradFront)" />

              {/* Right Pectoral Fin */}
              <path d="M 72 55 Q 90 50, 82 68 Q 72 62, 72 55 Z" fill="url(#finGradFront)" />

              {/* Cute 3D Body Sphere */}
              <circle cx="50" cy="50" r="26" fill="url(#body3DFront)" />

              {/* Rosy Cheeks Blush */}
              <circle cx="34" cy="54" r="4.5" fill="url(#rosyCheek)" />
              <circle cx="66" cy="54" r="4.5" fill="url(#rosyCheek)" />

              {/* Big Symmetrical Eyes */}
              {/* Left Eye */}
              <circle cx="38" cy="44" r="6.5" fill="white" />
              <circle cx="38" cy="44" r="4" fill="#083344" />
              <circle cx="39.5" cy="42.5" r="1.5" fill="white" /> {/* Glossy highlights */}
              <circle cx="37" cy="45.5" r="0.6" fill="white" />

              {/* Right Eye */}
              <circle cx="62" cy="44" r="6.5" fill="white" />
              <circle cx="62" cy="44" r="4" fill="#083344" />
              <circle cx="63.5" cy="42.5" r="1.5" fill="white" /> {/* Symmetrical highlights */}
              <circle cx="61" cy="45.5" r="0.6" fill="white" />

              {/* Smiling Cute Mouth */}
              <path d="M 44 56 Q 50 61, 56 56" stroke="#083344" strokeWidth="2.2" strokeLinecap="round" fill="none" />
              
              {/* Tiny Symmetrical Bubbles floating up */}
              <circle cx="20" cy="30" r="2" fill="#22d3ee" className="animate-pulse" opacity="0.6" />
              <circle cx="80" cy="24" r="1.5" fill="#cffafe" className="animate-pulse" opacity="0.8" />
            </svg>
          </div>

          <div className="w-2.5 h-2.5 rounded-full bg-physicsCyan-400 animate-pulse shrink-0 mt-1" />
          <div className="pr-2">
            {hoveredLinkText !== "الملف الشخصي للمطورة على LinkedIn" && (
              <span className="text-[10px] text-slate-400 block font-medium">
                {hoveredLinkText ? "أنت تستكشف الآن رابط" : "أنت تتصفح الآن قسم"}
              </span>
            )}
            <span className="text-sm font-bold text-white block mt-0.5">
              {hoveredLinkText ? hoveredLinkText : (toastText || "الرئيسية (البداية)")}
            </span>
          </div>
        </div>
      </div>
    </>
  );
}
