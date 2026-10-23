"use client";

import { useEffect, useRef, useState } from "react";
import {
  type LearnerProfile,
  LEVELS,
  type Level,
  NATIVE_LANGUAGES,
  type NativeLanguage,
} from "@/lib/learner-profile";

const CHOICE_STYLE = "rounded-full border border-rule px-4 py-2 hover:bg-surface";

// Asks a first-time learner for their native language, then their level.
// Both questions are in Catalan with English beneath, as the language a
// learner without Catalan is most likely to read.
export default function Onboarding({ onFinish }: { onFinish: (profile: LearnerProfile) => void }) {
  const [nativeLanguage, setNativeLanguage] = useState<NativeLanguage | null>(null);
  const [level, setLevel] = useState<Level | null>(null);
  const firstLevelRef = useRef<HTMLInputElement>(null);

  // The focus was on the language chosen, which is gone.
  useEffect(() => {
    if (nativeLanguage) firstLevelRef.current?.focus();
  }, [nativeLanguage]);

  if (!nativeLanguage) {
    return (
      <div role="group" aria-labelledby="native-language-question" className="space-y-4 text-center">
        <div>
          <p id="native-language-question" className="font-medium">
            Quina llengua llegeixes millor?
          </p>
          <p lang="en" className="text-sm text-muted">
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
      <div role="radiogroup" aria-labelledby="level-question" className="space-y-4">
        <div>
          <p id="level-question" className="font-medium">
            Quin és el teu nivell de català?
          </p>
          <p lang="en" className="text-sm text-muted">
            What is your level of Catalan?
          </p>
        </div>
        <div className="flex flex-wrap justify-center gap-2">
          {LEVELS.map((value, i) => (
            <label key={value} className={`${CHOICE_STYLE} has-checked:bg-accent has-checked:text-white`}>
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
        Comença
      </button>
    </form>
  );
}
