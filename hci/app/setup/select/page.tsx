"use client";

import Link from "next/link";
import { useGameWords } from "../../gameWords";

export default function SetupSelectPage() {
  const { setWords, setGrade, setTopic } = useGameWords();

  return (
    <div className="flex min-h-full flex-1 items-center justify-center bg-zinc-50 px-6 dark:bg-zinc-950">
      <main className="text-center text-zinc-500 dark:text-zinc-400">
        <p className="text-sm uppercase tracking-widest">Word list choice</p>
        <div className="mt-6 flex flex-col items-center gap-3 sm:flex-row">
          <Link
            href="/setup"
            className="inline-flex w-56 items-center justify-center rounded-full bg-zinc-900 px-6 py-3 text-sm font-semibold text-white hover:bg-zinc-800 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-200"
          >
            Premade
          </Link>
          <Link
            href="/setup/custom"
            onClick={() => { setWords([]); setGrade(null); setTopic(null); }}
            className="inline-flex w-56 items-center justify-center rounded-full border border-zinc-300 bg-white px-6 py-3 text-sm font-semibold text-zinc-900 hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-50 dark:hover:bg-zinc-900"
          >
            Custom
          </Link>
        </div>
      </main>
    </div>
  );
}
