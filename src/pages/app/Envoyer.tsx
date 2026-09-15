import { Link } from "react-router-dom";
import { Send, Handshake } from "lucide-react";
import AppShell from "@/components/app/AppShell";
import { Button } from "@/components/ui/button";
import { T } from "@/lib/i18n";

const Envoyer = () => (
  <AppShell
    header={
      <div>
        <h1 className="font-display text-3xl font-semibold tracking-tight"><T en="Send & OTC">Envoyer & OTC</T></h1>
        <p className="mt-1 text-[15px] text-muted-foreground"><T en="Transfers and large volumes">Transferts et gros volumes</T></p>
      </div>
    }
  >
    <div className="rounded-2xl border border-border bg-card p-8">
      <div className="flex flex-col items-center py-6 text-center">
        <span className="flex h-16 w-16 items-center justify-center rounded-2xl bg-secondary text-foreground/70">
          <Send className="h-7 w-7" strokeWidth={1.7} />
        </span>
        <p className="mt-5 font-display text-xl font-bold"><T en="Coming soon">Bientôt disponible</T></p>
        <p className="mt-2 max-w-xs text-sm leading-relaxed text-muted-foreground">
          <T en="Wallet-to-wallet USDT transfers and the OTC desk for large volumes are coming soon.">
            L'envoi de USDT entre wallets et le desk OTC pour les gros volumes arrivent prochainement.
          </T>
        </p>
      </div>
    </div>

    <div className="mt-3 flex items-center gap-3 rounded-2xl border border-border bg-secondary/40 px-4 py-3.5 text-sm text-muted-foreground">
      <Handshake className="h-5 w-5 shrink-0" strokeWidth={1.9} />
      <span><T en="Have a large volume to process? Write to us, we'll handle it manually.">Un gros volume à traiter ? Écrivez-nous, on s'en occupe à la main.</T></span>
    </div>

    <Button variant="appPrimary" shape="soft" size="lg" className="mt-6 w-full" asChild>
      <Link to="/app/acheter"><T en="Buy USDT">Acheter des USDT</T></Link>
    </Button>
  </AppShell>
);

export default Envoyer;
