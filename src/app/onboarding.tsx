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

const BORDERED = "border border-rule px-4 py-2 hover:bg-surface";
const CHOICE_STYLE = `rounded-full ${BORDERED}`;
// Each level's radio is hidden, so its label shows which is chosen and where
// the focus is.
const LEVEL_STYLE = `flex items-baseline gap-3 rounded-2xl text-left ${BORDERED} has-checked:bg-accent has-checked:text-white has-focus-visible:outline-2 has-focus-visible:outline-offset-2 has-focus-visible:outline-accent`;

// Which question is asked. The level is asked once a native language is
// chosen, and going back to the first question keeps that choice.
type Step =
  | { asking: "native language"; nativeLanguage: NativeLanguage | null }
  | { asking: "level"; nativeLanguage: NativeLanguage };

// Asks a first-time user for their native language, then their level. The
// first question is in Catalan with English beneath, as the language a user
// without Catalan is most likely to read; the second is in the language chosen.
// Given a profile, it asks again to change it, with its answers chosen, and
// can be closed without changing anything.
export default function Onboarding({
  profile,
  onFinish,
  onClose,
}: {
  profile?: LearnerProfile;
  onFinish: (profile: LearnerProfile) => void;
  onClose?: () => void;
}) {
  const [step, setStep] = useState<Step>({
    asking: "native language",
    nativeLanguage: profile?.nativeLanguage ?? null,
  });
  const [level, setLevel] = useState<Level | null>(profile?.level ?? null);
  const levelRef = useRef<HTMLInputElement>(null);
  const chosenLanguageRef = useRef<HTMLButtonElement>(null);
  // Set when the user moves between the questions. The button they pressed
  // is gone, so the focus is moved to the question shown. On a first visit
  // nothing else moves it, so it stays where it was when onboarding appears.
  const movedStep = useRef(false);
  const id = useId();

  // Opened to change the profile, from a button that the questions now hide.
  useEffect(() => {
    if (profile) chosenLanguageRef.current?.focus();
    // Only as it opens.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!movedStep.current) return;
    movedStep.current = false;
    if (step.asking === "level") levelRef.current?.focus();
    else chosenLanguageRef.current?.focus();
  }, [step.asking]);

  function moveTo(next: Step) {
    movedStep.current = true;
    setStep(next);
  }

  return (
    <div
      onKeyDown={(e) => {
        if (e.key === "Escape" && onClose) onClose();
      }}
      className="space-y-4"
    >
      {step.asking === "native language" ? (
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
                ref={code === step.nativeLanguage ? chosenLanguageRef : undefined}
                lang={code}
                onClick={() => moveTo({ asking: "level", nativeLanguage: code })}
                aria-pressed={code === step.nativeLanguage}
                className={`${CHOICE_STYLE} aria-pressed:border-accent`}
              >
                {name}
              </button>
            ))}
          </div>
        </div>
      ) : (
        <LevelStep
          id={id}
          nativeLanguage={step.nativeLanguage}
          level={level}
          levelRef={levelRef}
          changing={profile !== undefined}
          onLevel={setLevel}
          onBack={() => moveTo({ asking: "native language", nativeLanguage: step.nativeLanguage })}
          onFinish={onFinish}
        />
      )}
      {onClose && (
        <div className="text-center">
          <button onClick={onClose} className="text-sm text-muted hover:text-foreground">
            Tanca
          </button>
        </div>
      )}
    </div>
  );
}

// The level question, in the native language chosen. Focus goes to the level
// chosen, or else the first.
function LevelStep({
  id,
  nativeLanguage,
  level,
  levelRef,
  changing,
  onLevel,
  onBack,
  onFinish,
}: {
  id: string;
  nativeLanguage: NativeLanguage;
  level: Level | null;
  levelRef: React.RefObject<HTMLInputElement | null>;
  changing: boolean;
  onLevel: (level: Level) => void;
  onBack: () => void;
  onFinish: (profile: LearnerProfile) => void;
}) {
  const text = LEVEL_STEP_TEXT[nativeLanguage];
  const focused = level ?? LEVELS[0];
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
          {LEVELS.map((value) => (
            <label key={value} className={LEVEL_STYLE}>
              <input
                ref={value === focused ? levelRef : undefined}
                type="radio"
                name="level"
                value={value}
                checked={level === value}
                onChange={() => onLevel(value)}
                className="sr-only"
              />
              <span className="font-medium">{value}</span> <span>{text.levels[value]}</span>
            </label>
          ))}
        </div>
      </div>
      <div className="flex justify-center gap-3">
        <button type="button" onClick={onBack} className={CHOICE_STYLE}>
          {text.back}
        </button>
        <button
          type="submit"
          disabled={!level}
          className="rounded-full bg-accent px-5 py-2 font-medium text-white disabled:opacity-40"
        >
          {changing ? text.save : text.start}
        </button>
      </div>
    </form>
  );
}
