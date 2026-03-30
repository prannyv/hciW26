"use client";

import {
  DndContext,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  arrayMove,
  rectSortingStrategy,
  useSortable,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { markGameCompleted } from "../gameCompletions";
import { useGameWords } from "../gameWords";

type WordItem = { id: string; word: string };
type CheckState = "idle" | "correct" | "incorrect";

/** Shuffle in place (Fisher–Yates), then return first `take` elements. */
function pickRandomWords(bank: string[], take: number): string[] {
  const nonEmpty = bank.map((w) => w.trim()).filter(Boolean);
  if (nonEmpty.length === 0) return [];

  const copy = [...nonEmpty];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy.slice(0, Math.min(take, copy.length));
}

function wordsToItems(words: string[]): WordItem[] {
  return words.map((word) => ({ id: crypto.randomUUID(), word }));
}


function boxClasses(
  checkState: CheckState,
  isLifted: boolean,
  isSelected: boolean,
  isHeld: boolean,
): string {
  const base =
    "flex flex-col items-center justify-center gap-1 rounded-xl border px-3 py-3 text-center shadow-sm touch-none cursor-grab active:cursor-grabbing select-none outline-none";

  if (isLifted) {
    return `${base} border-zinc-400 bg-zinc-200 shadow-md ring-2 ring-zinc-400/80 dark:border-zinc-500 dark:bg-zinc-600 dark:ring-zinc-400/50`;
  }
  if (isHeld) {
    return `${base} border-amber-400 bg-amber-50 ring-2 ring-amber-400 ring-offset-2 ring-offset-zinc-50 dark:border-amber-500 dark:bg-amber-950 dark:ring-amber-500 dark:ring-offset-zinc-950`;
  }
  if (checkState === "idle" && isSelected) {
    return `${base} border-zinc-200 bg-white ring-2 ring-blue-500 ring-offset-2 ring-offset-zinc-50 dark:border-zinc-800 dark:bg-zinc-900 dark:ring-blue-400 dark:ring-offset-zinc-950`;
  }
  if (checkState === "correct") return `${base} transition-colors duration-500 border-green-800 bg-green-900`;
  if (checkState === "incorrect") return `${base} transition-colors duration-500 border-red-800 bg-red-900`;
  return `${base} transition-colors duration-200 border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900`;
}

function numberClasses(checkState: CheckState, isLifted: boolean): string {
  if (isLifted || checkState === "idle") return "text-zinc-700 dark:text-zinc-100";
  if (checkState === "correct") return "text-green-300";
  return "text-red-300";
}

function wordClasses(checkState: CheckState, isLifted: boolean): string {
  if (isLifted || checkState === "idle") return "text-zinc-900 dark:text-zinc-50";
  if (checkState === "correct") return "text-green-100";
  return "text-red-100";
}

function SortableWordBox({
  id,
  position,
  word,
  checkState,
  isSelected,
  isHeld,
  onSelect,
}: {
  id: string;
  position: number;
  word: string;
  checkState: CheckState;
  isSelected: boolean;
  isHeld: boolean;
  onSelect: () => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id });
  const [pressing, setPressing] = useState(false);
  const isLifted = isDragging || pressing;

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 20 : undefined,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={boxClasses(checkState, isLifted, isSelected, isHeld)}
      aria-label={`Position ${position}, ${word}.${isHeld ? " Held — use arrow keys to move, Space to drop." : isSelected ? " Selected." : ""}`}
      aria-selected={isSelected}
      onClick={() => onSelect()}
      {...attributes}
      {...listeners}
      onPointerDown={(e) => {
        (listeners as { onPointerDown?: (ev: React.PointerEvent) => void } | undefined)?.onPointerDown?.(e);
        setPressing(true);
      }}
      onPointerUp={() => setPressing(false)}
      onPointerLeave={() => setPressing(false)}
      onPointerCancel={() => setPressing(false)}
      tabIndex={-1}
    >
      <span
        className={`font-semibold tabular-nums ${numberClasses(checkState, isLifted)}`}
        style={{ fontSize: "clamp(0.45rem, min(1vw, 1.4vh), 0.875rem)" }}
      >
        {position}
      </span>
      <span
        className={`break-words font-medium ${wordClasses(checkState, isLifted)}`}
        style={{ fontSize: "clamp(0.6rem, min(1.8vw, 2.4vh), 1.25rem)" }}
      >
        {word}
      </span>
    </div>
  );
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
          {/* backdrop to close on outside click */}
          <div
            className="fixed inset-0 z-10"
            aria-hidden
            onClick={() => setOpen(false)}
          />
          <div className="absolute right-0 z-20 mt-2 w-72 rounded-xl border border-zinc-200 bg-white p-4 shadow-lg dark:border-zinc-700 dark:bg-zinc-900">
            <p className="mb-1 text-sm font-semibold text-zinc-900 dark:text-zinc-50">How to play</p>
            <ul className="space-y-1 text-xs text-zinc-600 dark:text-zinc-400">
              <li>• Words from your list are shown in a random order.</li>
              <li>• Drag and drop the boxes to arrange them in alphabetical order.</li>
              <li>
                • <strong>Keyboard:</strong> tab to the tile grid to focus it. Use{" "}
                <strong>arrow keys</strong> to move the blue selection ring between tiles.
                Press <strong>Space</strong> to pick up the selected tile (turns amber) —
                then arrow keys <strong>move</strong> it. Press <strong>Space</strong> again to drop.
                <strong>Escape</strong> cancels.
              </li>
              <li>• When you&apos;re ready, press <strong>Check Answers</strong>.</li>
              <li>• Green = correct position · Red = incorrect position.</li>
              <li>• Moving a box resets all colours so you can try again.</li>
            </ul>
          </div>
        </>
      )}
    </div>
  );
}

function CongratsModal({ onPlayAgain, onGoHome }: { onPlayAgain: () => void; onGoHome: () => void }) {
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
          Congratulations!
        </h2>
        <p className="mb-8 text-base text-zinc-600 dark:text-zinc-400">
          You got them all correct!
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

const GRID_COLS = 4;

/** Remount when parent `key` (bank content) changes for a fresh random draw. */
function AlphabeticalPlay({
  words,
  bankKey,
  onGoHome,
}: {
  words: string[];
  bankKey: string;
  onGoHome: () => void;
}) {
  const [items, setItems] = useState<WordItem[]>(() => wordsToItems(pickRandomWords(words, 20)));
  const [checkStates, setCheckStates] = useState<CheckState[]>([]);
  const [showCongrats, setShowCongrats] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [heldId, setHeldId] = useState<string | null>(null);
  const gridRef = useRef<HTMLDivElement>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
  );

  // Auto-focus the grid so arrow keys work immediately without clicking
  useEffect(() => {
    gridRef.current?.focus();
  }, []);

  // Keep selectedId valid when items change (e.g. Play Again resets the list)
  useEffect(() => {
    if (items.length === 0) { setSelectedId(null); return; }
    setSelectedId((prev) => {
      if (prev === null) return null;                        // don't auto-select on mount
      if (items.some((i) => i.id === prev)) return prev;   // still valid
      return null;                                          // item gone, deselect
    });
  }, [items]);

  const handleGridKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      const n = items.length;
      if (n === 0) return;

      if (["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown"].includes(e.key)) {
        e.preventDefault();
        // First arrow press with nothing selected → select first tile
        const anchorId = heldId ?? selectedId;
        if (!anchorId) {
          setSelectedId(items[0].id);
          return;
        }
        const idx = items.findIndex((i) => i.id === anchorId);
        if (idx === -1) return;
        const row = Math.floor(idx / GRID_COLS);
        const col = idx % GRID_COLS;
        let next = -1;
        if (e.key === "ArrowLeft" && col > 0) next = idx - 1;
        else if (e.key === "ArrowRight" && col < GRID_COLS - 1 && idx + 1 < n) next = idx + 1;
        else if (e.key === "ArrowUp" && row > 0) next = idx - GRID_COLS;
        else if (e.key === "ArrowDown" && idx + GRID_COLS < n) next = idx + GRID_COLS;
        if (next === -1) return;
        if (heldId) {
          // Move held tile to adjacent slot
          setCheckStates([]);
          setItems((prev) => arrayMove(prev, idx, next));
          // selectedId stays as heldId (it moved with the tile)
        } else {
          setSelectedId(items[next].id);
        }
        return;
      }

      if (e.key === " ") {
        e.preventDefault();
        if (heldId) {
          setHeldId(null);
        } else if (selectedId) {
          setHeldId(selectedId);
          setCheckStates([]);
        }
        return;
      }

      if (e.key === "Escape" && heldId) {
        e.preventDefault();
        setHeldId(null);
      }
    },
    [items, selectedId, heldId],
  );

  const handleDragStart = useCallback(() => {
    setSelectedId(null);
    setHeldId(null);
    // Two rAF calls let the browser paint the current colored state first,
    // so transition-colors can animate the change rather than jumping instantly.
    requestAnimationFrame(() => {
      requestAnimationFrame(() => setCheckStates([]));
    });
  }, []);

  const handleDragEnd = useCallback((event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    setItems((prev) => {
      const oldIndex = prev.findIndex((item) => item.id === active.id);
      const newIndex = prev.findIndex((item) => item.id === over.id);
      if (oldIndex === -1 || newIndex === -1) return prev;
      return arrayMove(prev, oldIndex, newIndex);
    });
  }, []);

  const handleCheckAnswers = useCallback(() => {
    const sorted = [...items].sort((a, b) =>
      a.word.toLowerCase().localeCompare(b.word.toLowerCase()),
    );
    const states: CheckState[] = items.map((item, i) =>
      item.word.toLowerCase() === sorted[i].word.toLowerCase() ? "correct" : "incorrect",
    );
    setCheckStates(states);
    if (states.every((s) => s === "correct")) {
      markGameCompleted(bankKey, "alphabetical");
      setShowCongrats(true);
    }
  }, [items, bankKey]);

  const handlePlayAgain = useCallback(() => {
    setShowCongrats(false);
    setCheckStates([]);
    setHeldId(null);
    setItems(wordsToItems(pickRandomWords(words, 20)));
  }, [words]);

  const bankWordCount = words.filter((w) => w.trim()).length;

  return (
    <>
      {showCongrats && (
        <CongratsModal onPlayAgain={handlePlayAgain} onGoHome={onGoHome} />
      )}

      <main
        className="flex w-full flex-1 flex-col"
        onMouseDown={(e) => {
          const tag = (e.target as HTMLElement).closest("button, a, input, select, textarea");
          if (!tag) { e.preventDefault(); gridRef.current?.focus(); }
        }}
      >
        {items.length < 20 && bankWordCount < 20 && (
          <p className="mb-4 text-center text-sm text-zinc-600 dark:text-zinc-400">
            Add more words in setup to always get 20 here.
          </p>
        )}

        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragStart={handleDragStart}
          onDragEnd={handleDragEnd}
        >
          <SortableContext items={items.map((i) => i.id)} strategy={rectSortingStrategy}>
            <div
              ref={gridRef}
              className="rounded-lg p-1 outline-none"
              tabIndex={0}
              role="group"
              aria-label="Word tiles. Arrow keys move selection. Space to pick up or drop a tile. Drag tiles to reorder."
              onKeyDown={handleGridKeyDown}
            >
              <div className="mx-auto grid w-full max-w-3xl flex-1 grid-cols-4 gap-3" style={{ gridAutoRows: "clamp(80px, 14vh, 130px)" }}>
                {items.map((item, i) => (
                  <SortableWordBox
                    key={item.id}
                    id={item.id}
                    position={i + 1}
                    word={item.word}
                    checkState={checkStates[i] ?? "idle"}
                    isSelected={item.id === selectedId}
                    isHeld={item.id === heldId}
                    onSelect={() => { setSelectedId(item.id); gridRef.current?.focus(); }}
                  />
                ))}
              </div>
            </div>
          </SortableContext>
        </DndContext>

        <div className="mt-6 flex flex-col items-center gap-3">
          <button
            type="button"
            onClick={handleCheckAnswers}
            className="inline-flex min-w-[180px] items-center justify-center rounded-full bg-zinc-900 px-10 py-4 text-lg font-semibold text-white transition-colors hover:bg-zinc-700 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-300"
          >
            Check Answers
          </button>
          {checkStates.length > 0 &&
            !checkStates.every((s) => s === "correct") &&
            !showCongrats && (
              <p className="max-w-md text-center text-sm text-zinc-600 dark:text-zinc-400">
                Keep trying — rearrange the tiles and press Check Answers again when you&apos;re ready.
              </p>
            )}
        </div>
      </main>
    </>
  );
}

export default function AlphabeticalPage() {
  const { words } = useGameWords();

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
    <AlphabeticalPageInner key={bankKey} words={words} bankKey={bankKey} />
  );
}

function AlphabeticalPageInner({ words, bankKey }: { words: string[]; bankKey: string }) {
  const router = useRouter();

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
          Alphabetical
        </h1>
        <div className="flex w-[120px] justify-end sm:w-[140px]">
          <RulesDropdown />
        </div>
      </header>

      <div className="flex flex-1 flex-col">
        <AlphabeticalPlay
          key={bankKey}
          words={words}
          bankKey={bankKey}
          onGoHome={() => router.push("/home")}
        />
      </div>
    </div>
  );
}
