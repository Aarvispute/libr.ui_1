let booksCachePromise: Promise<string[]> | null = null;

export function getBooks(): Promise<string[]> {
  if (!booksCachePromise) {
    booksCachePromise = fetch("/api")
      .then((res) => res.json())
      .then((data) => {
        if (data && data.images && Array.isArray(data.images)) {
          return data.images;
        }
        return [];
      })
      .catch((err) => {
        console.error("Failed to load books", err);
        return [];
      });
  }
  return booksCachePromise;
}