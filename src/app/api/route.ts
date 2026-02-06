import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";

// ✅ 1. Force the API to re-check the folder every time (fixes caching issues)
export const dynamic = "force-dynamic";

type BooksResponse = {
  images: string[];
};

export async function GET() {
  try {
    const booksDirectory = path.join(process.cwd(), "public", "books");

    if (!fs.existsSync(booksDirectory)) {
      console.log("Books directory not found");
      return NextResponse.json<BooksResponse>({ images: [] });
    }

    const fileNames = fs.readdirSync(booksDirectory);

    const images = fileNames
      .filter((file) => /\.(jpg|jpeg|png|webp|avif|gif)$/i.test(file))
      .map((file) => {
        // ✅ 2. Encode filenames to handle spaces (e.g. "Book Name.png" -> "Book%20Name.png")
        return `/books/${encodeURIComponent(file)}`;
      });

    // Debugging: Check your terminal to see if files are found
    console.log(`Found ${images.length} images`); 
    
    return NextResponse.json<BooksResponse>({ images });
  } catch (error) {
    console.error("API Error:", error);
    return NextResponse.json(
      { error: "Failed to read books" },
      { status: 500 }
    );
  }
}