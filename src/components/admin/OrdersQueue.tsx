import { useState } from "react";
import { Hand, Check, Clock, Coins, HandCoins, Inbox } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  CURRENT_OPERATOR, TYPE_META, nfCad, nfUsdt,
  type AdminOrder,
} from "@/lib/adminOrders";
import { ClientCell, StatusBadge, SubTabs } from "./AdminBits";
import AdminHero from "./AdminHero";

interface Props {
  orders: AdminOrder[];
  onOpen: (order: AdminOrder) => void;
  onPatch: (id: string, changes: Partial<AdminOrder>) => void;
}

type SubTab = "queue" | "mine" | "others";

/** Ancienneté courte : « 16 min », « 3 h », « 2 j ». */
const ageShort = (mins: number) => {
  if (mins < 60) return `${mins} min`;
  const h = Math.floor(mins / 60);
  if (h < 24) return `${h} h`;
  return `${Math.floor(h / 24)} j`;
};

const TypeCell = ({ order }: { order: AdminOrder }) => {
  const Icon = order.type === "buy" ? Coins : HandCoins;
  return (
    <span className="inline-flex items-center gap-1.5 text-[12.5px] text-muted-foreground">
      <Icon className="h-[13px] w-[13px]" strokeWidth={1.8} /> {TYPE_META[order.type].label}
    </span>
  );
};

const OrdersQueue = ({ orders, onOpen, onPatch }: Props) => {
  const [tab, setTab] = useState<SubTab>("queue");

  // Commandes actives = en attente de paiement, reçues, ou en cours de
  // traitement. Les nouvelles commandes (statut « attente ») apparaissent donc
  // tout de suite dans la file, avant même le paiement.
  const active = orders
    .filter((o) => o.status === "attente" || o.status === "recu" || o.status === "cours")
    .sort((a, b) => b.createdMinsAgo - a.createdMinsAgo);

  const unassigned = active.filter((o) => !o.assignedTo);
  const mine = active.filter((o) => o.assignedTo === CURRENT_OPERATOR);
  const others = active.filter((o) => o.assignedTo && o.assignedTo !== CURRENT_OPERATOR);

  const TABS: { id: SubTab; label: string; count: number; empty: string }[] = [
    { id: "queue",  label: "File d'attente", count: unassigned.length, empty: "File vide — aucune commande à traiter pour le moment." },
    { id: "mine",   label: "Mes commandes",  count: mine.length,       empty: "Aucune commande en charge — prenez-en une dans la file d'attente." },
    { id: "others", label: "Par l'équipe",   count: others.length,     empty: "Aucune commande traitée par un autre membre." },
  ];
  const list = tab === "queue" ? unassigned : tab === "mine" ? mine : others;

  const cols = "grid grid-cols-[1fr_auto_auto] md:grid-cols-[1.7fr_0.9fr_1fr_0.7fr_auto] items-center gap-3";

  const activeVolume = active.reduce((s, o) => s + o.cad, 0);

  return (
    <div className="space-y-4">
      {/* Héro — charge de travail en cours */}
      <div className="lg:max-w-[620px]">
        <AdminHero
          eyebrow="File d'attente"
          value={unassigned.length}
          unit="à prendre"
          stats={[
            { label: "Mes commandes", value: mine.length },
            { label: "Par l'équipe", value: others.length },
            { label: "Volume actif", value: nfCad.format(activeVolume), hint: "CAD" },
          ]}
        />
      </div>

      {/* Sous-onglets — barre soulignée compacte (modèle Terex) */}
      <SubTabs tabs={TABS} active={tab} onChange={(id) => setTab(id as SubTab)} />

      {/* Tableau */}
      <div className="overflow-hidden rounded-2xl border border-border bg-card">
        {/* En-tête (desktop) */}
        <div className={cn(cols, "hidden border-b border-border px-4 py-2.5 md:grid")}>
          <span className="text-[10.5px] font-semibold uppercase tracking-[0.07em] text-muted-foreground">Client</span>
          <span className="text-[10.5px] font-semibold uppercase tracking-[0.07em] text-muted-foreground">Type</span>
          <span className="text-right text-[10.5px] font-semibold uppercase tracking-[0.07em] text-muted-foreground">Montant</span>
          <span className="text-[10.5px] font-semibold uppercase tracking-[0.07em] text-muted-foreground">Ancienneté</span>
          <span />
        </div>

        {list.map((o, i) => (
          <div
            key={o.id}
            onClick={() => onOpen(o)}
            className={cn(cols, "cursor-pointer px-4 py-2.5 transition-colors hover:bg-secondary/40", i < list.length - 1 && "border-b border-border")}
          >
            {/* Client + référence */}
            <div className="min-w-0">
              <ClientCell name={o.clientName} email={o.ref} />
            </div>

            {/* Type + statut (desktop) */}
            <div className="hidden md:flex md:flex-col md:gap-0.5">
              <TypeCell order={o} />
              <StatusBadge status={o.status} className="text-[11.5px]" />
            </div>

            {/* Montant */}
            <div className="text-right">
              <p className="whitespace-nowrap text-[13px] font-semibold">
                {o.type === "buy" ? `${nfCad.format(o.cad)} CAD` : `${nfUsdt.format(o.usdt)} USDT`}
              </p>
              <p className="hidden text-[11px] text-muted-foreground md:block">
                {o.type === "buy" ? `${nfUsdt.format(o.usdt)} USDT` : `${nfCad.format(o.cad)} CAD`}
              </p>
            </div>

            {/* Ancienneté (desktop) */}
            <span className="hidden items-center gap-1.5 text-[12.5px] text-muted-foreground md:inline-flex">
              <Clock className="h-3 w-3" /> {ageShort(o.createdMinsAgo)}
            </span>

            {/* Action (à droite) */}
            <div className="flex items-center justify-end gap-2" onClick={(e) => e.stopPropagation()}>
              {tab === "queue" && (
                <Button
                  variant="appSolid"
                  shape="rounded"
                  className="h-auto gap-1.5 rounded-[9px] px-3 py-[7px] text-[12.5px] font-bold"
                  onClick={() => onPatch(o.id, { status: "cours", assignedTo: CURRENT_OPERATOR })}
                >
                  <Hand className="h-[13px] w-[13px]" /> Prendre
                </Button>
              )}
              {tab === "mine" && (
                <>
                  <Button
                    variant="appOutline"
                    shape="rounded"
                    className="hidden h-auto rounded-[9px] px-3 py-[7px] text-[12.5px] md:inline-flex"
                    onClick={() => onPatch(o.id, { status: "recu", assignedTo: null })}
                  >
                    Libérer
                  </Button>
                  <Button variant="appSolid" shape="rounded" className="h-auto rounded-[9px] px-3 py-[7px] text-[12.5px] font-bold" onClick={() => onOpen(o)}>
                    Traiter
                  </Button>
                </>
              )}
              {tab === "others" && (
                <Button variant="appOutline" shape="rounded" className="h-auto rounded-[9px] px-3 py-[7px] text-[12.5px]" onClick={() => onOpen(o)}>
                  Ouvrir
                </Button>
              )}
            </div>
          </div>
        ))}

        {list.length === 0 && (
          <div className="flex flex-col items-center px-6 py-10 text-center md:py-16">
            <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-secondary text-muted-foreground md:h-12 md:w-12">
              <Inbox className="h-[18px] w-[18px] md:h-5 md:w-5" strokeWidth={1.6} />
            </span>
            <p className="mt-3 max-w-[260px] text-[11.5px] leading-snug text-muted-foreground md:max-w-none md:text-[13px]">
              {TABS.find((t) => t.id === tab)!.empty}
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default OrdersQueue;
