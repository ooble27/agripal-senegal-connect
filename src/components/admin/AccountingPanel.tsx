import { useMemo } from "react";
import { nfCad, nfUsdt, type AdminOrder } from "@/lib/adminOrders";
import AdminHero from "./AdminHero";

const MARGIN = 0.02; // marché + 2 %

const AccountingPanel = ({ orders }: { orders: AdminOrder[] }) => {
  const stats = useMemo(() => {
    const done = orders.filter((o) => o.status === "termine");
    const volume = done.reduce((s, o) => s + o.cad, 0);
    const buys = done.filter((o) => o.type === "buy");
    const sells = done.filter((o) => o.type === "sell");
    const buyVol = buys.reduce((s, o) => s + o.cad, 0);
    const sellVol = sells.reduce((s, o) => s + o.cad, 0);
    const margin = volume * MARGIN;
    const avg = done.length ? volume / done.length : 0;
    return { count: done.length, volume, margin, avg, buyVol, sellVol, buyN: buys.length, sellN: sells.length };
  }, [orders]);

  const Line = ({ label, value, count }: { label: string; value: string; count: number }) => (
    <div className="flex items-center justify-between px-5 py-4">
      <div>
        <p className="text-[13px] font-medium">{label}</p>
        <p className="text-[12px] text-muted-foreground">{count} commande{count > 1 ? "s" : ""}</p>
      </div>
      <p className="text-[14px] font-semibold">{value}</p>
    </div>
  );

  return (
    <div className="space-y-4">
      {/* Héro — revenus dégagés */}
      <div className="lg:max-w-[620px]">
        <AdminHero
          eyebrow="Revenus dégagés"
          value={nfCad.format(stats.margin)}
          unit="CAD"
          stats={[
            { label: "Volume traité", value: `${nfCad.format(stats.volume)}` },
            { label: "Commandes", value: stats.count },
            { label: "Panier moyen", value: nfCad.format(stats.avg) },
          ]}
        />
      </div>

      <div>
        <p className="mb-2.5 px-1 text-[11px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">Répartition</p>
        <div className="divide-y divide-border overflow-hidden rounded-2xl border border-border bg-card">
          <Line label="Achats (USDT vendus)" value={`${nfCad.format(stats.buyVol)} CAD`} count={stats.buyN} />
          <Line label="Ventes (USDT rachetés)" value={`${nfCad.format(stats.sellVol)} CAD`} count={stats.sellN} />
        </div>
      </div>

      <p className="px-1 text-[12px] text-muted-foreground">
        Calculé sur les commandes réelles terminées. Les revenus sont une estimation via la marge
        ({nfUsdt.format(MARGIN * 100)} %) ; les montants définitifs seront confirmés par la
        réconciliation des paiements Interac.
      </p>
    </div>
  );
};

export default AccountingPanel;
