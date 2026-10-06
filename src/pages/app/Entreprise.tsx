import { useEffect, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  AlertCircle, ArrowLeft, Building2, Check, ChevronRight, CircleCheck, Clock, FileText,
  Lock, Plus, ShieldCheck, Trash2, Upload, Users, X,
} from "lucide-react";
import AppShell from "@/components/app/AppShell";
import { Button } from "@/components/ui/button";
import { getMyProfile, type MyProfile } from "@/lib/profile";
import { getMyKyc, type KycDbStatus } from "@/lib/kyc";
import {
  getMyKyb, submitKyb, KYB_ACCEPT, KYB_DOCS, KYB_MAX_FILE,
  type BusinessInfo, type BusinessOwner, type KybDocKey, type KybStatus, type MyKyb, type OwnerRole,
} from "@/lib/kyb";
import { useT } from "@/lib/i18n";
import { cn } from "@/lib/utils";
import { KYB_PREVIEW_USERS, VERIFICATION_ENABLED } from "@/lib/config";
import { useAuth } from "@/lib/auth";
import type { TKey } from "@/lib/translations";

type Step = "intro" | "info" | "people" | "docs" | "review" | "submitting" | "done";
const WIZARD: Step[] = ["info", "people", "docs", "review"];

const STATUS_META: Record<KybStatus, { icon: React.ElementType; titleKey: TKey; subKey: TKey; tone: string; bg: string }> = {
  not_started: { icon: Building2, titleKey: "kyb.stNone", subKey: "kyb.stNoneSub", tone: "text-muted-foreground", bg: "bg-secondary" },
  pending: { icon: Clock, titleKey: "kyb.stPending", subKey: "kyb.stPendingSub", tone: "text-foreground", bg: "bg-secondary" },
  approved: { icon: CircleCheck, titleKey: "kyb.stApproved", subKey: "kyb.stApprovedSub", tone: "text-primary", bg: "bg-primary/10" },
  rejected: { icon: AlertCircle, titleKey: "kyb.stRejected", subKey: "kyb.stRejectedSub", tone: "text-destructive", bg: "bg-destructive/10" },
};

const JURISDICTIONS: TKey[] = ["kyb.jurQc", "kyb.jurFed", "kyb.jurOn", "kyb.jurBc", "kyb.jurAb", "kyb.jurOther", "kyb.jurAbroad"];
const ROLE_KEYS: Record<OwnerRole, TKey> = { director: "kyb.roleDirector", owner: "kyb.roleOwner", both: "kyb.roleBoth" };
const DOC_KEYS: Record<KybDocKey, { title: TKey; sub: TKey }> = {
  incorporation: { title: "kyb.docIncorp", sub: "kyb.docIncorpSub" },
  registry: { title: "kyb.docRegistry", sub: "kyb.docRegistrySub" },
  address_proof: { title: "kyb.docAddress", sub: "kyb.docAddressSub" },
};

const inputCls =
  "w-full rounded-xl border border-border bg-card px-4 py-3 text-[15px] outline-none transition-colors placeholder:text-muted-foreground/50 focus-visible:border-foreground/50";

const Field = ({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) => (
  <label className="block">
    <span className="mb-1.5 block px-0.5 text-[12.5px] font-medium text-muted-foreground">{label}</span>
    {children}
    {hint && <span className="mt-1.5 block px-0.5 text-[11.5px] leading-relaxed text-muted-foreground/70">{hint}</span>}
  </label>
);

const emptyOwner = (): BusinessOwner => ({ name: "", role: "both", ownership: 100, birthDate: "", country: "Canada" });

const Entreprise = () => {
  const navigate = useNavigate();
  const t = useT();
  const { user } = useAuth();
  const kybOpen = VERIFICATION_ENABLED || (!!user && KYB_PREVIEW_USERS.includes(user.id));
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<MyProfile | null>(null);
  const [kyb, setKyb] = useState<MyKyb | null>(null);
  const [kyc, setKyc] = useState<KycDbStatus>("not_started");
  const [step, setStep] = useState<Step>("intro");
  const [info, setInfo] = useState<BusinessInfo>({ legalName: "", businessNumber: "", jurisdiction: "", address: "", phone: "", activity: "", website: "" });
  const [owners, setOwners] = useState<BusinessOwner[]>([emptyOwner()]);
  const [files, setFiles] = useState<Partial<Record<KybDocKey, File>>>({});
  const [attest, setAttest] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([getMyProfile(), getMyKyb(), getMyKyc()]).then(([p, k, c]) => {
      setProfile(p);
      setKyb(k);
      setKyc(c?.status ?? "not_started");
      // Pré-remplissage : dernier dossier (renvoi après refus) sinon l'inscription.
      if (k) {
        setInfo(k.info);
        if (k.owners.length) setOwners(k.owners);
      } else if (p) {
        setInfo((i) => ({
          ...i,
          legalName: p.businessName ?? "",
          businessNumber: p.businessNumber ?? "",
          address: p.businessAddress ?? "",
          phone: p.businessPhone ?? "",
        }));
        if (p.fullName) setOwners([{ ...emptyOwner(), name: p.fullName }]);
      }
      setLoading(false);
    });
  }, []);

  const status: KybStatus = kyb?.status ?? "not_started";
  const set = (k: keyof BusinessInfo) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) =>
    setInfo((i) => ({ ...i, [k]: e.target.value }));
  const setOwner = (idx: number, patch: Partial<BusinessOwner>) =>
    setOwners((os) => os.map((o, i) => (i === idx ? { ...o, ...patch } : o)));

  /* ─── Validation par étape ─── */
  const infoError = (): TKey | null => {
    if (!info.legalName.trim()) return "kyb.errLegalName";
    if (!info.jurisdiction) return "kyb.errJurisdiction";
    if (!info.address.trim()) return "kyb.errAddress";
    if (info.activity.trim().length < 3) return "kyb.errActivity";
    return null;
  };
  const peopleError = (): TKey | null => {
    if (owners.length === 0) return "kyb.errNoPeople";
    for (const o of owners) {
      if (!o.name.trim() || !o.birthDate || !o.country.trim()) return "kyb.errPersonIncomplete";
      if (o.role !== "director" && (o.ownership < 25 || o.ownership > 100)) return "kyb.errOwnership";
    }
    if (owners.reduce((s, o) => s + (o.role === "director" ? 0 : Number(o.ownership) || 0), 0) > 100) return "kyb.errOwnershipSum";
    return null;
  };
  const docsError = (): TKey | null => (KYB_DOCS.some((d) => d.required && !files[d.key]) ? "kyb.errDocs" : null);

  const next = () => {
    const err = step === "info" ? infoError() : step === "people" ? peopleError() : step === "docs" ? docsError() : null;
    if (err) { setError(t(err)); return; }
    setError(null);
    const i = WIZARD.indexOf(step);
    if (i >= 0 && i < WIZARD.length - 1) setStep(WIZARD[i + 1]);
  };
  const back = () => {
    setError(null);
    const i = WIZARD.indexOf(step);
    if (i > 0) setStep(WIZARD[i - 1]);
    else if (i === 0) setStep("intro");
    else navigate("/app/compte");
  };

  const submit = async () => {
    if (!attest) { setError(t("kyb.errAttest")); return; }
    setStep("submitting");
    setError(null);
    const res = await submitKyb(info, owners, files);
    if (res.error) { setError(res.error); setStep("review"); return; }
    setKyb(await getMyKyb());
    setStep("done");
  };

  const header = (
    <div className="flex items-start gap-3">
      <button
        type="button"
        onClick={step === "intro" || step === "done" ? () => navigate("/app/compte") : back}
        aria-label={t("misc.back")}
        className="mt-0.5 flex h-[38px] w-[38px] shrink-0 items-center justify-center rounded-full bg-secondary text-foreground transition-colors hover:bg-secondary/70 active:scale-95"
      >
        <ArrowLeft className="h-[18px] w-[18px]" />
      </button>
      <div>
        <h1 className="font-display text-[22px] font-semibold tracking-tight">{t("kyb.title")}</h1>
        <p className="mt-1 text-[13px] text-muted-foreground">{t("kyb.sub")}</p>
      </div>
    </div>
  );

  if (loading) {
    return (
      <AppShell header={header}>
        <div className="rounded-2xl border border-border bg-card py-12 text-center text-[13px] text-muted-foreground">{t("kyc.loading")}</div>
      </AppShell>
    );
  }

  if (profile && profile.accountType !== "business") {
    return (
      <AppShell header={header}>
        <div className="rounded-2xl border border-border bg-card px-5 py-8 text-center">
          <p className="text-[14px] text-muted-foreground">{t("kyb.notBusiness")}</p>
          <Link to="/app/verification" className="mt-4 inline-flex items-center gap-1.5 text-[13px] font-semibold text-foreground hover:underline">
            {t("kyb.goKyc")} <ChevronRight className="h-4 w-4" />
          </Link>
        </div>
      </AppShell>
    );
  }

  /* ─── Envoyé ─── */
  if (step === "done") {
    return (
      <AppShell header={header}>
        <div className="flex flex-col items-center pb-2 pt-6 text-center">
          <span className="flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
            <Check className="h-7 w-7 text-primary" strokeWidth={2} />
          </span>
          <h2 className="mt-5 font-display text-[22px] font-semibold tracking-tight">{t("kyb.doneTitle")}</h2>
          <p className="mt-2 max-w-[340px] text-[14px] leading-relaxed text-muted-foreground">{t("kyb.doneSub")}</p>
          {kyc !== "approved" && <RepresentativeCard kyc={kyc} t={t} className="mt-6 w-full text-left" />}
          <div className="mt-6 w-full">
            <Button variant="appSolid" shape="rounded" size="lg" className="w-full" onClick={() => navigate("/app")}>
              {t("kyb.backHome")}
            </Button>
          </div>
        </div>
      </AppShell>
    );
  }

  /* ─── Accueil : statut et ce qu'il faut préparer ─── */
  if (step === "intro") {
    const m = STATUS_META[status];
    const canStart = status === "not_started" || status === "rejected";
    return (
      <AppShell header={header}>
        <div className="flex flex-col items-center pb-2 pt-2 text-center">
          <span className={cn("flex h-16 w-16 items-center justify-center rounded-2xl", m.bg, m.tone)}>
            <m.icon className="h-7 w-7" strokeWidth={1.6} />
          </span>
          <h2 className="mt-4 font-display text-[22px] font-semibold tracking-tight">{t(m.titleKey)}</h2>
          <p className="mt-1.5 max-w-[360px] text-[14px] leading-relaxed text-muted-foreground">{t(m.subKey)}</p>
        </div>

        {status === "rejected" && kyb?.reviewNote && (
          <div className="mt-4 rounded-xl border border-destructive/30 bg-destructive/10 px-4 py-3">
            <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-destructive">{t("kyb.reviewNote")}</p>
            <p className="mt-1 whitespace-pre-wrap text-[13.5px] leading-relaxed text-destructive">{kyb.reviewNote}</p>
          </div>
        )}

        {status === "approved" && kyb && (
          <div className="mt-5 divide-y divide-border overflow-hidden rounded-2xl border border-border bg-card">
            <SummaryRow label={t("kyb.legalName")} value={kyb.info.legalName} />
            {kyb.info.businessNumber && <SummaryRow label={t("kyb.number")} value={kyb.info.businessNumber} mono />}
            <SummaryRow label={t("kyb.people")} value={String(kyb.owners.length)} />
          </div>
        )}

        {kyc !== "approved" && <RepresentativeCard kyc={kyc} t={t} className="mt-5" />}

        {canStart && (
          <>
            <div className="my-5 h-px bg-border" />
            <p className="mb-4 text-[11px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">{t("kyb.prepare")}</p>
            <ul className="space-y-4">
              {([
                { icon: Building2, key: "kyb.prep1" },
                { icon: Users, key: "kyb.prep2" },
                { icon: FileText, key: "kyb.prep3" },
              ] as { icon: React.ElementType; key: TKey }[]).map((c) => (
                <li key={c.key} className="flex items-start gap-3">
                  <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-secondary text-foreground/70">
                    <c.icon className="h-4 w-4" strokeWidth={1.8} />
                  </span>
                  <span className="text-[13.5px] leading-relaxed text-muted-foreground">{t(c.key)}</span>
                </li>
              ))}
            </ul>
            <div className="mt-6 flex items-start gap-2.5">
              <Lock className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground/50" strokeWidth={1.9} />
              <p className="text-[12px] leading-relaxed text-muted-foreground/70">{t("kyb.privacy")}</p>
            </div>
            <div className="mt-6 flex justify-end">
              <Button variant="appSolid" shape="rounded" className="gap-2 px-5 text-[13px]" disabled={!kybOpen} onClick={() => setStep("info")}>
                {status === "rejected" ? t("kyb.resubmit") : t("kyb.start")} <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </>
        )}
      </AppShell>
    );
  }

  /* ─── Assistant ─── */
  const idx = WIZARD.indexOf(step === "submitting" ? "review" : step);
  return (
    <AppShell header={header}>
      <div className="mb-5 flex items-center gap-1.5 px-1">
        {WIZARD.map((s, i) => (
          <div key={s} className={cn("h-[3px] flex-1 rounded-full transition-colors", i <= idx ? "bg-foreground" : "bg-border")} />
        ))}
      </div>

      {step === "info" && (
        <div className="space-y-4">
          <StepTitle title={t("kyb.infoTitle")} sub={t("kyb.infoSub")} />
          <Field label={t("kyb.legalName")}>
            <input className={inputCls} value={info.legalName} onChange={set("legalName")} maxLength={200} autoComplete="organization" />
          </Field>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label={t("kyb.jurisdiction")}>
              <select className={inputCls} value={info.jurisdiction} onChange={set("jurisdiction")}>
                <option value="" disabled>{t("kyb.choose")}</option>
                {JURISDICTIONS.map((k) => <option key={k} value={t(k)}>{t(k)}</option>)}
              </select>
            </Field>
            <Field label={t("kyb.number")} hint={t("kyb.numberHint")}>
              <input className={inputCls} value={info.businessNumber} onChange={set("businessNumber")} maxLength={60} />
            </Field>
          </div>
          <Field label={t("kyb.address")}>
            <input className={inputCls} value={info.address} onChange={set("address")} maxLength={300} autoComplete="street-address" />
          </Field>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label={t("kyb.phone")}>
              <input className={inputCls} type="tel" value={info.phone} onChange={set("phone")} maxLength={40} autoComplete="tel" />
            </Field>
            <Field label={t("kyb.website")}>
              <input className={inputCls} value={info.website} onChange={set("website")} maxLength={200} placeholder="https://" />
            </Field>
          </div>
          <Field label={t("kyb.activity")} hint={t("kyb.activityHint")}>
            <textarea className={cn(inputCls, "resize-none")} rows={3} value={info.activity} onChange={set("activity")} maxLength={500} />
          </Field>
        </div>
      )}

      {step === "people" && (
        <div>
          <StepTitle title={t("kyb.peopleTitle")} sub={t("kyb.peopleSub")} />
          <div className="mt-4 space-y-3">
            {owners.map((o, i) => (
              <div key={i} className="rounded-2xl border border-border bg-card p-4">
                <div className="mb-3 flex items-center justify-between">
                  <span className="text-[12px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">
                    {t("kyb.person")} {i + 1}
                  </span>
                  {owners.length > 1 && (
                    <button
                      type="button"
                      onClick={() => setOwners((os) => os.filter((_, j) => j !== i))}
                      className="flex items-center gap-1 text-[12px] text-muted-foreground transition-colors hover:text-destructive"
                    >
                      <Trash2 className="h-3.5 w-3.5" /> {t("kyb.remove")}
                    </button>
                  )}
                </div>
                <div className="space-y-3">
                  <Field label={t("kyb.personName")}>
                    <input className={inputCls} value={o.name} onChange={(e) => setOwner(i, { name: e.target.value })} maxLength={120} />
                  </Field>
                  <div className="grid gap-3 sm:grid-cols-2">
                    <Field label={t("kyb.role")}>
                      <select
                        className={inputCls}
                        value={o.role}
                        onChange={(e) => {
                          const role = e.target.value as OwnerRole;
                          setOwner(i, { role, ownership: role === "director" ? 0 : Math.max(25, o.ownership) });
                        }}
                      >
                        {(Object.keys(ROLE_KEYS) as OwnerRole[]).map((r) => <option key={r} value={r}>{t(ROLE_KEYS[r])}</option>)}
                      </select>
                    </Field>
                    {o.role !== "director" && (
                      <Field label={t("kyb.ownership")}>
                        <input
                          className={inputCls}
                          type="number"
                          min={25}
                          max={100}
                          step={1}
                          value={o.ownership}
                          onChange={(e) => setOwner(i, { ownership: Number(e.target.value) })}
                        />
                      </Field>
                    )}
                  </div>
                  <div className="grid gap-3 sm:grid-cols-2">
                    <Field label={t("kyb.birthDate")}>
                      <input className={inputCls} type="date" value={o.birthDate} max={new Date().toISOString().slice(0, 10)} onChange={(e) => setOwner(i, { birthDate: e.target.value })} />
                    </Field>
                    <Field label={t("kyb.country")}>
                      <input className={inputCls} value={o.country} onChange={(e) => setOwner(i, { country: e.target.value })} maxLength={60} />
                    </Field>
                  </div>
                </div>
              </div>
            ))}
          </div>
          {owners.length < 20 && (
            <button
              type="button"
              onClick={() => setOwners((os) => [...os, { ...emptyOwner(), role: "director", ownership: 0 }])}
              className="mt-3 flex w-full items-center justify-center gap-2 rounded-2xl border border-dashed border-border py-3.5 text-[13px] font-semibold text-muted-foreground transition-colors hover:bg-secondary/40 hover:text-foreground"
            >
              <Plus className="h-4 w-4" /> {t("kyb.addPerson")}
            </button>
          )}
        </div>
      )}

      {step === "docs" && (
        <div>
          <StepTitle title={t("kyb.docsTitle")} sub={t("kyb.docsSub")} />
          <div className="mt-4 space-y-3">
            {KYB_DOCS.map((d) => (
              <DocPicker
                key={d.key}
                title={`${t(DOC_KEYS[d.key].title)}${d.required ? "" : ` · ${t("regb.optional")}`}`}
                sub={t(DOC_KEYS[d.key].sub)}
                file={files[d.key] ?? null}
                onFile={(f) => {
                  if (f.size > KYB_MAX_FILE) { setError(t("kyb.errTooBig")); return; }
                  setError(null);
                  setFiles((fs) => ({ ...fs, [d.key]: f }));
                }}
                onClear={() => setFiles((fs) => { const n = { ...fs }; delete n[d.key]; return n; })}
                t={t}
              />
            ))}
          </div>
        </div>
      )}

      {(step === "review" || step === "submitting") && (
        <div>
          <StepTitle title={t("kyb.reviewTitle")} sub={t("kyb.reviewSub")} />
          <div className="mt-4 divide-y divide-border overflow-hidden rounded-2xl border border-border bg-card">
            <SummaryRow label={t("kyb.legalName")} value={info.legalName} />
            <SummaryRow label={t("kyb.jurisdiction")} value={info.jurisdiction} />
            {info.businessNumber && <SummaryRow label={t("kyb.number")} value={info.businessNumber} mono />}
            <SummaryRow label={t("kyb.address")} value={info.address} />
            <SummaryRow label={t("kyb.activity")} value={info.activity} />
          </div>
          <div className="mt-3 divide-y divide-border overflow-hidden rounded-2xl border border-border bg-card">
            {owners.map((o, i) => (
              <SummaryRow
                key={i}
                label={t(ROLE_KEYS[o.role])}
                value={`${o.name}${o.role !== "director" ? ` · ${o.ownership} %` : ""}`}
              />
            ))}
          </div>
          <div className="mt-3 divide-y divide-border overflow-hidden rounded-2xl border border-border bg-card">
            {KYB_DOCS.filter((d) => files[d.key]).map((d) => (
              <SummaryRow key={d.key} label={t(DOC_KEYS[d.key].title)} value={files[d.key]!.name} />
            ))}
          </div>

          <label className="mt-4 flex cursor-pointer items-start gap-3 rounded-xl border border-border bg-secondary/30 px-4 py-3.5">
            <input type="checkbox" className="mt-0.5 h-4 w-4 shrink-0 accent-foreground" checked={attest} onChange={(e) => setAttest(e.target.checked)} />
            <span className="text-[13px] leading-relaxed text-muted-foreground">{t("kyb.attest")}</span>
          </label>
        </div>
      )}

      {error && (
        <div className="mt-4 flex items-start gap-2.5 rounded-xl border border-destructive/30 bg-destructive/10 px-4 py-3">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-destructive" />
          <p className="text-[13px] text-destructive">{error}</p>
        </div>
      )}

      <div className="mt-5 flex justify-end">
        {step === "review" || step === "submitting" ? (
          <Button variant="appSolid" shape="rounded" size="lg" className="gap-2 px-6" disabled={step === "submitting"} onClick={submit}>
            {step === "submitting" ? (
              <span className="flex items-center gap-2">
                <span className="h-4 w-4 animate-spin rounded-full border-2 border-background/30 border-t-background" />
                {t("kyc.wait")}
              </span>
            ) : (
              <>{t("kyb.submit")} <ShieldCheck className="h-4 w-4" /></>
            )}
          </Button>
        ) : (
          <Button variant="appSolid" shape="rounded" size="lg" className="gap-2 px-6" onClick={next}>
            {t("kyc.next")} <ChevronRight className="h-4 w-4" />
          </Button>
        )}
      </div>
    </AppShell>
  );
};

const StepTitle = ({ title, sub }: { title: string; sub: string }) => (
  <div>
    <p className="text-[15px] font-semibold tracking-tight">{title}</p>
    <p className="mt-1 text-[12.5px] leading-relaxed text-muted-foreground">{sub}</p>
  </div>
);

const SummaryRow = ({ label, value, mono }: { label: string; value: string; mono?: boolean }) => (
  <div className="flex items-start gap-4 px-4 py-3">
    <span className="w-[40%] shrink-0 text-[13px] text-muted-foreground">{label}</span>
    <span className={cn("min-w-0 flex-1 break-words text-right text-[13px] font-medium", mono && "font-mono")}>{value || "—"}</span>
  </div>
);

function RepresentativeCard({ kyc, t, className }: { kyc: KycDbStatus; t: (k: TKey) => string; className?: string }) {
  return (
    <Link
      to="/app/verification"
      className={cn("flex items-start gap-3 rounded-2xl border border-border bg-card px-4 py-3.5 transition-colors hover:bg-secondary/40", className)}
    >
      <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-muted-foreground" strokeWidth={1.7} />
      <div className="min-w-0 flex-1">
        <p className="text-[13.5px] font-semibold">{t("kyb.repTitle")}</p>
        <p className="mt-0.5 text-[12.5px] leading-relaxed text-muted-foreground">
          {kyc === "pending" ? t("kyb.repPending") : t("kyb.repTodo")}
        </p>
      </div>
      <ChevronRight className="mt-0.5 h-[18px] w-[18px] shrink-0 text-muted-foreground" />
    </Link>
  );
}

function DocPicker({
  title, sub, file, onFile, onClear, t,
}: {
  title: string; sub: string; file: File | null;
  onFile: (f: File) => void; onClear: () => void; t: (k: TKey) => string;
}) {
  const ref = useRef<HTMLInputElement>(null);
  return (
    <div className="rounded-2xl border border-border bg-card p-4">
      <p className="text-[14px] font-semibold">{title}</p>
      <p className="mt-0.5 text-[12px] leading-relaxed text-muted-foreground">{sub}</p>
      <input
        ref={ref}
        type="file"
        accept={KYB_ACCEPT}
        className="hidden"
        onChange={(e) => { const f = e.target.files?.[0]; if (f) onFile(f); e.target.value = ""; }}
      />
      {file ? (
        <div className="mt-3 flex items-center gap-3 rounded-xl bg-secondary/50 px-3 py-2.5">
          <FileText className="h-4 w-4 shrink-0 text-muted-foreground" />
          <span className="min-w-0 flex-1 truncate text-[13px]">{file.name}</span>
          <button type="button" onClick={onClear} aria-label={t("kyb.remove")} className="text-muted-foreground transition-colors hover:text-foreground">
            <X className="h-4 w-4" />
          </button>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => ref.current?.click()}
          className="mt-3 flex w-full items-center justify-center gap-2 rounded-xl border border-dashed border-border py-3 text-[13px] font-semibold text-muted-foreground transition-colors hover:bg-secondary/40 hover:text-foreground"
        >
          <Upload className="h-4 w-4" /> {t("kyb.chooseFile")}
        </button>
      )}
    </div>
  );
}

export default Entreprise;
