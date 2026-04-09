import { NextResponse } from 'next/server';
import { getPatronProfile } from '@/actions/patron';
import {
  extractCallNumber,
  extractItemId,
  type KohaRecord,
} from '@/lib/koha-items';
import { getValidLibraryToken, KOHA_API_URL } from '@/lib/koha';

// Use global object to survive dev reloads. 
// TODO: For multi-instance/serverless production, replace this with a Redis/KV-backed lock (e.g., Upstash)
const globalAny = global as any;
globalAny.renewLocks = globalAny.renewLocks || new Set<string>();
const renewLocks = globalAny.renewLocks as Set<string>;

type CheckoutAttempt = {
  url: string;
  embed?: string;
  label: string;
};

type KohaCheckoutRecord = KohaRecord & {
  item?: KohaRecord;
  biblio?: KohaRecord;
  callnumber?: string;
  call_number?: string;
};

function asKohaRecord(value: unknown): KohaRecord | null {
  if (!value || typeof value !== 'object') {
    return null;
  }

  return value as KohaRecord;
}

function attachCheckoutCallNumbers(
  checkouts: KohaCheckoutRecord[]
): KohaCheckoutRecord[] {
  return checkouts.map((checkout) => {
    const embeddedItem = asKohaRecord(checkout.item);
    const existingCallNumber =
      extractCallNumber(checkout) || extractCallNumber(embeddedItem);

    if (existingCallNumber) {
      return {
        ...checkout,
        callnumber: existingCallNumber,
      };
    }

    return checkout;
  });
}

async function fetchCheckoutsFromKoha(baseUrl: string, token: string, patronId: number | string) {
  const attempts: CheckoutAttempt[] = [
    {
      url: `${baseUrl}/checkouts?patron_id=${patronId}&_order_by=-checkout_date`,
      embed: 'item,item.biblio',
      label: 'legacy-query-modern-embed',
    },
    {
      url: `${baseUrl}/checkouts?patron_id=${patronId}&_order_by=-checkout_date`,
      embed: 'item,biblio',
      label: 'legacy-query-legacy-embed',
    },
    {
      url: `${baseUrl}/patrons/${patronId}/checkouts?_order_by=-checkout_date`,
      embed: 'item,item.biblio',
      label: 'patron-path-modern-embed',
    },
    {
      url: `${baseUrl}/patrons/${patronId}/checkouts?_order_by=-checkout_date`,
      embed: 'item,biblio',
      label: 'patron-path-legacy-embed',
    },
  ];

  let lastError: { status: number; body: string } | null = null;

  for (const attempt of attempts) {
    const response = await fetch(attempt.url, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Accept': 'application/json',
        ...(attempt.embed ? { 'x-koha-embed': attempt.embed } : {}),
      },
      cache: 'no-store',
    });

    if (response.ok) {
      return {
        kind: 'success' as const,
        checkouts: (await response.json()) as KohaCheckoutRecord[],
      };
    }

    if (response.status === 404) {
      return { kind: 'empty' as const };
    }

    const errorText = await response.text();
    console.error('Koha checkout request rejected:', {
      status: response.status,
      url: attempt.url,
      embed: attempt.embed,
      attempt: attempt.label,
    });

    lastError = { status: response.status, body: 'Koha API error' };

    if (response.status !== 400) {
      return {
        kind: 'error' as const,
        status: response.status,
        message: `Koha API error: ${response.status}`,
      };
    }
  }

  return {
    kind: 'error' as const,
    status: lastError?.status ?? 500,
    message: lastError?.body || 'Koha API error while fetching checkouts',
  };
}

export async function GET() {
  const profile = await getPatronProfile();
  
  if (!profile || !profile.id) {
    return NextResponse.json({ error: 'Unauthorized or patron not found.' }, { status: 401 });
  }

  const token = await getValidLibraryToken();

  try {
    const result = await fetchCheckoutsFromKoha(KOHA_API_URL, token, profile.id);

    if (result.kind === 'empty') {
      return NextResponse.json({ checkouts: [] }, { status: 200 });
    }

    if (result.kind === 'error') {
      return NextResponse.json({ error: result.message }, { status: result.status });
    }

    const normalizedCheckouts = attachCheckoutCallNumbers(result.checkouts);

    return NextResponse.json({ checkouts: normalizedCheckouts });
  } catch (error) {
    console.error('Error fetching checkouts:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const profile = await getPatronProfile();
  
  if (!profile || !profile.id) {
    return NextResponse.json({ error: 'Unauthorized or patron not found.' }, { status: 401 });
  }

  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }
  
  if (body.checkout_id === undefined || body.checkout_id === null || body.checkout_id === '') {
    return NextResponse.json({ error: 'Missing checkout_id' }, { status: 400 });
  }
  
  const checkout_id = String(body.checkout_id);

  if (renewLocks.has(checkout_id)) {
    return NextResponse.json({ error: 'Renewal already in progress.' }, { status: 429 });
  }

  const token = await getValidLibraryToken();

  // Verify ownership to ensure users cannot renew arbitrary items
  const userCheckoutsResult = await fetchCheckoutsFromKoha(KOHA_API_URL, token, profile.id);
  if (userCheckoutsResult.kind !== 'success') {
    return NextResponse.json({ error: 'Could not verify checkout ownership' }, { status: 403 });
  }
  
  const ownsCheckout = userCheckoutsResult.checkouts.some(c => String(c.checkout_id) === checkout_id);
  if (!ownsCheckout) {
    return NextResponse.json({ error: 'Checkout not found or not owned by user' }, { status: 403 });
  }

  renewLocks.add(checkout_id);

  try {
    const response = await fetch(`${KOHA_API_URL}/checkouts/${checkout_id}/renewal`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Accept': 'application/json'
      }
    });

    if (!response.ok) {
      let errMsg = 'Renewal failed';
      try {
        const errData = await response.json();
        errMsg = errData.error || errData.message || errMsg;
      } catch {
        // Ignore if Koha does not return JSON
      }
      return NextResponse.json({ error: errMsg }, { status: response.status });
    }

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  } finally {
    setTimeout(() => renewLocks.delete(checkout_id), 3000); // 3 second rate-limit debounce
  }
}
