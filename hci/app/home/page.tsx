import Link from "next/link";

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
        </div>
      </main>
    </div>
  );
}
