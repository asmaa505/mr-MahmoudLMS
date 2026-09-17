"use client";

import React, { useState, useRef, useEffect } from "react";
import { Upload, Link as LinkIcon, Image, Video, FileText, CheckCircle2, AlertCircle, Loader2, X } from "lucide-react";

interface MediaUploadInputProps {
  name?: string;
  mediaType: "image" | "video" | "document" | "all";
  label?: string;
  placeholder?: string;
  value?: string;
  defaultValue?: string;
  onChange?: (url: string) => void;
  required?: boolean;
  className?: string;
}

export default function MediaUploadInput({
  name,
  mediaType,
  label,
  placeholder,
  value,
  defaultValue = "",
  onChange,
  required = false,
  className = "",
}: MediaUploadInputProps) {
  const [currentUrl, setCurrentUrl] = useState<string>(value !== undefined ? value : defaultValue);
  const [isUploading, setIsUploading] = useState<boolean>(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [uploadedFileName, setUploadedFileName] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);

  // Sync if controlled value changes from outside
  useEffect(() => {
    if (value !== undefined) {
      setCurrentUrl(value);
      if (!value) {
        setUploadedFileName(null);
        setUploadError(null);
        if (fileInputRef.current) {
          fileInputRef.current.value = "";
        }
      }
    }
  }, [value]);

  // Listen to native form reset events to cleanly clear media previews and files
  useEffect(() => {
    const form = containerRef.current?.closest("form");
    if (!form) return;

    const handleFormReset = () => {
      setCurrentUrl(defaultValue || "");
      setUploadedFileName(null);
      setUploadError(null);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
      onChange?.(defaultValue || "");
    };

    form.addEventListener("reset", handleFormReset);
    return () => {
      form.removeEventListener("reset", handleFormReset);
    };
  }, [defaultValue, onChange]);

  // Determine accepted file types for native file picker
  const getAcceptTypes = () => {
    switch (mediaType) {
      case "image":
        return "image/*";
      case "video":
        return "video/mp4,video/webm,video/ogg,video/quicktime,video/*";
      case "document":
        return "application/pdf,.pdf";
      default:
        return "*/*";
    }
  };

  // Get icon for label
  const getIcon = () => {
    switch (mediaType) {
      case "image":
        return <Image className="w-4 h-4 text-physicsCyan-500" />;
      case "video":
        return <Video className="w-4 h-4 text-amber-500" />;
      case "document":
        return <FileText className="w-4 h-4 text-rose-500" />;
      default:
        return <LinkIcon className="w-4 h-4 text-physicsCyan-500" />;
    }
  };

  const handleUrlChange = (newUrl: string) => {
    setCurrentUrl(newUrl);
    setUploadError(null);
    if (!newUrl.startsWith("/uploads/")) {
      setUploadedFileName(null);
    }
    onChange?.(newUrl);
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    setUploadError(null);

    try {
      const formData = new FormData();
      formData.append("file", file);

      const res = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "فشل رفع الملف إلى السيرفر");
      }

      const fileUrl = data.url;
      setCurrentUrl(fileUrl);
      setUploadedFileName(data.originalName || file.name);
      onChange?.(fileUrl);
    } catch (err: any) {
      console.error("Upload error:", err);
      setUploadError(err.message || "حدث خطأ أثناء رفع الملف");
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  const handleClear = () => {
    handleUrlChange("");
    setUploadedFileName(null);
    setUploadError(null);
  };

  const isLocalUpload = currentUrl.startsWith("/uploads/");
  const isImage = mediaType === "image" || /\.(jpg|jpeg|png|webp|gif|svg)$/i.test(currentUrl);
  const isVideo = mediaType === "video" || /\.(mp4|webm|ogg)$/i.test(currentUrl) || currentUrl.includes("youtube.com") || currentUrl.includes("youtu.be") || currentUrl.includes("vimeo.com");

  return (
    <div ref={containerRef} className={`space-y-1.5 text-right ${className}`}>
      {/* Label and Mode Indicator */}
      {label && (
        <div className="flex items-center justify-between">
          <label className="font-semibold text-slate-700 text-xs flex items-center gap-1.5">
            {getIcon()}
            <span>{label}</span>
            {required && <span className="text-rose-500 text-xs">*</span>}
          </label>
          <span className="text-[10px] text-slate-650 bg-slate-100 px-2 py-0.5 rounded">
            رابط مباشر أو رفع من الجهاز
          </span>
        </div>
      )}

      {/* Hidden input for Form submissions (Server Actions) */}
      {name && (
        <input
          type="hidden"
          name={name}
          value={currentUrl}
          required={required && !currentUrl}
        />
      )}

      {/* Hidden native file input */}
      <input
        ref={fileInputRef}
        type="file"
        accept={getAcceptTypes()}
        onChange={handleFileSelect}
        className="hidden"
      />

      {/* Input Group: Text Field + Upload Button */}
      <div className="flex gap-2 items-center">
        {/* URL Text Input */}
        <div className="relative flex-1">
          <input
            type="text"
            value={currentUrl}
            onChange={(e) => handleUrlChange(e.target.value)}
            placeholder={
              placeholder ||
              (mediaType === "video"
                ? "رابط YouTube/Vimeo أو ارفع فيديو من جهازك"
                : mediaType === "image"
                ? "رابط الصورة أو ارفع صورة من جهازك"
                : "رابط الملف أو ارفع ملف من جهازك")
            }
            className="w-full pl-8 pr-3 py-2 border border-slate-200 focus:border-physicsCyan-500 rounded-lg outline-none text-left font-mono text-xs placeholder:text-right placeholder:font-sans placeholder:text-slate-650 bg-white"
            disabled={isUploading}
          />
          {currentUrl && (
            <button
              type="button"
              onClick={handleClear}
              className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-650 hover:text-rose-500 transition p-0.5"
              title="مسح"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Upload Button */}
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          disabled={isUploading}
          className="inline-flex items-center gap-1.5 px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-lg border border-slate-300/80 transition shadow-sm whitespace-nowrap active:scale-95 disabled:opacity-50"
        >
          {isUploading ? (
            <>
              <Loader2 className="w-3.5 h-3.5 animate-spin text-physicsCyan-600" />
              <span>جاري الرفع...</span>
            </>
          ) : (
            <>
              <Upload className="w-3.5 h-3.5 text-physicsCyan-600" />
              <span>رفع من الجهاز</span>
            </>
          )}
        </button>
      </div>

      {/* Uploading progress notification */}
      {isUploading && (
        <div className="flex items-center gap-2 p-2 bg-physicsCyan-50 border border-physicsCyan-200 rounded-lg text-physicsCyan-800 text-[11px] animate-pulse">
          <Loader2 className="w-3.5 h-3.5 animate-spin text-physicsCyan-600 shrink-0" />
          <span>جاري رفع الملف وحفظه على الخادم، يرجى الانتظار لحين الانتهاء...</span>
        </div>
      )}

      {/* Error notification */}
      {uploadError && (
        <div className="flex items-center gap-2 p-2 bg-rose-50 border border-rose-200 rounded-lg text-rose-700 text-[11px]">
          <AlertCircle className="w-3.5 h-3.5 shrink-0 text-rose-600" />
          <span>{uploadError}</span>
        </div>
      )}

      {/* Success / Uploaded Info Badge */}
      {currentUrl && isLocalUpload && (
        <div className="flex items-center justify-between p-2 bg-emerald-50 border border-emerald-200 rounded-lg text-emerald-800 text-[11px]">
          <div className="flex items-center gap-1.5 truncate">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
            <span className="font-semibold">تم الرفع بنجاح:</span>
            <span className="text-slate-600 font-mono text-[10px] truncate" dir="ltr">
              {uploadedFileName || currentUrl}
            </span>
          </div>
          <button
            type="button"
            onClick={handleClear}
            className="text-slate-650 hover:text-rose-600 transition text-[10px] underline ml-2 shrink-0"
          >
            تغيير
          </button>
        </div>
      )}

      {/* Media Preview */}
      {currentUrl && !isUploading && (
        <div className="mt-2">
          {/* Image Preview */}
          {isImage && (
            <div className="relative inline-block border border-slate-200 rounded-lg overflow-hidden bg-slate-50 shadow-sm max-w-[200px]">
              <img
                src={currentUrl}
                alt="معاينة الصورة"
                className="max-h-24 w-auto object-contain rounded"
                onError={(e) => {
                  (e.target as HTMLElement).style.display = "none";
                }}
              />
            </div>
          )}

          {/* Video Preview (for uploaded files) */}
          {isVideo && isLocalUpload && (
            <div className="border border-slate-200 rounded-lg overflow-hidden bg-slate-950 max-w-xs shadow-sm aspect-video">
              <video
                src={currentUrl}
                controls
                className="w-full h-full object-contain"
              >
                متصفحك لا يدعم تشغيل الفيديو.
              </video>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
