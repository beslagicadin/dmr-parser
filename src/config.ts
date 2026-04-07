import 'dotenv/config';

export const config = {
  backendUrl:  process.env.APRS_BACKEND_URL ?? 'http://localhost:3001',
  gpsApiKey:   process.env.GPS_API_KEY ?? '',
  debounceSec: parseInt(process.env.DEBOUNCE_SEC ?? '60', 10),
  debug:       process.env.DEBUG === '1',
};
