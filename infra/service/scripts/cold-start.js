// Reads a reply, as streamReply yields it, until its first words arrive, and
// says how many seconds that took, to a tenth. A reply with no words, an error
// from the host, or a signal that ran out first is a failure, named for the
// log. The signal is the one the request was sent with, so its running out is
// the target being missed.

export async function timeFirstWord({
  replies,
  signal,
  targetSeconds,
  now = () => performance.now(),
}) {
  const sentAt = now();
  try {
    for await (const piece of replies) {
      if (piece.words) {
        const seconds = Number(((now() - sentAt) / 1000).toFixed(1));
        return { seconds, failure: null };
      }
    }
    return { seconds: null, failure: "The reply had no words." };
  } catch (error) {
    return {
      seconds: null,
      failure: signal.aborted
        ? `No reply within ${targetSeconds} seconds.`
        : error.message,
    };
  }
}
