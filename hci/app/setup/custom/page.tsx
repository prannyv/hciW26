"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useGameWords } from "../../gameWords";

const MIN_WORDS = 5;

function nonEmptyWordCount(words: string[]): number {
  return words.map((w) => w.trim()).filter(Boolean).length;
}

export default function SetupCustomPage() {
  const { words, setWords } = useGameWords();
  const router = useRouter();
  const [minWordsMessage, setMinWordsMessage] = useState<string | null>(null);

  const filledCount = nonEmptyWordCount(words);

  useEffect(() => {
    if (filledCount >= MIN_WORDS) setMinWordsMessage(null);
  }, [filledCount]);

  function handleGo() {
    const n = nonEmptyWordCount(words);
    if (n < MIN_WORDS) {
      const need = MIN_WORDS - n;
      setMinWordsMessage(
        `Add at least ${MIN_WORDS} words. You have ${n} — add ${need} more.`,
      );
      return;
    }
    setMinWordsMessage(null);
    router.push("/home");
  }

  return (
    <div className="flex min-h-full flex-1 flex-col bg-zinc-50 px-6 pb-16 pt-10 dark:bg-zinc-950">
      <div className="mx-auto mb-4 w-full max-w-5xl">
        <Link
          href="/setup/select"
          className="text-sm font-medium text-zinc-600 underline-offset-4 hover:text-zinc-900 hover:underline dark:text-zinc-400 dark:hover:text-zinc-50"
        >
          ← Back
        </Link>
      </div>
      <h1 className="text-center text-3xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50">
        Spelling Central
      </h1>

      <main className="mx-auto mt-10 w-full max-w-5xl">
        <div className="mx-auto grid w-fit grid-flow-col grid-rows-6 gap-3">
          {words.map((value, i) => (
            <input
              key={i}
              value={value}
              onChange={(e) => {
                const next = [...words];
                next[i] = e.target.value;
                setWords(next);
              }}
              className="h-11 w-56 rounded-md border border-zinc-300 bg-white px-3 text-zinc-900 outline-none ring-offset-2 focus:ring-2 focus:ring-zinc-400 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-50 dark:focus:ring-zinc-600"
            />
          ))}

          <button
            type="button"
            onClick={() => setWords([...words, ""])}
            className="mt-2 inline-flex h-12 w-12 items-center justify-center justify-self-center rounded-full bg-zinc-900 text-2xl font-semibold leading-none text-white hover:bg-zinc-800 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-200"
            aria-label="Add another word"
          >
            +
          </button>
        </div>

        <div className="mt-10 flex flex-col items-center gap-3">
          {minWordsMessage ? (
            <p
              className="max-w-md text-center text-sm font-medium text-red-700 dark:text-red-400"
              role="alert"
            >
              {minWordsMessage}
            </p>
          ) : null}
          <button
            type="button"
            onClick={handleGo}
            className="inline-flex min-w-[140px] items-center justify-center rounded-full bg-zinc-900 px-10 py-4 text-lg font-semibold text-white transition-colors hover:bg-zinc-800 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-200"
          >
            GO
          </button>
          {filledCount < MIN_WORDS ? (
            <p className="text-center text-xs text-zinc-500 dark:text-zinc-400">
              Need at least {MIN_WORDS} words to continue ({filledCount}/{MIN_WORDS}).
            </p>
          ) : null}
        </div>
      </main>
    </div>
  );
}

