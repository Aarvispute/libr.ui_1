"use client";
import { useEffect, useState, useRef } from "react";
import Image from "next/image";
import { Marquee } from "@/components/magicui/marquee";
import { getBooks } from "@/lib/books-client";

interface NewArrivalsProps {
  onImageClick?: () => void;
}

export function NewArrivals({ onImageClick }: NewArrivalsProps) {
  const [bookCovers, setBookCovers] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Fetch Logic (Same as before)
  useEffect(() => {
    getBooks()
      .then((covers) => setBookCovers(covers))
      .finally(() => setIsLoading(false));
  }, []);

  if (isLoading) return <div className="h-full w-full animate-pulse bg-neutral-900/20 rounded-lg" />;

  if (bookCovers.length === 0) {
    return (
      <div className="h-full w-full flex items-center justify-center text-muted-foreground text-xs border border-dashed rounded-lg border-white/10">
        No books found in /public/books
      </div>
    );
  }

  return (
    <div className="h-full w-full flex flex-col overflow-hidden group">
      <div className="flex-1 relative flex items-center w-full [mask-image:linear-gradient(to_right,transparent,black_10%,black_90%,transparent)]">
        <Marquee pauseOnHover>
          {bookCovers.map((src, idx) => (
            <button
              key={`${src}-${idx}`}
              onClick={onImageClick}
              className="relative h-40 w-28 flex-shrink-0 cursor-pointer transition-transform duration-300 hover:scale-[1.02] active:scale-95"
            >
              <div className="relative h-full w-full rounded-md overflow-hidden border border-white/10 bg-neutral-900 shadow-sm hover:ring-2 hover:ring-green-500">
                <Image
                  src={src}
                  alt={`Book Cover ${idx + 1}`}
                  fill
                  className="object-cover"
                  sizes="120px"
                  draggable={false}
                />
              </div>
            </button>
          ))}
        </Marquee>
      </div>

      <p className="text-center text-[10px] uppercase tracking-wider text-neutral-500 font-medium mt-1">
        New Arrivals • Use Wheel to Browse
      </p>
    </div>
  );
}