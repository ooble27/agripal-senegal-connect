import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft, HandCoins, Check, Mail, AlertTriangle, MessageSquare, ShieldOff } from "lucide-react";
import { QRCodeSVG } from "qrcode.react";
import AppShell from "@/components/app/AppShell";
import CopyRow from "@/components/app/CopyRow";
import RecipientBook from "@/components/app/RecipientBook";
import { Button } from "@/components/ui/button";
import { NETWORKS, type NetId } from "@/components/app/networks";
import { useUsdtRate } from "@/hooks/useUsdtRate";
import { createOrder, orderRef } from "@/lib/orders";
import { sendEmail, notifyStaffOfNewOrder } from "@/lib/email";
import { getMyProfile } from "@/lib/profile";
import { useAuth } from "@/lib/auth";
import { useT } from "@/lib/i18n";
import { cn } from "@/lib/utils";
import { TRADING_ENABLED } from "@/lib/config";

type Unit = "USDT" | "CAD";
type Step = "amount" | "reception" | "network" | "deposit" | "done";

const MIN_USDT = 50;

const OOBLE_DEPOSIT: Record<NetId, string> = {
  trx: "TSPUk2W5bcGGNPpKzx1xTDc2NuxpRJRCBb",
  bnb: "0xe1d04ef9b4c199ba6a59460ed8bd0a486dc4fc84",
  eth: "0xe1d04ef9b4c199ba6a59460ed8bd0a486dc4fc84",
  matic: "0xe1d04ef9b4c199ba6a59460ed8bd0a486dc4fc84",
  sol: "8ES2hxsfqZVX3cjxWLBJ8jCdzSu9hTBYELSkX82UdnhN",
  avax: "0xe1d04ef9b4c199ba6a59460ed8bd0a486dc4fc84",
};

const nfCad = new Intl.NumberFormat("fr-CA", { maximumFractionDigits: 2, minimumFractionDigits: 2 });
const nfUsdt = new Intl.NumberFormat("fr-CA", { maximumFractionDigits: 2 });

const StepHeader = ({ title, sub, onBack, backLabel }: { title: string; sub: string; onBack?: () => void; backLabel?: string }) => (
  <div className="mb-4 flex items-start gap-3">
    {onBack && (
      <button
        type="button"
        onClick={onBack}
        aria-label={backLabel ?? "Back"}
        className="mt-0.5 flex h-[38px] w-[38px] shrink-0 items-center justify-center rounded-full bg-secondary text-foreground transition-colors hover:bg-secondary/70 active:scale-95"
      >
        <ArrowLeft className="h-[18px] w-[18px]" />
      </button>
    )}
    <div>
      <h1 className="font-display text-[18px] font-semibold tracking-tight">{title}</h1>
      <p className="mt-1 text-[13px] text-muted-foreground">{sub}</p>
    </div>
  </div>
);

const AppVendre = () => {
  const rate = useUsdtRate();
  const { user, isStaff } = useAuth();
  const t = useT();

  if (!TRADING_ENABLED && !isStaff) {
    return (
      <AppShell center>
        <div className="flex flex-col items-center py-16 text-center">
          <span className="flex h-16 w-16 items-center justify-center rounded-2xl bg-secondary text-muted-foreground">
            <ShieldOff className="h-7 w-7" strokeWidth={1.5} />
          </span>
          <h1 className="mt-5 font-display text-[20px] font-semibold tracking-tight">
            {t("sell.title")}
          </h1>
          <p className="mt-2 max-w-xs text-[14px] leading-relaxed text-muted-foreground">
            Les transactions sont temporairement suspendues. La création de compte et la vérification KYC restent disponibles.
          </p>
          <p className="mt-1 text-[12px] text-muted-foreground/60">
            Trading is temporarily suspended. Account creation and KYC verification remain available.
          </p>
          <Link
            to="/app"
            className="mt-6 inline-flex items-center gap-2 rounded-xl bg-secondary px-5 py-2.5 text-[13px] font-medium text-foreground transition-colors hover:bg-secondary/70"
          >
            <ArrowLeft className="h-4 w-4" />
            Retour au tableau de bord
          </Link>
        </div>
      </AppShell>
    );
  }

  const [step, setStep] = useState<Step>("amount");
  const [unit, setUnit] = useState<Unit>("USDT");
  const [amount, setAmount] = useState("");
  const [email, setEmail] = useState("");
  const [net, setNet] = useState<NetId | null>(null);
  const [savedRef, setSavedRef] = useState("");
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [interacQA, setInteracQA] = useState<{ q: string; a: string } | null>(null);

  useEffect(() => {
    getMyProfile().then((p) => {
      if (p?.interacQuestion && p?.interacAnswer) {
        setInteracQA({ q: p.interacQuestion, a: p.interacAnswer });
      }
    });
  }, []);

  const value = parseFloat(amount.replace(",", ".")) || 0;
  const usdt = unit === "USDT" ? value : value / rate.sell;
  const cad = unit === "USDT" ? value * rate.sell : value;
  const belowMin = usdt > 0 && usdt < MIN_USDT;
  const network = NETWORKS.find((n) => n.id === net) ?? null;
  const depositAddr = net ? OOBLE_DEPOSIT[net] : "";

  const submit = async () => {
    if (saving) return;
    setSaving(true);
    setErr(null);
    const res = await createOrder({
      side: "sell",
      cad,
      usdt,
      rate: rate.sell,
      network: net ?? undefined,
      interacEmail: email,
    });
    setSaving(false);
    if ("error" in res) {
      setErr(res.error);
      return;
    }
    const ref = orderRef(res.id);
    setSavedRef(ref);
    setStep("done");

    const to = user?.email || email;
    if (to) {
      void sendEmail({
        to,
        template: "order-sell",
        vars: {
          ref,
          usdtAmount: nfUsdt.format(usdt),
          cadAmount: nfCad.format(cad),
          network: network ? `${network.name} · ${network.tag}` : "—",
          depositAddress: depositAddr,
          orderUrl: `${window.location.origin}/app`,
        },
      });
    }
    // Prévient le staff (best-effort, silencieux si la config manque).
    void notifyStaffOfNewOrder({
      ref,
      side: "sell",
      cadAmount: nfCad.format(cad),
      usdtAmount: nfUsdt.format(usdt),
      network: network ? `${network.name} · ${network.tag}` : "—",
      address: depositAddr,
      clientEmail: user?.email ?? email,
      clientName: user?.user_metadata?.full_name ?? "",
      adminUrl: `${window.location.origin}/admin`,
    });
  };

  if (step === "amount") {
    return (
      <AppShell center>
        <div className="mb-5">
          <h1 className="font-display text-[22px] font-semibold tracking-tight">{t("sell.title")}</h1>
          <p className="mt-1 text-[13px] text-muted-foreground">{t("sell.sub")}</p>
        </div>
        <div className="rounded-[20px] border border-border bg-card p-5">
          <div className="mb-3 flex items-center justify-between">
            <span className="text-[11px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">{t("sell.amount")}</span>
            <div className="inline-flex gap-0.5 rounded-[10px] bg-secondary/70 p-[3px]">
              {(["USDT", "CAD"] as Unit[]).map((u) => (
                <button
                  key={u}
                  type="button"
                  onClick={() => { setUnit(u); setAmount(""); }}
                  className={cn(
                    "rounded-[7px] px-3 py-[5px] text-xs font-semibold transition-colors",
                    unit === u ? "bg-card text-foreground dark:bg-neutral-600" : "text-muted-foreground",
                  )}
                >
                  {u}
                </button>
              ))}
            </div>
          </div>

          <div className="relative">
            <input
              inputMode="decimal"
              placeholder="0"
              value={amount}
              onChange={(e) => setAmount(e.target.value.replace(/[^\d.,]/g, ""))}
              className="w-full rounded-[14px] border border-border bg-secondary/40 py-[18px] pl-5 pr-[84px] text-[34px] font-bold tracking-[-1px] outline-none placeholder:text-muted-foreground/40"
            />
            <span className="absolute right-4 top-1/2 flex -translate-y-1/2 items-center gap-1.5 text-sm font-medium text-muted-foreground">
              {unit === "USDT" && <img src="/coins/usdt.svg" alt="" className="h-5 w-5" />}
              {unit}
            </span>
          </div>

          <p className={cn("mt-2 text-xs", belowMin ? "text-destructive" : "text-muted-foreground")}>{t("sell.minimum")} {MIN_USDT} USDT</p>
        </div>

        <div className="mt-3 flex flex-col gap-2.5 rounded-[16px] border border-border bg-card px-5 py-4">
          <div className="flex items-center justify-between">
            <span className="text-[13px] text-muted-foreground">{t("sell.youReceive")}</span>
            <span className="text-sm font-semibold">{nfCad.format(cad)} CAD</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-[13px] text-muted-foreground">{t("sell.rate")}</span>
            <span className="text-[13px] text-muted-foreground">1 USDT = {nfCad.format(rate.sell)} CAD</span>
          </div>
        </div>

        <div className="mt-3 flex justify-start">
          <Button variant="appPrimary" shape="soft" className="h-auto gap-2 px-[22px] py-[13px] text-sm" disabled={value <= 0 || belowMin} onClick={() => setStep("reception")}>
            <HandCoins className="h-[17px] w-[17px]" strokeWidth={2} /> {t("sell.continue")}
          </Button>
        </div>
      </AppShell>
    );
  }

  if (step === "reception") {
    return (
      <AppShell center>
        <StepHeader title={t("sell.reception")} sub={t("sell.receptionSub")} onBack={() => setStep("amount")} backLabel={t("misc.back")} />
        <div className="overflow-hidden rounded-[14px] border border-border bg-card">
          <div className="border-b border-border px-4 py-2.5">
            <span className="text-[11px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">{t("sell.interacEmail")}</span>
          </div>
          <div className="flex items-center gap-2.5 px-4 py-4">
            <Mail className="h-5 w-5 shrink-0 text-muted-foreground" strokeWidth={1.9} />
            <input
              type="email"
              spellCheck={false}
              autoCapitalize="none"
              placeholder="vous@exemple.ca"
              value={email}
              onChange={(e) => setEmail(e.target.value.trim())}
              className="w-full bg-transparent text-base outline-none placeholder:text-muted-foreground/60"
            />
          </div>
        </div>
        <RecipientBook kind="interac" value={email} onPick={setEmail} />

        <p className="mt-3 px-1 text-[13px] text-muted-foreground">
          <span className="font-semibold text-foreground">{nfCad.format(cad)} CAD</span> {t("sell.receiveInfo")}
        </p>

        {interacQA && (
          <div className="mt-4 overflow-hidden rounded-[14px] border border-border bg-card">
            <div className="flex items-center gap-2 border-b border-border px-4 py-2.5">
              <MessageSquare className="h-3.5 w-3.5 text-muted-foreground" strokeWidth={2} />
              <span className="text-[11px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">{t("sell.securityQ")}</span>
            </div>
            <CopyRow label={t("sell.question")} value={interacQA.q} />
            <CopyRow label={t("sell.answerToEnter")} value={interacQA.a} mono />
          </div>
        )}
        <p className="mt-2 px-1 text-[12px] text-muted-foreground">
          {t("sell.unlockHelp")}
        </p>

        <div className="mt-5 flex justify-start">
          <Button variant="appPrimary" shape="soft" className="h-auto gap-2 px-[22px] py-[13px] text-sm" disabled={!/^\S+@\S+\.\S+$/.test(email)} onClick={() => setStep("network")}>
            <HandCoins className="h-[17px] w-[17px]" strokeWidth={2} /> {t("sell.continue")}
          </Button>
        </div>
      </AppShell>
    );
  }

  if (step === "network") {
    return (
      <AppShell center>
        <StepHeader title={t("sell.network")} sub={t("sell.networkSub")} onBack={() => setStep("reception")} backLabel={t("misc.back")} />
        <div className="flex flex-wrap gap-2">
          {NETWORKS.map((n) => {
            const sel = net === n.id;
            return (
              <button
                key={n.id}
                type="button"
                onClick={() => setNet(n.id)}
                className={cn(
                  "flex items-center gap-2.5 rounded-[10px] border py-2 pl-2 pr-3.5 transition-colors active:scale-[0.98]",
                  sel ? "border-foreground bg-secondary" : "border-border bg-card",
                )}
              >
                <img src={`/coins/${n.id}.svg`} alt="" className="h-7 w-7 shrink-0 rounded-full" draggable={false} />
                <span className="whitespace-nowrap text-sm">{n.name}</span>
              </button>
            );
          })}
        </div>

        <div className="mt-6 flex justify-start">
          <Button variant="appPrimary" shape="soft" className="h-auto gap-2 px-[22px] py-[13px] text-sm" disabled={!net} onClick={() => setStep("deposit")}>
            <HandCoins className="h-[17px] w-[17px]" strokeWidth={2} /> {t("sell.continue")}
          </Button>
        </div>
      </AppShell>
    );
  }

  if (step === "deposit") {
    return (
      <AppShell header={<StepHeader title={t("sell.sendUsdt")} sub={t("sell.sendUsdtSub")} onBack={() => setStep("network")} backLabel={t("misc.back")} />}>
        <div className="flex justify-center">
          <div className="rounded-2xl border border-border bg-white p-4">
            <QRCodeSVG value={depositAddr} size={180} level="M" />
          </div>
        </div>

        <div className="mt-4 overflow-hidden rounded-[14px] border border-border bg-card">
          <div className="flex items-center gap-2.5 border-b border-border px-4 py-2.5">
            <img src={`/coins/${network?.id}.svg`} alt="" className="h-[26px] w-[26px] rounded-full" draggable={false} />
            <span className="text-[11px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">{network?.name}</span>
            <span className="ml-auto text-[11px] font-medium text-muted-foreground">{network?.tag}</span>
          </div>
          <CopyRow label={t("sell.depositAddr")} value={depositAddr} mono />
          <CopyRow label={t("sell.exactToSend")} value={`${nfUsdt.format(usdt)} USDT`} />
        </div>

        <div className="mt-3 flex items-start gap-2.5 rounded-[12px] border border-amber-300/60 bg-amber-50 px-4 py-3 dark:border-amber-500/30 dark:bg-amber-500/10">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-600 dark:text-amber-400" strokeWidth={2} />
          <p className="text-[12.5px] leading-snug text-amber-800 dark:text-amber-200">
            {t("sell.networkWarn")} <strong>{network?.tag}</strong>. {t("sell.networkWarnLoss")}
          </p>
        </div>

        <p className="mt-3 px-1 text-[13px] text-muted-foreground">
          {t("sell.afterSend")}{" "}
          <span className="font-semibold text-foreground">{nfCad.format(cad)} CAD</span> {t("sell.afterSend2")}
        </p>

        {err && <p className="mt-3 text-[13px] text-destructive">{err}</p>}

        <div className="mt-6 flex justify-start">
          <Button variant="appPrimary" shape="soft" className="h-auto gap-2 px-[22px] py-[13px] text-sm" disabled={saving} onClick={submit}>
            <Check className="h-[17px] w-[17px]" strokeWidth={2} /> {saving ? t("sell.saving") : t("sell.iSent")}
          </Button>
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell header={<StepHeader title={t("sell.sentTitle")} sub={t("sell.sentSub")} />}>
      <div className="mb-4 flex items-start gap-2.5 rounded-[14px] border border-border bg-secondary/40 px-4 py-3.5">
        <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary text-white">
          <Check className="h-[14px] w-[14px]" strokeWidth={2.5} />
        </span>
        <p className="text-[13px] leading-snug text-muted-foreground">
          {t("sell.checking")}{" "}
          <span className="font-semibold text-foreground">{nfCad.format(cad)} CAD</span> {t("sell.checking2")}
        </p>
      </div>

      <div className="overflow-hidden rounded-[16px] border border-border bg-card">
        {[
          { label: t("sell.youSend"), value: `${nfUsdt.format(usdt)} USDT` },
          { label: t("sell.youReceive"), value: `${nfCad.format(cad)} CAD` },
          { label: t("sell.network"), value: network ? `${network.name} · ${network.tag}` : "—" },
          { label: t("sell.rate"), value: `1 USDT = ${nfCad.format(rate.sell)} CAD` },
          { label: t("sell.receivedByInterac"), value: email, mono: true },
        ].map((r, i, arr) => (
          <div key={r.label} className={cn("flex items-center justify-between px-4 py-[14px]", i < arr.length - 1 && "border-b border-border")}>
            <span className="text-[13px] text-muted-foreground">{r.label}</span>
            <span className={cn("max-w-[60%] break-all text-right text-[13px] font-medium", r.mono && "font-mono text-[11px]")}>{r.value}</span>
          </div>
        ))}
      </div>

      <p className="mb-2 mt-5 px-1 text-[11px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">{t("sell.orderDetail")}</p>
      <div className="divide-y divide-border overflow-hidden rounded-[16px] border border-border bg-card">
        <CopyRow label={t("sell.amountSent")} value={`${nfUsdt.format(usdt)} USDT`} />
        <CopyRow label={t("sell.orderRef")} value={savedRef} mono />
      </div>

      <div className="mt-6 flex justify-start gap-2.5">
        <Button variant="appPrimary" shape="soft" className="h-auto gap-2 px-[22px] py-[13px] text-sm" asChild>
          <Link to="/app"><Check className="h-[17px] w-[17px]" strokeWidth={2} /> {t("sell.done")}</Link>
        </Button>
        <Button variant="ghost" shape="soft" className="h-auto px-[22px] py-[13px] text-sm" onClick={() => { setStep("amount"); setAmount(""); setEmail(""); setNet(null); setSavedRef(""); setErr(null); }}>
          {t("sell.newOrder")}
        </Button>
      </div>
    </AppShell>
  );
};

export default AppVendre;
