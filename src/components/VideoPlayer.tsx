"use client";

import React, { useEffect, useState, useRef, useCallback } from "react";
import {
  AlertTriangle,
  EyeOff,
  Play,
  Pause,
  RotateCcw,
  Volume2,
  VolumeX,
  Maximize,
  Minimize,
  Lock,
  ShieldAlert,
} from "lucide-react";

interface VideoPlayerProps {
  videoUrl: string;
  lectureId?: string;
  studentName: string;
  studentPhone: string;
  studentIp?: string;
}

export default function VideoPlayer({
  videoUrl,
  lectureId,
  studentName,
  studentPhone,
  studentIp = "127.0.0.1",
}: VideoPlayerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const progressBarRef = useRef<HTMLDivElement>(null);
  const lastSyncTimeRef = useRef<number>(0);

  // Security & protection states
  // AC6: Subtle, non-distracting forensic watermark that moves gently every 40s instead of rapid annoying jumps
  const [watermarkPos, setWatermarkPos] = useState({ top: "20%", left: "20%" });
  const [seekWarning, setSeekWarning] = useState<string | null>(null);
  const [actionFeedback, setActionFeedback] = useState<string | null>(null);
  const [shakeProgressBar, setShakeProgressBar] = useState<boolean>(false);
  const [isTabBlurred, setIsTabBlurred] = useState<boolean>(false);
  const [isBlackoutActive, setIsBlackoutActive] = useState<boolean>(false);
  const [devToolsDetected, setDevToolsDetected] = useState<boolean>(false);
  const maxWatchedTimeRef = useRef<number>(0);
  const warningTimerRef = useRef<NodeJS.Timeout | null>(null);
  const feedbackTimerRef = useRef<NodeJS.Timeout | null>(null);
  const blackoutTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Player controls states
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [currentTime, setCurrentTime] = useState<number>(0);
  const [duration, setDuration] = useState<number>(0);
  const [bufferedPercent, setBufferedPercent] = useState<number>(0);
  const [volume, setVolume] = useState<number>(1);
  const [isMuted, setIsMuted] = useState<boolean>(false);
  const [playbackRate, setPlaybackRate] = useState<number>(1);
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);
  const [showControls, setShowControls] = useState<boolean>(true);
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const [hoverTime, setHoverTime] = useState<{ time: number; x: number; isBlocked: boolean } | null>(null);
  const hideControlsTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Trigger blackout shutter (for screenshot shortcuts)
  const triggerInstantBlackout = useCallback((reason = "تم حجب الصورة لمنع تصوير الشاشة") => {
    setIsBlackoutActive(true);
    if (videoRef.current && !videoRef.current.paused) {
      videoRef.current.pause();
      setIsPlaying(false);
    }

    // Attempt to clear clipboard to neutralize screen capture tools
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText("");
      }
    } catch {
      // Ignore clipboard permission errors
    }

    if (blackoutTimerRef.current) clearTimeout(blackoutTimerRef.current);
    blackoutTimerRef.current = setTimeout(() => {
      setIsBlackoutActive(false);
    }, 1500);

    setSeekWarning(reason);
    if (warningTimerRef.current) clearTimeout(warningTimerRef.current);
    warningTimerRef.current = setTimeout(() => {
      setSeekWarning(null);
    }, 3500);
  }, []);

  // 1. AC6: Subtle, non-distracting forensic watermark (gentle drift every 40 seconds)
  useEffect(() => {
    const interval = setInterval(() => {
      // Gentle positions around safe reading margins: 15% - 75%
      const positions = [
        { top: "18%", left: "15%" },
        { top: "25%", left: "65%" },
        { top: "72%", left: "20%" },
        { top: "68%", left: "60%" },
        { top: "45%", left: "35%" },
      ];
      const randomIdx = Math.floor(Math.random() * positions.length);
      const nextPos = positions[randomIdx] || positions[0];
      setWatermarkPos(nextPos);
    }, 40000);

    return () => clearInterval(interval);
  }, []);

  // 2. AC5: Page Visibility & Window Blur Detection (pause & blackout when user leaves window)
  useEffect(() => {
    const handleBlur = () => {
      setIsTabBlurred(true);
      if (videoRef.current && !videoRef.current.paused) {
        videoRef.current.pause();
        setIsPlaying(false);
      }
    };

    const handleFocus = () => {
      setIsTabBlurred(false);
    };

    const handleVisibilityChange = () => {
      if (document.hidden) {
        handleBlur();
      } else {
        handleFocus();
      }
    };

    window.addEventListener("blur", handleBlur);
    window.addEventListener("focus", handleFocus);
    window.addEventListener("pagehide", handleBlur);
    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      window.removeEventListener("blur", handleBlur);
      window.removeEventListener("focus", handleFocus);
      window.removeEventListener("pagehide", handleBlur);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, []);

  // 3. Screen Sharing / getDisplayMedia interception trap
  useEffect(() => {
    if (typeof window !== "undefined" && navigator.mediaDevices && navigator.mediaDevices.getDisplayMedia) {
      const originalGetDisplayMedia = navigator.mediaDevices.getDisplayMedia.bind(navigator.mediaDevices);
      navigator.mediaDevices.getDisplayMedia = async function (constraints) {
        triggerInstantBlackout("تم إيقاف الفيديو لاكتشاف محاولة مشاركة الشاشة");
        throw new Error("Screen sharing is blocked on secured lecture streams.");
      };

      return () => {
        navigator.mediaDevices.getDisplayMedia = originalGetDisplayMedia;
      };
    }
  }, [triggerInstantBlackout]);

  // 4. DevTools Detection Heuristic
  useEffect(() => {
    let checkInterval: NodeJS.Timeout;
    const threshold = 160;

    const checkDevTools = () => {
      const widthThreshold = window.outerWidth - window.innerWidth > threshold;
      const heightThreshold = window.outerHeight - window.innerHeight > threshold;
      if (widthThreshold || heightThreshold) {
        if (!devToolsDetected) {
          setDevToolsDetected(true);
          if (videoRef.current && !videoRef.current.paused) {
            videoRef.current.pause();
            setIsPlaying(false);
          }
        }
      } else if (devToolsDetected) {
        setDevToolsDetected(false);
      }
    };

    checkInterval = setInterval(checkDevTools, 1500);
    return () => clearInterval(checkInterval);
  }, [devToolsDetected]);

  // Trigger forward blocked warning message
  const triggerForwardBlockWarning = useCallback((msg = "عذراً، غير مسموح بتقديم الفيديو - يمكنك فقط الرجوع للخلف لمراجعة الشرح") => {
    setSeekWarning(msg);
    setShakeProgressBar(true);
    setTimeout(() => setShakeProgressBar(false), 600);

    if (warningTimerRef.current) clearTimeout(warningTimerRef.current);
    warningTimerRef.current = setTimeout(() => {
      setSeekWarning(null);
    }, 3500);
  }, []);

  // Trigger feedback toast (e.g. rewind 10s feedback)
  const triggerFeedback = useCallback((msg: string) => {
    setActionFeedback(msg);
    if (feedbackTimerRef.current) clearTimeout(feedbackTimerRef.current);
    feedbackTimerRef.current = setTimeout(() => {
      setActionFeedback(null);
    }, 1800);
  }, []);

  // 5. AC4: Block devtools, print-screen, snipping tool shortcuts, and strict forward keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // A. Screen capture / screenshot keys -> Trigger INSTANT BLACKOUT SHUTTER
      if (
        e.key === "PrintScreen" ||
        (e.key === "s" && e.shiftKey && (e.metaKey || (e as any).windowsKey)) || // Win+Shift+S or Cmd+Shift+S
        (e.metaKey && e.shiftKey && (e.key === "3" || e.key === "4" || e.key === "5")) // Mac screenshot shortcuts
      ) {
        e.preventDefault();
        e.stopPropagation();
        triggerInstantBlackout("تم حجب الفيديو لمنع التقاط الشاشة");
        return;
      }

      // B. Developer tools, Save, Print shortcuts
      if (
        e.key === "F12" ||
        (e.ctrlKey && (e.key === "s" || e.key === "S" || e.key === "u" || e.key === "U" || e.key === "p" || e.key === "P")) ||
        (e.ctrlKey && e.shiftKey && (e.key === "I" || e.key === "i" || e.key === "C" || e.key === "c" || e.key === "J" || e.key === "j")) ||
        (e.metaKey && e.altKey && (e.key === "i" || e.key === "I" || e.key === "j" || e.key === "J"))
      ) {
        e.preventDefault();
        e.stopPropagation();
        triggerInstantBlackout("تم حظر الإجراء لدواعي أمان محتوى المحاضرة");
        return;
      }

      // C. STRICT FORWARD SEEK BLOCK: ArrowRight or 'l' or 'L'
      if (e.key === "ArrowRight" || e.key === "l" || e.key === "L") {
        e.preventDefault();
        e.stopPropagation();
        triggerForwardBlockWarning("عذراً، غير مسموح بتقديم الفيديو - يمكنك فقط الرجوع للخلف لمراجعة ما سبق");
        return;
      }

      // D. REWIND SHORTCUTS (ALLOWED & ENCOURAGED):
      // ArrowLeft (rewind 5s), 'j' / 'J' (rewind 10s)
      if (e.key === "ArrowLeft") {
        e.preventDefault();
        if (videoRef.current) {
          videoRef.current.currentTime = Math.max(0, videoRef.current.currentTime - 5);
          triggerFeedback("تم الإرجاع 5 ثوانٍ للخلف ↺");
        }
        return;
      }

      if (e.key === "j" || e.key === "J") {
        e.preventDefault();
        if (videoRef.current) {
          videoRef.current.currentTime = Math.max(0, videoRef.current.currentTime - 10);
          triggerFeedback("تم الإرجاع 10 ثوانٍ للخلف ↺");
        }
        return;
      }

      // E. Space or 'k' for Play/Pause
      if (e.key === " " || e.key === "k" || e.key === "K") {
        const tag = (e.target as HTMLElement).tagName;
        if (tag !== "INPUT" && tag !== "TEXTAREA") {
          e.preventDefault();
          togglePlay();
        }
      }

      // F. 'f' or 'F' for Fullscreen
      if (e.key === "f" || e.key === "F") {
        const tag = (e.target as HTMLElement).tagName;
        if (tag !== "INPUT" && tag !== "TEXTAREA") {
          e.preventDefault();
          toggleFullscreen();
        }
      }

      // G. 'm' or 'M' for Mute
      if (e.key === "m" || e.key === "M") {
        const tag = (e.target as HTMLElement).tagName;
        if (tag !== "INPUT" && tag !== "TEXTAREA") {
          e.preventDefault();
          toggleMute();
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown, true);
    window.addEventListener("keyup", (e) => {
      if (e.key === "PrintScreen") {
        triggerInstantBlackout();
      }
    });

    return () => {
      window.removeEventListener("keydown", handleKeyDown, true);
    };
  }, [triggerForwardBlockWarning, triggerFeedback, triggerInstantBlackout]);

  // Fullscreen change listener
  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };

    document.addEventListener("fullscreenchange", handleFullscreenChange);
    return () => document.removeEventListener("fullscreenchange", handleFullscreenChange);
  }, []);

  // Prevent right-click context menu and drag
  const handleContextMenu = (e: React.MouseEvent) => {
    e.preventDefault();
  };

  const handleDragStart = (e: React.DragEvent) => {
    e.preventDefault();
  };

  // Play / Pause toggle
  const togglePlay = () => {
    if (!videoRef.current) return;
    if (videoRef.current.paused) {
      videoRef.current.play().then(() => setIsPlaying(true)).catch(() => {});
    } else {
      videoRef.current.pause();
      setIsPlaying(false);
    }
  };

  // REWIND 10 SECONDS (الرجوع 10 ثوانٍ للخلف)
  const handleRewind10 = (e?: React.MouseEvent) => {
    e?.stopPropagation();
    if (!videoRef.current) return;
    const newTime = Math.max(0, videoRef.current.currentTime - 10);
    videoRef.current.currentTime = newTime;
    setCurrentTime(newTime);
    triggerFeedback("تم الإرجاع 10 ثوانٍ للخلف ↺");
  };

  // REWIND 30 SECONDS (الرجوع 30 ثانية للخلف)
  const handleRewind30 = (e?: React.MouseEvent) => {
    e?.stopPropagation();
    if (!videoRef.current) return;
    const newTime = Math.max(0, videoRef.current.currentTime - 30);
    videoRef.current.currentTime = newTime;
    setCurrentTime(newTime);
    triggerFeedback("تم الإرجاع 30 ثانية للخلف ↺");
  };

  // PROGRESS BAR TIME CALCULATION (Strictly Enforces Left-to-Right LTR timeline)
  const calculateTargetTime = (clientX: number): number | null => {
    if (!progressBarRef.current || !videoRef.current) return null;
    const rect = progressBarRef.current.getBoundingClientRect();
    const clickX = clientX - rect.left;
    const fraction = Math.max(0, Math.min(1, clickX / rect.width));
    return fraction * (videoRef.current.duration || duration || 0);
  };

  // SEEKING LOGIC: Allows rewinding to ANY past time. BLOCKS forward seeking past watched limit.
  const handleSeekTo = (targetTime: number) => {
    if (!videoRef.current) return;

    // Highest point the student has legally reached in this session
    const maxAllowed = Math.max(videoRef.current.currentTime, maxWatchedTimeRef.current);

    // If target is ahead of what was already watched -> REJECT & WARN!
    if (targetTime > maxAllowed + 0.5) {
      triggerForwardBlockWarning("عذراً، غير مسموح بتقديم الفيديو - يمكنك فقط الرجوع للخلف لمراجعة الشرح");
      return;
    }

    // Moving backward (rewind) or moving within already-watched range -> 100% ALLOWED!
    videoRef.current.currentTime = targetTime;
    setCurrentTime(targetTime);
    if (targetTime < maxAllowed) {
      triggerFeedback(`تم الانتقال إلى ${formatTime(targetTime)} ↺`);
    }
  };

  // Progress bar click
  const handleProgressClick = (e: React.MouseEvent<HTMLDivElement>) => {
    e.stopPropagation();
    const target = calculateTargetTime(e.clientX);
    if (target !== null) {
      handleSeekTo(target);
    }
  };

  // Dragging / Scrubbing backwards on the progress bar
  const handleMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    e.stopPropagation();
    setIsDragging(true);
    const target = calculateTargetTime(e.clientX);
    if (target !== null) {
      handleSeekTo(target);
    }
  };

  useEffect(() => {
    const handleMouseMoveWindow = (e: MouseEvent) => {
      if (!isDragging) return;
      const target = calculateTargetTime(e.clientX);
      if (target !== null) {
        handleSeekTo(target);
      }
    };

    const handleMouseUpWindow = () => {
      if (isDragging) {
        setIsDragging(false);
      }
    };

    if (isDragging) {
      window.addEventListener("mousemove", handleMouseMoveWindow);
      window.addEventListener("mouseup", handleMouseUpWindow);
    }

    return () => {
      window.removeEventListener("mousemove", handleMouseMoveWindow);
      window.removeEventListener("mouseup", handleMouseUpWindow);
    };
  }, [isDragging]);

  // Touch support for mobile scrubbing backwards
  const handleTouchStart = (e: React.TouchEvent<HTMLDivElement>) => {
    const touch = e.touches[0];
    if (touch) {
      setIsDragging(true);
      const target = calculateTargetTime(touch.clientX);
      if (target !== null) {
        handleSeekTo(target);
      }
    }
  };

  const handleTouchMove = (e: React.TouchEvent<HTMLDivElement>) => {
    const touch = e.touches[0];
    if (touch && isDragging) {
      const target = calculateTargetTime(touch.clientX);
      if (target !== null) {
        handleSeekTo(target);
      }
    }
  };

  const handleTouchEnd = () => {
    setIsDragging(false);
  };

  // Hover indicator on progress bar
  const handleProgressBarMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!progressBarRef.current) return;
    const rect = progressBarRef.current.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const fraction = Math.max(0, Math.min(1, clickX / rect.width));
    const time = fraction * (duration || 1);
    const maxAllowed = Math.max(currentTime, maxWatchedTimeRef.current);
    setHoverTime({
      time,
      x: clickX,
      isBlocked: time > maxAllowed + 0.5,
    });
  };

  const handleProgressBarMouseLeave = () => {
    setHoverTime(null);
  };

  // Automated Video Progress Tracking
  const syncProgress = useCallback(
    async (isFinished = false) => {
      if (!lectureId || !videoRef.current) return;
      const cur = videoRef.current.currentTime;
      const dur = videoRef.current.duration || duration || 0;
      try {
        await fetch("/api/student/progress/video", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            lectureId,
            currentTime: cur,
            duration: dur,
            isFinished,
          }),
        });
      } catch (err) {
        // Silently catch background network hiccups
      }
    },
    [lectureId, duration]
  );

  // HTML5 Video Events
  const handleTimeUpdate = () => {
    if (!videoRef.current) return;
    const cur = videoRef.current.currentTime;
    setCurrentTime(cur);

    if (cur > maxWatchedTimeRef.current) {
      maxWatchedTimeRef.current = cur;
    }

    // Auto-sync progress to database every 10 seconds of playback
    if (Math.abs(cur - lastSyncTimeRef.current) >= 10) {
      lastSyncTimeRef.current = cur;
      syncProgress(false);
    }

    // Buffer percentage
    if (videoRef.current.buffered.length > 0) {
      const bufferedEnd = videoRef.current.buffered.end(videoRef.current.buffered.length - 1);
      const dur = videoRef.current.duration || 1;
      setBufferedPercent(Math.min(100, (bufferedEnd / dur) * 100));
    }
  };

  // Native seeking safety net: if any external extension/gesture attempts forward seek
  const handleSeeking = () => {
    if (!videoRef.current) return;
    if (videoRef.current.currentTime > maxWatchedTimeRef.current + 0.5) {
      videoRef.current.currentTime = maxWatchedTimeRef.current;
      triggerForwardBlockWarning("عذراً، غير مسموح بتقديم الفيديو - يمكنك فقط الرجوع للخلف لمراجعة الشرح");
    }
  };

  const handleLoadedMetadata = () => {
    if (videoRef.current) {
      setDuration(videoRef.current.duration || 0);
    }
  };

  // Volume & Mute
  const toggleMute = () => {
    if (!videoRef.current) return;
    if (isMuted) {
      videoRef.current.muted = false;
      setIsMuted(false);
      videoRef.current.volume = volume || 1;
    } else {
      videoRef.current.muted = true;
      setIsMuted(true);
    }
  };

  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = parseFloat(e.target.value);
    setVolume(val);
    if (videoRef.current) {
      videoRef.current.volume = val;
      const shouldMute = val === 0;
      videoRef.current.muted = shouldMute;
      setIsMuted(shouldMute);
    }
  };

  // Playback speed cycle
  const cyclePlaybackRate = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!videoRef.current) return;
    const speeds = [1, 1.25, 1.5, 1.75, 2];
    const nextIdx = (speeds.indexOf(playbackRate) + 1) % speeds.length;
    const nextRate = speeds[nextIdx];
    videoRef.current.playbackRate = nextRate;
    setPlaybackRate(nextRate);
    triggerFeedback(`سرعة الفيديو: ${nextRate}x`);
  };

  // Fullscreen toggle
  const toggleFullscreen = async () => {
    if (!containerRef.current) return;
    if (!document.fullscreenElement) {
      try {
        await containerRef.current.requestFullscreen();
      } catch (err) {
        console.error(err);
      }
    } else {
      try {
        await document.exitFullscreen();
      } catch (err) {
        console.error(err);
      }
    }
  };

  // Controls auto-hide on inactivity
  const handleMouseMove = () => {
    setShowControls(true);
    if (hideControlsTimerRef.current) clearTimeout(hideControlsTimerRef.current);
    if (isPlaying) {
      hideControlsTimerRef.current = setTimeout(() => {
        setShowControls(false);
      }, 3500);
    }
  };

  // Format seconds to mm:ss or hh:mm:ss
  const formatTime = (secs: number) => {
    if (isNaN(secs) || secs < 0) return "00:00";
    const m = Math.floor(secs / 60);
    const s = Math.floor(secs % 60);
    const h = Math.floor(m / 60);
    const remM = m % 60;
    if (h > 0) {
      return `${h}:${remM < 10 ? "0" : ""}${remM}:${s < 10 ? "0" : ""}${s}`;
    }
    return `${m < 10 ? "0" : ""}${m}:${s < 10 ? "0" : ""}${s}`;
  };

  // Detect video embed types (YouTube, Vimeo, Enterprise DRM: VdoCipher / Bunny Stream DRM)
  const isYouTube = videoUrl.includes("youtube.com") || videoUrl.includes("youtu.be");
  const isVimeo = videoUrl.includes("vimeo.com");
  const isVdoCipher = videoUrl.includes("vdocipher.com");
  const isBunnyStream = videoUrl.includes("iframe.mediadelivery.net") || videoUrl.includes("b-cdn.net");

  const getYouTubeEmbedUrl = (url: string) => {
    let videoId = "";
    if (url.includes("youtu.be/")) {
      videoId = url.split("youtu.be/")[1]?.split("?")[0];
    } else if (url.includes("v=")) {
      videoId = url.split("v=")[1]?.split("&")[0];
    } else if (url.includes("embed/")) {
      videoId = url.split("embed/")[1]?.split("?")[0];
    }
    return `https://www.youtube.com/embed/${videoId}?controls=0&disablekb=1&modestbranding=1&rel=0&showinfo=0&iv_load_policy=3`;
  };

  const getVimeoEmbedUrl = (url: string) => {
    const vimeoId = url.split("vimeo.com/")[1]?.split("?")[0];
    return `https://player.vimeo.com/video/${vimeoId}?badge=0&byline=0&portrait=0&title=0`;
  };

  const playedPercent = duration > 0 ? (currentTime / duration) * 100 : 0;
  const maxWatchedPercent = duration > 0 ? (Math.max(currentTime, maxWatchedTimeRef.current) / duration) * 100 : 0;

  return (
    <div
      ref={containerRef}
      onContextMenu={handleContextMenu}
      onDragStart={handleDragStart}
      onMouseMove={handleMouseMove}
      onMouseLeave={() => isPlaying && setShowControls(false)}
      className="relative w-full aspect-video bg-black rounded-2xl overflow-hidden shadow-2xl select-none group"
      style={{
        WebkitUserSelect: "none",
        MozUserSelect: "none",
        msUserSelect: "none",
        userSelect: "none",
      }}
    >
      {/* AC6: Elegant, Non-Distracting Forensic Watermark */}
      {/* Subtle (20% opacity), smooth 3s cubic-bezier slow drift every 40s - does not disturb student focus */}
      <div
        className="absolute z-40 pointer-events-none select-none text-white/25 text-[10px] sm:text-xs font-mono font-medium tracking-wider px-3 py-1 rounded-md backdrop-blur-[0.5px] transition-all duration-[3000ms] ease-in-out"
        style={{
          top: watermarkPos.top,
          left: watermarkPos.left,
          textShadow: "0 1px 2px rgba(0,0,0,0.8)",
        }}
      >
        <span>{studentName}</span>
        <span className="mx-1.5 opacity-50">•</span>
        <span>{studentPhone}</span>
        <span className="mx-1.5 opacity-50">•</span>
        <span>{studentIp}</span>
      </div>

      {/* Discrete Corner Digital Forensic Fingerprint */}
      <div className="absolute bottom-2 right-3 z-30 pointer-events-none select-none text-[9px] font-mono text-white/15">
        LMS-SEC-{studentPhone.slice(-4)}
      </div>

      {/* Instant Blackout Shutter (Triggered on PrintScreen / Screenshot shortcuts) */}
      {isBlackoutActive && (
        <div className="absolute inset-0 z-50 bg-black flex flex-col items-center justify-center text-white text-center p-6 space-y-3 animate-in fade-in duration-75">
          <ShieldAlert className="w-12 h-12 text-rose-500 animate-pulse" />
          <h4 className="font-bold text-sm md:text-base text-rose-400">تم حجب الشاشة لمنع التقاط المحاضرة</h4>
          <p className="text-slate-400 text-xs max-w-sm leading-relaxed">
            محمية بموجب حقوق الملكية الفكرية لمنصة الأستاذ محمود الشحات.
          </p>
        </div>
      )}

      {/* DevTools Open Warning Shield */}
      {devToolsDetected && (
        <div className="absolute inset-0 z-50 bg-slate-950/98 backdrop-blur-md flex flex-col items-center justify-center text-white text-center p-6 space-y-3">
          <AlertTriangle className="w-12 h-12 text-amber-500 animate-bounce" />
          <h4 className="font-bold text-sm md:text-base text-amber-300">تم اكتشاف فتح أدوات المطورين (DevTools)</h4>
          <p className="text-slate-400 text-xs max-w-sm leading-relaxed">
            يرجى إغلاق نافذة فحص المتصفح لمتابعة مشاهدة المحاضرة بأمان.
          </p>
        </div>
      )}

      {/* AC5: Tab Blur / Window Switch Shield (Screen Recording & Multi-tasking Shield) */}
      {isTabBlurred && !isBlackoutActive && !devToolsDetected && (
        <div
          onClick={() => {
            setIsTabBlurred(false);
            if (videoRef.current) {
              videoRef.current.play().then(() => setIsPlaying(true)).catch(() => {});
            }
          }}
          className="absolute inset-0 z-50 bg-slate-950/95 backdrop-blur-md flex flex-col items-center justify-center text-white text-center p-6 space-y-3 cursor-pointer"
        >
          <EyeOff className="w-12 h-12 text-physicsCyan-400 animate-pulse" />
          <h4 className="font-bold text-sm md:text-base">تم إيقاف الفيديو مؤقتاً لمغادرة نافذة الدرس</h4>
          <p className="text-slate-400 text-xs max-w-sm leading-relaxed">
            لحماية محتوى الشرح ومنع برامج التسجيل، يتوقف الفيديو تلقائياً عند الانتقال لنافذة أخرى.
          </p>
          <span className="inline-block mt-2 px-4 py-1.5 bg-physicsCyan-500/20 text-physicsCyan-300 border border-physicsCyan-500/40 rounded-lg text-xs font-bold">
            انقر هنا للاستئناف ▶
          </span>
        </div>
      )}

      {/* Forward Blocked Warning Banner */}
      {seekWarning && !isBlackoutActive && (
        <div className="absolute top-5 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2 bg-rose-600/95 text-white font-bold px-4 py-2.5 rounded-xl text-xs shadow-2xl border border-rose-400/50 animate-in fade-in slide-in-from-top duration-300">
          <AlertTriangle className="w-4 h-4 shrink-0 text-amber-300 animate-bounce" />
          <span>{seekWarning}</span>
        </div>
      )}

      {/* Action / Rewind Success Feedback Toast */}
      {actionFeedback && !seekWarning && !isBlackoutActive && (
        <div className="absolute top-5 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2 bg-physicsNavy-900/95 text-physicsCyan-300 font-bold px-4 py-2 rounded-xl text-xs shadow-xl border border-physicsCyan-500/40 animate-in fade-in zoom-in-95 duration-200">
          <RotateCcw className="w-3.5 h-3.5 text-physicsCyan-400 animate-spin" style={{ animationIterationCount: 1, animationDuration: "0.5s" }} />
          <span>{actionFeedback}</span>
        </div>
      )}

      {/* Video Renders: Enterprise DRM, Embeds, or Secured Chunked Stream */}
      {isYouTube ? (
        <iframe
          src={getYouTubeEmbedUrl(videoUrl)}
          className="w-full h-full border-0"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
        />
      ) : isVimeo ? (
        <iframe
          src={getVimeoEmbedUrl(videoUrl)}
          className="w-full h-full border-0"
          allow="autoplay; fullscreen; picture-in-picture"
          allowFullScreen
        />
      ) : isVdoCipher || isBunnyStream ? (
        /* AC1 & AC2: Enterprise DRM Iframe with EME (Widevine + FairPlay Hardware DRM Blackout) */
        <iframe
          src={videoUrl}
          className="w-full h-full border-0"
          allow="accelerometer; autoplay; encrypted-media; gyroscope; picture-in-picture; fullscreen"
          allowFullScreen
        />
      ) : (
        <div className="relative w-full h-full" onClick={togglePlay}>
          <video
            ref={videoRef}
            src={videoUrl}
            controls={false}
            playsInline
            controlsList="nodownload nofullscreen noremoteplayback"
            disablePictureInPicture
            disableRemotePlayback
            onTimeUpdate={handleTimeUpdate}
            onSeeking={handleSeeking}
            onLoadedMetadata={handleLoadedMetadata}
            onPlay={() => setIsPlaying(true)}
            onPause={() => {
              setIsPlaying(false);
              syncProgress(false);
            }}
            onEnded={() => {
              setIsPlaying(false);
              syncProgress(true);
            }}
            className={`w-full h-full object-contain cursor-pointer transition-opacity duration-150 ${
              isBlackoutActive ? "opacity-0" : "opacity-100"
            }`}
          >
            متصفحك لا يدعم تشغيل هذا الفيديو.
          </video>

          {/* Big Center Play Icon when paused */}
          {!isPlaying && !isTabBlurred && !isBlackoutActive && (
            <div className="absolute inset-0 flex items-center justify-center bg-black/30 pointer-events-none transition">
              <div className="w-16 h-16 sm:w-20 sm:h-20 bg-physicsCyan-500/90 text-slate-950 rounded-full flex items-center justify-center shadow-2xl backdrop-blur-sm transform hover:scale-110 transition duration-300">
                <Play className="w-8 h-8 sm:w-10 sm:h-10 fill-slate-950 translate-x-0.5" />
              </div>
            </div>
          )}

          {/* Custom Secured Control Bar */}
          <div
            onClick={(e) => e.stopPropagation()}
            className={`video-controls absolute bottom-0 left-0 right-0 z-40 bg-gradient-to-t from-black/95 via-black/75 to-transparent p-3 sm:p-4 space-y-2.5 transition-opacity duration-300 ${
              showControls || !isPlaying ? "opacity-100" : "opacity-0 pointer-events-none"
            }`}
          >
            {/* Custom Progress Bar with LTR Timeline */}
            <div dir="ltr" className="relative flex items-center gap-2">
              <div
                ref={progressBarRef}
                onClick={handleProgressClick}
                onMouseDown={handleMouseDown}
                onTouchStart={handleTouchStart}
                onTouchMove={handleTouchMove}
                onTouchEnd={handleTouchEnd}
                onMouseMove={handleProgressBarMouseMove}
                onMouseLeave={handleProgressBarMouseLeave}
                className={`relative flex-1 h-2 hover:h-2.5 bg-slate-800 rounded-full cursor-pointer overflow-visible transition-all duration-150 ${
                  shakeProgressBar ? "ring-2 ring-rose-500 animate-pulse" : ""
                }`}
                title="اضغط في أي مكان سابق للرجوع ومراجعة الشرح (التقديم للأمام محظور)"
              >
                {/* 1. Buffered Track */}
                <div
                  className="absolute top-0 left-0 h-full bg-white/20 rounded-full transition-all duration-150 pointer-events-none"
                  style={{ width: `${bufferedPercent}%` }}
                />

                {/* 2. Maximum Watched Limit Track */}
                <div
                  className="absolute top-0 left-0 h-full bg-physicsCyan-950/70 border-r border-physicsCyan-400/60 rounded-l-full pointer-events-none"
                  style={{ width: `${maxWatchedPercent}%` }}
                />

                {/* 3. Played Track */}
                <div
                  className="absolute top-0 left-0 h-full bg-physicsCyan-500 rounded-l-full transition-[width] duration-75 relative pointer-events-none"
                  style={{ width: `${playedPercent}%` }}
                >
                  {/* Current Position Thumb Dot */}
                  <div className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-1/2 w-3.5 h-3.5 bg-white rounded-full shadow-md border-2 border-physicsCyan-600 scale-100 group-hover/pb:scale-125 transition-transform" />
                </div>

                {/* 4. Hover Time Tooltip */}
                {hoverTime && (
                  <div
                    className={`absolute bottom-5 -translate-x-1/2 px-2 py-0.5 rounded text-[10px] font-mono font-bold whitespace-nowrap shadow-lg pointer-events-none transition-all z-50 ${
                      hoverTime.isBlocked
                        ? "bg-rose-900/90 text-rose-200 border border-rose-600"
                        : "bg-physicsNavy-900/95 text-physicsCyan-300 border border-physicsCyan-500/50"
                    }`}
                    style={{ left: `${hoverTime.x}px` }}
                  >
                    <span>{formatTime(hoverTime.time)}</span>
                    <span className="ml-1 text-[9px]">
                      {hoverTime.isBlocked ? "🔒 ممنوع التقديم" : "↺ رجوع للخلف"}
                    </span>
                  </div>
                )}
              </div>

              {/* Status Badge */}
              <div
                className="flex items-center gap-1 text-[9px] text-amber-300/90 bg-black/50 px-2 py-0.5 rounded-md border border-amber-300/25 shrink-0 select-none"
                title="التقديم للأمام محظور - الرجوع للخلف متاح بحرية"
              >
                <Lock className="w-2.5 h-2.5 text-amber-400" />
                <span className="font-semibold hidden sm:inline">التقديم مقفول</span>
              </div>
            </div>

            {/* Bottom Controls Row */}
            <div className="flex items-center justify-between text-white text-xs" dir="ltr">
              {/* Left Group: Play/Pause, Rewind 10s, Rewind 30s, Volume, Time */}
              <div className="flex items-center gap-2 sm:gap-3">
                <button
                  type="button"
                  onClick={togglePlay}
                  className="p-1.5 hover:text-physicsCyan-400 transition"
                  title={isPlaying ? "إيقاف مؤقت (Space)" : "تشغيل (Space)"}
                >
                  {isPlaying ? <Pause className="w-5 h-5 fill-current" /> : <Play className="w-5 h-5 fill-current" />}
                </button>

                {/* Rewind 10 Seconds Button */}
                <button
                  type="button"
                  onClick={(e) => handleRewind10(e)}
                  className="inline-flex items-center gap-1 px-2.5 py-1 bg-white/10 hover:bg-physicsCyan-600/30 hover:text-physicsCyan-300 text-slate-200 rounded-lg border border-white/15 transition active:scale-95"
                  title="إرجاع 10 ثوانٍ للخلف (مراجعة الشرح)"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span className="text-[10px] font-bold">10s-</span>
                </button>

                {/* Rewind 30 Seconds Button */}
                <button
                  type="button"
                  onClick={(e) => handleRewind30(e)}
                  className="hidden md:inline-flex items-center gap-1 px-2 py-1 bg-white/5 hover:bg-white/15 text-slate-300 hover:text-white rounded-lg border border-white/10 transition active:scale-95"
                  title="إرجاع 30 ثانية للخلف"
                >
                  <RotateCcw className="w-3 h-3" />
                  <span className="text-[9px] font-bold">30s-</span>
                </button>

                {/* Volume & Mute */}
                <div className="flex items-center gap-1.5 group/vol">
                  <button
                    type="button"
                    onClick={toggleMute}
                    className="p-1 hover:text-physicsCyan-400 transition"
                    title={isMuted ? "تشغيل الصوت (M)" : "كتم الصوت (M)"}
                  >
                    {isMuted || volume === 0 ? (
                      <VolumeX className="w-4 h-4 text-rose-400" />
                    ) : (
                      <Volume2 className="w-4 h-4" />
                    )}
                  </button>
                  <input
                    type="range"
                    min="0"
                    max="1"
                    step="0.05"
                    value={isMuted ? 0 : volume}
                    onChange={handleVolumeChange}
                    className="w-12 sm:w-20 h-1 bg-white/30 accent-physicsCyan-500 rounded-lg cursor-pointer"
                  />
                </div>

                {/* Time Display */}
                <div className="text-[11px] font-mono text-slate-300 shrink-0">
                  <span>{formatTime(currentTime)}</span> / <span>{formatTime(duration)}</span>
                </div>
              </div>

              {/* Right Group: Playback Speed & Fullscreen */}
              <div className="flex items-center gap-2">
                {/* Playback Speed Cycle */}
                <button
                  type="button"
                  onClick={cyclePlaybackRate}
                  className="px-2 py-0.5 text-[10px] font-bold font-mono bg-white/10 hover:bg-white/20 rounded border border-white/15 text-slate-200 transition active:scale-95"
                  title="تغيير سرعة الفيديو"
                >
                  {playbackRate}x
                </button>

                {/* Fullscreen Toggle */}
                <button
                  type="button"
                  onClick={toggleFullscreen}
                  className="p-1.5 hover:text-physicsCyan-400 transition"
                  title={isFullscreen ? "الخروج من ملء الشاشة (F)" : "ملء الشاشة (F)"}
                >
                  {isFullscreen ? <Minimize className="w-4 h-4" /> : <Maximize className="w-4 h-4" />}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
