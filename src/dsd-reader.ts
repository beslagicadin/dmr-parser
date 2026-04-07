/**
 * Reads DSD+ output line by line from stdin.
 * Extracts DMR source IDs and GPS coordinates transmitted in the DMR data channel.
 *
 * DSD+ source-ID patterns:
 *   Slot1: *VoiceHeader* ... Src: 2181234 Dst: 91 [Group]
 *   Voice Header: SrcID: 2181234 DstID: 91
 *   [Slot 1] [CC 1] SRC: 2181234
 *
 * DSD+ GPS patterns:
 *   GPS: Lat: 43.85630 Lon: 18.41310
 *   [Slot 1] GPS Pos: 43.85630N 18.41310E
 *   GPS: 43.85630N 018.41310E
 *
 * Pipe DSD+ into this process:  dsdplus.exe -i 0 | npm start
 */
import * as readline from 'readline';
import { config } from './config';

const SRC_PATTERNS = [
  /\bSrc:\s*(\d{4,9})\b/i,
  /\bSrcID:\s*(\d{4,9})\b/i,
  /\bSRC:\s*(\d{4,9})\b/i,
];

// Matches: "Lat: 43.85630 Lon: 18.41310" with optional N/S/E/W
const GPS_PATTERNS = [
  /Lat[:\s]+(-?\d+\.\d+)\s*[NS]?\s+Lon[:\s]+(-?\d+\.\d+)\s*[EW]?/i,
  /GPS\s+Pos[:\s]+(-?\d+\.\d+)[NS]\s+(-?\d+\.\d+)[EW]/i,
  /GPS[:\s]+(-?\d+\.\d+)[NS]\s+0*(-?\d+\.\d+)[EW]/i,
];

export interface DmrEvent {
  dmrId: number;
  lat?:  number;
  lon?:  number;
}

export function startDsdReader(onEvent: (event: DmrEvent) => void): void {
  const rl = readline.createInterface({ input: process.stdin, crlfDelay: Infinity });

  // Buffer: hold pending DMR-ID waiting for a GPS line arriving shortly after
  let pendingId:  number | null = null;
  let pendingLat: number | null = null;
  let pendingLon: number | null = null;
  let flushTimer: ReturnType<typeof setTimeout> | null = null;

  function flush(): void {
    if (pendingId === null) return;
    onEvent({ dmrId: pendingId, lat: pendingLat ?? undefined, lon: pendingLon ?? undefined });
    pendingId  = null;
    pendingLat = null;
    pendingLon = null;
    if (flushTimer) { clearTimeout(flushTimer); flushTimer = null; }
  }

  function scheduleFlush(): void {
    if (flushTimer) clearTimeout(flushTimer);
    // GPS line usually arrives within the same burst — wait 500ms
    flushTimer = setTimeout(flush, 500);
  }

  rl.on('line', (line) => {
    if (config.debug) console.log('[dsd]', line);

    // Check for GPS first — may accompany a previously seen DMR-ID
    for (const pattern of GPS_PATTERNS) {
      const m = line.match(pattern);
      if (m) {
        const lat = parseFloat(m[1]);
        const lon = parseFloat(m[2]);
        if (!isNaN(lat) && !isNaN(lon) && lat >= -90 && lat <= 90 && lon >= -180 && lon <= 180) {
          if (config.debug) console.log(`[dsd] GPS parsed: ${lat}, ${lon}`);
          if (pendingId !== null) {
            // Pair with waiting DMR-ID
            pendingLat = lat;
            pendingLon = lon;
            flush();
          }
          // GPS without a DMR-ID in buffer — ignore (can't associate)
        }
        return;
      }
    }

    // Check for DMR source ID
    for (const pattern of SRC_PATTERNS) {
      const m = line.match(pattern);
      if (m) {
        const id = parseInt(m[1], 10);
        if (id >= 1 && id <= 16776415) {
          if (pendingId !== null) flush(); // flush previous unpaired ID first
          pendingId  = id;
          pendingLat = null;
          pendingLon = null;
          scheduleFlush(); // wait briefly for a GPS line
        }
        break;
      }
    }
  });

  rl.on('close', () => {
    flush();
    console.log('[dsd] stdin closed — exiting');
    process.exit(0);
  });
}
