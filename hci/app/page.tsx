import Link from "next/link";

export default function LandingPage() {
  return (
    <div className="flex min-h-full flex-1 flex-col items-center justify-center bg-zinc-50 px-6 dark:bg-zinc-950">
      <main className="flex flex-col items-center gap-10 text-center">
        <h1 className="text-4xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50 sm:text-5xl">
          Spelling Central 2
        </h1>
        <Link
          href="/setup/select"
          className="inline-flex min-w-[140px] items-center justify-center rounded-full bg-zinc-900 px-10 py-4 text-lg font-semibold text-white transition-colors hover:bg-zinc-800 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-200"
        >
          GO
        </Link>
      </main>
    </div>
  );
}
