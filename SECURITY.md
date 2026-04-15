# Security Policy

## Reporting Security Vulnerabilities

If you discover a security vulnerability in this project, please report it responsibly by emailing:

**Email:** beslagicadin@gmail.com

Please do **NOT** create a public GitHub issue for security vulnerabilities. You will receive a response within 72 hours acknowledging receipt.

## Supported Versions

| Version | Supported          |
| ------- | ------------------ |
| 1.0.x   | :white_check_mark: |
| < 1.0   | :x:                |

## License

This software is proprietary. All rights reserved by Adin Beslagic. Any use, modification, or distribution requires prior written permission from the author. See the [LICENSE](LICENSE) file for full terms.

To request permission, contact: beslagicadin@gmail.com

## Environment Variables & Secrets

**NEVER commit `.env` files to version control.**

Use the provided template to create your local configuration:

```bash
cp .env.example .env
```

### Sensitive Variables

| Variable | Risk | Notes |
|---|---|---|
| `GPS_API_KEY` | HIGH | Shared secret for authenticating with the backend `POST /api/gps` endpoint |
| `APRS_BACKEND_URL` | MEDIUM | Backend URL — should use HTTPS in production |

### Rules

- `GPS_API_KEY` must match the backend's `GPS_API_KEY` — use a strong random string (32+ characters)
- Backend URL should use HTTPS in production to protect the API key in transit

## Input Security

### DSD+ Stdout Parsing

- This service reads raw stdout from the DSD+ process
- Input is inherently untrusted — DSD+ decodes RF audio which can contain arbitrary data
- The parser validates DMR-ID format and required fields before forwarding to the backend
- Debouncing (`DEBOUNCE_SEC`) prevents duplicate events from flooding the backend

### HTTP Client

- Positions are sent to the backend via `POST /api/gps` with `X-Api-Key` header
- The backend validates the API key and required fields before accepting the position
- Positions are forwarded to APRS-IS by the backend — not stored directly

## Process Security

- This service reads from stdin (piped from DSD+) — no network listeners
- Minimal attack surface: one outbound HTTP dependency (the backend)
- `DEBUG=1` logs raw DSD+ lines — **disable in production** to avoid leaking RF data to logs

## Production Deployment Checklist

- [ ] Set strong `GPS_API_KEY` matching the backend configuration
- [ ] Use HTTPS for `APRS_BACKEND_URL`
- [ ] Set `DEBUG=0` (disable raw DSD+ line logging)
- [ ] Set appropriate `DEBOUNCE_SEC` to prevent duplicate position flooding
- [ ] Run as a dedicated system user with minimal privileges
- [ ] Restrict filesystem access — this service needs no disk writes
- [ ] Monitor the DSD+ process for crashes or unexpected output
- [ ] Keep all dependencies up to date (`npm audit`)

## Physical Security

This service runs alongside DSD+ and a radio receiver. Consider:

- Restrict physical access to the radio/SDR hardware
- RF input is untrusted by nature — the parser should never trust decoded content blindly
- Monitor for abnormal DMR traffic patterns (potential abuse or interference)

## Third-Party Services

| Service | Usage | Security Notes |
|---|---|---|
| **APRS Backend** | Position forwarding target | Authenticated via `GPS_API_KEY` |
| **DSD+** | DMR audio decoder | External process — input to this parser |

## Dependency Management

- This is a minimal dependency project (`dotenv` only) — keep it that way
- Run `npm audit` regularly
- Review `dotenv` updates for security patches
