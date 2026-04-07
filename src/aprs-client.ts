/**
 * Posts a DMR-derived position to the APRS backend via POST /api/gps.
 * Also queries the backend for the last known position of a callsign.
 */
import { config } from './config';

export interface GpsPayload {
  radioId:   string;
  callsign:  string;
  lat:       number;
  lon:       number;
  symbol:    string;
  comment?:  string;
  timestamp: string;
}

export async function postPosition(payload: GpsPayload): Promise<void> {
  try {
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (config.gpsApiKey) headers['X-Api-Key'] = config.gpsApiKey;

    const res = await fetch(`${config.backendUrl}/api/gps`, {
      method:  'POST',
      headers,
      body:    JSON.stringify(payload),
      signal:  AbortSignal.timeout(5_000),
    });

    if (!res.ok) {
      const text = await res.text();
      console.error(`[aprs] POST failed (${res.status}): ${text}`);
      return;
    }

    console.log(`[aprs] Posted: ${payload.callsign} @ ${payload.lat.toFixed(5)}, ${payload.lon.toFixed(5)}`);
  } catch (err) {
    console.error('[aprs] POST error:', (err as Error).message);
  }
}
