"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { markGameCompleted } from "../gameCompletions";
import { useGameWords } from "../gameWords";

type Phase = "unscramble" | "find";
type LetterTile = { id: string; letter: string };
type Direction = "H" | "V" | "D-SE" | "D-SW";

const GRID_SIZE = 8;
const ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";

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
  return shuffle(nonEmpty).slice(0, Math.min(take, nonEmpty.length));
}

function makeTiles(word: string): LetterTile[] {
  return shuffle(
    word.split("").map((letter) => ({ id: crypto.randomUUID(), letter })),
  );
}

function dirDelta(dir: Direction): [number, number] {
  switch (dir) {
    case "H": return [0, 1];
    case "V": return [1, 0];
    case "D-SE": return [1, 1];
    case "D-SW": return [1, -1];
  }
}

function buildGrid(word: string): { grid: string[][]; wordCells: [number, number][] } {
  const upper = word.toUpperCase();
  const len = upper.length;
  const size = Math.max(GRID_SIZE, len + 2);

  for (let attempt = 0; attempt < 200; attempt++) {
    const dirs: Direction[] = shuffle(["H", "V", "D-SE", "D-SW"]);
    for (const dir of dirs) {
      const [dr, dc] = dirDelta(dir);
      const maxRow = size - 1 - (dr !== 0 ? (len - 1) * Math.abs(dr) : 0);
      const maxColEnd = size - 1;
      const minCol = dir === "D-SW" ? len - 1 : 0;
      const maxColStart = dir === "D-SW" ? maxColEnd : maxColEnd - (len - 1) * Math.abs(dc);

      if (maxRow < 0 || maxColStart < minCol) continue;

      const startRow = Math.floor(Math.random() * (maxRow + 1));
      const startCol = minCol + Math.floor(Math.random() * (maxColStart - minCol + 1));

      const cells: [number, number][] = [];
      let valid = true;
      for (let i = 0; i < len; i++) {
        const r = startRow + i * dr;
        const c = startCol + i * dc;
        if (r < 0 || r >= size || c < 0 || c >= size) { valid = false; break; }
        cells.push([r, c]);
      }
      if (!valid) continue;

      const grid: string[][] = Array.from({ length: size }, () =>
        Array.from({ length: size }, () => ALPHABET[Math.floor(Math.random() * 26)]),
      );
      cells.forEach(([r, c], i) => { grid[r][c] = upper[i]; });

      return { grid, wordCells: cells };
    }
  }

  const grid: string[][] = Array.from({ length: size }, () =>
    Array.from({ length: size }, () => ALPHABET[Math.floor(Math.random() * 26)]),
  );
  const cells: [number, number][] = [];
  for (let i = 0; i < len; i++) {
    grid[0][i] = upper[i];
    cells.push([0, i]);
  }
  return { grid, wordCells: cells };
}

function cellKey(r: number, c: number) { return `${r},${c}`; }

function getCellsInLine(
  start: [number, number],
  end: [number, number],
): [number, number][] {
  const [r1, c1] = start;
  const [r2, c2] = end;
  const dr = Math.sign(r2 - r1);
  const dc = Math.sign(c2 - c1);
  const steps = Math.max(Math.abs(r2 - r1), Math.abs(c2 - c1));

  const isDiag = dr !== 0 && dc !== 0;
  const isStraight = dr === 0 || dc === 0;
  if (!isDiag && !isStraight) return [[r1, c1]];
  if (isDiag && Math.abs(r2 - r1) !== Math.abs(c2 - c1)) return [[r1, c1]];

  const result: [number, number][] = [];
  for (let i = 0; i <= steps; i++) {
    result.push([r1 + i * dr, c1 + i * dc]);
  }
  return result;
}

// --- Components ---

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
          <div className="fixed inset-0 z-10" aria-hidden onClick={() => setOpen(false)} />
          <div className="absolute right-0 z-20 mt-2 w-72 rounded-xl border border-zinc-200 bg-white p-4 shadow-lg dark:border-zinc-700 dark:bg-zinc-900">
            <p className="mb-1 text-sm font-semibold text-zinc-900 dark:text-zinc-50">How to play</p>
            <ul className="space-y-1 text-xs text-zinc-600 dark:text-zinc-400">
              <li>• First, unscramble the letters to spell the word.</li>
              <li>• Type on your keyboard or tap the letter tiles.</li>
              <li>• Then, find and select the word in the letter grid.</li>
              <li>• Click a starting cell, then click the ending cell.</li>
              <li>• Complete all words to win!</li>
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

function UnscramblePhase({
  word,
  onSolved,
}: {
  word: string;
  onSolved: () => void;
}) {
  const [tiles, setTiles] = useState<LetterTile[]>(() => makeTiles(word));
  const [selected, setSelected] = useState<LetterTile[]>([]);
  const [shake, setShake] = useState(false);
  const [correct, setCorrect] = useState(false);

  const selectedIds = new Set(selected.map((t) => t.id));

  useEffect(() => {
    setTiles(makeTiles(word));
    setSelected([]);
    setShake(false);
    setCorrect(false);
  }, [word]);

  const handleTileTap = useCallback(
    (tile: LetterTile) => {
      if (correct) return;
      if (selectedIds.has(tile.id)) return;

      const next = [...selected, tile];
      setSelected(next);

      if (next.length === word.length) {
        const attempt = next.map((t) => t.letter).join("");
        if (attempt.toLowerCase() === word.toLowerCase()) {
          setCorrect(true);
          setTimeout(() => onSolved(), 700);
        } else {
          setShake(true);
          setTimeout(() => {
            setShake(false);
            setSelected([]);
          }, 500);
        }
      }
    },
    [selected, selectedIds, correct, word, onSolved],
  );

  const handleBackspace = useCallback(() => {
    if (correct) return;
    setSelected((prev) => prev.slice(0, -1));
  }, [correct]);

  const handleClear = useCallback(() => {
    if (correct) return;
    setSelected([]);
  }, [correct]);

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (correct) return;
      if (e.key === "Backspace") { e.preventDefault(); handleBackspace(); return; }
      if (e.key === "Escape") { e.preventDefault(); handleClear(); return; }
      const key = e.key.toLowerCase();
      if (key.length !== 1 || !/[a-z]/.test(key)) return;
      const match = tiles.find((t) => !selectedIds.has(t.id) && t.letter.toLowerCase() === key);
      if (match) handleTileTap(match);
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [tiles, selectedIds, correct, handleTileTap, handleBackspace, handleClear]);

  const borderColor = correct
    ? "border-green-500 bg-green-950/30"
    : shake
      ? "border-red-500 bg-red-950/30"
      : "border-zinc-300 dark:border-zinc-700";

  return (
    <div className="flex flex-col items-center gap-5">
      <p className="text-sm font-medium text-zinc-500 dark:text-zinc-400">
        Unscramble the word ({word.length} letters)
      </p>

      <div
        className={`flex min-h-14 items-center justify-center gap-2 rounded-2xl border-2 px-4 py-3 transition-colors duration-300 ${borderColor} ${shake ? "animate-shake" : ""}`}
        style={{ minWidth: Math.min(word.length * 48, 380) }}
      >
        {Array.from({ length: word.length }).map((_, i) => {
          const letter = selected[i]?.letter;
          return (
            <div
              key={i}
              className={`flex h-10 w-10 items-center justify-center rounded-lg text-lg font-bold transition-all duration-150 ${
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

      <div className="flex max-w-md flex-wrap justify-center gap-3 px-2">
        {tiles.map((tile) => {
          const used = selectedIds.has(tile.id);
          return (
            <button
              key={tile.id}
              type="button"
              disabled={used || correct}
              onClick={() => handleTileTap(tile)}
              className={`flex h-13 w-13 items-center justify-center rounded-xl border-2 text-xl font-bold transition-all duration-150 ${
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

      <div className="flex gap-3">
        <button
          type="button"
          onClick={handleBackspace}
          disabled={selected.length === 0 || correct}
          className="inline-flex items-center justify-center rounded-full border border-zinc-300 bg-white px-5 py-2.5 text-sm font-semibold text-zinc-700 transition-colors hover:bg-zinc-100 disabled:opacity-30 disabled:cursor-not-allowed dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-300 dark:hover:bg-zinc-800"
        >
          Undo
        </button>
        <button
          type="button"
          onClick={handleClear}
          disabled={selected.length === 0 || correct}
          className="inline-flex items-center justify-center rounded-full border border-zinc-300 bg-white px-5 py-2.5 text-sm font-semibold text-zinc-700 transition-colors hover:bg-zinc-100 disabled:opacity-30 disabled:cursor-not-allowed dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-300 dark:hover:bg-zinc-800"
        >
          Clear
        </button>
      </div>
    </div>
  );
}

function FindPhase({
  word,
  onFound,
}: {
  word: string;
  onFound: () => void;
}) {
  const { grid } = useMemo(() => buildGrid(word), [word]);
  const size = grid.length;

  const [startCell, setStartCell] = useState<[number, number] | null>(null);
  const [hoverCell, setHoverCell] = useState<[number, number] | null>(null);
  const [found, setFound] = useState(false);
  const [wrongFlash, setWrongFlash] = useState(false);
  const [foundCells, setFoundCells] = useState<Set<string>>(new Set());
  const draggingRef = useRef(false);

  const previewCells = useMemo(() => {
    if (!startCell || !hoverCell) return new Set<string>();
    const line = getCellsInLine(startCell, hoverCell);
    return new Set(line.map(([r, c]) => cellKey(r, c)));
  }, [startCell, hoverCell]);

  const tryComplete = useCallback(
    (endR: number, endC: number) => {
      if (found || !startCell) return;
      const line = getCellsInLine(startCell, [endR, endC]);
      const selectedStr = line.map(([lr, lc]) => grid[lr][lc]).join("");
      const upper = word.toUpperCase();

      if (selectedStr === upper || selectedStr.split("").reverse().join("") === upper) {
        setFound(true);
        setFoundCells(new Set(line.map(([lr, lc]) => cellKey(lr, lc))));
        setTimeout(() => onFound(), 800);
      } else {
        setWrongFlash(true);
        setTimeout(() => setWrongFlash(false), 400);
        setStartCell(null);
        setHoverCell(null);
      }
    },
    [found, startCell, grid, word, onFound],
  );

  const handlePointerDown = useCallback(
    (r: number, c: number) => {
      if (found) return;
      if (startCell) {
        tryComplete(r, c);
        return;
      }
      draggingRef.current = true;
      setStartCell([r, c]);
      setHoverCell([r, c]);
    },
    [found, startCell, tryComplete],
  );

  const handlePointerEnter = useCallback(
    (r: number, c: number) => {
      if (found || !startCell) return;
      setHoverCell([r, c]);
    },
    [found, startCell],
  );

  const handlePointerUp = useCallback(
    (r: number, c: number) => {
      if (!draggingRef.current || found || !startCell) {
        draggingRef.current = false;
        return;
      }
      draggingRef.current = false;
      if (startCell[0] === r && startCell[1] === c) return;
      tryComplete(r, c);
    },
    [found, startCell, tryComplete],
  );

  const handleCancelSelection = useCallback(() => {
    if (!found) {
      draggingRef.current = false;
      setStartCell(null);
      setHoverCell(null);
    }
  }, [found]);

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") {
        draggingRef.current = false;
        setStartCell(null);
        setHoverCell(null);
      }
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  return (
    <div className="flex flex-col items-center gap-5">
      <p className="text-sm font-medium text-zinc-500 dark:text-zinc-400">
        Now find <span className="font-bold text-zinc-900 dark:text-zinc-50">{word.toUpperCase()}</span> in the grid
      </p>

      <p className={`text-xs transition-opacity ${startCell && !found ? "text-zinc-400 dark:text-zinc-500 opacity-100" : "opacity-0"}`}>
        Drag to the last letter or click it · Esc to cancel
      </p>

      <div
        className="relative inline-grid gap-0.5 rounded-xl border-2 border-zinc-200 bg-zinc-100 p-1.5 dark:border-zinc-700 dark:bg-zinc-800"
        style={{
          gridTemplateColumns: `repeat(${size}, minmax(0, 1fr))`,
        }}
      >
        {grid.flatMap((row, r) =>
          row.map((letter, c) => {
            const key = cellKey(r, c);
            const isFound = foundCells.has(key);
            const isPreview = previewCells.has(key);
            const isStart = startCell && startCell[0] === r && startCell[1] === c;

            let bg = "bg-white dark:bg-zinc-900";
            if (isFound) bg = "bg-green-500 dark:bg-green-600 text-white";
            else if (wrongFlash && isPreview) bg = "bg-red-400 dark:bg-red-600 text-white";
            else if (isStart) bg = "bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900";
            else if (isPreview) bg = "bg-zinc-300 dark:bg-zinc-600";

            return (
              <button
                key={key}
                type="button"
                onPointerDown={() => handlePointerDown(r, c)}
                onPointerEnter={() => handlePointerEnter(r, c)}
                onPointerUp={() => handlePointerUp(r, c)}
                onContextMenu={(e) => { e.preventDefault(); handleCancelSelection(); }}
                className={`flex items-center justify-center rounded-md font-bold select-none transition-colors duration-150 ${bg} ${
                  found ? "" : "cursor-pointer hover:ring-2 hover:ring-zinc-400 dark:hover:ring-zinc-500"
                }`}
                style={{
                  width: `clamp(28px, ${Math.floor(360 / size)}px, 44px)`,
                  height: `clamp(28px, ${Math.floor(360 / size)}px, 44px)`,
                  fontSize: `clamp(0.7rem, ${Math.floor(280 / size)}px, 1.1rem)`,
                }}
              >
                {letter}
              </button>
            );
          }),
        )}
      </div>
    </div>
  );
}

function WordSoupPlay({
  words,
  bankKey,
  onGoHome,
}: {
  words: string[];
  bankKey: string;
  onGoHome: () => void;
}) {
  const gameWords = useMemo(() => pickRandomWords(words, 8), [words]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [phase, setPhase] = useState<Phase>("unscramble");
  const [score, setScore] = useState(0);
  const [showCongrats, setShowCongrats] = useState(false);

  useEffect(() => {
    if (showCongrats && bankKey) markGameCompleted(bankKey, "wordsoup");
  }, [showCongrats, bankKey]);

  const currentWord = gameWords[currentIndex] ?? "";
  const progress = (currentIndex / gameWords.length) * 100;

  const handleUnscrambled = useCallback(() => {
    setPhase("find");
  }, []);

  const handleFound = useCallback(() => {
    setScore((s) => s + 1);
    const nextIdx = currentIndex + 1;
    if (nextIdx >= gameWords.length) {
      setShowCongrats(true);
      return;
    }
    setCurrentIndex(nextIdx);
    setPhase("unscramble");
  }, [currentIndex, gameWords.length]);

  const handleSkip = useCallback(() => {
    const nextIdx = currentIndex + 1;
    if (nextIdx >= gameWords.length) {
      setShowCongrats(true);
      return;
    }
    setCurrentIndex(nextIdx);
    setPhase("unscramble");
  }, [currentIndex, gameWords.length]);

  const handlePlayAgain = useCallback(() => {
    setShowCongrats(false);
    setCurrentIndex(0);
    setPhase("unscramble");
    setScore(0);
  }, []);

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
        <div className="w-full max-w-md">
          <div className="mb-1 flex justify-between text-xs text-zinc-500 dark:text-zinc-400">
            <span>Word {currentIndex + 1} of {gameWords.length}</span>
            <span>{score} correct</span>
          </div>
          <div className="h-2 w-full overflow-hidden rounded-full bg-zinc-200 dark:bg-zinc-800">
            <div
              className="h-full rounded-full bg-zinc-900 transition-all duration-500 dark:bg-zinc-100"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>

        <div className="flex items-center gap-3">
          <span
            className={`rounded-full px-3 py-1 text-xs font-semibold transition-colors ${
              phase === "unscramble"
                ? "bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900"
                : "bg-zinc-200 text-zinc-500 dark:bg-zinc-800 dark:text-zinc-400"
            }`}
          >
            1 · Unscramble
          </span>
          <div className="h-px w-6 bg-zinc-300 dark:bg-zinc-700" />
          <span
            className={`rounded-full px-3 py-1 text-xs font-semibold transition-colors ${
              phase === "find"
                ? "bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900"
                : "bg-zinc-200 text-zinc-500 dark:bg-zinc-800 dark:text-zinc-400"
            }`}
          >
            2 · Find in Grid
          </span>
        </div>

        {phase === "unscramble" ? (
          <UnscramblePhase key={currentIndex} word={currentWord} onSolved={handleUnscrambled} />
        ) : (
          <FindPhase key={`find-${currentIndex}`} word={currentWord} onFound={handleFound} />
        )}

        <button
          type="button"
          onClick={handleSkip}
          className="mt-2 inline-flex items-center justify-center rounded-full border border-zinc-300 bg-white px-5 py-2.5 text-sm font-semibold text-zinc-700 transition-colors hover:bg-zinc-100 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-300 dark:hover:bg-zinc-800"
        >
          Skip
        </button>
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
          bankKey={bankKey}
          onGoHome={() => router.push("/home")}
        />
      </div>
    </div>
  );
}
