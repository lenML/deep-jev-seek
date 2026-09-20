# @lenml/jevseek-server

Bun HTTP adapter for `@lenml/jevseek`.

## Endpoints

- `GET /`
- `GET /healthz`
- `GET /v1/models`
- `POST /v1/systemone`
- `OPTIONS *`

## Environment

- `DEEPSEEK_API_KEY`: fallback key when the request has no bearer token.
- `DEEPSEEK_MODEL`: target for `jev-latest` and `jev-preview`; default `deepseek-flash`.
- `HOST`: bind host; default `0.0.0.0`.
- `PORT`: bind port; default `8787`.
- `MAX_BODY_BYTES`: JSON request limit; default `1048576`.

Key precedence: `Authorization: Bearer <key>`, then `DEEPSEEK_API_KEY`.
