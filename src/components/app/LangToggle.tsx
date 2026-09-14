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
    <div
      className={cn(
        "relative flex h-8 shrink-0 items-center rounded-full border border-border bg-secondary/80 p-[3px]",
        className,
      )}
    >
      <span
        className={cn(
          "pointer-events-none absolute inset-y-[3px] w-[calc(50%-3px)] rounded-full bg-card shadow-sm transition-transform duration-200 ease-out",
          isFr ? "left-[3px] translate-x-0" : "left-[3px] translate-x-full",
        )}
      />
      <button
        type="button"
        onClick={() => setLang("fr")}
        className={cn(
          "relative z-10 flex h-full w-9 items-center justify-center rounded-full text-[11px] font-bold tracking-wide transition-colors",
          isFr ? "text-foreground" : "text-muted-foreground",
        )}
      >
        FR
      </button>
      <button
        type="button"
        onClick={() => setLang("en")}
        className={cn(
          "relative z-10 flex h-full w-9 items-center justify-center rounded-full text-[11px] font-bold tracking-wide transition-colors",
          isFr ? "text-muted-foreground" : "text-foreground",
        )}
      >
        EN
      </button>
    </div>
  );
};
