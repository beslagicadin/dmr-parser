/**
 * RadioID.net API client with in-memory cache.
 * DMR IDs don't change, so we cache permanently for the session.
 *
 * API docs: https://radioid.net/api/dmr/user/?id=<ID>
 */

const BASE = 'https://radioid.net/api/dmr/user';

export interface RadioIdResult {
  dmrId:    number;
  callsign: string;
  name:     string;
  city:     string;
  country:  string;
}

const MAX_CACHE = 10_000;
const cache = new Map<number, RadioIdResult | null>();

export async function lookupDmrId(dmrId: number): Promise<RadioIdResult | null> {
  if (cache.has(dmrId)) return cache.get(dmrId)!;

  try {
    const res = await fetch(`${BASE}/?id=${dmrId}`, {
      signal: AbortSignal.timeout(5_000),
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);

    const data = await res.json() as { results?: {
      id: number; callsign: string; fname: string; city: string; country: string;
    }[] };

    if (!data.results?.length) {
      console.warn(`[radioid] DMR-ID ${dmrId} not found in database`);
      cache.set(dmrId, null);
      return null;
    }

    const r = data.results[0];
    const result: RadioIdResult = {
      dmrId:    r.id,
      callsign: r.callsign,
      name:     r.fname,
      city:     r.city,
      country:  r.country,
    };

    // Evict oldest entry if cache is full
    if (cache.size >= MAX_CACHE) {
      const oldest = cache.keys().next().value;
      if (oldest !== undefined) cache.delete(oldest);
    }
    cache.set(dmrId, result);
    console.log(`[radioid] ${dmrId} → ${result.callsign} (${result.name}, ${result.city})`);
    return result;

  } catch (err) {
    console.error(`[radioid] lookup failed for ${dmrId}:`, (err as Error).message);
    return null;
  }
}
