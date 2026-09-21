import { describe, expect, it, vi } from "vitest";

import { createApp, type AppOptions } from "../src/app";

function jsonBody(value: unknown): string {
  return JSON.stringify(value);
}

describe("createApp", () => {
  it("passes multimodal_data and llama.cpp settings to the client", async () => {
    const systemOne = vi.fn(async (input: Record<string, unknown>) => ({
      model: "local-model",
      answers: { q: { type: "noul", noul: 1 } },
      usage: { input_tokens: 10, output_tokens: 1 },
      received: input,
    }));
    const clientFactory = vi.fn(() => ({ systemOne })) as unknown as NonNullable<
      AppOptions["clientFactory"]
    >;
    const app = createApp({
      env: {
        JEVSEEK_PROVIDER: "llamacpp",
        LLAMACPP_BASE_URL: "http://127.0.0.1:8080/v1",
      },
      clientFactory,
    });

    const response = await app.fetch(
      new Request("http://localhost/v1/systemone", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: jsonBody({
          state: "state",
          questions: { q: { type: "noul", instructions: "Is it true?" } },
          multimodal_data: ["base64-image"],
          missingLogprobPolicy: "error",
        }),
      }),
    );

    expect(response.status).toBe(200);
    expect(clientFactory).toHaveBeenCalledWith({
      apiKey: undefined,
      model: "llamacpp",
      provider: "llamacpp",
      baseUrl: "http://127.0.0.1:8080/v1",
    });
    expect(systemOne).toHaveBeenCalledWith(
      expect.objectContaining({
        model: "llamacpp",
        multimodal_data: ["base64-image"],
        missingLogprobPolicy: "error",
      }),
    );
  });

  it("rejects multimodal_data in DeepSeek mode before creating a client", async () => {
    const clientFactory = vi.fn() as unknown as NonNullable<AppOptions["clientFactory"]>;
    const app = createApp({
      env: { JEVSEEK_PROVIDER: "deepseek", DEEPSEEK_API_KEY: "sk-test" },
      clientFactory,
    });

    const response = await app.fetch(
      new Request("http://localhost/v1/systemone", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: jsonBody({
          state: "state",
          questions: { q: { type: "noul", instructions: "Is it true?" } },
          multimodal_data: ["base64-image"],
        }),
      }),
    );

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toMatchObject({
      error: { code: "multimodal_not_supported" },
    });
    expect(clientFactory).not.toHaveBeenCalled();
  });

  it("requires an API key in DeepSeek mode", async () => {
    const app = createApp({ env: { JEVSEEK_PROVIDER: "deepseek" } });
    const response = await app.fetch(
      new Request("http://localhost/v1/systemone", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: jsonBody({ state: "state", questions: {} }),
      }),
    );

    expect(response.status).toBe(401);
    await expect(response.json()).resolves.toMatchObject({
      error: { code: "missing_api_key" },
    });
  });
});
