export const KOHA_API_URL = (process.env.KOHA_API_URL as string).replace(/\/$/, '').replace(/^["']|["']$/g, '');
if (!KOHA_API_URL) throw new Error("FATAL: KOHA_API_URL environment variable is missing.");

const KOHA_CLIENT_ID = (process.env.KOHA_CLIENT_ID as string).replace(/^["']|["']$/g, '');
if (!KOHA_CLIENT_ID) throw new Error("FATAL: KOHA_CLIENT_ID environment variable is missing.");

const KOHA_CLIENT_SECRET = (process.env.KOHA_CLIENT_SECRET as string).replace(/^["']|["']$/g, '');
if (!KOHA_CLIENT_SECRET) throw new Error("FATAL: KOHA_CLIENT_SECRET environment variable is missing.");

let tokenPromise: Promise<string> | null = null;
let cachedToken: string | null = null;
let tokenExpiresAt = 0;

export async function getValidLibraryToken(): Promise<string> {
  if (cachedToken && Date.now() < tokenExpiresAt) {
    return cachedToken!;
  }
  if (tokenPromise) return tokenPromise;

  tokenPromise = (async () => {
    try {
      const response = await fetch(`${KOHA_API_URL}/oauth/token`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          grant_type: 'client_credentials',
          client_id: KOHA_CLIENT_ID,
          client_secret: KOHA_CLIENT_SECRET,
        }).toString(),
        cache: 'no-store'
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error(`Koha OAuth API Error (${response.status}):`, errorText);
        tokenPromise = null;
        throw new Error(`Failed to fetch Application Auth token. Status: ${response.status}`);
      }
      const data = await response.json();
      cachedToken = data.access_token;
      tokenExpiresAt = Date.now() + (data.expires_in * 1000) - 60000;
      tokenPromise = null;
      return cachedToken!;
    } catch (error) {
      console.error('Network or parsing error connecting to Koha OAuth:', error);
      tokenPromise = null;
      throw error;
    }
  })();

  return tokenPromise;
}