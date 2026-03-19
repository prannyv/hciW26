"use client";

import { useEffect } from "react";
import Link from "next/link";
import { useGameWords } from "../../gameWords";

export default function SetupCustomPage() {
  const { words, setWords } = useGameWords();

  useEffect(() => {
    if (words.length === 0) setWords(Array.from({ length: 10 }, () => ""));
  }, [setWords, words.length]);

  return (
    <div className="flex min-h-full flex-1 flex-col bg-zinc-50 px-6 pb-16 pt-10 dark:bg-zinc-950">
      <h1 className="text-center text-3xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50">
        Spelling Central
      </h1>

      <main className="mx-auto mt-10 w-full max-w-5xl">
        <div className="mx-auto grid w-fit grid-flow-col grid-rows-10 gap-3">
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

        <div className="mt-10 flex justify-center">
          <Link
            href="/home"
            className="inline-flex min-w-[140px] items-center justify-center rounded-full bg-zinc-900 px-10 py-4 text-lg font-semibold text-white transition-colors hover:bg-zinc-800 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-200"
          >
            GO
          </Link>
        </div>
      </main>
    </div>
  );
}

