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
    <div className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex h-8 w-8 items-center justify-center rounded-full border border-zinc-300 bg-white text-sm font-semibold text-zinc-600 hover:bg-zinc-100 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-400"
      >
        ?
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />

          <div className="absolute right-0 z-20 mt-2 w-72 rounded-xl border border-zinc-200 bg-white p-4 shadow-lg dark:border-zinc-700 dark:bg-zinc-900">
            <p className="mb-2 text-sm font-semibold">How to play</p>
            <ul className="text-xs text-zinc-600 dark:text-zinc-400 space-y-1">
              <li>• Tap or type letters to form a word.</li>
              <li>• Use all letters to complete the word.</li>
              <li>• Press Submit or Enter.</li>
              <li>• Green = correct</li>
              <li>• Yellow = real word (1 retry)</li>
              <li>• Red = incorrect</li>
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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4">
      <div className="w-full max-w-sm rounded-2xl bg-white px-8 py-10 text-center shadow-2xl dark:bg-zinc-900">
        <h2 className="mb-2 text-2xl font-bold">Well Done!</h2>
        <p className="mb-6">You scored {score} / {total}</p>

        <div className="flex flex-col gap-3">
          <button
            onClick={onPlayAgain}
            className="rounded-full bg-zinc-900 px-6 py-3 text-white dark:bg-zinc-100 dark:text-zinc-900"
          >
            Play Again
          </button>
          <button
            onClick={onGoHome}
            className="rounded-full border px-6 py-3"
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
      setStatus("wrong");
      setMessage(`Incorrect — the correct word was: ${currentWord.toUpperCase()}`);

      setShake(true);
      setTimeout(() => setShake(false), 500);

      setSelected(
        currentWord.split("").map((letter) => ({
          id: crypto.randomUUID(),
          letter,
        }))
      );

      setTimeout(() => {
        const next = index + 1;
        next >= gameWords.length ? setShowCongrats(true) : setIndex(next);
      }, 1500);
    }
  }, [selected, currentWord, retryUsed, index, gameWords.length, status]);

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
        <div className="flex w-full flex-col items-center gap-6">

          <p className="text-sm text-zinc-400">
            Word {index + 1} of {gameWords.length}
          </p>

          {/* SLOT CONTAINER */}
          <div
            className={`rounded-2xl border border-zinc-300 bg-white p-4 transition
            dark:border-zinc-700 dark:bg-zinc-900
            ${shake ? "animate-shake" : ""}`}
          >
            <div className="flex gap-3">
              {Array.from({ length: currentWord.length }).map((_, i) => (
                <div
                  key={i}
                  className={`w-12 h-12 flex items-center justify-center rounded-xl text-xl font-bold border-2
                  ${
                    status === "correct"
                      ? "bg-green-500 text-white"
                      : status === "almost"
                      ? "bg-yellow-400 text-black"
                      : status === "wrong"
                      ? "bg-red-500 text-white"
                      : "bg-white text-zinc-900 dark:bg-zinc-800 dark:text-zinc-50"
                  }`}
                >
                  {selected[i]?.letter ?? ""}
                </div>
              ))}
            </div>
          </div>

          {message && (
            <p className={`text-sm font-semibold ${status === "wrong" ? "text-red-400" : "text-yellow-400"}`}>
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
                  className={`w-14 h-14 rounded-xl border-2 text-xl font-bold transition
                  ${
                    used
                      ? "opacity-30"
                      : "bg-white text-zinc-900 hover:bg-zinc-100 dark:bg-zinc-800 dark:text-zinc-50 dark:hover:bg-zinc-700"
                  }`}
                >
                  {tile.letter}
                </button>
              );
            })}
          </div>

          {/* Controls */}
          <div className="flex gap-4">
            <button onClick={handleUndo} className="rounded-full border px-5 py-2">Undo</button>
            <button onClick={handleClear} className="rounded-full border px-5 py-2">Clear</button>

            <button
              onClick={handleSubmit}
              disabled={selected.length !== currentWord.length}
              className={`px-5 py-2 rounded-full border transition
              ${
                selected.length !== currentWord.length
                  ? "opacity-40 cursor-not-allowed bg-zinc-200 text-zinc-400"
                  : "bg-blue-500 text-white"
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
      <div className="flex min-h-full flex-1 flex-col items-center justify-center gap-6 bg-white px-6 dark:bg-zinc-950">
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
    <div className="relative flex min-h-full flex-col items-center bg-white px-6 py-10 dark:bg-zinc-950">

      {/* EDGE HEADER */}
      <div className="absolute top-6 left-0 w-full px-6 flex justify-between">
        <Link href="/home">← Back to games</Link>
        <RulesDropdown />
      </div>

      <div className="w-full max-w-md flex flex-col items-center">
        <h1 className="mb-8 text-2xl font-bold">Anagrams</h1>

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