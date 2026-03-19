import Link from "next/link";

export default function HomePage() {
  return (
    <div className="flex min-h-full flex-1 items-center justify-center bg-zinc-50 px-6 py-12 dark:bg-zinc-950">
      <main className="w-full max-w-5xl">
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          <Link
            href="/wordsearch"
            className="flex min-h-[160px] items-center justify-center rounded-2xl border border-zinc-200 bg-white p-8 text-center text-2xl font-semibold text-zinc-900 shadow-sm transition hover:bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-50 dark:hover:bg-zinc-800"
          >
            Word Search
          </Link>
          <Link
            href="/alphabetical"
            className="flex min-h-[160px] items-center justify-center rounded-2xl border border-zinc-200 bg-white p-8 text-center text-2xl font-semibold text-zinc-900 shadow-sm transition hover:bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-50 dark:hover:bg-zinc-800"
          >
            Alphabetical
          </Link>
          <Link
            href="/anagrams"
            className="flex min-h-[160px] items-center justify-center rounded-2xl border border-zinc-200 bg-white p-8 text-center text-2xl font-semibold text-zinc-900 shadow-sm transition hover:bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-50 dark:hover:bg-zinc-800"
          >
            Anagrams
          </Link>
          <Link
            href="/missingletter"
            className="flex min-h-[160px] items-center justify-center rounded-2xl border border-zinc-200 bg-white p-8 text-center text-2xl font-semibold text-zinc-900 shadow-sm transition hover:bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-50 dark:hover:bg-zinc-800"
          >
            Missing Letter
          </Link>
          <Link
            href="/wordsoup"
            className="flex min-h-[160px] items-center justify-center rounded-2xl border border-zinc-200 bg-white p-8 text-center text-2xl font-semibold text-zinc-900 shadow-sm transition hover:bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-50 dark:hover:bg-zinc-800"
          >
            Word Soup
          </Link>
          <Link
            href="/hearandspell"
            className="flex min-h-[160px] items-center justify-center rounded-2xl border border-zinc-200 bg-white p-8 text-center text-2xl font-semibold text-zinc-900 shadow-sm transition hover:bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-50 dark:hover:bg-zinc-800"
          >
            Hear and Spell
          </Link>
        </div>
      </main>
    </div>
  );
}
