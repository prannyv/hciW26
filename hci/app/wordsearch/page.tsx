"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import { markGameCompleted } from "../gameCompletions";
import { useGameWords } from "../gameWords";

type Direction = "H" | "V" | "D-SE" | "D-SW";

const GRID_SIZE = 10;
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
  return shuffle(nonEmpty).slice(0, Math.min(take, nonEmpty.length));
}

function dirDelta(dir: Direction): [number, number] {
  switch (dir) {
    case "H": return [0, 1];
    case "V": return [1, 0];
    case "D-SE": return [1, 1];
    case "D-SW": return [1, -1];
  }
}

function buildGrid(words: string[]) {
  const size = GRID_SIZE;
  const grid: string[][] = Array.from({ length: size }, () =>
    Array.from({ length: size }, () => "")
  );

  const placedWords: { word: string; cells: [number, number][] }[] = [];

  for (const word of words) {
    const upper = word.toUpperCase();
    const len = upper.length;

    for (let attempt = 0; attempt < 100; attempt++) {
      const dirs: Direction[] = shuffle(["H", "V", "D-SE", "D-SW"]);

      for (const dir of dirs) {
        const [dr, dc] = dirDelta(dir);

        const startRow = Math.floor(Math.random() * size);
        const startCol = Math.floor(Math.random() * size);

        const cells: [number, number][] = [];
        let valid = true;

        for (let i = 0; i < len; i++) {
          const r = startRow + i * dr;
          const c = startCol + i * dc;
          if (r < 0 || r >= size || c < 0 || c >= size) {
            valid = false;
            break;
          }
          if (grid[r][c] && grid[r][c] !== upper[i]) {
            valid = false;
            break;
          }
          cells.push([r, c]);
        }

        if (!valid) continue;

        cells.forEach(([r, c], i) => {
          grid[r][c] = upper[i];
        });

        placedWords.push({ word: upper, cells });
        break;
      }
      if (placedWords.find(p => p.word === upper)) break;
    }
  }

  for (let r = 0; r < size; r++) {
    for (let c = 0; c < size; c++) {
      if (!grid[r][c]) {
        grid[r][c] = ALPHABET[Math.floor(Math.random() * 26)];
      }
    }
  }

  return { grid, placedWords };
}

function cellKey(r: number, c: number) {
  return `${r},${c}`;
}

function getCellsInLine(start: [number, number], end: [number, number]) {
  const [r1, c1] = start;
  const [r2, c2] = end;
  const dr = Math.sign(r2 - r1);
  const dc = Math.sign(c2 - c1);
  const steps = Math.max(Math.abs(r2 - r1), Math.abs(c2 - c1));

  const result: [number, number][] = [];
  for (let i = 0; i <= steps; i++) {
    result.push([r1 + i * dr, c1 + i * dc]);
  }
  return result;
}

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
        className="flex h-8 w-8 items-center justify-center rounded-full border border-zinc-300 bg-white text-sm font-semibold text-zinc-600 transition-colors hover:bg-zinc-100 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-400 dark:hover:bg-zinc-800"
      >
        ?
      </button>
      {open && (
        <div className="absolute right-0 z-20 mt-2 w-72 rounded-xl border border-zinc-200 bg-white p-4 shadow-lg dark:border-zinc-700 dark:bg-zinc-900">
          <p className="mb-1 text-sm font-semibold text-zinc-900 dark:text-zinc-50">How to play</p>
          <ul className="space-y-1 text-xs text-zinc-600 dark:text-zinc-400">
            <li>• Click a starting letter, then click the ending letter</li>
            <li>• Words can be horizontal, vertical, or diagonal</li>
            <li>• Words can be forwards or backwards</li>
            <li>• Find all words to win!</li>
          </ul>
        </div>
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
          You found {score} out of {total} words!
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

function WordSearchGame({ words, bankKey, onGoHome }: any) {
  const gameWords = useMemo(() => pickRandomWords(words, 6), [words]);
  const { grid, placedWords } = useMemo(() => buildGrid(gameWords), [gameWords]);

  const [foundWords, setFoundWords] = useState<Set<string>>(new Set());
  const [foundCells, setFoundCells] = useState<Set<string>>(new Set());
  const [startCell, setStartCell] = useState<[number, number] | null>(null);
  const [currentCell, setCurrentCell] = useState<[number, number] | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [wrongFlash, setWrongFlash] = useState(false);
  const [showCongrats, setShowCongrats] = useState(false);

  const selectedCells = useMemo(() => {
    if (!startCell || !currentCell || !isDragging) return [];
    return getCellsInLine(startCell, currentCell);
  }, [startCell, currentCell, isDragging]);

  const tryComplete = useCallback((end: [number, number]) => {
    if (!startCell) return;

    const line = getCellsInLine(startCell, end);
    const str = line.map(([r, c]) => grid[r][c]).join("");
    const rev = str.split("").reverse().join("");
    
    let found = false;

    for (const w of gameWords.map(w => w.toUpperCase())) {
      if (str === w || rev === w) {
        if (!foundWords.has(w)) {
          setFoundWords(prev => {
            const next = new Set(prev);
            next.add(w);
            return next;
          });
          
          const placed = placedWords.find(p => p.word === w);
          if (placed) {
            setFoundCells(prev => {
              const next = new Set(prev);
              placed.cells.forEach(([r, c]) => next.add(cellKey(r, c)));
              return next;
            });
          }
          found = true;
        }
      }
    }
    
    if (!found && line.length > 1) {
      setWrongFlash(true);
      setTimeout(() => setWrongFlash(false), 400);
    }

    setStartCell(null);
    setCurrentCell(null);
    setIsDragging(false);
  }, [startCell, grid, gameWords, placedWords, foundWords]);

  useEffect(() => {
    if (foundWords.size === gameWords.length && !showCongrats) {
      setShowCongrats(true);
      markGameCompleted(bankKey, "wordsoup");
    }
  }, [foundWords, gameWords, bankKey, showCongrats]);

  const handlePlayAgain = useCallback(() => {
    window.location.reload();
  }, []);

  const handleGoHome = useCallback(() => {
    onGoHome();
  }, [onGoHome]);

  const progress = (foundWords.size / gameWords.length) * 100;

  return (
    
    <>
      <style jsx>{`
        @keyframes wiggle {
          0% { transform: scale(1) rotate(0deg); }
          25% { transform: scale(1.08) rotate(3deg); }
          50% { transform: scale(1.08) rotate(-3deg); }
          75% { transform: scale(1.08) rotate(1deg); }
          100% { transform: scale(1) rotate(0deg); }
        }

        .wiggle {
          animation: wiggle 0.25s ease-in-out;
        }
      `}</style>
      {showCongrats && (
        <CongratsModal
          score={foundWords.size}
          total={gameWords.length}
          onPlayAgain={handlePlayAgain}
          onGoHome={handleGoHome}
        />
      )}

      <main className="flex w-full flex-1 flex-col items-center gap-6">
        <div className="w-full max-w-md">
          <div className="mb-1 flex justify-between text-xs text-zinc-500 dark:text-zinc-400">
            <span>Words Found</span>
            <span>{foundWords.size} of {gameWords.length}</span>
          </div>
          <div className="h-2 w-full overflow-hidden rounded-full bg-zinc-200 dark:bg-zinc-800">
            <div
              className="h-full rounded-full bg-zinc-900 transition-all duration-500 dark:bg-zinc-100"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>

        <div className="flex justify-center">
          <div 
            className="grid gap-0.5 rounded-xl border-2 border-zinc-200 bg-zinc-100 p-1.5 dark:border-zinc-700 dark:bg-zinc-800"
            style={{ 
              gridTemplateColumns: `repeat(${GRID_SIZE}, minmax(0, 1fr))`,
              width: 'fit-content'
            }}
          >
            {grid.map((row, r) =>
              row.map((letter, c) => {
                const key = cellKey(r, c);
                const isFound = foundCells.has(key);
                const isSelected = selectedCells.some(([sr, sc]) => sr === r && sc === c);
                const isStart = startCell && startCell[0] === r && startCell[1] === c;

                let bg = "bg-white dark:bg-zinc-900";
                if (isFound) bg = "bg-green-500 dark:bg-green-600 text-white";
                else if (wrongFlash && isSelected) bg = "bg-red-400 dark:bg-red-600 text-white";
                else if (isStart) bg = "bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900";
                else if (isSelected) bg = "bg-zinc-300 dark:bg-zinc-600";

                return (
                  <button
                    key={key}
                    onMouseDown={() => {
                      setStartCell([r, c]);
                      setCurrentCell([r, c]);
                      setIsDragging(true);
                    }}
                    onMouseEnter={() => {
                      if (isDragging) setCurrentCell([r, c]);
                    }}
                    onMouseUp={() => tryComplete([r, c])}
                    onContextMenu={(e) => {
                      e.preventDefault();
                      setStartCell(null);
                      setCurrentCell(null);
                      setIsDragging(false);
                    }}
                    className={`flex items-center justify-center rounded-md font-bold select-none transition-all duration-150 ${bg} ${
                      !isFound ? "cursor-pointer" : "cursor-default"
                    } ${
                      !isFound && isSelected ? "wiggle scale-110" : !isFound ? "hover:wiggle hover:scale-110" : ""
                    }`}
                    style={{
                      width: `clamp(28px, ${Math.floor(360 / GRID_SIZE)}px, 44px)`,
                      height: `clamp(28px, ${Math.floor(360 / GRID_SIZE)}px, 44px)`,
                      fontSize: `clamp(0.7rem, ${Math.floor(280 / GRID_SIZE)}px, 1.1rem)`,
                    }}
                    
                  >
                    {letter}
                  </button>
                );
              })
            )}
          </div>
        </div>

        <div className="w-full max-w-md">
          <div className="font-semibold mb-3 text-sm text-zinc-600 dark:text-zinc-400">Words to find</div>
          <div className="grid grid-cols-2 gap-2">
            {gameWords.map((w: string) => {
              const upper = w.toUpperCase();
              const found = foundWords.has(upper);
              return (
                <div
                  key={upper}
                  className={`px-3 py-2 rounded-lg text-sm font-medium transition-all ${
                    found 
                      ? "line-through opacity-50 text-zinc-500 dark:text-zinc-400 bg-zinc-100 dark:bg-zinc-800" 
                      : "text-zinc-900 dark:text-zinc-50 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700"
                  }`}
                >
                  {upper}
                </div>
              );
            })}
          </div>
        </div>

        <p className={`text-xs transition-opacity ${startCell && !isDragging ? "text-zinc-400 dark:text-zinc-500 opacity-100" : "opacity-0"}`}>
          Click the last letter to complete the word · Right click to cancel
        </p>
      </main>
    </>
  );
}

export default function WordSoupPage() {
  const { words } = useGameWords();
  const router = useRouter();

  const bankKey = useMemo(() => words.map((w) => w.trim()).filter(Boolean).join("\0"), [words]);

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
          Word Search
        </h1>
        <div className="flex w-[120px] justify-end sm:w-[140px]">
          <RulesDropdown />
        </div>
      </header>

      <div className="flex flex-1 flex-col">
        <WordSearchGame 
          key={bankKey} 
          words={words} 
          bankKey={bankKey} 
          onGoHome={() => router.push("/home")}
        />
      </div>
    </div>
  );
}