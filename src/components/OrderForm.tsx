import { useState } from "react";
import { ArrowRight, Info, Lock, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";
import { T, useLang } from "@/lib/i18n";
import { Button } from "@/components/ui/button";
import { useUsdtRate } from "@/hooks/useUsdtRate";
import { RATE_LOCK_MINUTES, formatCad, formatUsdt } from "@/lib/rates";
import type { OrderSide, UsdtNetwork } from "@/lib/types";

const networks: { id: UsdtNetwork; label: string; hint: { fr: string; en: string } }[] = [
  { id: "trc20", label: "TRC20", hint: { fr: "Tron — frais très bas", en: "Tron — very low fees" } },
  { id: "erc20", label: "ERC20", hint: { fr: "Ethereum — compatible partout", en: "Ethereum — compatible everywhere" } },
];

interface OrderFormProps {
  side: OrderSide;
}

const OrderForm = ({ side }: OrderFormProps) => {
  const [amount, setAmount] = useState("500");
  const [network, setNetwork] = useState<UsdtNetwork>("trc20");
  const [address, setAddress] = useState("");
  const [interacEmail, setInteracEmail] = useState("");
  const [submitted, setSubmitted] = useState(false);

  const [lang] = useLang();
  const rates = useUsdtRate();
  const isBuy = side === "buy";
  const rate = isBuy ? rates.buy : rates.sell;
  const value = parseFloat(amount.replace(",", ".")) || 0;
  const cadAmount = isBuy ? value : value * rate;
  const usdtAmount = isBuy ? value / rate : value;

  return (
    <div className="rounded-[28px] border bg-card p-6 shadow-lift sm:p-7">
      <div className="flex items-center justify-between">
        <span className="font-display text-lg font-bold">
          {isBuy ? <T en="Buy order">Ordre d'achat</T> : <T en="Sell order">Ordre de vente</T>}
        </span>
        <span className="flex items-center gap-1.5 rounded-full bg-accent-tint px-3 py-1 text-[11px] font-semibold text-accent-ink">
          <span className="h-1.5 w-1.5 rounded-full bg-primary" />
          <T en="Live rate">Taux en direct</T>
        </span>
      </div>

      {/* Montant */}
      <label className="mt-5 block text-sm font-medium text-muted-foreground">
        {isBuy ? <T en="Amount to pay">Montant à payer</T> : <T en="Amount to sell">Montant à vendre</T>}
      </label>
      <div className="mt-2 flex items-center gap-2 rounded-2xl bg-secondary/60 p-4 ring-1 ring-transparent transition-all focus-within:ring-primary">
        <input
          value={amount}
          onChange={(e) => setAmount(e.target.value.replace(/[^0-9.,]/g, ""))}
          inputMode="decimal"
          className="w-full bg-transparent font-display text-3xl font-bold tracking-tight outline-none"
          placeholder="0"
        />
        <span className="shrink-0 rounded-full bg-card px-3 py-1.5 text-sm font-bold shadow-soft">
          {isBuy ? "CAD" : "USDT"}
        </span>
      </div>

      {/* Réseau */}
      <label className="mt-6 block text-sm font-medium text-muted-foreground"><T en="USDT Network">Réseau USDT</T></label>
      <div className="mt-2 grid grid-cols-2 gap-3">
        {networks.map((n) => (
          <button
            key={n.id}
            type="button"
            onClick={() => setNetwork(n.id)}
            className={cn(
              "rounded-2xl border p-4 text-left transition-all",
              network === n.id
                ? "border-primary bg-accent-tint/60"
                : "bg-secondary/40 hover:border-muted-foreground/30",
            )}
          >
            <span className="font-semibold">{n.label}</span>
            <p className="mt-0.5 text-xs text-muted-foreground">{n.hint[lang]}</p>
          </button>
        ))}
      </div>

      {/* Destination */}
      {isBuy ? (
        <>
          <label className="mt-6 block text-sm font-medium text-muted-foreground">
            {lang === "en" ? `Your wallet address (${network.toUpperCase()})` : `Votre adresse wallet (${network.toUpperCase()})`}
          </label>
          <input
            value={address}
            onChange={(e) => setAddress(e.target.value.trim())}
            placeholder={network === "trc20" ? "T..." : "0x..."}
            className="mt-2 w-full rounded-2xl bg-secondary/60 p-4 font-mono text-sm outline-none ring-1 ring-transparent transition-all focus:ring-primary"
          />
          <p className="mt-2 flex items-start gap-1.5 text-xs text-muted-foreground">
            <Info className="mt-0.5 h-3.5 w-3.5 shrink-0" />
            <T en="USDT will be sent directly to this address. A blockchain transaction is irreversible.">Les USDT seront envoyés directement à cette adresse. Une
            transaction blockchain est irréversible.</T>
          </p>
        </>
      ) : (
        <>
          <label className="mt-6 block text-sm font-medium text-muted-foreground">
            <T en="Your Interac email">Votre courriel Interac</T>
          </label>
          <input
            value={interacEmail}
            onChange={(e) => setInteracEmail(e.target.value.trim())}
            type="email"
            placeholder={lang === "en" ? "you@example.ca" : "vous@exemple.ca"}
            className="mt-2 w-full rounded-2xl bg-secondary/60 p-4 text-sm outline-none ring-1 ring-transparent transition-all focus:ring-primary"
          />
          <p className="mt-2 flex items-start gap-1.5 text-xs text-muted-foreground">
            <Info className="mt-0.5 h-3.5 w-3.5 shrink-0" />
            <T en="The USDT deposit address will be provided when the order is created.">L'adresse de dépôt USDT vous sera fournie à la création de l'ordre.</T>
          </p>
        </>
      )}

      {/* Résumé */}
      <div className="mt-6 space-y-3 rounded-2xl bg-secondary/60 p-4 text-sm">
        <div className="flex justify-between">
          <span className="text-muted-foreground"><T en="Locked rate">Taux verrouillé</T></span>
          <span className="font-medium">1 USDT = {formatCad(rate)}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-muted-foreground"><T en="You receive">Vous recevez</T></span>
          <span className="font-display text-lg font-bold text-primary">
            {isBuy ? formatUsdt(usdtAmount) : formatCad(cadAmount)}
          </span>
        </div>
        <div className="flex items-center justify-between border-t border-dashed pt-3 text-xs text-muted-foreground">
          <span className="flex items-center gap-1.5">
            <Lock className="h-3.5 w-3.5" /> <T en={`Guaranteed ${RATE_LOCK_MINUTES} min`}>Garanti {RATE_LOCK_MINUTES} min</T>
          </span>
          <span><T en="Fees included in rate">Frais inclus dans le taux</T></span>
        </div>
      </div>

      <Button
        type="button"
        onClick={() => setSubmitted(true)}
        variant="primary"
        shape="pill"
        className="mt-6 h-12 w-full"
      >
        {isBuy ? <T en="Create buy order">Créer l'ordre d'achat</T> : <T en="Create sell order">Créer l'ordre de vente</T>}
        <ArrowRight className="h-4 w-4" />
      </Button>

      {submitted && (
        <div className="mt-4 flex items-start gap-2.5 rounded-2xl border border-primary/30 bg-accent-tint p-4 text-sm leading-relaxed text-accent-ink">
          <Sparkles className="mt-0.5 h-4 w-4 shrink-0" strokeWidth={1.9} />
          <span>
            <T en="Order creation will open very soon. You'll need a verified account (KYC) — authentication is the next step.">La création d'ordres ouvrira très bientôt. Il faudra un compte
            vérifié (KYC) — l'authentification est la prochaine étape.</T>
          </span>
        </div>
      )}
    </div>
  );
};

export default OrderForm;
