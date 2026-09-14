import { useLang, type Lang } from "@/lib/i18n";
import { cn } from "@/lib/utils";

const LangToggle = ({ className }: { className?: string }) => {
  const [lang, setLang] = useLang();

  const toggle = () => setLang(lang === "fr" ? "en" : "fr");

  return (
    <button
      type="button"
      onClick={toggle}
      aria-label={lang === "fr" ? "Switch to English" : "Passer en français"}
      className={cn(
        "flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-border bg-card text-[13px] font-bold uppercase tracking-wide text-foreground transition-all hover:bg-secondary active:scale-95",
        className,
      )}
    >
      {lang === "fr" ? "EN" : "FR"}
    </button>
  );
};

export default LangToggle;

export const LangPicker = ({ className }: { className?: string }) => {
  const [lang, setLang] = useLang();

  return (
    <div className={cn("flex rounded-lg border border-border bg-secondary/60 p-0.5", className)}>
      {(["fr", "en"] as Lang[]).map((l) => (
        <button
          key={l}
          type="button"
          onClick={() => setLang(l)}
          className={cn(
            "flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-semibold transition-colors",
            lang === l ? "bg-card text-foreground dark:bg-neutral-600" : "text-muted-foreground",
          )}
        >
          {l === "fr" ? "FR" : "EN"}
        </button>
      ))}
    </div>
  );
};

export const LangPill = ({ className }: { className?: string }) => {
  const [lang, setLang] = useLang();
  const isFr = lang === "fr";

  return (
    <button
      type="button"
      onClick={() => setLang(isFr ? "en" : "fr")}
      aria-label={isFr ? "Switch to English" : "Passer en français"}
      className={cn(
        "relative flex h-8 w-[3.75rem] shrink-0 items-center rounded-full border border-border bg-secondary/80 p-[3px] transition-colors",
        className,
      )}
    >
      <span className={cn(
        "absolute left-[6px] text-[10px] font-bold tracking-wide transition-opacity",
        isFr ? "opacity-0" : "opacity-30 text-muted-foreground",
      )}>FR</span>
      <span className={cn(
        "absolute right-[6px] text-[10px] font-bold tracking-wide transition-opacity",
        isFr ? "opacity-30 text-muted-foreground" : "opacity-0",
      )}>EN</span>
      <span
        className={cn(
          "flex h-[22px] min-w-[22px] items-center justify-center rounded-full bg-card px-1 text-[10px] font-bold tracking-wide text-foreground shadow-sm transition-transform duration-200 ease-out",
          isFr ? "translate-x-0" : "translate-x-[calc(3.75rem-22px-6px)]",
        )}
      >
        {isFr ? "FR" : "EN"}
      </span>
    </button>
  );
};
