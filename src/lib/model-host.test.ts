// @vitest-environment node
import { generateText, streamText } from "ai";
import { beforeEach, describe, expect, test, vi } from "vitest";
import { chatModel, SIGN_OFFS, SYSTEM_PROMPT, TRANSLATION_PROMPT } from "./model-host";

const fetchMock = vi.fn();

beforeEach(() => {
  fetchMock.mockReset();
  vi.stubGlobal("fetch", fetchMock);
  vi.stubEnv("MODEL_HOST_URL", "https://model-host.example/v1");
  vi.stubEnv("MODEL_HOST_API_KEY", "test-key");
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
  test("calls the model host's OpenAI-compatible API with the API key", async () => {
    const { url, headers, body } = await sentRequest();
    expect(url).toBe("https://model-host.example/v1/chat/completions");
    expect(headers.get("authorization")).toBe("Bearer test-key");
    expect(body.model).toBe("BSC-LT/salamandra-7b-instruct-2606");
  });

  test("uses MODEL_NAME when the model host serves the model under another name", async () => {
    vi.stubEnv("MODEL_NAME", "salamandra");
    expect((await sentRequest()).body.model).toBe("salamandra");
  });

  // The model host counts the tokens of a streamed reply only when asked to.
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
    const body = JSON.parse(fetchMock.mock.calls[0][1].body);
    expect(body.stream_options).toEqual({ include_usage: true });
    // A streamed reply is asked for with the same sampling values.
    expect(body).toMatchObject({ temperature: 1, top_p: 1 });
  });

  // Engines differ in their defaults, so two model hosts are asked for the
  // same thing only when the values are sent.
  test("sends the temperature and top-p with a request", async () => {
    const { body } = await sentRequest();
    expect(body).toMatchObject({ temperature: 1, top_p: 1 });
  });

  test.each(["MODEL_HOST_URL", "MODEL_HOST_API_KEY"])("throws when %s is missing", (name) => {
    vi.stubEnv(name, "");
    expect(() => chatModel()).toThrow("MODEL_HOST_URL and MODEL_HOST_API_KEY must be set");
  });
});

test("both prompts ask for Catalan", () => {
  expect(SYSTEM_PROMPT).toContain("Catalan");
  expect(TRANSLATION_PROMPT).toContain("català");
});

test("casts the model as a teacher of Catalan, framing each reply to help the user understand it", () => {
  expect(SYSTEM_PROMPT).toContain("teacher of Catalan");
  expect(SYSTEM_PROMPT).toContain("help the student learn the language");
  expect(SYSTEM_PROMPT).toContain("Frame each reply to help the student understand the Catalan in it");
});

// With a fifth, the vLLM worker that served the model before Cloud Run
// answered 200 with an empty stream, which the AI SDK reports as "Response
// stream ended without a finish reason".
test("asks for no more than four stop sequences", () => {
  expect(SIGN_OFFS.length).toBeLessThanOrEqual(4);
});
