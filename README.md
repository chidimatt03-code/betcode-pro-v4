# BetCode Pro V4

A self-hosted betting booking-code conversion platform built with Node.js, Express and SQLite.

## Current system

- User registration and login
- Server-side password hashing
- Free-plan credit tracking
- Conversion history
- `bc_live_...` API key authentication
- Internal conversion pipeline
- Bookmaker adapters
- Event normalization and matching
- Market and selection mapping
- Conversion validation
- PWA support
- No third-party conversion provider dependency

## Conversion engine

The internal engine processes a conversion through:

1. Source booking-code decoding
2. Bet-slip normalization
3. Event matching
4. Market mapping
5. Selection mapping
6. Conversion validation
7. Destination booking-code generation

## Bookmaker connectors

The current architecture supports adapters for:

- SportyBet
- BetKing
- Bet9ja

The bookmaker connectors must use authorized APIs or other officially permitted integration methods.

## API keys

Customers can authenticate API requests with:

`X-API-Key: bc_live_...`

API keys are stored as SHA-256 hashes and the full key is shown only when generated.

## Current status

The internal pipeline is working and tested.

SportyBet → BetKing is currently registered as a development route, but the live bookmaker decoder and destination booking-code builder are not connected yet.

## Production work

1. Connect authorized bookmaker APIs/connectors.
2. Implement secure production authentication and session management.
3. Replace demo password hashing with Argon2id or bcrypt.
4. Add rate limiting and abuse protection.
5. Add payment/subscription handling.
6. Add monitoring and audit logging.
7. Improve event matching and market coverage.
8. Add comprehensive conversion tests.
9. Complete Nigerian and target-market legal/compliance review.
10. Do not scrape, reverse-engineer booking codes, or automate bookmaker accounts without authorization.
