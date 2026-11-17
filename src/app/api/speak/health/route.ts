import { isSpeechAvailable } from "@/lib/tts";
import { isUnlocked } from "@/lib/unlock";

// Waking the TTS API from a cold start takes a while; the health check waits
// up to HEALTH_TIMEOUT_MS for it.
export const maxDuration = 70;

export async function GET() {
  if (!(await isUnlocked())) {
    return new Response("Locked", { status: 401 });
  }
  return (await isSpeechAvailable())
    ? new Response("OK")
    : new Response("Unavailable", { status: 503 });
}
