"use client";

import {
  DndContext,
  KeyboardSensor,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  arrayMove,
  rectSortingStrategy,
  sortableKeyboardCoordinates,
  useSortable,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useMemo, useRef, useState } from "react";
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


function boxClasses(checkState: CheckState, isDragging: boolean): string {
  const base =
    "flex flex-col items-center justify-center gap-1 rounded-xl border px-3 py-3 text-center shadow-sm touch-none transition-colors duration-700 cursor-grab active:cursor-grabbing select-none";

  if (isDragging) {
    return `${base} border-zinc-300 bg-zinc-800 opacity-90 shadow-lg ring-2 ring-zinc-400 dark:ring-zinc-500`;
  }
  if (checkState === "correct") return `${base} border-green-800 bg-green-900`;
  if (checkState === "incorrect") return `${base} border-red-800 bg-red-900`;
  return `${base} border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900`;
}

function numberClasses(checkState: CheckState, isDragging: boolean): string {
  if (isDragging || checkState === "idle") return "text-zinc-500 dark:text-zinc-400";
  if (checkState === "correct") return "text-green-300";
  return "text-red-300";
}

function wordClasses(checkState: CheckState, isDragging: boolean): string {
  if (isDragging || checkState === "idle") return "text-zinc-900 dark:text-zinc-50";
  if (checkState === "correct") return "text-green-100";
  return "text-red-100";
}

function SortableWordBox({
  id,
  position,
  word,
  checkState,
}: {
  id: string;
  position: number;
  word: string;
  checkState: CheckState;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 20 : undefined,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={boxClasses(checkState, isDragging)}
      aria-label={`Position ${position}, ${word}. Drag to reorder.`}
      {...attributes}
      {...listeners}
    >
      <span
        className={`font-semibold tabular-nums ${numberClasses(checkState, isDragging)}`}
        style={{ fontSize: "clamp(0.45rem, min(1vw, 1.4vh), 0.875rem)" }}
      >
        {position}
      </span>
      <span
        className={`break-words font-medium ${wordClasses(checkState, isDragging)}`}
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

/** Remount when parent `key` (bank content) changes for a fresh random draw. */
function AlphabeticalPlay({ words, onGoHome }: { words: string[]; onGoHome: () => void }) {
  const [items, setItems] = useState<WordItem[]>(() => wordsToItems(pickRandomWords(words, 20)));
  const [checkStates, setCheckStates] = useState<CheckState[]>([]);
  const [showCongrats, setShowCongrats] = useState(false);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const handleDragStart = useCallback((_event: DragStartEvent) => {
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
      setShowCongrats(true);
    }
  }, [items]);

  const handlePlayAgain = useCallback(() => {
    setShowCongrats(false);
    setCheckStates([]);
    setItems(wordsToItems(pickRandomWords(words, 20)));
  }, [words]);

  const bankWordCount = words.filter((w) => w.trim()).length;

  return (
    <>
      {showCongrats && (
        <CongratsModal onPlayAgain={handlePlayAgain} onGoHome={onGoHome} />
      )}

      <main className="flex w-full flex-1 flex-col">
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
            <div className="grid flex-1 grid-cols-5 gap-3" style={{ gridAutoRows: "1fr" }}>
              {items.map((item, i) => (
                <SortableWordBox
                  key={item.id}
                  id={item.id}
                  position={i + 1}
                  word={item.word}
                  checkState={checkStates[i] ?? "idle"}
                />
              ))}
            </div>
          </SortableContext>
        </DndContext>

        <div className="mt-6 flex justify-center">
          <button
            type="button"
            onClick={handleCheckAnswers}
            className="inline-flex min-w-[180px] items-center justify-center rounded-full bg-zinc-900 px-10 py-4 text-lg font-semibold text-white transition-colors hover:bg-zinc-700 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-300"
          >
            Check Answers
          </button>
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
          onGoHome={() => router.push("/home")}
        />
      </div>
    </div>
  );
}
