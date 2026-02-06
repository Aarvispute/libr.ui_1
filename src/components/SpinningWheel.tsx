"use client";
import React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { BadgePlus, Image as ImageIcon, MessageSquare, MapPin, ExternalLink, ScanEye, ScrollText, BookOpen } from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";

// Exported so the parent page can use this data too
export const WHEEL_ITEMS = [
  { id: 0, label: "New Arrivals", icon: BadgePlus, color: "text-green-500", shadow: "shadow-green-500/20" },
  { id: 1, label: "Gallery", icon: ImageIcon, color: "text-blue-500", shadow: "shadow-blue-500/20" },
  { id: 2, label: "Locations", icon: MapPin, color: "text-red-500", shadow: "shadow-red-500/20" },
  { id: 3, label: "Feedback", icon: MessageSquare, color: "text-yellow-500", shadow: "shadow-yellow-500/20" },
];

interface SpinningWheelProps {
  activeId: number;
  onIdChange: (id: number) => void;
  // Callback for the gallery modal (since it overlays on the current page)
  onOpenGallery: () => void;
}

export function SpinningWheel({ activeId, onIdChange, onOpenGallery }: SpinningWheelProps) {
  const radius = 115; 
  const anglePerItem = 360 / WHEEL_ITEMS.length;
  const rotation = -(activeId * anglePerItem);

  return (
    <div className="relative flex w-full h-full items-center justify-center overflow-hidden p-12">
      
      {/* 1. DYNAMIC CENTER HUB (The Command Center) */}
      <div className="absolute z-30 h-28 w-28 rounded-full bg-background/90 backdrop-blur-xl border border-white/10 flex flex-col items-center justify-center shadow-2xl transition-all duration-300">
         <AnimatePresence mode="wait">
            
            {/* CASE 0: NEW ARRIVALS (Links to the new page) */}
            {activeId === 0 && (
              <motion.div 
                key="new-arrivals"
                initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.8 }}
                className="flex flex-col items-center gap-2"
              >
                <span className="text-[9px] uppercase tracking-widest text-green-500 font-bold">Browse</span>
                <Link 
                   href="/new-arrivals"
                   className="flex items-center gap-1 px-3 py-1.5 rounded-full bg-green-500/10 border border-green-500/20 text-green-500 hover:bg-green-500 hover:text-white transition-all duration-300"
                >
                   <span className="text-xs font-medium">Open</span>
                   <BookOpen className="h-3 w-3" />
                </Link>
              </motion.div>
            )}

            {/* CASE 1: GALLERY (Triggers Modal) */}
            {activeId === 1 && (
              <motion.div 
                key="gallery"
                initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.8 }}
                className="flex flex-col items-center gap-2"
              >
                <span className="text-[9px] uppercase tracking-widest text-blue-500 font-bold">Full View</span>
                <button 
                  onClick={onOpenGallery}
                  className="flex items-center gap-1 px-3 py-1.5 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-500 hover:bg-blue-500 hover:text-white transition-all duration-300"
                >
                  <span className="text-xs font-medium">Open</span>
                  <ScanEye className="h-3 w-3" />
                </button>
              </motion.div>
            )}

            {/* CASE 2: LOCATIONS (External Link to VR) */}
            {activeId === 2 && (
              <motion.div 
                key="locations"
                initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.8 }}
                className="flex flex-col items-center gap-2"
              >
                <span className="text-[9px] uppercase tracking-widest text-red-500 font-bold">V.R. Guide</span>
                <Link 
                  href="https://mitwpu.edu.in/virtual-tour" 
                  target="_blank"
                  className="flex items-center gap-1 px-3 py-1.5 rounded-full bg-red-500/10 border border-red-500/20 text-red-500 hover:bg-red-500 hover:text-white transition-all duration-300"
                >
                  <span className="text-xs font-medium">Open</span>
                  <ExternalLink className="h-3 w-3" />
                </Link>
              </motion.div>
            )}

            {/* CASE 3: FEEDBACK (Internal Link) */}
            {activeId === 3 && (
              <motion.div 
                key="feedback"
                initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.8 }}
                className="flex flex-col items-center gap-2"
              >
                <span className="text-[9px] uppercase tracking-widest text-yellow-500 font-bold">Logs</span>
                <Link 
                  href="/feedback/logs" 
                  className="flex items-center gap-1 px-3 py-1.5 rounded-full bg-yellow-500/10 border border-yellow-500/20 text-yellow-500 hover:bg-yellow-500 hover:text-black transition-all duration-300"
                >
                  <span className="text-xs font-medium">Open</span>
                  <ScrollText className="h-3 w-3" />
                </Link>
              </motion.div>
            )}
         </AnimatePresence>
      </div>

      {/* 2. Rotating Ring */}
      <motion.div
        className="relative flex items-center justify-center pointer-events-none"
        animate={{ rotate: rotation }}
        transition={{ type: "spring", stiffness: 50, damping: 15, mass: 1 }}
        style={{ width: radius * 2, height: radius * 2 }}
      >
        <div className="absolute inset-0 rounded-full border border-dashed border-muted-foreground/20" />
        <div className="absolute inset-3 rounded-full border border-dotted border-muted-foreground/20 opacity-50" />

        {/* 3. Items */}
        {WHEEL_ITEMS.map((item, index) => {
          const angleInRad = ((index * anglePerItem - 90) * Math.PI) / 180;
          const x = radius * Math.cos(angleInRad);
          const y = radius * Math.sin(angleInRad);
          const isActive = activeId === index;

          return (
            <motion.button
              key={item.id}
              onClick={() => onIdChange(index)}
              className={cn(
                "absolute flex items-center justify-center rounded-full border bg-background transition-all duration-300 cursor-pointer pointer-events-auto",
                isActive 
                  ? `h-14 w-14 border-primary ring-4 ring-primary/5 z-10 scale-110 ${item.shadow} shadow-lg` 
                  : "h-11 w-11 border-border opacity-70 hover:opacity-100 hover:scale-110"
              )}
              style={{
                left: "50%",
                top: "50%",
                x: x - (isActive ? 28 : 22), 
                y: y - (isActive ? 28 : 22), 
              }}
              animate={{ rotate: -rotation }} 
            >
              <item.icon 
                className={cn(
                  "transition-all duration-300", 
                  isActive ? `h-6 w-6 ${item.color}` : "h-4 w-4 text-muted-foreground"
                )} 
              />
            </motion.button>
          );
        })}
      </motion.div>

    </div>
  );
}