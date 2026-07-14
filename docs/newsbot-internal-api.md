# NewsBot internal publisher API

This is a signed PC-to-VPS API for the local PADDOCK NewsBot. It is disabled by
default and must be enabled only after the server and the local NewsBot share a
new random secret.

## Runtime configuration

Set these values in the production server's untracked `.env` file:

- `NEWSBOT_API_ENABLED=1`
- `NEWSBOT_HMAC_KEY_ID=local-newsbot` (or another agreed identifier)
- `NEWSBOT_HMAC_SECRET=<at least 32 random characters>`

Do not place the secret in Git, browser variables, or a build argument.

## Signature

Every request uses JSON bytes exactly as sent. Sign this UTF-8 canonical string:

```text
METHOD
/api/internal/newsbot/v1/PATH
UNIX_TIMESTAMP_SECONDS
NONCE
SHA256_OF_EXACT_BODY
```

The HMAC algorithm is SHA-256. Send these headers:

- `X-NewsBot-Key-Id`
- `X-NewsBot-Timestamp`
- `X-NewsBot-Nonce`
- `X-NewsBot-Signature`
- `Idempotency-Key` for mutation routes

Timestamps are accepted for five minutes. A nonce is accepted once only. Retried
mutations must use a new nonce and keep the same idempotency key.

## Routes

- `GET /api/internal/newsbot/v1/health`
- `POST /api/internal/newsbot/v1/media`
- `POST /api/internal/newsbot/v1/posts`
- `PATCH /api/internal/newsbot/v1/posts/:externalId`

Media accepts only signed JSON with a base64-encoded original PNG or WebP card.
It never fetches a URL. Cards are size-limited, type-sniffed, content-hashed,
and stored in the existing uploads volume.

Posts require a card URL returned by the media route, at least one HTTPS source,
an `externalId`, and a monotonic `contentVersion`. The create route creates
only version 1; later editorial corrections use PATCH with a higher version.
Posts are mapped only to the fixed PADDOCK NewsBot hubs and retain their source
links for public attribution.

The API is intentionally protected by TLS plus HMAC rather than IP allowlisting,
because NewsBot runs on a local PC whose address is not guaranteed to be fixed.
