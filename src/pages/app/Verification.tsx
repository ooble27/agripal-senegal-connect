import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  ArrowLeft, ShieldCheck, Check, Clock, Camera, IdCard, Lock,
  Upload, ChevronRight, User, FileCheck, X,
} from "lucide-react";
import AppShell from "@/components/app/AppShell";
import { Button } from "@/components/ui/button";
import { getMyKyc, type KycDbStatus } from "@/lib/kyc";
import { submitKycDocuments, type DocType } from "@/lib/kycUpload";
import { useT } from "@/lib/i18n";
import { cn } from "@/lib/utils";
import type { TKey } from "@/lib/translations";

const STATUS_META: Record<KycDbStatus, { icon: React.ElementType; titleKey: TKey; subKey: TKey; tone: string }> = {
  not_started: { icon: ShieldCheck, titleKey: "kyc.notVerified", subKey: "kyc.notVerifiedSub", tone: "text-muted-foreground" },
  pending: { icon: Clock, titleKey: "kyc.inReview", subKey: "kyc.inReviewSub", tone: "text-foreground" },
  approved: { icon: Check, titleKey: "kyc.verified", subKey: "kyc.verifiedSub", tone: "text-primary" },
  rejected: { icon: ShieldCheck, titleKey: "kyc.rejectedTitle", subKey: "kyc.rejectedSub", tone: "text-destructive" },
};

const CHECKLIST_KEYS: { icon: React.ElementType; key: TKey }[] = [
  { icon: IdCard, key: "kyc.check1" },
  { icon: Camera, key: "kyc.check2" },
  { icon: User, key: "kyc.check3" },
];

const DOC_TYPES: { id: DocType; labelKey: TKey; icon: React.ElementType; needsBack: boolean }[] = [
  { id: "passport", labelKey: "kyc.docPassport", icon: IdCard, needsBack: false },
  { id: "drivers_license", labelKey: "kyc.docLicense", icon: IdCard, needsBack: true },
  { id: "national_id", labelKey: "kyc.docNationalId", icon: IdCard, needsBack: true },
];

type Step = "intro" | "doc_type" | "id_front" | "id_back" | "selfie" | "review" | "submitting";

function FileDropZone({
  file,
  onFile,
  label,
  icon: Icon,
}: {
  file: File | null;
  onFile: (f: File) => void;
  label: string;
  icon: React.ElementType;
}) {
  const ref = useRef<HTMLInputElement>(null);
  const [dragOver, setDragOver] = useState(false);
  const preview = file ? URL.createObjectURL(file) : null;

  return (
    <div
      className={cn(
        "relative flex flex-col items-center justify-center rounded-2xl border-2 border-dashed p-6 text-center transition-colors cursor-pointer",
        dragOver ? "border-primary bg-primary/5" : file ? "border-primary/40 bg-primary/5" : "border-border bg-secondary/30 hover:border-muted-foreground/40",
      )}
      onClick={() => ref.current?.click()}
      onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
      onDragLeave={() => setDragOver(false)}
      onDrop={(e) => {
        e.preventDefault();
        setDragOver(false);
        const f = e.dataTransfer.files[0];
        if (f?.type.startsWith("image/")) onFile(f);
      }}
    >
      <input
        ref={ref}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) onFile(f);
        }}
      />
      {preview ? (
        <img src={preview} alt="" className="h-40 w-auto rounded-xl object-contain" />
      ) : (
        <>
          <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-secondary text-muted-foreground">
            <Icon className="h-5 w-5" strokeWidth={1.7} />
          </span>
          <p className="mt-3 text-[13px] font-medium text-muted-foreground">{label}</p>
          <p className="mt-1 text-[11px] text-muted-foreground/60">JPG, PNG</p>
        </>
      )}
    </div>
  );
}

const Verification = () => {
  const navigate = useNavigate();
  const t = useT();
  const [status, setStatus] = useState<KycDbStatus | null>(null);
  const [step, setStep] = useState<Step>("intro");
  const [docType, setDocType] = useState<DocType | null>(null);
  const [idFront, setIdFront] = useState<File | null>(null);
  const [idBack, setIdBack] = useState<File | null>(null);
  const [selfie, setSelfie] = useState<File | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const needsBack = DOC_TYPES.find((d) => d.id === docType)?.needsBack ?? false;

  useEffect(() => {
    getMyKyc().then((k) => {
      setStatus(k?.status ?? "not_started");
      setLoading(false);
    });
  }, []);

  const submit = async () => {
    if (!docType || !idFront || !selfie) return;
    setStep("submitting");
    setError(null);
    const res = await submitKycDocuments(docType, {
      idFront,
      idBack: needsBack ? idBack ?? undefined : undefined,
      selfie,
    });
    if (res.error) {
      setError(res.error);
      setStep("review");
      return;
    }
    setStatus("pending");
    setStep("intro");
  };

  const header = (
    <div className="flex items-start gap-3">
      <button
        type="button"
        onClick={() => {
          if (step !== "intro" && step !== "submitting") {
            const prev: Record<string, Step> = {
              doc_type: "intro",
              id_front: "doc_type",
              id_back: "id_front",
              selfie: needsBack ? "id_back" : "id_front",
              review: "selfie",
            };
            setStep(prev[step] ?? "intro");
          } else {
            navigate("/app/compte");
          }
        }}
        aria-label={t("misc.back")}
        className="mt-0.5 flex h-[38px] w-[38px] shrink-0 items-center justify-center rounded-full bg-secondary text-foreground transition-colors hover:bg-secondary/70 active:scale-95"
      >
        <ArrowLeft className="h-[18px] w-[18px]" />
      </button>
      <div>
        <h1 className="font-display text-[22px] font-semibold tracking-tight">{t("kyc.title")}</h1>
        <p className="mt-1 text-[13px] text-muted-foreground">{t("kyc.sub")}</p>
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

  const m = STATUS_META[status ?? "not_started"];
  const verified = status === "approved";
  const inReview = status === "pending";

  if (step === "intro") {
    return (
      <AppShell header={header}>
        <div className="rounded-2xl border border-border bg-card p-6 text-center">
          <span className={`mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-secondary ${m.tone}`}>
            <m.icon className="h-6 w-6" strokeWidth={1.8} />
          </span>
          <h2 className="mt-4 font-display text-[20px] font-semibold tracking-tight">{t(m.titleKey)}</h2>
          <p className="mx-auto mt-1.5 max-w-[360px] text-[14px] leading-relaxed text-muted-foreground">{t(m.subKey)}</p>
        </div>

        {!verified && (
          <>
            <div className="mt-4 rounded-2xl border border-border bg-card p-5">
              <p className="mb-3 text-[11px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">
                {t("kyc.before")}
              </p>
              <ul className="space-y-3.5">
                {CHECKLIST_KEYS.map((c) => (
                  <li key={c.key} className="flex items-start gap-3">
                    <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-secondary text-foreground/70">
                      <c.icon className="h-4 w-4" strokeWidth={1.8} />
                    </span>
                    <span className="text-[13.5px] leading-relaxed text-muted-foreground">{t(c.key)}</span>
                  </li>
                ))}
              </ul>
            </div>

            <div className="mt-4 flex items-start gap-2.5 rounded-xl border border-border bg-secondary/30 px-4 py-3">
              <Lock className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" strokeWidth={1.9} />
              <p className="text-[12.5px] leading-relaxed text-muted-foreground">{t("kyc.privacy")}</p>
            </div>

            <div className="mt-6 flex justify-end">
              <Button
                variant="appSolid"
                shape="rounded"
                size="lg"
                className="gap-2 px-6"
                onClick={() => setStep("doc_type")}
              >
                {inReview ? t("kyc.resume") : t("kyc.start")}
                <ShieldCheck className="h-4 w-4" />
              </Button>
            </div>
          </>
        )}
      </AppShell>
    );
  }

  if (step === "doc_type") {
    return (
      <AppShell header={header}>
        <div className="rounded-2xl border border-border bg-card p-5">
          <p className="mb-4 text-[11px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">
            {t("kyc.chooseDoc")}
          </p>
          <div className="space-y-2">
            {DOC_TYPES.map((d) => (
              <button
                key={d.id}
                type="button"
                className={cn(
                  "flex w-full items-center gap-3 rounded-xl border px-4 py-3.5 text-left transition-colors",
                  docType === d.id
                    ? "border-primary bg-primary/5"
                    : "border-border hover:bg-secondary/40",
                )}
                onClick={() => {
                  setDocType(d.id);
                  setIdFront(null);
                  setIdBack(null);
                }}
              >
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-secondary text-foreground/70">
                  <d.icon className="h-4 w-4" strokeWidth={1.7} />
                </span>
                <span className="flex-1 text-[14px] font-medium">{t(d.labelKey)}</span>
                {docType === d.id && <Check className="h-4 w-4 text-primary" />}
              </button>
            ))}
          </div>
        </div>
        <div className="mt-5 flex justify-end">
          <Button
            variant="appSolid"
            shape="rounded"
            size="lg"
            className="gap-2 px-6"
            disabled={!docType}
            onClick={() => setStep("id_front")}
          >
            {t("kyc.next")} <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </AppShell>
    );
  }

  if (step === "id_front") {
    return (
      <AppShell header={header}>
        <ProgressDots current={0} total={needsBack ? 3 : 2} />
        <div className="mt-4 rounded-2xl border border-border bg-card p-5">
          <p className="mb-1 text-[15px] font-semibold">{t("kyc.photoFront")}</p>
          <p className="mb-4 text-[12.5px] text-muted-foreground">{t("kyc.photoFrontSub")}</p>
          <FileDropZone file={idFront} onFile={setIdFront} label={t("kyc.tapUpload")} icon={Upload} />
        </div>
        <div className="mt-5 flex justify-end">
          <Button
            variant="appSolid"
            shape="rounded"
            size="lg"
            className="gap-2 px-6"
            disabled={!idFront}
            onClick={() => setStep(needsBack ? "id_back" : "selfie")}
          >
            {t("kyc.next")} <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </AppShell>
    );
  }

  if (step === "id_back") {
    return (
      <AppShell header={header}>
        <ProgressDots current={1} total={3} />
        <div className="mt-4 rounded-2xl border border-border bg-card p-5">
          <p className="mb-1 text-[15px] font-semibold">{t("kyc.photoBack")}</p>
          <p className="mb-4 text-[12.5px] text-muted-foreground">{t("kyc.photoBackSub")}</p>
          <FileDropZone file={idBack} onFile={setIdBack} label={t("kyc.tapUpload")} icon={Upload} />
        </div>
        <div className="mt-5 flex justify-end">
          <Button
            variant="appSolid"
            shape="rounded"
            size="lg"
            className="gap-2 px-6"
            disabled={!idBack}
            onClick={() => setStep("selfie")}
          >
            {t("kyc.next")} <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </AppShell>
    );
  }

  if (step === "selfie") {
    return (
      <AppShell header={header}>
        <ProgressDots current={needsBack ? 2 : 1} total={needsBack ? 3 : 2} />
        <div className="mt-4 rounded-2xl border border-border bg-card p-5">
          <p className="mb-1 text-[15px] font-semibold">{t("kyc.selfie")}</p>
          <p className="mb-4 text-[12.5px] text-muted-foreground">{t("kyc.selfieSub")}</p>
          <FileDropZone file={selfie} onFile={setSelfie} label={t("kyc.tapUpload")} icon={Camera} />
        </div>
        <div className="mt-5 flex justify-end">
          <Button
            variant="appSolid"
            shape="rounded"
            size="lg"
            className="gap-2 px-6"
            disabled={!selfie}
            onClick={() => setStep("review")}
          >
            {t("kyc.next")} <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </AppShell>
    );
  }

  if (step === "review" || step === "submitting") {
    const docLabel = DOC_TYPES.find((d) => d.id === docType)?.labelKey;
    return (
      <AppShell header={header}>
        <div className="rounded-2xl border border-border bg-card p-5">
          <p className="mb-4 text-[11px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">
            {t("kyc.reviewTitle")}
          </p>
          <div className="space-y-3">
            <ReviewItem label={t("kyc.docTypeLabel")} value={docLabel ? t(docLabel) : ""} icon={IdCard} />
            <ReviewItem label={t("kyc.photoFront")} value={idFront?.name ?? ""} icon={FileCheck} />
            {needsBack && <ReviewItem label={t("kyc.photoBack")} value={idBack?.name ?? ""} icon={FileCheck} />}
            <ReviewItem label={t("kyc.selfie")} value={selfie?.name ?? ""} icon={User} />
          </div>
        </div>

        {error && (
          <p className="mt-4 rounded-xl border border-destructive/30 bg-destructive/10 px-4 py-3 text-[13px] text-destructive">{error}</p>
        )}

        <div className="mt-5 flex justify-end">
          <Button
            variant="appSolid"
            shape="rounded"
            size="lg"
            className="gap-2 px-6"
            disabled={step === "submitting"}
            onClick={submit}
          >
            {step === "submitting" ? t("kyc.wait") : t("kyc.submit")}
            {step !== "submitting" && <ShieldCheck className="h-4 w-4" />}
          </Button>
        </div>
      </AppShell>
    );
  }

  return null;
};

function ReviewItem({ label, value, icon: Icon }: { label: string; value: string; icon: React.ElementType }) {
  return (
    <div className="flex items-center gap-3 rounded-xl bg-secondary/40 px-4 py-3">
      <Icon className="h-4 w-4 shrink-0 text-muted-foreground" strokeWidth={1.7} />
      <span className="flex-1 text-[13px] text-muted-foreground">{label}</span>
      <span className="max-w-[180px] truncate text-[13px] font-medium">{value}</span>
    </div>
  );
}

function ProgressDots({ current, total }: { current: number; total: number }) {
  return (
    <div className="flex items-center justify-center gap-2">
      {Array.from({ length: total }).map((_, i) => (
        <span
          key={i}
          className={cn(
            "h-2 rounded-full transition-all",
            i === current ? "w-6 bg-primary" : i < current ? "w-2 bg-primary/40" : "w-2 bg-border",
          )}
        />
      ))}
    </div>
  );
}

export default Verification;
