# DMR-parser

Bridges DSD+ audio decoder output to the APRS Tracker backend. Listens to DMR radio transmissions decoded from audio input, extracts DMR-ID and GPS coordinates, looks up the callsign via RadioID.net, and posts the position to the APRS backend.

## How It Works

```
HD1 Radio (audio out)
        │
        │  3.5mm audio cable
        ▼
PC Line-in / Mic-in
        │
        │  DSD+ decodes DMR digital audio
        ▼
DSD+ stdout
        │
        │  pipe  (dsdplus.exe -i 0 | npm run dev)
        ▼
DMR-parser (this project)
        │
        ├── Parse DMR-ID from voice header
        ├── Parse GPS coordinates from data channel
        ├── Lookup callsign via RadioID.net API
        │
        ▼
POST /api/gps  →  aprs-backend
```

**Position rule**: a position is only posted if GPS coordinates were transmitted with the DMR call. Calls without GPS are silently skipped.

## Requirements

- [DSD+](https://www.dsdplus.com) installed and accessible in PATH
- HD1 (or other DMR radio with GPS) connected via audio cable
- APRS backend running

## Quick Start

```bash
cp .env.example .env
npm install

# Pipe DSD+ output into the parser:
dsdplus.exe -i 0 | npm run dev
```

List available audio input devices:

```bash
dsdplus.exe -l
```

## Environment Variables

| Variable | Default | Description |
|---|---|---|
| `APRS_BACKEND_URL` | `http://localhost:3001` | APRS backend base URL |
| `DEBOUNCE_SEC` | `60` | Seconds to suppress duplicate events for the same DMR-ID |
| `DEBUG` | `0` | Set to `1` to log every raw DSD+ line |

## DSD+ Output Parsing

The parser matches DMR source IDs from several DSD+ output formats:

```
Slot1: *VoiceHeader* Src: 2181234 Dst: 91 [Group]
Voice Header: SrcID: 2181234 DstID: 91
[Slot 1] [CC 1] SRC: 2181234
```

GPS coordinates are matched from:

```
GPS: Lat: 43.85630 Lon: 18.41310
[Slot 1] GPS Pos: 43.85630N 18.41310E
GPS: 43.85630N 018.41310E
```

## Debounce

The same DMR-ID will only trigger one lookup + post per `DEBOUNCE_SEC` seconds (default 60s). This prevents hammering RadioID.net and the backend when a station transmits multiple voice frames in a single QSO.

## RadioID.net

Callsigns are resolved via `https://radioid.net/api/dmr/user/?id=<ID>`. Results are cached in memory for the lifetime of the process (DMR IDs don't change).

## Testing Without a Radio

```powershell
# PowerShell
"Slot1: *VoiceHeader* Src: 2180203`nGPS: Lat: 44.538081 Lon: 18.675415" | npm run dev
```

## Project Structure

```
src/
├── index.ts        # Entry point — pipeline, debounce logic
├── dsd-reader.ts   # Reads stdin, parses DMR-ID and GPS from DSD+ output
├── radioid.ts      # RadioID.net API client with session cache
├── aprs-client.ts  # POST /api/gps to APRS backend
└── config.ts       # Env var parsing
```
