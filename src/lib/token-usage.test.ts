import { beforeEach, expect, test, vi } from "vitest";
import { recordReplyUsage, resetTokenUsage, subscribeToTokenUsage, tokenUsage } from "./token-usage";

beforeEach(resetTokenUsage);

test("a conversation with no replies has cost nothing", () => {
  expect(tokenUsage()).toEqual({ conversationTokens: 0, inputTokens: 0, outputTokens: 0 });
});

test("a reply makes the conversation as long as what was read and written for it", () => {
  recordReplyUsage({ inputTokens: 12, outputTokens: 5, translation: false });
  expect(tokenUsage()).toEqual({ conversationTokens: 17, inputTokens: 12, outputTokens: 5 });
});

test("each reply reads the conversation again, so its length is the newest reply's", () => {
  recordReplyUsage({ inputTokens: 12, outputTokens: 5, translation: false });
  recordReplyUsage({ inputTokens: 30, outputTokens: 8, translation: false });
  expect(tokenUsage()).toEqual({ conversationTokens: 38, inputTokens: 42, outputTokens: 13 });
});

test("a translation adds to the conversation it was made without reading", () => {
  recordReplyUsage({ inputTokens: 30, outputTokens: 8, translation: false });
  recordReplyUsage({ inputTokens: 20, outputTokens: 6, translation: true });
  expect(tokenUsage()).toEqual({ conversationTokens: 64, inputTokens: 50, outputTokens: 14 });
});

test("resetting starts the count afresh", () => {
  recordReplyUsage({ inputTokens: 12, outputTokens: 5, translation: false });
  resetTokenUsage();
  expect(tokenUsage()).toEqual({ conversationTokens: 0, inputTokens: 0, outputTokens: 0 });
});

test("tells its subscribers of each change until they stop listening", () => {
  const listener = vi.fn();
  const stop = subscribeToTokenUsage(listener);
  recordReplyUsage({ inputTokens: 12, outputTokens: 5, translation: false });
  resetTokenUsage();
  expect(listener).toHaveBeenCalledTimes(2);

  stop();
  recordReplyUsage({ inputTokens: 12, outputTokens: 5, translation: false });
  expect(listener).toHaveBeenCalledTimes(2);
});

test("reads as the same object until it changes", () => {
  recordReplyUsage({ inputTokens: 12, outputTokens: 5, translation: false });
  const before = tokenUsage();
  expect(tokenUsage()).toBe(before);
  recordReplyUsage({ inputTokens: 30, outputTokens: 8, translation: false });
  expect(tokenUsage()).not.toBe(before);
});
