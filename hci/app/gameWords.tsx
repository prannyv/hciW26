"use client";

import { createContext, useContext, useMemo, useState } from "react";

type GameWordsContextValue = {
  words: string[];
  setWords: (words: string[]) => void;
};

const GameWordsContext = createContext<GameWordsContextValue | null>(null);

export function GameWordsProvider({ children }: { children: React.ReactNode }) {
  const [words, setWords] = useState<string[]>([]);
  const value = useMemo(() => ({ words, setWords }), [words]);
  return <GameWordsContext.Provider value={value}>{children}</GameWordsContext.Provider>;
}

export function useGameWords() {
  const ctx = useContext(GameWordsContext);
  if (!ctx) throw new Error("useGameWords must be used within GameWordsProvider");
  return ctx;
}

