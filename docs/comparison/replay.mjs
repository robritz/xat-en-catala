// Sends the comparison messages to a running copy of the app, one at a time,
// and prints its replies as Markdown. The app decides which model host
// answers, by its MODEL_HOST_URL. See README.md beside this file.

import { readFile } from "node:fs/promises";

const [host] = process.argv.slice(2);
const appUrl = (process.env.APP_URL || "http://localhost:3000").replace(/\/+$/, "");
const phrase = process.env.CHAT_SECRET_PHRASE;
if (!host || !phrase) {
  console.error('Usage: node --env-file=.env.local docs/comparison/replay.mjs "<name of the model host>"');
  console.error("CHAT_SECRET_PHRASE must be set. APP_URL defaults to http://localhost:3000.");
  process.exit(1);
}

const unlock = await fetch(`${appUrl}/api/unlock`, {
  method: "POST",
  body: JSON.stringify({ phrase }),
});
if (!unlock.ok) throw new Error(`The app refused the secret phrase: ${unlock.status}`);
const cookie = unlock.headers.getSetCookie().map((c) => c.split(";")[0]).join("; ");

// Sends a message as the chat does: on its own, marked for translation or not.
async function reply({ message, as }) {
  const res = await fetch(`${appUrl}/api/chat`, {
    method: "POST",
    headers: { cookie },
    body: JSON.stringify({
      messages: [
        {
          id: "1",
          role: "user",
          parts: [{ type: "text", text: message }],
          ...(as === "translation" && { metadata: { translate: true } }),
        },
      ],
    }),
  });
  if (!res.ok) throw new Error(`The app answered ${res.status}: ${await res.text()}`);
  let text = "";
  let usage;
  for (const line of (await res.text()).split("\n")) {
    if (!line.startsWith("data: {")) continue;
    const part = JSON.parse(line.slice("data: ".length));
    if (part.type === "text-delta") text += part.delta;
    if (part.type === "error") throw new Error(`The reply failed: ${part.errorText}`);
    if (part.type === "finish") usage = part.messageMetadata?.usage;
  }
  return { text, usage };
}

const quoted = (text) => text.split("\n").map((line) => `> ${line}`.trimEnd()).join("\n");

const messages = JSON.parse(await readFile(new URL("messages.json", import.meta.url), "utf8"));

console.log(`# Replies from ${host}\n`);
console.log(`Taken on ${new Date().toISOString().slice(0, 10)} from the model host "${host}".\n`);
for (const entry of messages) {
  const { text, usage } = await reply(entry);
  const tokens = usage ? `${usage.inputTokens} read, ${usage.outputTokens} written` : "not counted";
  console.log(`## ${entry.id}\n`);
  console.log(`${entry.covers}. Sent as ${entry.as}.\n`);
  console.log(`**Message**\n\n${quoted(entry.message)}\n`);
  console.log(`**Reply** (tokens: ${tokens})\n\n${quoted(text)}\n`);
}
