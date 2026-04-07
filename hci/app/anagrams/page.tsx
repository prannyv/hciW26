"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import { markGameCompleted } from "../gameCompletions";
import { useGameWords } from "../gameWords";

/* ---------------- Helpers ---------------- */

type Tile = { id: string; letter: string };

function shuffle<T>(arr: T[]): T[] {
  const copy = [...arr];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

function makeTiles(word: string): Tile[] {
  return shuffle(
    word.split("").map((letter) => ({
      id: crypto.randomUUID(),
      letter,
    }))
  );
}

function pickRandomWords(bank: string[], take: number): string[] {
  const clean = bank.map((w) => w.trim()).filter(Boolean);
  return shuffle(clean).slice(0, take);
}

/* ---------------- Dictionary ---------------- */

async function isValidWord(word: string): Promise<boolean> {
  try {
    const res = await fetch(
      `https://api.dictionaryapi.dev/api/v2/entries/en/${word}`
    );
    return res.ok;
  } catch {
    return false;
  }
}

/* ---------------- Rules ---------------- */

function RulesDropdown() {
  const [open, setOpen] = useState(false);

  return (
    <div
      className="relative"
      onMouseEnter={() => setOpen(true)}
      onMouseLeave={() => setOpen(false)}
      onFocusCapture={() => setOpen(true)}
      onBlurCapture={(e) => {
        const next = e.relatedTarget as Node | null;
        if (!e.currentTarget.contains(next)) setOpen(false);
      }}
    >
      <button
        type="button"
        onFocus={() => setOpen(true)}
        aria-expanded={open}
        aria-label="How to play"
        className="flex h-8 w-8 cursor-pointer items-center justify-center rounded-full border border-zinc-300 bg-white text-sm font-semibold text-zinc-600 transition-colors hover:bg-zinc-100 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-400 dark:hover:bg-zinc-800"
      >
        ?
      </button>

      {open && (
        <div className="absolute right-0 z-20 mt-2 w-72 rounded-xl border border-zinc-200 bg-white p-4 shadow-lg dark:border-zinc-700 dark:bg-zinc-900">
          <p className="mb-1 text-sm font-semibold text-zinc-900 dark:text-zinc-50">How to play</p>
          <ul className="space-y-1 text-xs text-zinc-600 dark:text-zinc-400">
            <li>• Tap or type letters to form a word.</li>
            <li>• Use all letters to complete the word.</li>
            <li>• Press Submit or Enter.</li>
            <li>• Green = correct</li>
            <li>• Yellow = real word (1 retry)</li>
            <li>• Red = incorrect</li>
          </ul>
        </div>
      )}
    </div>
  );
}

/* ---------------- Modal ---------------- */

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

/* ---------------- Game ---------------- */

function AnagramGame({
  words,
  bankKey,
  onGoHome,
}: {
  words: string[];
  bankKey: string;
  onGoHome: () => void;
}) {
  const gameWords = useMemo(() => pickRandomWords(words, 10), [words]);

  const [index, setIndex] = useState(0);
  const [tiles, setTiles] = useState<Tile[]>([]);
  const [selected, setSelected] = useState<Tile[]>([]);
  const [score, setScore] = useState(0);
  const [streak, setStreak] = useState(0);
  const [bestStreak, setBestStreak] = useState(0);

  const [status, setStatus] = useState<"idle" | "correct" | "almost" | "wrong">("idle");
  const [message, setMessage] = useState("");
  const [shake, setShake] = useState(false);

  const [retryUsed, setRetryUsed] = useState(false);
  const [showCongrats, setShowCongrats] = useState(false);

  useEffect(() => {
    if (showCongrats && bankKey) markGameCompleted(bankKey, "anagrams");
  }, [showCongrats, bankKey]);

  const currentWord = gameWords[index] ?? null;
  const selectedIds = new Set(selected.map((t) => t.id));

  useEffect(() => {
    if (currentWord) {
      setTiles(makeTiles(currentWord));
      setSelected([]);
      setStatus("idle");
      setMessage("");
      setRetryUsed(false);
      setShake(false);
    }
  }, [currentWord]);

  const handleSubmit = useCallback(async () => {
    if (!currentWord) return;
    if (selected.length !== currentWord.length) return;
    if (status !== "idle") return;

    const attempt = selected.map((t) => t.letter).join("").toLowerCase();

    if (attempt === currentWord.toLowerCase()) {
      const newStreak = streak + 1;
      setStreak(newStreak);
      setBestStreak((prev) => Math.max(prev, newStreak));
      setStatus("correct");
      setScore((s) => s + 1);

      setTimeout(() => {
        const next = index + 1;
        next >= gameWords.length ? setShowCongrats(true) : setIndex(next);
      }, 800);
      return;
    }

    const valid = await isValidWord(attempt);

    if (valid && !retryUsed) {
      setStatus("almost");
      setMessage("Not quite the word we are looking for");
      setRetryUsed(true);

      setShake(true);
      setTimeout(() => setShake(false), 500);

      setTimeout(() => {
        setSelected([]);
        setStatus("idle");
        setMessage("");
      }, 1200);
    } else {
      setStreak(0);
      setStatus("wrong");
      setMessage(`Incorrect — try again!`);

      setShake(true);
      setTimeout(() => setShake(false), 500);

      setTimeout(() => {
        setTiles(makeTiles(currentWord));
        setSelected([]);
        setStatus("idle");
        setMessage("");
        setRetryUsed(false);
      }, 1200);
    }
  }, [selected, currentWord, retryUsed, index, gameWords.length, status, streak]);

  const handleTileClick = (tile: Tile) => {
    if (status !== "idle") return;
    if (selectedIds.has(tile.id)) return;
    setSelected((prev) => [...prev, tile]);
  };

  const handleUndo = () => setSelected((p) => p.slice(0, -1));
  const handleClear = () => setSelected([]);

  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      const key = e.key.toLowerCase();

      if (key === "backspace") return handleUndo();
      if (key === "enter") return handleSubmit();

      if (!/[a-z]/.test(key)) return;

      const match = tiles.find(
        (t) => !selectedIds.has(t.id) && t.letter.toLowerCase() === key
      );
      if (match) handleTileClick(match);
    }

    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [tiles, selectedIds, handleSubmit]);

  const handlePlayAgain = () => {
    setIndex(0);
    setScore(0);
    setStreak(0);
    setBestStreak(0);
    setShowCongrats(false);
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

      {!showCongrats && currentWord && (
        <div className="flex w-full flex-1 flex-col items-center gap-8">
          <div className="w-full max-w-md">
            <div className="mb-1 flex items-center justify-between text-xs text-zinc-500 dark:text-zinc-400">
              <span>Word {Math.min(score + 1, gameWords.length)} of {gameWords.length}</span>
              <div className="flex items-center gap-3">
                {streak >= 2 && (
                  <span className="rounded-full bg-orange-100 px-2.5 py-0.5 text-xs font-semibold text-orange-600 dark:bg-orange-900/40 dark:text-orange-400">
                    🔥 {streak} streak
                  </span>
                )}
                <span>{score} correct</span>
              </div>
            </div>
            <div className="h-2 w-full overflow-hidden rounded-full bg-zinc-200 dark:bg-zinc-800">
              <div
                className="h-full rounded-full bg-zinc-900 transition-all duration-500 dark:bg-zinc-100"
                style={{ width: `${(score / gameWords.length) * 100}%` }}
              />
            </div>
          </div>

          <div
            className={`rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm transition dark:border-zinc-700 dark:bg-zinc-900 ${shake ? "animate-shake" : ""}`}
          >
            <div className="flex gap-2.5">
              {Array.from({ length: currentWord.length }).map((_, i) => (
                <div
                  key={i}
                  className={`flex h-12 w-12 items-center justify-center rounded-lg border-2 text-xl font-bold uppercase transition-colors duration-150 sm:h-14 sm:w-14 sm:text-2xl ${
                    status === "correct"
                      ? "border-green-500 bg-green-50 text-green-700 dark:border-green-400 dark:bg-green-950 dark:text-green-300"
                      : status === "almost"
                      ? "border-yellow-500 bg-yellow-50 text-yellow-700 dark:border-yellow-400 dark:bg-yellow-950 dark:text-yellow-300"
                      : status === "wrong"
                      ? "border-red-500 bg-red-50 text-red-700 dark:border-red-400 dark:bg-red-950 dark:text-red-300"
                      : selected[i]
                      ? "border-zinc-400 bg-white text-zinc-900 dark:border-zinc-500 dark:bg-zinc-900 dark:text-zinc-50"
                      : "border-dashed border-zinc-300 bg-white text-zinc-400 dark:border-zinc-600 dark:bg-zinc-900 dark:text-zinc-500"
                  }`}
                >
                  {selected[i]?.letter ?? ""}
                </div>
              ))}
            </div>
          </div>

          {message && (
            <p className={`text-sm font-medium ${status === "wrong" ? "text-red-500" : "text-yellow-500 dark:text-yellow-400"}`}>
              {message}
            </p>
          )}

          <div className="flex flex-wrap justify-center gap-3">
            {tiles.map((tile) => {
              const used = selectedIds.has(tile.id);
              return (
                <button
                  key={tile.id}
                  type="button"
                  disabled={used}
                  onClick={() => handleTileClick(tile)}
                  className={`flex h-14 w-14 cursor-pointer items-center justify-center rounded-xl border-2 text-xl font-bold uppercase shadow-sm transition-all duration-150 ${
                    used
                      ? "border-transparent bg-zinc-100 text-zinc-300 opacity-40 dark:bg-zinc-800 dark:text-zinc-600"
                      : "border-zinc-300 bg-white text-zinc-900 hover:border-zinc-500 hover:shadow-md active:scale-95 dark:border-zinc-600 dark:bg-zinc-900 dark:text-zinc-50 dark:hover:border-zinc-400"
                  }`}
                >
                  {tile.letter}
                </button>
              );
            })}
          </div>

          <div className="flex gap-3">
            <button
              type="button"
              onClick={handleUndo}
              className="inline-flex items-center justify-center rounded-full border border-zinc-300 bg-white px-5 py-2.5 text-sm font-semibold text-zinc-700 transition-colors hover:bg-zinc-100 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-300 dark:hover:bg-zinc-800"
            >
              Undo
            </button>
            <button
              type="button"
              onClick={handleClear}
              className="inline-flex items-center justify-center rounded-full border border-zinc-300 bg-white px-5 py-2.5 text-sm font-semibold text-zinc-700 transition-colors hover:bg-zinc-100 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-300 dark:hover:bg-zinc-800"
            >
              Clear
            </button>
            <button
              type="button"
              onClick={handleSubmit}
              disabled={selected.length !== currentWord.length}
              className={`inline-flex items-center justify-center rounded-full px-6 py-2.5 text-sm font-semibold transition-colors ${
                selected.length !== currentWord.length
                  ? "cursor-not-allowed bg-zinc-200 text-zinc-400 dark:bg-zinc-800 dark:text-zinc-600"
                  : "cursor-pointer bg-zinc-900 text-white hover:bg-zinc-700 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-300"
              }`}
            >
              Submit
            </button>
          </div>
        </div>
      )}
    </>
  );
}

/* ---------------- Page ---------------- */

export default function AnagramsPage() {
  const { words } = useGameWords();
  const router = useRouter();

  const bankKey = useMemo(
    () => words.map((w) => w.trim()).filter(Boolean).join("\0"),
    [words]
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
          Anagrams
        </h1>
        <div className="flex w-[120px] justify-end sm:w-[140px]">
          <RulesDropdown />
        </div>
      </header>

      <main className="flex flex-1 flex-col items-center gap-6">
        <AnagramGame
          key={bankKey}
          words={words}
          bankKey={bankKey}
          onGoHome={() => router.push("/home")}
        />
      </main>
    </div>
  );
}