// Sends the comparison messages to a running copy of the app, one at a time,
// and prints its replies as Markdown. The app decides which model host
// answers, by its MODEL_HOST_URL; the name given here only labels the output.
// See README.md beside this file.

import { readFile } from "node:fs/promises";

const [host] = process.argv.slice(2);
const appUrl = (process.env.APP_URL || "http://localhost:3000").replace(/\/+$/, "");
const phrase = process.env.CHAT_SECRET_PHRASE;
// A learner profile to send with each message, as "<native language>:<level>",
// such as "fr:A1". Without one, the messages are sent as by a user with none.
const profile = process.env.PROFILE?.match(/^([a-z]{2}):([ABC][12])$/);
if (!host || !phrase || (process.env.PROFILE && !profile)) {
  console.error('Usage: node --env-file=.env.local docs/comparison/replay.js "<name of the model host>"');
  console.error("CHAT_SECRET_PHRASE must be set. APP_URL defaults to http://localhost:3000.");
  console.error('PROFILE, if set, is "<native language>:<level>", such as "fr:A1".');
  process.exit(1);
}

const unlock = await fetch(`${appUrl}/api/unlock`, {
  method: "POST",
  body: JSON.stringify({ phrase }),
}).catch((cause) => {
  throw new Error(`The app could not be reached at ${appUrl}. Is it running?`, { cause });
});
if (!unlock.ok) throw new Error(`The app refused the secret phrase: ${unlock.status}`);
const cookie = unlock.headers.getSetCookie().map((c) => c.split(";")[0]).join("; ");

// Sends a message as the chat does: on its own, marked for translation or not.
async function send({ message, as }) {
  const res = await fetch(`${appUrl}/api/chat`, {
    method: "POST",
    headers: { cookie },
    body: JSON.stringify({
      ...(profile && { profile: { nativeLanguage: profile[1], level: profile[2] } }),
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
  if (!res.ok) throw new Error(`The app returned ${res.status}: ${await res.text()}`);
  let text = "";
  let usage;
  for (const line of (await res.text()).split("\n")) {
    if (!line.startsWith("data: {")) continue;
    const part = JSON.parse(line.slice("data: ".length));
    if (part.type === "text-delta") text += part.delta;
    if (part.type === "error") throw new Error(`The reply failed: ${part.errorText}`);
    if (part.type === "finish") usage = part.messageMetadata?.usage;
  }
  if (!text) throw new Error(`The reply to "${message}" came back empty`);
  return { text, usage };
}

const quoted = (text) => text.split("\n").map((line) => `> ${line}`.trimEnd()).join("\n");

// A translation ignores the profile, so only chat is sent with one.
const messages = JSON.parse(await readFile(new URL("messages.json", import.meta.url), "utf8")).filter(
  (entry) => !profile || entry.as === "chat",
);

// Nothing is printed until every reply is in, so a run that fails part of the
// way leaves no half-written file behind.
const sections = [
  profile ? `# Replies from ${host} at ${profile[2]} in ${profile[1]}` : `# Replies from ${host}`,
  `Taken on ${new Date().toISOString().slice(0, 10)} from the model host "${host}"` +
    (profile ? `, with the learner profile ${profile[1]}, ${profile[2]}.` : "."),
];
for (const entry of messages) {
  const { text, usage } = await send(entry);
  const tokens = usage ? `${usage.inputTokens} read, ${usage.outputTokens} written` : "not counted";
  sections.push(
    `## ${entry.id}`,
    `${entry.covers}. Sent as ${entry.as}.`,
    `**Message**\n\n${quoted(entry.message)}`,
    `**Reply** (tokens: ${tokens})\n\n${quoted(text)}`,
  );
}
console.log(sections.join("\n\n") + "\n");
