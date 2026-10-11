// @vitest-environment node
import { generateText, streamText } from "ai";
import { beforeEach, describe, expect, test, vi } from "vitest";
import { chatModel, SIGN_OFFS, SYSTEM_PROMPT, TRANSLATION_PROMPT } from "./runpod";

const fetchMock = vi.fn();

beforeEach(() => {
  fetchMock.mockReset();
  vi.stubGlobal("fetch", fetchMock);
  vi.stubEnv("RUNPOD_API_KEY", "test-key");
  vi.stubEnv("RUNPOD_ENDPOINT_ID", "endpoint123");
});

async function sentRequest() {
  fetchMock.mockResolvedValueOnce(
    Response.json({ choices: [{ message: { role: "assistant", content: "Bon dia" } }] }),
  );
  const { text } = await generateText({ model: chatModel(), prompt: "Hello" });
  expect(text).toBe("Bon dia");
  const [url, init] = fetchMock.mock.calls[0];
  return { url, headers: new Headers(init.headers), body: JSON.parse(init.body) };
}

describe("chatModel", () => {
  test("calls the endpoint's OpenAI-compatible API with the API key", async () => {
    const { url, headers, body } = await sentRequest();
    expect(url).toBe("https://api.runpod.ai/v2/endpoint123/openai/v1/chat/completions");
    expect(headers.get("authorization")).toBe("Bearer test-key");
    expect(body.model).toBe("BSC-LT/salamandra-7b-instruct-2606");
  });

  test("uses RUNPOD_MODEL when the endpoint serves the model under another name", async () => {
    vi.stubEnv("RUNPOD_MODEL", "salamandra");
    expect((await sentRequest()).body.model).toBe("salamandra");
  });

  // The endpoint counts the tokens of a streamed reply only when asked to.
  test("asks for the tokens of a streamed reply to be counted", async () => {
    const events = [
      { choices: [{ delta: { role: "assistant", content: "Bon dia" } }] },
      { choices: [{ delta: {}, finish_reason: "stop" }] },
      { choices: [], usage: { prompt_tokens: 12, completion_tokens: 5, total_tokens: 17 } },
    ];
    fetchMock.mockResolvedValueOnce(
      new Response(events.map((event) => `data: ${JSON.stringify(event)}\n\n`).join("") + "data: [DONE]\n\n", {
        headers: { "Content-Type": "text/event-stream" },
      }),
    );
    const { inputTokens, outputTokens } = await streamText({ model: chatModel(), prompt: "Hello" })
      .totalUsage;
    expect({ inputTokens, outputTokens }).toEqual({ inputTokens: 12, outputTokens: 5 });
    expect(JSON.parse(fetchMock.mock.calls[0][1].body).stream_options).toEqual({ include_usage: true });
  });

  test.each(["RUNPOD_API_KEY", "RUNPOD_ENDPOINT_ID"])("throws when %s is missing", (name) => {
    vi.stubEnv(name, "");
    expect(() => chatModel()).toThrow("RUNPOD_API_KEY and RUNPOD_ENDPOINT_ID must be set");
  });
});

test("both prompts ask for Catalan", () => {
  expect(SYSTEM_PROMPT).toContain("català");
  expect(TRANSLATION_PROMPT).toContain("català");
});

// With a fifth, the endpoint answers 200 with an empty stream, which the AI
// SDK reports as "Response stream ended without a finish reason".
test("asks for no more stop sequences than the endpoint accepts", () => {
  expect(SIGN_OFFS.length).toBeLessThanOrEqual(4);
});
