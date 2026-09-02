"use client";

import React, { useEffect, useState, useRef } from "react";

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
  const [watermarkPos, setWatermarkPos] = useState({ top: "20%", left: "20%" });
  const containerRef = useRef<HTMLDivElement>(null);

  // Shifting watermark position every 5 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      const randomTop = Math.floor(Math.random() * 80) + 10; // 10% to 90%
      const randomLeft = Math.floor(Math.random() * 70) + 10; // 10% to 80%
      setWatermarkPos({
        top: `${randomTop}%`,
        left: `${randomLeft}%`,
      });
    }, 5000);

    return () => clearInterval(interval);
  }, []);

  // Prevent right-click context menu
  const handleContextMenu = (e: React.MouseEvent) => {
    e.preventDefault();
  };

  // Check if it is a YouTube URL
  const isYouTube = videoUrl.includes("youtube.com") || videoUrl.includes("youtu.be");
  const isVimeo = videoUrl.includes("vimeo.com");

  // Get embed URL for YouTube
  const getYouTubeEmbedUrl = (url: string) => {
    let videoId = "";
    if (url.includes("youtu.be/")) {
      videoId = url.split("youtu.be/")[1]?.split("?")[0];
    } else if (url.includes("v=")) {
      videoId = url.split("v=")[1]?.split("&")[0];
    } else if (url.includes("embed/")) {
      videoId = url.split("embed/")[1]?.split("?")[0];
    }
    return `https://www.youtube.com/embed/${videoId}?modestbranding=1&rel=0&showinfo=0&iv_load_policy=3&disablekb=1`;
  };

  // Get embed URL for Vimeo
  const getVimeoEmbedUrl = (url: string) => {
    const vimeoId = url.split("vimeo.com/")[1]?.split("?")[0];
    return `https://player.vimeo.com/video/${vimeoId}?badge=0&byline=0&portrait=0&title=0`;
  };

  return (
    <div
      ref={containerRef}
      onContextMenu={handleContextMenu}
      className="relative w-full aspect-video bg-black rounded-xl overflow-hidden shadow-2xl select-none"
      style={{ WebkitUserSelect: "none", MozUserSelect: "none", msUserSelect: "none" }}
    >
      {/* Dynamic Floating Watermark Overlay */}
      <div
        className="absolute z-40 pointer-events-none text-white/20 text-xs sm:text-sm font-bold bg-black/35 px-3 py-1.5 rounded-md border border-white/5 whitespace-nowrap shadow-md select-none transition-all duration-1000 ease-in-out"
        style={{
          top: watermarkPos.top,
          left: watermarkPos.left,
        }}
      >
        {studentName} - {studentPhone} - {studentIp}
      </div>

      {/* Direct click prevention layer (except for controls at bottom) */}
      <div className="absolute inset-0 z-30 pointer-events-auto bg-transparent" />

      {/* Video Content */}
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
        <video
          src={videoUrl}
          controls
          controlsList="nodownload nofullscreen noremoteplayback"
          disablePictureInPicture
          disableRemotePlayback
          className="w-full h-full object-contain"
        >
          Your browser does not support the video tag.
        </video>
      )}
    </div>
  );
}
