import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowRight, Play, Search, X } from "lucide-react";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { FaqArt } from "@/components/illustrations";
import { useLang, useT } from "@/lib/i18n";
import { guideMedia } from "@/lib/guides";
import { FAQ_CATEGORIES, PAY_RULES, categoryVideos, fold } from "@/lib/faq";

/** Centre d'aide : recherche, thèmes (une page chacun) et rappel des règles du virement. */
const FAQ = () => {
  const t = useT();
  const [lang] = useLang();
  const [query, setQuery] = useState("");

  // Recherche dans toutes les questions et réponses (accents et casse ignorés).
  const results = useMemo(() => {
    const words = fold(query).split(/\s+/).filter((w) => w.length > 1);
    if (!words.length) return null;
    return FAQ_CATEGORIES.flatMap((c) =>
      c.items
        .filter((it) => {
          const text = fold(`${t(it.q)} ${t(it.a)}`);
          return words.every((w) => text.includes(w));
        })
        .map((it) => ({ cat: c, it })),
    );
  }, [query, t]);

  return (
    <div className="ink-neutral app-type min-h-screen bg-background tracking-[-0.015em]">
      <Header />

      <main className="mx-auto max-w-[1200px] px-6 sm:px-10">
        <section className="grid items-center gap-10 pt-14 lg:grid-cols-[1.1fr_0.9fr] lg:pt-20">
          <div>
            <p className="text-[12px] uppercase tracking-[0.16em] text-muted-foreground">{t("faqp.kicker")}</p>
            <h1 className="mt-5 font-display text-[2.7rem] leading-[0.98] tracking-[-0.05em] sm:text-[3.8rem] lg:text-[4.5rem]">
              {t("faqp.title1")}
              <br />
              <span className="text-foreground/35">{t("faqp.title2")}</span>
            </h1>
            <p className="mt-5 max-w-[480px] text-[15px] leading-[1.65] text-muted-foreground">{t("faqp.hubSub")}</p>

            <label className="relative mt-8 block max-w-[520px]">
              <span className="sr-only">{t("faqp.searchPh")}</span>
              <Search className="pointer-events-none absolute left-5 top-1/2 h-[18px] w-[18px] -translate-y-1/2 text-muted-foreground" />
              <input
                type="search"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder={t("faqp.searchPh")}
                className="h-14 w-full rounded-full border bg-card pl-12 pr-12 text-[15px] outline-none transition-colors placeholder:text-muted-foreground/70 focus:border-foreground [&::-webkit-search-cancel-button]:hidden"
              />
              {query && (
                <button
                  type="button"
                  onClick={() => setQuery("")}
                  aria-label={t("faqp.clear")}
                  className="absolute right-4 top-1/2 flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded-full text-muted-foreground hover:bg-secondary hover:text-foreground"
                >
                  <X className="h-4 w-4" />
                </button>
              )}
            </label>
          </div>
          <FaqArt className="mx-auto hidden w-full max-w-[360px] lg:block" aria-hidden />
        </section>

        {results ? (
          <section className="pt-14 lg:pt-16" aria-live="polite">
            <p className="text-[13px] text-muted-foreground">
              {results.length === 0 ? t("faqp.searchNone") : t("faqp.searchCount").replace("{n}", String(results.length))}
            </p>
            {results.length > 0 && (
              <ul className="mt-4 border-b">
                {results.map(({ cat, it }) => (
                  <li key={`${cat.slug}-${it.id}`} className="border-t">
                    <Link to={`/faq/${cat.slug}#${it.id}`} className="group flex items-center justify-between gap-6 py-5">
                      <span>
                        <span className="block text-[12px] uppercase tracking-[0.12em] text-muted-foreground">{t(cat.title)}</span>
                        <span className="mt-1.5 block font-display text-[17px] tracking-[-0.02em]">{t(it.q)}</span>
                      </span>
                      <ArrowRight className="h-4 w-4 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-1 group-hover:text-foreground" />
                    </Link>
                  </li>
                ))}
              </ul>
            )}
            {results.length === 0 && (
              <Link to="/contact" className="mt-4 inline-flex items-center gap-2 text-[15px] font-medium underline-offset-4 hover:underline">
                {t("faqp.writeUs")} <ArrowRight className="h-4 w-4" />
              </Link>
            )}
          </section>
        ) : (
          <>
            <section className="pt-16 lg:pt-20">
              <div className="flex flex-col gap-1 border-b pb-5 sm:flex-row sm:items-end sm:justify-between sm:gap-8">
                <h2 className="font-display text-[1.6rem] tracking-[-0.035em] sm:text-[1.9rem]">{t("faqp.topics")}</h2>
                <p className="text-[14px] text-muted-foreground">{t("faqp.topicsSub")}</p>
              </div>

              <div className="mt-8 grid gap-x-8 gap-y-12 md:grid-cols-2 lg:grid-cols-3">
                {FAQ_CATEGORIES.map((c) => {
                  const vids = categoryVideos(c);
                  const thumb = vids[0] ? guideMedia(vids[0], lang).thumb : null;
                  const Icon = c.icon;
                  return (
                    <Link
                      key={c.slug}
                      to={`/faq/${c.slug}`}
                      className="group rounded-2xl outline-none focus-visible:ring-2 focus-visible:ring-foreground focus-visible:ring-offset-4 focus-visible:ring-offset-background"
                    >
                      <div className="relative aspect-video overflow-hidden rounded-2xl border bg-secondary">
                        {thumb ? (
                          <img
                            src={thumb}
                            alt=""
                            loading="lazy"
                            className="h-full w-full object-cover transition-transform duration-500 ease-out group-hover:scale-[1.025]"
                          />
                        ) : (
                          <div className="flex h-full w-full items-center justify-center">
                            <Icon className="h-12 w-12 text-foreground/25" strokeWidth={1.4} />
                          </div>
                        )}
                        <span className="absolute left-4 top-4 flex h-10 w-10 items-center justify-center rounded-full bg-background/90 backdrop-blur">
                          <Icon className="h-[18px] w-[18px]" strokeWidth={1.8} />
                        </span>
                        {thumb && (
                          <span className="absolute bottom-4 right-4 flex h-11 w-11 items-center justify-center rounded-full bg-foreground text-background transition-transform duration-300 group-hover:scale-110">
                            <Play className="ml-0.5 h-[18px] w-[18px] fill-current" />
                          </span>
                        )}
                      </div>
                      <h3 className="mt-5 font-display text-[1.3rem] tracking-[-0.03em]">{t(c.title)}</h3>
                      <p className="mt-1.5 text-[15px] leading-[1.6] text-muted-foreground">{t(c.desc)}</p>
                      <p className="mt-3 text-[13px] text-muted-foreground">
                        {t("faqp.nQuestions").replace("{n}", String(c.items.length))}
                        {vids.length > 0 && <> · {t(vids.length > 1 ? "faqp.nVideos" : "faqp.oneVideo").replace("{n}", String(vids.length))}</>}
                      </p>
                    </Link>
                  );
                })}
              </div>
            </section>

            {/* Rappel : les quatre règles du virement Interac */}
            <section className="mt-20 rounded-[28px] bg-secondary/60 px-6 py-9 sm:px-10 lg:px-12 lg:py-12">
              <p className="text-[12px] uppercase tracking-[0.16em] text-muted-foreground">{t("faqp.rules.kicker")}</p>
              <h2 className="mt-4 max-w-[640px] font-display text-[1.7rem] leading-[1.08] tracking-[-0.04em] sm:text-[2.2rem]">
                {t("faqp.rules.title")}
              </h2>
              <ol className="mt-8 grid gap-x-8 gap-y-5 sm:grid-cols-2 lg:grid-cols-4">
                {PAY_RULES.map((r, i) => (
                  <li key={r.title} className="flex items-start gap-3">
                    <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-foreground font-display text-[13px] text-background">
                      {i + 1}
                    </span>
                    <span className="pt-0.5 font-display text-[16px] leading-[1.35] tracking-[-0.02em]">{t(r.title)}</span>
                  </li>
                ))}
              </ol>
              <Link
                to="/faq/payer-par-interac#regles-interac"
                className="mt-9 inline-flex items-center gap-2 text-[15px] font-medium underline-offset-4 hover:underline"
              >
                {t("faqp.rules.more")} <ArrowRight className="h-4 w-4" />
              </Link>
            </section>
          </>
        )}

        <section className="mt-16 border-t py-16 text-center lg:py-20">
          <h2 className="mx-auto max-w-[560px] font-display text-[1.9rem] leading-[1.06] tracking-[-0.04em] sm:text-[2.6rem]">
            {t("faqp.notFound")}
          </h2>
          <p className="mx-auto mt-5 max-w-[380px] text-[15px] leading-[1.6] text-muted-foreground">{t("faqp.notFoundSub")}</p>
          <div className="mt-9 flex flex-wrap justify-center gap-2.5">
            <Button asChild variant="appSolid" shape="rounded" size="default" className="px-6">
              <Link to="/contact">
                {t("faqp.writeUs")} <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
            <Button asChild variant="secondary" shape="rounded" size="default" className="px-6">
              <Link to="/guide">{t("faqp.allGuides")}</Link>
            </Button>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
};

export default FAQ;
