"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { markGameCompleted } from "../gameCompletions";
import { useGameWords } from "../gameWords";

function pickRandomWords(bank: string[], take: number): string[] {
  const nonEmpty = bank.map((w) => w.trim()).filter(Boolean);
  const copy = [...nonEmpty];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy.slice(0, Math.min(take, copy.length));
}

function getMissingCount(word: string, grade: string | null): number {
  let count: number;
  if (grade === "1") count = 1;
  else if (grade === "2") count = 2;
  else if (grade === "3") count = 3;
  else if (word.length < 6) count = 1;
  else if (word.length <= 9) count = 2;
  else count = 3;
  return Math.min(count, Math.max(1, Math.floor(word.length / 2)));
}

function pickBlankIndices(word: string, count: number): number[] {
  const indices = Array.from({ length: word.length }, (_, i) => i);
  for (let i = indices.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [indices[i], indices[j]] = [indices[j], indices[i]];
  }
  return indices.slice(0, count).sort((a, b) => a - b);
}

/* ------------------------------------------------------------------ */
/*  Components                                                         */
/* ------------------------------------------------------------------ */

function RulesDropdown() {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-label="How to play"
        className="flex h-8 w-8 cursor-pointer items-center justify-center rounded-full border border-zinc-300 bg-white text-sm font-semibold text-zinc-600 transition-colors hover:bg-zinc-100 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-400 dark:hover:bg-zinc-800"
      >
        ?
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-10" aria-hidden onClick={() => setOpen(false)} />
          <div className="absolute right-0 z-20 mt-2 w-72 rounded-xl border border-zinc-200 bg-white p-4 shadow-lg dark:border-zinc-700 dark:bg-zinc-900">
            <p className="mb-1 text-sm font-semibold text-zinc-900 dark:text-zinc-50">How to play</p>
            <ul className="space-y-1 text-xs text-zinc-600 dark:text-zinc-400">
              <li>• A word is shown with missing letters replaced by blanks.</li>
              <li>• Click a blank or use <strong>← →</strong> arrow keys to select it.</li>
              <li>• Type the correct letter — it auto-advances to the next blank.</li>
              <li>• Press <strong>Backspace</strong> to clear a blank or go back.</li>
              <li>• Once all blanks are filled, the answer is checked automatically.</li>
              <li>• Build a streak by getting answers right in a row!</li>
            </ul>
          </div>
        </>
      )}
    </div>
  );
}

function CongratsModal({
  score,
  total,
  bestStreak,
  onPlayAgain,
  onGoHome,
}: {
  score: number;
  total: number;
  bestStreak: number;
  onPlayAgain: () => void;
  onGoHome: () => void;
}) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="congrats-title"
    >
      <div className="w-full max-w-sm rounded-2xl bg-white px-8 py-10 text-center shadow-2xl dark:bg-zinc-900">
        <h2
          id="congrats-title"
          className="mb-2 text-2xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50"
        >
          Well Done!
        </h2>
        <p className="mb-1 text-base text-zinc-600 dark:text-zinc-400">
          You scored {score} out of {total}!
        </p>
        {bestStreak >= 2 && (
          <p className="mb-6 text-sm text-zinc-500 dark:text-zinc-500">
            Best streak: {bestStreak} in a row
          </p>
        )}
        <div className={`flex flex-col gap-3 sm:flex-row sm:justify-center ${bestStreak < 2 ? "mt-8" : ""}`}>
          <button
            type="button"
            onClick={onPlayAgain}
            className="inline-flex cursor-pointer items-center justify-center rounded-full bg-zinc-900 px-7 py-3 text-sm font-semibold text-white transition-colors hover:bg-zinc-700 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-300"
          >
            Play Again
          </button>
          <button
            type="button"
            onClick={onGoHome}
            className="inline-flex cursor-pointer items-center justify-center rounded-full border border-zinc-300 bg-white px-7 py-3 text-sm font-semibold text-zinc-900 transition-colors hover:bg-zinc-100 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-50 dark:hover:bg-zinc-800"
          >
            Game List
          </button>
        </div>
      </div>
    </div>
  );
}

type BlankState = "empty" | "filled" | "correct" | "wrong";

function LetterCell({
  char,
  isBlank,
  isActive,
  blankState,
  answer,
  onClick,
}: {
  char: string;
  isBlank: boolean;
  isActive: boolean;
  blankState: BlankState;
  answer: string;
  onClick?: () => void;
}) {
  if (!isBlank) {
    return (
      <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-zinc-100 text-xl font-bold uppercase text-zinc-800 dark:bg-zinc-800 dark:text-zinc-100 sm:h-14 sm:w-14 sm:text-2xl">
        {char}
      </div>
    );
  }

  let cellClasses =
    "flex h-12 w-12 items-center justify-center rounded-lg border-2 text-xl font-bold uppercase transition-all duration-150 cursor-pointer sm:h-14 sm:w-14 sm:text-2xl";

  if (blankState === "correct") {
    cellClasses += " border-green-500 bg-green-50 text-green-700 dark:border-green-400 dark:bg-green-950 dark:text-green-300";
  } else if (blankState === "wrong") {
    cellClasses += " border-red-500 bg-red-50 text-red-700 animate-shake dark:border-red-400 dark:bg-red-950 dark:text-red-300";
  } else if (isActive) {
    cellClasses += " border-blue-500 bg-blue-50 text-zinc-900 ring-2 ring-blue-500/30 dark:border-blue-400 dark:bg-blue-950 dark:text-zinc-50 dark:ring-blue-400/30";
  } else if (answer) {
    cellClasses += " border-zinc-400 bg-white text-zinc-900 dark:border-zinc-500 dark:bg-zinc-900 dark:text-zinc-50";
  } else {
    cellClasses += " border-dashed border-zinc-300 bg-white text-zinc-400 dark:border-zinc-600 dark:bg-zinc-900 dark:text-zinc-500";
  }

  return (
    <div className={cellClasses} onClick={onClick} role="button" tabIndex={-1}>
      {answer ? answer : isActive ? <span className="animate-pulse text-blue-400 dark:text-blue-300">|</span> : ""}
    </div>
  );
}

function MissingLetterGame({
  words,
  bankKey,
  grade,
  onGoHome,
}: {
  words: string[];
  bankKey: string;
  grade: string | null;
  onGoHome: () => void;
}) {
  const [gameId, setGameId] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);

  const gameWords = useMemo(
    () => pickRandomWords(words, 10),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [words, gameId],
  );

  const [index, setIndex] = useState(0);
  const [score, setScore] = useState(0);
  const [streak, setStreak] = useState(0);
  const [bestStreak, setBestStreak] = useState(0);
  const [feedback, setFeedback] = useState<"idle" | "correct" | "wrong">("idle");
  const [showCongrats, setShowCongrats] = useState(false);

  const currentWord = gameWords[index] ?? null;

  const blankIndices = useMemo(() => {
    if (!currentWord) return [];
    const count = getMissingCount(currentWord, grade);
    return pickBlankIndices(currentWord, count);
  }, [currentWord, grade]);

  const [answers, setAnswers] = useState<string[]>([]);
  const [activeBlank, setActiveBlank] = useState(0);
  const [blankStates, setBlankStates] = useState<BlankState[]>([]);

  useEffect(() => {
    setAnswers(new Array(blankIndices.length).fill(""));
    setActiveBlank(0);
    setBlankStates(new Array(blankIndices.length).fill("empty"));
  }, [blankIndices.length, currentWord]);

  useEffect(() => {
    containerRef.current?.focus();
  }, []);

  const progress = gameWords.length > 0 ? (score / gameWords.length) * 100 : 0;

  useEffect(() => {
    if (showCongrats && bankKey) {
      markGameCompleted(bankKey, "missingletter");
    }
  }, [showCongrats, bankKey]);

  const advanceWord = useCallback(() => {
    const nextIdx = index + 1;
    if (nextIdx >= gameWords.length) {
      setShowCongrats(true);
    } else {
      setIndex(nextIdx);
    }
    setFeedback("idle");
  }, [index, gameWords.length]);

  const checkAnswers = useCallback(
    (currentAnswers: string[]) => {
      if (!currentWord || feedback !== "idle") return;
      const states: BlankState[] = currentAnswers.map((a, i) =>
        a.toLowerCase() === currentWord[blankIndices[i]].toLowerCase() ? "correct" : "wrong",
      );
      setBlankStates(states);

      const allCorrect = states.every((s) => s === "correct");
      if (allCorrect) {
        const newStreak = streak + 1;
        setStreak(newStreak);
        setBestStreak((prev) => Math.max(prev, newStreak));
        setScore((s) => s + 1);
        setFeedback("correct");
        setTimeout(() => advanceWord(), 900);
      } else {
        setStreak(0);
        setFeedback("wrong");
        setTimeout(() => {
          const newAnswers = currentAnswers.map((a, i) => (states[i] === "correct" ? a : ""));
          setAnswers(newAnswers);
          setBlankStates(states.map((s) => (s === "correct" ? "correct" : "empty")));
          setFeedback("idle");
          const firstWrong = states.findIndex((s) => s === "wrong");
          if (firstWrong !== -1) setActiveBlank(firstWrong);
        }, 800);
      }
    },
    [currentWord, blankIndices, feedback, streak, advanceWord],
  );

  const handleLetterInput = useCallback(
    (letter: string) => {
      if (feedback !== "idle" || !currentWord) return;

      const newAnswers = [...answers];
      newAnswers[activeBlank] = letter;
      setAnswers(newAnswers);
      setBlankStates((prev) => {
        const next = [...prev];
        next[activeBlank] = "filled";
        return next;
      });

      const allFilled = newAnswers.every((a) => a !== "");
      if (allFilled) {
        checkAnswers(newAnswers);
        return;
      }

      let nextBlank = -1;
      for (let i = activeBlank + 1; i < blankIndices.length; i++) {
        if (!newAnswers[i]) { nextBlank = i; break; }
      }
      if (nextBlank === -1) {
        for (let i = 0; i < activeBlank; i++) {
          if (!newAnswers[i]) { nextBlank = i; break; }
        }
      }
      if (nextBlank !== -1) setActiveBlank(nextBlank);
    },
    [answers, activeBlank, blankIndices.length, feedback, currentWord, checkAnswers],
  );

  const handleBackspace = useCallback(() => {
    if (feedback !== "idle") return;
    if (answers[activeBlank]) {
      const newAnswers = [...answers];
      newAnswers[activeBlank] = "";
      setAnswers(newAnswers);
      setBlankStates((prev) => {
        const next = [...prev];
        next[activeBlank] = "empty";
        return next;
      });
    } else if (activeBlank > 0) {
      const prevBlank = activeBlank - 1;
      setActiveBlank(prevBlank);
      if (answers[prevBlank]) {
        const newAnswers = [...answers];
        newAnswers[prevBlank] = "";
        setAnswers(newAnswers);
        setBlankStates((prev) => {
          const next = [...prev];
          next[prevBlank] = "empty";
          return next;
        });
      }
    }
  }, [answers, activeBlank, feedback]);

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (showCongrats) return;

      if (e.key === "ArrowLeft") {
        e.preventDefault();
        setActiveBlank((prev) => Math.max(0, prev - 1));
        return;
      }
      if (e.key === "ArrowRight") {
        e.preventDefault();
        setActiveBlank((prev) => Math.min(blankIndices.length - 1, prev + 1));
        return;
      }
      if (e.key === "Backspace") {
        e.preventDefault();
        handleBackspace();
        return;
      }
      if (e.key.length === 1 && /[a-z]/i.test(e.key)) {
        e.preventDefault();
        handleLetterInput(e.key.toLowerCase());
      }
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [blankIndices.length, showCongrats, handleLetterInput, handleBackspace]);

  const handlePlayAgain = () => {
    setGameId((id) => id + 1);
    setIndex(0);
    setScore(0);
    setStreak(0);
    setBestStreak(0);
    setFeedback("idle");
    setShowCongrats(false);
  };

  return (
    <>
      {/* Flame bounce keyframe injected once */}
      <style>{`
        @keyframes flameBounce {
          from { transform: translateY(0) scale(1); }
          to   { transform: translateY(-3px) scale(1.15); }
        }
      `}</style>

      {showCongrats && (
        <CongratsModal
          score={score}
          total={gameWords.length}
          bestStreak={bestStreak}
          onPlayAgain={handlePlayAgain}
          onGoHome={onGoHome}
        />
      )}

      <div ref={containerRef} className="flex w-full flex-1 flex-col items-center gap-6 outline-none" tabIndex={0}>
        <div className="w-full max-w-md">
          <div className="mb-1 flex items-center justify-between text-xs text-zinc-500 dark:text-zinc-400">
            <span>Word {Math.min(index + 1, gameWords.length)} of {gameWords.length}</span>
            <div className="flex items-center gap-3">
              {streak >= 2 && (
                <span className="flex items-center gap-1 rounded-full bg-orange-100 px-2.5 py-0.5 text-xs font-semibold text-orange-600 dark:bg-orange-900/40 dark:text-orange-400">
                  <span
                    style={{
                      display: "inline-block",
                      animation: "flameBounce 0.6s ease-in-out infinite alternate",
                    }}
                  >
                    🔥
                  </span>
                  {streak} streak
                </span>
              )}
              <span>{score} correct</span>
            </div>
          </div>
          <div className="h-2 w-full overflow-hidden rounded-full bg-zinc-200 dark:bg-zinc-800">
            <div
              className="h-full rounded-full bg-zinc-900 transition-all duration-500 dark:bg-zinc-100"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>

        {currentWord && (
          <div className="flex flex-1 flex-col items-center justify-center gap-8">
            <div className="flex flex-wrap justify-center gap-2">
              {currentWord.split("").map((char, charIdx) => {
                const blankIdx = blankIndices.indexOf(charIdx);
                const isBlank = blankIdx !== -1;
                return (
                  <LetterCell
                    key={charIdx}
                    char={char}
                    isBlank={isBlank}
                    isActive={isBlank && blankIdx === activeBlank && feedback === "idle"}
                    blankState={isBlank ? blankStates[blankIdx] ?? "empty" : "empty"}
                    answer={isBlank ? answers[blankIdx] ?? "" : ""}
                    onClick={isBlank ? () => { if (feedback === "idle") setActiveBlank(blankIdx); } : undefined}
                  />
                );
              })}
            </div>

            <p className="h-6 text-sm font-medium">
              {feedback === "correct" && (
                <span className="text-green-500">Correct!</span>
              )}
              {feedback === "wrong" && (
                <span className="text-red-500">Not quite — try the highlighted ones again</span>
              )}
              {feedback === "idle" && blankIndices.length > 1 && (
                <span className="text-zinc-400 dark:text-zinc-500">
                  Type letters to fill the blanks · ← → to navigate
                </span>
              )}
              {feedback === "idle" && blankIndices.length === 1 && (
                <span className="text-zinc-400 dark:text-zinc-500">
                  Type the missing letter
                </span>
              )}
            </p>
          </div>
        )}
      </div>
    </>
  );
}

export default function MissingLetterPage() {
  const { words, grade } = useGameWords();
  const router = useRouter();

  const bankKey = useMemo(
    () => words.map((w) => w.trim()).filter(Boolean).join("\0"),
    [words],
  );

  if (!bankKey) {
    return (
      <div className="flex min-h-full flex-1 flex-col items-center justify-center gap-6 bg-zinc-50 px-6 dark:bg-zinc-950">
        <p className="text-center text-zinc-600 dark:text-zinc-400">
          No words in your list yet. Set up your word bank first.
        </p>
        <Link
          href="/setup/select"
          className="inline-flex min-w-[140px] cursor-pointer items-center justify-center rounded-full bg-zinc-900 px-8 py-3 text-sm font-semibold text-white hover:bg-zinc-800 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-200"
        >
          Go to setup
        </Link>
      </div>
    );
  }

  return (
    <div className="flex min-h-full flex-1 flex-col bg-zinc-50 px-4 pb-8 pt-10 dark:bg-zinc-950 sm:px-8">
      <header className="mb-6 flex w-full items-center justify-between gap-4">
        <Link
          href="/home"
          className="text-sm font-medium text-zinc-600 underline-offset-4 hover:text-zinc-900 hover:underline dark:text-zinc-400 dark:hover:text-zinc-50"
        >
          ← Back to games
        </Link>
        <h1 className="text-center text-2xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50 sm:text-3xl">
          Missing Letter
        </h1>
        <div className="flex w-[120px] justify-end sm:w-[140px]">
          <RulesDropdown />
        </div>
      </header>

      <main className="flex flex-1 flex-col items-center gap-6">
        <MissingLetterGame
          key={bankKey}
          words={words}
          bankKey={bankKey}
          grade={grade}
          onGoHome={() => router.push("/home")}
        />
      </main>
    </div>
  );
}
