# @lenml/jevseek-server

Minimal Bun HTTP façade for `@lenml/jevseek`.

## Routes

- `GET /`
- `GET /healthz`
- `GET /v1/models`
- `POST /v1/systemone`
- `OPTIONS *`

## Environment

- `DEEPSEEK_API_KEY`: fallback key when no request bearer token is supplied.
- `DEEPSEEK_MODEL`: target for `jev-latest` and `jev-preview`; default `deepseek-flash`.
- `HOST`: bind host; default `0.0.0.0`.
- `PORT`: bind port; default `3000`.
- `MAX_BODY_BYTES`: request JSON limit; default `1048576`.

Request key precedence: `Authorization: Bearer <key>`, then `DEEPSEEK_API_KEY`.
