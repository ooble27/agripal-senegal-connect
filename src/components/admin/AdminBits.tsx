import { cn } from "@/lib/utils";
import { STATUS_META, TYPE_META, type AdminOrder, type OrderStatus, type OrderType } from "@/lib/adminOrders";
import { NETWORKS } from "@/components/app/networks";

/** Statut = simple texte coloré (façon Terex), sans point ni pastille. */
export const StatusBadge = ({ status, className }: { status: OrderStatus; className?: string }) => {
  const m = STATUS_META[status];
  return <span className={cn("whitespace-nowrap text-[13px] font-semibold", m.text, className)}>{m.label}</span>;
};

/** Libellé du type d'opération. */
export const TypeTag = ({ type }: { type: OrderType }) => (
  <span className="whitespace-nowrap text-[13px] font-medium">{TYPE_META[type].label}</span>
);

/** Réseau (logo + nom) ou canal Interac selon le type. */
export const Channel = ({ order }: { order: AdminOrder }) => {
  if (order.type === "sell") {
    return <span className="text-[13px] text-muted-foreground">Interac e-Transfer</span>;
  }
  const net = NETWORKS.find((n) => n.id === order.network);
  if (!net) return <span className="text-[13px] text-muted-foreground">—</span>;
  return (
    <span className="inline-flex items-center gap-2">
      <img src={`/coins/${net.id}.svg`} alt="" className="h-5 w-5 rounded-full" draggable={false} />
      <span className="text-[13px] text-muted-foreground">{net.name} · {net.tag}</span>
    </span>
  );
};

/** Avatar initiales du client. */
export const ClientCell = ({ name, email }: { name: string; email: string }) => {
  const initials = name.split(/\s+/).map((w) => w[0]).slice(0, 2).join("").toUpperCase();
  return (
    <div className="flex min-w-0 items-center gap-2.5">
      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-secondary text-[11px] font-semibold text-foreground/70">
        {initials}
      </span>
      <div className="min-w-0">
        <p className="truncate text-[13px] font-medium leading-tight">{name}</p>
        <p className="truncate text-[11.5px] leading-tight text-muted-foreground">{email}</p>
      </div>
    </div>
  );
};

/** Barre d'onglets soulignés (compacte, façon Terex). */
export interface SubTabDef { id: string; label: string; count?: number }
export const SubTabs = ({ tabs, active, onChange }: { tabs: SubTabDef[]; active: string; onChange: (id: string) => void }) => (
  <div className="-mx-5 flex gap-0.5 overflow-x-auto border-b border-border px-5 [scrollbar-width:none] md:mx-0 md:px-0 [&::-webkit-scrollbar]:hidden">
    {tabs.map((t) => {
      const on = t.id === active;
      return (
        <button
          key={t.id}
          onClick={() => onChange(t.id)}
          className={cn(
            "-mb-px inline-flex shrink-0 items-center gap-1.5 whitespace-nowrap border-b-2 px-2.5 pb-2 pt-1.5 text-[13px] font-medium transition-colors",
            on ? "border-foreground text-foreground" : "border-transparent text-muted-foreground hover:text-foreground",
          )}
        >
          {t.label}
          {t.count !== undefined && (
            <span className="rounded-full bg-secondary px-1.5 py-px text-[11px] font-semibold text-muted-foreground">{t.count}</span>
          )}
        </button>
      );
    })}
  </div>
);
