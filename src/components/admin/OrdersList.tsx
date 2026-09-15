import { useMemo, useState } from "react";
import { Search, Coins, HandCoins, Inbox, Download, RefreshCw, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  STATUS_META, TYPE_META, nfCad, nfUsdt, timeAgo,
  type AdminOrder, type OrderStatus, type OrderType,
} from "@/lib/adminOrders";
import { StatusBadge, SubTabs } from "./AdminBits";
import AdminHero from "./AdminHero";

interface Props {
  orders: AdminOrder[];
  onOpen: (order: AdminOrder) => void;
}

/* Seuls ces onglets existent. `OrderType` couvre aussi « transfer », qui n'a pas
   de regroupement ici : `byType[type]` pouvait donc être absent. */
type TypeTab = "all" | "buy" | "sell";
type StatusFilter = "all" | OrderStatus;

const STATUS_FILTERS: { id: StatusFilter; label: string }[] = [
  { id: "all", label: "Toutes" },
  { id: "recu", label: "À traiter" },
  { id: "cours", label: "En traitement" },
  { id: "attente", label: "En attente" },
  { id: "termine", label: "Terminées" },
  { id: "annule", label: "Annulées" },
];

const initials = (name: string) => name.split(/\s+/).map((w) => w[0]).slice(0, 2).join("").toUpperCase();

const TypeCell = ({ type }: { type: OrderType }) => {
  const Icon = type === "buy" ? Coins : HandCoins;
  return (
    <span className="inline-flex items-center gap-1.5 text-[12.5px] text-muted-foreground">
      <Icon className="h-[13px] w-[13px]" strokeWidth={1.8} /> {TYPE_META[type].label}
    </span>
  );
};

const OrdersList = ({ orders, onOpen }: Props) => {
  const [type, setType] = useState<TypeTab>("all");
  const [status, setStatus] = useState<StatusFilter>("all");
  const [q, setQ] = useState("");

  const byType = useMemo(
    () => ({
      all: orders,
      buy: orders.filter((o) => o.type === "buy"),
      sell: orders.filter((o) => o.type === "sell"),
    }),
    [orders],
  );

  const TABS = [
    { id: "all", label: "Toutes", count: byType.all.length },
    { id: "buy", label: "Achats", count: byType.buy.length },
    { id: "sell", label: "Ventes", count: byType.sell.length },
  ];

  const base = byType[type];
  const rows = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return base
      .filter((o) => (status === "all" ? true : o.status === status))
      .filter((o) =>
        needle === ""
          ? true
          : o.ref.toLowerCase().includes(needle) ||
            o.clientName.toLowerCase().includes(needle) ||
            o.clientEmail.toLowerCase().includes(needle),
      )
      .sort((a, b) => a.createdMinsAgo - b.createdMinsAgo);
  }, [base, q, status]);

  const clientCount = new Set(base.map((o) => o.clientEmail)).size;

  const exportCSV = () => {
    const head = ["Référence", "Client", "E-mail", "Type", "Montant CAD", "Montant USDT", "Statut"];
    const body = rows.map((o) => [o.ref, o.clientName, o.clientEmail, TYPE_META[o.type].label, o.cad.toFixed(2), o.usdt.toFixed(2), STATUS_META[o.status].label]);
    const csv = [head, ...body].map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(",")).join("\n");
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
    const a = document.createElement("a");
    a.href = url;
    a.download = "commandes-ooble.csv";
    a.click();
    URL.revokeObjectURL(url);
  };

  const cols = "grid grid-cols-[1fr_auto_auto] md:grid-cols-[1.7fr_0.8fr_1fr_0.7fr_auto] items-center gap-3";

  const baseVolume = base.reduce((s, o) => s + o.cad, 0);

  return (
    <div className="space-y-4">
      {/* Héro — volume de commandes */}
      <div className="lg:max-w-[620px]">
        <AdminHero
          eyebrow="Commandes"
          value={base.length}
          unit={base.length > 1 ? "commandes" : "commande"}
          stats={[
            { label: "Clients", value: clientCount },
            { label: "Volume", value: nfCad.format(baseVolume), hint: "CAD" },
            { label: "Affichées", value: rows.length },
          ]}
          actions={[
            { label: "Exporter CSV", icon: Download, onClick: exportCSV },
            {
              label: "Réinitialiser",
              icon: RefreshCw,
              onClick: () => { setQ(""); setStatus("all"); },
            },
          ]}
        />
      </div>

      {/* Achats / Ventes — onglets soulignés */}
      <SubTabs tabs={TABS} active={type} onChange={(id) => setType(id as TypeTab)} />

      {/* Recherche (police 16px pour éviter le zoom mobile) */}
      <div className="flex items-center gap-2.5 rounded-xl border border-border bg-card px-3.5 py-2.5">
        <Search className="h-[18px] w-[18px] shrink-0 text-muted-foreground" />
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Rechercher : client, référence, e-mail…"
          className="w-full bg-transparent text-base outline-none placeholder:text-muted-foreground/70 md:text-[13px]"
        />
      </div>

      {/* Filtres de statut */}
      <div className="-mx-5 flex gap-2 overflow-x-auto px-5 pb-0.5 [scrollbar-width:none] md:mx-0 md:px-0 [&::-webkit-scrollbar]:hidden">
        {STATUS_FILTERS.map((f) => {
          const count = f.id === "all" ? base.length : base.filter((o) => o.status === f.id).length;
          const on = status === f.id;
          return (
            <button
              key={f.id}
              onClick={() => setStatus(f.id)}
              className={cn(
                "inline-flex shrink-0 items-center gap-1.5 rounded-[10px] border px-3.5 py-[7px] text-[12.5px] font-semibold transition-colors",
                on ? "border-foreground/25 bg-secondary text-foreground" : "border-border bg-transparent text-muted-foreground hover:text-foreground",
              )}
            >
              {f.label}
              <span className="text-[11px] opacity-60">{count}</span>
            </button>
          );
        })}
      </div>

      {/* Tableau */}
      <div className="overflow-hidden rounded-2xl border border-border bg-card">
        <div className={cn(cols, "hidden border-b border-border px-4 py-2.5 md:grid")}>
          <span className="text-[10.5px] font-semibold uppercase tracking-[0.07em] text-muted-foreground">Client</span>
          <span className="text-[10.5px] font-semibold uppercase tracking-[0.07em] text-muted-foreground">Type</span>
          <span className="text-right text-[10.5px] font-semibold uppercase tracking-[0.07em] text-muted-foreground">Montant</span>
          <span className="text-right text-[10.5px] font-semibold uppercase tracking-[0.07em] text-muted-foreground">Date</span>
          <span />
        </div>

        {rows.map((o, i) => (
          <div
            key={o.id}
            onClick={() => onOpen(o)}
            className={cn(cols, "cursor-pointer px-4 py-2.5 transition-colors hover:bg-secondary/40", i < rows.length - 1 && "border-b border-border")}
          >
            {/* Client + statut dessous */}
            <div className="flex min-w-0 items-center gap-2.5">
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-secondary text-[11px] font-semibold text-foreground/70">
                {initials(o.clientName)}
              </span>
              <div className="min-w-0">
                <p className="truncate text-[13px] font-medium leading-tight">{o.clientName}</p>
                <StatusBadge status={o.status} className="text-[12px]" />
              </div>
            </div>

            {/* Type (desktop) */}
            <div className="hidden md:block"><TypeCell type={o.type} /></div>

            {/* Montant */}
            <div className="text-right">
              <p className="whitespace-nowrap text-[13px] font-semibold">{nfCad.format(o.cad)} CAD</p>
              <p className="text-[11px] text-muted-foreground">{nfUsdt.format(o.usdt)} USDT</p>
            </div>

            {/* Date (desktop) */}
            <span className="hidden text-right text-[12px] text-muted-foreground md:block">{timeAgo(o.createdMinsAgo)}</span>

            <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />
          </div>
        ))}

        {rows.length === 0 && (
          <div className="flex flex-col items-center py-16 text-center">
            <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-secondary text-muted-foreground">
              <Inbox className="h-5 w-5" strokeWidth={1.6} />
            </span>
            <p className="mt-3 text-[13px] text-muted-foreground">Aucune commande ne correspond.</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default OrdersList;
