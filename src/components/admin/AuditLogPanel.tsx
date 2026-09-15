import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ChevronDown, ChevronRight, Download, Filter, RefreshCw, Search, ShieldCheck, X,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { T, useLang } from "@/lib/i18n";
import {
  fetchAuditLog, fetchAuditFacets,
  ACTION_LABELS, ENTITY_LABELS,
  type AuditLogEntry,
} from "@/lib/audit";
import AdminHero from "./AdminHero";

const PAGE_SIZE = 50;

const dateTimeFmt = new Intl.DateTimeFormat("fr-CA", {
  day: "numeric", month: "short", year: "numeric",
  hour: "2-digit", minute: "2-digit", second: "2-digit",
});

/** Extrait « YYYY-MM-DDTHH:mm » (input datetime-local) → ISO. */
function localToIso(v: string): string | undefined {
  if (!v) return undefined;
  const d = new Date(v);
  if (Number.isNaN(d.getTime())) return undefined;
  return d.toISOString();
}

const initials = (email: string | null) => {
  if (!email) return "?";
  const first = email.split("@")[0] || "?";
  return first.slice(0, 2).toUpperCase();
};

const shortenId = (id: string | null) => (id ? `${id.slice(0, 6)}…${id.slice(-4)}` : "—");

// ────────────────────────────────────────────────────────────
// Badges & primitives
// ────────────────────────────────────────────────────────────

const ActionBadge = ({ action }: { action: string }) => {
  const [lang] = useLang();
  const meta = ACTION_LABELS[action];
  const label = meta ? (lang === "en" ? meta.en : meta.fr) : action;
  const critical = action.startsWith("compliance.declaration") || action === "order.delete";
  return (
    <span className={cn(
      "inline-flex items-center rounded-md px-2 py-0.5 text-[11px] font-bold uppercase tracking-[0.04em]",
      critical ? "bg-destructive/10 text-destructive" : "bg-secondary text-foreground/80",
    )}>
      {label}
    </span>
  );
};

const EntityBadge = ({ kind }: { kind: string | null }) => {
  const [lang] = useLang();
  if (!kind) return <span className="text-[12px] text-muted-foreground">—</span>;
  const meta = ENTITY_LABELS[kind];
  const label = meta ? (lang === "en" ? meta.en : meta.fr) : kind;
  return (
    <span className="inline-flex items-center rounded-md border border-border bg-card px-1.5 py-0.5 text-[11px] font-medium text-muted-foreground">
      {label}
    </span>
  );
};

const JsonBlock = ({ value }: { value: unknown }) => {
  const isEmpty = value === null || value === undefined ||
    (typeof value === "object" && !Array.isArray(value) && Object.keys(value as object).length === 0);
  if (isEmpty) {
    return <pre className="rounded-lg border border-dashed border-border bg-secondary/40 px-3 py-2 text-[11.5px] text-muted-foreground">—</pre>;
  }
  return (
    <pre className="overflow-x-auto rounded-lg border border-border bg-secondary/40 px-3 py-2.5 font-mono text-[11.5px] leading-snug text-foreground/90">
      {JSON.stringify(value, null, 2)}
    </pre>
  );
};

// ────────────────────────────────────────────────────────────
// Diff before/after — clés unifiées, valeurs alignées
// ────────────────────────────────────────────────────────────

const DiffPanel = ({ before, after }: { before: unknown; after: unknown }) => (
  <div className="grid gap-3 md:grid-cols-2">
    <div>
      <p className="mb-1.5 text-[11px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">
        <T en="Before">Avant</T>
      </p>
      <JsonBlock value={before} />
    </div>
    <div>
      <p className="mb-1.5 text-[11px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">
        <T en="After">Après</T>
      </p>
      <JsonBlock value={after} />
    </div>
  </div>
);

// ────────────────────────────────────────────────────────────
// Export CSV
// ────────────────────────────────────────────────────────────

function toCsv(rows: AuditLogEntry[]): string {
  const headers = ["created_at", "actor_email", "actor_role", "action", "entity_kind", "entity_id", "before", "after", "metadata"];
  const escape = (v: unknown): string => {
    if (v === null || v === undefined) return "";
    const s = typeof v === "string" ? v : JSON.stringify(v);
    if (/[",\n\r]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
    return s;
  };
  const lines = [headers.join(",")];
  for (const r of rows) {
    lines.push([
      r.createdAt, r.actorEmail ?? "", r.actorRole ?? "",
      r.action, r.entityKind ?? "", r.entityId ?? "",
      r.before, r.after, r.metadata,
    ].map(escape).join(","));
  }
  return lines.join("\n");
}

function downloadCsv(content: string, filename: string) {
  const blob = new Blob([content], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

// ────────────────────────────────────────────────────────────
// Ligne du journal
// ────────────────────────────────────────────────────────────

const Row = ({ entry, expanded, onToggle }: {
  entry: AuditLogEntry; expanded: boolean; onToggle: () => void;
}) => {
  const dateText = dateTimeFmt.format(new Date(entry.createdAt));
  return (
    <div className={cn("border-b border-border last:border-b-0", expanded && "bg-secondary/30")}>
      <button
        onClick={onToggle}
        className="grid w-full grid-cols-[auto_1fr_auto] items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-secondary/40"
      >
        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-secondary text-[11px] font-semibold text-foreground/70">
          {initials(entry.actorEmail)}
        </span>
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <ActionBadge action={entry.action} />
            <EntityBadge kind={entry.entityKind} />
            <span className="font-mono text-[11px] text-muted-foreground">{shortenId(entry.entityId)}</span>
          </div>
          <p className="mt-1 truncate text-[12.5px] text-muted-foreground">
            <span className="text-foreground/80">{entry.actorEmail ?? "—"}</span>
            {entry.actorRole && <span> · {entry.actorRole}</span>}
            <span> · {dateText}</span>
          </p>
        </div>
        <ChevronRight
          className={cn(
            "h-[16px] w-[16px] shrink-0 text-muted-foreground transition-transform",
            expanded && "rotate-90",
          )}
        />
      </button>

      {expanded && (
        <div className="space-y-3 border-t border-border bg-background/50 px-4 py-4">
          <DiffPanel before={entry.before} after={entry.after} />
          <div>
            <p className="mb-1.5 text-[11px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">
              <T en="Metadata">Métadonnées</T>
            </p>
            <JsonBlock value={entry.metadata} />
          </div>
          <p className="font-mono text-[10.5px] text-muted-foreground/70">id: {entry.id}</p>
        </div>
      )}
    </div>
  );
};

// ────────────────────────────────────────────────────────────
// Panneau principal
// ────────────────────────────────────────────────────────────

const inputCn =
  "w-full rounded-xl border border-border bg-card px-3 py-2.5 text-[13px] leading-tight outline-none transition-colors placeholder:text-muted-foreground/50 focus:border-foreground";

const AuditLogPanel = () => {
  const [rows, setRows] = useState<AuditLogEntry[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [page, setPage] = useState(0);

  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [actorEmail, setActorEmail] = useState("");
  const [action, setAction] = useState<string>("");
  const [entityKind, setEntityKind] = useState<string>("");

  const [facets, setFacets] = useState<{ actions: string[]; entityKinds: string[] }>({ actions: [], entityKinds: [] });

  const load = useCallback(async () => {
    setLoading(true);
    const { rows: data, total: t } = await fetchAuditLog({
      from: localToIso(from), to: localToIso(to),
      actorEmail: actorEmail.trim() || undefined,
      action: action || undefined,
      entityKind: entityKind || undefined,
      limit: PAGE_SIZE,
      offset: page * PAGE_SIZE,
    });
    setRows(data);
    setTotal(t);
    setLoading(false);
  }, [from, to, actorEmail, action, entityKind, page]);

  useEffect(() => { void load(); }, [load]);
  useEffect(() => { fetchAuditFacets().then(setFacets); }, []);

  // Reset page whenever a filter changes (mais pas la page).
  useEffect(() => { setPage(0); }, [from, to, actorEmail, action, entityKind]);

  const resetFilters = () => {
    setFrom(""); setTo(""); setActorEmail(""); setAction(""); setEntityKind("");
  };

  const hasFilters = !!(from || to || actorEmail || action || entityKind);

  const exportCsv = async () => {
    // Récupère jusqu'à 5000 lignes correspondant aux filtres pour l'export.
    const { rows: allRows } = await fetchAuditLog({
      from: localToIso(from), to: localToIso(to),
      actorEmail: actorEmail.trim() || undefined,
      action: action || undefined,
      entityKind: entityKind || undefined,
      limit: 5000, offset: 0,
    });
    const stamp = new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19);
    downloadCsv(toCsv(allRows), `ooble-audit-${stamp}.csv`);
  };

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  // Options des <select> — union des libellés connus + valeurs vues en base.
  const actionOptions = useMemo(() => {
    const known = Object.keys(ACTION_LABELS);
    return [...new Set([...known, ...facets.actions])].sort();
  }, [facets.actions]);
  const entityOptions = useMemo(() => {
    const known = Object.keys(ENTITY_LABELS);
    return [...new Set([...known, ...facets.entityKinds])].sort();
  }, [facets.entityKinds]);

  return (
    <div className="space-y-4">
      {/* Héro — vue d'ensemble journal d'audit, contenu en colonne */}
      <div className="lg:max-w-[620px]">
        <AdminHero
          eyebrow={<T en="Audit log">Journal d'audit</T>}
          loading={loading && rows.length === 0}
          value={total}
          unit={<T en={total > 1 ? "entries" : "entry"}>{total > 1 ? "entrées" : "entrée"}</T>}
          stats={[
            { label: <T en="Page">Page</T>, value: `${page + 1} / ${totalPages}` },
            {
              label: <T en="Filters">Filtres</T>,
              value: hasFilters ? <T en="Active">Actifs</T> : "—",
            },
          ]}
          actions={[
            {
              label: <T en="Export CSV">Exporter CSV</T>,
              icon: Download,
              onClick: exportCsv,
            },
          ]}
        />
      </div>

      {/* Bandeau de filtres */}
      <div className="rounded-2xl border border-border bg-card p-4">
        <div className="mb-3 flex items-center gap-2">
          <Filter className="h-4 w-4 text-muted-foreground" strokeWidth={1.9} />
          <p className="text-[13px] font-medium">
            <T en="Filters">Filtres</T>
          </p>
          {hasFilters && (
            <button
              onClick={resetFilters}
              className="ml-auto inline-flex items-center gap-1 text-[12px] text-muted-foreground transition-colors hover:text-foreground"
            >
              <X className="h-3.5 w-3.5" />
              <T en="Clear">Effacer</T>
            </button>
          )}
        </div>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-5">
          <div>
            <label className="mb-1 block text-[11px] font-medium text-muted-foreground">
              <T en="From">Du</T>
            </label>
            <input
              type="datetime-local"
              value={from}
              onChange={(e) => setFrom(e.target.value)}
              className={inputCn}
            />
          </div>
          <div>
            <label className="mb-1 block text-[11px] font-medium text-muted-foreground">
              <T en="To">Au</T>
            </label>
            <input
              type="datetime-local"
              value={to}
              onChange={(e) => setTo(e.target.value)}
              className={inputCn}
            />
          </div>
          <div>
            <label className="mb-1 block text-[11px] font-medium text-muted-foreground">
              <T en="Actor (email)">Auteur (email)</T>
            </label>
            <div className="relative">
              <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground/60" />
              <input
                type="text"
                spellCheck={false}
                value={actorEmail}
                onChange={(e) => setActorEmail(e.target.value)}
                placeholder="admin@ooble.ca"
                className={cn(inputCn, "pl-8")}
              />
            </div>
          </div>
          <div>
            <label className="mb-1 block text-[11px] font-medium text-muted-foreground">
              <T en="Action">Action</T>
            </label>
            <div className="relative">
              <select
                value={action}
                onChange={(e) => setAction(e.target.value)}
                className={cn(inputCn, "appearance-none pr-8")}
              >
                <option value="">— —</option>
                {actionOptions.map((a) => (
                  <option key={a} value={a}>{a}</option>
                ))}
              </select>
              <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground/60" />
            </div>
          </div>
          <div>
            <label className="mb-1 block text-[11px] font-medium text-muted-foreground">
              <T en="Entity">Entité</T>
            </label>
            <div className="relative">
              <select
                value={entityKind}
                onChange={(e) => setEntityKind(e.target.value)}
                className={cn(inputCn, "appearance-none pr-8")}
              >
                <option value="">— —</option>
                {entityOptions.map((k) => (
                  <option key={k} value={k}>{k}</option>
                ))}
              </select>
              <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground/60" />
            </div>
          </div>
        </div>
      </div>

      {/* Barre d'actions */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-[13px] text-muted-foreground">
          {loading ? (
            <T en="Loading…">Chargement…</T>
          ) : (
            <>
              {total} <T en={total === 1 ? "entry" : "entries"}>{total === 1 ? "entrée" : "entrées"}</T>
              {" · "}
              <T en={`page ${page + 1} of ${totalPages}`}>{`page ${page + 1} sur ${totalPages}`}</T>
            </>
          )}
        </p>
        <div className="flex items-center gap-2">
          <Button
            variant="appOutline"
            shape="rounded"
            className="h-auto gap-1.5 rounded-[9px] px-3 py-2 text-[12.5px]"
            onClick={() => void load()}
          >
            <RefreshCw className="h-[13px] w-[13px]" />
            <T en="Refresh">Actualiser</T>
          </Button>
          <Button
            variant="appSolid"
            shape="rounded"
            className="h-auto gap-1.5 rounded-[9px] px-3 py-2 text-[12.5px] font-bold"
            onClick={() => void exportCsv()}
          >
            <Download className="h-[13px] w-[13px]" />
            <T en="Export CSV">Exporter CSV</T>
          </Button>
        </div>
      </div>

      {/* Liste */}
      <div className="overflow-hidden rounded-2xl border border-border bg-card">
        {rows.length > 0 ? (
          rows.map((r) => (
            <Row
              key={r.id}
              entry={r}
              expanded={expanded === r.id}
              onToggle={() => setExpanded((x) => (x === r.id ? null : r.id))}
            />
          ))
        ) : (
          <div className="flex flex-col items-center py-16 text-center">
            <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-secondary text-muted-foreground">
              <ShieldCheck className="h-5 w-5" strokeWidth={1.6} />
            </span>
            <p className="mt-3 text-[13px] text-muted-foreground">
              {loading
                ? <T en="Loading…">Chargement…</T>
                : hasFilters
                  ? <T en="No entries match these filters.">Aucune entrée ne correspond à ces filtres.</T>
                  : <T en="No admin actions recorded yet.">Aucune action administrative journalisée pour l'instant.</T>}
            </p>
          </div>
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2">
          <Button
            variant="appOutline"
            shape="rounded"
            className="h-auto rounded-[9px] px-3 py-2 text-[12.5px]"
            disabled={page === 0}
            onClick={() => setPage((p) => Math.max(0, p - 1))}
          >
            <T en="Previous">Précédent</T>
          </Button>
          <span className="text-[12.5px] text-muted-foreground">
            {page + 1} / {totalPages}
          </span>
          <Button
            variant="appOutline"
            shape="rounded"
            className="h-auto rounded-[9px] px-3 py-2 text-[12.5px]"
            disabled={page + 1 >= totalPages}
            onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
          >
            <T en="Next">Suivant</T>
          </Button>
        </div>
      )}
    </div>
  );
};

export default AuditLogPanel;
