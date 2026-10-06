/** Thème clair / sombre — mémorisé dans le localStorage. */
export type Theme = "light" | "dark";

const KEY = "ooble.theme";

export function getTheme(): Theme {
  try {
    return localStorage.getItem(KEY) === "dark" ? "dark" : "light";
  } catch {
    return "light";
  }
}

export function applyTheme(theme: Theme): void {
  document.documentElement.classList.toggle("dark", theme === "dark");
  const meta = document.querySelector('meta[name="theme-color"]');
  if (meta) meta.setAttribute("content", theme === "dark" ? "#121212" : "#ffffff");
}

const listeners = new Set<(t: Theme) => void>();

/** Être prévenu quand le thème change ailleurs (renvoie la désinscription). */
export function onThemeChange(cb: (t: Theme) => void): () => void {
  listeners.add(cb);
  return () => { listeners.delete(cb); };
}

export function setTheme(theme: Theme): void {
  try {
    localStorage.setItem(KEY, theme);
  } catch {
    /* ignore */
  }
  applyTheme(theme);
  listeners.forEach((cb) => cb(theme));
}

/** À appeler au démarrage pour éviter le flash. */
export function initTheme(): void {
  applyTheme(getTheme());
}
