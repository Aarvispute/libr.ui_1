import { cn } from "@/lib/utils";
import React from "react";

interface MarqueeProps {
  className?: string;
  reverse?: boolean;
  pauseOnHover?: boolean;
  children?: React.ReactNode;
  vertical?: boolean;
  repeat?: number; // This prop is no longer used for a seamless loop
  [key: string]: any;
}

export function Marquee({
  className,
  reverse,
  pauseOnHover = false,
  children,
  vertical = false,
  repeat, // This is unused now
  ...props
}: MarqueeProps) {
  return (
    <div
      {...props}
      style={{
        "--duration": "15s",
        "--gap": "1rem", // This gap is between the items inside children
        ...props.style,
      } as React.CSSProperties}
      className={cn(
        "group flex overflow-hidden p-2 [gap:var(--gap)]",
        {
          "flex-row": !vertical,
          "flex-col": vertical,
        },
        className
      )}
    >
      <div
        className={cn("flex min-w-full shrink-0", {
          "animate-marquee flex-row": !vertical,
          "animate-marquee-vertical flex-col": vertical,
          "group-hover:[animation-play-state:paused]": pauseOnHover,
          "[animation-direction:reverse]": reverse,
        })}
      >
        <div className={cn("flex items-center [gap:var(--gap)]", { "flex-row": !vertical, "flex-col": vertical })}>
          {children}
        </div>
        <div aria-hidden="true" className={cn("flex items-center [gap:var(--gap)]", { "flex-row": !vertical, "flex-col": vertical })}>
          {children}
        </div>
      </div>
    </div>
  );
}