import { NextResponse } from "next/server";
import fs from "fs/promises";
import path from "path";

// Revalidate the statically generated response every 1 hour
export const revalidate = 3600;

type BooksResponse = {
  images: string[];
};

const globalAny = global as any;

export async function GET() {
  try {
    if (globalAny.booksCache) {
      return NextResponse.json<BooksResponse>({ images: globalAny.booksCache });
    }

    const booksDirectory = path.join(process.cwd(), "public", "books");

    let fileNames: string[] = [];
    try {
      fileNames = await fs.readdir(booksDirectory);
    } catch {
      console.log("Books directory not found");
      return NextResponse.json<BooksResponse>({ images: [] });
    }

    const images = fileNames
      .filter((file) => /\.(jpg|jpeg|png|webp|avif|gif)$/i.test(file))
      .map((file) => `/books/${encodeURIComponent(file)}`);

    globalAny.booksCache = images;
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
