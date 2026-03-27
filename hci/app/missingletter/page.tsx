"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useGameWords } from "../gameWords";

/* ---------------- Helpers ---------------- */

function pickRandomWords(bank: string[], take: number): string[] {
  const nonEmpty = bank.map((w) => w.trim()).filter(Boolean);
  return nonEmpty.sort(() => Math.random() - 0.5).slice(0, take);
}

function removeRandomLetter(word: string) {
  const index = Math.floor(Math.random() * word.length);
  const missing = word[index];

  const display =
    word.slice(0, index) + "_" + word.slice(index + 1);

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

/* ---------------- Streak Display ---------------- */

function StreakCounter({ streak }: { streak: number }) {
  // Only animate/highlight when streak is active
  const isHot = streak >= 3;

  return (
    <div
      className={`flex items-center gap-1 rounded-full px-3 py-1 text-sm font-semibold transition-all duration-300 ${
        isHot
          ? "bg-orange-100 text-orange-600 dark:bg-orange-900/40 dark:text-orange-400 scale-110"
          : "bg-zinc-100 text-zinc-500 dark:bg-zinc-800 dark:text-zinc-400"
      }`}
    >
      <span className={`text-base transition-all duration-300 ${isHot ? "animate-bounce" : ""}`}>
        🔥
      </span>
      <span>{streak}</span>
    </div>
  );
}

/* ---------------- Game ---------------- */

function MissingLetterGame({ words, onGoHome }: { words: string[]; onGoHome: () => void }) {
  const gameWords = useMemo(() => pickRandomWords(words, 10), [words]);

  const [index, setIndex] = useState(0);
  const [score, setScore] = useState(0);
  const [streak, setStreak] = useState(0);        // current streak
  const [bestStreak, setBestStreak] = useState(0); // best streak this session
  const [feedback, setFeedback] = useState<"idle" | "correct" | "wrong">("idle");
  const [showFullWord, setShowFullWord] = useState(false);
  const progress = ((index + 1) / gameWords.length) * 100;
  const currentWord = gameWords[index] ?? null;

  const letterData = useMemo(() => {
    if (!currentWord) return null;
    return removeRandomLetter(currentWord);
  }, [currentWord]);

  const options = useMemo(() => {
    if (!letterData) return [];
    return generateOptions(letterData.missing);
  }, [letterData]);

  const handleGuess = (letter: string) => {
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
        setIndex((i) => i + 1);
      }, 1000);
    } else {
      setStreak(0); // reset streak on wrong answer
      setFeedback("wrong");
      setTimeout(() => setFeedback("idle"), 500);
    }
  };

  return (
    <div className="flex flex-col items-center gap-6 w-full max-w-md">

      {/* Score row with streak */}
      <div className="flex w-full items-center justify-between px-2">
        <p className="text-sm font-medium text-zinc-600 dark:text-zinc-400">
          Score: <span className="font-bold text-zinc-900 dark:text-zinc-50">{score}</span>
        </p>

        {/* Streak counter — the main new feature */}
        <StreakCounter streak={streak} />

        <p className="text-sm font-medium text-zinc-600 dark:text-zinc-400">
          Best: <span className="font-bold text-zinc-900 dark:text-zinc-50">🔥{bestStreak}</span>
        </p>
      </div>

      {/* Progress bar */}
      <div className="w-full h-2 rounded-full bg-zinc-200 dark:bg-zinc-800 overflow-hidden">
        <div
          className="h-full rounded-full bg-blue-500 transition-all duration-500"
          style={{ width: `${progress}%` }}
        />
      </div>

      {currentWord && letterData && (
        <>
          {/* Word display */}
          <div
            className={`text-4xl font-bold tracking-widest transition-colors duration-300 ${
              feedback === "correct"
                ? "text-green-500"
                : feedback === "wrong"
                ? "text-red-500"
                : "text-zinc-900 dark:text-zinc-50"
            }`}
          >
            {showFullWord ? currentWord.toUpperCase() : letterData.display.toUpperCase()}
          </div>

          {/* Letter tile options */}
          <div className="flex gap-4">
            {options.map((letter) => (
              <button
                key={letter}
                onClick={() => handleGuess(letter)}
                disabled={feedback !== "idle"}
                className="border p-4 rounded-lg font-bold text-lg uppercase
                  hover:bg-zinc-100 dark:hover:bg-zinc-800
                  disabled:opacity-50 disabled:cursor-not-allowed
                  transition-all duration-150 active:scale-95"
              >
                {letter.toUpperCase()}
              </button>
            ))}
          </div>

          {/* Feedback text */}
          <p className="h-6 text-sm font-medium">
            {feedback === "correct" && (
              <span className="text-green-500">
                ✅ Correct! {streak >= 3 ? `🔥 ${streak} in a row!` : ""}
              </span>
            )}
            {feedback === "wrong" && (
              <span className="text-red-500">❌ Try again</span>
            )}
          </p>
        </>
      )}

      {/* Game over screen */}
      {!currentWord && (
        <div className="flex flex-col items-center gap-3 text-center">
          <p className="text-2xl font-bold text-zinc-900 dark:text-zinc-50">
            Game Over!
          </p>
          <p className="text-zinc-600 dark:text-zinc-400">
            Final Score: <span className="font-bold">{score}</span> / {gameWords.length}
          </p>
          <p className="text-zinc-600 dark:text-zinc-400">
            Best Streak: <span className="font-bold">🔥 {bestStreak}</span>
          </p>
          <button
            onClick={onGoHome}
            className="mt-2 rounded-lg border px-6 py-2 text-sm font-medium hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
          >
            Back to Home
          </button>
        </div>
      )}
    </div>
  );
}

/* ---------------- Page ---------------- */

export default function MissingLetterPage() {
  const { words } = useGameWords();
  const router = useRouter();

  return (
    <div className="flex min-h-full flex-1 flex-col bg-zinc-50 px-4 pb-8 pt-10 dark:bg-zinc-950 sm:px-8">

      {/* HEADER */}
      <header className="mb-6 flex w-full items-center justify-between gap-4">

        {/* Back button */}
        <Link
          href="/home"
          className="text-sm font-medium text-zinc-600 underline-offset-4 hover:text-zinc-900 hover:underline dark:text-zinc-400 dark:hover:text-zinc-50"
        >
          ← Back to games
        </Link>

        {/* Title */}
        <h1 className="text-center text-2xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50 sm:text-3xl">
          Missing Letter
        </h1>

        {/* Empty space (for alignment) */}
        <div className="w-[120px]" />
      </header>

      {/* GAME */}
      <div className="flex flex-1 flex-col items-center">
        <MissingLetterGame
          words={words}
          onGoHome={() => router.push("/home")}
        />
      </div>
    </div>
  );
}
