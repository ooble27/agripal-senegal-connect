import { Link } from "react-router-dom";
import { ArrowRight, Clock, Play } from "lucide-react";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { useLang, useT } from "@/lib/i18n";
import { GUIDES, GUIDE_GROUPS, guideKey, guideMedia } from "@/lib/guides";

/** Centre d'aide : sommaire des guides vidéo, regroupés par thème. */
const Guide = () => {
  const t = useT();
  const [lang] = useLang();

  return (
    <div className="ink-neutral app-type min-h-screen bg-background tracking-[-0.015em]">
      <Header />

      <main className="mx-auto max-w-[1200px] px-6 sm:px-10">
        <section className="pt-14 lg:pt-20">
          <p className="text-[12px] uppercase tracking-[0.16em] text-muted-foreground">{t("guide.kicker")}</p>
          <h1 className="mt-5 font-display text-[2.7rem] leading-[0.98] tracking-[-0.05em] sm:text-[3.8rem] lg:text-[4.5rem]">
            {t("guide.title")}
          </h1>
          <p className="mt-5 max-w-[520px] text-[15px] leading-[1.65] text-muted-foreground">{t("guide.sub")}</p>
        </section>

        {GUIDE_GROUPS.map((group) => (
          <section key={group.id} id={group.id} className="scroll-mt-8 pt-16 lg:pt-20">
            <div className="flex flex-col gap-1 border-b pb-5 sm:flex-row sm:items-end sm:justify-between sm:gap-8">
              <h2 className="font-display text-[1.6rem] tracking-[-0.035em] sm:text-[1.9rem]">{t(group.titleKey)}</h2>
              <p className="text-[14px] text-muted-foreground">{t(group.subKey)}</p>
            </div>

            <div className="mt-8 grid gap-x-8 gap-y-12 md:grid-cols-2">
              {GUIDES.filter((g) => g.group === group.id).map((g) => {
                const n = GUIDES.indexOf(g) + 1;
                const media = guideMedia(g, lang);
                return (
                  <Link
                    key={g.slug}
                    to={`/guide/${g.slug}`}
                    className="group rounded-2xl outline-none focus-visible:ring-2 focus-visible:ring-foreground focus-visible:ring-offset-4 focus-visible:ring-offset-background"
                  >
                    <div className="relative aspect-video overflow-hidden rounded-2xl border bg-secondary">
                      <img
                        src={media.thumb}
                        alt=""
                        loading="lazy"
                        className="h-full w-full object-cover transition-transform duration-500 ease-out group-hover:scale-[1.025]"
                      />
                      <span className="absolute left-4 top-4 rounded-full bg-background/90 px-3 py-1 text-[12px] font-medium backdrop-blur">
                        {t("guide.label")} {n}
                      </span>
                      <span className="absolute bottom-4 right-4 flex h-12 w-12 items-center justify-center rounded-full bg-foreground text-background transition-transform duration-300 group-hover:scale-110">
                        <Play className="ml-0.5 h-5 w-5 fill-current" />
                      </span>
                    </div>
                    <h3 className="mt-5 font-display text-[1.35rem] tracking-[-0.03em]">{t(guideKey(g, "title"))}</h3>
                    <p className="mt-1.5 text-[15px] leading-[1.6] text-muted-foreground">{t(guideKey(g, "desc"))}</p>
                    <p className="mt-3 flex items-center gap-3 text-[13px] text-muted-foreground">
                      <span className="flex items-center gap-1.5">
                        <Clock className="h-3.5 w-3.5" />
                        {g.duration[lang]} {t("guide.seconds")}
                      </span>
                      <span aria-hidden>·</span>
                      <span>{t("guide.steps6")}</span>
                    </p>
                  </Link>
                );
              })}
            </div>
          </section>
        ))}

        <section className="mt-20 border-t py-16 text-center lg:mt-24 lg:py-20">
          <h2 className="font-display text-[1.9rem] leading-[1.06] tracking-[-0.04em] sm:text-[2.4rem]">{t("guide.help")}</h2>
          <p className="mx-auto mt-4 max-w-[420px] text-[15px] leading-[1.6] text-muted-foreground">{t("guide.helpSub")}</p>
          <div className="mt-8 flex flex-wrap justify-center gap-2.5">
            <Button asChild variant="appSolid" shape="rounded" size="default" className="px-6">
              <Link to="/faq">
                {t("nav.faq")} <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
            <Button asChild variant="secondary" shape="rounded" size="default" className="px-6">
              <Link to="/contact">{t("guide.contact")}</Link>
            </Button>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
};

export default Guide;
