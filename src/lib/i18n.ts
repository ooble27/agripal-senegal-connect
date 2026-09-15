import { useCallback, useSyncExternalStore } from "react";
import { t, type TKey } from "./translations";

export type Lang = "fr" | "en";

const KEY = "ooble.lang";

let current: Lang = (() => {
  try {
    const v = localStorage.getItem(KEY);
    if (v === "en") return "en";
  } catch { /* SSR / incognito */ }
  return "fr";
})();

const listeners = new Set<() => void>();
const notify = () => listeners.forEach((l) => l());

export function getLang(): Lang {
  return current;
}

export function setLang(lang: Lang): void {
  if (lang === current) return;
  current = lang;
  try { localStorage.setItem(KEY, lang); } catch { /* ignore */ }
  document.documentElement.lang = lang;
  notify();
}

export function initLang(): void {
  document.documentElement.lang = current;
}

export function useLang(): [Lang, (l: Lang) => void] {
  const lang = useSyncExternalStore(
    (cb) => { listeners.add(cb); return () => listeners.delete(cb); },
    () => current,
  );
  return [lang, useCallback((l: Lang) => setLang(l), [])];
}

export function useT(): (key: TKey) => string {
  const [lang] = useLang();
  return useCallback((key: TKey) => t(key, lang), [lang]);
}

export { T } from "@/components/app/T";
