import { useEffect, useMemo, useState, useRef, useCallback } from "react";
import { ArrowLeft, ArrowRight, Copy, Check, Hand, Ban, RotateCcw, ChevronRight, Banknote } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  CURRENT_OPERATOR, STATUS_META, TYPE_META, nfCad, nfUsdt, timeAgo,
  type AdminOrder,
} from "@/lib/adminOrders";
import { fetchOrderEvents, type OrderEvent } from "@/lib/adminOrderEvents";
import { sendRefundEmail } from "@/lib/email";
import { useAuth } from "@/lib/auth";
import { StatusBadge } from "./AdminBits";
import { NETWORKS } from "@/components/app/networks";
import { Trash2 } from "lucide-react";

interface Props {
  order: AdminOrder;
  onBack: () => void;
  onPatch: (id: string, changes: Partial<AdminOrder>) => void;
  onDelete: (id: string) => void;
  onShowClient?: (userId: string) => void;
}

type SectionId = "client" | "transaction" | "paiement" | "destination" | "historique";

const dateFmt = new Intl.DateTimeFormat("fr-CA", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });
const timeFmt = new Intl.DateTimeFormat("fr-CA", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });
const initials = (name: string) => name.split(/\s+/).map((w) => w[0]).slice(0, 2).join("").toUpperCase();

const EVENT_LABEL: Record<string, string> = {
  created: "Commande créée",
  awaiting_payment: "En attente de paiement",
  payment_received: "Fonds reçus",
  settling: "Prise en charge",
  completed: "Terminée",
  cancelled: "Annulée",
  expired: "Expirée",
};

const Timeline = ({ order, events }: { order: AdminOrder; events: OrderEvent[] | null }) => {
  const steps: { label: string; actor?: string; hint: string; done: boolean }[] = [
    { label: "Commande créée", hint: timeAgo(order.createdMinsAgo), done: true },
    ...(events ?? []).map((e) => ({
      label: EVENT_LABEL[e.status] ?? e.status,
      actor: e.actor,
      hint: timeFmt.format(new Date(e.createdAt)),
      done: true,
    })),
  ];

  return (
    <div className="px-5 py-4">
      {events === null ? (
        <p className="text-[13px] text-muted-foreground">Chargement de l'historique…</p>
      ) : (
        <ol>
          {steps.map((st, i) => (
            <li key={i} className="flex gap-3">
              <div className="flex flex-col items-center">
                <span className="mt-1 h-2.5 w-2.5 shrink-0 rounded-full bg-foreground" />
                {i < steps.length - 1 && <span className="w-px flex-1 bg-foreground/30" />}
              </div>
              <div className={cn(i < steps.length - 1 ? "pb-5" : "pb-0")}>
                <p className="text-[13px] font-medium text-foreground">
                  {st.label}
                  {st.actor && <span className="font-normal text-muted-foreground"> — {st.actor}</span>}
                </p>
                {st.hint && <p className="mt-0.5 text-[12px] text-muted-foreground">{st.hint}</p>}
              </div>
            </li>
          ))}
        </ol>
      )}
    </div>
  );
};

const SegmentedTabs = ({ sections, active, onSelect }: { sections: { id: SectionId; label: string }[]; active: SectionId; onSelect: (id: SectionId) => void }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const btnRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const [pill, setPill] = useState({ left: 0, width: 0, ready: false });

  const activeIdx = sections.findIndex((s) => s.id === active);

  const measure = useCallback(() => {
    const el = btnRefs.current[activeIdx];
    if (!el) return;
    setPill({ left: el.offsetLeft, width: el.offsetWidth, ready: true });
  }, [activeIdx]);

  useEffect(() => { requestAnimationFrame(measure); }, [measure]);

  return (
    <div ref={containerRef} className="relative flex gap-0.5 overflow-x-auto rounded-xl bg-secondary p-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
      {pill.ready && (
        <div
          className="absolute top-1 h-[calc(100%-8px)] rounded-[9px] bg-card transition-[left,width] duration-300 ease-[cubic-bezier(0.4,0,0.2,1)]"
          style={{ left: pill.left, width: pill.width }}
        />
      )}
      {sections.map((s, i) => (
        <button
          key={s.id}
          ref={(el) => { btnRefs.current[i] = el; }}
          onClick={() => onSelect(s.id)}
          className={cn(
            "relative z-10 flex-1 whitespace-nowrap rounded-[9px] px-3.5 py-2 text-[13.5px] transition-colors duration-200",
            s.id === active ? "text-foreground" : "text-muted-foreground hover:text-foreground",
          )}
        >
          {s.label}
        </button>
      ))}
    </div>
  );
};

const OrderDetail = ({ order, onBack, onPatch, onDelete, onShowClient }: Props) => {
  const { isAdmin } = useAuth();
  const [section, setSection] = useState<SectionId>("client");
  const [copied, setCopied] = useState<string | null>(null);
  const [events, setEvents] = useState<OrderEvent[] | null>(null);
  const [confirmDel, setConfirmDel] = useState(false);
  const [confirmRefund, setConfirmRefund] = useState(false);
  const [refunding, setRefunding] = useState(false);
  const [refundError, setRefundError] = useState<string | null>(null);
  const lockedByOther = !!order.assignedTo && order.assignedTo !== CURRENT_OPERATOR;

  useEffect(() => {
    let active = true;
    setEvents(null);
    fetchOrderEvents(order.id).then((e) => { if (active) setEvents(e); });
    return () => { active = false; };
  }, [order.id, order.status, order.assignedTo]);

  const copy = (value: string, key: string) => {
    navigator.clipboard?.writeText(value).catch(() => {});
    setCopied(key);
    setTimeout(() => setCopied((c) => (c === key ? null : c)), 1200);
  };

  const refundAmount = order.type === "buy"
    ? `${nfCad.format(order.cad)} CAD`
    : `${nfUsdt.format(order.usdt)} USDT`;

  const handleRefund = async () => {
    setRefunding(true);
    setRefundError(null);
    const { error } = await sendRefundEmail({
      to: order.clientEmail,
      clientName: order.clientName,
      ref: order.ref,
      amount: refundAmount,
    });
    if (error) {
      setRefundError(error);
      setRefunding(false);
      return;
    }
    onPatch(order.id, { status: "rembourse" });
    setConfirmRefund(false);
    setRefunding(false);
  };

  const Row = ({ label, value, mono, copyKey }: { label: string; value?: string | null; mono?: boolean; copyKey?: string }) => (
    <div className="flex items-start justify-between gap-4 px-5 py-3.5">
      <span className="shrink-0 text-[14px] text-muted-foreground">{label}</span>
      <span className="flex min-w-0 items-center gap-2">
        <span className={cn("break-all text-right text-[14px] font-medium", mono && "font-mono text-[12px]")}>{value || "—"}</span>
        {copyKey && value && (
          <button onClick={() => copy(value, copyKey)} className="shrink-0 text-muted-foreground transition-colors hover:text-foreground" aria-label="Copier">
            {copied === copyKey ? <Check className="h-[14px] w-[14px] text-primary" /> : <Copy className="h-[14px] w-[14px]" />}
          </button>
        )}
      </span>
    </div>
  );

  const SECTIONS = useMemo(() => {
    const base: { id: SectionId; label: string }[] = [
      { id: "client", label: "Client" },
      { id: "transaction", label: "Transaction" },
      { id: "paiement", label: "Paiement" },
    ];
    if (order.type === "buy") base.push({ id: "destination", label: "Destination" });
    base.push({ id: "historique", label: "Historique" });
    return base;
  }, [order.type]);
  const active = SECTIONS.some((s) => s.id === section) ? section : "client";

  const sends = order.type === "buy" ? `${nfCad.format(order.cad)} CAD` : `${nfUsdt.format(order.usdt)} USDT`;
  const receives = order.type === "buy" ? `${nfUsdt.format(order.usdt)} USDT` : `${nfCad.format(order.cad)} CAD`;
  const createdAt = dateFmt.format(new Date(Date.now() - order.createdMinsAgo * 60000));

  return (
    <div className="mx-auto w-full max-w-[720px] space-y-4">
      {/* En-tête */}
      <div className="flex items-start gap-3">
        <button
          onClick={onBack}
          aria-label="Retour"
          className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-border bg-card transition-colors hover:bg-secondary active:scale-95"
        >
          <ArrowLeft className="h-[18px] w-[18px]" />
        </button>
        <div className="min-w-0">
          <p className="text-[15px] font-semibold">
            {TYPE_META[order.type].label} USDT <span className="text-muted-foreground">·</span> <StatusBadge status={order.status} className="align-baseline" />
          </p>
          <button onClick={() => copy(order.ref, "ref")} className="mt-0.5 inline-flex items-center gap-1.5 font-mono text-[12px] text-muted-foreground transition-colors hover:text-foreground">
            {order.ref} {copied === "ref" ? <Check className="h-3 w-3 text-primary" /> : <Copy className="h-3 w-3" />}
          </button>
        </div>
      </div>

      {/* Carte client + montants */}
      <div className="rounded-2xl border border-border bg-card p-5">
        <div className="flex items-center gap-3">
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-secondary text-[14px] font-semibold text-foreground/70">
            {initials(order.clientName)}
          </span>
          <div className="min-w-0">
            <p className="truncate text-[15px] font-semibold">{order.clientName}</p>
            <p className="text-[12px] text-muted-foreground">{createdAt}</p>
          </div>
        </div>

        <div className="mt-5 flex items-center justify-between gap-4">
          <div className="min-w-0">
            <p className="text-[11px] uppercase tracking-[0.08em] text-muted-foreground">Le client envoie</p>
            <p className="mt-1 truncate font-display text-[22px] font-semibold tracking-tight">{sends}</p>
          </div>
          <ArrowRight className="h-5 w-5 shrink-0 text-muted-foreground" />
          <div className="min-w-0 text-right">
            <p className="text-[11px] uppercase tracking-[0.08em] text-muted-foreground">Le client reçoit</p>
            <p className="mt-1 truncate font-display text-[22px] font-semibold tracking-tight">{receives}</p>
          </div>
        </div>
      </div>

      {/* Onglets de section — contrôle segmenté avec pill glissante */}
      <SegmentedTabs sections={SECTIONS} active={active} onSelect={(id) => setSection(id)} />

      {/* Contenu de section */}
      <div className="divide-y divide-border overflow-hidden rounded-2xl border border-border bg-card">
        {active === "client" && (
          <>
            <Row label="Nom complet" value={order.clientName} />
            <Row label="E-mail" value={order.clientEmail} mono copyKey="email" />
            <Row label="Téléphone" value={null} />
            <Row label="ID utilisateur" value={order.userId ? order.userId.slice(0, 12) + "…" + order.userId.slice(-4) : "—"} mono copyKey="uid" />
            <button
              onClick={() => order.userId && onShowClient?.(order.userId)}
              className="flex w-full items-center justify-between px-5 py-3.5 text-left transition-colors hover:bg-secondary/40"
            >
              <span className="text-[14px] font-medium">Voir la fiche complète du client</span>
              <ChevronRight className="h-[18px] w-[18px] text-muted-foreground" />
            </button>
          </>
        )}
        {active === "transaction" && (
          <>
            <Row label="Type" value={`${TYPE_META[order.type].label} USDT`} />
            <Row label="Montant CAD" value={`${nfCad.format(order.cad)} CAD`} />
            <Row label="Montant USDT" value={`${nfUsdt.format(order.usdt)} USDT`} />
            <Row label="Taux" value={`1 USDT = ${nfCad.format(order.rate)} CAD`} />
            <Row label="Créée le" value={createdAt} />
            <Row label="Référence" value={order.ref} mono copyKey="tref" />
          </>
        )}
        {active === "paiement" && (
          order.type === "buy" ? (
            <>
              <Row label="Moyen" value="Interac e-Transfer (entrant)" />
              <Row label="Le client paie" value={`${nfCad.format(order.cad)} CAD`} />
              <Row label="Référence" value={order.ref} mono copyKey="pref" />
            </>
          ) : (
            <>
              <Row label="Moyen" value="Interac e-Transfer (sortant)" />
              <Row label="À verser au client" value={`${nfCad.format(order.cad)} CAD`} />
              <Row label="E-mail Interac" value={order.interacEmail} mono copyKey="interac" />
            </>
          )
        )}
        {active === "destination" && order.type === "buy" && (
          <>
            <Row label="Réseau" value={(() => { const n = NETWORKS.find((x) => x.id === order.network); return n ? `${n.name} · ${n.tag}` : "—"; })()} />
            <Row label="Adresse de réception" value={order.address} mono copyKey="addr" />
          </>
        )}
        {active === "historique" && <Timeline order={order} events={events} />}
      </div>

      {/* Barre d'actions */}
      {lockedByOther ? (
        <div className="rounded-2xl border border-border bg-secondary/50 px-5 py-4 text-center">
          <p className="text-[13px] leading-relaxed text-muted-foreground">
            Cette commande est en cours de traitement par <span className="font-semibold text-foreground">{order.assignedTo}</span>.<br/>
            Elle doit être libérée avant que vous puissiez la traiter.
          </p>
        </div>
      ) : (
        <div className="flex flex-wrap gap-2.5">
          {order.status === "cours" && (
            <Button variant="appSolid" shape="rounded" className="h-auto gap-2 rounded-[10px] px-4 py-[11px] text-sm font-bold" onClick={() => onPatch(order.id, { status: "recu" })}>
              <Check className="h-[17px] w-[17px]" /> Marquer reçu
            </Button>
          )}
          {order.status === "recu" && (
            <Button variant="appSolid" shape="rounded" className="h-auto gap-2 rounded-[10px] px-4 py-[11px] text-sm font-bold" onClick={() => onPatch(order.id, { status: "termine" })}>
              <Check className="h-[17px] w-[17px]" /> Marquer terminé
            </Button>
          )}
          {(order.status === "cours" || order.status === "recu") && (
            <Button variant="appOutline" shape="rounded" className="h-auto gap-2 rounded-[10px] px-4 py-[11px] text-sm" onClick={() => onPatch(order.id, { status: "attente", assignedTo: null })}>
              Libérer
            </Button>
          )}
          {order.status !== "termine" && order.status !== "annule" && order.status !== "rembourse" && (
            <Button variant="appOutline" shape="rounded" className="h-auto gap-2 rounded-[10px] px-4 py-[11px] text-sm" onClick={() => onPatch(order.id, { status: "annule" })}>
              <Ban className="h-[17px] w-[17px]" /> Annuler
            </Button>
          )}
          {(order.status === "recu" || order.status === "cours" || order.status === "termine") && (
            <Button
              variant="appOutline"
              shape="rounded"
              className="h-auto gap-2 rounded-[10px] border-amber-500/30 px-4 py-[11px] text-sm text-amber-600 hover:bg-amber-500/10 dark:text-amber-400"
              onClick={() => setConfirmRefund(true)}
            >
              <Banknote className="h-[17px] w-[17px]" /> Rembourser
            </Button>
          )}
          {(order.status === "termine" || order.status === "annule" || order.status === "rembourse") && (
            <Button variant="appOutline" shape="rounded" className="h-auto gap-2 rounded-[10px] px-4 py-[11px] text-sm" onClick={() => onPatch(order.id, { status: "attente", assignedTo: null })}>
              <RotateCcw className="h-[17px] w-[17px]" /> Rouvrir
            </Button>
          )}
        </div>
      )}

      {confirmRefund && (
        <div className="rounded-2xl border border-amber-500/30 bg-amber-500/5 p-5">
          <p className="text-[14px] font-medium">
            Confirmer le remboursement de <span className="font-bold">{refundAmount}</span> à {order.clientName} ?
          </p>
          <p className="mt-1.5 text-[12.5px] text-muted-foreground">
            Un courriel sera envoyé au client à {order.clientEmail}.
          </p>
          {refundError && (
            <p className="mt-2 rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-[12.5px] text-destructive">
              {refundError}
            </p>
          )}
          <div className="mt-4 flex gap-2.5">
            <Button
              shape="rounded"
              className="h-auto gap-2 rounded-[10px] border border-amber-500 bg-amber-500 px-4 py-2.5 text-[12.5px] font-bold text-white hover:opacity-90"
              onClick={handleRefund}
              disabled={refunding}
            >
              <Banknote className="h-[14px] w-[14px]" />
              {refunding ? "Envoi…" : "Confirmer le remboursement"}
            </Button>
            <Button
              variant="ghost"
              shape="rounded"
              className="h-auto rounded-[10px] px-3.5 py-2.5 text-[12.5px]"
              onClick={() => { setConfirmRefund(false); setRefundError(null); }}
              disabled={refunding}
            >
              Annuler
            </Button>
          </div>
        </div>
      )}

      <p className="pt-1 text-center text-[13px] text-muted-foreground">
        Cette commande est <span className="text-foreground">{STATUS_META[order.status].label.toLowerCase()}</span>.
      </p>

      {/* Zone admin : suppression définitive */}
      {isAdmin && (
        <div className="mt-2 flex items-center justify-center gap-2.5 border-t border-border pt-4">
          {confirmDel ? (
            <>
              <span className="text-[12.5px] text-muted-foreground">Supprimer définitivement ?</span>
              <Button
                shape="rounded"
                className="h-auto gap-1.5 rounded-[10px] border border-destructive bg-destructive px-3.5 py-2 text-[12.5px] font-bold text-destructive-foreground hover:opacity-90"
                onClick={() => onDelete(order.id)}
              >
                <Trash2 className="h-[14px] w-[14px]" /> Confirmer
              </Button>
              <Button variant="ghost" shape="rounded" className="h-auto rounded-[10px] px-3.5 py-2 text-[12.5px]" onClick={() => setConfirmDel(false)}>
                Annuler
              </Button>
            </>
          ) : (
            <Button
              variant="ghost"
              shape="rounded"
              className="h-auto gap-1.5 rounded-[10px] px-3.5 py-2 text-[12.5px] text-destructive hover:bg-destructive/10"
              onClick={() => setConfirmDel(true)}
            >
              <Trash2 className="h-[14px] w-[14px]" /> Supprimer la commande
            </Button>
          )}
        </div>
      )}
    </div>
  );
};

export default OrderDetail;
