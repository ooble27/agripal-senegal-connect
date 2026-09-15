import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Inbox, Coins, HandCoins, Filter } from "lucide-react";
import AppShell from "@/components/app/AppShell";
import { ActivityRow } from "@/components/app/ActivityList";
import { listMyOrders, type OrderRow } from "@/lib/orders";
import { useT } from "@/lib/i18n";
import { cn } from "@/lib/utils";
import type { TKey } from "@/lib/translations";

type TabFilter = "all" | "buy" | "sell";

const Activite = () => {
  const navigate = useNavigate();
  const t = useT();
  const [orders, setOrders] = useState<OrderRow[] | null>(null);
  const [tab, setTab] = useState<TabFilter>("all");

  useEffect(() => {
    let active = true;
    listMyOrders(100).then((rows) => { if (active) setOrders(rows); });
    return () => { active = false; };
  }, []);

  const filtered = orders?.filter((o) => tab === "all" || o.side === tab) ?? null;

  const handleClick = (o: OrderRow) => {
    navigate(`/app/activite/${o.id}`, { state: { order: o } });
  };

  const tabs: { key: TabFilter; labelKey: TKey; icon: typeof Filter }[] = [
    { key: "all", labelKey: "act.all", icon: Filter },
    { key: "buy", labelKey: "act.buys", icon: Coins },
    { key: "sell", labelKey: "act.sells", icon: HandCoins },
  ];

  return (
    <AppShell
      wide
      header={
        <div className="flex items-start gap-3">
          <button
            type="button"
            onClick={() => navigate("/app")}
            aria-label={t("misc.back")}
            className="mt-0.5 flex h-[38px] w-[38px] shrink-0 items-center justify-center rounded-full bg-secondary text-foreground transition-colors hover:bg-secondary/70 active:scale-95"
          >
            <ArrowLeft className="h-[18px] w-[18px]" />
          </button>
          <div>
            <h1 className="font-display text-[22px] font-semibold tracking-tight">{t("act.title")}</h1>
            <p className="mt-1 text-[13px] text-muted-foreground">{t("act.sub")}</p>
          </div>
        </div>
      }
    >
      <div className="mb-4 flex gap-1.5">
        {tabs.map(({ key, labelKey, icon: Icon }) => (
          <button
            key={key}
            type="button"
            onClick={() => setTab(key)}
            className={cn(
              "flex items-center gap-1.5 rounded-[10px] px-3.5 py-[7px] text-[12.5px] font-semibold transition-colors",
              tab === key
                ? "bg-foreground text-background"
                : "bg-secondary text-muted-foreground hover:bg-secondary/80",
            )}
          >
            <Icon className="h-3.5 w-3.5" strokeWidth={1.8} />
            {t(labelKey)}
          </button>
        ))}
      </div>

      {filtered === null ? (
        <div className="rounded-2xl border border-border bg-card py-10 text-center text-[13px] text-muted-foreground">
          {t("act.loading")}
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center rounded-2xl border border-border bg-card py-14 text-center">
          <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-secondary text-muted-foreground">
            <Inbox className="h-5 w-5" strokeWidth={1.6} />
          </span>
          <p className="mt-3 text-[14px] font-medium text-foreground">{t("act.noTx")}</p>
          <p className="mt-1 text-[13px] text-muted-foreground">
            {tab === "all" ? t("act.noTxAll") : tab === "buy" ? t("act.noTxBuy") : t("act.noTxSell")}
          </p>
        </div>
      ) : (
        <div className="divide-y divide-border overflow-hidden rounded-2xl border border-border bg-card px-5">
          {filtered.map((o) => (
            <ActivityRow key={o.id} o={o} onClick={() => handleClick(o)} />
          ))}
        </div>
      )}

      {filtered && filtered.length > 0 && (
        <p className="mt-4 text-center text-[12px] text-muted-foreground">
          {filtered.length} {filtered.length > 1 ? t("act.transactions") : t("act.transaction")}
        </p>
      )}
    </AppShell>
  );
};

export default Activite;
