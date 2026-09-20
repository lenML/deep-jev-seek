# @lenml/jevseek-server

Bun HTTP adapter for `@lenml/jevseek`.

## Endpoints

- `GET /`
- `GET /healthz`
- `GET /v1/models`
- `POST /v1/systemone`
- `OPTIONS *`

## Environment

- `JEVSEEK_PROVIDER`: `deepseek` or `llamacpp`; default `deepseek`.
- `DEEPSEEK_API_KEY`: fallback key in DeepSeek mode; required when no bearer token is present.
- `DEEPSEEK_MODEL`: target for `jev-latest` and `jev-preview` in DeepSeek mode; default `deepseek-flash`.
- `DEEPSEEK_BASE_URL`: DeepSeek API base URL; default `https://api.deepseek.com/beta`.
- `LLAMACPP_API_KEY`: optional bearer key for llama.cpp.
- `LLAMACPP_MODEL`: target for `jev-latest` and `jev-preview` in llama.cpp mode; default `llamacpp`.
- `LLAMACPP_BASE_URL`: llama.cpp base URL; default `http://127.0.0.1:8080/v1`.
- `HOST`: bind host; default `0.0.0.0`.
- `PORT`: bind port; default `8787`.
- `MAX_BODY_BYTES`: JSON request limit; default `1048576`.

`POST /v1/systemone` also accepts a string `promptTemplate` field. It supports `{{state}}`, `{{question}}`, `{{questionType}}`, and `{{codes}}`.

llama.cpp mode sends native `POST /completion` requests. `POST /v1/systemone` accepts `multimodal_data` only in that mode:

```json
{
  "state": "Describe the image.",
  "questions": {
    "safe": {
      "type": "noul",
      "instructions": "Is the image safe?"
    }
  },
  "multimodal_data": ["<base64-data>"]
}
```

Every entry needs a matching media marker in the prompt. DeepSeek mode rejects the field with `400 multimodal_not_supported`.

Key precedence: `Authorization: Bearer <key>`, then the provider-specific environment key.
