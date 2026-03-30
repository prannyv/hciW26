"use client";

import { useEffect, useState } from "react";

const STORAGE_KEY = "hci-game-completions-v1";

export type GameSlug =
  | "wordsearch"
  | "alphabetical"
  | "anagrams"
  | "missingletter"
  | "wordsoup";

export function bankKeyFromWords(words: string[]): string {
  return words.map((w) => w.trim()).filter(Boolean).join("\0");
}

type Store = Record<string, Partial<Record<GameSlug, boolean>>>;

function load(): Store {
  if (typeof window === "undefined") return {};
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return {};
    return JSON.parse(raw) as Store;
  } catch {
    return {};
  }
}

function save(store: Store) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(store));
  } catch {
    /* ignore quota / private mode */
  }
}

/** Record a win for this word bank + game (idempotent). */
export function markGameCompleted(bankKey: string, game: GameSlug) {
  if (!bankKey) return;
  const store = load();
  const prev = store[bankKey] ?? {};
  if (prev[game]) return;
  store[bankKey] = { ...prev, [game]: true };
  save(store);
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent("hci-game-completions"));
  }
}

export function hasGameCompleted(bankKey: string, game: GameSlug): boolean {
  if (!bankKey) return false;
  return Boolean(load()[bankKey]?.[game]);
}

/** Re-render when completions change (same tab). */
export function useGameCompletionsVersion(): number {
  const [v, setV] = useState(0);
  useEffect(() => {
    const handler = () => setV((x) => x + 1);
    window.addEventListener("hci-game-completions", handler);
    return () => window.removeEventListener("hci-game-completions", handler);
  }, []);
  return v;
}
