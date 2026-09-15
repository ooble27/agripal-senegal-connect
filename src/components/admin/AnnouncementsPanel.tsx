import { useEffect, useMemo, useState } from "react";
import {
  AlertTriangle, ArrowLeft, Check, Info, Megaphone, Pencil, Plus, ShieldAlert,
  Trash2, Wrench, X,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { T } from "@/lib/i18n";
import {
  createAnnouncement, createMaintenance,
  deleteAnnouncement, deleteMaintenance,
  listAnnouncements, listMaintenanceWindows,
  updateAnnouncement, updateMaintenance,
  type Announcement, type AnnouncementDraft, type AnnouncementKind,
  type MaintenanceDraft, type MaintenanceWindow,
} from "@/lib/announcements";
import { SubTabs } from "./AdminBits";
import AdminHero from "./AdminHero";

// ─────────────────────── Design tokens ───────────────────────

const inputCn =
  "w-full rounded-xl border border-border bg-card px-3.5 py-2.5 text-[13px] leading-tight outline-none transition-colors placeholder:text-muted-foreground/50 focus:border-foreground";

const KIND_META: Record<AnnouncementKind, { icon: typeof Info; labelFr: string; labelEn: string; badge: string }> = {
  info: { icon: Info, labelFr: "Info", labelEn: "Info", badge: "bg-secondary text-foreground" },
  warning: { icon: AlertTriangle, labelFr: "Avertissement", labelEn: "Warning", badge: "bg-amber-500/20 text-amber-700 dark:text-amber-300" },
  critical: { icon: ShieldAlert, labelFr: "Critique", labelEn: "Critical", badge: "bg-destructive/15 text-destructive" },
};

const Field = ({ label, hint, children }: { label: React.ReactNode; hint?: React.ReactNode; children: React.ReactNode }) => (
  <div>
    <label className="mb-1.5 flex items-baseline justify-between gap-2">
      <span className="text-[12px] font-medium">{label}</span>
      {hint && <span className="text-[11px] text-muted-foreground">{hint}</span>}
    </label>
    {children}
  </div>
);

const Row = ({ children }: { children: React.ReactNode }) => (
  <div className="grid gap-3 md:grid-cols-2">{children}</div>
);

// ─────────────────────── Bannière — éditeur ───────────────────────

const EMPTY_ANN: AnnouncementDraft = {
  kind: "info",
  title_fr: "",
  title_en: "",
  body_fr: "",
  body_en: "",
  dismissible: true,
  active: true,
};

function AnnouncementEditor({
  initial,
  onCancel,
  onSaved,
}: {
  initial?: Announcement;
  onCancel: () => void;
  onSaved: () => void;
}) {
  const [draft, setDraft] = useState<AnnouncementDraft>(
    initial
      ? {
          kind: initial.kind,
          title_fr: initial.title_fr,
          title_en: initial.title_en,
          body_fr: initial.body_fr,
          body_en: initial.body_en,
          dismissible: initial.dismissible,
          active: initial.active,
        }
      : EMPTY_ANN,
  );
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const patch = (p: Partial<AnnouncementDraft>) => setDraft((d) => ({ ...d, ...p }));

  const valid = draft.title_fr.trim() && draft.title_en.trim();

  const save = async () => {
    if (!valid || busy) return;
    setBusy(true);
    setErr(null);
    const res = initial ? await updateAnnouncement(initial.id, draft) : await createAnnouncement(draft);
    setBusy(false);
    if (res.error) { setErr(res.error); return; }
    onSaved();
  };

  return (
    <div className="space-y-4">
      <div className="flex items-start gap-3">
        <button
          onClick={onCancel}
          aria-label="Retour"
          className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-border bg-card transition-colors hover:bg-secondary active:scale-95"
        >
          <ArrowLeft className="h-[18px] w-[18px]" />
        </button>
        <div>
          <h3 className="font-display text-[17px] font-semibold tracking-tight">
            <T en={initial ? "Edit banner" : "New banner"}>{initial ? "Modifier la bannière" : "Nouvelle bannière"}</T>
          </h3>
          <p className="mt-0.5 text-[12px] text-muted-foreground">
            <T en="Bilingual FR / EN. One active banner at a time.">Bilingue FR / EN. Une seule bannière active à la fois.</T>
          </p>
        </div>
      </div>

      <div className="space-y-4 rounded-2xl border border-border bg-card p-5">
        <Field label={<T en="Kind">Type</T>}>
          <div className="flex flex-wrap gap-2">
            {(Object.keys(KIND_META) as AnnouncementKind[]).map((k) => {
              const meta = KIND_META[k];
              const Icon = meta.icon;
              const on = draft.kind === k;
              return (
                <button
                  key={k}
                  type="button"
                  onClick={() => patch({ kind: k })}
                  className={cn(
                    "flex items-center gap-2 rounded-xl border px-3.5 py-2.5 text-[13px] font-medium transition-colors",
                    on ? "border-foreground bg-foreground text-background" : "border-border bg-card text-muted-foreground hover:bg-secondary/50",
                  )}
                >
                  <Icon className="h-4 w-4" strokeWidth={on ? 2 : 1.7} />
                  <T en={meta.labelEn}>{meta.labelFr}</T>
                </button>
              );
            })}
          </div>
        </Field>

        <Row>
          <Field label={<T en="Title (French)">Titre (français)</T>}>
            <input className={inputCn} value={draft.title_fr} onChange={(e) => patch({ title_fr: e.target.value })} placeholder="Maintenance planifiée samedi soir" />
          </Field>
          <Field label={<T en="Title (English)">Titre (anglais)</T>}>
            <input className={inputCn} value={draft.title_en} onChange={(e) => patch({ title_en: e.target.value })} placeholder="Planned maintenance Saturday evening" />
          </Field>
        </Row>

        <Row>
          <Field label={<T en="Body (French)">Corps (français)</T>} hint={<T en="Optional">Facultatif</T>}>
            <textarea rows={3} className={cn(inputCn, "resize-y")} value={draft.body_fr} onChange={(e) => patch({ body_fr: e.target.value })} />
          </Field>
          <Field label={<T en="Body (English)">Corps (anglais)</T>} hint={<T en="Optional">Facultatif</T>}>
            <textarea rows={3} className={cn(inputCn, "resize-y")} value={draft.body_en} onChange={(e) => patch({ body_en: e.target.value })} />
          </Field>
        </Row>

        <Row>
          <label className="flex cursor-pointer items-center gap-3 rounded-xl border border-border bg-card px-3.5 py-3">
            <input type="checkbox" className="h-4 w-4 accent-foreground" checked={draft.dismissible} onChange={(e) => patch({ dismissible: e.target.checked })} />
            <div>
              <p className="text-[13px] font-medium"><T en="Dismissible">Fermable</T></p>
              <p className="text-[11.5px] text-muted-foreground"><T en="Users can close it — the choice is remembered.">Les clients peuvent la fermer — le choix est mémorisé.</T></p>
            </div>
          </label>
          <label className="flex cursor-pointer items-center gap-3 rounded-xl border border-border bg-card px-3.5 py-3">
            <input type="checkbox" className="h-4 w-4 accent-foreground" checked={draft.active} onChange={(e) => patch({ active: e.target.checked })} />
            <div>
              <p className="text-[13px] font-medium"><T en="Publish now">Publier tout de suite</T></p>
              <p className="text-[11.5px] text-muted-foreground"><T en="Any other active banner will be turned off.">Toute autre bannière active sera désactivée.</T></p>
            </div>
          </label>
        </Row>

        {err && <p className="text-[12.5px] text-destructive">{err}</p>}

        <div className="flex gap-2">
          <Button variant="appOutline" shape="rounded" className="h-auto gap-1.5 rounded-xl px-4 py-2.5 text-[13px]" onClick={onCancel}>
            <T en="Cancel">Annuler</T>
          </Button>
          <Button
            variant="appSolid"
            shape="rounded"
            className="h-auto gap-1.5 rounded-xl px-5 py-2.5 text-[13px] font-bold"
            disabled={!valid || busy}
            onClick={save}
          >
            <Check className="h-4 w-4" />
            {busy ? (<T en="Saving...">Enregistrement…</T>) : (<T en="Save">Enregistrer</T>)}
          </Button>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────── Bannière — liste ───────────────────────

function AnnouncementsList({
  items,
  onEdit,
  onRefresh,
}: {
  items: Announcement[];
  onEdit: (a: Announcement) => void;
  onRefresh: () => void;
}) {
  const toggle = async (a: Announcement) => {
    await updateAnnouncement(a.id, { active: !a.active });
    onRefresh();
  };
  const remove = async (a: Announcement) => {
    if (!confirm("Supprimer cette annonce ? / Delete this announcement?")) return;
    await deleteAnnouncement(a.id);
    onRefresh();
  };

  if (items.length === 0) {
    return (
      <div className="flex flex-col items-center rounded-2xl border border-border bg-card py-14 text-center">
        <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-secondary text-muted-foreground">
          <Megaphone className="h-5 w-5" strokeWidth={1.6} />
        </span>
        <p className="mt-3 text-[13px] text-muted-foreground">
          <T en="No announcement yet.">Aucune annonce pour le moment.</T>
        </p>
      </div>
    );
  }

  return (
    <div className="divide-y divide-border overflow-hidden rounded-2xl border border-border bg-card">
      {items.map((a) => {
        const meta = KIND_META[a.kind];
        const Icon = meta.icon;
        return (
          <div key={a.id} className="px-4 py-3.5">
            <div className="flex items-start gap-3">
              <span className={cn("mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full", meta.badge)}>
                <Icon className="h-4 w-4" strokeWidth={1.9} />
              </span>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="text-[13px] font-semibold leading-tight">{a.title_fr}</p>
                  {a.active && (
                    <span className="rounded-md bg-foreground px-1.5 py-0.5 text-[10.5px] font-bold uppercase tracking-[0.05em] text-background">
                      <T en="Active">Active</T>
                    </span>
                  )}
                </div>
                <p className="mt-0.5 truncate text-[12px] text-muted-foreground">{a.title_en}</p>
                {a.body_fr && <p className="mt-1 line-clamp-2 text-[12px] text-muted-foreground">{a.body_fr}</p>}
                <p className="mt-1 text-[11px] text-muted-foreground">
                  {new Date(a.created_at).toLocaleString("fr-CA", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" })}
                </p>
              </div>
              <div className="flex shrink-0 flex-col items-end gap-1.5">
                <Button variant="appOutline" shape="rounded" className="h-auto gap-1 rounded-[9px] px-2.5 py-1.5 text-[12px]" onClick={() => toggle(a)}>
                  {a.active ? (<><X className="h-3.5 w-3.5" /><T en="Deactivate">Désactiver</T></>) : (<><Check className="h-3.5 w-3.5" /><T en="Activate">Activer</T></>)}
                </Button>
                <div className="flex gap-1.5">
                  <button
                    onClick={() => onEdit(a)}
                    aria-label="Edit"
                    className="flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
                  >
                    <Pencil className="h-3.5 w-3.5" />
                  </button>
                  <button
                    onClick={() => remove(a)}
                    aria-label="Delete"
                    className="flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ─────────────────────── Maintenance — éditeur ───────────────────────

const EMPTY_MAINT: MaintenanceDraft = {
  title_fr: "Maintenance en cours",
  title_en: "Maintenance in progress",
  body_fr: "Nous améliorons Ooble. Réessayez dans quelques minutes.",
  body_en: "We're improving Ooble. Please try again in a few minutes.",
  starts_at: null,
  ends_at: null,
  active: true,
};

// Convertit un ISO UTC vers la valeur locale acceptée par `<input type=datetime-local>`.
function isoToLocalInput(iso: string | null): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function localInputToIso(v: string): string | null {
  if (!v) return null;
  const d = new Date(v);
  if (Number.isNaN(d.getTime())) return null;
  return d.toISOString();
}

function MaintenanceEditor({
  initial,
  onCancel,
  onSaved,
}: {
  initial?: MaintenanceWindow;
  onCancel: () => void;
  onSaved: () => void;
}) {
  const [draft, setDraft] = useState<MaintenanceDraft>(
    initial
      ? {
          title_fr: initial.title_fr,
          title_en: initial.title_en,
          body_fr: initial.body_fr,
          body_en: initial.body_en,
          starts_at: initial.starts_at,
          ends_at: initial.ends_at,
          active: initial.active,
        }
      : EMPTY_MAINT,
  );
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const patch = (p: Partial<MaintenanceDraft>) => setDraft((d) => ({ ...d, ...p }));

  const valid = draft.title_fr.trim() && draft.title_en.trim();

  const save = async () => {
    if (!valid || busy) return;
    setBusy(true);
    setErr(null);
    const res = initial ? await updateMaintenance(initial.id, draft) : await createMaintenance(draft);
    setBusy(false);
    if (res.error) { setErr(res.error); return; }
    onSaved();
  };

  return (
    <div className="space-y-4">
      <div className="flex items-start gap-3">
        <button
          onClick={onCancel}
          aria-label="Retour"
          className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-border bg-card transition-colors hover:bg-secondary active:scale-95"
        >
          <ArrowLeft className="h-[18px] w-[18px]" />
        </button>
        <div>
          <h3 className="font-display text-[17px] font-semibold tracking-tight">
            <T en={initial ? "Edit maintenance window" : "New maintenance window"}>{initial ? "Modifier la fenêtre" : "Nouvelle fenêtre"}</T>
          </h3>
          <p className="mt-0.5 text-[12px] text-muted-foreground">
            <T en="Blocks customer pages. Admin routes stay open.">Bloque les pages clients. Le back-office reste accessible.</T>
          </p>
        </div>
      </div>

      <div className="space-y-4 rounded-2xl border border-border bg-card p-5">
        <Row>
          <Field label={<T en="Title (French)">Titre (français)</T>}>
            <input className={inputCn} value={draft.title_fr} onChange={(e) => patch({ title_fr: e.target.value })} />
          </Field>
          <Field label={<T en="Title (English)">Titre (anglais)</T>}>
            <input className={inputCn} value={draft.title_en} onChange={(e) => patch({ title_en: e.target.value })} />
          </Field>
        </Row>

        <Row>
          <Field label={<T en="Message (French)">Message (français)</T>}>
            <textarea rows={3} className={cn(inputCn, "resize-y")} value={draft.body_fr} onChange={(e) => patch({ body_fr: e.target.value })} />
          </Field>
          <Field label={<T en="Message (English)">Message (anglais)</T>}>
            <textarea rows={3} className={cn(inputCn, "resize-y")} value={draft.body_en} onChange={(e) => patch({ body_en: e.target.value })} />
          </Field>
        </Row>

        <Row>
          <Field label={<T en="Starts at">Début</T>} hint={<T en="Optional — leave empty to start immediately">Facultatif — vide = commence tout de suite</T>}>
            <input
              type="datetime-local"
              className={inputCn}
              value={isoToLocalInput(draft.starts_at)}
              onChange={(e) => patch({ starts_at: localInputToIso(e.target.value) })}
            />
          </Field>
          <Field label={<T en="Ends at (ETA)">Fin prévue (ETA)</T>} hint={<T en="Optional — shown to customers">Facultatif — affiché aux clients</T>}>
            <input
              type="datetime-local"
              className={inputCn}
              value={isoToLocalInput(draft.ends_at)}
              onChange={(e) => patch({ ends_at: localInputToIso(e.target.value) })}
            />
          </Field>
        </Row>

        <label className="flex cursor-pointer items-center gap-3 rounded-xl border border-border bg-card px-3.5 py-3">
          <input type="checkbox" className="h-4 w-4 accent-foreground" checked={draft.active} onChange={(e) => patch({ active: e.target.checked })} />
          <div>
            <p className="text-[13px] font-medium"><T en="Enable this window">Activer cette fenêtre</T></p>
            <p className="text-[11.5px] text-muted-foreground">
              <T en="Overlay shows to customers while enabled. Scheduled dates still gate it.">L'overlay s'affiche tant que la fenêtre est active. Les dates planifiées la gouvernent quand même.</T>
            </p>
          </div>
        </label>

        {err && <p className="text-[12.5px] text-destructive">{err}</p>}

        <div className="flex gap-2">
          <Button variant="appOutline" shape="rounded" className="h-auto gap-1.5 rounded-xl px-4 py-2.5 text-[13px]" onClick={onCancel}>
            <T en="Cancel">Annuler</T>
          </Button>
          <Button
            variant="appSolid"
            shape="rounded"
            className="h-auto gap-1.5 rounded-xl px-5 py-2.5 text-[13px] font-bold"
            disabled={!valid || busy}
            onClick={save}
          >
            <Check className="h-4 w-4" />
            {busy ? (<T en="Saving...">Enregistrement…</T>) : (<T en="Save">Enregistrer</T>)}
          </Button>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────── Maintenance — liste ───────────────────────

function MaintenanceList({
  items,
  onEdit,
  onRefresh,
}: {
  items: MaintenanceWindow[];
  onEdit: (m: MaintenanceWindow) => void;
  onRefresh: () => void;
}) {
  const toggle = async (m: MaintenanceWindow) => {
    await updateMaintenance(m.id, { active: !m.active });
    onRefresh();
  };
  const remove = async (m: MaintenanceWindow) => {
    if (!confirm("Supprimer cette fenêtre ? / Delete this window?")) return;
    await deleteMaintenance(m.id);
    onRefresh();
  };

  if (items.length === 0) {
    return (
      <div className="flex flex-col items-center rounded-2xl border border-border bg-card py-14 text-center">
        <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-secondary text-muted-foreground">
          <Wrench className="h-5 w-5" strokeWidth={1.6} />
        </span>
        <p className="mt-3 text-[13px] text-muted-foreground">
          <T en="No maintenance window yet.">Aucune fenêtre pour le moment.</T>
        </p>
      </div>
    );
  }

  const fmt = (iso: string | null) =>
    iso ? new Date(iso).toLocaleString("fr-CA", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" }) : "—";

  return (
    <div className="divide-y divide-border overflow-hidden rounded-2xl border border-border bg-card">
      {items.map((m) => (
        <div key={m.id} className="px-4 py-3.5">
          <div className="flex items-start gap-3">
            <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-secondary text-foreground/70">
              <Wrench className="h-4 w-4" strokeWidth={1.9} />
            </span>
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <p className="text-[13px] font-semibold leading-tight">{m.title_fr}</p>
                {m.active && (
                  <span className="rounded-md bg-foreground px-1.5 py-0.5 text-[10.5px] font-bold uppercase tracking-[0.05em] text-background">
                    <T en="Active">Active</T>
                  </span>
                )}
              </div>
              <p className="mt-0.5 truncate text-[12px] text-muted-foreground">{m.title_en}</p>
              <p className="mt-1 text-[11.5px] text-muted-foreground">
                <T en="From">Du</T> <span className="text-foreground">{fmt(m.starts_at)}</span>{" "}
                <T en="to">au</T> <span className="text-foreground">{fmt(m.ends_at)}</span>
              </p>
            </div>
            <div className="flex shrink-0 flex-col items-end gap-1.5">
              <Button variant="appOutline" shape="rounded" className="h-auto gap-1 rounded-[9px] px-2.5 py-1.5 text-[12px]" onClick={() => toggle(m)}>
                {m.active ? (<><X className="h-3.5 w-3.5" /><T en="Deactivate">Désactiver</T></>) : (<><Check className="h-3.5 w-3.5" /><T en="Activate">Activer</T></>)}
              </Button>
              <div className="flex gap-1.5">
                <button
                  onClick={() => onEdit(m)}
                  aria-label="Edit"
                  className="flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
                >
                  <Pencil className="h-3.5 w-3.5" />
                </button>
                <button
                  onClick={() => remove(m)}
                  aria-label="Delete"
                  className="flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

// ─────────────────────── Panneau principal ───────────────────────

type SubTab = "banner" | "maintenance";

type EditState =
  | { kind: "none" }
  | { kind: "new-ann" }
  | { kind: "edit-ann"; item: Announcement }
  | { kind: "new-mnt" }
  | { kind: "edit-mnt"; item: MaintenanceWindow };

const AnnouncementsPanel = () => {
  const [tab, setTab] = useState<SubTab>("banner");
  const [anns, setAnns] = useState<Announcement[]>([]);
  const [mnts, setMnts] = useState<MaintenanceWindow[]>([]);
  const [loading, setLoading] = useState(true);
  const [edit, setEdit] = useState<EditState>({ kind: "none" });

  const refresh = async () => {
    const [a, m] = await Promise.all([listAnnouncements(), listMaintenanceWindows()]);
    setAnns(a);
    setMnts(m);
    setLoading(false);
  };

  useEffect(() => { refresh(); }, []);

  const TABS = useMemo(
    () => [
      { id: "banner", label: "Bannière", count: anns.filter((a) => a.active).length },
      { id: "maintenance", label: "Maintenance", count: mnts.filter((m) => m.active).length },
    ],
    [anns, mnts],
  );

  if (edit.kind === "new-ann") return <AnnouncementEditor onCancel={() => setEdit({ kind: "none" })} onSaved={() => { setEdit({ kind: "none" }); refresh(); }} />;
  if (edit.kind === "edit-ann") return <AnnouncementEditor initial={edit.item} onCancel={() => setEdit({ kind: "none" })} onSaved={() => { setEdit({ kind: "none" }); refresh(); }} />;
  if (edit.kind === "new-mnt") return <MaintenanceEditor onCancel={() => setEdit({ kind: "none" })} onSaved={() => { setEdit({ kind: "none" }); refresh(); }} />;
  if (edit.kind === "edit-mnt") return <MaintenanceEditor initial={edit.item} onCancel={() => setEdit({ kind: "none" })} onSaved={() => { setEdit({ kind: "none" }); refresh(); }} />;

  const activeBanners = anns.filter((a) => a.active).length;
  const activeMaintenance = mnts.filter((m) => m.active).length;
  const currentCount = tab === "banner" ? activeBanners : activeMaintenance;

  return (
    <div className="space-y-4">
      {/* Héro — communications actives, contenu en colonne */}
      <div className="lg:max-w-[620px]">
        <AdminHero
          eyebrow={<T en="Announcements">Communications</T>}
          loading={loading}
          value={currentCount}
          unit={<T en="active">actives</T>}
          stats={[
            {
              label: <T en="Banners">Bannières</T>,
              value: anns.length,
              hint: <>({activeBanners} <T en="live">actives</T>)</>,
            },
            {
              label: <T en="Maintenance">Maintenance</T>,
              value: mnts.length,
              hint: <>({activeMaintenance} <T en="live">actives</T>)</>,
            },
          ]}
          actions={[
            {
              label: tab === "banner"
                ? <T en="New banner">Nouvelle bannière</T>
                : <T en="Schedule maintenance">Planifier une maintenance</T>,
              icon: Plus,
              primary: true,
              onClick: () => setEdit({ kind: tab === "banner" ? "new-ann" : "new-mnt" }),
            },
          ]}
        />
      </div>

      <SubTabs tabs={TABS} active={tab} onChange={(id) => setTab(id as SubTab)} />

      <div className="flex items-center justify-between">
        <p className="text-[13px] text-muted-foreground">
          {loading ? (
            <T en="Loading...">Chargement…</T>
          ) : tab === "banner" ? (
            <><T en="History of banners published so far.">Historique des bannières publiées.</T></>
          ) : (
            <><T en="Scheduled and past maintenance windows.">Fenêtres de maintenance planifiées et passées.</T></>
          )}
        </p>
        <Button
          variant="appSolid"
          shape="rounded"
          className="h-auto gap-1.5 rounded-[9px] px-3.5 py-2 text-[13px] font-bold"
          onClick={() => setEdit({ kind: tab === "banner" ? "new-ann" : "new-mnt" })}
        >
          <Plus className="h-4 w-4" />
          {tab === "banner" ? (<T en="New banner">Nouvelle bannière</T>) : (<T en="New window">Nouvelle fenêtre</T>)}
        </Button>
      </div>

      {tab === "banner" ? (
        <AnnouncementsList items={anns} onEdit={(a) => setEdit({ kind: "edit-ann", item: a })} onRefresh={refresh} />
      ) : (
        <MaintenanceList items={mnts} onEdit={(m) => setEdit({ kind: "edit-mnt", item: m })} onRefresh={refresh} />
      )}
    </div>
  );
};

export default AnnouncementsPanel;
