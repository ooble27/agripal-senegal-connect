import { ArrowDown, Check } from "lucide-react";
import Coin from "./Coin";
import { TransferMark } from "./marks";
import { T } from "@/lib/i18n";

/** Maquette d'application Ooble (écran d'achat) — pièce produit du site. */
const AppMockup = () => (
  <div className="relative mx-auto w-[300px]">
    {/* Cadre téléphone */}
    <div className="rounded-[42px] border border-white/10 bg-[hsl(193_50%_10%)] p-2.5 shadow-lift">
      <div className="overflow-hidden rounded-[34px] bg-card text-foreground">
        {/* Barre d'état */}
        <div className="flex items-center justify-between px-6 pb-2 pt-4 text-[11px] font-semibold text-foreground/70">
          <span>9:41</span>
          <span className="h-3.5 w-16 rounded-full bg-secondary" />
        </div>

        <div className="px-5 pb-6">
          <div className="flex items-center justify-between">
            <p className="font-display text-lg font-bold"><T en="Buy">Acheter</T></p>
            <span className="flex items-center gap-1.5 rounded-full bg-accent-tint px-2.5 py-1 text-[10px] font-semibold text-accent-ink">
              <span className="h-1.5 w-1.5 rounded-full bg-primary" />
              <T en="Live">En direct</T>
            </span>
          </div>

          {/* Vous payez */}
          <div className="relative mt-4">
            <div className="rounded-2xl bg-secondary/70 p-4">
              <p className="text-[11px] font-medium text-muted-foreground"><T en="You pay">Vous payez</T></p>
              <div className="mt-1 flex items-center justify-between">
                <span className="font-display text-2xl font-bold tracking-tight">500,00</span>
                <span className="rounded-full bg-card px-2.5 py-1 text-xs font-bold shadow-soft">CAD</span>
              </div>
            </div>

            <span className="absolute left-1/2 top-1/2 flex h-8 w-8 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border-4 border-card bg-primary text-primary-foreground">
              <ArrowDown className="h-4 w-4" />
            </span>

            <div className="mt-1.5 rounded-2xl bg-secondary/70 p-4">
              <p className="text-[11px] font-medium text-muted-foreground"><T en="You receive">Vous recevez</T></p>
              <div className="mt-1 flex items-center justify-between">
                <span className="font-display text-2xl font-bold tracking-tight">351,00</span>
                <span className="flex items-center gap-1 rounded-full bg-card px-2.5 py-1 text-xs font-bold shadow-soft">
                  <Coin id="usdt" size={14} /> USDT
                </span>
              </div>
            </div>
          </div>

          {/* Réseaux */}
          <div className="mt-4 grid grid-cols-2 gap-2">
            <div className="rounded-xl border border-primary bg-accent-tint/50 px-3 py-2.5">
              <p className="text-xs font-bold">TRC20</p>
              <p className="text-[10px] text-muted-foreground">Tron</p>
            </div>
            <div className="rounded-xl border px-3 py-2.5">
              <p className="text-xs font-bold">ERC20</p>
              <p className="text-[10px] text-muted-foreground">Ethereum</p>
            </div>
          </div>

          {/* Paiement */}
          <div className="mt-3 flex items-center justify-between rounded-xl border border-primary/60 bg-accent-tint/40 px-3 py-2.5">
            <div className="flex items-center gap-2">
              <span className="flex h-6 w-6 items-center justify-center rounded-md bg-primary text-primary-foreground">
                <TransferMark className="h-3.5 w-3.5" />
              </span>
              <span className="text-xs font-semibold">Interac e-Transfer</span>
            </div>
            <Check className="h-3.5 w-3.5 text-primary" strokeWidth={3} />
          </div>

          {/* Bouton */}
          <div className="mt-4 rounded-full bg-primary py-3 text-center text-sm font-semibold text-primary-foreground shadow-teal">
            <T en="Confirm purchase">Confirmer l'achat</T>
          </div>
        </div>
      </div>
    </div>

    {/* Reflet / halo */}
    <div
      className="pointer-events-none absolute -inset-x-10 -bottom-8 -z-10 h-40 rounded-full bg-primary/20 blur-3xl"
      aria-hidden
    />
  </div>
);

export default AppMockup;
