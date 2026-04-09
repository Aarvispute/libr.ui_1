'use server';

import { cookies } from 'next/headers';
import { decryptSession } from '@/lib/session';
import { getValidLibraryToken, KOHA_API_URL } from '@/lib/koha';

// Use global object to survive dev reloads. 
// TODO: For multi-instance/serverless production, replace this with a Redis/KV-backed lock (e.g., Upstash)
const globalAny = global as any;
globalAny.holdLocks = globalAny.holdLocks || new Set<string>();
const holdLocks = globalAny.holdLocks as Set<string>;

export async function getPatronProfileByUsername(username: string) {
  try {
    // We need to use the Application Token because patrons don't have staff permissions to query /patrons.
    const token = await getValidLibraryToken();

    // Fetch the patron record using the token
    const response = await fetch(`${KOHA_API_URL}/patrons?userid=${encodeURIComponent(username)}`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Accept': 'application/json'
      },
      cache: 'no-store' // Bypass caching to always get the real-time profile state
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`Koha API Error fetching patron profile (Status ${response.status}):`, errorText);
      return null;
    }
    const patrons = await response.json();

    if (patrons && patrons.length > 0) {
      const patron = patrons[0];
      const firstname = patron.firstname || '';
      const surname = patron.surname || '';
      const name = `${firstname} ${surname}`.trim() || username.split('@')[0];
      
      return {
        id: patron.patron_id,
        name: name,
        email: patron.email || username,
        initials: `${firstname.charAt(0) || ''}${surname.charAt(0) || ''}`.toUpperCase() || name.charAt(0).toUpperCase(),
        library_id: patron.library_id
      };
    }
    return null;
  } catch (error) {
    console.error('Failed to fetch patron profile by username:', error);
    return null;
  }
}

export async function getPatronProfile() {
  const cookieStore = await cookies();
  const authCookie = cookieStore.get('koha_patron_auth');

  if (!authCookie) {
    return null;
  }

  const decrypted = decryptSession(authCookie.value);
  
  if (!decrypted) {
    return null; // Session tampered with or invalid
  }

  try {
    // We expect the session to now contain JSON of the patron profile
    return JSON.parse(decrypted);
  } catch (error) {
    // Fallback if it's the old username:password format to not break current active sessions.
    const parts = decrypted.split(':');
    if (parts.length === 2 && parts[0].includes('@')) {
      return {
        id: null,
        name: parts[0].split('@')[0],
        email: parts[0],
        initials: parts[0].charAt(0).toUpperCase(),
        library_id: null
      };
    }
    return null;
  }
}

export async function getPatronHolds() {
  const profile = await getPatronProfile();

  if (!profile || !profile.id) {
    return { error: 'Unauthorized or patron not found.' };
  }

  const token = await getValidLibraryToken();

  try {
    let response = await fetch(`${KOHA_API_URL}/patrons/${profile.id}/holds`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Accept': 'application/json',
        'x-koha-embed': 'biblio,item'
      },
      cache: 'no-store'
    });

    if (response.status === 404 || response.status === 400) {
      response = await fetch(`${KOHA_API_URL}/holds?patron_id=${profile.id}`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Accept': 'application/json',
          'x-koha-embed': 'biblio,item'
        },
        cache: 'no-store'
      });
    }

    if (!response.ok) {
      if (response.status === 404) {
        return { holds: [] };
      }

      return { error: `Failed to fetch holds: ${response.status}` };
    }

    const holds = await response.json();
    return { holds: Array.isArray(holds) ? holds : [] };
  } catch (error) {
    console.error('Error fetching holds:', error);
    return { error: 'Internal server error' };
  }
}

export async function placeHold(biblioId: number) {
  const profile = await getPatronProfile();
  
  if (!profile || !profile.id || !profile.library_id) {
    return { error: 'Unauthorized or missing home library in patron profile.' };
  }

  const lockKey = `${profile.id}-${biblioId}`;
  if (holdLocks.has(lockKey)) {
    return { error: 'Hold request is already processing.' };
  }
  holdLocks.add(lockKey);

  const token = await getValidLibraryToken();

  try {
    const response = await fetch(`${KOHA_API_URL}/holds`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      body: JSON.stringify({
        biblio_id: biblioId,
        patron_id: profile.id,
        pickup_library_id: profile.library_id
      })
    });

    if (!response.ok) {
      let errMsg = 'Failed to place hold';
      try {
        const errData = await response.json();
        errMsg = errData.error || errData.message || errMsg;
      } catch {
        // Ignore if not JSON
      }
      return { error: errMsg };
    }

    return { success: true };
  } catch (error) {
    console.error('Failed to place hold:', error);
    return { error: 'An unexpected error occurred connecting to the library server.' };
  } finally {
    setTimeout(() => holdLocks.delete(lockKey), 3000); // 3 second rate-limit debounce
  }
}
