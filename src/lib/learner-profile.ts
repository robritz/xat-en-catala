// The learner profile: the language the user reads best and how well they
// know Catalan. Read in the browser and checked again on the server, which
// builds the model's instructions from it.

// The native languages offered, each named in its own language and in
// English, the language the model's instructions are written in.
export const NATIVE_LANGUAGES = [
  { code: "en", name: "English", englishName: "English" },
  { code: "es", name: "Español", englishName: "Spanish" },
  { code: "eu", name: "Euskara", englishName: "Basque" },
  { code: "gl", name: "Galego", englishName: "Galician" },
  { code: "fr", name: "Français", englishName: "French" },
  { code: "de", name: "Deutsch", englishName: "German" },
] as const;

export const LEVELS = ["A1", "A2", "B1", "B2", "C1", "C2"] as const;

export type NativeLanguage = (typeof NATIVE_LANGUAGES)[number]["code"];
export type Level = (typeof LEVELS)[number];
export type LearnerProfile = { nativeLanguage: NativeLanguage; level: Level };

function isNativeLanguage(value: unknown): value is NativeLanguage {
  return NATIVE_LANGUAGES.some(({ code }) => code === value);
}

function isLevel(value: unknown): value is Level {
  return LEVELS.some((level) => level === value);
}

// Returns null for anything but a native language and a level from the lists.
export function toLearnerProfile(value: unknown): LearnerProfile | null {
  const profile = value as Partial<LearnerProfile> | null;
  if (!isNativeLanguage(profile?.nativeLanguage) || !isLevel(profile.level)) return null;
  return { nativeLanguage: profile.nativeLanguage, level: profile.level };
}

export function englishName(language: NativeLanguage): string {
  return NATIVE_LANGUAGES.find(({ code }) => code === language)!.englishName;
}

// Kept in the browser's localStorage, on the user's device only.
const KEY = "learner-profile";
const VERSION = 1;

function parse(stored: string | null): LearnerProfile | null {
  try {
    const value = JSON.parse(stored ?? "null");
    return value?.version === VERSION ? toLearnerProfile(value) : null;
  } catch {
    return null;
  }
}

// The profile as last read, kept so that reading it twice without a change in
// between gives the same object. React needs that of a store it subscribes to.
let lastRead: { stored: string | null; profile: LearnerProfile | null } = {
  stored: null,
  profile: null,
};

// The stored profile, or null if there is none this version wrote, or the
// browser won't let storage be read.
export function storedLearnerProfile(): LearnerProfile | null {
  let stored: string | null;
  try {
    stored = localStorage.getItem(KEY);
  } catch {
    return null;
  }
  if (stored !== lastRead.stored) lastRead = { stored, profile: parse(stored) };
  return lastRead.profile;
}

// What is read on the server, where there is no storage: not yet known.
export function unreadLearnerProfile(): undefined {
  return undefined;
}

// The profile changes only when this tab stores one, and it is read again
// then, so there is nothing to listen for.
export function subscribeToLearnerProfile(): () => void {
  return () => {};
}

// A profile the browser refuses to store is left unstored, and asked for
// again on the next visit.
export function storeLearnerProfile(profile: LearnerProfile) {
  try {
    localStorage.setItem(KEY, JSON.stringify({ version: VERSION, ...profile }));
  } catch {}
}
