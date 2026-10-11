import { createUIMessageStreamResponse, streamText, toUIMessageStream } from "ai";
import { toModelMessages, translationRequest } from "@/lib/chat";
import { chatModel, SIGN_OFFS, SYSTEM_PROMPT, TRANSLATION_PROMPT } from "@/lib/runpod";
import type { ReplyUsage } from "@/lib/token-usage";
import { isUnlocked } from "@/lib/unlock";

// The request stays open while a cold worker starts, which can take minutes.
export const maxDuration = 300;

export async function POST(request: Request) {
  if (!(await isUnlocked())) {
    return new Response("Locked", { status: 401 });
  }

  const body = await request.json().catch(() => null);
  const conversation = toModelMessages(body?.messages);
  if (!conversation) {
    return new Response("Invalid messages", { status: 400 });
  }
  // A translation is made of the newest message alone, without the conversation.
  const translation = translationRequest(body.messages);

  try {
    const result = streamText({
      model: chatModel(),
      instructions: translation ? TRANSLATION_PROMPT : SYSTEM_PROMPT,
      messages: translation ?? conversation,
      // A translation may be of a text that ends with a sign-off.
      stopSequences: translation ? undefined : SIGN_OFFS,
      onError: ({ error }) => console.error(error),
    });
    return createUIMessageStreamResponse({
      stream: toUIMessageStream({
        stream: result.stream,
        // Don't leak upstream details to the browser.
        onError: () => "Upstream error",
        // Nothing is said of a reply the endpoint didn't count the tokens of.
        messageMetadata: ({ part }) => {
          if (part.type !== "finish") return undefined;
          const { inputTokens, outputTokens } = part.totalUsage;
          if (inputTokens === undefined || outputTokens === undefined) return undefined;
          const usage: ReplyUsage = { inputTokens, outputTokens, translation: translation !== null };
          return { usage };
        },
      }),
    });
  } catch (err) {
    console.error(err);
    return new Response("Upstream error", { status: 502 });
  }
}
