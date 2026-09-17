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
} from "lucide-react";

interface VideoPlayerProps {
  videoUrl: string;
  studentName: string;
  studentPhone: string;
  studentIp?: string;
}

export default function VideoPlayer({
  videoUrl,
  studentName,
  studentPhone,
  studentIp = "127.0.0.1",
}: VideoPlayerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const progressBarRef = useRef<HTMLDivElement>(null);

  // Security & protection states
  const [watermarkPos, setWatermarkPos] = useState({ top: "25%", left: "25%" });
  const [seekWarning, setSeekWarning] = useState<string | null>(null);
  const [actionFeedback, setActionFeedback] = useState<string | null>(null);
  const [shakeProgressBar, setShakeProgressBar] = useState<boolean>(false);
  const [isTabBlurred, setIsTabBlurred] = useState<boolean>(false);
  const maxWatchedTimeRef = useRef<number>(0);
  const warningTimerRef = useRef<NodeJS.Timeout | null>(null);
  const feedbackTimerRef = useRef<NodeJS.Timeout | null>(null);

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

  // 1. Shifting dynamic security watermark every 4 seconds to random locations
  useEffect(() => {
    const interval = setInterval(() => {
      const randomTop = Math.floor(Math.random() * 70) + 12; // 12% to 82%
      const randomLeft = Math.floor(Math.random() * 60) + 10; // 10% to 70%
      setWatermarkPos({
        top: `${randomTop}%`,
        left: `${randomLeft}%`,
      });
    }, 4000);

    return () => clearInterval(interval);
  }, []);

  // 2. Screen recording & tab-switching protection: pause & blur on window loss of focus
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
    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      window.removeEventListener("blur", handleBlur);
      window.removeEventListener("focus", handleFocus);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, []);

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

  // 3. Block devtools, print-screen, and strict forward keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Prevent PrintScreen, F12, Ctrl+S, Ctrl+U, Devtools
      if (
        e.key === "F12" ||
        e.key === "PrintScreen" ||
        (e.ctrlKey && (e.key === "s" || e.key === "S" || e.key === "u" || e.key === "U")) ||
        (e.ctrlKey && e.shiftKey && (e.key === "I" || e.key === "i" || e.key === "C" || e.key === "c" || e.key === "J" || e.key === "j"))
      ) {
        e.preventDefault();
        triggerForwardBlockWarning("تم حظر الإجراء لدواعي أمان محتوى المحاضرة");
        return;
      }

      // STRICT FORWARD SEEK BLOCK: ArrowRight or 'l' or 'L'
      if (e.key === "ArrowRight" || e.key === "l" || e.key === "L") {
        e.preventDefault();
        e.stopPropagation();
        triggerForwardBlockWarning("عذراً، غير مسموح بتقديم الفيديو - يمكنك فقط الرجوع للخلف لمراجعة ما سبق");
        return;
      }

      // REWIND SHORTCUTS (ALLOWED & ENCOURAGED):
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

      // Space or 'k' for Play/Pause
      if (e.key === " " || e.key === "k" || e.key === "K") {
        const tag = (e.target as HTMLElement).tagName;
        if (tag !== "INPUT" && tag !== "TEXTAREA") {
          e.preventDefault();
          togglePlay();
        }
      }

      // 'f' or 'F' for Fullscreen
      if (e.key === "f" || e.key === "F") {
        const tag = (e.target as HTMLElement).tagName;
        if (tag !== "INPUT" && tag !== "TEXTAREA") {
          e.preventDefault();
          toggleFullscreen();
        }
      }

      // 'm' or 'M' for Mute
      if (e.key === "m" || e.key === "M") {
        const tag = (e.target as HTMLElement).tagName;
        if (tag !== "INPUT" && tag !== "TEXTAREA") {
          e.preventDefault();
          toggleMute();
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [triggerForwardBlockWarning, triggerFeedback]);

  // Fullscreen change listener
  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };

    document.addEventListener("fullscreenchange", handleFullscreenChange);
    return () => document.removeEventListener("fullscreenchange", handleFullscreenChange);
  }, []);

  // 4. Prevent right-click context menu
  const handleContextMenu = (e: React.MouseEvent) => {
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

  // HTML5 Video Events
  const handleTimeUpdate = () => {
    if (!videoRef.current) return;
    const cur = videoRef.current.currentTime;
    setCurrentTime(cur);

    if (cur > maxWatchedTimeRef.current) {
      maxWatchedTimeRef.current = cur;
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

  // Detect video embed types
  const isYouTube = videoUrl.includes("youtube.com") || videoUrl.includes("youtu.be");
  const isVimeo = videoUrl.includes("vimeo.com");

  // Get embed URL for YouTube (with controls=0 to prevent forwarding on YouTube too)
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

  // Get embed URL for Vimeo
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
      onMouseMove={handleMouseMove}
      onMouseLeave={() => isPlaying && setShowControls(false)}
      className="relative w-full aspect-video bg-black rounded-2xl overflow-hidden shadow-2xl select-none group"
      style={{ WebkitUserSelect: "none", MozUserSelect: "none", msUserSelect: "none" }}
    >
      {/* Dynamic Floating Watermark Overlay (Jumps randomly every 4s) */}
      <div
        className="absolute z-40 pointer-events-none text-white/30 text-[10px] sm:text-xs font-mono font-bold bg-black/40 px-2.5 py-1 rounded-lg border border-white/10 whitespace-nowrap shadow-lg select-none transition-all duration-1000 ease-in-out backdrop-blur-[1px]"
        style={{
          top: watermarkPos.top,
          left: watermarkPos.left,
        }}
      >
        <span>{studentName}</span> • <span>{studentPhone}</span> • <span>{studentIp}</span>
      </div>

      {/* Forward Blocked Warning Banner */}
      {seekWarning && (
        <div className="absolute top-5 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2 bg-rose-600/95 text-white font-bold px-4 py-2.5 rounded-xl text-xs shadow-2xl border border-rose-400/50 animate-in fade-in slide-in-from-top duration-300">
          <AlertTriangle className="w-4 h-4 shrink-0 text-amber-300 animate-bounce" />
          <span>{seekWarning}</span>
        </div>
      )}

      {/* Action / Rewind Success Feedback Toast */}
      {actionFeedback && !seekWarning && (
        <div className="absolute top-5 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2 bg-physicsNavy-900/95 text-physicsCyan-300 font-bold px-4 py-2 rounded-xl text-xs shadow-xl border border-physicsCyan-500/40 animate-in fade-in zoom-in-95 duration-200">
          <RotateCcw className="w-3.5 h-3.5 text-physicsCyan-400 animate-spin" style={{ animationIterationCount: 1, animationDuration: "0.5s" }} />
          <span>{actionFeedback}</span>
        </div>
      )}

      {/* Tab Blur / Screen Recording Shield */}
      {isTabBlurred && (
        <div className="absolute inset-0 z-50 bg-slate-950/95 backdrop-blur-md flex flex-col items-center justify-center text-white text-center p-6 space-y-3">
          <EyeOff className="w-12 h-12 text-amber-400 animate-pulse" />
          <h4 className="font-bold text-sm md:text-base">تم إيقاف الفيديو مؤقتاً لمغادرة نافذة الدرس</h4>
          <p className="text-slate-400 text-xs max-w-sm leading-relaxed">
            لحماية محتوى الشرح ومنع برامج التسجيل، يتوقف الفيديو تلقائياً عند الانتقال لنافذة أخرى. انقر لمتابعة المشاهدة.
          </p>
        </div>
      )}

      {/* Main Video Element or Embed */}
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
            onPause={() => setIsPlaying(false)}
            className="w-full h-full object-contain cursor-pointer"
          >
            متصفحك لا يدعم تشغيل هذا الفيديو.
          </video>

          {/* Big Center Play Icon when paused */}
          {!isPlaying && !isTabBlurred && (
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

                {/* 2. Maximum Watched Limit Track (Subtle allowed rewind zone indicator) */}
                <div
                  className="absolute top-0 left-0 h-full bg-physicsCyan-950/70 border-r border-physicsCyan-400/60 rounded-l-full pointer-events-none"
                  style={{ width: `${maxWatchedPercent}%` }}
                />

                {/* 3. Played Track (Cyan) */}
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
                {/* Play / Pause */}
                <button
                  type="button"
                  onClick={togglePlay}
                  className="p-1.5 hover:text-physicsCyan-400 transition"
                  title={isPlaying ? "إيقاف مؤقت (Space)" : "تشغيل (Space)"}
                >
                  {isPlaying ? <Pause className="w-5 h-5 fill-current" /> : <Play className="w-5 h-5 fill-current" />}
                </button>

                {/* Rewind 10 Seconds Button (Primary Rewind Action) */}
                <button
                  type="button"
                  onClick={(e) => handleRewind10(e)}
                  className="inline-flex items-center gap-1 px-2.5 py-1 bg-white/10 hover:bg-physicsCyan-600/30 hover:text-physicsCyan-300 text-slate-200 rounded-lg border border-white/15 transition active:scale-95"
                  title="إرجاع 10 ثوانٍ للخلف (مراجعة الشرح)"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span className="text-[10px] font-bold">10s-</span>
                </button>

                {/* Rewind 30 Seconds Button (Quick Jump Back) */}
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
