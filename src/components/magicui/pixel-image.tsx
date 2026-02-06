"use client";

import { useMemo } from "react";
import { cn } from "@/lib/utils";

// ✅ 1. We define the strict types we expect
interface GridObject {
  rows: number;
  cols: number;
}

interface PixelImageProps {
  src: string;
  grid?: GridObject | number; // Accept object OR number
  pixelFadeInDuration?: number;
  pixelColor?: string;
  className?: string;
}

export function PixelImage({
  src,
  grid = { rows: 10, cols: 10 }, // Default fallback
  pixelFadeInDuration = 1.5,
  pixelColor = "#ffffff",
  className,
}: PixelImageProps) {

  // ✅ 2. Crash-Proof Grid Calculation
  const { rows, cols } = useMemo(() => {
    // If user passed a single number (e.g. 15), make it 15x15
    if (typeof grid === "number") {
      return { rows: grid, cols: grid };
    }
    // If user passed an object, use it. If completely missing, default to 10x10.
    if (grid && typeof grid === "object") {
      return { rows: grid.rows || 10, cols: grid.cols || 10 };
    }
    return { rows: 10, cols: 10 };
  }, [grid]);

  // Create the array for rendering
  const pixels = useMemo(() => {
    return Array.from({ length: rows * cols }).map((_, i) => ({
      id: i,
      delay: Math.random() * pixelFadeInDuration,
    }));
  }, [rows, cols, pixelFadeInDuration]);

  return (
    <div
      className={cn(
        "relative w-full h-full overflow-hidden bg-muted",
        className
      )}
    >
      {/* Background Image */}
      <img
        src={src}
        alt="pixel-image-bg"
        className="absolute inset-0 w-full h-full object-cover"
      />

      {/* The Pixel Overlay Grid */}
      <div
        className="absolute inset-0 grid w-full h-full pointer-events-none"
        style={{
          gridTemplateColumns: `repeat(${cols}, 1fr)`,
          gridTemplateRows: `repeat(${rows}, 1fr)`,
        }}
      >
        {pixels.map((pixel) => (
          <div
            key={pixel.id}
            className="w-full h-full animate-fade-out"
            style={{
              backgroundColor: pixelColor,
              animationDuration: `${pixelFadeInDuration}s`,
              animationDelay: `${pixel.delay}s`,
              animationFillMode: "forwards",
            }}
          />
        ))}
      </div>
    </div>
  );
}