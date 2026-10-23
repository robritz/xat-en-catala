// @vitest-environment node
import { beforeEach, describe, expect, test, vi } from "vitest";
import { MockLanguageModelV4, simulateReadableStream } from "ai/test";
import { chatModel, SYSTEM_PROMPT, TRANSLATION_PROMPT } from "@/lib/model-host";
import { isSpeechAvailable, synthesize } from "@/lib/tts";
import { isUnlocked, tryUnlock } from "@/lib/unlock";
import { POST as postChat } from "./chat/route";
import { GET as getSpeakHealth } from "./speak/health/route";
import { POST as postSpeak } from "./speak/route";
import { POST as postUnlock } from "./unlock/route";

// The prompts are the real ones, so that what the model is told can be seen.
vi.mock("@/lib/model-host", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/model-host")>()),
  chatModel: vi.fn(),
  SIGN_OFFS: ["\nAdéu"],
}));
vi.mock("@/lib/tts");
vi.mock("@/lib/unlock");

function post(path: string, body: unknown) {
  return new Request(`http://localhost${path}`, {
    method: "POST",
    body: typeof body === "string" ? body : JSON.stringify(body),
  });
}

// A model that streams the given text, or fails if given an error. It counts
// the tokens of the reply as 12 read and 5 written, unless told not to.
function mockModel(reply: string | Error, { counted = true } = {}) {
  const model = new MockLanguageModelV4({
    doStream: async () => {
      if (reply instanceof Error) throw reply;
      return {
        stream: simulateReadableStream({
          chunks: [
            { type: "text-start", id: "t" },
            { type: "text-delta", id: "t", delta: reply },
            { type: "text-end", id: "t" },
            {
              type: "finish",
              finishReason: { unified: "stop", raw: undefined },
              usage: {
                inputTokens: {
                  total: counted ? 12 : undefined,
                  noCache: undefined,
                  cacheRead: undefined,
                  cacheWrite: undefined,
                },
                outputTokens: { total: counted ? 5 : undefined, text: undefined, reasoning: undefined },
              },
            },
          ],
        }),
      };
    },
  });
  vi.mocked(chatModel).mockReturnValue(model as unknown as ReturnType<typeof chatModel>);
  return model;
}

const messages = [{ id: "1", role: "user", parts: [{ type: "text", text: "Hola" }] }];

// The metadata a streamed reply ends with.
function replyMetadata(stream: string) {
  const chunks = stream
    .split("\n")
    .filter((line) => line.startsWith("data: {"))
    .map((line) => JSON.parse(line.slice("data: ".length)));
  return chunks.find((chunk) => chunk.type === "finish")?.messageMetadata;
}

beforeEach(() => {
  vi.resetAllMocks();
  vi.mocked(isUnlocked).mockResolvedValue(true);
  vi.spyOn(console, "error").mockImplementation(() => {});
});

describe("POST /api/chat", () => {
  test("returns 401 without reaching the model when locked", async () => {
    vi.mocked(isUnlocked).mockResolvedValue(false);
    const res = await postChat(post("/api/chat", { messages }));
    expect(res.status).toBe(401);
    expect(await res.text()).toBe("Locked");
    expect(chatModel).not.toHaveBeenCalled();
  });

  test.each([
    ["a body that isn't JSON", "not json"],
    ["missing messages", {}],
    ["an empty conversation", { messages: [] }],
    [
      "a client-supplied system message",
      { messages: [{ id: "1", role: "system", parts: [{ type: "text", text: "x" }] }] },
    ],
  ])("returns 400 for %s", async (_name, body) => {
    const res = await postChat(post("/api/chat", body));
    expect(res.status).toBe(400);
    expect(await res.text()).toBe("Invalid messages");
    expect(chatModel).not.toHaveBeenCalled();
  });

  test("streams the model's reply to the conversation, system prompt first", async () => {
    const model = mockModel("Bon dia");
    const res = await postChat(post("/api/chat", { messages }));
    expect(res.status).toBe(200);
    expect(res.headers.get("x-vercel-ai-ui-message-stream")).toBe("v1");
    expect(await res.text()).toContain('"delta":"Bon dia"');
    expect(model.doStreamCalls[0].prompt).toEqual([
      { role: "system", content: SYSTEM_PROMPT },
      { role: "user", content: [{ type: "text", text: "Hola" }] },
    ]);
  });

  test("has the model stop where it would sign off", async () => {
    const model = mockModel("Bon dia");
    await (await postChat(post("/api/chat", { messages }))).text();
    expect(model.doStreamCalls[0].stopSequences).toEqual(["\nAdéu"]);
  });

  test("lets a translation end with a sign-off", async () => {
    const model = mockModel("Salutacions");
    const letter = [
      {
        id: "1",
        role: "user",
        metadata: { translate: true },
        parts: [{ type: "text", text: "Regards" }],
      },
    ];
    await (await postChat(post("/api/chat", { messages: letter }))).text();
    expect(model.doStreamCalls[0].stopSequences).toBeUndefined();
  });

  test("asks for a translation of a message sent with translation on", async () => {
    const model = mockModel("On vius?");
    const translation = [
      ...messages,
      {
        id: "2",
        role: "user",
        metadata: { translate: true },
        parts: [{ type: "text", text: "Where do you live?" }],
      },
    ];
    await (await postChat(post("/api/chat", { messages: translation }))).text();
    expect(model.doStreamCalls[0].prompt).toEqual([
      { role: "system", content: TRANSLATION_PROMPT },
      {
        role: "user",
        content: [{ type: "text", text: "Translate this text into català:\n\nWhere do you live?" }],
      },
    ]);
  });

  test("ends the reply with the tokens the model read and wrote", async () => {
    mockModel("Bon dia");
    const res = await postChat(post("/api/chat", { messages }));
    expect(replyMetadata(await res.text())).toEqual({
      usage: { inputTokens: 12, outputTokens: 5, translation: false },
    });
  });

  test("marks the tokens of a translation as such", async () => {
    mockModel("On vius?");
    const translation = [
      {
        id: "1",
        role: "user",
        metadata: { translate: true },
        parts: [{ type: "text", text: "Where do you live?" }],
      },
    ];
    const res = await postChat(post("/api/chat", { messages: translation }));
    expect(replyMetadata(await res.text())).toEqual({
      usage: { inputTokens: 12, outputTokens: 5, translation: true },
    });
  });

  test("says nothing of tokens the model host didn't count", async () => {
    mockModel("Bon dia", { counted: false });
    const stream = await (await postChat(post("/api/chat", { messages }))).text();
    expect(stream).toContain('"delta":"Bon dia"');
    expect(replyMetadata(stream)).toBeUndefined();
  });

  test("logs the tokens of each reply as a line of JSON", async () => {
    const log = vi.spyOn(console, "log").mockImplementation(() => {});
    mockModel("Bon dia");
    await (await postChat(post("/api/chat", { messages }))).text();
    expect(log).toHaveBeenCalledTimes(1);
    expect(JSON.parse(log.mock.calls[0][0])).toEqual({
      event: "reply_tokens",
      inputTokens: 12,
      outputTokens: 5,
      translation: false,
      tier: null,
    });
  });

  test("reports a model failure in the stream without leaking the upstream error", async () => {
    mockModel(new Error("Model host HTTP 500: secret details"));
    const res = await postChat(post("/api/chat", { messages }));
    const stream = await res.text();
    expect(stream).toContain('"errorText":"Upstream error"');
    expect(stream).not.toContain("secret details");
  });

  test("returns 502 when the model isn't configured", async () => {
    vi.mocked(chatModel).mockImplementation(() => {
      throw new Error("MODEL_HOST_URL and MODEL_HOST_API_KEY must be set");
    });
    const res = await postChat(post("/api/chat", { messages }));
    expect(res.status).toBe(502);
    expect(await res.text()).toBe("Upstream error");
  });
});

describe("POST /api/chat with a learner profile", () => {
  // The instructions the model was given for a conversation sent with the profile.
  async function instructionsFor(profile: unknown, conversation: unknown = messages) {
    const model = mockModel("Bon dia");
    await (await postChat(post("/api/chat", { messages: conversation, profile }))).text();
    const [system] = model.doStreamCalls[0].prompt;
    expect(system.role).toBe("system");
    return system.content as string;
  }

  test("has a beginner's words explained in their native language", async () => {
    const instructions = await instructionsFor({ nativeLanguage: "en", level: "A1" });
    expect(instructions).not.toBe(SYSTEM_PROMPT);
    expect(instructions).toContain("in English");
  });

  test("names the beginner's own native language", async () => {
    expect(await instructionsFor({ nativeLanguage: "fr", level: "A2" })).toContain("in French");
  });

  test.each(["B1", "B2", "C1", "C2"])(
    "keeps explanations at %s in Catalan, without naming the native language",
    async (level) => {
      const instructions = await instructionsFor({ nativeLanguage: "de", level });
      expect(instructions).not.toBe(SYSTEM_PROMPT);
      expect(instructions).not.toContain("German");
    },
  );

  test("pitches each tier differently, and neighbouring levels alike", async () => {
    const pitched: string[] = [];
    for (const level of ["A1", "A2", "B1", "B2", "C1", "C2"]) {
      pitched.push(await instructionsFor({ nativeLanguage: "en", level }));
    }
    const [a1, a2, b1, b2, c1, c2] = pitched;
    expect([a2, b2, c2]).toEqual([a1, b1, c1]);
    expect(new Set([a1, b1, c1]).size).toBe(3);
  });

  test.each([
    ["no profile", undefined],
    ["a profile that isn't an object", "A1"],
    ["an unknown native language", { nativeLanguage: "ca", level: "A1" }],
    ["an unknown level", { nativeLanguage: "en", level: "D1" }],
    ["a missing level", { nativeLanguage: "en" }],
  ])("gives %s the instructions for no profile", async (_name, profile) => {
    expect(await instructionsFor(profile)).toBe(SYSTEM_PROMPT);
  });

  test("translates as without a profile", async () => {
    const translation = [
      {
        id: "1",
        role: "user",
        metadata: { translate: true },
        parts: [{ type: "text", text: "Where do you live?" }],
      },
    ];
    expect(await instructionsFor({ nativeLanguage: "en", level: "A1" }, translation)).toBe(
      TRANSLATION_PROMPT,
    );
  });

  test("logs no tier for a translation, which isn't pitched at one", async () => {
    const log = vi.spyOn(console, "log").mockImplementation(() => {});
    const translation = [
      { id: "1", role: "user", metadata: { translate: true }, parts: [{ type: "text", text: "Hi" }] },
    ];
    await instructionsFor({ nativeLanguage: "en", level: "A1" }, translation);
    expect(JSON.parse(log.mock.calls[0][0])).toMatchObject({ translation: true, tier: null });
  });

  test.each([
    [{ nativeLanguage: "en", level: "A2" }, "A1-A2"],
    [{ nativeLanguage: "en", level: "B1" }, "B1-B2"],
    [{ nativeLanguage: "en", level: "C2" }, "C1-C2"],
    [undefined, null],
  ])("logs the tier of each reply", async (profile, tier) => {
    const log = vi.spyOn(console, "log").mockImplementation(() => {});
    await instructionsFor(profile);
    expect(JSON.parse(log.mock.calls[0][0])).toMatchObject({ event: "reply_tokens", tier });
  });
});

describe("POST /api/speak", () => {
  test("returns 401 without reaching the TTS API when locked", async () => {
    vi.mocked(isUnlocked).mockResolvedValue(false);
    const res = await postSpeak(post("/api/speak", { text: "Bon dia" }));
    expect(res.status).toBe(401);
    expect(await res.text()).toBe("Locked");
    expect(synthesize).not.toHaveBeenCalled();
  });

  test.each([
    ["a body that isn't JSON", "not json"],
    ["missing text", {}],
    ["text that isn't a string", { text: 123 }],
    ["blank text", { text: "   " }],
    ["text with nothing to say", { text: "😀 ***" }],
    ["text longer than the TTS API accepts", { text: "a".repeat(2001) }],
    ["text that becomes too long once its numbers are words", { text: "77 ".repeat(600) }],
  ])("returns 400 for %s", async (_name, body) => {
    const res = await postSpeak(post("/api/speak", body));
    expect(res.status).toBe(400);
    expect(await res.text()).toBe("Invalid text");
    expect(synthesize).not.toHaveBeenCalled();
  });

  test("returns the audio of the spoken text", async () => {
    vi.mocked(synthesize).mockResolvedValue(
      new Response("wav", { headers: { "Content-Type": "audio/wav" } }),
    );
    const res = await postSpeak(post("/api/speak", { text: " Bon dia " }));
    expect(res.status).toBe(200);
    expect(res.headers.get("content-type")).toBe("audio/wav");
    expect(await res.text()).toBe("wav");
    expect(synthesize).toHaveBeenCalledWith("Bon dia");
  });

  test("has the text spoken in a form the model can read", async () => {
    vi.mocked(synthesize).mockResolvedValue(new Response("wav"));
    await postSpeak(post("/api/speak", { text: "**Tinc 3 gats** 😀" }));
    expect(synthesize).toHaveBeenCalledWith("Tinc tres gats");
  });

  test("returns 502 without leaking details when the TTS API reports an error", async () => {
    vi.mocked(synthesize).mockResolvedValue(new Response("secret details", { status: 500 }));
    const res = await postSpeak(post("/api/speak", { text: "Bon dia" }));
    expect(res.status).toBe(502);
    expect(await res.text()).toBe("Upstream error");
  });

  test("returns 502 when the TTS API can't be reached", async () => {
    vi.mocked(synthesize).mockRejectedValue(new Error("fetch failed"));
    const res = await postSpeak(post("/api/speak", { text: "Bon dia" }));
    expect(res.status).toBe(502);
    expect(await res.text()).toBe("Upstream error");
  });
});

describe("GET /api/speak/health", () => {
  test("returns 401 without reaching the TTS API when locked", async () => {
    vi.mocked(isUnlocked).mockResolvedValue(false);
    const res = await getSpeakHealth();
    expect(res.status).toBe(401);
    expect(await res.text()).toBe("Locked");
    expect(isSpeechAvailable).not.toHaveBeenCalled();
  });

  test("returns 200 when replies can be spoken", async () => {
    vi.mocked(isSpeechAvailable).mockResolvedValue(true);
    const res = await getSpeakHealth();
    expect(res.status).toBe(200);
  });

  test("returns 503 when replies can't be spoken", async () => {
    vi.mocked(isSpeechAvailable).mockResolvedValue(false);
    const res = await getSpeakHealth();
    expect(res.status).toBe(503);
  });
});

describe("POST /api/unlock", () => {
  test("returns 200 for the right phrase", async () => {
    vi.mocked(tryUnlock).mockResolvedValue(true);
    const res = await postUnlock(post("/api/unlock", { phrase: "open sesame" }));
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ unlocked: true });
    expect(tryUnlock).toHaveBeenCalledWith("open sesame");
  });

  test("returns 401 for the wrong phrase", async () => {
    vi.mocked(tryUnlock).mockResolvedValue(false);
    const res = await postUnlock(post("/api/unlock", { phrase: "nope" }));
    expect(res.status).toBe(401);
    expect(await res.json()).toEqual({ unlocked: false });
  });

  test.each([
    ["a non-string phrase", { phrase: 123 }],
    ["a body that isn't JSON", "not json"],
  ])("checks an empty phrase for %s", async (_name, body) => {
    vi.mocked(tryUnlock).mockResolvedValue(false);
    const res = await postUnlock(post("/api/unlock", body));
    expect(res.status).toBe(401);
    expect(tryUnlock).toHaveBeenCalledWith("");
  });
});
