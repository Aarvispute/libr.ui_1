'use server'

import { cookies } from 'next/headers'
import {
  extractCallNumber,
  getKohaString,
  summarizeCallNumbers,
  type KohaRecord,
} from '@/lib/koha-items'
import { getValidLibraryToken, KOHA_API_URL } from '@/lib/koha'
import { decryptSession } from '@/lib/session'

interface KohaBiblioSearchRecord extends KohaRecord {
  biblio_id?: number | string;
  title?: string;
  author?: string;
  isbn?: string;
  publication_year?: number | string;
  copyright_date?: number | string;
  copyrightdate?: number | string;
  series_title?: string;
  seriestitle?: string;
  notes?: string;
  abstract?: string;
  summary?: string;
  publisher?: string;
  publishercode?: string;
  publisher_code?: string;
  publication_place?: string;
  place?: string;
  publicationplace?: string;
  pages?: string;
  illustrations?: string;
  material_size?: string;
  description?: string;
  item_type?: string;
  itemtype?: string;
  url?: string;
}

async function fetchItemsForBiblio(
  baseUrl: string,
  accessToken: string,
  biblioId: number | string
): Promise<KohaRecord[]> {
  const biblioIdString = String(biblioId);
  const attempts = [
    `${baseUrl}/items?q=${encodeURIComponent(JSON.stringify({ biblio_id: biblioId }))}&_per_page=10`,
    `${baseUrl}/items?biblio_id=${encodeURIComponent(biblioIdString)}&_per_page=10`,
    `${baseUrl}/biblios/${encodeURIComponent(biblioIdString)}/items?_per_page=10`,
  ];

  let lastError: { status: number; body: string; url: string } | null = null;

  for (const url of attempts) {
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        Accept: 'application/json',
        Authorization: `Bearer ${accessToken}`,
      },
      cache: 'no-store',
    });

    if (response.ok) {
      const payload = await response.json();

      if (Array.isArray(payload)) {
        return payload as KohaRecord[];
      }

      if (
        payload &&
        typeof payload === 'object' &&
        Array.isArray((payload as { items?: unknown }).items)
      ) {
        return (payload as { items: KohaRecord[] }).items;
      }

      return [];
    }

    if (response.status === 404) {
      continue;
    }

    const errorText = await response.text();
    lastError = { status: response.status, body: errorText, url };

    if (response.status !== 400) {
      break;
    }
  }

  if (lastError) {
    console.error('Unable to fetch item call numbers for biblio:', lastError);
  }

  return [];
}

export async function getBiblioCallNumber(biblioId: number | string): Promise<string | null> {
  const access_token = await getValidLibraryToken();
  const items = await fetchItemsForBiblio(KOHA_API_URL, access_token, biblioId);
  return summarizeCallNumbers(items);
}

export async function searchCatalog(query: string, filter: string = 'catalog') {
  if (!query) return { results: [] };

  // 1. THE BOUNCER: Verify the user is logged in via our Basic Auth cookie
  const cookieStore = await cookies();
  const authCookie = cookieStore.get('koha_patron_auth');
  
  if (!authCookie || !decryptSession(authCookie.value)) {
    return { error: 'Unauthorized. You must be logged in to search.' };
  }

  try {
    const searchTerm = query.trim();

    // Koha's 'q' parameter expects a valid JSON structure (Object or Array).
    // If the user types plain text, Koha fails to parse it as JSON and throws a 500 error.
    let qParam = searchTerm;
    try {
      const parsed = JSON.parse(searchTerm);
      if (typeof parsed !== 'object' || parsed === null) throw new Error('Not a JSON object');
    } catch {
      // Fallback: Wrap the plain text into a structured JSON query
      // searching for partial matches based on the selected filter.
      const likeTerm = `%${searchTerm}%`;
      
      if (filter === 'catalog') {
        // The universal "catalog" option must only include valid `biblio` DB columns
        qParam = JSON.stringify([
          { title: { "-like": likeTerm } },
          { author: { "-like": likeTerm } },
          { seriestitle: { "-like": likeTerm } },
          { notes: { "-like": likeTerm } }
        ]);
      } else if (filter === 'subject' || filter === 'cn-sort' || filter === 'title-series') {
        // Safeguard: Subjects are in MARC records, Call Numbers are in the `items` table.
        // Querying them on the /biblios DB endpoint causes a SQL 500 error.
        return { error: `Searching by ${filter} is not supported on this specific database endpoint.` };
      } else {
        qParam = JSON.stringify({ [filter]: { "-like": likeTerm } });
      }
    }

    // 2. Fetch the Master Key (OAuth Token) reliably
    const access_token = await getValidLibraryToken();

    // 3. Search the catalog safely via the authenticated endpoint
    // We use the 'q' parameter which relies on Koha's built-in search engine (Zebra/Elasticsearch)
    // rather than x-koha-query which runs direct database SQL queries and is prone to failing on user input.
    const searchResponse = await fetch(`${KOHA_API_URL}/biblios?q=${encodeURIComponent(qParam)}&_per_page=20`, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
        'Authorization': `Bearer ${access_token}`
      },
      next: { revalidate: 60 }
    });

    if (!searchResponse.ok) {
      // Koha REST API intentionally returns a 404 Not Found when 0 records match the query.
      if (searchResponse.status === 404) {
        return { results: [] };
      }

      console.error(`Koha Search API rejected request with status: ${searchResponse.status}`);
      throw new Error(`Search failed with status ${searchResponse.status}`);
    }
    const books = (await searchResponse.json()) as KohaBiblioSearchRecord[];
    
    // 4. THE SANITIZER: Only send safe, required data to the client
    const safeBooks = await Promise.all(books.map(async (book) => {
      const rawPublisher =
        getKohaString(book, ['publisher']) ||
        getKohaString(book, ['publishercode']) ||
        getKohaString(book, ['publisher_code']);
      const cleanPublisher =
        typeof rawPublisher === 'string' ? rawPublisher.replace(/[,:;\s]+$/, '') : rawPublisher;
      
      const rawPlace =
        getKohaString(book, ['publication_place']) ||
        getKohaString(book, ['place']) ||
        getKohaString(book, ['publicationplace']);
      const cleanPlace =
        typeof rawPlace === 'string' ? rawPlace.replace(/[,:;\s]+$/, '') : rawPlace;

      const rawItemType =
        getKohaString(book, ['item_type']) || getKohaString(book, ['itemtype']);
      const itemTypeMap: Record<string, string> = {
        'BK': 'Book',
        'BKS': 'Books',
        'MX': 'Music',
        'CR': 'CD-ROM',
        'EB': 'E-Book',
        'PR': 'Periodical',
        'DVD': 'DVD',
        'CD': 'CD',
        'SR': 'Sound Recording'
      };

      // Removed fan-out fetch here to improve search performance.
      const callNumber = extractCallNumber(book);

      let safeUrl = undefined;
      if (typeof book.url === 'string' && (book.url.startsWith('http://') || book.url.startsWith('https://'))) {
        safeUrl = book.url;
      }

      return {
        biblio_id: book.biblio_id,
        title: book.title,
        author: book.author,
        isbn: book.isbn,
        publication_year: book.publication_year || book.copyright_date || book.copyrightdate,
        series: book.series_title || book.seriestitle,
        notes: book.notes,
        abstract: book.abstract || book.summary,
        publisher: cleanPublisher ?? undefined,
        place: cleanPlace ?? undefined,
        description: [book.pages, book.illustrations, book.material_size].filter(Boolean).join(' ') || book.description,
        item_type: rawItemType ? (itemTypeMap[rawItemType.toUpperCase()] || rawItemType) : undefined,
        callnumber: callNumber ?? undefined,
        url: safeUrl
      };
    }));

    return { results: safeBooks };

  } catch (error) {
    console.error('Catalog Search Error:', error);
    return { error: 'An unexpected error occurred during search.' };
  }
}
