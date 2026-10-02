import { useEffect } from "react";
import { Link, Navigate, useParams } from "react-router-dom";
import { ArrowLeft, ArrowRight, Check, Clock } from "lucide-react";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { useLang, useT } from "@/lib/i18n";
import { cn } from "@/lib/utils";
import { GUIDES, GUIDE_GROUPS, STEP_COUNT, TIP_COUNT, guideKey, guideMedia } from "@/lib/guides";

/** Un guide du centre d'aide : vidéo dans la langue choisie, étapes écrites, conseils. */
const GuideDetail = () => {
  const t = useT();
  const [lang] = useLang();
  const { slug } = useParams();
  const index = GUIDES.findIndex((g) => g.slug === slug);

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [slug]);

  if (index < 0) return <Navigate to="/guide" replace />;

  const guide = GUIDES[index];
  const group = GUIDE_GROUPS.find((gr) => gr.id === guide.group)!;
  const media = guideMedia(guide, lang);
  const prev = GUIDES[index - 1];
  const next = GUIDES[index + 1];
  const steps = Array.from({ length: STEP_COUNT }, (_, i) => i + 1);
  const tips = Array.from({ length: TIP_COUNT }, (_, i) => i + 1);

  return (
    <div className="ink-neutral app-type min-h-screen bg-background tracking-[-0.015em]">
      <Header />

      <main className="mx-auto max-w-[1200px] px-6 sm:px-10">
        <div className="pt-8 lg:pt-12">
          <Link
            to="/guide"
            className="inline-flex items-center gap-2 text-[14px] text-muted-foreground transition-colors hover:text-foreground"
          >
            <ArrowLeft className="h-4 w-4" />
            {t("guide.all")}
          </Link>
        </div>

        {/* Navigation entre guides — barre défilante sur mobile */}
        <nav className="-mx-6 mt-6 flex gap-2 overflow-x-auto px-6 pb-1 lg:hidden" aria-label={t("guide.all")}>
          {GUIDES.map((g, i) => (
            <Link
              key={g.slug}
              to={`/guide/${g.slug}`}
              className={cn(
                "shrink-0 rounded-full border px-4 py-2 text-[13px] transition-colors",
                i === index ? "border-foreground bg-foreground text-background" : "text-muted-foreground hover:text-foreground",
              )}
            >
              {i + 1}. {t(guideKey(g, "title"))}
            </Link>
          ))}
        </nav>

        <div className="grid gap-12 pb-8 pt-8 lg:grid-cols-[230px_minmax(0,1fr)] lg:gap-16 lg:pt-10">
          {/* Sommaire — desktop */}
          <aside className="hidden lg:block">
            <nav className="sticky top-8 space-y-8" aria-label={t("guide.all")}>
              {GUIDE_GROUPS.map((gr) => (
                <div key={gr.id}>
                  <p className="text-[11px] uppercase tracking-[0.16em] text-muted-foreground">{t(gr.titleKey)}</p>
                  <ul className="mt-3 space-y-1">
                    {GUIDES.filter((g) => g.group === gr.id).map((g) => {
                      const i = GUIDES.indexOf(g);
                      const active = i === index;
                      return (
                        <li key={g.slug}>
                          <Link
                            to={`/guide/${g.slug}`}
                            aria-current={active ? "page" : undefined}
                            className={cn(
                              "flex items-center gap-3 rounded-xl px-3 py-2.5 text-[14px] transition-colors",
                              active ? "bg-secondary font-medium text-foreground" : "text-muted-foreground hover:text-foreground",
                            )}
                          >
                            <span
                              className={cn(
                                "flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[11px] font-semibold",
                                active ? "bg-foreground text-background" : "border",
                              )}
                            >
                              {i + 1}
                            </span>
                            {t(guideKey(g, "title"))}
                          </Link>
                        </li>
                      );
                    })}
                  </ul>
                </div>
              ))}
            </nav>
          </aside>

          <article className="min-w-0">
            <p className="text-[12px] uppercase tracking-[0.16em] text-muted-foreground">
              {t("guide.label")} {index + 1} · {t(group.titleKey)}
            </p>
            <h1 className="mt-4 font-display text-[2.4rem] leading-[1] tracking-[-0.05em] sm:text-[3.2rem]">
              {t(guideKey(guide, "title"))}
            </h1>
            <p className="mt-4 max-w-[560px] text-[15px] leading-[1.65] text-muted-foreground">{t(guideKey(guide, "desc"))}</p>
            <p className="mt-3 flex items-center gap-3 text-[13px] text-muted-foreground">
              <span className="flex items-center gap-1.5">
                <Clock className="h-3.5 w-3.5" />
                {guide.duration[lang]} {t("guide.seconds")}
              </span>
              <span aria-hidden>·</span>
              <span>{t("guide.steps6")}</span>
            </p>

            {/* key={lang} : recharge la bonne version quand on change de langue */}
            <div className="mt-8 overflow-hidden rounded-2xl border bg-[#f4f4f2]">
              <video
                key={`${guide.slug}-${lang}`}
                className="block aspect-video w-full"
                controls
                playsInline
                preload="metadata"
                poster={media.poster}
              >
                <source src={media.video} type="video/mp4" />
                {t("guide.noVideo")}
              </video>
            </div>

            <section className="mt-14">
              <h2 className="font-display text-[1.6rem] tracking-[-0.035em]">{t("guide.stepByStep")}</h2>
              <ol className="mt-6">
                {steps.map((n) => (
                  <li key={n} className="relative flex gap-5 pb-8 last:pb-0">
                    {n < STEP_COUNT && <span className="absolute bottom-0 left-[15px] top-9 w-px bg-border" aria-hidden />}
                    <span className="relative flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-foreground text-[13px] font-semibold text-background">
                      {n}
                    </span>
                    <div className="pt-1">
                      <h3 className="text-[16px] font-medium tracking-[-0.02em]">{t(guideKey(guide, `s${n}`))}</h3>
                      <p className="mt-1.5 max-w-[560px] text-[15px] leading-[1.65] text-muted-foreground">
                        {t(guideKey(guide, `s${n}d`))}
                      </p>
                    </div>
                  </li>
                ))}
              </ol>
            </section>

            <section className="mt-14 rounded-2xl bg-secondary/60 p-6 sm:p-8">
              <h2 className="font-display text-[1.25rem] tracking-[-0.03em]">{t("guide.tips")}</h2>
              <ul className="mt-5 space-y-3.5">
                {tips.map((n) => (
                  <li key={n} className="flex gap-3 text-[15px] leading-[1.6]">
                    <Check className="mt-1 h-4 w-4 shrink-0 text-emerald-600" />
                    <span>{t(guideKey(guide, `tip${n}`))}</span>
                  </li>
                ))}
              </ul>
              <Button asChild variant="appSolid" shape="rounded" size="default" className="mt-7 px-6">
                <Link to={guide.to}>
                  {t(guideKey(guide, "cta"))} <ArrowRight className="h-4 w-4" />
                </Link>
              </Button>
            </section>

            <nav className="mt-14 grid gap-4 border-t pt-10 sm:grid-cols-2">
              {prev ? (
                <Link to={`/guide/${prev.slug}`} className="group rounded-2xl border p-5 transition-colors hover:bg-secondary/60">
                  <span className="flex items-center gap-2 text-[13px] text-muted-foreground">
                    <ArrowLeft className="h-3.5 w-3.5" />
                    {t("guide.prev")}
                  </span>
                  <span className="mt-2 block font-medium">{t(guideKey(prev, "title"))}</span>
                </Link>
              ) : (
                <span className="hidden sm:block" />
              )}
              {next && (
                <Link to={`/guide/${next.slug}`} className="group rounded-2xl border p-5 text-right transition-colors hover:bg-secondary/60">
                  <span className="flex items-center justify-end gap-2 text-[13px] text-muted-foreground">
                    {t("guide.next")}
                    <ArrowRight className="h-3.5 w-3.5" />
                  </span>
                  <span className="mt-2 block font-medium">{t(guideKey(next, "title"))}</span>
                </Link>
              )}
            </nav>
          </article>
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default GuideDetail;
