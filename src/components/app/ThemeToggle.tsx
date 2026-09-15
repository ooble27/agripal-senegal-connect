import { useState } from "react";
import { Sun, Moon } from "lucide-react";
import { getTheme, setTheme, type Theme } from "@/lib/theme";
import { cn } from "@/lib/utils";
import { useLang } from "@/lib/i18n";

const ThemeToggle = ({ className }: { className?: string }) => {
  const [lang] = useLang();
  const [theme, setThemeState] = useState<Theme>(getTheme);

  const toggle = () => {
    const next: Theme = theme === "dark" ? "light" : "dark";
    setTheme(next);
    setThemeState(next);
  };

  const isDark = theme === "dark";

  return (
    <button
      type="button"
      onClick={toggle}
      aria-label={isDark
        ? (lang === "en" ? "Switch to light mode" : "Passer en mode clair")
        : (lang === "en" ? "Switch to dark mode" : "Passer en mode sombre")}
      className={cn(
        "relative flex h-8 w-[3.75rem] shrink-0 items-center rounded-full border border-border bg-secondary/80 p-[3px] transition-colors",
        className,
      )}
    >
      <Sun className={cn(
        "absolute left-[7px] h-3.5 w-3.5 transition-opacity",
        isDark ? "opacity-30 text-muted-foreground" : "opacity-0",
      )} strokeWidth={2} />
      <Moon className={cn(
        "absolute right-[7px] h-3.5 w-3.5 transition-opacity",
        isDark ? "opacity-0" : "opacity-30 text-muted-foreground",
      )} strokeWidth={2} />
      <span
        className={cn(
          "flex h-[22px] w-[22px] items-center justify-center rounded-full bg-card shadow-sm transition-transform duration-200 ease-out",
          isDark ? "translate-x-[calc(3.75rem-22px-6px)]" : "translate-x-0",
        )}
      >
        {isDark
          ? <Moon className="h-3 w-3 text-foreground" strokeWidth={2.2} />
          : <Sun className="h-3 w-3 text-foreground" strokeWidth={2.2} />}
      </span>
    </button>
  );
};

export default ThemeToggle;
