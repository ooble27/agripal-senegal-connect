import { useEffect, useState } from "react";
import { Link, Navigate, useLocation, useParams } from "react-router-dom";
import { ArrowLeft, ArrowRight, Clock } from "lucide-react";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { useLang, useT } from "@/lib/i18n";
import { cn } from "@/lib/utils";
import { guideKey, guideMedia } from "@/lib/guides";
import { FAQ_CATEGORIES, PAY_RULES, categoryVideos } from "@/lib/faq";

/** Un thème du centre d'aide : vidéos explicatives, puis les questions (ouvrables par lien direct #id). */
const FAQCategory = () => {
  const t = useT();
  const [lang] = useLang();
  const { slug } = useParams();
  const { hash } = useLocation();
  const index = FAQ_CATEGORIES.findIndex((c) => c.slug === slug);
  const cat = FAQ_CATEGORIES[index];

  const [open, setOpen] = useState<string | null>(null);
  const [video, setVideo] = useState(0);

  // Question ouverte : celle du lien (#id), sinon la première du thème.
  useEffect(() => {
    if (!cat) return;
    const id = hash.slice(1);
    setOpen(cat.items.some((it) => it.id === id) ? id : cat.items[0]?.id ?? null);
    setVideo(0);
  }, [cat, hash]);

  if (!cat) return <Navigate to="/faq" replace />;

  const vids = categoryVideos(cat);
  const current = vids[video];
  const media = current ? guideMedia(current, lang) : null;
  const prev = FAQ_CATEGORIES[index - 1];
  const next = FAQ_CATEGORIES[index + 1];
  const Icon = cat.icon;

  return (
    <div className="ink-neutral app-type min-h-screen bg-background tracking-[-0.015em]">
      <Header />

      <main className="mx-auto max-w-[1200px] px-6 sm:px-10">
        <div className="pt-8 lg:pt-12">
          <Link to="/faq" className="inline-flex items-center gap-2 text-[14px] text-muted-foreground transition-colors hover:text-foreground">
            <ArrowLeft className="h-4 w-4" />
            {t("faqp.allTopics")}
          </Link>
        </div>

        {/* Thèmes — barre défilante sur mobile */}
        <nav className="-mx-6 mt-6 flex gap-2 overflow-x-auto px-6 pb-1 lg:hidden" aria-label={t("faqp.topics")}>
          {FAQ_CATEGORIES.map((c) => (
            <Link
              key={c.slug}
              to={`/faq/${c.slug}`}
              className={cn(
                "shrink-0 rounded-full border px-4 py-2 text-[13px] transition-colors",
                c.slug === cat.slug ? "border-foreground bg-foreground text-background" : "text-muted-foreground hover:text-foreground",
              )}
            >
              {t(c.title)}
            </Link>
          ))}
        </nav>

        <div className="grid gap-12 pb-8 pt-8 lg:grid-cols-[240px_minmax(0,1fr)] lg:gap-16 lg:pt-10">
          {/* Sommaire — desktop */}
          <aside className="hidden lg:block">
            <nav className="sticky top-8" aria-label={t("faqp.topics")}>
              <p className="text-[11px] uppercase tracking-[0.16em] text-muted-foreground">{t("faqp.topics")}</p>
              <ul className="mt-3 space-y-1">
                {FAQ_CATEGORIES.map((c) => {
                  const active = c.slug === cat.slug;
                  const CIcon = c.icon;
                  return (
                    <li key={c.slug}>
                      <Link
                        to={`/faq/${c.slug}`}
                        aria-current={active ? "page" : undefined}
                        className={cn(
                          "flex items-center gap-3 rounded-xl px-3 py-2.5 text-[14px] transition-colors",
                          active ? "bg-secondary font-medium text-foreground" : "text-muted-foreground hover:text-foreground",
                        )}
                      >
                        <CIcon className="h-4 w-4 shrink-0" strokeWidth={1.8} />
                        <span className="flex-1">{t(c.title)}</span>
                        <span className="text-[12px] tabular-nums text-muted-foreground">{c.items.length}</span>
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </nav>
          </aside>

          <article className="min-w-0">
            <p className="flex items-center gap-2 text-[12px] uppercase tracking-[0.16em] text-muted-foreground">
              <Icon className="h-3.5 w-3.5" strokeWidth={2} />
              {t("faqp.kicker")}
            </p>
            <h1 className="mt-4 font-display text-[2.4rem] leading-[1] tracking-[-0.05em] sm:text-[3.2rem]">{t(cat.title)}</h1>
            <p className="mt-4 max-w-[560px] text-[15px] leading-[1.65] text-muted-foreground">{t(cat.desc)}</p>

            {current && media && (
              <section className="mt-8">
                {vids.length > 1 && (
                  <div className="mb-4 flex flex-wrap gap-2" role="tablist" aria-label={t("faqp.videosLabel")}>
                    {vids.map((g, i) => (
                      <button
                        key={g.slug}
                        type="button"
                        role="tab"
                        aria-selected={i === video}
                        onClick={() => setVideo(i)}
                        className={cn(
                          "rounded-full border px-4 py-2 text-[13px] transition-colors",
                          i === video ? "border-foreground bg-foreground text-background" : "text-muted-foreground hover:text-foreground",
                        )}
                      >
                        {t(guideKey(g, "title"))}
                      </button>
                    ))}
                  </div>
                )}
                {/* key : recharge la bonne vidéo quand on change d'onglet ou de langue */}
                <div className="overflow-hidden rounded-2xl border bg-[#f4f4f2]">
                  <video
                    key={`${current.slug}-${lang}`}
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
                <p className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1 text-[13px] text-muted-foreground">
                  <span className="flex items-center gap-1.5">
                    <Clock className="h-3.5 w-3.5" />
                    {current.duration[lang]} {t("guide.seconds")}
                  </span>
                  <span aria-hidden>·</span>
                  <Link to={`/guide/${current.slug}`} className="font-medium text-foreground underline-offset-4 hover:underline">
                    {t("faqp.writtenGuide")}
                  </Link>
                </p>
              </section>
            )}

            {cat.rules && (
              <section id="regles-interac" className="mt-12 scroll-mt-8 rounded-[24px] bg-secondary/60 px-6 py-8 sm:px-8">
                <p className="text-[12px] uppercase tracking-[0.16em] text-muted-foreground">{t("faqp.rules.kicker")}</p>
                <h2 className="mt-3 max-w-[560px] font-display text-[1.5rem] leading-[1.1] tracking-[-0.035em] sm:text-[1.8rem]">
                  {t("faqp.rules.title")}
                </h2>
                <p className="mt-3 max-w-[600px] text-[15px] leading-[1.65] text-muted-foreground">{t("faqp.rules.sub")}</p>
                <ol className="mt-7 grid gap-x-8 gap-y-6 sm:grid-cols-2">
                  {PAY_RULES.map((r, i) => (
                    <li key={r.title} className="flex gap-4">
                      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-foreground font-display text-[14px] text-background">
                        {i + 1}
                      </span>
                      <div>
                        <p className="font-display text-[16px] tracking-[-0.02em]">{t(r.title)}</p>
                        <p className="mt-1.5 text-[14px] leading-[1.6] text-muted-foreground">{t(r.body)}</p>
                      </div>
                    </li>
                  ))}
                </ol>
              </section>
            )}

            <section className="mt-12">
              <h2 className="font-display text-[1.6rem] tracking-[-0.035em]">{t("faqp.questions")}</h2>
              <div className="mt-4">
                {cat.items.map((it) => {
                  const isOpen = open === it.id;
                  return (
                    <div key={it.id} id={it.id} className="scroll-mt-8 border-t">
                      <button
                        onClick={() => setOpen(isOpen ? null : it.id)}
                        aria-expanded={isOpen}
                        className="flex w-full items-center justify-between gap-6 py-5 text-left"
                      >
                        <span className="font-display text-[17px] tracking-[-0.02em]">{t(it.q)}</span>
                        <span
                          className={cn("shrink-0 text-[22px] leading-none text-foreground/35 transition-transform", isOpen && "rotate-45")}
                          aria-hidden
                        >
                          +
                        </span>
                      </button>
                      {isOpen && <p className="mb-6 max-w-[640px] text-[15px] leading-[1.7] text-muted-foreground">{t(it.a)}</p>}
                    </div>
                  );
                })}
                <div className="border-t" />
              </div>
              <p className="mt-6 text-[14px] text-muted-foreground">
                {t("faqp.notFound")}{" "}
                <Link to="/contact" className="font-medium text-foreground underline underline-offset-2">
                  {t("faqp.writeUs")}
                </Link>
              </p>
            </section>

            <nav className="mt-14 grid gap-4 border-t pt-10 sm:grid-cols-2">
              {prev ? (
                <Link to={`/faq/${prev.slug}`} className="rounded-2xl border p-5 transition-colors hover:bg-secondary/60">
                  <span className="flex items-center gap-2 text-[13px] text-muted-foreground">
                    <ArrowLeft className="h-3.5 w-3.5" />
                    {t("faqp.prevTopic")}
                  </span>
                  <span className="mt-2 block font-medium">{t(prev.title)}</span>
                </Link>
              ) : (
                <span className="hidden sm:block" />
              )}
              {next && (
                <Link to={`/faq/${next.slug}`} className="rounded-2xl border p-5 text-right transition-colors hover:bg-secondary/60">
                  <span className="flex items-center justify-end gap-2 text-[13px] text-muted-foreground">
                    {t("faqp.nextTopic")}
                    <ArrowRight className="h-3.5 w-3.5" />
                  </span>
                  <span className="mt-2 block font-medium">{t(next.title)}</span>
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

export default FAQCategory;
