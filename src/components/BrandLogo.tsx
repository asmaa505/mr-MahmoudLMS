import React from "react";
import Link from "next/link";
import Image from "next/image";

interface BrandLogoProps {
  /** Optional link destination, defaults to "/" */
  href?: string;
  /** Size variant: "sm", "md", "lg", or prominent "xl" */
  size?: "sm" | "md" | "lg" | "xl";
  /** Whether to show the typography alongside the logo icon */
  showText?: boolean;
  /** Primary title text (defaults to "محمود الشحات") */
  title?: string;
  /** Secondary subtitle text (defaults to "أستاذ الفيزياء") */
  subtitle?: string;
  /** Additional custom class names for the wrapper */
  className?: string;
}

const sizeConfig = {
  sm: {
    container: "h-8 w-auto max-w-[70px] rounded-lg p-0.5",
    imageWidth: 64,
    imageHeight: 36,
    titleClass: "text-xs font-bold",
    subtitleClass: "text-[9px]",
  },
  md: {
    container: "h-10 md:h-12 w-auto max-w-[90px] md:max-w-[110px] rounded-xl p-1",
    imageWidth: 96,
    imageHeight: 54,
    titleClass: "text-base md:text-lg font-bold tracking-wide",
    subtitleClass: "text-xs",
  },
  lg: {
    container: "h-12 md:h-14 w-auto max-w-[120px] md:max-w-[140px] rounded-2xl p-1",
    imageWidth: 120,
    imageHeight: 67,
    titleClass: "text-lg md:text-xl font-extrabold tracking-wide",
    subtitleClass: "text-sm",
  },
  xl: {
    container: "h-12 md:h-16 w-auto max-w-[140px] md:max-w-[180px] rounded-2xl p-1",
    imageWidth: 180,
    imageHeight: 100,
    titleClass: "text-lg md:text-xl font-extrabold tracking-wide",
    subtitleClass: "text-xs md:text-sm",
  },
};

export default function BrandLogo({
  href = "/",
  size = "md",
  showText = true,
  title = "محمود الشحات",
  subtitle = "أستاذ الفيزياء",
  className = "",
}: BrandLogoProps) {
  const currentSize = sizeConfig[size];

  const content = (
    <div className={`inline-flex items-center gap-3 group transition-all duration-300 ${className}`}>
      {/* Logo Glow & Border Surface Container */}
      <div
        className={`relative overflow-hidden ${currentSize.container} border border-physicsCyan-500/30 bg-[#0A1128] shadow-md shadow-physicsCyan-500/10 group-hover:border-physicsCyan-400/60 group-hover:shadow-[0_0_20px_-3px_rgba(6,182,212,0.3)] transition-all duration-300`}
      >
        <Image
          src="/Images/final_logo.jpg"
          alt="شعار منصة الأستاذ محمود الشحات للفيزياء"
          width={currentSize.imageWidth}
          height={currentSize.imageHeight}
          className="w-full h-full object-contain rounded-[inherit] group-hover:scale-105 group-hover:opacity-95 transition-all duration-300"
          priority={size === "md" || size === "lg" || size === "xl"}
        />
      </div>

      {/* Brand Typography */}
      {showText && (
        <div className="flex flex-col text-right select-none">
          <span
            className={`${currentSize.titleClass} text-white group-hover:text-physicsCyan-300 transition-colors`}
          >
            {title}
          </span>
          {subtitle && (
            <span
              className={`${currentSize.subtitleClass} text-physicsCyan-400 font-medium -mt-1 group-hover:text-physicsCyan-200 transition-colors`}
            >
              {subtitle}
            </span>
          )}
        </div>
      )}
    </div>
  );

  if (href) {
    return (
      <Link
        href={href}
        className="inline-flex focus:outline-none focus-visible:ring-2 focus-visible:ring-physicsCyan-400 rounded-xl"
        aria-label={`${title} - ${subtitle || "الرئيسية"}`}
      >
        {content}
      </Link>
    );
  }

  return content;
}
