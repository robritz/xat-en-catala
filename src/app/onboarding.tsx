"use client";

import { useEffect, useId, useRef, useState } from "react";
import {
  type LearnerProfile,
  LEVELS,
  type Level,
  NATIVE_LANGUAGES,
  type NativeLanguage,
} from "@/lib/learner-profile";

const CHOICE_STYLE = "rounded-full border border-rule px-4 py-2 hover:bg-surface";
// Each level's radio is hidden, so its label shows which is chosen and where
// the focus is.
const LEVEL_STYLE = `${CHOICE_STYLE} has-checked:bg-accent has-checked:text-white has-focus-visible:outline-2 has-focus-visible:outline-offset-2 has-focus-visible:outline-accent`;

// Asks a first-time user for their native language, then their level.
// Both questions are in Catalan with English beneath, as the language a
// user without Catalan is most likely to read.
export default function Onboarding({ onFinish }: { onFinish: (profile: LearnerProfile) => void }) {
  const [nativeLanguage, setNativeLanguage] = useState<NativeLanguage | null>(null);
  const [level, setLevel] = useState<Level | null>(null);
  const firstLevelRef = useRef<HTMLInputElement>(null);
  const id = useId();

  // The focus was on the language chosen, which is gone.
  useEffect(() => {
    if (nativeLanguage) firstLevelRef.current?.focus();
  }, [nativeLanguage]);

  if (!nativeLanguage) {
    return (
      <div role="group" aria-labelledby={`${id}-ca ${id}-en`} className="space-y-4 text-center">
        <div>
          <p id={`${id}-ca`} className="font-medium">
            Quina llengua llegeixes millor?
          </p>
          <p id={`${id}-en`} lang="en" className="text-sm text-muted">
            Which language do you read best?
          </p>
        </div>
        <div className="flex flex-wrap justify-center gap-2">
          {NATIVE_LANGUAGES.map(({ code, name }) => (
            <button key={code} onClick={() => setNativeLanguage(code)} className={CHOICE_STYLE}>
              {name}
            </button>
          ))}
        </div>
      </div>
    );
  }

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        if (level) onFinish({ nativeLanguage, level });
      }}
      className="space-y-4 text-center"
    >
      <div role="radiogroup" aria-labelledby={`${id}-ca ${id}-en`} className="space-y-4">
        <div>
          <p id={`${id}-ca`} className="font-medium">
            Quin és el teu nivell de català?
          </p>
          <p id={`${id}-en`} lang="en" className="text-sm text-muted">
            What is your level of Catalan?
          </p>
        </div>
        <div className="flex flex-wrap justify-center gap-2">
          {LEVELS.map((value, i) => (
            <label key={value} className={LEVEL_STYLE}>
              <input
                ref={i === 0 ? firstLevelRef : undefined}
                type="radio"
                name="level"
                value={value}
                checked={level === value}
                onChange={() => setLevel(value)}
                className="sr-only"
              />
              {value}
            </label>
          ))}
        </div>
      </div>
      <button
        type="submit"
        disabled={!level}
        className="rounded-full bg-accent px-5 py-2 font-medium text-white disabled:opacity-40"
      >
        Comença{" "}
        <span lang="en" className="block text-xs font-normal">
          Start
        </span>
      </button>
    </form>
  );
}
