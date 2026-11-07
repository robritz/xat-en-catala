// @vitest-environment node
import { generateText, streamText } from "ai";
import { beforeEach, describe, expect, test, vi } from "vitest";
import { chatModel, SIGN_OFFS, SYSTEM_PROMPT, TRANSLATION_PROMPT } from "./model-host";

const fetchMock = vi.fn();

beforeEach(() => {
  fetchMock.mockReset();
  vi.stubGlobal("fetch", fetchMock);
  vi.stubEnv("MODEL", "");
  vi.stubEnv("SALAMANDRA_HOST_URL", "https://model-host.example/v1");
  vi.stubEnv("SALAMANDRA_HOST_API_KEY", "test-key");
  vi.stubEnv("ALIA_HOST_URL", "");
  vi.stubEnv("ALIA_HOST_API_KEY", "");
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
  test("calls Salamandra's model host with its API key when no model is chosen", async () => {
    const { url, headers, body } = await sentRequest();
    expect(url).toBe("https://model-host.example/v1/chat/completions");
    expect(headers.get("authorization")).toBe("Bearer test-key");
    expect(body.model).toBe("BSC-LT/salamandra-7b-instruct-2606");
  });

  // BSC advises a temperature of 0 to 0.2 for ALIA.
  test("calls ALIA's model host with its API key, name and sampling when ALIA is chosen", async () => {
    vi.stubEnv("MODEL", "alia");
    vi.stubEnv("ALIA_HOST_URL", "https://alia.example/v1");
    vi.stubEnv("ALIA_HOST_API_KEY", "alia-key");
    const { url, headers, body } = await sentRequest();
    expect(url).toBe("https://alia.example/v1/chat/completions");
    expect(headers.get("authorization")).toBe("Bearer alia-key");
    expect(body).toMatchObject({ model: "BSC-LT/ALIA-40b-instruct-2601", temperature: 0.1, top_p: 1 });
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

  test("calls Salamandra's model host when Salamandra is chosen", async () => {
    vi.stubEnv("MODEL", "salamandra");
    expect((await sentRequest()).url).toBe("https://model-host.example/v1/chat/completions");
  });

  // A typo must not quietly send every learner to another model.
  test("throws naming an unknown model and the ones there are", () => {
    vi.stubEnv("MODEL", "salamandre");
    expect(() => chatModel()).toThrow('MODEL is "salamandre", but must be one of: salamandra, alia');
  });

  test.each(["ALIA_HOST_URL", "ALIA_HOST_API_KEY"])(
    "throws naming %s when ALIA is chosen and it is missing, even with Salamandra's set",
    (name) => {
      vi.stubEnv("MODEL", "alia");
      vi.stubEnv("ALIA_HOST_URL", "https://alia.example/v1");
      vi.stubEnv("ALIA_HOST_API_KEY", "alia-key");
      vi.stubEnv(name, "");
      expect(() => chatModel()).toThrow(`${name} must be set`);
    },
  );

  test.each(["SALAMANDRA_HOST_URL", "SALAMANDRA_HOST_API_KEY"])("throws naming %s when it is missing", (name) => {
    vi.stubEnv(name, "");
    expect(() => chatModel()).toThrow(`${name} must be set`);
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
