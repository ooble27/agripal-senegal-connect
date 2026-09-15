import { Fragment, useEffect, useMemo, useState } from "react";
import {
  ArrowLeft, Check, ChevronDown, ChevronRight, Clock, FileText, Shield,
  AlertTriangle, Send, Save, UserCheck,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { nfCad, CURRENT_OPERATOR, type AdminOrder } from "@/lib/adminOrders";
import {
  ALERT_TYPE_META, ALERT_STATUS_META,
  DECL_TYPE_META, DECL_STATUS_META,
  RECORD_CATEGORIES, SEED_CHECKLIST, CHECKLIST_CATEGORIES,
  SEED_ALERTS, SEED_DECLARATIONS,
  DOIMV_THRESHOLD, DOIMV_DEADLINE_DAYS, DOT_DEADLINE_DAYS,
  RECORD_RETENTION_YEARS,
  autoFlagOrders, daysUntil,
  CLASSIFICATION_REASONS, DOT_INDICATORS, ID_TYPES, PROVINCES,
  initialDeclarationForm,
  type ComplianceAlert, type AlertStatus, type AlertType,
  type ComplianceDeclaration, type DeclarationType,
  type ChecklistItem, type DeclarationFormData,
} from "@/lib/compliance";
import { SubTabs } from "./AdminBits";
import AdminHero from "./AdminHero";
import { logAdminAction } from "@/lib/audit";

// ──────────────── Design tokens ────────────────

const inputCn =
  "w-full rounded-xl border border-border bg-card px-4 py-3 text-[14px] leading-tight outline-none ring-offset-background transition-colors placeholder:text-muted-foreground/50 focus:border-foreground focus:ring-2 focus:ring-foreground/10";

// ──────────────── Shared components ────────────────

const SummaryCard = ({ label, value, sub, urgent }: {
  label: string; value: string; sub?: string; urgent?: boolean;
}) => (
  <div className={cn("rounded-2xl border bg-card px-5 py-4", urgent ? "border-destructive/30" : "border-border")}>
    <p className="text-[11px] font-medium uppercase tracking-[0.12em] text-muted-foreground">{label}</p>
    <p className={cn(
      "mt-1.5 font-display text-[24px] font-light leading-none tracking-tight",
      urgent && "text-destructive",
    )}>{value}</p>
    {sub && <p className="mt-1.5 text-[12px] text-muted-foreground">{sub}</p>}
  </div>
);

const TypeBadge = ({ type }: { type: AlertType | DeclarationType }) => {
  const meta = (ALERT_TYPE_META as Record<string, { label: string; critical: boolean }>)[type]
    ?? { label: (DECL_TYPE_META as Record<string, { label: string }>)[type]?.label ?? type, critical: type === "dot" || type === "dbt" };
  return (
    <span className={cn(
      "inline-flex items-center rounded-md px-2 py-0.5 text-[11px] font-bold uppercase tracking-[0.05em]",
      meta.critical ? "bg-destructive/10 text-destructive" : "bg-secondary text-foreground",
    )}>{meta.label}</span>
  );
};

const Field = ({ label, hint, required, children }: {
  label: string; hint?: string; required?: boolean; children: React.ReactNode;
}) => (
  <div>
    <label className="mb-1.5 flex items-baseline justify-between gap-2">
      <span className="text-[12px] font-medium">
        {label}{required && <span className="ml-0.5 text-destructive">*</span>}
      </span>
      {hint && <span className="text-[11px] text-muted-foreground">{hint}</span>}
    </label>
    {children}
  </div>
);

const SelectWrap = ({ children }: { children: React.ReactNode }) => (
  <div className="relative">
    {children}
    <ChevronDown className="pointer-events-none absolute right-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground/60" />
  </div>
);

const FormSection = ({ label, children }: { label: string; children: React.ReactNode }) => (
  <div>
    <p className="mb-3 text-[11px] font-semibold uppercase tracking-[0.1em] text-muted-foreground">{label}</p>
    <div className="space-y-3">{children}</div>
  </div>
);

const BackButton = ({ onClick }: { onClick: () => void }) => (
  <button
    onClick={onClick}
    className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-border bg-card transition-colors hover:bg-secondary active:scale-95"
    aria-label="Retour"
  >
    <ArrowLeft className="h-[18px] w-[18px]" />
  </button>
);

const TogglePill = ({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) => (
  <button
    type="button"
    onClick={onClick}
    className={cn(
      "rounded-xl border px-4 py-2.5 text-[13px] font-medium transition-colors",
      active
        ? "border-foreground bg-foreground text-background"
        : "border-border bg-card text-muted-foreground hover:bg-secondary/50",
    )}
  >
    {label}
  </button>
);

const RadioCard = ({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) => (
  <button
    type="button"
    onClick={onClick}
    className={cn(
      "flex w-full items-start gap-3 rounded-xl border px-4 py-3 text-left transition-colors",
      active ? "border-foreground bg-foreground/5" : "border-border hover:bg-secondary/30",
    )}
  >
    <span className={cn(
      "mt-px flex h-[18px] w-[18px] shrink-0 items-center justify-center rounded-full border-2 transition-colors",
      active ? "border-foreground" : "border-muted-foreground/30",
    )}>
      {active && <span className="h-2 w-2 rounded-full bg-foreground" />}
    </span>
    <span className="text-[13px] leading-snug">{label}</span>
  </button>
);

const CheckCard = ({ label, checked, onChange }: { label: string; checked: boolean; onChange: () => void }) => (
  <button
    type="button"
    onClick={onChange}
    className={cn(
      "flex w-full items-start gap-3 rounded-xl border px-4 py-3 text-left transition-colors",
      checked ? "border-foreground/20 bg-foreground/5" : "border-border hover:bg-secondary/30",
    )}
  >
    <span className={cn(
      "mt-px flex h-[18px] w-[18px] shrink-0 items-center justify-center rounded-[5px] border-2 transition-colors",
      checked ? "border-foreground bg-foreground text-background" : "border-muted-foreground/30",
    )}>
      {checked && <Check className="h-2.5 w-2.5" strokeWidth={3} />}
    </span>
    <span className="text-[13px] leading-snug">{label}</span>
  </button>
);

const initials = (name: string) =>
  name.split(/\s+/).map((w) => w[0]).slice(0, 2).join("").toUpperCase();

const SuccessBanner = ({ message }: { message: string }) => (
  <div className="flex items-center gap-2.5 rounded-xl border border-foreground/10 bg-foreground/5 px-4 py-3">
    <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-foreground text-background">
      <Check className="h-3 w-3" strokeWidth={3} />
    </span>
    <p className="text-[13px] font-medium">{message}</p>
  </div>
);

// ──────────────── Step Indicator ────────────────

const DECL_STEPS = ["Opération", "Client", "Justification", "Récapitulatif"] as const;

const StepIndicator = ({ current }: { current: number }) => (
  <div className="flex items-center gap-0">
    {DECL_STEPS.map((label, i) => {
      const done = i < current;
      const active = i === current;
      return (
        <Fragment key={label}>
          {i > 0 && <div className={cn("h-px flex-1", done ? "bg-foreground" : "bg-border")} />}
          <div className={cn(
            "flex shrink-0 items-center gap-1.5 rounded-full px-2.5 py-1.5 text-[12px] font-medium transition-colors",
            active ? "bg-foreground text-background" : done ? "text-foreground" : "text-muted-foreground/50",
          )}>
            <span className={cn(
              "flex h-[22px] w-[22px] shrink-0 items-center justify-center rounded-full text-[10px] font-bold transition-colors",
              active ? "bg-background/20 text-background"
                : done ? "bg-foreground text-background"
                : "bg-border text-muted-foreground/50",
            )}>
              {done ? <Check className="h-3 w-3" strokeWidth={3} /> : i + 1}
            </span>
            <span className="hidden md:inline">{label}</span>
          </div>
        </Fragment>
      );
    })}
  </div>
);

// ──────────────── Classer sans suite ────────────────

const ClasserView = ({ alert, onSubmit, onBack }: {
  alert: ComplianceAlert;
  onSubmit: (reason: string, notes: string) => void;
  onBack: () => void;
}) => {
  const [reason, setReason] = useState("");
  const [notes, setNotes] = useState("");
  const valid = reason.length > 0 && notes.trim().length > 0;

  return (
    <div className="space-y-4">
      <div className="flex items-start gap-3">
        <BackButton onClick={onBack} />
        <div>
          <h3 className="font-display text-[17px] font-semibold tracking-tight">Classer sans suite</h3>
          <p className="mt-0.5 text-[12px] text-muted-foreground">
            Clôturez cette alerte sans soumettre de déclaration au CANAFE.
          </p>
        </div>
      </div>

      {/* Alert summary */}
      <div className="rounded-2xl border border-border bg-card p-4">
        <div className="flex items-center gap-2.5">
          <TypeBadge type={alert.type} />
          <span className="text-[12px] text-muted-foreground">{alert.id}</span>
        </div>
        <div className="mt-3 flex items-center gap-2.5">
          <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-secondary text-[10px] font-semibold text-foreground/70">
            {initials(alert.clientName)}
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-[13px] font-medium">{alert.clientName}</p>
            <p className="text-[11.5px] text-muted-foreground">{alert.clientEmail}</p>
          </div>
          <span className="shrink-0 text-[14px] font-semibold tabular-nums">{nfCad.format(alert.amount)} $</span>
        </div>
      </div>

      {/* Reason */}
      <div className="rounded-2xl border border-border bg-card p-5">
        <FormSection label="Motif du classement">
          <div className="space-y-2">
            {CLASSIFICATION_REASONS.map((r) => (
              <RadioCard key={r} label={r} active={reason === r} onClick={() => setReason(r)} />
            ))}
          </div>
        </FormSection>

        <div className="mt-6">
          <Field label="Notes justificatives" required>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
              placeholder="Décrivez brièvement pourquoi cette alerte ne nécessite pas de déclaration…"
              className={cn(inputCn, "resize-none")}
            />
          </Field>
          <p className="mt-2 text-[11px] text-muted-foreground">
            Conservé au dossier pendant {RECORD_RETENTION_YEARS} ans (LRPCFAT).
          </p>
        </div>
      </div>

      <Button
        variant="appSolid" shape="rounded"
        className="h-auto w-full gap-2 rounded-xl px-5 py-3.5 text-[14px] font-bold"
        disabled={!valid}
        onClick={() => onSubmit(reason, notes)}
      >
        <Check className="h-4 w-4" />
        Confirmer le classement
      </Button>
    </div>
  );
};

// ──────────────── Declaration Workflow ────────────────

const DeclarationWorkflow = ({ alert, form, onChange, onSubmit, onBack }: {
  alert: ComplianceAlert;
  form: DeclarationFormData;
  onChange: (f: DeclarationFormData) => void;
  onSubmit: (asBrouillon: boolean) => void;
  onBack: () => void;
}) => {
  const [step, setStep] = useState(0);
  const set = <K extends keyof DeclarationFormData>(k: K, v: DeclarationFormData[K]) =>
    onChange({ ...form, [k]: v });

  const canAdvance = (): boolean => {
    if (step === 0) return form.amountCad.length > 0 && form.operationDate.length > 0;
    if (step === 1) return form.clientName.length > 0 && form.clientEmail.length > 0
      && form.clientDob.length > 0 && form.clientIdType.length > 0 && form.clientIdNumber.length > 0
      && form.clientAddress.length > 0 && form.clientCity.length > 0 && form.clientProvince.length > 0
      && form.clientPostalCode.length > 0;
    if (step === 2) {
      if (form.type === "dot") return form.suspicionIndicators.length > 0 && form.observations.trim().length > 0;
      return true;
    }
    return true;
  };

  const toggleIndicator = (ind: string) => {
    const cur = form.suspicionIndicators;
    set("suspicionIndicators", cur.includes(ind) ? cur.filter((x) => x !== ind) : [...cur, ind]);
  };

  const navButtons = (
    <div className="flex gap-3">
      <Button
        variant="appOutline" shape="rounded"
        className="h-auto gap-1.5 rounded-xl px-5 py-3 text-[13px] font-bold"
        onClick={step > 0 ? () => setStep(step - 1) : onBack}
      >
        <ArrowLeft className="h-3.5 w-3.5" />
        {step > 0 ? "Précédent" : "Annuler"}
      </Button>
      <Button
        variant="appSolid" shape="rounded"
        className="h-auto flex-1 gap-1.5 rounded-xl px-5 py-3 text-[13px] font-bold"
        disabled={!canAdvance()}
        onClick={() => setStep(step + 1)}
      >
        Suivant
        <ChevronRight className="h-3.5 w-3.5" />
      </Button>
    </div>
  );

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-start gap-3">
        <BackButton onClick={step > 0 ? () => setStep(step - 1) : onBack} />
        <div className="min-w-0 flex-1">
          <h3 className="font-display text-[17px] font-semibold tracking-tight">Déclarer au CANAFE</h3>
          <p className="mt-0.5 text-[12px] text-muted-foreground">
            {DECL_TYPE_META[form.type].full} — {alert.id}
          </p>
        </div>
      </div>

      <StepIndicator current={step} />

      {/* ── Step 0 : Opération ── */}
      {step === 0 && (
        <div className="space-y-4">
          <div className="rounded-2xl border border-border bg-card p-5">
            <FormSection label="Type de déclaration">
              <div className="flex flex-wrap gap-2">
                {(["doimv", "dot", "dbt"] as DeclarationType[]).map((t) => (
                  <TogglePill key={t} label={DECL_TYPE_META[t].label} active={form.type === t} onClick={() => set("type", t)} />
                ))}
              </div>
              <p className="mt-1.5 text-[11.5px] text-muted-foreground">{DECL_TYPE_META[form.type].full}</p>
            </FormSection>
          </div>

          <div className="rounded-2xl border border-border bg-card p-5 space-y-6">
            <FormSection label="Détails de l'opération">
              <div className="flex flex-wrap gap-2">
                <TogglePill label="Achat" active={form.operationType === "buy"} onClick={() => set("operationType", "buy")} />
                <TogglePill label="Vente" active={form.operationType === "sell"} onClick={() => set("operationType", "sell")} />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <Field label="Montant CAD" required>
                  <input type="text" inputMode="decimal" value={form.amountCad} onChange={(e) => set("amountCad", e.target.value)} className={inputCn} />
                </Field>
                <Field label="Montant USDT" hint="Facultatif">
                  <input type="text" inputMode="decimal" value={form.amountUsdt} onChange={(e) => set("amountUsdt", e.target.value)} placeholder="—" className={inputCn} />
                </Field>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <Field label="Date de l'opération" required hint="AAAA-MM-JJ">
                  <input type="text" value={form.operationDate} onChange={(e) => set("operationDate", e.target.value)} placeholder="2026-08-01" className={cn(inputCn, "tabular-nums")} />
                </Field>
                <Field label="Mode de paiement">
                  <input type="text" value={form.paymentMethod} onChange={(e) => set("paymentMethod", e.target.value)} className={inputCn} />
                </Field>
              </div>
            </FormSection>

            <FormSection label="Blockchain">
              <div className="grid grid-cols-2 gap-3">
                <Field label="Réseau">
                  <input type="text" value={form.network} onChange={(e) => set("network", e.target.value)} placeholder="Tron, Ethereum…" className={inputCn} />
                </Field>
                <Field label="Adresse portefeuille">
                  <input type="text" value={form.walletAddress} onChange={(e) => set("walletAddress", e.target.value)} placeholder="T…" className={cn(inputCn, "font-mono text-[13px]")} />
                </Field>
              </div>
            </FormSection>
          </div>

          {navButtons}
        </div>
      )}

      {/* ── Step 1 : Client ── */}
      {step === 1 && (
        <div className="space-y-4">
          <div className="rounded-2xl border border-border bg-card p-5 space-y-6">
            <FormSection label="Identité">
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <Field label="Nom complet" required>
                  <input type="text" value={form.clientName} onChange={(e) => set("clientName", e.target.value)} className={inputCn} />
                </Field>
                <Field label="Courriel" required>
                  <input type="email" value={form.clientEmail} onChange={(e) => set("clientEmail", e.target.value)} className={inputCn} />
                </Field>
              </div>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <Field label="Date de naissance" required hint="AAAA-MM-JJ">
                  <input type="text" value={form.clientDob} onChange={(e) => set("clientDob", e.target.value)} placeholder="1990-01-15" className={cn(inputCn, "tabular-nums")} />
                </Field>
                <Field label="Occupation">
                  <input type="text" value={form.clientOccupation} onChange={(e) => set("clientOccupation", e.target.value)} placeholder="Analyste, Étudiant…" className={inputCn} />
                </Field>
              </div>
            </FormSection>

            <FormSection label="Document d'identité">
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <Field label="Type de pièce" required>
                  <SelectWrap>
                    <select value={form.clientIdType} onChange={(e) => set("clientIdType", e.target.value)} className={cn(inputCn, "appearance-none pr-10")}>
                      <option value="">Sélectionner…</option>
                      {ID_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
                    </select>
                  </SelectWrap>
                </Field>
                <Field label="Numéro" required>
                  <input type="text" value={form.clientIdNumber} onChange={(e) => set("clientIdNumber", e.target.value)} placeholder="P1234567" className={inputCn} />
                </Field>
              </div>
            </FormSection>

            <FormSection label="Adresse">
              <Field label="Adresse" required>
                <input type="text" value={form.clientAddress} onChange={(e) => set("clientAddress", e.target.value)} placeholder="123 rue Principale" className={inputCn} />
              </Field>
              <div className="grid grid-cols-3 gap-3">
                <Field label="Ville" required>
                  <input type="text" value={form.clientCity} onChange={(e) => set("clientCity", e.target.value)} className={inputCn} />
                </Field>
                <Field label="Province" required>
                  <SelectWrap>
                    <select value={form.clientProvince} onChange={(e) => set("clientProvince", e.target.value)} className={cn(inputCn, "appearance-none pr-10")}>
                      <option value="">—</option>
                      {PROVINCES.map((p) => <option key={p.code} value={p.code}>{p.code}</option>)}
                    </select>
                  </SelectWrap>
                </Field>
                <Field label="Code postal" required>
                  <input type="text" value={form.clientPostalCode} onChange={(e) => set("clientPostalCode", e.target.value)} placeholder="H2X 1Y1" className={cn(inputCn, "uppercase")} />
                </Field>
              </div>
            </FormSection>
          </div>

          <p className="px-1 text-[11px] text-muted-foreground">
            Le CANAFE exige l'identité complète du client pour toute déclaration (art. 64–65 RRPCFAT).
          </p>

          {navButtons}
        </div>
      )}

      {/* ── Step 2 : Justification ── */}
      {step === 2 && (
        <div className="space-y-4">
          {form.type === "doimv" && (
            <div className="rounded-2xl border border-border bg-card p-5 space-y-5">
              <div className="flex items-start gap-3 rounded-xl bg-foreground/5 px-4 py-3">
                <Shield className="mt-0.5 h-4 w-4 shrink-0" />
                <div>
                  <p className="text-[13px] font-medium">Seuil DOIMV atteint</p>
                  <p className="mt-1 text-[12px] leading-relaxed text-muted-foreground">
                    L'opération de {nfCad.format(Number(form.amountCad))} $ CA atteint le seuil de{" "}
                    {nfCad.format(DOIMV_THRESHOLD)} $. Une DOIMV doit être soumise dans les{" "}
                    {DOIMV_DEADLINE_DAYS} jours (art. 12 RRPCFAT).
                  </p>
                </div>
              </div>
              <Field label="Observations" hint="Facultatif">
                <textarea
                  value={form.observations}
                  onChange={(e) => set("observations", e.target.value)}
                  rows={3}
                  placeholder="Notes complémentaires…"
                  className={cn(inputCn, "resize-none")}
                />
              </Field>
            </div>
          )}

          {form.type === "dot" && (
            <div className="space-y-4">
              <div className="rounded-2xl border border-border bg-card p-5">
                <FormSection label="Indicateurs de soupçon">
                  <p className="text-[12px] text-muted-foreground -mt-1 mb-2">
                    Sélectionnez au moins un indicateur observé.
                  </p>
                  <div className="space-y-2">
                    {DOT_INDICATORS.map((ind) => (
                      <CheckCard
                        key={ind}
                        label={ind}
                        checked={form.suspicionIndicators.includes(ind)}
                        onChange={() => toggleIndicator(ind)}
                      />
                    ))}
                  </div>
                </FormSection>
              </div>

              <div className="rounded-2xl border border-border bg-card p-5">
                <Field label="Observations détaillées" required>
                  <textarea
                    value={form.observations}
                    onChange={(e) => set("observations", e.target.value)}
                    rows={4}
                    placeholder="Dates, montants, comportements observés…"
                    className={cn(inputCn, "resize-none")}
                  />
                </Field>
              </div>

              <div className="flex items-start gap-2.5 rounded-xl border border-destructive/20 bg-destructive/5 px-4 py-3">
                <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-destructive" />
                <p className="text-[12px] text-muted-foreground">
                  <span className="font-semibold text-destructive">Important :</span> délai de{" "}
                  {DOT_DEADLINE_DAYS} jours (3 jours si terrorisme). Ne divulguez jamais au client
                  qu'une DOT a été soumise.
                </p>
              </div>
            </div>
          )}

          {form.type === "dbt" && (
            <div className="space-y-4">
              <div className="flex items-start gap-2.5 rounded-xl border border-destructive/20 bg-destructive/5 px-4 py-3">
                <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-destructive" />
                <div>
                  <p className="text-[13px] font-semibold text-destructive">Déclaration de biens terroristes</p>
                  <p className="mt-1 text-[12px] text-muted-foreground">
                    Soumission obligatoire et immédiate. Gelez les fonds et contactez le CANAFE
                    au 1-866-346-8722.
                  </p>
                </div>
              </div>
              <div className="rounded-2xl border border-border bg-card p-5">
                <Field label="Observations détaillées" required>
                  <textarea
                    value={form.observations}
                    onChange={(e) => set("observations", e.target.value)}
                    rows={4}
                    placeholder="Motifs de la déclaration…"
                    className={cn(inputCn, "resize-none")}
                  />
                </Field>
              </div>
            </div>
          )}

          {navButtons}
        </div>
      )}

      {/* ── Step 3 : Récapitulatif ── */}
      {step === 3 && (
        <div className="space-y-3">
          <div className="rounded-2xl border border-border bg-card divide-y divide-border">
            {/* Opération */}
            <div className="p-5">
              <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">Opération</p>
              <div className="mt-3 grid grid-cols-2 gap-x-4 gap-y-2 text-[13px]">
                <span className="text-muted-foreground">Type</span><span className="text-right"><TypeBadge type={form.type} /></span>
                <span className="text-muted-foreground">Opération</span><span className="text-right font-medium">{form.operationType === "buy" ? "Achat" : "Vente"}</span>
                <span className="text-muted-foreground">Montant</span><span className="text-right font-semibold tabular-nums">{nfCad.format(Number(form.amountCad))} $</span>
                {form.amountUsdt && <><span className="text-muted-foreground">USDT</span><span className="text-right tabular-nums">{form.amountUsdt}</span></>}
                <span className="text-muted-foreground">Date</span><span className="text-right tabular-nums">{form.operationDate}</span>
                <span className="text-muted-foreground">Paiement</span><span className="text-right">{form.paymentMethod}</span>
                {form.network && <><span className="text-muted-foreground">Réseau</span><span className="text-right">{form.network}</span></>}
                {form.walletAddress && <><span className="text-muted-foreground">Portefeuille</span><span className="max-w-[180px] truncate text-right font-mono text-[12px]">{form.walletAddress}</span></>}
              </div>
            </div>

            {/* Client */}
            <div className="p-5">
              <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">Client</p>
              <div className="mt-3 grid grid-cols-2 gap-x-4 gap-y-2 text-[13px]">
                <span className="text-muted-foreground">Nom</span><span className="text-right font-medium">{form.clientName}</span>
                <span className="text-muted-foreground">Courriel</span><span className="text-right">{form.clientEmail}</span>
                <span className="text-muted-foreground">Naissance</span><span className="text-right tabular-nums">{form.clientDob}</span>
                {form.clientOccupation && <><span className="text-muted-foreground">Occupation</span><span className="text-right">{form.clientOccupation}</span></>}
                <span className="text-muted-foreground">Pièce d'identité</span><span className="text-right">{form.clientIdType}</span>
                <span className="text-muted-foreground">Numéro</span><span className="text-right">{form.clientIdNumber}</span>
                <span className="text-muted-foreground">Adresse</span><span className="text-right">{form.clientAddress}, {form.clientCity}, {form.clientProvince} {form.clientPostalCode}</span>
              </div>
            </div>
          </div>

          {/* DOT indicators */}
          {form.type === "dot" && form.suspicionIndicators.length > 0 && (
            <div className="rounded-2xl border border-destructive/15 bg-card p-5">
              <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-destructive">
                Indicateurs de soupçon · {form.suspicionIndicators.length}
              </p>
              <ul className="mt-3 space-y-1.5">
                {form.suspicionIndicators.map((ind, i) => (
                  <li key={i} className="flex items-start gap-2 text-[13px]">
                    <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-destructive" />
                    {ind}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {form.observations && (
            <div className="rounded-2xl border border-border bg-card p-5">
              <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">Observations</p>
              <p className="mt-3 text-[13px] leading-relaxed whitespace-pre-wrap">{form.observations}</p>
            </div>
          )}

          <div className="rounded-xl bg-foreground/5 px-4 py-3">
            <p className="text-[12px] text-muted-foreground">
              <span className="font-semibold text-foreground">Échéance :</span>{" "}
              {form.type === "dot" ? `${DOT_DEADLINE_DAYS} jours` : `${DOIMV_DEADLINE_DAYS} jours`}.
              Après validation ici, soumettez sur le portail F2R du CANAFE.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Button
              variant="appOutline" shape="rounded"
              className="h-auto gap-2 rounded-xl px-4 py-3.5 text-[13px] font-bold"
              onClick={() => onSubmit(true)}
            >
              <Save className="h-4 w-4" />
              Brouillon
            </Button>
            <Button
              variant="appSolid" shape="rounded"
              className="h-auto gap-2 rounded-xl px-4 py-3.5 text-[13px] font-bold"
              onClick={() => onSubmit(false)}
            >
              <Send className="h-4 w-4" />
              Soumise
            </Button>
          </div>
        </div>
      )}
    </div>
  );
};

// ──────────────── Declaration Detail ────────────────

const DeclarationDetailView = ({ decl, onBack }: {
  decl: ComplianceDeclaration;
  onBack: () => void;
}) => {
  const days = daysUntil(decl.dueDate);
  const urgent = decl.status === "brouillon" && days <= 5;

  return (
    <div className="space-y-4">
      <div className="flex items-start gap-3">
        <BackButton onClick={onBack} />
        <div>
          <h3 className="font-display text-[17px] font-semibold tracking-tight">Déclaration {decl.id}</h3>
          <p className="mt-0.5 text-[12px] text-muted-foreground">{DECL_TYPE_META[decl.type].full}</p>
        </div>
      </div>

      <div className="rounded-2xl border border-border bg-card divide-y divide-border">
        <div className="flex items-center justify-between px-5 py-3">
          <TypeBadge type={decl.type} />
          <span className={cn("text-[13px] font-semibold", DECL_STATUS_META[decl.status].text)}>
            {DECL_STATUS_META[decl.status].label}
          </span>
        </div>
        <div className="p-5">
          <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-[13px]">
            <span className="text-muted-foreground">Client</span><span className="text-right font-medium">{decl.clientName}</span>
            <span className="text-muted-foreground">Montant</span><span className="text-right font-semibold tabular-nums">{nfCad.format(decl.amount)} $</span>
            <span className="text-muted-foreground">Créée le</span><span className="text-right tabular-nums">{decl.createdAt}</span>
            <span className="text-muted-foreground">Échéance</span>
            <span className={cn("text-right tabular-nums", urgent && "font-semibold text-destructive")}>
              {decl.dueDate} {decl.status === "brouillon" && (days > 0 ? `(${days} j)` : "(Échue)")}
            </span>
            {decl.submittedAt && <><span className="text-muted-foreground">Soumise le</span><span className="text-right tabular-nums">{decl.submittedAt}</span></>}
            {decl.canafRef && <><span className="text-muted-foreground">Réf. CANAFE</span><span className="text-right font-mono text-[12px]">{decl.canafRef}</span></>}
            <span className="text-muted-foreground">Alerte source</span><span className="text-right">{decl.alertId}</span>
          </div>
        </div>
      </div>

      {decl.formData && (
        <>
          <div className="rounded-2xl border border-border bg-card p-5">
            <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">Identification du client</p>
            <div className="mt-3 grid grid-cols-2 gap-x-4 gap-y-2 text-[13px]">
              <span className="text-muted-foreground">Courriel</span><span className="text-right">{decl.formData.clientEmail}</span>
              {decl.formData.clientDob && <><span className="text-muted-foreground">Naissance</span><span className="text-right tabular-nums">{decl.formData.clientDob}</span></>}
              {decl.formData.clientIdType && <><span className="text-muted-foreground">Pièce</span><span className="text-right">{decl.formData.clientIdType} · {decl.formData.clientIdNumber}</span></>}
              {decl.formData.clientAddress && <><span className="text-muted-foreground">Adresse</span><span className="text-right">{decl.formData.clientAddress}, {decl.formData.clientCity}, {decl.formData.clientProvince} {decl.formData.clientPostalCode}</span></>}
              {decl.formData.clientOccupation && <><span className="text-muted-foreground">Occupation</span><span className="text-right">{decl.formData.clientOccupation}</span></>}
            </div>
          </div>

          {decl.formData.suspicionIndicators.length > 0 && (
            <div className="rounded-2xl border border-destructive/15 bg-card p-5">
              <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-destructive">Indicateurs de soupçon</p>
              <ul className="mt-3 space-y-1.5">
                {decl.formData.suspicionIndicators.map((ind, i) => (
                  <li key={i} className="flex items-start gap-2 text-[13px]">
                    <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-destructive" />
                    {ind}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {decl.formData.observations && (
            <div className="rounded-2xl border border-border bg-card p-5">
              <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">Observations</p>
              <p className="mt-3 text-[13px] leading-relaxed whitespace-pre-wrap">{decl.formData.observations}</p>
            </div>
          )}
        </>
      )}

      <p className="px-1 text-[11px] text-muted-foreground">
        Conservez cette déclaration pendant {RECORD_RETENTION_YEARS} ans (LRPCFAT).
      </p>
    </div>
  );
};

// ──────────────── Alertes View ────────────────

const AlertesView = ({ alerts, onPrendreEnCharge, onClasser, onDeclarer }: {
  alerts: ComplianceAlert[];
  onPrendreEnCharge: (id: string) => void;
  onClasser: (id: string) => void;
  onDeclarer: (id: string) => void;
}) => {
  type Filter = "actives" | "traitees";
  const [filter, setFilter] = useState<Filter>("actives");

  const actives = alerts.filter((a) => a.status === "nouveau" || a.status === "en_cours");
  const traitees = alerts.filter((a) => a.status === "declare" || a.status === "classe");

  const TABS = [
    { id: "actives", label: "Actives", count: actives.length },
    { id: "traitees", label: "Traitées", count: traitees.length },
  ];
  const list = filter === "actives" ? actives : traitees;

  return (
    <div className="space-y-4">
      <SubTabs tabs={TABS} active={filter} onChange={(id) => setFilter(id as Filter)} />

      {list.length === 0 ? (
        <div className="flex flex-col items-center rounded-2xl border border-border bg-card py-16 text-center">
          <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-secondary text-muted-foreground">
            <Shield className="h-5 w-5" strokeWidth={1.6} />
          </span>
          <p className="mt-3 text-[13px] text-muted-foreground">
            {filter === "actives" ? "Aucune alerte active — tout est conforme." : "Aucune alerte traitée."}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {list.map((alert) => (
            <div key={alert.id} className="rounded-2xl border border-border bg-card p-4 md:p-5">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="flex items-center gap-2.5">
                  <TypeBadge type={alert.type} />
                  <span className="text-[12px] text-muted-foreground">{alert.id}</span>
                  {alert.orderRef && <span className="text-[12px] text-muted-foreground">· {alert.orderRef}</span>}
                </div>
                <div className="flex items-center gap-2">
                  {alert.assignedTo && (
                    <span className="flex items-center gap-1 rounded-md bg-secondary px-2 py-0.5 text-[11px] font-medium text-muted-foreground">
                      <UserCheck className="h-3 w-3" /> {alert.assignedTo}
                    </span>
                  )}
                  <span className={cn("text-[13px] font-semibold", ALERT_STATUS_META[alert.status].text)}>
                    {ALERT_STATUS_META[alert.status].label}
                  </span>
                </div>
              </div>

              <div className="mt-3 flex items-center gap-2.5">
                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-secondary text-[10px] font-semibold text-foreground/70">
                  {initials(alert.clientName)}
                </span>
                <div className="min-w-0">
                  <p className="text-[13px] font-medium leading-tight">{alert.clientName}</p>
                  <p className="text-[11.5px] leading-tight text-muted-foreground">{alert.clientEmail}</p>
                </div>
                <span className="ml-auto shrink-0 text-[14px] font-semibold tabular-nums">
                  {nfCad.format(alert.amount)} $
                </span>
              </div>

              <p className="mt-3 text-[13px] leading-[1.5] text-muted-foreground">{alert.reason}</p>

              {alert.notes && (
                <p className="mt-2 rounded-lg bg-secondary/50 px-3 py-2 text-[12px] text-muted-foreground">
                  <span className="font-semibold">Note :</span> {alert.notes}
                </p>
              )}

              <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
                <span className="text-[12px] text-muted-foreground">{alert.createdAt}</span>
                {(alert.status === "nouveau" || alert.status === "en_cours") && (
                  <div className="flex flex-wrap gap-2">
                    {alert.status === "nouveau" && (
                      <Button variant="appOutline" shape="rounded" className="h-auto gap-1.5 rounded-[9px] px-3 py-[6px] text-[12px]"
                        onClick={() => onPrendreEnCharge(alert.id)}>
                        <UserCheck className="h-[13px] w-[13px]" /> Prendre en charge
                      </Button>
                    )}
                    <Button variant="appOutline" shape="rounded" className="h-auto gap-1 rounded-[9px] px-3 py-[6px] text-[12px]"
                      onClick={() => onClasser(alert.id)}>
                      Classer sans suite
                    </Button>
                    <Button variant="appSolid" shape="rounded" className="h-auto gap-1.5 rounded-[9px] px-3 py-[6px] text-[12px] font-bold"
                      onClick={() => onDeclarer(alert.id)}>
                      <FileText className="h-[13px] w-[13px]" /> Déclarer
                    </Button>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

// ──────────────── Déclarations View ────────────────

const DeclarationsView = ({ declarations, onOpen }: {
  declarations: ComplianceDeclaration[];
  onOpen: (id: string) => void;
}) => {
  type Filter = "en_cours" | "terminees";
  const [filter, setFilter] = useState<Filter>("en_cours");

  const enCours = declarations.filter((d) => d.status === "brouillon" || d.status === "soumise");
  const terminees = declarations.filter((d) => d.status === "acceptee" || d.status === "rejetee");

  const TABS = [
    { id: "en_cours", label: "En cours", count: enCours.length },
    { id: "terminees", label: "Terminées", count: terminees.length },
  ];
  const list = filter === "en_cours" ? enCours : terminees;
  const cols = "grid grid-cols-[1fr_auto] md:grid-cols-[1.2fr_0.6fr_0.6fr_0.7fr_0.6fr] items-center gap-3";

  return (
    <div className="space-y-4">
      <SubTabs tabs={TABS} active={filter} onChange={(id) => setFilter(id as Filter)} />

      <div className="overflow-hidden rounded-2xl border border-border bg-card">
        <div className={cn(cols, "hidden border-b border-border px-4 py-2.5 md:grid")}>
          {["Déclaration", "Type", "Montant", "Échéance", "Statut"].map((h) => (
            <span key={h} className="text-[10.5px] font-semibold uppercase tracking-[0.07em] text-muted-foreground">{h}</span>
          ))}
        </div>

        {list.map((d, i) => {
          const days = daysUntil(d.dueDate);
          const urgent = d.status === "brouillon" && days <= 5;
          return (
            <button
              key={d.id}
              onClick={() => onOpen(d.id)}
              className={cn(cols, "w-full px-4 py-3 text-left transition-colors hover:bg-secondary/30", i < list.length - 1 && "border-b border-border")}
            >
              <div className="min-w-0">
                <p className="text-[13px] font-medium">{d.id}</p>
                <p className="truncate text-[11.5px] text-muted-foreground">{d.clientName}</p>
                {d.canafRef && <p className="mt-0.5 truncate text-[11px] font-mono text-muted-foreground">{d.canafRef}</p>}
              </div>
              <span className="hidden md:block"><TypeBadge type={d.type} /></span>
              <span className="hidden tabular-nums text-[13px] md:block">{nfCad.format(d.amount)} $</span>
              <span className={cn("hidden text-[12.5px] md:block", urgent ? "font-semibold text-destructive" : "text-muted-foreground")}>
                {d.status === "brouillon" ? (days > 0 ? `${days} j restants` : "Échue") : d.submittedAt ?? d.dueDate}
              </span>
              <span className={cn("text-[13px] font-semibold", DECL_STATUS_META[d.status].text)}>
                {DECL_STATUS_META[d.status].label}
              </span>
            </button>
          );
        })}

        {list.length === 0 && (
          <div className="flex flex-col items-center py-16 text-center">
            <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-secondary text-muted-foreground">
              <FileText className="h-5 w-5" strokeWidth={1.6} />
            </span>
            <p className="mt-3 text-[13px] text-muted-foreground">Aucune déclaration ici.</p>
          </div>
        )}
      </div>

      <p className="px-1 text-[12px] text-muted-foreground">
        DOIMV : {DOIMV_DEADLINE_DAYS} jours · DOT : {DOT_DEADLINE_DAYS} jours (3 j terrorisme) · Conservation : {RECORD_RETENTION_YEARS} ans.
      </p>
    </div>
  );
};

// ──────────────── Dossiers View ────────────────

const DossiersView = () => {
  const total = RECORD_CATEGORIES.reduce((s, c) => s + c.count, 0);
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <SummaryCard label="Total dossiers" value={String(total)} sub="Toutes catégories" />
        <SummaryCard label="Conservation" value={`${RECORD_RETENTION_YEARS} ans`} sub="Obligation LRPCFAT" />
        <SummaryCard label="Plus ancien" value="Juin 2026" sub="Destruction en juin 2031" />
        <SummaryCard label="Prochaine purge" value="Aucune" sub="Aucun dossier à détruire" />
      </div>
      <div>
        <p className="mb-2.5 px-1 text-[11px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">Catégories de dossiers</p>
        <div className="divide-y divide-border overflow-hidden rounded-2xl border border-border bg-card">
          {RECORD_CATEGORIES.map((cat) => (
            <div key={cat.id} className="flex items-center justify-between gap-4 px-5 py-4">
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <p className="text-[13px] font-medium">{cat.label}</p>
                  <span className="rounded-full bg-secondary px-1.5 py-px text-[11px] font-semibold text-muted-foreground">{cat.count}</span>
                </div>
                <p className="mt-0.5 text-[12px] text-muted-foreground">{cat.description}</p>
              </div>
              <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground/50" />
            </div>
          ))}
        </div>
      </div>
      <p className="px-1 text-[12px] text-muted-foreground">
        Conservation {RECORD_RETENTION_YEARS} ans (LRPCFAT). Suppression manuelle uniquement.
      </p>
    </div>
  );
};

// ──────────────── Programme View ────────────────

const ProgrammeView = ({ checklist, onToggle }: { checklist: ChecklistItem[]; onToggle: (id: string) => void }) => {
  const total = checklist.length;
  const done = checklist.filter((c) => c.done).length;
  const pct = total > 0 ? Math.round((done / total) * 100) : 0;

  const grouped = CHECKLIST_CATEGORIES.map((cat) => ({
    category: cat,
    items: checklist.filter((c) => c.category === cat),
  }));

  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-border bg-card px-5 py-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-[11px] font-medium uppercase tracking-[0.12em] text-muted-foreground">Progression du programme</p>
            <p className="mt-1.5 font-display text-[24px] font-light leading-none tracking-tight">{pct} %</p>
          </div>
          <p className="text-[13px] text-muted-foreground">{done} / {total}</p>
        </div>
        <div className="mt-3 h-2 overflow-hidden rounded-full bg-secondary">
          <div className="h-full rounded-full bg-foreground transition-all" style={{ width: `${pct}%` }} />
        </div>
      </div>

      {grouped.map(({ category, items }) => {
        const catDone = items.filter((i) => i.done).length;
        return (
          <div key={category}>
            <div className="mb-2.5 flex items-center justify-between px-1">
              <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">{category}</p>
              <span className="text-[11px] text-muted-foreground">{catDone} / {items.length}</span>
            </div>
            <div className="divide-y divide-border overflow-hidden rounded-2xl border border-border bg-card">
              {items.map((item) => (
                <div key={item.id} className="flex items-start gap-3 px-5 py-4">
                  <button
                    onClick={() => onToggle(item.id)}
                    className={cn(
                      "mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-md border-2 transition-colors",
                      item.done ? "border-foreground bg-foreground text-background" : "border-border hover:border-foreground/40",
                    )}
                    aria-label={item.done ? "Décocher" : "Cocher"}
                  >
                    {item.done && <Check className="h-3 w-3" strokeWidth={3} />}
                  </button>
                  <div className="min-w-0 flex-1">
                    <p className={cn("text-[13px] font-medium", item.done && "text-muted-foreground line-through")}>{item.label}</p>
                    <p className="mt-0.5 text-[12px] leading-[1.5] text-muted-foreground">{item.description}</p>
                    {(item.frequency || item.dueDate) && (
                      <div className="mt-1.5 flex flex-wrap gap-3">
                        {item.frequency && (
                          <span className="inline-flex items-center gap-1 text-[11px] text-muted-foreground">
                            <Clock className="h-3 w-3" /> {item.frequency}
                          </span>
                        )}
                        {item.dueDate && (
                          <span className={cn("text-[11px]", !item.done && daysUntil(item.dueDate) <= 60 ? "font-semibold text-foreground" : "text-muted-foreground")}>
                            Échéance : {item.dueDate}
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        );
      })}

      <p className="px-1 text-[12px] text-muted-foreground">
        Examen indépendant requis au moins tous les deux ans (LRPCFAT / RRPCFAT).
      </p>
    </div>
  );
};

// ──────────────── Main Panel ────────────────

type ComplianceTab = "alertes" | "declarations" | "dossiers" | "programme";
type PanelView = "main" | "classer" | "declarer" | "decl-detail";

const CompliancePanel = ({ orders }: { orders: AdminOrder[] }) => {
  const [view, setView] = useState<PanelView>("main");
  const [tab, setTab] = useState<ComplianceTab>("alertes");
  const [alerts, setAlerts] = useState(SEED_ALERTS);
  const [declarations, setDeclarations] = useState(SEED_DECLARATIONS);
  const [checklist, setChecklist] = useState(SEED_CHECKLIST);
  const [selectedAlertId, setSelectedAlertId] = useState<string | null>(null);
  const [selectedDeclId, setSelectedDeclId] = useState<string | null>(null);
  const [declForm, setDeclForm] = useState<DeclarationFormData | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  useEffect(() => {
    if (!successMsg) return;
    const t = setTimeout(() => setSuccessMsg(null), 4000);
    return () => clearTimeout(t);
  }, [successMsg]);

  const allAlerts = useMemo(() => {
    const auto = autoFlagOrders(orders);
    const existingRefs = new Set(alerts.map((a) => a.orderRef).filter(Boolean));
    return [...alerts, ...auto.filter((a) => !existingRefs.has(a.orderRef))];
  }, [alerts, orders]);

  const activeAlerts = allAlerts.filter((a) => a.status === "nouveau" || a.status === "en_cours").length;
  const pendingDecl = declarations.filter((d) => d.status === "brouillon" || d.status === "soumise").length;
  const checklistDone = checklist.filter((c) => c.done).length;

  const nextDeadline = useMemo(() => {
    const pending = declarations.filter((d) => d.status === "brouillon");
    if (pending.length === 0) return null;
    return [...pending].sort((a, b) => a.dueDate.localeCompare(b.dueDate))[0];
  }, [declarations]);

  const updateAlert = (id: string, changes: Partial<ComplianceAlert>) => {
    setAlerts((prev) => {
      const exists = prev.some((a) => a.id === id);
      if (exists) return prev.map((a) => (a.id === id ? { ...a, ...changes } : a));
      const auto = allAlerts.find((a) => a.id === id);
      if (auto) return [...prev, { ...auto, ...changes }];
      return prev;
    });
  };

  const goBack = () => { setView("main"); setSelectedAlertId(null); setSelectedDeclId(null); setDeclForm(null); };

  const prendreEnCharge = (id: string) => {
    const previous = allAlerts.find((a) => a.id === id) ?? null;
    updateAlert(id, { status: "en_cours", assignedTo: CURRENT_OPERATOR });
    setSuccessMsg("Alerte prise en charge — vous en êtes responsable.");
    void logAdminAction({
      action: "compliance.take_charge",
      entityKind: "compliance_case",
      entityId: /^[0-9a-f-]{36}$/i.test(id) ? id : null,
      before: previous ? { status: previous.status, assignedTo: previous.assignedTo ?? null } : null,
      after: { status: "en_cours", assignedTo: CURRENT_OPERATOR },
      metadata: { alert_ref: id, alert_type: previous?.type ?? null, client_email: previous?.clientEmail ?? null },
    });
  };

  const openClasser = (id: string) => { setSelectedAlertId(id); setView("classer"); };

  const submitClasser = (reason: string, notes: string) => {
    if (!selectedAlertId) return;
    const previous = allAlerts.find((a) => a.id === selectedAlertId) ?? null;
    updateAlert(selectedAlertId, { status: "classe", notes: `Classée : ${reason}\n${notes}` });
    void logAdminAction({
      action: "compliance.classify",
      entityKind: "compliance_case",
      entityId: /^[0-9a-f-]{36}$/i.test(selectedAlertId) ? selectedAlertId : null,
      before: previous ? { status: previous.status } : null,
      after: { status: "classe" },
      metadata: { alert_ref: selectedAlertId, reason, notes: notes || null, alert_type: previous?.type ?? null },
    });
    goBack(); setTab("alertes");
    setSuccessMsg("Alerte classée sans suite.");
  };

  const openDeclarer = (id: string) => {
    const a = allAlerts.find((x) => x.id === id);
    if (!a) return;
    setSelectedAlertId(id); setDeclForm(initialDeclarationForm(a)); setView("declarer");
  };

  const submitDeclaration = (asBrouillon: boolean) => {
    if (!selectedAlertId || !declForm) return;
    const now = new Date();
    const deadlineDays = declForm.type === "dot" ? DOT_DEADLINE_DAYS : DOIMV_DEADLINE_DAYS;
    const dueDate = new Date(now); dueDate.setDate(dueDate.getDate() + deadlineDays);

    const newDecl: ComplianceDeclaration = {
      id: `DC-${String(declarations.length + 1).padStart(3, "0")}`,
      type: declForm.type, alertId: selectedAlertId, clientName: declForm.clientName,
      amount: Number(declForm.amountCad) || 0,
      createdAt: now.toISOString().split("T")[0],
      dueDate: dueDate.toISOString().split("T")[0],
      status: asBrouillon ? "brouillon" : "soumise",
      submittedAt: asBrouillon ? undefined : now.toISOString().split("T")[0],
      formData: declForm,
    };
    setDeclarations((prev) => [newDecl, ...prev]);
    if (!asBrouillon) updateAlert(selectedAlertId, { status: "declare" });
    void logAdminAction({
      action: asBrouillon ? "compliance.declaration_draft" : "compliance.declaration_submit",
      entityKind: "compliance_declaration",
      entityId: null,
      after: {
        declaration_id: newDecl.id, type: newDecl.type, alertId: newDecl.alertId,
        amount: newDecl.amount, dueDate: newDecl.dueDate, status: newDecl.status,
      },
      metadata: {
        alert_ref: selectedAlertId,
        client_name: newDecl.clientName,
        submitted_at: newDecl.submittedAt ?? null,
      },
    });
    goBack(); setTab("declarations");
    setSuccessMsg(asBrouillon ? "Brouillon enregistré." : "Déclaration marquée comme soumise — rendez-vous sur le portail F2R.");
  };

  const openDeclDetail = (id: string) => { setSelectedDeclId(id); setView("decl-detail"); };
  const toggleChecklist = (id: string) => { setChecklist((prev) => prev.map((c) => (c.id === id ? { ...c, done: !c.done } : c))); };

  const TABS = [
    { id: "alertes", label: "Alertes", count: activeAlerts || undefined },
    { id: "declarations", label: "Déclarations", count: pendingDecl || undefined },
    { id: "dossiers", label: "Dossiers" },
    { id: "programme", label: "Programme" },
  ];

  const selectedAlert = selectedAlertId ? allAlerts.find((a) => a.id === selectedAlertId) : null;
  const selectedDecl = selectedDeclId ? declarations.find((d) => d.id === selectedDeclId) : null;

  return (
    <div className="space-y-4">
      {successMsg && <SuccessBanner message={successMsg} />}

      {view === "classer" && selectedAlert && (
        <ClasserView alert={selectedAlert} onSubmit={submitClasser} onBack={goBack} />
      )}
      {view === "declarer" && selectedAlert && declForm && (
        <DeclarationWorkflow alert={selectedAlert} form={declForm} onChange={setDeclForm} onSubmit={submitDeclaration} onBack={goBack} />
      )}
      {view === "decl-detail" && selectedDecl && (
        <DeclarationDetailView decl={selectedDecl} onBack={goBack} />
      )}

      {view === "main" && (
        <>
          {/* Héro — alertes de conformité en cours */}
          <div className="lg:max-w-[620px]">
            <AdminHero
              eyebrow="Conformité CANAFE"
              value={activeAlerts}
              unit={activeAlerts > 1 ? "alertes actives" : "alerte active"}
              stats={[
                {
                  label: "Déclarations",
                  value: pendingDecl,
                  hint: nextDeadline ? `échéance ${daysUntil(nextDeadline.dueDate)} j` : undefined,
                },
                { label: "Seuil DOIMV", value: nfCad.format(DOIMV_THRESHOLD), hint: "CAD" },
                {
                  label: "Programme",
                  value: `${checklist.length > 0 ? Math.round((checklistDone / checklist.length) * 100) : 0} %`,
                  hint: `${checklistDone}/${checklist.length}`,
                },
              ]}
            />
          </div>

          <SubTabs tabs={TABS} active={tab} onChange={(id) => setTab(id as ComplianceTab)} />

          {tab === "alertes" && <AlertesView alerts={allAlerts} onPrendreEnCharge={prendreEnCharge} onClasser={openClasser} onDeclarer={openDeclarer} />}
          {tab === "declarations" && <DeclarationsView declarations={declarations} onOpen={openDeclDetail} />}
          {tab === "dossiers" && <DossiersView />}
          {tab === "programme" && <ProgrammeView checklist={checklist} onToggle={toggleChecklist} />}
        </>
      )}
    </div>
  );
};

export default CompliancePanel;
