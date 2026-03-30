"use client";

import Link from "next/link";
import { useMemo } from "react";
import {
  bankKeyFromWords,
  hasGameCompleted,
  useGameCompletionsVersion,
  type GameSlug,
} from "../gameCompletions";
import { useGameWords } from "../gameWords";

function GameCard({
  href,
  label,
  game,
  className,
}: {
  href: string;
  label: string;
  game: GameSlug;
  className?: string;
}) {
  const { words } = useGameWords();
  const completionsVersion = useGameCompletionsVersion();
  const bankKey = useMemo(() => bankKeyFromWords(words), [words]);
  const done = hasGameCompleted(bankKey, game);
  void completionsVersion;

  return (
    <Link
      href={href}
      className={`relative flex min-h-[160px] items-center justify-center rounded-2xl border border-zinc-200 bg-white p-8 text-center text-2xl font-semibold text-zinc-900 shadow-sm transition hover:bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-50 dark:hover:bg-zinc-800 ${className ?? ""}`}
    >
      {done && (
        <span
          className="pointer-events-none absolute right-3 top-3 text-lg leading-none text-amber-400 drop-shadow-sm"
          title="You finished this game at least once with this word list"
          aria-label="Completed at least once"
        >
          ★
        </span>
      )}
      {label}
    </Link>
  );
}

export default function HomePage() {
  return (
    <div className="flex min-h-full flex-1 flex-col bg-zinc-50 px-6 py-12 dark:bg-zinc-950">
      <div className="mx-auto w-full max-w-5xl shrink-0">
        <Link
          href="/setup/select"
          className="text-sm font-medium text-zinc-600 underline-offset-4 hover:text-zinc-900 hover:underline dark:text-zinc-400 dark:hover:text-zinc-50"
        >
          ← Back to word list
        </Link>
      </div>
      <main className="mx-auto flex w-full max-w-5xl flex-1 flex-col justify-center">
        <div className="flex flex-wrap justify-center gap-6">
          {(
            [
              { href: "/wordsearch", label: "Word Search", game: "wordsearch" as const },
              { href: "/alphabetical", label: "Alphabetical", game: "alphabetical" as const },
              { href: "/anagrams", label: "Anagrams", game: "anagrams" as const },
              { href: "/missingletter", label: "Missing Letter", game: "missingletter" as const },
              { href: "/wordsoup", label: "Word Soup", game: "wordsoup" as const },
            ] satisfies { href: string; label: string; game: GameSlug }[]
          ).map(({ href, label, game }) => (
            <GameCard
              key={href}
              href={href}
              label={label}
              game={game}
              className="w-full sm:w-[calc(50%-12px)] lg:w-[calc(33.333%-16px)]"
            />
          ))}
        </div>
      </main>
    </div>
  );
}
