import { useState } from "react";
import { Link } from "react-router-dom";
import { ArrowRight, ShoppingCart, Banknote } from "lucide-react";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { useT } from "@/lib/i18n";
import { cn } from "@/lib/utils";
import type { TKey } from "@/lib/translations";

interface Step {
  titleKey: TKey;
  descKey: TKey;
  img: string;
}

const BUY_STEPS: Step[] = [
  { titleKey: "guide.buy.step1", descKey: "guide.buy.step1d", img: "/guides/buy-2-amount-filled.jpg" },
  { titleKey: "guide.buy.step2", descKey: "guide.buy.step2d", img: "/guides/buy-4-network-selected.jpg" },
  { titleKey: "guide.buy.step3", descKey: "guide.buy.step3d", img: "/guides/buy-6-address-filled.jpg" },
  { titleKey: "guide.buy.step4", descKey: "guide.buy.step4d", img: "/guides/buy-7-summary.jpg" },
];

const SELL_STEPS: Step[] = [
  { titleKey: "guide.sell.step1", descKey: "guide.sell.step1d", img: "/guides/sell-2-amount-filled.jpg" },
  { titleKey: "guide.sell.step2", descKey: "guide.sell.step2d", img: "/guides/sell-4-network-selected.jpg" },
  { titleKey: "guide.sell.step3", descKey: "guide.sell.step3d", img: "/guides/sell-5-reception.jpg" },
  { titleKey: "guide.sell.step4", descKey: "guide.sell.step4d", img: "/guides/sell-6-send.jpg" },
];

type Tab = "buy" | "sell";

const Guide = () => {
  const t = useT();
  const [tab, setTab] = useState<Tab>("buy");

  const steps = tab === "buy" ? BUY_STEPS : SELL_STEPS;

  return (
    <div className="ink-neutral app-type min-h-screen bg-background tracking-[-0.015em]">
      <Header />

      <main className="mx-auto max-w-[1200px] px-6 sm:px-10">
        {/* Hero */}
        <section className="pt-14 text-center lg:pt-20">
          <p className="text-[12px] uppercase tracking-[0.16em] text-muted-foreground">
            Ooble
          </p>
          <h1 className="mt-5 font-display text-[2.4rem] leading-[0.98] tracking-[-0.05em] sm:text-[3.4rem] lg:text-[4rem]">
            {t("guide.title")}
          </h1>
          <p className="mx-auto mt-5 max-w-[520px] text-[15px] leading-[1.65] text-muted-foreground">
            {t("guide.sub")}
          </p>
        </section>

        {/* Tab toggle */}
        <section className="pt-12 lg:pt-16">
          <div className="mx-auto flex w-fit gap-1.5 rounded-full border border-border bg-secondary/60 p-1">
            <button
              onClick={() => setTab("buy")}
              className={cn(
                "flex items-center gap-2 rounded-full px-5 py-2.5 text-sm font-semibold transition-all",
                tab === "buy"
                  ? "bg-foreground text-background shadow-sm"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              <ShoppingCart className="h-4 w-4" />
              {t("guide.buyTitle")}
            </button>
            <button
              onClick={() => setTab("sell")}
              className={cn(
                "flex items-center gap-2 rounded-full px-5 py-2.5 text-sm font-semibold transition-all",
                tab === "sell"
                  ? "bg-foreground text-background shadow-sm"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              <Banknote className="h-4 w-4" />
              {t("guide.sellTitle")}
            </button>
          </div>

          <p className="mx-auto mt-6 max-w-[560px] text-center text-[15px] leading-[1.65] text-muted-foreground">
            {tab === "buy" ? t("guide.buySub") : t("guide.sellSub")}
          </p>
        </section>

        {/* Steps */}
        <section className="pb-16 pt-12 lg:pb-20 lg:pt-16">
          <div className="space-y-16 lg:space-y-24">
            {steps.map((step, i) => {
              const reverse = i % 2 === 1;
              return (
                <div
                  key={step.titleKey}
                  className={cn(
                    "grid items-center gap-8 lg:grid-cols-2 lg:gap-14",
                    reverse && "lg:[direction:rtl] lg:[&>*]:[direction:ltr]",
                  )}
                >
                  {/* Screenshot */}
                  <div className="overflow-hidden rounded-2xl border border-border bg-secondary/30 shadow-sm">
                    <img
                      src={step.img}
                      alt={t(step.titleKey)}
                      className="w-full"
                      loading={i === 0 ? "eager" : "lazy"}
                    />
                  </div>

                  {/* Text */}
                  <div>
                    <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-foreground text-sm font-bold text-background">
                      {i + 1}
                    </span>
                    <h3 className="mt-4 font-display text-[1.6rem] leading-[1.1] tracking-[-0.03em] sm:text-[1.9rem]">
                      {t(step.titleKey)}
                    </h3>
                    <p className="mt-3 max-w-[440px] text-[15px] leading-[1.7] text-muted-foreground">
                      {t(step.descKey)}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        {/* CTA */}
        <section className="border-t py-16 text-center lg:py-20">
          <h2 className="mx-auto max-w-[560px] font-display text-[1.9rem] leading-[1.06] tracking-[-0.04em] sm:text-[2.6rem]">
            {tab === "buy" ? t("guide.buyTitle") : t("guide.sellTitle")}
          </h2>
          <p className="mx-auto mt-5 max-w-[380px] text-[15px] leading-[1.6] text-muted-foreground">
            {tab === "buy" ? t("guide.buySub") : t("guide.sellSub")}
          </p>
          <div className="mt-9 flex flex-wrap justify-center gap-2.5">
            <Button asChild variant="appSolid" shape="rounded" size="default" className="px-6">
              <Link to="/inscription">
                {t("guide.cta")} <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
            <Button asChild variant="secondary" shape="rounded" size="default" className="px-6">
              <Link to="/faq">{t("nav.faq")}</Link>
            </Button>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
};

export default Guide;
