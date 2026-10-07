import { Link } from "react-router-dom";
import { ArrowRight, Building2, Clock, Mail, Wallet } from "lucide-react";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { NETWORKS } from "@/components/app/networks";
import { OOBLE_OTC_EMAIL, TRADE_DAILY_MAX_CAD } from "@/lib/config";
import { useOtcVisible } from "@/lib/otc";
import { T, useLang } from "@/lib/i18n";

/* Desk OTC : achats et ventes de USDT au-delà de la limite de l'application
   (9 999 $ sur 24 heures). Les demandes arrivent dans la boîte
   otc@ooble.ca (Admin → Messagerie, pastille « OTC »).
   La page est publique. Le bouton « Demander un prix » (formulaire
   /app/otc) n'apparaît que pour l'équipe Ooble tant que OTC_ENABLED vaut
   false ; les autres écrivent à otc@ooble.ca. */

type Bi = { fr: string; en: string };

const FACTS: { icon: React.ElementType; k: Bi; v: Bi | null }[] = [
  { icon: Mail, k: { fr: "Courriel", en: "Email" }, v: null },
  { icon: Wallet, k: { fr: "Volume", en: "Volume" }, v: { fr: "À partir de 10 000 $", en: "From $10,000" } },
  { icon: Clock, k: { fr: "Réponse", en: "Reply" }, v: { fr: "Sous 1 jour ouvrable", en: "Within 1 business day" } },
  { icon: Building2, k: { fr: "Pour", en: "For" }, v: { fr: "Particuliers et entreprises", en: "Individuals and businesses" } },
];

const STEPS: { t: Bi; d: Bi }[] = [
  {
    t: { fr: "Vous faites une demande", en: "You send a request" },
    d: {
      fr: "Écrivez au desk : achat ou vente, montant, réseau. Un membre du desk vous répond personnellement.",
      en: "Write to the desk: buy or sell, amount, network. A member of the desk replies to you personally.",
    },
  },
  {
    t: { fr: "Nous vérifions le dossier", en: "We review your file" },
    d: {
      fr: "Identité ou entreprise, et origine des fonds. Si votre compte est déjà vérifié, il ne reste en général qu'un justificatif à fournir.",
      en: "Identity or business, and source of funds. If your account is already verified, usually only one supporting document is left.",
    },
  },
  {
    t: { fr: "Vous recevez un prix ferme", en: "You get a firm price" },
    d: {
      fr: "Un taux tout compris, sans frais ajoutés, garanti pendant la durée indiquée dans la cotation. Vous l'acceptez ou non, sans engagement.",
      en: "An all-in rate, no added fees, guaranteed for the time stated in the quote. Accept it or not, with no commitment.",
    },
  },
  {
    t: { fr: "Règlement", en: "Settlement" },
    d: {
      fr: "Achat : vous payez par virement bancaire, nous envoyons les USDT à votre adresse. Vente : vous envoyez les USDT à l'adresse indiquée, nous virons les dollars sur votre compte.",
      en: "Buy: you pay by bank transfer, we send the USDT to your address. Sell: you send the USDT to the address provided, we wire the dollars to your account.",
    },
  },
  {
    t: { fr: "Confirmation", en: "Confirmation" },
    d: {
      fr: "Un reçu détaillé par courriel : montants, taux, transaction sur la blockchain.",
      en: "A detailed receipt by email: amounts, rate, blockchain transaction.",
    },
  },
];

const NEEDS: Bi[] = [
  { fr: "Un compte Ooble vérifié (identité, ou entreprise pour un compte entreprise).", en: "A verified Ooble account (identity, or business for a business account)." },
  { fr: "Un justificatif de l'origine des fonds : relevé bancaire, contrat, facture…", en: "Proof of the source of funds: bank statement, contract, invoice…" },
  { fr: "Pour un achat : votre adresse USDT et le réseau.", en: "To buy: your USDT address and network." },
  { fr: "Pour une vente : le compte bancaire canadien qui recevra les fonds, à votre nom.", en: "To sell: the Canadian bank account, in your name, that will receive the funds." },
];

const FAQ: { q: Bi; a: Bi }[] = [
  {
    q: { fr: "Pourquoi passer par le desk ?", en: "Why use the desk?" },
    a: {
      fr: `Dans l'application, achats et ventes sont limités à ${TRADE_DAILY_MAX_CAD.toLocaleString("fr-CA")} $ sur 24 heures. Au-delà, le desk traite votre opération en une fois, avec un prix ferme.`,
      en: `In the app, purchases and sales are limited to $${TRADE_DAILY_MAX_CAD.toLocaleString("en-CA")} over 24 hours. Above that, the desk handles your trade in one go, at a firm price.`,
    },
  },
  {
    q: { fr: "Le prix peut-il changer ?", en: "Can the price change?" },
    a: {
      fr: "Non, pas pendant la durée de validité indiquée dans la cotation. Passé ce délai, nous vous proposons un nouveau prix.",
      en: "No, not during the validity period stated in the quote. After that, we send you a new price.",
    },
  },
  {
    q: { fr: "Quels réseaux ?", en: "Which networks?" },
    a: {
      fr: `Les mêmes que dans l'application : ${NETWORKS.map((n) => `${n.name} (${n.tag})`).join(", ")}.`,
      en: `The same as in the app: ${NETWORKS.map((n) => `${n.name} (${n.tag})`).join(", ")}.`,
    },
  },
  {
    q: { fr: "Pourquoi vous demandez l'origine des fonds ?", en: "Why do you ask for the source of funds?" },
    a: {
      fr: "Comme toute entreprise de services monétaires au Canada, nous vérifions l'identité de nos clients et l'origine des fonds, et déclarons à CANAFE les opérations prévues par la loi.",
      en: "Like every money services business in Canada, we verify our clients' identity and the source of funds, and report to FINTRAC the transactions required by law.",
    },
  },
];

const OTC = () => {
  const [lang] = useLang();
  const L = (b: Bi) => b[lang];
  const canRequest = useOtcVisible();

  return (
    <div className="ink-neutral app-type min-h-screen bg-background tracking-[-0.015em]">
      <Header />

      <main className="mx-auto max-w-[1200px] px-6 sm:px-10">
        {/* En-tête */}
        <section className="grid gap-10 pt-14 lg:grid-cols-[1.15fr_0.85fr] lg:items-end lg:pt-20">
          <div>
            <p className="text-[12px] uppercase tracking-[0.16em] text-muted-foreground">
              <T en="OTC desk · Large volumes">Desk OTC · Gros volumes</T>
            </p>
            <h1 className="mt-5 font-display text-[2.7rem] leading-[0.98] tracking-[-0.05em] sm:text-[3.8rem] lg:text-[4.5rem]">
              <T en="Over $10,000?">Plus de 10 000 $ ?</T>
              <br />
              <span className="text-foreground/35"><T en="One firm price.">Un prix ferme.</T></span>
            </h1>
          </div>
          <div>
            <p className="max-w-[440px] text-[16px] leading-[1.7] text-muted-foreground">
              <T en="For USDT purchases and sales of $10,000 or more, our desk gives you a firm price and handles your trade from start to finish, with one contact at Ooble.">
                Pour vos achats et ventes de USDT de 10 000 $ et plus, notre desk vous donne un prix ferme et suit votre opération du début à la fin, avec un seul interlocuteur chez Ooble.
              </T>
            </p>
            <div className="mt-7 flex flex-wrap gap-3">
              {canRequest && (
                <Button asChild variant="appSolid" shape="rounded" size="default" className="px-6">
                  <Link to="/app/otc"><T en="Request a quote">Demander un prix</T> <ArrowRight className="h-4 w-4" /></Link>
                </Button>
              )}
              <Button asChild variant={canRequest ? "secondary" : "appSolid"} shape="rounded" size="default" className="px-6">
                <a href={`mailto:${OOBLE_OTC_EMAIL}`}>
                  {canRequest ? OOBLE_OTC_EMAIL : <><T en="Write to the desk">Écrire au desk</T> <ArrowRight className="h-4 w-4" /></>}
                </a>
              </Button>
            </div>
          </div>
        </section>

        {/* Repères */}
        <section className="pt-14 lg:pt-16">
          <div className="grid sm:grid-cols-2 lg:grid-cols-4">
            {FACTS.map(({ icon: Icon, k, v }) => (
              <div key={k.fr} className="flex items-start gap-4 border-t py-6 pr-6">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-secondary text-foreground/70">
                  <Icon className="h-[18px] w-[18px]" strokeWidth={1.6} />
                </span>
                <div className="min-w-0">
                  <p className="text-[12px] text-muted-foreground">{L(k)}</p>
                  <p className="mt-1 font-display text-[15px] tracking-[-0.02em]">
                    {v ? L(v) : <a href={`mailto:${OOBLE_OTC_EMAIL}`} className="hover:underline">{OOBLE_OTC_EMAIL}</a>}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Comment ça marche */}
        <section className="pt-20 lg:pt-24">
          <div className="grid gap-10 lg:grid-cols-[0.8fr_1.2fr] lg:gap-16">
            <div>
              <h2 className="font-display text-[1.9rem] leading-[1.06] tracking-[-0.04em] sm:text-[2.4rem]">
                <T en="How it works">Comment ça marche</T>
              </h2>
              <p className="mt-5 max-w-[340px] text-[15px] leading-[1.6] text-muted-foreground">
                <T en="Five steps, one contact. You see the price before you commit to anything.">
                  Cinq étapes, un seul interlocuteur. Vous voyez le prix avant de vous engager.
                </T>
              </p>
            </div>
            <ol className="border-t">
              {STEPS.map((s, i) => (
                <li key={s.t.fr} className="grid grid-cols-[2.5rem_1fr] gap-x-4 border-b py-6">
                  <span className="font-display text-[15px] tabular-nums text-muted-foreground">{String(i + 1).padStart(2, "0")}</span>
                  <div>
                    <h3 className="font-display text-[1.15rem] tracking-[-0.02em]">{L(s.t)}</h3>
                    <p className="mt-2 max-w-[560px] text-[15px] leading-[1.6] text-muted-foreground">{L(s.d)}</p>
                  </div>
                </li>
              ))}
            </ol>
          </div>
        </section>

        {/* À préparer */}
        <section className="pt-20 lg:pt-24">
          <div className="grid gap-10 lg:grid-cols-[0.8fr_1.2fr] lg:gap-16">
            <h2 className="font-display text-[1.9rem] leading-[1.06] tracking-[-0.04em] sm:text-[2.4rem]">
              <T en="What to prepare">Ce qu'il faut préparer</T>
            </h2>
            <ul className="border-t">
              {NEEDS.map((n) => (
                <li key={n.fr} className="flex gap-4 border-b py-5 text-[15px] leading-[1.6]">
                  <span className="mt-[0.6em] h-1.5 w-1.5 shrink-0 rounded-full bg-foreground/40" />
                  {L(n)}
                </li>
              ))}
            </ul>
          </div>
        </section>

        {/* Questions */}
        <section className="pt-20 lg:pt-24">
          <div className="grid gap-10 lg:grid-cols-[0.8fr_1.2fr] lg:gap-16">
            <h2 className="font-display text-[1.9rem] leading-[1.06] tracking-[-0.04em] sm:text-[2.4rem]">
              <T en="Questions">Questions</T>
            </h2>
            <div className="border-t">
              {FAQ.map((f) => (
                <div key={f.q.fr} className="border-b py-6">
                  <h3 className="font-display text-[1.1rem] tracking-[-0.02em]">{L(f.q)}</h3>
                  <p className="mt-2 max-w-[600px] text-[15px] leading-[1.6] text-muted-foreground">{L(f.a)}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Nous joindre */}
        <section className="pt-20 lg:pt-24">
          <div className="flex flex-col gap-6 rounded-3xl bg-secondary px-7 py-10 sm:px-12 sm:py-12 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <p className="text-[12px] uppercase tracking-[0.16em] text-muted-foreground"><T en="Contact the desk">Joindre le desk</T></p>
              <a href={`mailto:${OOBLE_OTC_EMAIL}`} className="mt-3 block font-display text-[2rem] tracking-[-0.04em] hover:underline sm:text-[2.6rem]">
                {OOBLE_OTC_EMAIL}
              </a>
              <p className="mt-2 text-[15px] text-muted-foreground">
                {canRequest ? (
                  <T en="Or send your request from your Ooble account: it's faster, your file is already there.">
                    Ou envoyez votre demande depuis votre espace Ooble : c'est plus rapide, votre dossier y est déjà.
                  </T>
                ) : (
                  <T en="Tell us the side, the amount and the network: a member of the desk replies personally.">
                    Indiquez le sens, le montant et le réseau : un membre du desk vous répond personnellement.
                  </T>
                )}
              </p>
            </div>
            {canRequest && (
              <Button asChild variant="appSolid" shape="rounded" size="default" className="shrink-0 self-start px-6 lg:self-auto">
                <Link to="/app/otc"><T en="Request a quote">Demander un prix</T> <ArrowRight className="h-4 w-4" /></Link>
              </Button>
            )}
          </div>
        </section>

        <div className="pt-16" />
      </main>

      <Footer />
    </div>
  );
};

export default OTC;
