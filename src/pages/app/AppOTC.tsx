import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Handshake, Check } from "lucide-react";
import AppShell from "@/components/app/AppShell";
import CopyRow from "@/components/app/CopyRow";
import { Button } from "@/components/ui/button";
import { T, useT } from "@/lib/i18n";
import { cn } from "@/lib/utils";
import type { TKey } from "@/lib/translations";

type Side = "buy" | "sell";

const nf = new Intl.NumberFormat("fr-CA", { maximumFractionDigits: 0 });
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
  const ref = useMemo(() => newRef(), []);

  const value = parseFloat(amount.replace(/[^\d.]/g, "")) || 0;
  const valid =
    value > 0 && address.length >= 12 && usage && source && /^\S+@\S+\.\S+$/.test(email);

  if (sent) {
    return (
      <AppShell backTo="/app" header={<div><h1 className="font-display text-[22px] font-semibold tracking-tight"><T en="Request sent">Demande envoyée</T></h1><p className="mt-1 text-[13px] text-muted-foreground"><T en="Our desk will reply shortly">Notre desk vous répond sous peu</T></p></div>}>
        <div className="rounded-[16px] border border-border bg-card p-6">
          <div className="flex flex-col items-center text-center">
            <span className="flex h-14 w-14 items-center justify-center rounded-2xl border border-border bg-secondary text-foreground">
              <Check className="h-7 w-7" strokeWidth={2.4} />
            </span>
            <p className="mt-4 font-display text-lg font-semibold"><T en="Thank you!">Merci !</T></p>
            <p className="mt-1 text-[13px] text-muted-foreground">
              <T en="An OTC desk member will contact you at">Un membre du desk OTC vous contacte à</T>{" "}
              <span className="font-semibold text-foreground">{email}</span>{" "}
              <T en="with a firm quote.">avec une cotation ferme.</T>
            </p>
          </div>
          <dl className="mt-6 divide-y divide-border border-t border-border text-sm">
            <div className="flex justify-between py-3"><dt className="text-muted-foreground"><T en="Side">Sens</T></dt><dd className="font-medium">{side === "buy" ? t("otcApp.buyOf") : t("otcApp.sellOf")}</dd></div>
            <div className="flex justify-between py-3"><dt className="text-muted-foreground"><T en="Volume">Volume</T></dt><dd className="font-semibold">{nf.format(value)} USDT</dd></div>
          </dl>
        </div>

        <p className="mb-2 mt-5 px-1 text-[11px] font-semibold uppercase tracking-[0.08em] text-muted-foreground"><T en="Your reference">Votre référence</T></p>
        <div className="overflow-hidden rounded-[16px] border border-border bg-card">
          <CopyRow label={t("otcApp.requestRef")} value={ref} mono />
        </div>

        <div className="mt-6 flex justify-end">
          <Button variant="appPrimary" shape="soft" className="h-auto px-[22px] py-[13px] text-sm" asChild>
            <Link to="/app"><Check className="h-[17px] w-[17px]" strokeWidth={2} /> <T en="Done">Terminé</T></Link>
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
          <h1 className="font-display text-[22px] font-semibold tracking-tight"><T en="OTC Desk">Desk OTC</T></h1>
          <p className="mt-1 text-[13px] text-muted-foreground"><T en="Custom quotes for large volumes">Cotation sur mesure pour les gros volumes</T></p>
        </div>
      }
    >
      <div className="space-y-4 rounded-[16px] border border-border bg-card p-5">
        <div>
          <Label><T en="Direction">Sens de l'opération</T></Label>
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
          <Label><T en="Desired amount">Montant souhaité</T></Label>
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
        </div>

        <div>
          <Label><T en="USDT address">Adresse USDT</T></Label>
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

        <div>
          <Label><T en="Intended use of funds">Usage prévu des fonds</T></Label>
          <select value={usage} onChange={(e) => setUsage(e.target.value)} className={cn(fieldClass, !usage && "text-muted-foreground/60")}>
            <option value="" disabled>{t("otcApp.select")}</option>
            {USAGE_KEYS.map((k) => <option key={k} value={k}>{t(k)}</option>)}
          </select>
        </div>

        <div>
          <Label><T en="Source of funds">Provenance des fonds</T></Label>
          <select value={source} onChange={(e) => setSource(e.target.value)} className={cn(fieldClass, !source && "text-muted-foreground/60")}>
            <option value="" disabled>{t("otcApp.select")}</option>
            {SOURCE_KEYS.map((k) => <option key={k} value={k}>{t(k)}</option>)}
          </select>
        </div>

        <div>
          <Label><T en="Contact email">E-mail de contact</T></Label>
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
        <T en="Information required for compliance (source of funds verification).">
          Informations demandées pour la conformité (vérification de la provenance des fonds).
        </T>
      </p>

      <div className="mt-5 flex justify-end">
        <Button variant="appPrimary" shape="soft" className="h-auto gap-2 px-[22px] py-[13px] text-sm" disabled={!valid} onClick={() => setSent(true)}>
          <Handshake className="h-[17px] w-[17px]" strokeWidth={2} /> <T en="Request a quote">Demander un devis</T>
        </Button>
      </div>
    </AppShell>
  );
};

export default AppOTC;
