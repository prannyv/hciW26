"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useGameWords } from "../gameWords";

type LetterTile = { id: string; letter: string };
type RoundResult = "pending" | "correct" | "incorrect";

function shuffle<T>(arr: T[]): T[] {
  const copy = [...arr];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

function pickRandomWords(bank: string[], take: number): string[] {
  const nonEmpty = bank.map((w) => w.trim()).filter(Boolean);
  if (nonEmpty.length === 0) return [];
  const shuffled = shuffle(nonEmpty);
  return shuffled.slice(0, Math.min(take, shuffled.length));
}

function makeTiles(word: string): LetterTile[] {
  const letters = word.split("").map((letter) => ({
    id: crypto.randomUUID(),
    letter,
  }));
  return shuffle(letters);
}

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
        className="flex h-8 w-8 items-center justify-center rounded-full border border-zinc-300 bg-white text-sm font-semibold text-zinc-600 transition-colors hover:bg-zinc-100 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-400 dark:hover:bg-zinc-800"
      >
        ?
      </button>

      {open && (
        <>
          <div
            className="fixed inset-0 z-10"
            aria-hidden
            onClick={() => setOpen(false)}
          />
          <div className="absolute right-0 z-20 mt-2 w-72 rounded-xl border border-zinc-200 bg-white p-4 shadow-lg dark:border-zinc-700 dark:bg-zinc-900">
            <p className="mb-1 text-sm font-semibold text-zinc-900 dark:text-zinc-50">
              How to play
            </p>
            <ul className="space-y-1 text-xs text-zinc-600 dark:text-zinc-400">
              <li>• Scrambled letters from a word appear in the soup.</li>
              <li>• Tap letters in the correct order to spell the word.</li>
              <li>• Use the backspace button to undo, or clear to start over.</li>
              <li>• Green flash = correct! Red flash = try again.</li>
              <li>• Complete all words to finish the game.</li>
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
  onPlayAgain,
  onGoHome,
}: {
  score: number;
  total: number;
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
        <p className="mb-8 text-base text-zinc-600 dark:text-zinc-400">
          You scored {score} out of {total}!
        </p>
        <div className="flex flex-col gap-3 sm:flex-row sm:justify-center">
          <button
            type="button"
            onClick={onPlayAgain}
            className="inline-flex items-center justify-center rounded-full bg-zinc-900 px-7 py-3 text-sm font-semibold text-white transition-colors hover:bg-zinc-700 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-300"
          >
            Play Again
          </button>
          <button
            type="button"
            onClick={onGoHome}
            className="inline-flex items-center justify-center rounded-full border border-zinc-300 bg-white px-7 py-3 text-sm font-semibold text-zinc-900 transition-colors hover:bg-zinc-100 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-50 dark:hover:bg-zinc-800"
          >
            Game List
          </button>
        </div>
      </div>
    </div>
  );
}

function WordSoupPlay({
  words,
  onGoHome,
}: {
  words: string[];
  onGoHome: () => void;
}) {
  const gameWords = useMemo(() => pickRandomWords(words, 10), [words]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [tiles, setTiles] = useState<LetterTile[]>(() =>
    makeTiles(gameWords[0] ?? ""),
  );
  const [selected, setSelected] = useState<LetterTile[]>([]);
  const [result, setResult] = useState<RoundResult>("pending");
  const [score, setScore] = useState(0);
  const [showCongrats, setShowCongrats] = useState(false);
  const [shakeAnswer, setShakeAnswer] = useState(false);

  const currentWord = gameWords[currentIndex] ?? "";
  const selectedIds = new Set(selected.map((t) => t.id));
  const built = selected.map((t) => t.letter).join("");

  const handleTileTap = useCallback(
    (tile: LetterTile) => {
      if (result !== "pending") return;
      if (selectedIds.has(tile.id)) return;

      const next = [...selected, tile];
      setSelected(next);

      if (next.length === currentWord.length) {
        const attempt = next.map((t) => t.letter).join("");
        if (attempt.toLowerCase() === currentWord.toLowerCase()) {
          setResult("correct");
          setScore((s) => s + 1);
          setTimeout(() => advanceWord(), 800);
        } else {
          setResult("incorrect");
          setShakeAnswer(true);
          setTimeout(() => {
            setShakeAnswer(false);
            setSelected([]);
            setResult("pending");
          }, 600);
        }
      }
    },
    [selected, result, currentWord, selectedIds],
  );

  const handleBackspace = useCallback(() => {
    if (result !== "pending") return;
    setSelected((prev) => prev.slice(0, -1));
  }, [result]);

  const handleClear = useCallback(() => {
    if (result !== "pending") return;
    setSelected([]);
  }, [result]);

  const advanceWord = useCallback(() => {
    const nextIdx = currentIndex + 1;
    if (nextIdx >= gameWords.length) {
      setShowCongrats(true);
      return;
    }
    setCurrentIndex(nextIdx);
    setTiles(makeTiles(gameWords[nextIdx]));
    setSelected([]);
    setResult("pending");
  }, [currentIndex, gameWords]);

  const handleSkip = useCallback(() => {
    advanceWord();
  }, [advanceWord]);

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (result !== "pending") return;

      if (e.key === "Backspace") {
        e.preventDefault();
        handleBackspace();
        return;
      }

      if (e.key === "Escape") {
        e.preventDefault();
        handleClear();
        return;
      }

      const key = e.key.toLowerCase();
      if (key.length !== 1 || !/[a-z]/.test(key)) return;

      const match = tiles.find(
        (t) => !selectedIds.has(t.id) && t.letter.toLowerCase() === key,
      );
      if (match) handleTileTap(match);
    }

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [tiles, selectedIds, result, handleTileTap, handleBackspace, handleClear]);

  const handlePlayAgain = useCallback(() => {
    setShowCongrats(false);
    setCurrentIndex(0);
    setTiles(makeTiles(gameWords[0]));
    setSelected([]);
    setResult("pending");
    setScore(0);
  }, [gameWords]);

  const progress = ((currentIndex) / gameWords.length) * 100;

  const answerBorder =
    result === "correct"
      ? "border-green-500 bg-green-950/30"
      : result === "incorrect"
        ? "border-red-500 bg-red-950/30"
        : "border-zinc-300 dark:border-zinc-700";

  return (
    <>
      {showCongrats && (
        <CongratsModal
          score={score}
          total={gameWords.length}
          onPlayAgain={handlePlayAgain}
          onGoHome={onGoHome}
        />
      )}

      <main className="flex w-full flex-1 flex-col items-center gap-6">
        {/* progress bar */}
        <div className="w-full max-w-md">
          <div className="mb-1 flex justify-between text-xs text-zinc-500 dark:text-zinc-400">
            <span>
              Word {currentIndex + 1} of {gameWords.length}
            </span>
            <span>{score} correct</span>
          </div>
          <div className="h-2 w-full overflow-hidden rounded-full bg-zinc-200 dark:bg-zinc-800">
            <div
              className="h-full rounded-full bg-zinc-900 transition-all duration-500 dark:bg-zinc-100"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>

        {/* hint: word length */}
        <p className="text-sm text-zinc-500 dark:text-zinc-400">
          {currentWord.length} letters
        </p>

        {/* answer slots */}
        <div
          className={`flex min-h-16 items-center justify-center gap-2 rounded-2xl border-2 px-4 py-3 transition-colors duration-300 ${answerBorder} ${shakeAnswer ? "animate-shake" : ""}`}
          style={{ minWidth: Math.min(currentWord.length * 52, 400) }}
        >
          {Array.from({ length: currentWord.length }).map((_, i) => {
            const letter = selected[i]?.letter;
            return (
              <div
                key={i}
                className={`flex h-11 w-11 items-center justify-center rounded-lg text-lg font-bold transition-all duration-150 ${
                  letter
                    ? "bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900 scale-100"
                    : "bg-zinc-100 dark:bg-zinc-800 scale-95"
                }`}
              >
                {letter ?? ""}
              </div>
            );
          })}
        </div>

        {/* letter soup */}
        <div className="flex max-w-md flex-wrap justify-center gap-3 px-2">
          {tiles.map((tile) => {
            const used = selectedIds.has(tile.id);
            return (
              <button
                key={tile.id}
                type="button"
                disabled={used || result !== "pending"}
                onClick={() => handleTileTap(tile)}
                className={`flex h-14 w-14 items-center justify-center rounded-xl border-2 text-xl font-bold transition-all duration-150 ${
                  used
                    ? "border-transparent bg-zinc-100 text-zinc-300 dark:bg-zinc-800 dark:text-zinc-600 scale-90 opacity-40"
                    : "border-zinc-300 bg-white text-zinc-900 shadow-sm hover:border-zinc-500 hover:shadow-md active:scale-95 dark:border-zinc-600 dark:bg-zinc-900 dark:text-zinc-50 dark:hover:border-zinc-400 cursor-pointer"
                }`}
              >
                {tile.letter}
              </button>
            );
          })}
        </div>

        {/* action buttons */}
        <div className="flex gap-3">
          <button
            type="button"
            onClick={handleBackspace}
            disabled={selected.length === 0 || result !== "pending"}
            className="inline-flex items-center justify-center rounded-full border border-zinc-300 bg-white px-5 py-2.5 text-sm font-semibold text-zinc-700 transition-colors hover:bg-zinc-100 disabled:opacity-30 disabled:cursor-not-allowed dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-300 dark:hover:bg-zinc-800"
          >
            Undo
          </button>
          <button
            type="button"
            onClick={handleClear}
            disabled={selected.length === 0 || result !== "pending"}
            className="inline-flex items-center justify-center rounded-full border border-zinc-300 bg-white px-5 py-2.5 text-sm font-semibold text-zinc-700 transition-colors hover:bg-zinc-100 disabled:opacity-30 disabled:cursor-not-allowed dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-300 dark:hover:bg-zinc-800"
          >
            Clear
          </button>
          <button
            type="button"
            onClick={handleSkip}
            disabled={result !== "pending"}
            className="inline-flex items-center justify-center rounded-full border border-zinc-300 bg-white px-5 py-2.5 text-sm font-semibold text-zinc-700 transition-colors hover:bg-zinc-100 disabled:opacity-30 disabled:cursor-not-allowed dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-300 dark:hover:bg-zinc-800"
          >
            Skip
          </button>
        </div>
      </main>
    </>
  );
}

export default function WordSoupPage() {
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
          className="inline-flex min-w-[140px] items-center justify-center rounded-full bg-zinc-900 px-8 py-3 text-sm font-semibold text-white hover:bg-zinc-800 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-200"
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
          Word Soup
        </h1>
        <div className="flex w-[120px] justify-end sm:w-[140px]">
          <RulesDropdown />
        </div>
      </header>

      <div className="flex flex-1 flex-col">
        <WordSoupPlay
          key={bankKey}
          words={words}
          onGoHome={() => router.push("/home")}
        />
      </div>
    </div>
  );
}
