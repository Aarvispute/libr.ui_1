"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { ArrowLeft, Search, Filter } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

// ✅ CONFIGURATION:
// In production, the backend dev changes this string to their real API URL.
const API_ENDPOINT = "/api"; 

// ✅ THE ADAPTER (Translation Layer):
const adaptBooksResponse = (data: any): string[] => {
  if (!data) return [];
  
  // 1. Handle our Mock API format
  if (data.images && Array.isArray(data.images)) {
    return data.images;
  }
  return [];
};

// ✅ CRITICAL: This must be 'export default function'
export default function NewArrivalsPage() {
  const [books, setBooks] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function fetchBooks() {
      try {
        const response = await fetch(API_ENDPOINT);
        const rawData = await response.json();
        const cleanBooks = adaptBooksResponse(rawData);
        setBooks(cleanBooks);
      } catch (error) {
        console.error("Failed to load books", error);
      } finally {
        setIsLoading(false);
      }
    }
    fetchBooks();
  }, []);

  return (
    <div className="min-h-screen bg-background text-foreground p-8">
      <div className="max-w-7xl mx-auto space-y-8">
        
        {/* Header */}
        <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
          <div className="flex items-center gap-4 w-full md:w-auto">
            <Link href="/">
              <Button variant="ghost" size="icon" className="rounded-full">
                <ArrowLeft className="h-5 w-5" />
              </Button>
            </Link>
            <div>
              <h1 className="text-2xl font-bold tracking-tight">New Arrivals</h1>
              <p className="text-muted-foreground text-sm">Just added to the collection</p>
            </div>
          </div>

          <div className="flex gap-2 w-full md:w-auto">
             <div className="relative flex-1 md:w-64">
                <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input placeholder="Search titles..." className="pl-9" />
             </div>
             <Button variant="outline"><Filter className="h-4 w-4 mr-2" /> Filter</Button>
          </div>
        </div>

        {/* Grid Content */}
        {isLoading ? (
           <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-6">
              {[...Array(6)].map((_, i) => (
                <div key={i} className="aspect-[2/3] bg-muted animate-pulse rounded-lg" />
              ))}
           </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-6">
            {books.map((src, idx) => (
              <div key={idx} className="group relative aspect-[2/3] overflow-hidden rounded-lg border bg-muted shadow-sm transition-all hover:shadow-md">
                <Image
                  src={src}
                  alt={`Book ${idx + 1}`}
                  fill
                  className="object-cover transition-transform duration-300 group-hover:scale-105"
                  sizes="(max-width: 768px) 50vw, 33vw"
                />
                <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                   <Button variant="secondary" size="sm" className="translate-y-4 group-hover:translate-y-0 transition-transform">
                     View Details
                   </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}