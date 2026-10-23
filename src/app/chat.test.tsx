import { act, cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { createUIMessageStream, createUIMessageStreamResponse } from "ai";
import axe from "axe-core";
import { beforeEach, describe, expect, test, vi } from "vitest";
import { type ReplyUsage, resetTokenUsage, useTokenUsage } from "@/lib/token-usage";
import Chat from "./chat";

const GREETING = "say hello and include a random fact about catalonia.";
const START_BUTTON = "Iniciar la sessió";
const CUT_SHORT = "La resposta s'ha tallat perquè la conversa és massa llarga. Comença'n una de nova.";
const WAKE_MESSAGE = "La IA s'està despertant. Un moment, si us plau.";
const LISTEN_BUTTON = "Escolta";
const MUTE_BUTTON = "Silencia";
const TRANSLATE_TOGGLE = "Tradueix";
const SAVE_TOGGLE = "Desa";
const NEW_BUTTON = "Nova conversa";
const SAVED_BUTTON = "Desats";
const BACK_BUTTON = "Torna al xat";
const DELETE_BUTTON = "Suprimeix";
const NO_CONNECTION = "No s'ha pogut connectar. Comprova la connexió i torna-ho a provar.";
const NO_REPLY = "La IA no ha pogut respondre. Torna-ho a provar.";
const RETRY_BUTTON = "Torna-ho a provar";
const UNDO_BUTTON = "Desfés";
const DELETED = "S'ha suprimit.";
const RESTORE_FAILURE = "No s'ha pogut recuperar.";
const OPTIONS_BUTTON = "Opcions de la resposta";
const SAVE_FAILURE = "No s'ha pogut desar.";
// Each named in Catalan and in English.
const NATIVE_LANGUAGE_QUESTION = "Quina llengua llegeixes millor? Which language do you read best?";
const LEVEL_QUESTION = "Quin és el teu nivell de català? What is your level of Catalan?";
const FINISH_BUTTON = "Comença Start";
const NOTHING_SAVED =
  "Encara no has desat res. Toca una resposta i després el marcador per desar-la.";

// What the fake API does with the next chat request: stream a reply, fail,
// or (for a pending promise) keep the request open like a cold start.
let answer: Response | Promise<Response>;
// What the fake API answers when asked to speak a reply.
let speech: Response | Promise<Response>;
// What the fake API answers when asked whether replies can be spoken.
let health: Response | Promise<Response>;
const fetchMock = vi.fn<(url: string, init?: RequestInit) => Promise<Response>>(async (url) => {
  if (url === "/api/unlock") return Response.json({ unlocked: true });
  if (url === "/api/speak/health") return health;
  if (url === "/api/speak") return speech;
  return answer;
});

// The sources of the speech that has been played. jsdom can't play audio.
let played: string[];
class FakeAudio {
  // The player the chat speaks through, once it has made one.
  static current: FakeAudio;
  src = "";
  paused = true;
  onended: (() => void) | null = null;
  constructor() {
    FakeAudio.current = this;
  }
  async play() {
    this.paused = false;
    // Leaves out the silent clip played to unlock audio on iOS.
    if (!this.src.startsWith("data:")) played.push(this.src);
  }
  pause() {
    this.paused = true;
  }
}

// A reply, and the tokens the model counted for it, if it counted any.
function reply(text: string, usage?: ReplyUsage) {
  return createUIMessageStreamResponse({
    stream: createUIMessageStream({
      execute({ writer }) {
        writer.write({ type: "start" });
        writer.write({ type: "text-start", id: "t" });
        writer.write({ type: "text-delta", id: "t", delta: text });
        writer.write({ type: "text-end", id: "t" });
        writer.write({ type: "finish", messageMetadata: usage && { usage } });
      },
    }),
  });
}

// A reply the model had to stop writing, for want of room in its context window.
function cutShort(text: string) {
  return createUIMessageStreamResponse({
    stream: createUIMessageStream({
      execute({ writer }) {
        writer.write({ type: "start" });
        writer.write({ type: "text-start", id: "t" });
        writer.write({ type: "text-delta", id: "t", delta: text });
        writer.write({ type: "text-end", id: "t" });
        writer.write({ type: "finish", finishReason: "length" });
      },
    }),
  });
}

function failure(message: string) {
  return new Response(message, { status: 502 });
}

// A request that stays open until `resolve` is called.
function coldStart() {
  let resolve!: (res: Response) => void;
  answer = new Promise((r) => (resolve = r));
  return async (res: Response) => {
    await act(async () => resolve(res));
    await settle();
  };
}

// Lets a streamed reply be read to the end.
async function settle() {
  await act(async () => {
    await new Promise((r) => setTimeout(r, 0));
  });
}

function input() {
  return screen.getByRole<HTMLInputElement>("textbox");
}

async function send(text: string) {
  fireEvent.change(input(), { target: { value: text } });
  await act(async () => {
    fireEvent.submit(input().closest("form")!);
  });
  await settle();
}

async function clickStart() {
  await act(async () => {
    fireEvent.click(screen.getByRole("button", { name: START_BUTTON }));
  });
  await settle();
}

// Renders an unlocked chat whose session has been started and greeted with "Hola!".
async function renderStarted() {
  answer = reply("Hola!");
  render(<Chat initiallyUnlocked />);
  await clickStart();
  answer = reply("Bon dia!");
}

// Taps a message or reply as a finger would: the press comes before the click.
function tap(element: Element | string) {
  const target = typeof element === "string" ? screen.getByText(element) : element;
  fireEvent.pointerDown(target);
  fireEvent.click(target);
}

async function clickListen() {
  await act(async () => {
    fireEvent.click(screen.getByRole("button", { name: LISTEN_BUTTON }));
  });
  await settle();
}

// The mute button under the reply being spoken, if there is one.
function replyMute() {
  return within(screen.getByRole("main")).queryByRole("button", { name: MUTE_BUTTON });
}

// Whether the mute button in the conversation sits above the given reply.
function replyMuteIsAbove(text: string) {
  const position = replyMute()!.compareDocumentPosition(screen.getByText(text));
  return (position & Node.DOCUMENT_POSITION_FOLLOWING) !== 0;
}

// The mute button in the header, if there is one.
function headerMute() {
  return within(screen.getByRole("banner")).queryByRole("button", { name: MUTE_BUTTON });
}

// The bookmark under the reply that was tapped.
function saveToggle() {
  return screen.getByRole<HTMLButtonElement>("button", { name: SAVE_TOGGLE });
}

// Presses the bookmark as a finger would: the press comes before the click.
function pressSaveToggle() {
  fireEvent.pointerDown(saveToggle());
  fireEvent.click(saveToggle());
}

// Taps a reply and presses the bookmark under it.
function toggleSaved(replyText: string) {
  tap(replyText);
  pressSaveToggle();
}

function openSaved() {
  fireEvent.click(screen.getByRole("button", { name: SAVED_BUTTON }));
}

function backToChat() {
  fireEvent.click(screen.getByRole("button", { name: BACK_BUTTON }));
}

// The row of a saved exchange: the button that carries its message.
function savedRow(message: string) {
  return screen.getByRole("button", { name: message });
}

// The messages of the saved exchanges, in the order the list shows them.
// A row is the button that opens; the ones under its reply don't.
function savedMessages() {
  const rows = screen.getByRole("list").querySelectorAll("button[aria-expanded]");
  return Array.from(rows, (row) => row.textContent);
}

// A button under the reply of the saved exchange with the given message.
function savedRowButton(message: string, name: string) {
  const item = savedRow(message).closest("li")!;
  return within(item).getByRole<HTMLButtonElement>("button", { name });
}

// Saves an exchange for each message, so that the list shows them in this order.
async function renderSaved(...messages: string[]) {
  await renderStarted();
  for (const message of messages.toReversed()) {
    answer = reply(`Resposta a ${message}`);
    await send(message);
    toggleSaved(`Resposta a ${message}`);
  }
  openSaved();
}

// Makes the browser refuse to store anything, as it does when storage is full
// or blocked. Returns a function that lets it store again.
function refuseWrites() {
  const refusal = vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
    throw new DOMException("The quota has been exceeded.", "QuotaExceededError");
  });
  return () => refusal.mockRestore();
}

// Where the saved exchanges are stored, and the list as this version stores it.
const PROFILE_KEY = "learner-profile";
function storedProfile(nativeLanguage: string, level: string) {
  return JSON.stringify({ version: 1, nativeLanguage, level });
}

// The learner profile each request to the model was sent with.
function sentProfiles() {
  return fetchMock.mock.calls
    .filter(([url]) => url === "/api/chat")
    .map(([, init]) => JSON.parse(init!.body as string).profile);
}

// Answers onboarding's two questions and finishes it.
async function onboard(nativeLanguage: string, level: string) {
  fireEvent.click(screen.getByRole("button", { name: nativeLanguage }));
  fireEvent.click(screen.getByRole("radio", { name: level }));
  await act(async () => {
    fireEvent.click(screen.getByRole("button", { name: FINISH_BUTTON }));
  });
  await settle();
}

const STORAGE_KEY = "saved-exchanges";
type StoredExchange = { message: string; reply: string };
function stored(exchanges: StoredExchange[]) {
  return JSON.stringify({ version: 1, exchanges });
}

// What another tab does to the saved exchanges: it changes the stored list
// directly. This tab doesn't know until the browser tells it.
function changeInAnotherTab(change: (exchanges: StoredExchange[]) => StoredExchange[]) {
  const { exchanges } = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? stored([]));
  localStorage.setItem(STORAGE_KEY, stored(change(exchanges)));
}

// The browser telling this tab that another has changed what is stored.
function hearOfAnotherTab() {
  act(() => {
    window.dispatchEvent(new StorageEvent("storage"));
  });
}

// Makes the browser refuse any use of storage, as it does when a site's
// storage is blocked.
function blockStorage() {
  const refuse = () => {
    throw new DOMException("The operation is insecure.", "SecurityError");
  };
  vi.spyOn(Storage.prototype, "getItem").mockImplementation(refuse);
  vi.spyOn(Storage.prototype, "setItem").mockImplementation(refuse);
}

// The text of each conversation sent to the model.
function sentConversations() {
  return fetchMock.mock.calls
    .filter(([url]) => url === "/api/chat")
    .map(([, init]) =>
      JSON.parse(init!.body as string).messages.map(
        (m: { role: string; parts: { type: string; text?: string }[] }) => ({
          role: m.role,
          content: m.parts.map((p) => p.text ?? "").join(""),
        }),
      ),
    );
}

// Whether each message of the last conversation sent asked to be translated.
function sentTranslateFlags() {
  const [, init] = fetchMock.mock.calls.findLast(([url]) => url === "/api/chat")!;
  return JSON.parse(init!.body as string).messages.map(
    (m: { metadata?: { translate?: boolean } }) => m.metadata?.translate === true,
  );
}

// The button beside a reply that opens and closes the offer under it.
function optionsButton(replyText: string) {
  const row = screen.getByText(replyText).closest("[data-reply]") as HTMLElement;
  return within(row).getByRole<HTMLButtonElement>("button", { name: OPTIONS_BUTTON });
}

// Whether the offer under a reply is open, as its button says.
function offerIsOpen(replyText: string) {
  return optionsButton(replyText).getAttribute("aria-expanded") === "true";
}

// Whether the conversation is marked busy, so that a reply being written
// isn't read out until it is whole.
function conversationIsBusy() {
  return screen.getByRole("log").getAttribute("aria-busy") === "true";
}

// Whether the text is in a region whose changes are announced politely.
function isAnnouncedAsStatus(text: string) {
  return screen.getAllByRole("status").some((status) => status.textContent?.includes(text));
}

// Whether a button is announced as unavailable. It may stay focusable.
function isUnavailable(button: HTMLElement) {
  return (button as HTMLButtonElement).disabled || button.getAttribute("aria-disabled") === "true";
}

function pressEscape(element: Element) {
  fireEvent.keyDown(element, { key: "Escape" });
}

// The faults axe finds in the page as it stands. jsdom computes no colours,
// so contrast is left to be checked by hand.
async function accessibilityFaults() {
  const { violations } = await axe.run(document.body, {
    rules: { "color-contrast": { enabled: false } },
  });
  return violations.map(({ id, nodes }) => `${id}: ${nodes.map((node) => node.html).join(", ")}`);
}

function translateToggle() {
  return screen.getByRole<HTMLButtonElement>("button", { name: TRANSLATE_TOGGLE });
}

beforeEach(() => {
  vi.restoreAllMocks();
  localStorage.clear();
  // A returning user, unless a test says otherwise.
  localStorage.setItem(PROFILE_KEY, storedProfile("en", "B1"));
  resetTokenUsage();
  vi.stubGlobal("fetch", fetchMock);
  fetchMock.mockClear();
  // jsdom doesn't implement scrollIntoView.
  Element.prototype.scrollIntoView = vi.fn();
  answer = reply("Bon dia!");
  speech = new Response("wav", { headers: { "Content-Type": "audio/wav" } });
  health = new Response("OK");
  played = [];
  vi.stubGlobal("Audio", FakeAudio);
  // jsdom doesn't implement object URLs.
  URL.createObjectURL = vi.fn(() => "blob:speech");
  URL.revokeObjectURL = vi.fn();
});

describe("locked", () => {
  test("checks input as the secret phrase instead of sending it to the model", async () => {
    render(<Chat initiallyUnlocked={false} />);
    expect(screen.getByText(/enter the secret phrase/)).toBeDefined();
    expect(screen.queryByRole("button", { name: START_BUTTON })).toBeNull();

    await send("open sesame");

    expect(sentConversations()).toEqual([]);
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe("/api/unlock");
    expect(JSON.parse(init!.body as string)).toEqual({ phrase: "open sesame" });
    expect(screen.queryByText("open sesame")).toBeNull();
    expect(screen.queryByText(/enter the secret phrase/)).toBeNull();
    expect(screen.getByRole("button", { name: START_BUTTON })).toBeDefined();
  });

  test("stays locked when the phrase is wrong", async () => {
    fetchMock.mockResolvedValueOnce(Response.json({ unlocked: false }, { status: 401 }));
    render(<Chat initiallyUnlocked={false} />);

    await send("wrong");

    expect(screen.getByText(/enter the secret phrase/)).toBeDefined();
    expect(screen.queryByRole("button", { name: START_BUTTON })).toBeNull();
  });
});

describe("onboarding", () => {
  beforeEach(() => localStorage.removeItem(PROFILE_KEY));

  test("asks a first-time user which language they read best, in place of the start button", () => {
    render(<Chat initiallyUnlocked />);

    const question = screen.getByRole("group", { name: NATIVE_LANGUAGE_QUESTION });
    expect(
      within(question)
        .getAllByRole("button")
        .map((button) => button.textContent),
    ).toEqual(["English", "Español", "Euskara", "Galego", "Français", "Deutsch"]);
    expect(screen.queryByRole("button", { name: START_BUTTON })).toBeNull();
    expect(input().disabled).toBe(true);
  });

  test("waits for the secret phrase", async () => {
    render(<Chat initiallyUnlocked={false} />);
    expect(screen.queryByRole("group", { name: NATIVE_LANGUAGE_QUESTION })).toBeNull();

    await send("open sesame");

    expect(screen.getByRole("group", { name: NATIVE_LANGUAGE_QUESTION })).toBeDefined();
  });

  test("asks for the level once a native language is chosen", () => {
    render(<Chat initiallyUnlocked />);

    fireEvent.click(screen.getByRole("button", { name: "Galego" }));

    const question = screen.getByRole("radiogroup", { name: LEVEL_QUESTION });
    expect(
      within(question)
        .getAllByRole("radio")
        .map((radio) => (radio as HTMLInputElement).value),
    ).toEqual(["A1", "A2", "B1", "B2", "C1", "C2"]);
    expect(screen.queryByRole("group", { name: NATIVE_LANGUAGE_QUESTION })).toBeNull();
    const finish = screen.getByRole<HTMLButtonElement>("button", { name: FINISH_BUTTON });
    expect(finish.disabled).toBe(true);
    fireEvent.click(screen.getByRole("radio", { name: "A2" }));
    expect(finish.disabled).toBe(false);
  });

  test("stores the profile and starts the session with it when finished", async () => {
    coldStart();
    render(<Chat initiallyUnlocked />);

    await onboard("Deutsch", "A1");

    expect(JSON.parse(localStorage.getItem(PROFILE_KEY)!)).toEqual({
      version: 1,
      nativeLanguage: "de",
      level: "A1",
    });
    expect(sentConversations()).toEqual([[{ role: "user", content: GREETING }]]);
    expect(sentProfiles()).toEqual([{ nativeLanguage: "de", level: "A1" }]);
    expect(screen.getByText(WAKE_MESSAGE)).toBeDefined();
    expect(screen.queryByRole("radiogroup", { name: LEVEL_QUESTION })).toBeNull();
  });

  test("sends the profile chosen with every message after the greeting", async () => {
    answer = reply("Hola!");
    render(<Chat initiallyUnlocked />);
    await onboard("Español", "C1");

    await send("Hello");

    expect(sentProfiles()).toEqual([
      { nativeLanguage: "es", level: "C1" },
      { nativeLanguage: "es", level: "C1" },
    ]);
  });

  test("can be completed with the keyboard alone, and has no accessibility faults", async () => {
    render(<Chat initiallyUnlocked />);
    expect(await accessibilityFaults()).toEqual([]);

    fireEvent.click(screen.getByRole("button", { name: "English" }));

    expect(document.activeElement).toBe(screen.getAllByRole("radio")[0]);
    expect(await accessibilityFaults()).toEqual([]);
  });

  test("lets the saved exchanges be read before it is finished", () => {
    render(<Chat initiallyUnlocked />);

    fireEvent.click(screen.getByRole("button", { name: SAVED_BUTTON }));

    expect(screen.getByText(NOTHING_SAVED)).toBeDefined();
  });
});

describe("starting a session", () => {
  test("sends a returning user's stored profile with the greeting and every message", async () => {
    localStorage.setItem(PROFILE_KEY, storedProfile("eu", "B2"));
    await renderStarted();

    await send("Hello");

    expect(sentProfiles()).toEqual([
      { nativeLanguage: "eu", level: "B2" },
      { nativeLanguage: "eu", level: "B2" },
    ]);
  });

  test("offers the start button and keeps chatting disabled until it's used", async () => {
    render(<Chat initiallyUnlocked />);

    expect(screen.getByRole("button", { name: START_BUTTON })).toBeDefined();
    expect(input().disabled).toBe(true);

    await send("Hello");
    expect(sentConversations()).toEqual([]);
  });

  test("asks the model to say hello and shows only the wake message while waiting", async () => {
    coldStart();
    render(<Chat initiallyUnlocked />);

    await clickStart();

    expect(sentConversations()).toEqual([[{ role: "user", content: GREETING }]]);
    expect(screen.getByText(WAKE_MESSAGE)).toBeDefined();
    expect(screen.queryByRole("button", { name: START_BUTTON })).toBeNull();
    expect(screen.queryByText(GREETING)).toBeNull();
    expect(screen.queryByText("Pensant…")).toBeNull();
    expect(input().disabled).toBe(true);
  });

  test("announces why it is waiting", async () => {
    coldStart();
    render(<Chat initiallyUnlocked />);

    await clickStart();

    expect(isAnnouncedAsStatus(WAKE_MESSAGE)).toBe(true);
    expect(await accessibilityFaults()).toEqual([]);
  });

  test("keeps waiting through a cold start, then shows the greeting and enables chatting", async () => {
    const finish = coldStart();
    render(<Chat initiallyUnlocked />);
    await clickStart();

    expect(screen.getByText(WAKE_MESSAGE)).toBeDefined();
    expect(input().disabled).toBe(true);

    await finish(reply("Hola!"));

    expect(screen.getByText("Hola!")).toBeDefined();
    expect(screen.queryByText(WAKE_MESSAGE)).toBeNull();
    expect(screen.queryByText(GREETING)).toBeNull();
    expect(screen.queryByRole("button", { name: START_BUTTON })).toBeNull();
    expect(input().disabled).toBe(false);
    expect(document.activeElement).toBe(input());
  });

  test("shows the error and offers the start button again when it fails", async () => {
    answer = failure("Upstream error");
    render(<Chat initiallyUnlocked />);

    await clickStart();

    expect(screen.getByText(NO_REPLY)).toBeDefined();
    expect(screen.queryByText(WAKE_MESSAGE)).toBeNull();
    expect(input().disabled).toBe(true);

    answer = reply("Hola!");
    await clickStart();

    expect(screen.getByText("Hola!")).toBeDefined();
    expect(screen.queryByText(NO_REPLY)).toBeNull();
    expect(sentConversations().at(-1)).toEqual([{ role: "user", content: GREETING }]);
  });
});

describe("chatting", () => {
  test("shows the reply and sends the whole conversation, greeting included", async () => {
    await renderStarted();

    await send("Hello");
    expect(screen.getByText("Hello")).toBeDefined();
    expect(screen.getByText("Bon dia!")).toBeDefined();

    expect(sentConversations().at(-1)).toEqual([
      { role: "user", content: GREETING },
      { role: "assistant", content: "Hola!" },
      { role: "user", content: "Hello" },
    ]);
  });

  test("shows Pensant… until the reply starts arriving", async () => {
    await renderStarted();
    const finish = coldStart();

    await send("Hello");
    expect(screen.getByText("Pensant…")).toBeDefined();

    await finish(reply("Bon dia!"));

    expect(screen.getByText("Bon dia!")).toBeDefined();
    expect(screen.queryByText("Pensant…")).toBeNull();
  });

  test("shows the error when the request fails", async () => {
    await renderStarted();
    answer = failure("Upstream error");

    await send("Hello");

    expect(screen.getByText(NO_REPLY)).toBeDefined();
  });

  test("shows an error reported in the middle of the stream", async () => {
    await renderStarted();
    answer = createUIMessageStreamResponse({
      stream: createUIMessageStream({
        execute: ({ writer }) => writer.write({ type: "error", errorText: "Upstream error" }),
      }),
    });

    await send("Hello");

    expect(screen.getByText(NO_REPLY)).toBeDefined();
  });

  test("says so when a reply was cut short for want of room", async () => {
    await renderStarted();
    answer = cutShort("Hi havia una vegada un");

    await send("Explica'm un conte");

    expect(screen.getByText("Hi havia una vegada un")).toBeDefined();
    expect(screen.getByText(CUT_SHORT)).toBeDefined();
  });

  test("says nothing of the kind under a reply that ended by itself", async () => {
    await renderStarted();
    answer = reply("Bon dia!");

    await send("Hello");

    expect(screen.queryByText(CUT_SHORT)).toBeNull();
  });

  test("stops saying a reply was cut short once a later one is whole", async () => {
    await renderStarted();
    answer = cutShort("Hi havia una vegada un");
    await send("Explica'm un conte");
    answer = reply("Bon dia!");

    await send("Hello");

    expect(screen.queryByText(CUT_SHORT)).toBeNull();
  });

  test("ignores blank input", async () => {
    await renderStarted();
    fetchMock.mockClear();

    await send("   ");

    expect(fetchMock).not.toHaveBeenCalled();
  });

  test("Nova conversa and Desats are icons that carry their names", async () => {
    await renderStarted();
    await send("Hello");

    for (const name of [NEW_BUTTON, SAVED_BUTTON]) {
      const button = screen.getByRole("button", { name });
      expect(button.textContent).toBe("");
      expect(button.querySelector("svg")).not.toBeNull();
      expect(button.title).toBe(name);
    }
  });

  test("Nova conversa clears the conversation without restarting the session", async () => {
    await renderStarted();
    await send("Hello");

    fireEvent.click(screen.getByRole("button", { name: NEW_BUTTON }));

    expect(screen.queryByText("Hola!")).toBeNull();
    expect(screen.queryByText("Hello")).toBeNull();
    expect(screen.queryByRole("button", { name: START_BUTTON })).toBeNull();
    expect(screen.getByText(/Escriu un missatge en qualsevol idioma/)).toBeDefined();

    await send("Hello again");
    expect(sentConversations().at(-1)).toEqual([{ role: "user", content: "Hello again" }]);
  });
});

describe("the tokens of the conversation", () => {
  // Any component can read them, wherever it is on the page.
  function Tokens() {
    const { conversationTokens, inputTokens, outputTokens } = useTokenUsage();
    return <output aria-label="Tokens">{`${conversationTokens} long, ${inputTokens} read, ${outputTokens} written`}</output>;
  }

  function tokens() {
    return screen.getByRole("status", { name: "Tokens" }).textContent;
  }

  async function renderStartedWithTokens() {
    answer = reply("Hola!", { inputTokens: 40, outputTokens: 10, translation: false });
    render(
      <>
        <Chat initiallyUnlocked />
        <Tokens />
      </>,
    );
    expect(tokens()).toBe("0 long, 0 read, 0 written");
    await clickStart();
  }

  test("are counted from the greeting on, reply by reply", async () => {
    await renderStartedWithTokens();
    expect(tokens()).toBe("50 long, 40 read, 10 written");

    answer = reply("Bon dia!", { inputTokens: 55, outputTokens: 5, translation: false });
    await send("Hello");
    expect(tokens()).toBe("60 long, 95 read, 15 written");
  });

  test("are left as they were by a reply the model host didn't count", async () => {
    await renderStartedWithTokens();
    answer = reply("Bon dia!");
    await send("Hello");
    expect(tokens()).toBe("50 long, 40 read, 10 written");
  });

  test("are counted afresh after Nova conversa", async () => {
    await renderStartedWithTokens();
    answer = reply("Bon dia!", { inputTokens: 55, outputTokens: 5, translation: false });
    await send("Hello");

    fireEvent.click(screen.getByRole("button", { name: NEW_BUTTON }));
    expect(tokens()).toBe("0 long, 0 read, 0 written");
  });
});

describe("translating", () => {
  test("is off to begin with, so a message is sent as a normal chat message", async () => {
    await renderStarted();
    expect(translateToggle().getAttribute("aria-pressed")).toBe("false");

    await send("Where do you live?");

    expect(sentTranslateFlags()).toEqual([false, false, false]);
  });

  test("sends the text to be translated, exactly as entered, while it's on", async () => {
    await renderStarted();

    fireEvent.click(translateToggle());
    expect(translateToggle().getAttribute("aria-pressed")).toBe("true");
    await send("Where do you live?");

    expect(sentConversations().at(-1).at(-1)).toEqual({
      role: "user",
      content: "Where do you live?",
    });
    expect(sentTranslateFlags()).toEqual([false, false, true]);
    expect(screen.getByText("Where do you live?")).toBeDefined();
  });

  test("stays on until it's switched off", async () => {
    await renderStarted();

    fireEvent.click(translateToggle());
    await send("Good morning");
    expect(translateToggle().getAttribute("aria-pressed")).toBe("true");
    await send("Good night");
    expect(sentTranslateFlags().slice(-3)).toEqual([true, false, true]);

    fireEvent.click(translateToggle());
    await send("Thanks");
    expect(sentTranslateFlags().at(-1)).toBe(false);
  });

  test("sits before the input and returns the cursor to it", async () => {
    await renderStarted();

    expect(input().previousElementSibling).toBe(translateToggle());
    fireEvent.click(translateToggle());
    expect(document.activeElement).toBe(input());
  });

  test("can't be switched on before the session has started", () => {
    render(<Chat initiallyUnlocked />);
    expect(translateToggle().disabled).toBe(true);
  });
});

describe("markdown", () => {
  test("formats markdown in a reply", async () => {
    await renderStarted();
    answer = reply("Barcelona és **molt** gran.");

    await send("Hello");

    expect(screen.getByText("molt").tagName).toBe("STRONG");
    expect(screen.queryByText(/\*\*/)).toBeNull();
  });

  test("formats a table in a reply", async () => {
    await renderStarted();
    answer = reply("| Ciutat | Habitants |\n| --- | --- |\n| Girona | 100.000 |");

    await send("Hello");

    expect(screen.getByRole("columnheader", { name: "Ciutat" })).toBeDefined();
    expect(screen.getByRole("cell", { name: "Girona" })).toBeDefined();
  });

  test("opens a link in a reply in a new tab", async () => {
    await renderStarted();
    answer = reply("Mira [la Viquipèdia](https://ca.wikipedia.org).");

    await send("Hello");

    const link = screen.getByRole<HTMLAnchorElement>("link", { name: "la Viquipèdia" });
    expect(link.href).toBe("https://ca.wikipedia.org/");
    expect(link.target).toBe("_blank");
  });

  test("keeps the line breaks of a reply", async () => {
    await renderStarted();
    answer = reply("Primera línia\nSegona línia");

    await send("Hello");

    const bubble = screen.getByText(/Primera línia/);
    expect(bubble.querySelectorAll("br")).toHaveLength(1);
  });

  test("doesn't load an image a reply points to", async () => {
    await renderStarted();
    answer = reply("Mira ![un gat](https://example.com/gat.png) aquí.");

    await send("Hello");

    expect(screen.getByText(/Mira/)).toBeDefined();
    expect(document.querySelector("img")).toBeNull();
  });

  test("shows the user's own message exactly as typed", async () => {
    await renderStarted();

    await send("what does **molt** mean?");

    expect(screen.getByText("what does **molt** mean?")).toBeDefined();
  });
});

describe("cold start after the session has started", () => {
  test("never shows the wake message again, only Pensant…", async () => {
    await renderStarted();
    coldStart();
    await send("Hello");

    expect(screen.queryByText(WAKE_MESSAGE)).toBeNull();
    expect(screen.getByText("Pensant…")).toBeDefined();
  });
});

describe("hearing a reply", () => {
  test("offers to speak a reply that is tapped", async () => {
    await renderStarted();
    expect(screen.queryByRole("button", { name: LISTEN_BUTTON })).toBeNull();

    tap("Hola!");

    // The offer is a speaker icon, named for screen readers but with no word on it.
    const button = screen.getByRole("button", { name: LISTEN_BUTTON });
    expect(button.textContent).toBe("");
    expect(button.querySelector("svg")).not.toBeNull();
  });

  test("withdraws the offer when the reply is tapped again", async () => {
    await renderStarted();
    tap("Hola!");

    tap("Hola!");

    expect(screen.queryByRole("button", { name: LISTEN_BUTTON })).toBeNull();
  });

  test("moves the offer to another reply that is tapped", async () => {
    await renderStarted();
    await send("Hello");
    tap("Hola!");

    tap("Bon dia!");

    expect(screen.getAllByRole("button", { name: LISTEN_BUTTON })).toHaveLength(1);
    expect(saveToggle()).toBeDefined();
  });

  test("doesn't offer it for the user's own message", async () => {
    await renderStarted();
    await send("Hello");

    tap("Hello");

    expect(screen.queryByRole("button", { name: LISTEN_BUTTON })).toBeNull();
  });

  test("doesn't offer it when a link in the reply is tapped", async () => {
    await renderStarted();
    answer = reply("Mira [Viquipèdia](https://ca.wikipedia.org)");
    await send("Hello");

    tap(screen.getByRole("link", { name: "Viquipèdia" }));

    expect(screen.queryByRole("button", { name: LISTEN_BUTTON })).toBeNull();
  });

  test("doesn't offer it while a reply is still being written", async () => {
    await renderStarted();
    coldStart();
    await send("Hello");

    tap("Hola!");

    expect(screen.queryByRole("button", { name: LISTEN_BUTTON })).toBeNull();
  });

  test("withdraws the offer when something else is pressed", async () => {
    await renderStarted();
    tap("Hola!");

    fireEvent.pointerDown(input());

    expect(screen.queryByRole("button", { name: LISTEN_BUTTON })).toBeNull();
  });

  test("speaks the reply when the offer is taken", async () => {
    await renderStarted();
    tap("Hola!");

    await clickListen();

    const [, init] = fetchMock.mock.calls.find(([url]) => url === "/api/speak")!;
    expect(init!.method).toBe("POST");
    expect(JSON.parse(init!.body as string)).toEqual({ text: "Hola!" });
    expect(played).toEqual(["blob:speech"]);
    expect(screen.queryByRole("button", { name: LISTEN_BUTTON })).toBeNull();
  });

  test("shows it is loading while the audio is prepared", async () => {
    await renderStarted();
    let resolve!: (res: Response) => void;
    speech = new Promise((r) => (resolve = r));
    tap("Hola!");

    await clickListen();

    expect(isUnavailable(screen.getByRole("button", { name: "Carregant…" }))).toBe(true);
    expect(played).toEqual([]);

    await act(async () => resolve(new Response("wav")));
    await settle();

    expect(played).toEqual(["blob:speech"]);
    expect(screen.queryByRole("button", { name: "Carregant…" })).toBeNull();
  });

  test("keeps focus on the button pressed to hear a reply, from loading to mute", async () => {
    await renderStarted();
    let resolve!: (res: Response) => void;
    speech = new Promise((r) => (resolve = r));
    tap("Hola!");
    screen.getByRole("button", { name: LISTEN_BUTTON }).focus();

    await clickListen();

    // A browser drops focus from a button that is disabled. jsdom doesn't, but
    // won't give it focus afresh, as Tab would from the button beside the reply.
    const loading = screen.getByRole("button", { name: "Carregant…" });
    screen.getByRole("button", { name: OPTIONS_BUTTON }).focus();
    loading.focus();
    expect(document.activeElement).toBe(loading);

    await act(async () => resolve(new Response("wav")));
    await settle();

    expect(document.activeElement).toBe(replyMute());
  });

  test("offers to mute the reply once it is being spoken", async () => {
    await renderStarted();
    let resolve!: (res: Response) => void;
    speech = new Promise((r) => (resolve = r));
    tap("Hola!");

    await clickListen();
    expect(replyMute()).toBeNull();
    expect(headerMute()).toBeNull();

    await act(async () => resolve(new Response("wav")));
    await settle();

    const button = replyMute()!;
    expect(button.textContent).toBe("");
    expect(button.querySelector("svg")).not.toBeNull();
  });

  test.each([
    ["under the reply", replyMute],
    ["in the header", headerMute],
  ])("ends the sound when it is muted %s", async (_, muteButton) => {
    await renderStarted();
    tap("Hola!");
    await clickListen();
    expect(FakeAudio.current.paused).toBe(false);

    fireEvent.click(muteButton()!);

    expect(FakeAudio.current.paused).toBe(true);
    expect(replyMute()).toBeNull();
    expect(headerMute()).toBeNull();
    // The offer is still open, so the reply can be spoken again from there.
    expect(screen.getByRole("button", { name: LISTEN_BUTTON })).toBeDefined();
  });

  test("offers to speak the reply again when the speech ends", async () => {
    await renderStarted();
    tap("Hola!");
    await clickListen();

    act(() => FakeAudio.current.onended!());

    expect(replyMute()).toBeNull();
    expect(screen.getByRole("button", { name: LISTEN_BUTTON })).toBeDefined();
  });

  test("leaves nothing under the reply when the speech ends after the offer was dismissed", async () => {
    await renderStarted();
    tap("Hola!");
    await clickListen();
    fireEvent.pointerDown(input());

    act(() => FakeAudio.current.onended!());

    expect(replyMute()).toBeNull();
    expect(screen.queryByRole("button", { name: LISTEN_BUTTON })).toBeNull();
  });

  test("withdraws an unused offer when the mute button under another reply is pressed", async () => {
    await renderStarted();
    await send("Hello");
    tap("Hola!");
    await clickListen();
    tap("Bon dia!");

    fireEvent.pointerDown(replyMute()!);

    expect(screen.queryByRole("button", { name: LISTEN_BUTTON })).toBeNull();
  });

  test("keeps the mute buttons when something else is pressed", async () => {
    await renderStarted();
    tap("Hola!");
    await clickListen();

    fireEvent.pointerDown(input());

    expect(replyMute()).not.toBeNull();
    expect(headerMute()).not.toBeNull();
    expect(FakeAudio.current.paused).toBe(false);
  });

  test("keeps speaking a reply while another reply is tapped", async () => {
    await renderStarted();
    await send("Hello");
    tap("Hola!");
    await clickListen();

    tap("Bon dia!");

    expect(FakeAudio.current.paused).toBe(false);
    // The mute button stays under the reply being spoken, above the next reply.
    expect(replyMuteIsAbove("Bon dia!")).toBe(true);
    expect(screen.getByRole("button", { name: LISTEN_BUTTON })).toBeDefined();
  });

  test("speaks one reply at a time: a second reply takes over from the first", async () => {
    await renderStarted();
    await send("Hello");
    tap("Hola!");
    await clickListen();

    speech = new Response("wav");
    tap("Bon dia!");
    await clickListen();

    expect(played).toHaveLength(2);
    // The only mute button in the conversation is now under the second reply.
    expect(replyMuteIsAbove("Bon dia!")).toBe(false);
  });

  test("doesn't speak a reply that finishes loading after another was asked for", async () => {
    await renderStarted();
    await send("Hello");
    let resolve!: (res: Response) => void;
    speech = new Promise((r) => (resolve = r));
    tap("Hola!");
    await clickListen();

    speech = new Response("wav");
    tap("Bon dia!");
    await clickListen();
    await act(async () => resolve(new Response("wav")));
    await settle();

    expect(played).toHaveLength(1);
    expect(URL.revokeObjectURL).toHaveBeenCalledTimes(1);
    expect(screen.queryByRole("button", { name: "Carregant…" })).toBeNull();
    expect(replyMuteIsAbove("Bon dia!")).toBe(false);
  });

  test("keeps speaking a reply until the next one has loaded", async () => {
    await renderStarted();
    await send("Hello");
    tap("Hola!");
    await clickListen();
    let resolve!: (res: Response) => void;
    speech = new Promise((r) => (resolve = r));

    tap("Bon dia!");
    await clickListen();

    expect(FakeAudio.current.paused).toBe(false);
    expect(played).toHaveLength(1);
    expect(replyMuteIsAbove("Bon dia!")).toBe(true);
    expect(screen.getByRole("button", { name: "Carregant…" })).toBeDefined();

    await act(async () => resolve(new Response("wav")));
    await settle();

    expect(played).toHaveLength(2);
    expect(replyMuteIsAbove("Bon dia!")).toBe(false);
  });

  test("withdraws the mute buttons when a reply ends while the next one is loading", async () => {
    await renderStarted();
    await send("Hello");
    tap("Hola!");
    await clickListen();
    speech = new Promise(() => {});
    tap("Bon dia!");
    await clickListen();

    act(() => FakeAudio.current.onended!());

    expect(replyMute()).toBeNull();
    expect(headerMute()).toBeNull();
  });

  test("speaks a muted reply again from the start without preparing the audio again", async () => {
    await renderStarted();
    tap("Hola!");
    await clickListen();
    fireEvent.click(replyMute()!);

    await clickListen();

    expect(fetchMock.mock.calls.filter(([url]) => url === "/api/speak")).toHaveLength(1);
    expect(played).toHaveLength(2);
    expect(FakeAudio.current.paused).toBe(false);
    expect(replyMute()).not.toBeNull();
  });

  test("shows a mute button in the header for as long as a reply is being spoken", async () => {
    await renderStarted();
    expect(headerMute()).toBeNull();
    tap("Hola!");
    await clickListen();

    expect(headerMute()).not.toBeNull();

    act(() => FakeAudio.current.onended!());

    expect(headerMute()).toBeNull();
  });

  test("ends the sound when the conversation is cleared", async () => {
    await renderStarted();
    await send("Hello");
    tap("Bon dia!");
    await clickListen();
    expect(FakeAudio.current.paused).toBe(false);

    fireEvent.click(screen.getByRole("button", { name: NEW_BUTTON }));

    expect(FakeAudio.current.paused).toBe(true);
    expect(headerMute()).toBeNull();
  });

  test("withdraws an unused offer, but not the mute buttons, when something else is pressed", async () => {
    await renderStarted();
    await send("Hello");
    tap("Hola!");
    await clickListen();
    tap("Bon dia!");

    fireEvent.pointerDown(input());

    expect(screen.queryByRole("button", { name: LISTEN_BUTTON })).toBeNull();
    expect(replyMute()).not.toBeNull();
    expect(headerMute()).not.toBeNull();
  });

  test("doesn't offer to speak the reply that is being spoken, even once it ends", async () => {
    await renderStarted();
    tap("Hola!");
    await clickListen();

    tap("Hola!");
    act(() => FakeAudio.current.onended!());

    expect(screen.queryByRole("button", { name: LISTEN_BUTTON })).toBeNull();
  });

  test("says so when the reply can't be spoken", async () => {
    await renderStarted();
    speech = new Response("Upstream error", { status: 502 });
    tap("Hola!");

    await clickListen();

    expect(screen.getByText("No s'ha pogut reproduir l'àudio.")).toBeDefined();
    expect(played).toEqual([]);
  });
});

describe("speech that isn't available", () => {
  test("doesn't offer to speak a reply when the health check fails", async () => {
    health = new Response("Unavailable", { status: 503 });
    await renderStarted();
    await send("Hello");

    tap("Bon dia!");

    expect(screen.queryByRole("button", { name: LISTEN_BUTTON })).toBeNull();
    expect(saveToggle()).toBeDefined();
  });

  test("doesn't offer to speak a reply when the health check can't be made", async () => {
    health = Promise.reject(new Error("Failed to fetch"));
    await renderStarted();
    await send("Hello");

    tap("Bon dia!");

    expect(screen.queryByRole("button", { name: LISTEN_BUTTON })).toBeNull();
  });

  test("offers nothing under the greeting, which can't be saved either", async () => {
    health = new Response("Unavailable", { status: 503 });
    await renderStarted();

    tap("Hola!");

    // Not even an empty offer opens under it.
    expect(document.querySelector("[data-offer]")).toBeNull();
  });

  test("withdraws an offer that was opened before the health check failed", async () => {
    let resolve!: (res: Response) => void;
    health = new Promise((r) => (resolve = r));
    await renderStarted();
    tap("Hola!");
    expect(screen.getByRole("button", { name: LISTEN_BUTTON })).toBeDefined();

    await act(async () => resolve(new Response("Unavailable", { status: 503 })));

    expect(document.querySelector("[data-offer]")).toBeNull();
  });

  test("doesn't offer to speak a saved reply, which can still be deleted", async () => {
    health = new Response("Unavailable", { status: 503 });
    await renderSaved("One");

    fireEvent.click(savedRow("One"));

    expect(screen.queryByRole("button", { name: LISTEN_BUTTON })).toBeNull();
    expect(savedRowButton("One", DELETE_BUTTON)).toBeDefined();
  });

  test("checks the health once, when the page loads unlocked", async () => {
    await renderStarted();
    await send("Hello");

    expect(fetchMock.mock.calls.filter(([url]) => url === "/api/speak/health")).toHaveLength(1);
    expect(fetchMock.mock.calls[0][0]).toBe("/api/speak/health");
  });

  test("checks the health once the chat is unlocked, not while it is locked", async () => {
    health = new Response("Unavailable", { status: 503 });
    render(<Chat initiallyUnlocked={false} />);
    await settle();
    expect(fetchMock).not.toHaveBeenCalled();

    await send("open sesame");
    await clickStart();
    await send("Hello");
    tap("Bon dia!");

    expect(fetchMock.mock.calls.filter(([url]) => url === "/api/speak/health")).toHaveLength(1);
    expect(screen.queryByRole("button", { name: LISTEN_BUTTON })).toBeNull();
  });
});

describe("saving an exchange", () => {
  test("saves the exchange of a tapped reply and lists it under its message", async () => {
    await renderStarted();
    await send("Hello");

    tap("Bon dia!");
    expect(saveToggle().getAttribute("aria-pressed")).toBe("false");
    const outline = saveToggle().innerHTML;
    pressSaveToggle();

    // The offer stays, and the bookmark shows the exchange is saved.
    expect(saveToggle().getAttribute("aria-pressed")).toBe("true");
    expect(saveToggle().innerHTML).not.toBe(outline);

    openSaved();

    expect(savedRow("Hello").getAttribute("aria-expanded")).toBe("false");
    expect(screen.queryByText("Bon dia!")).toBeNull();

    fireEvent.click(savedRow("Hello"));

    expect(savedRow("Hello").getAttribute("aria-expanded")).toBe("true");
    expect(screen.getByText("Bon dia!")).toBeDefined();
  });

  test("unsaves the exchange when the bookmark is pressed again", async () => {
    await renderStarted();
    await send("Hello");
    toggleSaved("Bon dia!");

    pressSaveToggle();

    expect(saveToggle().getAttribute("aria-pressed")).toBe("false");
    openSaved();
    expect(screen.getByText(NOTHING_SAVED)).toBeDefined();
  });

  test("treats the same message with the same reply as one exchange", async () => {
    await renderStarted();
    await send("Hello");
    toggleSaved("Bon dia!");
    answer = reply("Bon dia!");
    await send("Hello");

    // The second reply says the same as the first, which is saved.
    tap(screen.getAllByText("Bon dia!")[1]);

    expect(saveToggle().getAttribute("aria-pressed")).toBe("true");
    openSaved();
    expect(savedMessages()).toEqual(["Hello"]);
  });

  test("keeps two replies to the same message apart, the newest first", async () => {
    await renderStarted();
    await send("Hello");
    answer = reply("Bona tarda!");
    await send("Hello");
    answer = reply("De res!");
    await send("Thanks");

    toggleSaved("Bon dia!");
    toggleSaved("Bona tarda!");
    toggleSaved("De res!");
    openSaved();

    expect(savedMessages()).toEqual(["Thanks", "Hello", "Hello"]);
    fireEvent.click(screen.getAllByRole("button", { name: "Hello" })[0]);
    expect(screen.getByText("Bona tarda!")).toBeDefined();
    // The other reply to "Hello" stays closed.
    expect(screen.queryByText("Bon dia!")).toBeNull();
  });

  test("doesn't offer to save the greeting, which answers no message", async () => {
    await renderStarted();

    tap("Hola!");

    expect(screen.getByRole("button", { name: LISTEN_BUTTON })).toBeDefined();
    expect(screen.queryByRole("button", { name: SAVE_TOGGLE })).toBeNull();
  });

  test("still offers to save a reply once it is being spoken", async () => {
    await renderStarted();
    await send("Hello");
    tap("Bon dia!");
    await clickListen();

    pressSaveToggle();

    expect(saveToggle().getAttribute("aria-pressed")).toBe("true");
    expect(replyMute()).not.toBeNull();
  });

  test("offers to save a reply that is tapped while it is being spoken", async () => {
    await renderStarted();
    await send("Hello");
    tap("Bon dia!");
    await clickListen();
    fireEvent.pointerDown(input());

    tap("Bon dia!");
    pressSaveToggle();

    expect(saveToggle().getAttribute("aria-pressed")).toBe("true");
    expect(replyMute()).not.toBeNull();
    expect(FakeAudio.current.paused).toBe(false);
  });

  test("keeps saved exchanges when the conversation is cleared and in a later session", async () => {
    await renderStarted();
    await send("Hello");
    toggleSaved("Bon dia!");
    fireEvent.click(screen.getByRole("button", { name: NEW_BUTTON }));

    openSaved();
    expect(savedMessages()).toEqual(["Hello"]);

    cleanup();
    await renderStarted();
    openSaved();
    expect(savedMessages()).toEqual(["Hello"]);

    // The same message and reply, met again, are already saved.
    backToChat();
    await send("Hello");
    tap("Bon dia!");
    expect(saveToggle().getAttribute("aria-pressed")).toBe("true");
  });
});

describe("the saved exchanges", () => {
  test("can be opened once unlocked, before the session starts and while the model wakes", async () => {
    render(<Chat initiallyUnlocked />);

    openSaved();
    expect(screen.getByText(NOTHING_SAVED)).toBeDefined();

    backToChat();
    coldStart();
    await clickStart();
    openSaved();
    expect(screen.getByText(NOTHING_SAVED)).toBeDefined();
  });

  test("can't be opened while locked", () => {
    render(<Chat initiallyUnlocked={false} />);

    expect(screen.queryByRole("button", { name: SAVED_BUTTON })).toBeNull();
  });

  test("take the place of the conversation, its input and Nova conversa", async () => {
    await renderStarted();
    await send("Hello");
    toggleSaved("Bon dia!");

    openSaved();

    expect(screen.queryByText("Bon dia!")).toBeNull();
    expect(screen.queryByRole("textbox")).toBeNull();
    expect(screen.queryByRole("button", { name: NEW_BUTTON })).toBeNull();
    expect(screen.queryByRole("button", { name: SAVED_BUTTON })).toBeNull();
  });

  test("show one reply at a time, and none when the list is opened again", async () => {
    await renderStarted();
    await send("Hello");
    answer = reply("De res!");
    await send("Thanks");
    toggleSaved("Bon dia!");
    toggleSaved("De res!");
    openSaved();

    fireEvent.click(savedRow("Hello"));
    fireEvent.click(savedRow("Thanks"));

    expect(screen.queryByText("Bon dia!")).toBeNull();
    expect(screen.getByText("De res!")).toBeDefined();

    fireEvent.click(savedRow("Thanks"));
    expect(screen.queryByText("De res!")).toBeNull();

    fireEvent.click(savedRow("Hello"));
    backToChat();
    openSaved();
    expect(savedRow("Hello").getAttribute("aria-expanded")).toBe("false");
  });

  test("format a saved reply as the conversation does", async () => {
    await renderStarted();
    answer = reply("**Molt** bé: [Viquipèdia](https://ca.wikipedia.org) ![foto](https://example.com/a.png)");
    await send("Hello");
    toggleSaved("Molt");
    openSaved();

    fireEvent.click(savedRow("Hello"));

    expect(screen.getByText("Molt").tagName).toBe("STRONG");
    expect(screen.getByRole("link", { name: "Viquipèdia" }).getAttribute("target")).toBe("_blank");
    expect(document.querySelector("img")).toBeNull();
  });

  test("offer nothing more when a reply is tapped: its options are already shown", async () => {
    await renderStarted();
    await send("Hello");
    toggleSaved("Bon dia!");
    openSaved();
    fireEvent.click(savedRow("Hello"));
    const options = savedRow("Hello").closest("li")!.innerHTML;

    tap("Bon dia!");

    expect(savedRow("Hello").closest("li")!.innerHTML).toBe(options);
    expect(screen.queryByRole("button", { name: SAVE_TOGGLE })).toBeNull();
  });

  test("leave the conversation scrolled to where it was", async () => {
    await renderStarted();
    await send("Hello");
    screen.getByRole("main").scrollTop = 120;

    openSaved();
    backToChat();

    expect(screen.getByRole("main").scrollTop).toBe(120);
  });

  test("leave the conversation, the input and the translation toggle as they were", async () => {
    await renderStarted();
    await send("Hello");
    fireEvent.click(translateToggle());
    fireEvent.change(input(), { target: { value: "half a thought" } });

    openSaved();
    backToChat();

    expect(screen.getByText("Hello")).toBeDefined();
    expect(screen.getByText("Bon dia!")).toBeDefined();
    expect(input().value).toBe("half a thought");
    expect(translateToggle().getAttribute("aria-pressed")).toBe("true");
  });

  test("don't interrupt a reply that is still on its way", async () => {
    await renderStarted();
    const arrive = coldStart();
    await send("Hello");

    openSaved();
    await arrive(reply("Bon dia!"));
    backToChat();

    expect(screen.getByText("Bon dia!")).toBeDefined();
    expect(screen.queryByText("Pensant…")).toBeNull();
  });
});

describe("deleting a saved exchange", () => {
  test("offers to delete only the saved exchange whose row is open", async () => {
    await renderSaved("One", "Two");
    expect(screen.queryByRole("button", { name: DELETE_BUTTON })).toBeNull();

    fireEvent.click(savedRow("Two"));

    expect(screen.getAllByRole("button", { name: DELETE_BUTTON })).toHaveLength(1);
    expect(savedRowButton("Two", DELETE_BUTTON)).toBeDefined();
  });

  test("removes the saved exchange at once and leaves no row open", async () => {
    await renderSaved("One", "Two", "Three");
    fireEvent.click(savedRow("Two"));

    fireEvent.click(savedRowButton("Two", DELETE_BUTTON));

    expect(savedMessages()).toEqual(["One", "Three"]);
    expect(screen.queryByRole("button", { expanded: true })).toBeNull();
  });

  test("moves the keyboard to the row that takes the deleted one's place", async () => {
    await renderSaved("One", "Two", "Three");
    fireEvent.click(savedRow("Two"));
    fireEvent.click(savedRowButton("Two", DELETE_BUTTON));
    expect(document.activeElement).toBe(savedRow("Three"));

    fireEvent.click(savedRow("Three"));
    fireEvent.click(savedRowButton("Three", DELETE_BUTTON));
    expect(document.activeElement).toBe(savedRow("One"));
  });

  test("shows that nothing is saved once the last one is deleted", async () => {
    await renderSaved("One");
    fireEvent.click(savedRow("One"));

    fireEvent.click(savedRowButton("One", DELETE_BUTTON));

    expect(screen.getByText(NOTHING_SAVED)).toBeDefined();
  });

  test("leaves the reply in the conversation unsaved, in this session and a later one", async () => {
    await renderSaved("One", "Two");
    fireEvent.click(savedRow("One"));
    fireEvent.click(savedRowButton("One", DELETE_BUTTON));

    // The offer under that reply is still open from when it was saved.
    backToChat();
    expect(saveToggle().getAttribute("aria-pressed")).toBe("false");

    cleanup();
    render(<Chat initiallyUnlocked />);
    openSaved();
    expect(savedMessages()).toEqual(["Two"]);
  });
});

describe("hearing a saved reply", () => {
  test("offers to speak the reply of the open row, and speaks it", async () => {
    await renderSaved("One", "Two");
    expect(screen.queryByRole("button", { name: LISTEN_BUTTON })).toBeNull();

    fireEvent.click(savedRow("Two"));
    expect(savedRowButton("Two", LISTEN_BUTTON)).toBeDefined();
    await clickListen();

    const [, init] = fetchMock.mock.calls.find(([url]) => url === "/api/speak")!;
    expect(JSON.parse(init!.body as string)).toEqual({ text: "Resposta a Two" });
    expect(played).toEqual(["blob:speech"]);
  });

  test("shows it is loading while the audio is prepared", async () => {
    await renderSaved("One");
    let resolve!: (res: Response) => void;
    speech = new Promise((r) => (resolve = r));
    fireEvent.click(savedRow("One"));

    await clickListen();

    expect(isUnavailable(savedRowButton("One", "Carregant…"))).toBe(true);
    expect(played).toEqual([]);

    await act(async () => resolve(new Response("wav")));
    await settle();

    expect(played).toEqual(["blob:speech"]);
    expect(screen.queryByRole("button", { name: "Carregant…" })).toBeNull();
  });

  test("says so when the reply can't be spoken", async () => {
    await renderSaved("One");
    speech = new Response("Upstream error", { status: 502 });
    fireEvent.click(savedRow("One"));

    await clickListen();

    expect(screen.getByText("No s'ha pogut reproduir l'àudio.")).toBeDefined();
    expect(savedRowButton("One", LISTEN_BUTTON)).toBeDefined();
    expect(played).toEqual([]);
  });

  test("shows a mute button in the open row, in place of the speaker button, and one in the header", async () => {
    await renderSaved("One");
    fireEvent.click(savedRow("One"));

    await clickListen();

    expect(savedRowButton("One", MUTE_BUTTON)).toBe(replyMute());
    expect(headerMute()).not.toBeNull();
    expect(screen.queryByRole("button", { name: LISTEN_BUTTON })).toBeNull();
  });

  test.each([
    ["in the row", replyMute],
    ["in the header", headerMute],
  ])("ends the sound when it is muted %s", async (_, muteButton) => {
    await renderSaved("One");
    fireEvent.click(savedRow("One"));
    await clickListen();
    expect(FakeAudio.current.paused).toBe(false);

    fireEvent.click(muteButton()!);

    expect(FakeAudio.current.paused).toBe(true);
    expect(replyMute()).toBeNull();
    expect(headerMute()).toBeNull();
    expect(savedRowButton("One", LISTEN_BUTTON)).toBeDefined();
  });

  test("withdraws both mute buttons when the speech ends", async () => {
    await renderSaved("One");
    fireEvent.click(savedRow("One"));
    await clickListen();

    act(() => FakeAudio.current.onended!());

    expect(replyMute()).toBeNull();
    expect(headerMute()).toBeNull();
    expect(savedRowButton("One", LISTEN_BUTTON)).toBeDefined();
  });

  test("speaks a muted saved reply again without preparing the audio again", async () => {
    await renderSaved("One");
    fireEvent.click(savedRow("One"));
    await clickListen();
    fireEvent.click(replyMute()!);

    await clickListen();

    expect(fetchMock.mock.calls.filter(([url]) => url === "/api/speak")).toHaveLength(1);
    expect(played).toHaveLength(2);
    expect(FakeAudio.current.paused).toBe(false);
  });

  test("no longer says a saved reply couldn't be spoken once the list is opened again", async () => {
    await renderSaved("One");
    speech = new Response("Upstream error", { status: 502 });
    fireEvent.click(savedRow("One"));
    await clickListen();

    backToChat();
    openSaved();
    fireEvent.click(savedRow("One"));

    expect(screen.queryByText("No s'ha pogut reproduir l'àudio.")).toBeNull();
    expect(savedRowButton("One", LISTEN_BUTTON)).toBeDefined();
  });

  test("works before the session has started", async () => {
    await renderSaved("One");
    cleanup();
    render(<Chat initiallyUnlocked />);
    openSaved();
    fireEvent.click(savedRow("One"));

    await clickListen();

    expect(played).toEqual(["blob:speech"]);
    expect(replyMute()).not.toBeNull();
  });
});

describe("one sound across the conversation and the saved exchanges", () => {
  // A session with one exchange, "Hello" answered by "Bon dia!", which is saved.
  async function renderWithSavedHello() {
    await renderStarted();
    await send("Hello");
    toggleSaved("Bon dia!");
  }

  test("keeps speaking a saved reply when the user returns to the conversation", async () => {
    await renderWithSavedHello();
    openSaved();
    fireEvent.click(savedRow("Hello"));
    await clickListen();

    backToChat();

    expect(FakeAudio.current.paused).toBe(false);
    expect(headerMute()).not.toBeNull();
    // The reply in the conversation didn't start the sound: it can be asked to.
    expect(replyMute()).toBeNull();
    expect(screen.getByRole("button", { name: LISTEN_BUTTON })).toBeDefined();

    fireEvent.click(headerMute()!);
    expect(FakeAudio.current.paused).toBe(true);
    expect(headerMute()).toBeNull();
  });

  test("keeps speaking a reply in the conversation when the list is opened", async () => {
    await renderWithSavedHello();
    await clickListen();

    openSaved();
    fireEvent.click(savedRow("Hello"));

    expect(FakeAudio.current.paused).toBe(false);
    expect(headerMute()).not.toBeNull();
    // The saved exchange didn't start the sound: it can be asked to.
    expect(replyMute()).toBeNull();
    expect(savedRowButton("Hello", LISTEN_BUTTON)).toBeDefined();
  });

  test("starts a new sound for the same reply asked for in the other view", async () => {
    await renderWithSavedHello();
    await clickListen();
    openSaved();
    fireEvent.click(savedRow("Hello"));

    speech = new Response("wav");
    await clickListen();

    expect(fetchMock.mock.calls.filter(([url]) => url === "/api/speak")).toHaveLength(2);
    expect(played).toHaveLength(2);
    expect(savedRowButton("Hello", MUTE_BUTTON)).toBeDefined();

    // The mute button has left the reply in the conversation for the row.
    backToChat();
    expect(replyMute()).toBeNull();
  });

  test("keeps speaking a saved reply when its row is closed and another is opened", async () => {
    await renderSaved("One", "Two");
    fireEvent.click(savedRow("One"));
    await clickListen();

    fireEvent.click(savedRow("One"));
    expect(FakeAudio.current.paused).toBe(false);
    expect(replyMute()).toBeNull();
    expect(headerMute()).not.toBeNull();

    fireEvent.click(savedRow("Two"));
    expect(FakeAudio.current.paused).toBe(false);
    expect(savedRowButton("Two", LISTEN_BUTTON)).toBeDefined();

    // Its mute button is back whenever its row is open.
    fireEvent.click(savedRow("One"));
    expect(savedRowButton("One", MUTE_BUTTON)).toBeDefined();
  });

  test("lets a sound asked for in the list take over from one in the conversation only once it has loaded", async () => {
    await renderWithSavedHello();
    await clickListen();
    let resolve!: (res: Response) => void;
    speech = new Promise((r) => (resolve = r));
    openSaved();
    fireEvent.click(savedRow("Hello"));

    await clickListen();

    expect(FakeAudio.current.paused).toBe(false);
    expect(played).toHaveLength(1);
    expect(savedRowButton("Hello", "Carregant…")).toBeDefined();
    backToChat();
    expect(replyMute()).not.toBeNull();

    await act(async () => resolve(new Response("wav")));
    await settle();

    expect(played).toHaveLength(2);
    expect(replyMute()).toBeNull();
    openSaved();
    fireEvent.click(savedRow("Hello"));
    expect(savedRowButton("Hello", MUTE_BUTTON)).toBeDefined();
  });

  test("starts a sound asked for in the list once it is ready, though the user has gone back to the conversation", async () => {
    await renderWithSavedHello();
    let resolve!: (res: Response) => void;
    speech = new Promise((r) => (resolve = r));
    openSaved();
    fireEvent.click(savedRow("Hello"));
    await clickListen();

    backToChat();
    expect(played).toEqual([]);
    await act(async () => resolve(new Response("wav")));
    await settle();

    expect(played).toEqual(["blob:speech"]);
    expect(headerMute()).not.toBeNull();
    expect(replyMute()).toBeNull();
  });

  test("offers a saved reply again when one asked for later in the conversation is spoken instead", async () => {
    await renderWithSavedHello();
    let resolve!: (res: Response) => void;
    speech = new Promise((r) => (resolve = r));
    openSaved();
    fireEvent.click(savedRow("Hello"));
    await clickListen();
    backToChat();
    speech = new Response("wav");
    await clickListen();

    await act(async () => resolve(new Response("wav")));
    await settle();
    openSaved();
    fireEvent.click(savedRow("Hello"));

    expect(played).toHaveLength(1);
    expect(savedRowButton("Hello", LISTEN_BUTTON)).toBeDefined();
  });

  test("ends the sound when the saved exchange it was started from is deleted", async () => {
    await renderSaved("One", "Two");
    fireEvent.click(savedRow("One"));
    await clickListen();

    fireEvent.click(savedRowButton("One", DELETE_BUTTON));

    expect(FakeAudio.current.paused).toBe(true);
    expect(headerMute()).toBeNull();
  });

  test("ends the sound when the saved exchange it was started from is removed in another tab", async () => {
    await renderSaved("One");
    fireEvent.click(savedRow("One"));
    await clickListen();

    changeInAnotherTab(() => []);
    hearOfAnotherTab();

    expect(FakeAudio.current.paused).toBe(true);
    expect(headerMute()).toBeNull();
    expect(screen.getByText(NOTHING_SAVED)).toBeDefined();
  });

  test("doesn't speak a saved reply that is deleted while its audio is prepared", async () => {
    await renderSaved("One", "Two");
    let resolve!: (res: Response) => void;
    speech = new Promise((r) => (resolve = r));
    fireEvent.click(savedRow("One"));
    await clickListen();

    fireEvent.click(savedRowButton("One", DELETE_BUTTON));
    await act(async () => resolve(new Response("wav")));
    await settle();

    expect(played).toEqual([]);
    expect(headerMute()).toBeNull();
  });

  test("keeps speaking one saved reply when another saved exchange is deleted", async () => {
    await renderSaved("One", "Two");
    fireEvent.click(savedRow("One"));
    await clickListen();
    fireEvent.click(savedRow("Two"));

    fireEvent.click(savedRowButton("Two", DELETE_BUTTON));

    expect(FakeAudio.current.paused).toBe(false);
    expect(headerMute()).not.toBeNull();
  });

  test("ends a sound started in the list when its exchange is unsaved from the conversation", async () => {
    await renderWithSavedHello();
    openSaved();
    fireEvent.click(savedRow("Hello"));
    await clickListen();
    backToChat();

    pressSaveToggle();

    expect(FakeAudio.current.paused).toBe(true);
    expect(headerMute()).toBeNull();
  });

  test("keeps speaking a reply in the conversation when it is unsaved there", async () => {
    await renderWithSavedHello();
    await clickListen();

    pressSaveToggle();

    expect(saveToggle().getAttribute("aria-pressed")).toBe("false");
    expect(FakeAudio.current.paused).toBe(false);
    expect(replyMute()).not.toBeNull();
    expect(headerMute()).not.toBeNull();
  });

  test("keeps speaking a saved reply when the conversation is cleared", async () => {
    await renderWithSavedHello();
    openSaved();
    fireEvent.click(savedRow("Hello"));
    await clickListen();
    backToChat();

    fireEvent.click(screen.getByRole("button", { name: NEW_BUTTON }));

    expect(FakeAudio.current.paused).toBe(false);
    expect(headerMute()).not.toBeNull();
  });

  test("still speaks a saved reply that is being prepared when the conversation is cleared", async () => {
    await renderWithSavedHello();
    let resolve!: (res: Response) => void;
    speech = new Promise((r) => (resolve = r));
    openSaved();
    fireEvent.click(savedRow("Hello"));
    await clickListen();
    backToChat();

    fireEvent.click(screen.getByRole("button", { name: NEW_BUTTON }));
    await act(async () => resolve(new Response("wav")));
    await settle();

    expect(played).toEqual(["blob:speech"]);
    expect(headerMute()).not.toBeNull();
  });
});

describe("a save that can't be stored", () => {
  test("says so under the reply and leaves the bookmark an outline", async () => {
    await renderStarted();
    await send("Hello");
    refuseWrites();

    toggleSaved("Bon dia!");

    expect(screen.getByText(SAVE_FAILURE)).toBeDefined();
    expect(saveToggle().getAttribute("aria-pressed")).toBe("false");
  });

  test("leaves the saved exchanges as they were", async () => {
    await renderStarted();
    await send("Hello");
    toggleSaved("Bon dia!");
    answer = reply("De res!");
    await send("Thanks");
    const storeAgain = refuseWrites();

    toggleSaved("De res!");
    openSaved();
    expect(savedMessages()).toEqual(["Hello"]);

    storeAgain();
    cleanup();
    render(<Chat initiallyUnlocked />);
    openSaved();
    expect(savedMessages()).toEqual(["Hello"]);
  });

  test("no longer says so once a later save of that reply succeeds", async () => {
    await renderStarted();
    await send("Hello");
    const storeAgain = refuseWrites();
    toggleSaved("Bon dia!");

    storeAgain();
    pressSaveToggle();

    expect(screen.queryByText(SAVE_FAILURE)).toBeNull();
    expect(saveToggle().getAttribute("aria-pressed")).toBe("true");
  });

  test("no longer says so once the options under the reply are dismissed", async () => {
    await renderStarted();
    await send("Hello");
    refuseWrites();
    toggleSaved("Bon dia!");

    tap("Bon dia!");
    tap("Bon dia!");

    expect(screen.getByRole("button", { name: SAVE_TOGGLE })).toBeDefined();
    expect(screen.queryByText(SAVE_FAILURE)).toBeNull();
  });

  test("no longer says so once the exchange is saved from another tab", async () => {
    await renderStarted();
    await send("Hello");
    const storeAgain = refuseWrites();
    toggleSaved("Bon dia!");

    storeAgain();
    changeInAnotherTab(() => [{ message: "Hello", reply: "Bon dia!" }]);
    hearOfAnotherTab();

    expect(saveToggle().getAttribute("aria-pressed")).toBe("true");
    expect(screen.queryByText(SAVE_FAILURE)).toBeNull();
  });

  test("keeps saying so while the reply is spoken", async () => {
    await renderStarted();
    await send("Hello");
    refuseWrites();
    toggleSaved("Bon dia!");

    await clickListen();

    expect(replyMute()).not.toBeNull();
    expect(screen.getByText(SAVE_FAILURE)).toBeDefined();
  });
});

describe("storage that is blocked", () => {
  test("shows nothing saved, leaves the chat working, and says a save couldn't be stored", async () => {
    blockStorage();
    // No profile can be read, so the user is asked for one.
    answer = reply("Hola!");
    render(<Chat initiallyUnlocked />);
    await onboard("English", "B1");
    answer = reply("Bon dia!");

    openSaved();
    expect(screen.getByText(NOTHING_SAVED)).toBeDefined();

    backToChat();
    await send("Hello");
    toggleSaved("Bon dia!");
    expect(screen.getByText(SAVE_FAILURE)).toBeDefined();
    expect(saveToggle().getAttribute("aria-pressed")).toBe("false");
  });
});

describe("a delete that can't be stored", () => {
  test("leaves the saved exchange in the list, its row still open", async () => {
    await renderSaved("One", "Two");
    fireEvent.click(savedRow("One"));
    refuseWrites();

    fireEvent.click(savedRowButton("One", DELETE_BUTTON));

    expect(savedMessages()).toEqual(["One", "Two"]);
    expect(savedRow("One").getAttribute("aria-expanded")).toBe("true");
  });
});

describe("stored exchanges that can't be read", () => {
  const unreadable = [
    ["isn't JSON", "not a list at all"],
    ["is of an unknown version", JSON.stringify({ version: 2, exchanges: [{ message: "Old", reply: "Vell" }] })],
    ["isn't a list", JSON.stringify({ version: 1, exchanges: "Old" })],
    ["holds something other than exchanges", JSON.stringify({ version: 1, exchanges: [{ message: "Old" }] })],
    ["is null", "null"],
  ];

  test.each(unreadable)("show as nothing saved when what is stored %s, and the chat works", async (_, junk) => {
    localStorage.setItem(STORAGE_KEY, junk);
    await renderStarted();

    openSaved();
    expect(screen.getByText(NOTHING_SAVED)).toBeDefined();

    backToChat();
    await send("Hello");
    expect(screen.getByText("Bon dia!")).toBeDefined();
    tap("Bon dia!");
    expect(saveToggle().getAttribute("aria-pressed")).toBe("false");
  });

  test.each(unreadable)("are replaced by the next save when what is stored %s", async (_, junk) => {
    localStorage.setItem(STORAGE_KEY, junk);
    await renderStarted();
    await send("Hello");

    toggleSaved("Bon dia!");

    expect(saveToggle().getAttribute("aria-pressed")).toBe("true");
    cleanup();
    render(<Chat initiallyUnlocked />);
    openSaved();
    expect(savedMessages()).toEqual(["Hello"]);
  });
});

describe("the saved exchanges in two tabs", () => {
  const ELSEWHERE = { message: "Elsewhere", reply: "En un altre lloc" };

  test("show an exchange saved in another tab without a reload", async () => {
    await renderSaved("One");

    changeInAnotherTab((exchanges) => [ELSEWHERE, ...exchanges]);
    hearOfAnotherTab();

    expect(savedMessages()).toEqual(["Elsewhere", "One"]);
  });

  test("fill the bookmark of a reply whose exchange was saved in another tab", async () => {
    await renderStarted();
    await send("Hello");

    changeInAnotherTab(() => [{ message: "Hello", reply: "Bon dia!" }]);
    hearOfAnotherTab();
    tap("Bon dia!");

    expect(saveToggle().getAttribute("aria-pressed")).toBe("true");
  });

  // The other tab's change is stored, but this tab hasn't heard of it yet.
  test("keep what another tab has just saved when this tab saves", async () => {
    await renderStarted();
    await send("Hello");
    changeInAnotherTab(() => [ELSEWHERE]);

    toggleSaved("Bon dia!");
    openSaved();

    expect(savedMessages()).toEqual(["Hello", "Elsewhere"]);
  });

  test("keep what another tab has just saved when this tab deletes", async () => {
    await renderSaved("One", "Two");
    fireEvent.click(savedRow("Two"));
    changeInAnotherTab((exchanges) => [ELSEWHERE, ...exchanges]);

    fireEvent.click(savedRowButton("Two", DELETE_BUTTON));

    expect(savedMessages()).toEqual(["Elsewhere", "One"]);
  });

  test("change nothing when this tab deletes what another tab has just deleted", async () => {
    await renderSaved("One", "Two", "Three");
    fireEvent.click(savedRow("Two"));
    changeInAnotherTab((exchanges) => exchanges.filter((one) => one.message !== "Two"));

    fireEvent.click(savedRowButton("Two", DELETE_BUTTON));

    expect(savedMessages()).toEqual(["One", "Three"]);
  });

  test("close the open row when another tab deletes it", async () => {
    await renderSaved("One", "Two");
    fireEvent.click(savedRow("Two"));

    const deleted = { message: "Two", reply: "Resposta a Two" };
    changeInAnotherTab((exchanges) => exchanges.filter((one) => one.message !== deleted.message));
    hearOfAnotherTab();

    expect(savedMessages()).toEqual(["One"]);
    expect(screen.queryByRole("button", { expanded: true })).toBeNull();
    expect(screen.queryByText("Resposta a Two")).toBeNull();

    // It was closed, not hidden: saved again, its row is closed like any other.
    changeInAnotherTab((exchanges) => [deleted, ...exchanges]);
    hearOfAnotherTab();
    expect(savedRow("Two").getAttribute("aria-expanded")).toBe("false");
  });
});

describe("accessibility", () => {
  test("names the message field for what it is for, by whether it is translating", async () => {
    await renderStarted();
    expect(screen.getByRole("textbox", { name: "Missatge" })).toBe(input());

    fireEvent.click(translateToggle());
    expect(screen.getByRole("textbox", { name: "Text per traduir" })).toBe(input());
  });

  test("finds no faults before a session has started", async () => {
    render(<Chat initiallyUnlocked />);
    await settle();

    expect(await accessibilityFaults()).toEqual([]);
  });

  test("finds no faults in a conversation", async () => {
    await renderStarted();
    await send("Good morning");

    expect(await accessibilityFaults()).toEqual([]);
  });

  test("finds no faults among the saved exchanges, with nothing saved", async () => {
    await renderStarted();
    openSaved();

    expect(await accessibilityFaults()).toEqual([]);
  });

  test("finds no faults among the saved exchanges, with a row open", async () => {
    await renderSaved("One", "Two");
    fireEvent.click(savedRow("Two"));

    expect(await accessibilityFaults()).toEqual([]);
  });

  // A message may be in any language. Marked unknown, it isn't read in a
  // Catalan voice. Replies are left to the page, which is in Catalan and isn't
  // rendered here.
  test("marks a message in the conversation as of unknown language, and not its reply", async () => {
    await renderStarted();
    await send("Good morning");

    expect(screen.getByText("Good morning").closest("[lang]")?.getAttribute("lang")).toBe("");
    expect(screen.getByText("Bon dia!").closest("[lang]")).toBeNull();
  });

  test("marks a saved message as of unknown language, closed and open, and not its reply", async () => {
    await renderSaved("Good morning");
    expect(savedRow("Good morning").closest("[lang]")?.getAttribute("lang")).toBe("");

    fireEvent.click(savedRow("Good morning"));
    expect(savedRow("Good morning").closest("[lang]")?.getAttribute("lang")).toBe("");
    expect(screen.getByText("Resposta a Good morning").closest("[lang]")).toBeNull();
  });
});

describe("the offer from the keyboard", () => {
  test("opens and closes from a button beside the reply, which says whether it is open", async () => {
    await renderStarted();
    expect(offerIsOpen("Hola!")).toBe(false);

    fireEvent.click(optionsButton("Hola!"));
    expect(offerIsOpen("Hola!")).toBe(true);
    const offer = document.getElementById(optionsButton("Hola!").getAttribute("aria-controls")!)!;
    expect(within(offer).getByRole("button", { name: LISTEN_BUTTON })).toBeTruthy();

    fireEvent.click(optionsButton("Hola!"));
    expect(offerIsOpen("Hola!")).toBe(false);
    expect(screen.queryByRole("button", { name: LISTEN_BUTTON })).toBeNull();
  });

  test("leaves focus on its button, with the offer next in the tab order", async () => {
    await renderStarted();
    optionsButton("Hola!").focus();

    fireEvent.click(optionsButton("Hola!"));

    expect(document.activeElement).toBe(optionsButton("Hola!"));
    const position = optionsButton("Hola!").compareDocumentPosition(
      screen.getByRole("button", { name: LISTEN_BUTTON }),
    );
    expect(position & Node.DOCUMENT_POSITION_FOLLOWING).not.toBe(0);
  });

  test("says when it is opened by tapping the reply", async () => {
    await renderStarted();

    tap("Hola!");

    expect(offerIsOpen("Hola!")).toBe(true);
  });

  test("closes on Escape from inside the offer, and returns focus to its button", async () => {
    await renderStarted();
    fireEvent.click(optionsButton("Hola!"));
    const listen = screen.getByRole("button", { name: LISTEN_BUTTON });
    listen.focus();

    pressEscape(listen);

    expect(offerIsOpen("Hola!")).toBe(false);
    expect(document.activeElement).toBe(optionsButton("Hola!"));
  });

  test("closes on Escape from its button", async () => {
    await renderStarted();
    optionsButton("Hola!").focus();
    fireEvent.click(optionsButton("Hola!"));

    pressEscape(optionsButton("Hola!"));

    expect(offerIsOpen("Hola!")).toBe(false);
    expect(document.activeElement).toBe(optionsButton("Hola!"));
  });

  test("closes when focus moves away from the offer and its button", async () => {
    await renderStarted();
    fireEvent.click(optionsButton("Hola!"));
    screen.getByRole("button", { name: LISTEN_BUTTON }).focus();

    act(() => input().focus());

    expect(offerIsOpen("Hola!")).toBe(false);
  });

  test("stays open while focus moves between its button and the offer", async () => {
    await renderStarted();
    optionsButton("Hola!").focus();
    fireEvent.click(optionsButton("Hola!"));

    act(() => screen.getByRole("button", { name: LISTEN_BUTTON }).focus());
    act(() => optionsButton("Hola!").focus());

    expect(offerIsOpen("Hola!")).toBe(true);
  });

  test("moves to another reply whose button is pressed", async () => {
    await renderStarted();
    await send("Hello");
    fireEvent.click(optionsButton("Hola!"));

    fireEvent.click(optionsButton("Bon dia!"));

    expect(offerIsOpen("Hola!")).toBe(false);
    expect(offerIsOpen("Bon dia!")).toBe(true);
  });

  test("is pressed without the press closing the offer as a press elsewhere would", async () => {
    await renderStarted();
    fireEvent.click(optionsButton("Hola!"));

    fireEvent.pointerDown(optionsButton("Hola!"));
    fireEvent.click(optionsButton("Hola!"));

    // One press, one toggle: closed, not closed and opened again.
    expect(offerIsOpen("Hola!")).toBe(false);
  });

  test("is not there beside a reply that has nothing to offer", async () => {
    health = new Response("Unavailable", { status: 503 });
    await renderStarted();
    await settle();

    const row = screen.getByText("Hola!").closest("[data-reply]") as HTMLElement;
    expect(within(row).queryByRole("button", { name: OPTIONS_BUTTON })).toBeNull();
  });

  test("stays beside a reply whose offer is open, even once the reply is speaking", async () => {
    await renderStarted();
    fireEvent.click(optionsButton("Hola!"));

    await clickListen();

    expect(offerIsOpen("Hola!")).toBe(true);
  });

  // Closed, the greeting being spoken has nothing to offer but its mute
  // button, so the button beside it goes.
  test("closes on Escape onto the mute button when it then has nothing to offer", async () => {
    await renderStarted();
    fireEvent.click(optionsButton("Hola!"));
    await clickListen();

    pressEscape(replyMute()!);

    const row = screen.getByText("Hola!").closest("[data-reply]") as HTMLElement;
    expect(within(row).queryByRole("button", { name: OPTIONS_BUTTON })).toBeNull();
    expect(document.activeElement).toBe(replyMute());
  });

  test("can't be pressed while a reply is being written", async () => {
    await renderStarted();
    coldStart();
    await send("Hello");

    expect(optionsButton("Hola!").disabled).toBe(true);
  });

  test("finds no accessibility faults with the offer open", async () => {
    await renderStarted();
    await send("Hello");
    fireEvent.click(optionsButton("Bon dia!"));

    expect(await accessibilityFaults()).toEqual([]);
  });
});

describe("what the chat says to a screen reader", () => {
  test("keeps the conversation as a log of messages and replies", async () => {
    await renderStarted();
    await send("Hello");

    const log = screen.getByRole("log");
    expect(within(log).getByText("Hello")).toBeTruthy();
    expect(within(log).getByText("Bon dia!")).toBeTruthy();
  });

  test("marks the conversation busy while a reply is written, and not once it ends", async () => {
    await renderStarted();
    expect(conversationIsBusy()).toBe(false);

    const arrive = coldStart();
    await send("Hello");
    expect(conversationIsBusy()).toBe(true);

    await arrive(reply("Bon dia!"));
    expect(conversationIsBusy()).toBe(false);
  });

  test("marks the conversation busy while the greeting is written", async () => {
    const arrive = coldStart();
    render(<Chat initiallyUnlocked />);
    await clickStart();
    expect(conversationIsBusy()).toBe(true);

    await arrive(reply("Hola!"));
    expect(conversationIsBusy()).toBe(false);
  });

  test("doesn't leave the conversation busy when a reply fails", async () => {
    await renderStarted();
    answer = failure("Bad gateway");

    await send("Hello");

    expect(conversationIsBusy()).toBe(false);
  });

  test("doesn't leave the conversation busy after a visit to the saved exchanges", async () => {
    await renderStarted();
    await send("Hello");
    openSaved();
    backToChat();

    expect(conversationIsBusy()).toBe(false);
  });

  test("announces that the model is waking", async () => {
    coldStart();
    render(<Chat initiallyUnlocked />);

    await clickStart();

    expect(isAnnouncedAsStatus(WAKE_MESSAGE)).toBe(true);
  });

  test("announces that the model is thinking", async () => {
    await renderStarted();
    coldStart();

    await send("Hello");

    expect(isAnnouncedAsStatus("Pensant…")).toBe(true);
  });

  test("announces that a reply was cut short", async () => {
    await renderStarted();
    answer = cutShort("Hi havia una vegada un");

    await send("Explica'm un conte");

    expect(isAnnouncedAsStatus(CUT_SHORT)).toBe(true);
  });
});

describe("a reply that can't be had", () => {
  function retry() {
    return screen.getByRole("button", { name: RETRY_BUTTON });
  }

  async function pressRetry() {
    await act(async () => {
      fireEvent.click(retry());
    });
    await settle();
  }

  test("says in Catalan that the network couldn't be reached", async () => {
    await renderStarted();
    answer = Promise.reject(new TypeError("Failed to fetch"));

    await send("Hello");

    expect(screen.getByText(NO_CONNECTION)).toBeTruthy();
    expect(screen.queryByText(/Failed to fetch/)).toBeNull();
  });

  test("says in Catalan that the model couldn't reply, never what the server said", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    await renderStarted();
    answer = failure("Upstream error");

    await send("Hello");

    expect(screen.getByText(NO_REPLY)).toBeTruthy();
    expect(screen.queryByText(/Upstream error/)).toBeNull();
  });

  test("still logs what went wrong", async () => {
    const log = vi.spyOn(console, "error").mockImplementation(() => {});
    await renderStarted();
    answer = failure("Upstream error");

    await send("Hello");

    expect(log.mock.calls.flat().map(String).join(" ")).toContain("Upstream error");
  });

  test("says it in a region that is announced at once", async () => {
    await renderStarted();
    answer = failure("Upstream error");

    await send("Hello");

    const alert = screen.getByRole("alert");
    expect(within(alert).getByText(NO_REPLY)).toBeTruthy();
    expect(within(alert).getByRole("button", { name: RETRY_BUTTON })).toBeTruthy();
  });

  test("asks again for the reply to the last message, without repeating it", async () => {
    await renderStarted();
    answer = failure("Upstream error");
    await send("Hello");

    answer = reply("Bon dia!");
    await pressRetry();

    expect(screen.getByText("Bon dia!")).toBeTruthy();
    expect(screen.queryByText(NO_REPLY)).toBeNull();
    expect(screen.getAllByText("Hello")).toHaveLength(1);
    expect(sentConversations().at(-1)!.map(({ content }: { content: string }) => content)).toEqual([
      GREETING,
      "Hola!",
      "Hello",
    ]);
  });

  test("asks again for a reply that failed partway, leaving none of the failed one", async () => {
    await renderStarted();
    answer = createUIMessageStreamResponse({
      stream: createUIMessageStream({
        execute({ writer }) {
          writer.write({ type: "start" });
          writer.write({ type: "text-start", id: "t" });
          writer.write({ type: "text-delta", id: "t", delta: "Bon d" });
          writer.write({ type: "error", errorText: "Upstream error" });
        },
      }),
    });
    await send("Hello");

    answer = reply("Bon dia!");
    await pressRetry();

    expect(screen.getByText("Bon dia!")).toBeTruthy();
    expect(screen.queryByText("Bon d")).toBeNull();
  });

  test("puts the keyboard in the message field once it asks again", async () => {
    await renderStarted();
    answer = failure("Upstream error");
    await send("Hello");
    retry().focus();

    await pressRetry();

    expect(document.activeElement).toBe(input());
  });

  test("asks again for a translation as a translation", async () => {
    await renderStarted();
    fireEvent.click(translateToggle());
    answer = failure("Upstream error");
    await send("Good morning");
    fireEvent.click(translateToggle());

    answer = reply("Bon dia");
    await pressRetry();

    expect(sentTranslateFlags().at(-1)).toBe(true);
  });

  test("offers no retry when the greeting fails, which has its own way to start again", async () => {
    answer = failure("Upstream error");
    render(<Chat initiallyUnlocked />);

    await clickStart();

    expect(screen.getByText(NO_REPLY)).toBeTruthy();
    expect(screen.queryByRole("button", { name: RETRY_BUTTON })).toBeNull();
    expect(screen.getByRole("button", { name: START_BUTTON })).toBeTruthy();
  });

  test("finds no accessibility faults with an error shown", async () => {
    await renderStarted();
    answer = failure("Upstream error");
    await send("Hello");

    expect(await accessibilityFaults()).toEqual([]);
  });
});

describe("undoing a deletion", () => {
  function deleteSaved(message: string) {
    fireEvent.click(savedRow(message));
    fireEvent.click(savedRowButton(message, DELETE_BUTTON));
  }

  function undo() {
    fireEvent.click(screen.getByRole("button", { name: UNDO_BUTTON }));
  }

  test("says the saved exchange was deleted, in a region that is announced, with a way to undo it", async () => {
    await renderSaved("One", "Two");

    deleteSaved("One");

    const notice = screen.getAllByRole("status").find((status) => status.textContent?.includes(DELETED))!;
    expect(within(notice).getByRole("button", { name: UNDO_BUTTON })).toBeTruthy();
  });

  test("still moves the keyboard to the row that takes the deleted one's place", async () => {
    await renderSaved("One", "Two", "Three");

    deleteSaved("Two");

    expect(document.activeElement).toBe(savedRow("Three"));
  });

  test("puts the saved exchange back where it was, and the notice goes", async () => {
    await renderSaved("One", "Two", "Three");
    deleteSaved("Two");

    undo();

    expect(savedMessages()).toEqual(["One", "Two", "Three"]);
    expect(screen.queryByText(DELETED)).toBeNull();
    expect(document.activeElement).toBe(savedRow("Two"));
  });

  test("puts it back at the end when the list has since become shorter than its place", async () => {
    await renderSaved("One", "Two", "Three");
    deleteSaved("Three");
    changeInAnotherTab((exchanges) => exchanges.filter((one) => one.message !== "One"));
    hearOfAnotherTab();

    undo();

    expect(savedMessages()).toEqual(["Two", "Three"]);
  });

  test("survives a later session once undone", async () => {
    await renderSaved("One", "Two");
    deleteSaved("One");
    undo();

    cleanup();
    render(<Chat initiallyUnlocked />);
    openSaved();

    expect(savedMessages()).toEqual(["One", "Two"]);
  });

  test("lets only the newest deletion be undone", async () => {
    await renderSaved("One", "Two", "Three");
    deleteSaved("One");
    deleteSaved("Three");

    expect(screen.getAllByRole("button", { name: UNDO_BUTTON })).toHaveLength(1);
    undo();

    expect(savedMessages()).toEqual(["Two", "Three"]);
  });

  test("is no longer offered once the list is left", async () => {
    await renderSaved("One", "Two");
    deleteSaved("One");

    backToChat();
    openSaved();

    expect(screen.queryByRole("button", { name: UNDO_BUTTON })).toBeNull();
    expect(screen.queryByText(DELETED)).toBeNull();
  });

  test("is offered even when the last saved exchange was deleted", async () => {
    await renderSaved("One");

    deleteSaved("One");
    expect(screen.getByText(NOTHING_SAVED)).toBeTruthy();
    undo();

    expect(savedMessages()).toEqual(["One"]);
  });

  test("changes nothing when the exchange has been saved again meanwhile", async () => {
    await renderSaved("One", "Two");
    deleteSaved("One");
    changeInAnotherTab((exchanges) => [...exchanges, { message: "One", reply: "Resposta a One" }]);
    hearOfAnotherTab();

    undo();

    expect(savedMessages()).toEqual(["Two", "One"]);
  });

  test("still puts the keyboard on the row at its place when it was saved again meanwhile", async () => {
    await renderSaved("One", "Two");
    deleteSaved("One");
    changeInAnotherTab((exchanges) => [{ message: "One", reply: "Resposta a One" }, ...exchanges]);
    hearOfAnotherTab();

    undo();

    expect(document.activeElement).toBe(savedRow("One"));
  });

  test("says so when the saved exchange can't be put back", async () => {
    await renderSaved("One", "Two");
    deleteSaved("One");
    refuseWrites();

    undo();

    expect(screen.getByText(RESTORE_FAILURE)).toBeTruthy();
    expect(savedMessages()).toEqual(["Two"]);
  });

  test("finds no accessibility faults with the notice shown", async () => {
    await renderSaved("One", "Two");
    deleteSaved("One");

    expect(await accessibilityFaults()).toEqual([]);
  });
});
