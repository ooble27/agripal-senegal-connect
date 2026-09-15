import { useState } from "react";
import { Link } from "react-router-dom";
import { ArrowRight } from "lucide-react";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { FaqArt } from "@/components/illustrations";
import { useT } from "@/lib/i18n";
import { cn } from "@/lib/utils";
import type { TKey } from "@/lib/translations";

const FAQ = () => {
  const t = useT();

  const GROUPS: { topicKey: TKey; items: { qKey: TKey; aKey: TKey }[] }[] = [
    {
      topicKey: "faqp.topic1",
      items: [
        { qKey: "faqp.1q", aKey: "faqp.1a" },
        { qKey: "faqp.2q", aKey: "faqp.2a" },
        { qKey: "faqp.3q", aKey: "faqp.3a" },
      ],
    },
    {
      topicKey: "faqp.topic2",
      items: [
        { qKey: "faqp.4q", aKey: "faqp.4a" },
        { qKey: "faqp.5q", aKey: "faqp.5a" },
        { qKey: "faqp.6q", aKey: "faqp.6a" },
        { qKey: "faqp.7q", aKey: "faqp.7a" },
      ],
    },
    {
      topicKey: "faqp.topic3",
      items: [
        { qKey: "faqp.8q", aKey: "faqp.8a" },
        { qKey: "faqp.9q", aKey: "faqp.9a" },
      ],
    },
  ];

  const [open, setOpen] = useState<string | null>("faqp.1q");

  return (
    <div className="ink-neutral app-type min-h-screen bg-background tracking-[-0.015em]">
      <Header />

      <main className="mx-auto max-w-[1200px] px-6 sm:px-10">
        <section className="grid items-center gap-10 pt-14 lg:grid-cols-[1.1fr_0.9fr] lg:pt-20">
          <div>
            <p className="text-[12px] uppercase tracking-[0.16em] text-muted-foreground">
              {t("faqp.kicker")}
            </p>
            <h1 className="mt-5 font-display text-[2.7rem] leading-[0.98] tracking-[-0.05em] sm:text-[3.8rem] lg:text-[4.5rem]">
              {t("faqp.title1")}
              <br />
              <span className="text-foreground/35">{t("faqp.title2")}</span>
            </h1>
          </div>
          <FaqArt className="mx-auto hidden w-full max-w-[360px] lg:block" aria-hidden />
        </section>

        <section className="pt-16 lg:pt-20">
          {GROUPS.map((group) => (
            <div key={group.topicKey} className="pb-14 lg:pb-16">
              <div className="grid gap-6 lg:grid-cols-[0.9fr_1.1fr] lg:gap-16">
                <p className="font-display text-[1.4rem] tracking-[-0.03em] lg:sticky lg:top-8 lg:self-start">
                  {t(group.topicKey)}
                </p>

                <div>
                  {group.items.map((item) => {
                    const isOpen = open === item.qKey;
                    return (
                      <div key={item.qKey} className="border-t">
                        <button
                          onClick={() => setOpen(isOpen ? null : item.qKey)}
                          aria-expanded={isOpen}
                          className="flex w-full items-center justify-between gap-6 py-5 text-left"
                        >
                          <span className="font-display text-[17px] tracking-[-0.02em]">
                            {t(item.qKey)}
                          </span>
                          <span
                            className={cn(
                              "shrink-0 text-[22px] leading-none text-foreground/35 transition-transform",
                              isOpen && "rotate-45",
                            )}
                            aria-hidden
                          >
                            +
                          </span>
                        </button>
                        {isOpen && (
                          <p className="mb-6 max-w-[620px] text-[15px] leading-[1.7] text-muted-foreground">
                            {t(item.aKey)}
                          </p>
                        )}
                      </div>
                    );
                  })}
                  <div className="border-t" />
                </div>
              </div>
            </div>
          ))}
        </section>

        <section className="border-t py-16 text-center lg:py-20">
          <h2 className="mx-auto max-w-[560px] font-display text-[1.9rem] leading-[1.06] tracking-[-0.04em] sm:text-[2.6rem]">
            {t("faqp.notFound")}
          </h2>
          <p className="mx-auto mt-5 max-w-[380px] text-[15px] leading-[1.6] text-muted-foreground">
            {t("faqp.notFoundSub")}
          </p>
          <div className="mt-9 flex flex-wrap justify-center gap-2.5">
            <Button asChild variant="appSolid" shape="rounded" size="default" className="px-6">
              <Link to="/contact">
                {t("faqp.writeUs")} <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
            <Button asChild variant="secondary" shape="rounded" size="default" className="px-6">
              <Link to="/inscription">{t("nav.signup")}</Link>
            </Button>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
};

export default FAQ;
