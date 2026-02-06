"use client";
import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { Marquee } from "@/components/magicui/marquee"; 

export function NewArrivals({ reverse = false }: { reverse?: boolean }) {
  const [bookCovers, setBookCovers] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function fetchBooks() {
      try {
        const response = await fetch("/api"); 
        if (!response.ok) throw new Error("API Failed");
        
        const data = await response.json();
        if (data.images) setBookCovers(data.images);
      } catch (error) {
        console.error("Failed", error);
      } finally {
        setIsLoading(false);
      }
    }
    fetchBooks();
  }, []);

  if (isLoading) {
    return <div className="h-full w-full animate-pulse bg-neutral-900/20 rounded-lg" />;
  }

  if (bookCovers.length === 0) {
    return (
      <div className="h-full w-full flex items-center justify-center text-muted-foreground text-xs border border-dashed rounded-lg border-white/10">
        No books found in /public/books
      </div>
    );
  }

  return (
    <div className="h-full w-full flex flex-col overflow-hidden">
      <div className="flex-1 relative flex items-center w-full overflow-hidden">
        {/* Edge fade mask */}
        <div className="absolute inset-0 z-10 pointer-events-none [mask-image:linear-gradient(to_right,transparent,black_20%,black_80%,transparent)]" />
        
        {/* ✅ FIX: key forces Marquee to remount when reverse changes */}
        <Marquee
          key={reverse.toString()}
          pauseOnHover
          reverse={reverse}
          className="[--duration:30s]"
        >
          {bookCovers.map((src, idx) => (
            <Link
              key={`${src}-${idx}`}
              href="#"
              className="relative h-40 w-28 flex-shrink-0 cursor-pointer mx-2"
            >
              <div className="relative h-full w-full rounded-md overflow-hidden border border-white/10 bg-neutral-900 shadow-sm transition-all duration-300 hover:scale-105 hover:ring-2 hover:ring-green-500">
                <Image
                  src={src}
                  alt="Book Cover"
                  fill
                  className="object-cover"
                  sizes="120px"
                />
              </div>
            </Link>
          ))}
        </Marquee>
      </div>

      <p className="text-center text-[10px] uppercase tracking-wider text-neutral-500 font-medium mt-2">
        New Arrivals
      </p>
    </div>
  );
}
