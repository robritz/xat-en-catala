"use client";

import { useEffect, useId, useRef, useState } from "react";
import {
  type LearnerProfile,
  LEVELS,
  type Level,
  NATIVE_LANGUAGES,
  type NativeLanguage,
} from "@/lib/learner-profile";
import { LEVEL_STEP_TEXT } from "./onboarding-text";

const CHOICE_STYLE = "rounded-full border border-rule px-4 py-2 hover:bg-surface";
// Each level's radio is hidden, so its label shows which is chosen and where
// the focus is.
const LEVEL_STYLE = `flex items-baseline gap-3 rounded-2xl border border-rule px-4 py-2 text-left hover:bg-surface has-checked:bg-accent has-checked:text-white has-focus-visible:outline-2 has-focus-visible:outline-offset-2 has-focus-visible:outline-accent`;

// Asks a first-time user for their native language, then their level. The
// first question is in Catalan with English beneath, as the language a user
// without Catalan is most likely to read; the second is in the language chosen.
export default function Onboarding({ onFinish }: { onFinish: (profile: LearnerProfile) => void }) {
  const [nativeLanguage, setNativeLanguage] = useState<NativeLanguage | null>(null);
  const [level, setLevel] = useState<Level | null>(null);
  // Whether the level step is shown. Going back keeps the language chosen.
  const [askingLevel, setAskingLevel] = useState(false);
  const firstLevelRef = useRef<HTMLInputElement>(null);
  const chosenLanguageRef = useRef<HTMLButtonElement>(null);
  const shown = useRef(false);
  const id = useId();

  // The button that moved between the steps is gone, so the focus is moved to
  // the step shown. Nothing is focused when onboarding first appears.
  useEffect(() => {
    if (!shown.current) {
      shown.current = true;
      return;
    }
    if (askingLevel) firstLevelRef.current?.focus();
    else chosenLanguageRef.current?.focus();
  }, [askingLevel]);

  if (!nativeLanguage || !askingLevel) {
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
            <button
              key={code}
              ref={code === nativeLanguage ? chosenLanguageRef : undefined}
              lang={code}
              onClick={() => {
                setNativeLanguage(code);
                setAskingLevel(true);
              }}
              aria-pressed={code === nativeLanguage}
              className={`${CHOICE_STYLE} aria-pressed:border-accent`}
            >
              {name}
            </button>
          ))}
        </div>
      </div>
    );
  }

  const text = LEVEL_STEP_TEXT[nativeLanguage];
  return (
    <form
      lang={nativeLanguage}
      onSubmit={(e) => {
        e.preventDefault();
        if (level) onFinish({ nativeLanguage, level });
      }}
      className="space-y-4"
    >
      <div role="radiogroup" aria-labelledby={`${id}-level`} className="space-y-4">
        <p id={`${id}-level`} className="text-center font-medium">
          {text.question}
        </p>
        <div className="flex flex-col gap-2">
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
              <span className="font-medium">{value}</span> <span>{text.levels[value]}</span>
            </label>
          ))}
        </div>
      </div>
      <div className="flex justify-center gap-3">
        <button type="button" onClick={() => setAskingLevel(false)} className={CHOICE_STYLE}>
          {text.back}
        </button>
        <button
          type="submit"
          disabled={!level}
          className="rounded-full bg-accent px-5 py-2 font-medium text-white disabled:opacity-40"
        >
          {text.start}
        </button>
      </div>
    </form>
  );
}
