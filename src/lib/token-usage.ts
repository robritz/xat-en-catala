// The tokens the conversation has cost so far, as the model counted them
// with each reply. Kept outside any component, so that all of them can read
// it, and gone when the page is closed.

import { useSyncExternalStore } from "react";

// What a reply cost: the tokens the model read to write it, and the tokens
// it wrote. A translation is made of one message alone, so what was read for
// it leaves out the rest of the conversation.
export type ReplyUsage = { inputTokens: number; outputTokens: number; translation: boolean };

export type TokenUsage = {
  // How long the conversation is: what the model has to read of it before
  // the next message. This is what fills the context window.
  conversationTokens: number;
  // All that the model has read and written over the conversation. Each
  // reply reads the conversation again, so these outgrow its length.
  inputTokens: number;
  outputTokens: number;
};

const NONE: TokenUsage = { conversationTokens: 0, inputTokens: 0, outputTokens: 0 };

let usage = NONE;

const listeners = new Set<() => void>();

function change(next: TokenUsage) {
  usage = next;
  listeners.forEach((listener) => listener());
}

// The usage of the conversation so far. The same object until it changes.
export function tokenUsage(): TokenUsage {
  return usage;
}

// What the server renders: no conversation has begun there.
function noTokenUsage(): TokenUsage {
  return NONE;
}

// Calls the listener whenever the usage changes. Returns a function that
// stops it.
export function subscribeToTokenUsage(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

// Counts a reply that has arrived in the conversation.
export function recordReplyUsage(reply: ReplyUsage) {
  const replyTokens = reply.inputTokens + reply.outputTokens;
  change({
    // Whatever else was read for a reply was the whole conversation before
    // it. A translation joins the conversation without having read it; its
    // prompt is counted too, so this errs on the long side.
    conversationTokens: reply.translation ? usage.conversationTokens + replyTokens : replyTokens,
    inputTokens: usage.inputTokens + reply.inputTokens,
    outputTokens: usage.outputTokens + reply.outputTokens,
  });
}

// Starts counting afresh, as a new conversation does.
export function resetTokenUsage() {
  if (usage !== NONE) change(NONE);
}

// The usage of the conversation so far, kept up to date as replies arrive.
export function useTokenUsage(): TokenUsage {
  return useSyncExternalStore(subscribeToTokenUsage, tokenUsage, noTokenUsage);
}
