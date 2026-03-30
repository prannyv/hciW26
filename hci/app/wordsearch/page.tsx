"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { markGameCompleted } from "../gameCompletions";
import { useGameWords } from "../gameWords";

type Direction = "H" | "V" | "D-SE" | "D-SW" | "D-NE" | "D-NW";

const ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
const DIRECTIONS: Direction[] = ["H", "V", "D-SE", "D-SW", "D-NE", "D-NW"];

/** Light grey tints so words stay distinguishable but read clearly as “done”. */
const FOUND_COLORS = [
  "bg-zinc-200 text-zinc-800 dark:bg-zinc-600 dark:text-zinc-100",
  "bg-neutral-200 text-neutral-800 dark:bg-neutral-600 dark:text-neutral-100",
  "bg-stone-200 text-stone-800 dark:bg-stone-600 dark:text-stone-100",
  "bg-slate-200 text-slate-800 dark:bg-slate-600 dark:text-slate-100",
  "bg-gray-200 text-gray-800 dark:bg-gray-600 dark:text-gray-100",
  "bg-zinc-300/80 text-zinc-900 dark:bg-zinc-500 dark:text-zinc-50",
  "bg-neutral-300/80 text-neutral-900 dark:bg-neutral-500 dark:text-neutral-50",
  "bg-stone-300/80 text-stone-900 dark:bg-stone-500 dark:text-stone-50",
  "bg-slate-300/80 text-slate-900 dark:bg-slate-500 dark:text-slate-50",
  "bg-gray-300/80 text-gray-900 dark:bg-gray-500 dark:text-gray-50",
  "bg-zinc-200/90 text-zinc-800 dark:bg-zinc-600/90 dark:text-zinc-100",
  "bg-neutral-200/90 text-neutral-800 dark:bg-neutral-600/90 dark:text-neutral-100",
];

/** Pastel shades while dragging (rotates each new selection). */
const DRAG_PASTELS = [
  "bg-emerald-300/70 text-zinc-900 ring-[3px] ring-emerald-400/80 dark:bg-emerald-600/45 dark:text-zinc-50 dark:ring-emerald-500/50 z-10",
  "bg-sky-300/70 text-zinc-900 ring-[3px] ring-sky-400/80 dark:bg-sky-600/45 dark:text-zinc-50 dark:ring-sky-500/50 z-10",
  "bg-amber-300/70 text-zinc-900 ring-[3px] ring-amber-400/80 dark:bg-amber-600/45 dark:text-zinc-50 dark:ring-amber-500/50 z-10",
  "bg-rose-300/70 text-zinc-900 ring-[3px] ring-rose-400/80 dark:bg-rose-600/45 dark:text-zinc-50 dark:ring-rose-500/50 z-10",
  "bg-violet-300/70 text-zinc-900 ring-[3px] ring-violet-400/80 dark:bg-violet-600/45 dark:text-zinc-50 dark:ring-violet-500/50 z-10",
  "bg-teal-300/70 text-zinc-900 ring-[3px] ring-teal-400/80 dark:bg-teal-600/45 dark:text-zinc-50 dark:ring-teal-500/50 z-10",
  "bg-orange-300/70 text-zinc-900 ring-[3px] ring-orange-400/80 dark:bg-orange-600/45 dark:text-zinc-50 dark:ring-orange-500/50 z-10",
  "bg-indigo-300/70 text-zinc-900 ring-[3px] ring-indigo-400/80 dark:bg-indigo-600/45 dark:text-zinc-50 dark:ring-indigo-500/50 z-10",
  "bg-pink-300/70 text-zinc-900 ring-[3px] ring-pink-400/80 dark:bg-pink-600/45 dark:text-zinc-50 dark:ring-pink-500/50 z-10",
  "bg-lime-300/70 text-zinc-900 ring-[3px] ring-lime-400/80 dark:bg-lime-600/45 dark:text-zinc-50 dark:ring-lime-500/50 z-10",
  "bg-cyan-300/70 text-zinc-900 ring-[3px] ring-cyan-400/80 dark:bg-cyan-600/45 dark:text-zinc-50 dark:ring-cyan-500/50 z-10",
  "bg-fuchsia-300/70 text-zinc-900 ring-[3px] ring-fuchsia-400/80 dark:bg-fuchsia-600/45 dark:text-zinc-50 dark:ring-fuchsia-500/50 z-10",
];

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
  const unique = [...new Set(nonEmpty.map((w) => w.toLowerCase()))];
  return shuffle(unique).slice(0, Math.min(take, unique.length));
}

function dirDelta(dir: Direction): [number, number] {
  switch (dir) {
    case "H":    return [0, 1];
    case "V":    return [1, 0];
    case "D-SE": return [1, 1];
    case "D-SW": return [1, -1];
    case "D-NE": return [-1, 1];
    case "D-NW": return [-1, -1];
  }
}

function computeGridSize(words: string[]): number {
  if (words.length === 0) return 10;
  const avgLen = words.reduce((s, w) => s + w.length, 0) / words.length;
  return Math.max(10, Math.min(18, Math.ceil(avgLen * 1.5 + 3)));
}

function buildMultiWordGrid(words: string[]): {
  grid: string[][];
  placements: Map<string, [number, number][]>;
} {
  const size = computeGridSize(words);
  const grid: string[][] = Array.from({ length: size }, () =>
    Array.from({ length: size }, () => ""),
  );
  const placements = new Map<string, [number, number][]>();

  const sorted = [...words].sort((a, b) => b.length - a.length);

  for (const word of sorted) {
    const upper = word.toUpperCase();
    const len = upper.length;
    let placed = false;

    const dirs = shuffle([...DIRECTIONS]);

    for (let attempt = 0; attempt < 300 && !placed; attempt++) {
      const dir = dirs[attempt % dirs.length];
      const [dr, dc] = dirDelta(dir);

      const rowRange = dr > 0 ? size - len : dr < 0 ? len - 1 : 0;
      const rowMax = dr > 0 ? size - len : dr < 0 ? size - 1 : size - 1;
      const rowMin = dr > 0 ? 0 : dr < 0 ? len - 1 : 0;

      const colMin = dc > 0 ? 0 : dc < 0 ? len - 1 : 0;
      const colMax = dc > 0 ? size - len : dc < 0 ? size - 1 : size - 1;

      if (rowMin > rowMax || colMin > colMax) continue;

      const startRow = rowMin + Math.floor(Math.random() * (rowMax - rowMin + 1));
      const startCol = colMin + Math.floor(Math.random() * (colMax - colMin + 1));

      const cells: [number, number][] = [];
      let valid = true;

      for (let i = 0; i < len; i++) {
        const r = startRow + i * dr;
        const c = startCol + i * dc;
        if (r < 0 || r >= size || c < 0 || c >= size) { valid = false; break; }
        const existing = grid[r][c];
        if (existing !== "" && existing !== upper[i]) { valid = false; break; }
        cells.push([r, c]);
      }

      if (!valid) continue;

      cells.forEach(([r, c], i) => { grid[r][c] = upper[i]; });
      placements.set(word.toLowerCase(), cells);
      placed = true;
    }

    if (!placed) {
      const r = 0;
      const startC = 0;
      const cells: [number, number][] = [];
      for (let i = 0; i < len && i < size; i++) {
        if (grid[r][startC + i] === "" || grid[r][startC + i] === upper[i]) {
          cells.push([r, startC + i]);
        }
      }
      if (cells.length === len) {
        cells.forEach(([cr, cc], i) => { grid[cr][cc] = upper[i]; });
        placements.set(word.toLowerCase(), cells);
      }
    }
  }

  for (let r = 0; r < size; r++) {
    for (let c = 0; c < size; c++) {
      if (grid[r][c] === "") {
        grid[r][c] = ALPHABET[Math.floor(Math.random() * 26)];
      }
    }
  }

  return { grid, placements };
}

function cellKey(r: number, c: number) {
  return `${r},${c}`;
}

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
              <li>• Find all the hidden words in the letter grid.</li>
              <li>• Words can go horizontally, vertically, or diagonally.</li>
              <li>• Click a starting letter, then drag to the ending letter.</li>
              <li>• Found words will be highlighted and crossed off the list.</li>
              <li>• Find all words to win!</li>
            </ul>
          </div>
        </>
      )}
    </div>
  );
}

function CongratsModal({
  total,
  onPlayAgain,
  onGoHome,
}: {
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
          You found all {total} words!
        </p>
        <div className="flex flex-col gap-3 sm:flex-row sm:justify-center">
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

function WordSearchGame({
  words,
  bankKey,
  onGoHome,
}: {
  words: string[];
  bankKey: string;
  onGoHome: () => void;
}) {
  const wordCount = Math.min(12, Math.max(8, words.length));
  const [gameId, setGameId] = useState(0);

  const gameWords = useMemo(
    () => pickRandomWords(words, wordCount),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [words, wordCount, gameId],
  );

  const { grid, placements } = useMemo(
    () => buildMultiWordGrid(gameWords),
    [gameWords],
  );

  const size = grid.length;

  const [foundWords, setFoundWords] = useState<Set<string>>(new Set());
  const [foundCellMap, setFoundCellMap] = useState<Map<string, string>>(new Map());
  const [startCell, setStartCell] = useState<[number, number] | null>(null);
  const [hoverCell, setHoverCell] = useState<[number, number] | null>(null);
  const [wrongFlash, setWrongFlash] = useState(false);
  const [showCongrats, setShowCongrats] = useState(false);
  const draggingRef = useRef(false);
  const colorIndexRef = useRef(0);
  const dragPaletteRef = useRef(0);
  const [dragPreviewClass, setDragPreviewClass] = useState(DRAG_PASTELS[0]);

  useEffect(() => {
    setFoundWords(new Set());
    setFoundCellMap(new Map());
    setStartCell(null);
    setHoverCell(null);
    setWrongFlash(false);
    setShowCongrats(false);
    colorIndexRef.current = 0;
    dragPaletteRef.current = 0;
    setDragPreviewClass(DRAG_PASTELS[0]);
  }, [gameId]);

  useEffect(() => {
    if (showCongrats && bankKey) markGameCompleted(bankKey, "wordsearch");
  }, [showCongrats, bankKey]);

  const previewCells = useMemo(() => {
    if (!startCell || !hoverCell) return new Set<string>();
    const line = getCellsInLine(startCell, hoverCell);
    return new Set(line.map(([r, c]) => cellKey(r, c)));
  }, [startCell, hoverCell]);

  const tryComplete = useCallback(
    (endR: number, endC: number) => {
      if (!startCell) return;
      const line = getCellsInLine(startCell, [endR, endC]);
      const selectedStr = line.map(([lr, lc]) => grid[lr][lc]).join("");
      const reversed = selectedStr.split("").reverse().join("");

      let matchedWord: string | null = null;
      for (const word of gameWords) {
        if (foundWords.has(word)) continue;
        const upper = word.toUpperCase();
        if (selectedStr === upper || reversed === upper) {
          matchedWord = word;
          break;
        }
      }

      if (matchedWord) {
        const colorClass = FOUND_COLORS[colorIndexRef.current % FOUND_COLORS.length];
        colorIndexRef.current++;

        const newFoundWords = new Set(foundWords);
        newFoundWords.add(matchedWord);
        setFoundWords(newFoundWords);

        const newCellMap = new Map(foundCellMap);
        line.forEach(([r, c]) => {
          newCellMap.set(cellKey(r, c), colorClass);
        });
        setFoundCellMap(newCellMap);

        setStartCell(null);
        setHoverCell(null);

        if (newFoundWords.size === gameWords.length) {
          setTimeout(() => setShowCongrats(true), 600);
        }
      } else {
        setWrongFlash(true);
        setTimeout(() => setWrongFlash(false), 400);
        setStartCell(null);
        setHoverCell(null);
      }
    },
    [startCell, grid, gameWords, foundWords, foundCellMap],
  );

  const handlePointerDown = useCallback(
    (r: number, c: number) => {
      if (showCongrats) return;
      if (startCell) {
        tryComplete(r, c);
        return;
      }
      const idx = dragPaletteRef.current % DRAG_PASTELS.length;
      dragPaletteRef.current += 1;
      setDragPreviewClass(DRAG_PASTELS[idx]);
      draggingRef.current = true;
      setStartCell([r, c]);
      setHoverCell([r, c]);
    },
    [showCongrats, startCell, tryComplete],
  );

  const handlePointerEnter = useCallback(
    (r: number, c: number) => {
      if (showCongrats || !startCell) return;
      setHoverCell([r, c]);
    },
    [showCongrats, startCell],
  );

  const handlePointerUp = useCallback(
    (r: number, c: number) => {
      if (!draggingRef.current || showCongrats || !startCell) {
        draggingRef.current = false;
        return;
      }
      draggingRef.current = false;
      if (startCell[0] === r && startCell[1] === c) return;
      tryComplete(r, c);
    },
    [showCongrats, startCell, tryComplete],
  );

  const handleCancelSelection = useCallback(() => {
    draggingRef.current = false;
    setStartCell(null);
    setHoverCell(null);
  }, []);

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

  const handlePlayAgain = useCallback(() => {
    setGameId((id) => id + 1);
  }, []);

  const progress = gameWords.length > 0
    ? (foundWords.size / gameWords.length) * 100
    : 0;

  return (
    <>
      {showCongrats && (
        <CongratsModal
          total={gameWords.length}
          onPlayAgain={handlePlayAgain}
          onGoHome={onGoHome}
        />
      )}

      <div className="w-full max-w-md mx-auto mb-4">
        <div className="mb-1 flex justify-between text-xs text-zinc-500 dark:text-zinc-400">
          <span>{foundWords.size} of {gameWords.length} words found</span>
        </div>
        <div className="h-2 w-full overflow-hidden rounded-full bg-zinc-200 dark:bg-zinc-800">
          <div
            className="h-full rounded-full bg-zinc-900 transition-all duration-500 dark:bg-zinc-100"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>

      <div className="flex flex-col lg:flex-row items-start justify-center gap-8 w-full">
        <div
          className="relative inline-grid gap-0.5 rounded-xl border-2 border-zinc-200 bg-zinc-100 p-1.5 dark:border-zinc-700 dark:bg-zinc-800 touch-none shrink-0"
          style={{
            gridTemplateColumns: `repeat(${size}, minmax(0, 1fr))`,
          }}
        >
          {grid.flatMap((row, r) =>
            row.map((letter, c) => {
              const key = cellKey(r, c);
              const foundColor = foundCellMap.get(key);
              const isPreview = previewCells.has(key);

              let bg = "bg-white dark:bg-zinc-900";
              let ring = "";
              if (foundColor) {
                bg = foundColor;
              }
              if (wrongFlash && isPreview) {
                bg = "bg-red-400 dark:bg-red-600 text-white";
                ring = "ring-[3px] ring-red-400 dark:ring-red-600 z-10";
              } else if (isPreview && !foundColor) {
                bg = dragPreviewClass;
              }

              return (
                <button
                  key={key}
                  type="button"
                  onPointerDown={() => handlePointerDown(r, c)}
                  onPointerEnter={() => handlePointerEnter(r, c)}
                  onPointerUp={() => handlePointerUp(r, c)}
                  onContextMenu={(e) => { e.preventDefault(); handleCancelSelection(); }}
                  className={`flex items-center justify-center rounded-md font-bold select-none transition-colors duration-150 ${bg} ${ring} ${
                    showCongrats ? "" : "cursor-pointer hover:ring-2 hover:ring-zinc-400 dark:hover:ring-zinc-500"
                  }`}
                  style={{
                    width: `clamp(26px, ${Math.floor(420 / size)}px, 42px)`,
                    height: `clamp(26px, ${Math.floor(420 / size)}px, 42px)`,
                    fontSize: `clamp(0.65rem, ${Math.floor(300 / size)}px, 1.05rem)`,
                  }}
                >
                  {letter}
                </button>
              );
            }),
          )}
        </div>

        <div className="w-full lg:w-56 shrink-0">
          <h3 className="mb-3 text-sm font-semibold text-zinc-900 dark:text-zinc-50">
            Word Bank
          </h3>
          <ul className="space-y-2">
            {gameWords.map((word) => {
              const isFound = foundWords.has(word);
              return (
                <li
                  key={word}
                  className={`text-sm font-medium transition-all duration-300 ${
                    isFound
                      ? "text-zinc-400 line-through dark:text-zinc-600"
                      : "text-zinc-800 dark:text-zinc-200"
                  }`}
                >
                  {word.charAt(0).toUpperCase() + word.slice(1)}
                </li>
              );
            })}
          </ul>
        </div>
      </div>
    </>
  );
}

export default function WordSearchPage() {
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
          Word Search
        </h1>
        <div className="flex w-[120px] justify-end sm:w-[140px]">
          <RulesDropdown />
        </div>
      </header>

      <main className="flex flex-1 flex-col items-center gap-6">
        <WordSearchGame
          key={bankKey}
          words={words}
          bankKey={bankKey}
          onGoHome={() => router.push("/home")}
        />
      </main>
    </div>
  );
}
