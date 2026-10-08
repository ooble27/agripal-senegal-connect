import { Link } from "react-router-dom";
import { ArrowRight } from "lucide-react";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import Reveal from "@/components/Reveal";
import HelpShape from "@/components/help/HelpShape";
import HelpVideo from "@/components/help/HelpVideo";
import { useLang, useT } from "@/lib/i18n";
import { cn } from "@/lib/utils";
import { GUIDES, GUIDE_GROUPS, guideKey, guideMedia } from "@/lib/guides";
import { HELP_COLORS, guideTheme } from "@/lib/faq";

/* Guides vidéo — même langage que le centre d'aide : grand titre, la vidéo
   « Ooble en une minute » sur une forme colorée, puis chaque groupe avec ses
   guides en rangées (miniature, titre, durée). Chaque guide prend la couleur
   et la forme de son thème. */

const Wrap = ({ children, className = "" }: { children: React.ReactNode; className?: string }) => (
  <div className={`mx-auto max-w-[1200px] px-6 sm:px-10 ${className}`}>{children}</div>
);

const linkCls = "inline-flex items-center gap-1.5 text-[15px] font-medium underline-offset-[6px] transition-colors hover:underline";

const Guide = () => {
  const t = useT();
  const [lang] = useLang();
  const featured = GUIDES[0];
  const ft = guideTheme(featured.slug);

  return (
    <div className="ink-neutral app-type min-h-screen bg-background tracking-[-0.015em]">
      <Header />

      <main>
        {/* ===================== EN-TÊTE ===================== */}
        <section className="relative overflow-hidden">
          <span aria-hidden className="ooble-float absolute hidden sm:block left-[9%] top-[20%] h-10 w-10 rounded-full" style={{ background: HELP_COLORS.sun }} />
          <span aria-hidden className="ooble-float absolute hidden sm:block right-[10%] top-[24%] h-9 w-9 rotate-12 rounded-md [animation-delay:-3s]" style={{ background: HELP_COLORS.coral }} />
          <Wrap className="relative pb-10 pt-20 text-center lg:pt-24">
            <p className="animate-up text-[12px] uppercase tracking-[0.16em] text-muted-foreground">{t("guide.kicker")}</p>
            <h1 className="animate-up mx-auto mt-6 font-display text-[3rem] font-semibold leading-[0.98] tracking-[-0.055em] [animation-delay:80ms] sm:text-[4.6rem] lg:text-[6rem]">
              {t("guide.heroA")} <span style={{ color: HELP_COLORS.coral }}>{t("guide.heroB")}</span>
            </h1>
            <p className="animate-up mx-auto mt-7 max-w-[460px] text-[15px] leading-[1.7] text-muted-foreground [animation-delay:160ms]">{t("guide.sub")}</p>
          </Wrap>
        </section>

        {/* ===================== VIDÉO À LA UNE ===================== */}
        <Wrap>
          <div className="animate-up relative mx-auto max-w-[980px] pb-10 pt-6 [animation-delay:240ms]">
            <span
              aria-hidden
              className="absolute -inset-x-[4%] bottom-0 top-[18%]"
              style={{ background: ft.color, borderRadius: "46% 54% 42% 58% / 55% 44% 56% 45%" }}
            />
            <p className="relative mb-4 flex items-center gap-2 text-[13px] font-medium">
              <HelpShape shape={ft.shape} color={ft.color} className="h-3.5 w-3.5" />
              {t("guide.featured")} · {t(guideKey(featured, "title"))}
            </p>
            <HelpVideo guide={featured} className="relative" />
          </div>
        </Wrap>

        {/* ===================== GROUPES ===================== */}
        {GUIDE_GROUPS.map((group) => {
          const items = GUIDES.filter((g) => g.group === group.id && g !== featured);
          if (!items.length) return null;
          return (
            <section key={group.id} id={group.id} className="scroll-mt-8">
              <Wrap className="pt-24 lg:pt-32">
                <div className="grid gap-10 lg:grid-cols-[0.75fr_1.25fr] lg:gap-16">
                  <div className="lg:sticky lg:top-24 lg:self-start">
                    <p className="text-[13px] font-semibold uppercase tracking-[0.18em]" style={{ color: HELP_COLORS.coral }}>
                      {items.length} {t(items.length > 1 ? "guide.videosN" : "guide.videos1")}
                    </p>
                    <h2 className="mt-4 font-display text-[2.4rem] font-semibold leading-[1.02] tracking-[-0.05em] sm:text-[3.2rem]">
                      {t(group.titleKey)}
                    </h2>
                    <p className="mt-4 max-w-[340px] text-[15px] leading-[1.7] text-muted-foreground">{t(group.subKey)}</p>
                  </div>
                  <ul>
                    {items.map((g) => {
                      const th = guideTheme(g.slug);
                      return (
                        <li key={g.slug} className="border-t last:border-b">
                          <Link to={`/guide/${g.slug}`} className="group grid grid-cols-[120px_1fr_auto] items-center gap-5 py-6 sm:grid-cols-[200px_1fr_auto] sm:gap-7">
                            <span className="relative block overflow-hidden rounded-md p-2.5 sm:p-3.5" style={{ background: th.color }}>
                              <img
                                src={guideMedia(g, lang).thumb}
                                alt=""
                                loading="lazy"
                                className="block aspect-video w-full rounded-[4px] object-cover shadow-[0_10px_24px_-12px_rgba(0,0,0,0.4)] transition-transform duration-500 group-hover:scale-[1.04]"
                              />
                            </span>
                            <span className="min-w-0">
                              <span className="block font-display text-[1.25rem] font-semibold leading-[1.15] tracking-[-0.035em] sm:text-[1.6rem]">
                                {t(guideKey(g, "title"))}
                              </span>
                              <span className="mt-1.5 hidden text-[14px] leading-[1.6] text-muted-foreground sm:block">{t(guideKey(g, "desc"))}</span>
                              <span className="mt-1.5 block text-[12.5px] uppercase tracking-[0.12em] text-muted-foreground">
                                {g.duration[lang]} {t("guide.seconds")} · {t("guide.steps6")}
                              </span>
                            </span>
                            <ArrowRight className={cn("h-5 w-5 shrink-0 text-foreground/30 transition-all group-hover:translate-x-1 group-hover:text-foreground")} strokeWidth={1.8} />
                          </Link>
                        </li>
                      );
                    })}
                  </ul>
                </div>
              </Wrap>
            </section>
          );
        })}

        {/* ===================== APPEL FINAL ===================== */}
        <section>
          <Wrap className="pb-10 pt-24 text-center lg:pt-32">
            <Reveal>
              <h2 className="mx-auto max-w-[900px] font-display text-[2.6rem] font-semibold leading-[0.98] tracking-[-0.055em] sm:text-[4rem] lg:text-[4.8rem]">
                {t("guide.endA")} <span className="text-foreground/35">{t("guide.endB")}</span>
              </h2>
            </Reveal>
            <Reveal delay={140} className="mt-10 flex flex-wrap items-center justify-center gap-x-8 gap-y-3">
              <Link to="/faq" className={linkCls}>
                {t("guide.toFaq")} <ArrowRight className="h-4 w-4" strokeWidth={1.8} />
              </Link>
              <Link to="/contact" className={cn(linkCls, "text-muted-foreground hover:text-foreground")}>
                {t("faqp.writeUs")}
              </Link>
            </Reveal>
          </Wrap>
        </section>
      </main>

      <Footer />
    </div>
  );
};

export default Guide;
