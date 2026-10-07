import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Handshake, Check, ArrowRight } from "lucide-react";
import AppShell from "@/components/app/AppShell";
import CopyRow from "@/components/app/CopyRow";
import { Button } from "@/components/ui/button";
import { T, useT } from "@/lib/i18n";
import { useUsdtRate } from "@/hooks/useUsdtRate";
import { OOBLE_OTC_EMAIL } from "@/lib/config";
import { useAuth } from "@/lib/auth";
import { getMyProfile } from "@/lib/profile";
import { supabase } from "@/integrations/supabase/client";
import { t as tr } from "@/lib/translations";
import { cn } from "@/lib/utils";
import type { TKey } from "@/lib/translations";

type Side = "buy" | "sell";

const nf = new Intl.NumberFormat("fr-CA", { maximumFractionDigits: 0 });
/** En dessous, l'application suffit (limite de 9 999 $ sur 24 heures). */
const OTC_MIN_CAD = 10_000;
const newRef = () => `OTC-${Math.random().toString(36).slice(2, 7).toUpperCase()}`;

const USAGE_KEYS: TKey[] = ["otcApp.usage1", "otcApp.usage2", "otcApp.usage3", "otcApp.usage4", "otcApp.usage5"];
const SOURCE_KEYS: TKey[] = ["otcApp.source1", "otcApp.source2", "otcApp.source3", "otcApp.source4", "otcApp.source5"];

const fieldClass =
  "w-full rounded-[12px] border border-border bg-secondary/40 px-4 py-3.5 text-base outline-none placeholder:text-muted-foreground/60 focus:border-foreground";

const Label = ({ children }: { children: React.ReactNode }) => (
  <span className="mb-1.5 block px-1 text-[13px] font-medium text-muted-foreground">{children}</span>
);

const AppOTC = () => {
  const t = useT();
  const [side, setSide] = useState<Side>("buy");
  const [amount, setAmount] = useState("");
  const [address, setAddress] = useState("");
  const [usage, setUsage] = useState("");
  const [source, setSource] = useState("");
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const ref = useMemo(() => newRef(), []);
  const { user } = useAuth();
  const rate = useUsdtRate();

  useEffect(() => {
    if (user?.email) setEmail((e) => e || user.email);
  }, [user?.email]);

  // La demande arrive dans la boîte otc@ooble.ca (Admin → Messagerie,
  // pastille « OTC ») ; l'équipe répond depuis le back-office.
  const submit = async () => {
    if (!valid || sending) return;
    setSending(true);
    setError(null);
    const p = await getMyProfile();
    const company = p?.accountType === "business" ? p.businessName : null;
    const lines = [
      `Demande OTC ${ref}`,
      `Sens : ${side === "buy" ? "achat de USDT" : "vente de USDT"}`,
      `Volume : ${nf.format(value)} USDT (environ ${nf.format(cadEq)} $ au taux affiché)`,
      side === "buy" ? `Adresse USDT : ${address}` : "Adresse de dépôt : à fournir par le desk",
      `Usage : ${tr(usage as TKey, "fr")}`,
      `Origine des fonds : ${tr(source as TKey, "fr")}`,
      "",
      `Compte : ${user?.name ?? "—"} <${user?.email ?? "—"}>`,
      company ? `Entreprise : ${company} (vérification : ${{ not_started: "non commencée", pending: "en attente", approved: "vérifiée", rejected: "refusée" }[p!.businessStatus]})` : "Compte individuel",
    ];
    const { error: err } = await supabase.functions.invoke("send-email", {
      body: {
        contact: {
          desk: "otc",
          name: company || user?.name || email,
          email,
          subject: `${side === "buy" ? "Achat" : "Vente"} ${nf.format(value)} USDT · ${ref}`,
          message: lines.join("\n"),
        },
      },
    });
    setSending(false);
    if (err) {
      const status = (err as { context?: Response }).context?.status;
      setError(t(status === 429 ? "cont.tooMany" : "cont.error"));
      return;
    }
    setSent(true);
  };

  const value = parseFloat(amount.replace(/[^\d.]/g, "")) || 0;
  const cadEq = value * (side === "buy" ? rate.buy : rate.sell);
  const small = value > 0 && cadEq < OTC_MIN_CAD;
  const valid =
    value > 0 && (side === "sell" || address.length >= 12) && usage && source && /^\S+@\S+\.\S+$/.test(email);

  if (sent) {
    return (
      <AppShell backTo="/app" header={<div><h1 className="font-display text-[22px] font-semibold tracking-tight">{t("otcApp.sentTitle")}</h1><p className="mt-1 text-[13px] text-muted-foreground">{t("otcApp.sentSub")}</p></div>}>
        <div className="rounded-[16px] border border-border bg-card p-6">
          <div className="flex flex-col items-center text-center">
            <span className="flex h-14 w-14 items-center justify-center rounded-2xl border border-border bg-secondary text-foreground">
              <Check className="h-7 w-7" strokeWidth={2.4} />
            </span>
            <p className="mt-4 font-display text-lg font-semibold">{t("otcApp.thanks")}</p>
            <p className="mt-1 text-[13px] text-muted-foreground">
              {t("otcApp.contactAt")}{" "}
              <span className="font-semibold text-foreground">{email}</span>{" "}
              {t("otcApp.contactAt2")}
            </p>
            <p className="mt-3 text-[12.5px] text-muted-foreground">
              <T en="Questions? Write to">Une question ? Écrivez à</T>{" "}
              <a href={`mailto:${OOBLE_OTC_EMAIL}`} className="text-foreground underline underline-offset-2">{OOBLE_OTC_EMAIL}</a>{" "}
              <T en="quoting your reference.">en citant votre référence.</T>
            </p>
          </div>
          <dl className="mt-6 divide-y divide-border border-t border-border text-sm">
            <div className="flex justify-between py-3"><dt className="text-muted-foreground">{t("otcApp.sideLabel")}</dt><dd className="font-medium">{side === "buy" ? t("otcApp.buyOf") : t("otcApp.sellOf")}</dd></div>
            <div className="flex justify-between py-3"><dt className="text-muted-foreground">{t("otcApp.volume")}</dt><dd className="font-semibold">{nf.format(value)} USDT</dd></div>
          </dl>
        </div>

        <p className="mb-2 mt-5 px-1 text-[11px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">{t("otcApp.yourRef")}</p>
        <div className="overflow-hidden rounded-[16px] border border-border bg-card">
          <CopyRow label={t("otcApp.requestRef")} value={ref} mono />
        </div>

        <div className="mt-6 flex justify-end">
          <Button variant="appPrimary" shape="soft" className="h-auto px-[22px] py-[13px] text-sm" asChild>
            <Link to="/app"><Check className="h-[17px] w-[17px]" strokeWidth={2} /> {t("otcApp.done")}</Link>
          </Button>
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell
      backTo="/app"
      header={
        <div>
          <h1 className="font-display text-[22px] font-semibold tracking-tight">{t("otcApp.title")}</h1>
          <p className="mt-1 text-[13px] text-muted-foreground">{t("otcApp.sub")}</p>
        </div>
      }
    >
      <Link
        to="/otc"
        className="mb-4 flex items-center justify-between gap-3 rounded-[14px] border border-border bg-card px-4 py-3 text-[13px] transition-colors hover:bg-secondary/50"
      >
        <span className="text-muted-foreground">
          <T en="From $10,000 · firm price">À partir de 10 000 $ · prix ferme</T>
        </span>
        <span className="flex shrink-0 items-center gap-1 font-medium text-foreground">
          <T en="How it works">Comment ça marche</T> <ArrowRight className="h-3.5 w-3.5" />
        </span>
      </Link>

      <div className="space-y-4 rounded-[16px] border border-border bg-card p-5">
        <div>
          <Label>{t("otcApp.direction")}</Label>
          <div className="flex rounded-[10px] border border-border bg-secondary/60 p-0.5">
            {([
              { key: "buy" as Side, labelKey: "otcApp.buyLabel" as TKey },
              { key: "sell" as Side, labelKey: "otcApp.sellLabel" as TKey },
            ]).map(({ key, labelKey }) => (
              <button
                key={key}
                type="button"
                onClick={() => setSide(key)}
                className={cn(
                  "flex-1 rounded-md py-2 text-sm font-semibold transition-colors",
                  side === key ? "bg-card text-foreground dark:bg-neutral-600" : "text-muted-foreground",
                )}
              >
                {t(labelKey)}
              </button>
            ))}
          </div>
        </div>

        <div>
          <Label>{t("otcApp.desiredAmount")}</Label>
          <div className="relative">
            <input
              inputMode="numeric"
              placeholder="0"
              value={amount}
              onChange={(e) => setAmount(e.target.value.replace(/[^\d]/g, ""))}
              className={cn(fieldClass, "pr-16")}
            />
            <span className="absolute right-4 top-1/2 -translate-y-1/2 text-sm font-medium text-muted-foreground">USDT</span>
          </div>
          {value > 0 && (
            <p className={cn("mt-1.5 px-1 text-[12.5px]", small ? "text-destructive" : "text-muted-foreground")}>
              ≈ {nf.format(cadEq)} $ CAD
              {small && (
                <>
                  {" · "}
                  <T en="Under $10,000, buy or sell directly in the app.">Sous 10 000 $, achetez ou vendez directement dans l'application.</T>
                </>
              )}
            </p>
          )}
        </div>

        {side === "buy" && (
        <div>
          <Label>{t("otcApp.usdtAddress")}</Label>
          <input
            type="text"
            spellCheck={false}
            autoCapitalize="none"
            placeholder={t("otcApp.addressPh")}
            value={address}
            onChange={(e) => setAddress(e.target.value.trim())}
            className={cn(fieldClass, "font-mono")}
          />
        </div>
        )}

        <div>
          <Label>{t("otcApp.usage")}</Label>
          <select value={usage} onChange={(e) => setUsage(e.target.value)} className={cn(fieldClass, !usage && "text-muted-foreground/60")}>
            <option value="" disabled>{t("otcApp.select")}</option>
            {USAGE_KEYS.map((k) => <option key={k} value={k}>{t(k)}</option>)}
          </select>
        </div>

        <div>
          <Label>{t("otcApp.source")}</Label>
          <select value={source} onChange={(e) => setSource(e.target.value)} className={cn(fieldClass, !source && "text-muted-foreground/60")}>
            <option value="" disabled>{t("otcApp.select")}</option>
            {SOURCE_KEYS.map((k) => <option key={k} value={k}>{t(k)}</option>)}
          </select>
        </div>

        <div>
          <Label>{t("otcApp.contactEmail")}</Label>
          <input
            type="email"
            spellCheck={false}
            autoCapitalize="none"
            placeholder={t("otcApp.emailPh")}
            value={email}
            onChange={(e) => setEmail(e.target.value.trim())}
            className={fieldClass}
          />
        </div>
      </div>

      <p className="mt-3 px-1 text-xs text-muted-foreground">
        {t("otcApp.compliance")}
      </p>

      {error && (
        <p role="alert" className="mt-3 rounded-xl border border-destructive/30 bg-destructive/10 px-4 py-3 text-[13px] text-destructive">
          {error}
        </p>
      )}

      <div className="mt-5 flex justify-end">
        <Button variant="appPrimary" shape="soft" className="h-auto gap-2 px-[22px] py-[13px] text-sm" disabled={!valid || sending} onClick={submit}>
          <Handshake className="h-[17px] w-[17px]" strokeWidth={2} /> {sending ? t("cont.sending") : t("otcApp.requestQuote")}
        </Button>
      </div>
    </AppShell>
  );
};

export default AppOTC;
