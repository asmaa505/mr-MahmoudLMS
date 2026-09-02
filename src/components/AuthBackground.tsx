import React from "react";

interface AuthBackgroundProps {
  children: React.ReactNode;
}

export default function AuthBackground({ children }: AuthBackgroundProps) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-tr from-[#010b14] via-[#021320] to-physicsNavy-900 p-4 relative overflow-hidden">
      {/* Decorative Background */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden select-none z-0">
        
        {/* Glow Circles (large circular grid patterns) */}
        <div className="absolute top-10 right-10 w-72 h-72 rounded-full border-4 border-dashed border-physicsCyan-400/10 animate-spin" style={{ animationDuration: "40s" }} />
        <div className="absolute bottom-10 left-10 w-96 h-96 rounded-full border-2 border-physicsCyan-600/5 animate-pulse" />

        {/* Scattered Physics Icons Layer */}
        <div className="absolute inset-0 opacity-25">
          {/* Atom Symbol top left */}
          <div className="absolute top-[20%] left-[8%]">
            <div className="absolute w-24 h-24 bg-physicsCyan-500/25 rounded-full blur-2xl -translate-x-4 -translate-y-4 pointer-events-none" />
            <div className="relative text-cyan-400 filter drop-shadow-[0_0_4px_#00f0ff] drop-shadow-[0_0_12px_rgba(6,182,212,0.6)] transform -rotate-12 animate-pulse" style={{ animationDuration: "8s" }}>
              <svg className="w-16 h-16" viewBox="0 0 100 100" fill="none" stroke="currentColor" strokeWidth="2.5">
                <ellipse cx="50" cy="50" rx="40" ry="15" transform="rotate(0 50 50)" />
                <ellipse cx="50" cy="50" rx="40" ry="15" transform="rotate(60 50 50)" />
                <ellipse cx="50" cy="50" rx="40" ry="15" transform="rotate(120 50 50)" />
                <circle cx="50" cy="50" r="6" fill="currentColor" />
              </svg>
            </div>
          </div>

          {/* E = mc^2 formula middle left */}
          <div className="absolute top-[45%] left-[10%]">
            <div className="absolute w-28 h-12 bg-physicsCyan-500/20 rounded-full blur-2xl -translate-x-4 pointer-events-none" />
            <div className="relative text-cyan-300 text-3xl font-extrabold font-serif filter drop-shadow-[0_0_4px_#00f0ff] drop-shadow-[0_0_10px_rgba(6,182,212,0.6)] transform -rotate-6">
              E = mc²
            </div>
          </div>

          {/* Light wave / sine wave bottom right */}
          <div className="absolute bottom-[20%] right-[6%]">
            <div className="absolute w-36 h-16 bg-physicsCyan-500/20 rounded-full blur-2xl -translate-x-4 pointer-events-none" />
            <div className="relative text-cyan-400 filter drop-shadow-[0_0_4px_#00f0ff] drop-shadow-[0_0_12px_rgba(6,182,212,0.6)]">
              <svg className="w-28 h-12" viewBox="0 0 120 30" fill="none" stroke="currentColor" strokeWidth="3">
                <path d="M 0 15 Q 15 0, 30 15 T 60 15 T 90 15 T 120 15" strokeDasharray="2 2" className="animate-pulse" />
                <path d="M 0 15 Q 15 30, 30 15 T 60 15 T 90 15 T 120 15" />
              </svg>
            </div>
          </div>

          {/* Planet with rings top right */}
          <div className="absolute top-[12%] right-[10%]">
            <div className="absolute w-24 h-24 bg-physicsCyan-500/25 rounded-full blur-2xl -translate-x-4 -translate-y-4 pointer-events-none" />
            <div className="relative text-cyan-300 filter drop-shadow-[0_0_4px_#00f0ff] drop-shadow-[0_0_12px_rgba(6,182,212,0.6)] rotate-12">
              <svg className="w-16 h-16" viewBox="0 0 100 100" fill="none" stroke="currentColor" strokeWidth="2.5">
                <circle cx="50" cy="50" r="20" />
                <ellipse cx="50" cy="50" rx="40" ry="8" transform="rotate(-15 50 50)" />
              </svg>
            </div>
          </div>

          {/* Circuit / magnetic fields middle right */}
          <div className="absolute top-[52%] right-[8%]">
            <div className="absolute w-24 h-24 bg-physicsCyan-500/20 rounded-full blur-2xl -translate-x-4 pointer-events-none" />
            <div className="relative text-cyan-400 filter drop-shadow-[0_0_4px_#00f0ff] drop-shadow-[0_0_12px_rgba(6,182,212,0.6)]">
              <svg className="w-14 h-14" viewBox="0 0 100 100" fill="none" stroke="currentColor" strokeWidth="2.5">
                <rect x="35" y="35" width="30" height="30" rx="4" />
                <path d="M 15 50 L 35 50 M 65 50 L 85 50" />
                <circle cx="15" cy="50" r="4" fill="currentColor" />
                <circle cx="85" cy="50" r="4" fill="currentColor" />
                <path d="M 50 15 L 50 35 M 50 65 L 50 85" strokeDasharray="3 3" />
              </svg>
            </div>
          </div>

          {/* Magnetic field lines bottom left */}
          <div className="absolute bottom-[12%] left-[8%]">
            <div className="absolute w-28 h-28 bg-physicsCyan-500/25 rounded-full blur-3xl -translate-x-4 -translate-y-4 pointer-events-none" />
            <div className="relative text-cyan-400 filter drop-shadow-[0_0_4px_#00f0ff] drop-shadow-[0_0_12px_rgba(6,182,212,0.6)]">
              <svg className="w-20 h-20" viewBox="0 0 100 100" fill="none" stroke="currentColor" strokeWidth="2">
                <rect x="40" y="30" width="20" height="40" rx="2" fill="none" />
                <text x="50" y="42" fill="currentColor" fontSize="10" fontWeight="bold" textAnchor="middle">N</text>
                <text x="50" y="65" fill="currentColor" fontSize="10" fontWeight="bold" textAnchor="middle">S</text>
                <path d="M 50 30 C 20 -10, 20 110, 50 70" />
                <path d="M 50 30 C 10 0, 10 100, 50 70" />
                <path d="M 50 30 C 80 -10, 80 110, 50 70" />
                <path d="M 50 30 C 90 0, 90 100, 50 70" />
              </svg>
            </div>
          </div>
        </div>
      </div>

      {/* Main card wrapper */}
      <div className="relative z-10 w-full flex items-center justify-center">
        {children}
      </div>
    </div>
  );
}
