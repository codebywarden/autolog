// Server-only client for the DVSA MOT History API. Never import this from
// a Client Component — CLIENT_SECRET and API_KEY must stay off the browser.

const TOKEN_URL = process.env.DVSA_MOT_TOKEN_URL!;
const CLIENT_ID = process.env.DVSA_MOT_CLIENT_ID!;
const CLIENT_SECRET = process.env.DVSA_MOT_CLIENT_SECRET!;
const SCOPE_URL = process.env.DVSA_MOT_SCOPE_URL!;
const API_KEY = process.env.DVSA_MOT_API_KEY!;
const API_BASE_URL = "https://history.mot.api.gov.uk/v1/trade/vehicles/registration";

interface CachedToken {
  value: string;
  expiresAt: number;
}

// Module-level cache: fine for a warm serverless instance, and saves a
// token round-trip on every lookup. Worst case on a cold start is one
// extra token request — not worth a real store for MVP.
let cachedToken: CachedToken | null = null;

async function getAccessToken(): Promise<string> {
  if (cachedToken && cachedToken.expiresAt > Date.now()) {
    return cachedToken.value;
  }

  const response = await fetch(TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "client_credentials",
      client_id: CLIENT_ID,
      client_secret: CLIENT_SECRET,
      scope: SCOPE_URL,
    }),
  });

  if (!response.ok) {
    throw new Error(
      `DVSA token request failed: ${response.status} ${await response.text()}`,
    );
  }

  const data = (await response.json()) as {
    access_token: string;
    expires_in: number;
  };

  cachedToken = {
    value: data.access_token,
    // Refresh a minute early so we never hand out a token that expires
    // mid-request.
    expiresAt: Date.now() + (data.expires_in - 60) * 1000,
  };

  return cachedToken.value;
}

export class MotHistoryNotFoundError extends Error {}

/**
 * Returns the raw DVSA response for a registration, unmapped. We display
 * this as-is in the lookup test page first to confirm the live field
 * names before writing the mapping into mot_history — DVSA has changed
 * this schema across API versions before.
 */
export async function getMotHistoryByRegistration(
  registration: string,
): Promise<unknown> {
  const token = await getAccessToken();

  const response = await fetch(
    `${API_BASE_URL}/${encodeURIComponent(registration)}`,
    {
      headers: {
        Authorization: `Bearer ${token}`,
        "X-API-Key": API_KEY,
      },
    },
  );

  if (response.status === 404) {
    throw new MotHistoryNotFoundError(
      `No MOT history found for ${registration}`,
    );
  }

  if (!response.ok) {
    throw new Error(
      `DVSA MOT History API error: ${response.status} ${await response.text()}`,
    );
  }

  return response.json();
}
