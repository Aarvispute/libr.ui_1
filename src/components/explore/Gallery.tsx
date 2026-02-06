"use client";

import { useState, useEffect, useCallback } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { PixelImage } from "@/components/magicui/pixel-image";
import { cn } from "@/lib/utils";

const galleryImages = [
  "/gallery1.webp",
  "/gallery.webp",
  "/gallery.jpg",
];

interface GalleryProps {
  showControls?: boolean; // Set to false to hide controls
}

export function Gallery({ showControls = true }: GalleryProps) {
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const [controlsVisible, setControlsVisible] = useState(false);

  const total = galleryImages.length;

  const next = useCallback(() => {
    setIndex((i) => (i + 1) % total);
    setPaused(true);
  }, [total]);

  const prev = useCallback(() => {
    setIndex((i) => (i - 1 + total) % total);
    setPaused(true);
  }, [total]);

  // Auto-play
  useEffect(() => {
    if (paused) return;
    const id = setInterval(() => {
      setIndex((i) => (i + 1) % total);
    }, 6000);
    return () => clearInterval(id);
  }, [paused, total]);

  // Resume auto-play
  useEffect(() => {
    if (!paused) return;
    const t = setTimeout(() => setPaused(false), 8000);
    return () => clearTimeout(t);
  }, [paused]);

  // Keyboard support
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "ArrowLeft") prev();
      if (e.key === "ArrowRight") next();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [prev, next]);

  // Show controls on mouse movement, hide after 3 seconds of inactivity
  useEffect(() => {
    if (!showControls) return;

    let timeout: NodeJS.Timeout;

    const handleMouseMove = () => {
      setControlsVisible(true);
      clearTimeout(timeout);
      timeout = setTimeout(() => {
        setControlsVisible(false);
      }, 3000);
    };

    const handleMouseLeave = () => {
      setControlsVisible(false);
      clearTimeout(timeout);
    };

    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseleave", handleMouseLeave);

    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseleave", handleMouseLeave);
      clearTimeout(timeout);
    };
  }, [showControls]);

  return (
    <div className="h-full w-full relative rounded-lg overflow-hidden bg-black/20">
      {/* Image */}
      <PixelImage
        key={index}
        src={galleryImages[index]}
        grid={{ rows: 4, cols: 6 }}
        pixelFadeInDuration={0.25}
        pixelColor="#000000"
      />

      {/* Center Bottom Navigation - Show/hide based on props and mouse movement */}
      {showControls && (
        <div
          className={cn(
            "absolute bottom-6 left-1/2 -translate-x-1/2 z-20 transition-opacity duration-300",
            controlsVisible ? "opacity-100" : "opacity-0"
          )}
        >
          <div
            className={cn(
              "flex items-center gap-4 px-4 py-2",
              "rounded-full bg-black/60 backdrop-blur-md",
              "shadow-lg border border-white/10"
            )}
          >
            <RippleButton onClick={prev} ariaLabel="Previous image">
              <ChevronLeft className="h-5 w-5" />
            </RippleButton>

            <span className="text-xs text-white/70 select-none">
              {index + 1} / {total}
            </span>

            <RippleButton onClick={next} ariaLabel="Next image">
              <ChevronRight className="h-5 w-5" />
            </RippleButton>
          </div>
        </div>
      )}

      {/* Caption */}
      <div className="absolute bottom-3 left-3 z-10 pointer-events-none
                      bg-black/60 text-white px-3 py-1 rounded-full
                      text-xs backdrop-blur-md">
        Campus Highlights
      </div>
    </div>
  );
}

/* --- Small ripple-style button --- */
function RippleButton({
  onClick,
  children,
  ariaLabel,
}: {
  onClick: () => void;
  children: React.ReactNode;
  ariaLabel: string;
}) {
  return (
    <button
      onClick={onClick}
      aria-label={ariaLabel}
      className="
        relative h-9 w-9 rounded-full
        flex items-center justify-center
        text-white
        hover:bg-white/10 
        active:scale-95
        transition
        overflow-hidden
      "
    >
      {/* ripple */}
      <span className="absolute inset-0 rounded-full
                       active:animate-ping
                       bg-white/20" />
      <span className="relative z-10">{children}</span>
    </button>
  );
}
