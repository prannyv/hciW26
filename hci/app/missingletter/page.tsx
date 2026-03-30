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

function removeRandomLetter(word: string) {
  const index = Math.floor(Math.random() * word.length);
  const missing = word[index];
  const display = word.slice(0, index) + "_" + word.slice(index + 1);
  return { display, missing };
}

function generateOptions(correct: string) {
  const alphabet = "abcdefghijklmnopqrstuvwxyz";
  const options = new Set<string>();
  options.add(correct);
  while (options.size < 4) {
    const rand = alphabet[Math.floor(Math.random() * 26)];
    options.add(rand);
  }
  return Array.from(options).sort(() => Math.random() - 0.5);
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
              <li>• A word from your list is shown with one letter missing.</li>
              <li>• Pick the correct letter from the four options below.</li>
              <li>• Build a streak by getting answers right in a row!</li>
              <li>• Complete all words to win.</li>
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

function MissingLetterGame({
  words,
  bankKey,
  onGoHome,
}: {
  words: string[];
  bankKey: string;
  onGoHome: () => void;
}) {
  const [gameId, setGameId] = useState(0);

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
  const [showFullWord, setShowFullWord] = useState(false);
  const [showCongrats, setShowCongrats] = useState(false);

  const currentWord = gameWords[index] ?? null;
  // Use score for the bar: it matches "correct answers so far" and stays at N after the
  // last word (index is not incremented when the game ends). The old index/feedback
  // formula dropped to 90% after the final answer because feedback reset to idle while
  // index stayed on the last word.
  const progress = gameWords.length > 0 ? (score / gameWords.length) * 100 : 0;

  const letterData = useMemo(() => {
    if (!currentWord) return null;
    return removeRandomLetter(currentWord);
  }, [currentWord]);

  const options = useMemo(() => {
    if (!letterData) return [];
    return generateOptions(letterData.missing);
  }, [letterData]);

  useEffect(() => {
    if (showCongrats && bankKey) {
      markGameCompleted(bankKey, "missingletter");
    }
  }, [showCongrats, bankKey]);

  useEffect(() => {
    setIndex(0);
    setScore(0);
    setStreak(0);
    setBestStreak(0);
    setFeedback("idle");
    setShowFullWord(false);
    setShowCongrats(false);
  }, [gameId]);

  const handleGuess = useCallback((letter: string) => {
    if (!letterData || feedback !== "idle") return;

    if (letter === letterData.missing) {
      const newStreak = streak + 1;
      setStreak(newStreak);
      setBestStreak((prev) => Math.max(prev, newStreak));
      setFeedback("correct");
      setShowFullWord(true);
      setScore((s) => s + 1);

      setTimeout(() => {
        setFeedback("idle");
        setShowFullWord(false);
        const nextIdx = index + 1;
        if (nextIdx >= gameWords.length) {
          setShowCongrats(true);
        } else {
          setIndex(nextIdx);
        }
      }, 1000);
    } else {
      setStreak(0);
      setFeedback("wrong");
      setTimeout(() => setFeedback("idle"), 500);
    }
  }, [letterData, feedback, streak, index, gameWords.length]);

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (feedback !== "idle" || showCongrats) return;
      const key = e.key.toLowerCase();
      if (key.length !== 1 || !/[a-z]/.test(key)) return;
      if (options.includes(key)) {
        e.preventDefault();
        handleGuess(key);
      }
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [options, feedback, showCongrats, handleGuess]);

  const handlePlayAgain = () => {
    setGameId((id) => id + 1);
  };

  return (
    <>
      {showCongrats && (
        <CongratsModal
          score={score}
          total={gameWords.length}
          bestStreak={bestStreak}
          onPlayAgain={handlePlayAgain}
          onGoHome={onGoHome}
        />
      )}

      <div className="flex w-full flex-1 flex-col items-center gap-6">
        <div className="w-full max-w-md">
          <div className="mb-1 flex items-center justify-between text-xs text-zinc-500 dark:text-zinc-400">
            <span>Word {Math.min(index + 1, gameWords.length)} of {gameWords.length}</span>
            <div className="flex items-center gap-3">
              {streak >= 2 && (
                
<span className="flex items-center gap-1 rounded-full bg-orange-100 px-2.5 py-0.5 text-xs font-semibold text-orange-600 dark:bg-orange-900/40 dark:text-orange-400">
  <style>{`@keyframes flameBounce { from { transform: translateY(0) scale(1); } to { transform: translateY(-3px) scale(1.15); } }`}</style>
  <span style={{ display: "inline-block", animation: "flameBounce 0.6s ease-in-out infinite alternate" }}>🔥</span>
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

        {currentWord && letterData && (
          <div className="flex flex-1 flex-col items-center justify-center gap-8">
            <div
              className={`text-4xl font-bold tracking-widest transition-colors duration-300 ${
                feedback === "correct"
                  ? "text-green-500"
                  : feedback === "wrong"
                    ? "text-red-500 animate-shake"
                    : "text-zinc-900 dark:text-zinc-50"
              }`}
            >
              {showFullWord ? currentWord.toUpperCase() : letterData.display.toUpperCase()}
            </div>

            <div className="flex gap-3">
              {options.map((letter) => (
                <button
                  key={letter}
                  type="button"
                  onClick={() => handleGuess(letter)}
                  disabled={feedback !== "idle"}
                  className="flex h-14 w-14 cursor-pointer items-center justify-center rounded-xl border-2 border-zinc-300 bg-white text-xl font-bold uppercase text-zinc-900 shadow-sm transition-all duration-150 hover:border-zinc-500 hover:shadow-md active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed dark:border-zinc-600 dark:bg-zinc-900 dark:text-zinc-50 dark:hover:border-zinc-400"
                >
                  {letter.toUpperCase()}
                </button>
              ))}
            </div>

            <p className="h-6 text-sm font-medium">
              {feedback === "correct" && (
                <span className="text-green-500">Correct!</span>
              )}
              {feedback === "wrong" && (
                <span className="text-red-500">Try again</span>
              )}
            </p>
          </div>
        )}
      </div>
    </>
  );
}

export default function MissingLetterPage() {
  const { words } = useGameWords();
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
          onGoHome={() => router.push("/home")}
        />
      </main>
    </div>
  );
}