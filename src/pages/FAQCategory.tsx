import { useEffect, useState } from "react";
import { Link, Navigate, useLocation, useParams } from "react-router-dom";
import { ArrowLeft, ArrowRight, Check, Link2, Plus } from "lucide-react";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import HelpShape from "@/components/help/HelpShape";
import HelpVideo from "@/components/help/HelpVideo";
import { useT } from "@/lib/i18n";
import { cn } from "@/lib/utils";
import { guideKey } from "@/lib/guides";
import { FAQ_CATEGORIES, HELP_COLORS, PAY_RULES, categoryVideos } from "@/lib/faq";

/* Un thème du centre d'aide : en-tête à sa couleur, vidéo(s), règles du
   virement pour « Payer par Interac », questions ouvrables par lien direct
   (#id), puis le thème suivant en grand. */

const Wrap = ({ children, className = "" }: { children: React.ReactNode; className?: string }) => (
  <div className={`mx-auto max-w-[1200px] px-6 sm:px-10 ${className}`}>{children}</div>
);

const linkCls = "inline-flex items-center gap-1.5 text-[15px] font-medium underline-offset-[6px] transition-colors hover:underline";

const FAQCategory = () => {
  const t = useT();
  const { slug } = useParams();
  const { hash } = useLocation();
  const index = FAQ_CATEGORIES.findIndex((c) => c.slug === slug);
  const cat = FAQ_CATEGORIES[index];

  const [open, setOpen] = useState<string | null>(null);
  const [video, setVideo] = useState(0);
  const [copied, setCopied] = useState<string | null>(null);

  // Question ouverte : celle du lien (#id), sinon la première du thème.
  useEffect(() => {
    if (!cat) return;
    const id = hash.slice(1);
    setOpen(cat.items.some((it) => it.id === id) ? id : cat.items[0]?.id ?? null);
    setVideo(0);
  }, [cat, hash]);

  useEffect(() => {
    if (!copied) return;
    const id = window.setTimeout(() => setCopied(null), 1800);
    return () => window.clearTimeout(id);
  }, [copied]);

  if (!cat) return <Navigate to="/faq" replace />;

  const vids = categoryVideos(cat);
  const next = FAQ_CATEGORIES[(index + 1) % FAQ_CATEGORIES.length];

  const copyLink = (id: string) => {
    const url = `${window.location.origin}/faq/${cat.slug}#${id}`;
    navigator.clipboard?.writeText(url).then(() => setCopied(id)).catch(() => {});
  };

  return (
    <div className="ink-neutral app-type min-h-screen bg-background tracking-[-0.015em]">
      <Header />

      <main>
        {/* ===================== THÈMES (barre) ===================== */}
        <Wrap className="pt-8 lg:pt-10">
          <div className="flex items-center gap-6 border-b">
            <Link to="/faq" className="flex shrink-0 items-center gap-2 py-4 text-[14px] text-muted-foreground transition-colors hover:text-foreground">
              <ArrowLeft className="h-4 w-4" strokeWidth={1.8} />
              <span className="hidden sm:inline">{t("faqp.kicker")}</span>
            </Link>
            <nav className="-mb-px flex gap-6 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden" aria-label={t("faqp.topics")}>
              {FAQ_CATEGORIES.map((c) => {
                const on = c.slug === cat.slug;
                return (
                  <Link
                    key={c.slug}
                    to={`/faq/${c.slug}`}
                    aria-current={on ? "page" : undefined}
                    className={cn(
                      "flex shrink-0 items-center gap-2 border-b-2 py-4 text-[14px] transition-colors",
                      on ? "border-foreground font-medium text-foreground" : "border-transparent text-muted-foreground hover:text-foreground",
                    )}
                  >
                    <HelpShape shape={c.shape} color={c.color} className="h-3 w-3" />
                    {t(c.title)}
                  </Link>
                );
              })}
            </nav>
          </div>
        </Wrap>

        {/* ===================== EN-TÊTE DU THÈME ===================== */}
        <section className="relative overflow-hidden">
          <Wrap className="relative grid items-center gap-12 pb-20 pt-14 lg:grid-cols-[0.85fr_1.15fr] lg:gap-16 lg:pt-20">
            <div>
              <HelpShape shape={cat.shape} color={cat.color} className="animate-up h-12 w-12" />
              <h1 className="animate-up mt-7 font-display text-[2.6rem] font-semibold leading-[0.98] tracking-[-0.055em] [animation-delay:80ms] sm:text-[3.6rem] lg:text-[4.2rem]">
                {t(cat.title)}
                <span style={{ color: HELP_COLORS.coral }}>.</span>
              </h1>
              <p className="animate-up mt-6 max-w-[440px] text-[15px] leading-[1.7] text-muted-foreground [animation-delay:160ms]">{t(cat.desc)}</p>
              <p className="animate-up mt-5 text-[13px] uppercase tracking-[0.16em] text-muted-foreground [animation-delay:200ms]">
                {t("faqp.nQuestions").replace("{n}", String(cat.items.length))}
                {vids.length > 0 && <> · {t(vids.length > 1 ? "faqp.nVideos" : "faqp.oneVideo").replace("{n}", String(vids.length))}</>}
              </p>
              {vids.length > 0 && (
                <Link to={`/guide/${vids[video].slug}`} className={cn(linkCls, "animate-up mt-7 [animation-delay:240ms]")}>
                  {t("faqp.writtenGuide")} <ArrowRight className="h-4 w-4" strokeWidth={1.8} />
                </Link>
              )}
            </div>

            {vids.length > 0 && (
              <div className="animate-up relative [animation-delay:240ms]">
                <span
                  aria-hidden
                  className="absolute -inset-x-[6%] -bottom-[9%] top-[14%]"
                  style={{ background: cat.color, borderRadius: "46% 54% 42% 58% / 55% 44% 56% 45%" }}
                />
                {vids.length > 1 && (
                  <div className="relative mb-4 flex gap-6" role="tablist" aria-label={t("faqp.videosLabel")}>
                    {vids.map((g, i) => (
                      <button
                        key={g.slug}
                        type="button"
                        role="tab"
                        aria-selected={i === video}
                        onClick={() => setVideo(i)}
                        className={cn(
                          "border-b-2 pb-1.5 text-[14px] transition-colors",
                          i === video ? "border-foreground font-medium text-foreground" : "border-transparent text-muted-foreground hover:text-foreground",
                        )}
                      >
                        {t(guideKey(g, "title"))}
                      </button>
                    ))}
                  </div>
                )}
                <HelpVideo guide={vids[video]} className="relative" />
              </div>
            )}
          </Wrap>
        </section>

        {/* ===================== RÈGLES DU VIREMENT ===================== */}
        {cat.rules && (
          <section id="regles-interac" className="scroll-mt-6">
            <Wrap className="pt-12 lg:pt-20">
              <div className="grid gap-10 lg:grid-cols-[0.8fr_1.2fr] lg:gap-16">
                <div>
                  <p className="text-[13px] font-semibold uppercase tracking-[0.18em]" style={{ color: HELP_COLORS.coral }}>
                    {t("faqp.rules.kicker")}
                  </p>
                  <h2 className="mt-4 font-display text-[2.4rem] font-semibold leading-[1.02] tracking-[-0.05em] sm:text-[3.2rem]">
                    {t("faqp.rules.punch")}
                  </h2>
                  <p className="mt-5 max-w-[380px] text-[15px] leading-[1.7] text-muted-foreground">{t("faqp.rules.sub")}</p>
                </div>
                <ol>
                  {PAY_RULES.map((r, i) => (
                    <li key={r.title} className="grid grid-cols-[64px_1fr] gap-4 border-t py-7 last:border-b sm:grid-cols-[96px_1fr]">
                      <span className="font-display text-[3rem] font-semibold leading-[0.9] tracking-[-0.06em] sm:text-[4rem]" style={{ color: HELP_COLORS.coral }}>
                        {i + 1}
                      </span>
                      <div>
                        <p className="font-display text-[1.4rem] leading-[1.2] tracking-[-0.03em] sm:text-[1.6rem]">{t(r.title)}</p>
                        <p className="mt-2 max-w-[520px] text-[15px] leading-[1.7] text-muted-foreground">{t(r.body)}</p>
                      </div>
                    </li>
                  ))}
                </ol>
              </div>
            </Wrap>
          </section>
        )}

        {/* ===================== QUESTIONS ===================== */}
        <section>
          <Wrap className={cat.rules ? "pt-24 lg:pt-32" : "pt-12 lg:pt-20"}>
            <div className="grid gap-10 lg:grid-cols-[0.8fr_1.2fr] lg:gap-16">
              <div className="lg:sticky lg:top-24 lg:self-start">
                <p className="text-[13px] font-semibold uppercase tracking-[0.18em]" style={{ color: HELP_COLORS.coral }}>
                  {t("faqp.questions")}
                </p>
                <h2 className="mt-4 font-display text-[2.4rem] font-semibold leading-[1.02] tracking-[-0.05em] sm:text-[3.2rem]">
                  {t("faqp.qTitle")}
                </h2>
                <p className="mt-5 max-w-[340px] text-[15px] leading-[1.7] text-muted-foreground">{t("faqp.notFoundSub")}</p>
                <Link to="/contact" className={cn(linkCls, "mt-5")}>
                  {t("faqp.writeUs")} <ArrowRight className="h-4 w-4" strokeWidth={1.8} />
                </Link>
              </div>

              <div>
                {cat.items.map((it) => {
                  const isOpen = open === it.id;
                  return (
                    <div key={it.id} id={it.id} className="scroll-mt-24 border-t last:border-b">
                      <button
                        onClick={() => setOpen(isOpen ? null : it.id)}
                        aria-expanded={isOpen}
                        className="group flex w-full items-start justify-between gap-6 py-6 text-left"
                      >
                        <span className={cn("font-display text-[1.3rem] leading-[1.25] tracking-[-0.03em] transition-colors sm:text-[1.55rem]", !isOpen && "text-foreground/80 group-hover:text-foreground")}>
                          {t(it.q)}
                        </span>
                        <span
                          className={cn(
                            "mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-md border transition-all duration-300",
                            isOpen ? "rotate-45 border-foreground bg-foreground text-background" : "text-foreground/60 group-hover:border-foreground/40",
                          )}
                          aria-hidden
                        >
                          <Plus className="h-4 w-4" strokeWidth={1.8} />
                        </span>
                      </button>
                      {isOpen && (
                        <div className="animate-up pb-8 pr-14">
                          <p className="max-w-[620px] text-[16px] leading-[1.75] text-muted-foreground">{t(it.a)}</p>
                          <button
                            type="button"
                            onClick={() => copyLink(it.id)}
                            className="mt-4 inline-flex items-center gap-1.5 text-[13px] text-muted-foreground transition-colors hover:text-foreground"
                          >
                            {copied === it.id ? <Check className="h-3.5 w-3.5" strokeWidth={2} /> : <Link2 className="h-3.5 w-3.5" strokeWidth={1.8} />}
                            {copied === it.id ? t("faqp.linkCopied") : t("faqp.copyLink")}
                          </button>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </Wrap>
        </section>

        {/* ===================== THÈME SUIVANT ===================== */}
        <section>
          <Wrap className="pb-10 pt-24 lg:pt-32">
            <Link to={`/faq/${next.slug}`} className="group block border-t pt-10">
              <span className="text-[13px] uppercase tracking-[0.16em] text-muted-foreground">{t("faqp.nextTopic")}</span>
              <span className="mt-4 flex items-center gap-5 font-display text-[2.6rem] font-semibold leading-[1] tracking-[-0.055em] sm:text-[4rem] lg:text-[5rem]">
                <HelpShape shape={next.shape} color={next.color} className="h-9 w-9 shrink-0 sm:h-12 sm:w-12" />
                <span className="transition-colors group-hover:text-foreground/60">{t(next.title)}</span>
                <ArrowRight className="ml-auto h-8 w-8 shrink-0 transition-transform duration-300 group-hover:translate-x-2 sm:h-12 sm:w-12" strokeWidth={1.4} />
              </span>
            </Link>
          </Wrap>
        </section>
      </main>

      <Footer />
    </div>
  );
};

export default FAQCategory;
