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

function RulesDropdown() {
  const [open, setOpen] = useState(false);

  return (
    <div className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex h-8 w-8 items-center justify-center rounded-full border border-zinc-300 bg-white text-sm font-semibold text-zinc-600 hover:bg-zinc-100 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-400"
      >
        ?
      </button>

      {open && (
        <>
          {/* click outside to close */}
          <div
            className="fixed inset-0 z-10"
            onClick={() => setOpen(false)}
          />

          <div className="absolute right-0 z-20 mt-2 w-72 rounded-xl border border-zinc-200 bg-white p-4 shadow-lg dark:border-zinc-700 dark:bg-zinc-900">
            <p className="mb-2 text-sm font-semibold">How to play</p>
            <ul className="text-xs text-zinc-600 dark:text-zinc-400 space-y-1">
              <li>• Tap or type letters to form a word.</li>
              <li>• Use all letters to complete the word.</li>
              <li>• Press <strong>Submit</strong> or Enter to check.</li>
              <li>• Green: <><span className="text-green-500">Correct word.</span></></li>
              <li>• Yellow: <><span className="text-yellow-500">Real word, but not the target (1 retry).</span></></li>
              <li>• Red: <><span className="text-red-500">Incorrect word.</span></></li>
              <li>• Complete all words to finish!</li>
            </ul>
          </div>
        </>
      )}
    </div>
  );
}

/* ---------------- Modal ---------------- */

function CongratsModal({ score, total, onPlayAgain, onGoHome }: any) {
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

  const [status, setStatus] = useState<"idle" | "correct" | "almost" | "wrong">("idle");
  const [message, setMessage] = useState("");

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
    }
  }, [currentWord]);

  /* ---------------- Submit Logic ---------------- */

  const handleSubmit = useCallback(async () => {
    if (!currentWord) return;
    if (selected.length !== currentWord.length) return;

    const attempt = selected.map((t) => t.letter).join("").toLowerCase();

    if (attempt === currentWord.toLowerCase()) {
      // ✅ CORRECT
      setStatus("correct");
      setScore((s) => s + 1);

      setTimeout(() => {
        const nextIndex = index + 1;
        if (nextIndex >= gameWords.length) {
          setShowCongrats(true);
        } else {
          setIndex(nextIndex);
        }
      }, 800);
      return;
    }

    const valid = await isValidWord(attempt);

    if (valid && !retryUsed) {
      // 🟡 VALID WORD (FIRST FAIL)
      setStatus("almost");
      setMessage("Not the right word, Try again");
      setRetryUsed(true);

      setTimeout(() => {
        setSelected([]);
        setStatus("idle");
        setMessage("");
      }, 1500);
    } else {
      // ❌ WRONG
      setStatus("wrong");
      setMessage(`Incorrect — the correct word was: ${currentWord.toUpperCase()}`);

      setSelected(
        currentWord.split("").map((letter) => ({
          id: crypto.randomUUID(),
          letter,
        }))
      );

      setTimeout(() => {
        const nextIndex = index + 1;
        if (nextIndex >= gameWords.length) {
          setShowCongrats(true);
        } else {
          setIndex(nextIndex);
        }
      }, 1500);
    }
  }, [selected, currentWord, retryUsed, index, gameWords.length]);

  /* ---------------- Tile Click ---------------- */

  const handleTileClick = (tile: Tile) => {
    if (status !== "idle") return;
    if (selectedIds.has(tile.id)) return;

    setSelected((prev) => [...prev, tile]);
  };

  /* ---------------- Controls ---------------- */

  const handleUndo = () => setSelected((prev) => prev.slice(0, -1));
  const handleClear = () => setSelected([]);

  /* ---------------- Keyboard ---------------- */

  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      const key = e.key.toLowerCase();

      if (key === "backspace") {
        handleUndo();
        return;
      }

      if (key === "enter") {
        handleSubmit();
        return;
      }

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
    setShowCongrats(false);
  };

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

      {!showCongrats && currentWord && (
        <div className="flex flex-col items-center gap-6">

          <p className="text-sm text-zinc-400">
            Word {index + 1} of {gameWords.length}
          </p>

          {/* Word slots */}
          <div className="flex gap-3">
            {Array.from({ length: currentWord.length }).map((_, i) => (
              <div
                key={i}
                className={`w-12 h-12 flex items-center justify-center rounded-lg text-xl font-bold border-2
                ${
                  status === "correct"
                    ? "bg-green-500 text-white"
                    : status === "almost"
                    ? "bg-yellow-400 text-black"
                    : status === "wrong"
                    ? "bg-red-500 text-white"
                    : "bg-zinc-700 text-white"
                }`}
              >
                {selected[i]?.letter ?? ""}
              </div>
            ))}
          </div>

          {/* Message */}
          {message && (
            <p
              className={`text-sm font-semibold ${
                status === "wrong"
                  ? "text-red-400"
                  : "text-yellow-400"
              }`}
            >
              {message}
            </p>
          )}

          {/* Tiles */}
          <div className="flex flex-wrap gap-3 justify-center">
            {tiles.map((tile) => {
              const used = selectedIds.has(tile.id);

              return (
                <button
                  key={tile.id}
                  disabled={used}
                  onClick={() => handleTileClick(tile)}
                  className={`w-14 h-14 rounded-xl border-2 text-xl font-bold
                  ${
                    used
                      ? "opacity-30"
                      : "bg-white text-black hover:bg-zinc-200"
                  }`}
                >
                  {tile.letter}
                </button>
              );
            })}
          </div>

          {/* Controls */}
          <div className="flex gap-4">
            <button onClick={handleUndo} className="border px-5 py-2 rounded-full">
              Undo
            </button>
            <button onClick={handleClear} className="border px-5 py-2 rounded-full">
              Clear
            </button>
            <button
              onClick={handleSubmit}
              disabled={selected.length !== currentWord.length}
              className={`px-5 py-2 rounded-full border transition
              ${
                selected.length !== currentWord.length
                  ? "opacity-40 cursor-not-allowed bg-zinc-700 text-zinc-400 border-zinc-600"
                  : "bg-blue-500 text-white hover:bg-blue-600 border-blue-600"
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
          className="inline-flex min-w-[140px] items-center justify-center rounded-full bg-zinc-900 px-8 py-3 text-sm font-semibold text-white hover:bg-zinc-800 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-200"
        >
          Go to setup
        </Link>
      </div>
    );
  }

  return (
    <div className="flex min-h-full flex-col bg-zinc-950 px-6 pt-10">
      <header className="mb-6 flex w-full items-center justify-between gap-4">
        <Link
          href="/home"
          className="text-sm font-medium text-zinc-600 underline-offset-4 hover:text-zinc-900 hover:underline dark:text-zinc-400 dark:hover:text-zinc-50"
        >
          ← Back to games
        </Link>

        <h1 className="text-center text-2xl font-bold text-white">
          Anagrams
        </h1>
        <div className="flex w-[120px] justify-end sm:w-[140px]">
          <RulesDropdown />
        </div>
      </header>

      <div className="flex flex-1 items-center justify-center">
        <AnagramGame
          key={bankKey}
          words={words}
          bankKey={bankKey}
          onGoHome={() => router.push("/home")}
        />
      </div>
    </div>
  );
}