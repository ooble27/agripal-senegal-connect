import { useState } from "react";
import { Link } from "react-router-dom";
import { ArrowRight, Building2, Check, FileText, Handshake, Headphones, Landmark, Mail, ShieldCheck, User, Wallet } from "lucide-react";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import Reveal from "@/components/Reveal";
import OtcVideo from "@/components/OtcVideo";
import { Button } from "@/components/ui/button";
import { NETWORKS } from "@/components/app/networks";
import { OOBLE_OTC_EMAIL, TRADE_DAILY_MAX_CAD } from "@/lib/config";
import { useOtcVisible } from "@/lib/otc";
import { useLang } from "@/lib/i18n";
import { cn } from "@/lib/utils";

/* Desk OTC : achats et ventes de USDT au-delà de la limite de l'application
   (9 999 $ sur 24 heures). Mise en page propre à cette page : en-tête en
   deux colonnes avec la vidéo de présentation, grille de cartes, frise des
   étapes, cartes « à préparer », questions, bloc final sombre.
   Les demandes arrivent dans la boîte otc@ooble.ca (Admin → Messagerie,
   pastille « OTC »). Le bouton « Demander un prix » (formulaire /app/otc)
   n'apparaît que pour l'équipe Ooble tant que OTC_ENABLED vaut false ; les
   autres écrivent à otc@ooble.ca. */

type Bi = { fr: string; en: string };

const Wrap = ({ children, className = "" }: { children: React.ReactNode; className?: string }) => (
  <div className={`mx-auto max-w-[1200px] px-6 sm:px-10 ${className}`}>{children}</div>
);

const Kicker = ({ children, className }: { children: React.ReactNode; className?: string }) => (
  <p className={cn("text-[12px] uppercase tracking-[0.16em] text-muted-foreground", className)}>{children}</p>
);

const H2 = ({ children, className }: { children: React.ReactNode; className?: string }) => (
  <h2 className={cn("font-display text-[2rem] leading-[1.05] tracking-[-0.045em] sm:text-[2.6rem] lg:text-[3rem]", className)}>{children}</h2>
);

/** Carte de la grille. */
const Tile = ({ children, className, delay = 0 }: { children: React.ReactNode; className?: string; delay?: number }) => (
  <Reveal delay={delay} className={cn("flex flex-col rounded-[28px] border border-border bg-card p-7 sm:p-8", className)}>
    {children}
  </Reveal>
);

const STEPS: { t: Bi; d: Bi }[] = [
  { t: { fr: "Demande", en: "Request" }, d: { fr: "Achat ou vente, montant, réseau : écrivez au desk.", en: "Buy or sell, amount, network: write to the desk." } },
  { t: { fr: "Vérification", en: "Review" }, d: { fr: "Identité ou entreprise, et origine des fonds.", en: "Identity or business, and source of funds." } },
  { t: { fr: "Prix ferme", en: "Firm price" }, d: { fr: "Garanti pendant la durée indiquée. Vous acceptez ou non.", en: "Guaranteed for the time stated. Accept it or not." } },
  { t: { fr: "Règlement", en: "Settlement" }, d: { fr: "Par virement bancaire, puis envoi des USDT ou des dollars.", en: "By bank transfer, then the USDT or the dollars are sent." } },
  { t: { fr: "Reçu", en: "Receipt" }, d: { fr: "Montants, taux et transaction, par courriel.", en: "Amounts, rate and transaction, by email." } },
];

const NEEDS: { icon: React.ElementType; t: Bi; d: Bi }[] = [
  { icon: ShieldCheck, t: { fr: "Un compte vérifié", en: "A verified account" }, d: { fr: "Identité, ou entreprise pour un compte entreprise.", en: "Identity, or business for a business account." } },
  { icon: FileText, t: { fr: "L'origine des fonds", en: "Source of funds" }, d: { fr: "Relevé bancaire, contrat, facture…", en: "Bank statement, contract, invoice…" } },
  { icon: Wallet, t: { fr: "Pour un achat", en: "To buy" }, d: { fr: "Votre adresse USDT et le réseau.", en: "Your USDT address and network." } },
  { icon: Landmark, t: { fr: "Pour une vente", en: "To sell" }, d: { fr: "Un compte bancaire canadien à votre nom.", en: "A Canadian bank account in your name." } },
];

const FAQ: { q: Bi; a: Bi }[] = [
  {
    q: { fr: "Pourquoi passer par le desk plutôt que par l'app ?", en: "Why use the desk instead of the app?" },
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
    q: { fr: "Comment se fait le paiement ?", en: "How is payment made?" },
    a: {
      fr: "Par virement bancaire, depuis ou vers un compte canadien à votre nom. Interac n'est pas utilisé à ces montants.",
      en: "By bank transfer, from or to a Canadian account in your name. Interac isn't used at these amounts.",
    },
  },
  {
    q: { fr: "Pourquoi demander l'origine des fonds ?", en: "Why ask for the source of funds?" },
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
  const [faqOpen, setFaqOpen] = useState<number | null>(0);
  const mailto = `mailto:${OOBLE_OTC_EMAIL}`;

  /** Appel principal : formulaire pour l'équipe, courriel pour les autres. */
  const Primary = ({ inverted }: { inverted?: boolean }) => (
    <Button
      asChild
      variant={inverted ? "secondary" : "appSolid"}
      shape="rounded"
      size="lg"
      className="px-7"
    >
      {canRequest ? (
        <Link to="/app/otc"><Handshake className="h-4 w-4" strokeWidth={1.8} />{L({ fr: "Demander un prix", en: "Request a quote" })}</Link>
      ) : (
        <a href={mailto}><Mail className="h-4 w-4" strokeWidth={1.8} />{L({ fr: "Écrire au desk", en: "Write to the desk" })}</a>
      )}
    </Button>
  );

  return (
    <div className="ink-neutral app-type min-h-screen bg-background tracking-[-0.015em]">
      <Header />

      <main>
        {/* ===================== EN-TÊTE : texte + vidéo ===================== */}
        <section>
          <Wrap className="grid items-center gap-12 pb-8 pt-14 lg:grid-cols-[0.85fr_1.15fr] lg:gap-14 lg:pt-20">
            <div>
              <span className="animate-up inline-flex items-center gap-2 rounded-full border border-border bg-card py-1.5 pl-1.5 pr-3.5 text-[12.5px] font-medium">
                <span className="rounded-full bg-foreground px-2 py-0.5 text-[11px] font-semibold uppercase tracking-[0.08em] text-background">OTC</span>
                {L({ fr: "Gros volumes de USDT", en: "Large USDT volumes" })}
              </span>
              <h1 className="animate-up mt-6 font-display text-[2.7rem] leading-[0.98] tracking-[-0.05em] [animation-delay:80ms] sm:text-[3.6rem] lg:text-[4.1rem]">
                {L({ fr: "Le desk OTC,", en: "The OTC desk," })}
                <br />
                <span className="text-foreground/35">{L({ fr: "pour vos gros montants.", en: "for your large amounts." })}</span>
              </h1>
              <p className="animate-up mt-6 max-w-[460px] text-[15px] leading-[1.7] text-muted-foreground [animation-delay:160ms] sm:text-[16px]">
                {L({
                  fr: "Achetez ou vendez des USDT à partir de 10 000 $, à un prix ferme, avec un seul interlocuteur de l'équipe Ooble.",
                  en: "Buy or sell USDT from $10,000, at a firm price, with one contact from the Ooble team.",
                })}
              </p>
              <div className="animate-up mt-8 flex flex-wrap gap-3 [animation-delay:240ms]">
                <Primary />
                <Button asChild variant="secondary" shape="rounded" size="lg" className="px-7">
                  <a href="#etapes">{L({ fr: "Les étapes", en: "The steps" })}</a>
                </Button>
              </div>
              <ul className="animate-up mt-9 flex flex-wrap gap-x-6 gap-y-2 text-[13.5px] text-muted-foreground [animation-delay:320ms]">
                {[
                  { fr: "Achat et vente", en: "Buy and sell" },
                  { fr: "Particuliers et entreprises", en: "Individuals and businesses" },
                  { fr: "Français et anglais", en: "French and English" },
                ].map((x) => (
                  <li key={x.fr} className="flex items-center gap-2">
                    <Check className="h-3.5 w-3.5 text-foreground/70" strokeWidth={2.4} />
                    {L(x)}
                  </li>
                ))}
              </ul>
            </div>

            <OtcVideo className="animate-up [animation-delay:200ms]" />
          </Wrap>
        </section>

        {/* ===================== GRILLE ===================== */}
        <section>
          <Wrap className="pt-20 lg:pt-24">
            <Reveal className="mb-8 max-w-[560px]">
              <Kicker>{L({ fr: "Pourquoi le desk", en: "Why the desk" })}</Kicker>
              <H2 className="mt-4">{L({ fr: "Un gros montant mérite un vrai suivi.", en: "A large amount deserves real follow-up." })}</H2>
            </Reveal>

            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {/* Prix ferme — grande carte avec une cotation d'exemple */}
              <Tile className="justify-between sm:col-span-2 lg:row-span-2">
                <div>
                  <p className="font-display text-[1.6rem] tracking-[-0.03em]">{L({ fr: "Un prix ferme", en: "A firm price" })}</p>
                  <p className="mt-2 max-w-[380px] text-[15px] leading-[1.6] text-muted-foreground">
                    {L({ fr: "Garanti pendant la durée indiquée dans la cotation. Vous l'acceptez, ou non, sans engagement.", en: "Guaranteed for the time stated in the quote. Accept it, or not, with no commitment." })}
                  </p>
                </div>
                <div className="mt-8 rounded-[22px] border border-border bg-background p-5 sm:p-6">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">{L({ fr: "Exemple de cotation", en: "Sample quote" })}</p>
                      <p className="mt-3 text-[13px] text-muted-foreground">{L({ fr: "Vous recevez", en: "You receive" })}</p>
                      <p className="mt-1 flex items-center gap-2 whitespace-nowrap font-display text-[1.9rem] leading-none tracking-[-0.05em] sm:gap-2.5 sm:text-[2.6rem]">
                        <img src="/coins/usdt.svg" alt="" className="h-7 w-7 sm:h-9 sm:w-9" />
                        {lang === "en" ? "17,260" : "17 260"} <span className="text-[1rem] font-medium tracking-normal text-muted-foreground">USDT</span>
                      </p>
                      <p className="mt-2 text-[13px] text-muted-foreground">{L({ fr: "pour 25 000 $ CAD · Tron", en: "for $25,000 CAD · Tron" })}</p>
                    </div>
                    <span className="flex h-16 w-16 shrink-0 flex-col items-center justify-center rounded-full border-[3px] border-foreground/80 text-center">
                      <span className="text-[13px] font-semibold tabular-nums">15:00</span>
                    </span>
                  </div>
                  <div className="mt-5 flex items-center justify-between border-t border-border pt-4">
                    <span className="text-[13px] text-muted-foreground">{L({ fr: "Prix garanti", en: "Price guaranteed" })}</span>
                    <span className="rounded-xl bg-foreground px-4 py-2 text-[13px] font-semibold text-background">{L({ fr: "Accepter", en: "Accept" })}</span>
                  </div>
                </div>
              </Tile>

              <Tile delay={80}>
                <p className="text-[13px] text-muted-foreground">{L({ fr: "À partir de", en: "From" })}</p>
                <p className="mt-2 font-display text-[2.6rem] leading-none tracking-[-0.055em]">{L({ fr: "10 000 $", en: "$10,000" })}</p>
                <p className="mt-auto pt-6 text-[14px] leading-[1.55] text-muted-foreground">
                  {L({ fr: `Sous ce montant, l'app suffit : jusqu'à ${TRADE_DAILY_MAX_CAD.toLocaleString("fr-CA")} $ sur 24 h.`, en: `Below that, the app is enough: up to $${TRADE_DAILY_MAX_CAD.toLocaleString("en-CA")} over 24 h.` })}
                </p>
              </Tile>

              <Tile delay={140}>
                <span className="flex h-12 w-12 items-center justify-center rounded-full bg-deep text-white">
                  <Headphones className="h-5 w-5" strokeWidth={1.7} />
                </span>
                <p className="mt-5 font-display text-[1.25rem] tracking-[-0.025em]">{L({ fr: "Un seul interlocuteur", en: "One contact" })}</p>
                <p className="mt-2 text-[14px] leading-[1.55] text-muted-foreground">{L({ fr: "De la demande jusqu'au reçu.", en: "From the request to the receipt." })}</p>
              </Tile>

              <Tile delay={200} className="sm:col-span-2">
                <div className="flex flex-wrap items-center justify-between gap-5">
                  <div>
                    <p className="font-display text-[1.25rem] tracking-[-0.025em]">{L({ fr: "Les mêmes réseaux que l'app", en: "The same networks as the app" })}</p>
                    <p className="mt-1 text-[14px] text-muted-foreground">{NETWORKS.map((n) => n.name).join(" · ")}</p>
                  </div>
                  <div className="flex -space-x-2">
                    {NETWORKS.map((n) => (
                      <img key={n.id} src={`/coins/${n.id}.svg`} alt="" className="h-10 w-10 rounded-full ring-[3px] ring-card" />
                    ))}
                  </div>
                </div>
              </Tile>

              <Tile delay={260} className="sm:col-span-2">
                <p className="font-display text-[1.25rem] tracking-[-0.025em]">{L({ fr: "En une seule fois", en: "In one go" })}</p>
                <p className="mt-2 max-w-[420px] text-[14px] leading-[1.55] text-muted-foreground">
                  {L({ fr: "Plus besoin de découper votre opération sur plusieurs jours : le desk traite le montant entier.", en: "No need to split your trade over several days: the desk handles the full amount." })}
                </p>
              </Tile>

              <Tile delay={320} className="sm:col-span-2">
                <div className="flex items-center gap-3">
                  <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-secondary text-foreground/70"><User className="h-[18px] w-[18px]" strokeWidth={1.7} /></span>
                  <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-secondary text-foreground/70"><Building2 className="h-[18px] w-[18px]" strokeWidth={1.7} /></span>
                </div>
                <p className="mt-5 font-display text-[1.25rem] tracking-[-0.025em]">{L({ fr: "Particuliers et entreprises", en: "Individuals and businesses" })}</p>
                <p className="mt-2 max-w-[420px] text-[14px] leading-[1.55] text-muted-foreground">
                  {L({ fr: "Épargne, trésorerie, paiements fournisseurs : un dossier vérifié suffit.", en: "Savings, treasury, supplier payments: one verified file is enough." })}
                </p>
              </Tile>
            </div>
          </Wrap>
        </section>

        {/* ===================== ÉTAPES (frise) ===================== */}
        <section id="etapes" className="scroll-mt-24">
          <Wrap className="pt-24 lg:pt-28">
            <Reveal className="mb-12 flex flex-col justify-between gap-5 sm:flex-row sm:items-end">
              <div>
                <Kicker>{L({ fr: "Les étapes", en: "The steps" })}</Kicker>
                <H2 className="mt-4">{L({ fr: "De la demande au reçu.", en: "From request to receipt." })}</H2>
              </div>
              <p className="max-w-[300px] text-[15px] leading-[1.6] text-muted-foreground">
                {L({ fr: "Vous voyez le prix avant de vous engager. Rien ne bouge sans votre accord.", en: "You see the price before you commit. Nothing moves without your approval." })}
              </p>
            </Reveal>

            <ol className="relative grid gap-8 lg:grid-cols-5 lg:gap-6">
              {/* Ligne de la frise (grand écran) */}
              <span aria-hidden className="absolute left-0 right-0 top-[19px] hidden h-px bg-border lg:block" />
              {/* Ligne verticale (mobile) */}
              <span aria-hidden className="absolute bottom-2 left-[19px] top-2 w-px bg-border lg:hidden" />
              {STEPS.map((s, i) => (
                <Reveal key={s.t.fr} delay={i * 90} className="relative grid grid-cols-[40px_1fr] gap-x-4 lg:block">
                  <span className="relative z-10 flex h-10 w-10 items-center justify-center rounded-full border border-border bg-background font-display text-[14px] tabular-nums">
                    {i + 1}
                  </span>
                  <div className="lg:mt-6 lg:pr-4">
                    <p className="font-display text-[1.2rem] tracking-[-0.025em]">{L(s.t)}</p>
                    <p className="mt-2 text-[14px] leading-[1.6] text-muted-foreground">{L(s.d)}</p>
                  </div>
                </Reveal>
              ))}
            </ol>
          </Wrap>
        </section>

        {/* ===================== À PRÉPARER ===================== */}
        <section>
          <Wrap className="pt-24 lg:pt-28">
            <div className="grid gap-10 lg:grid-cols-[0.8fr_1.2fr] lg:gap-14">
              <Reveal>
                <Kicker>{L({ fr: "Avant de commencer", en: "Before you start" })}</Kicker>
                <H2 className="mt-4">{L({ fr: "Un dossier clair, une réponse plus rapide.", en: "A clear file, a quicker answer." })}</H2>
                <p className="mt-6 max-w-[380px] text-[14px] leading-[1.7] text-muted-foreground">
                  {L({
                    fr: "Comme toute entreprise de services monétaires au Canada, nous vérifions l'identité et l'origine des fonds, et déclarons à CANAFE les opérations prévues par la loi.",
                    en: "Like every money services business in Canada, we verify identity and the source of funds, and report to FINTRAC the transactions required by law.",
                  })}
                </p>
              </Reveal>
              <div className="grid gap-4 sm:grid-cols-2">
                {NEEDS.map(({ icon: Icon, t, d }, i) => (
                  <Reveal key={t.fr} delay={i * 80} className="rounded-[24px] bg-secondary p-6">
                    <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-background text-foreground/75">
                      <Icon className="h-5 w-5" strokeWidth={1.7} />
                    </span>
                    <p className="mt-5 font-display text-[1.1rem] tracking-[-0.02em]">{L(t)}</p>
                    <p className="mt-1.5 text-[14px] leading-[1.55] text-muted-foreground">{L(d)}</p>
                  </Reveal>
                ))}
              </div>
            </div>
          </Wrap>
        </section>

        {/* ===================== QUESTIONS ===================== */}
        <section>
          <Wrap className="pt-24 lg:pt-28">
            <div className="grid gap-10 lg:grid-cols-[0.8fr_1.2fr] lg:gap-14">
              <Reveal>
                <Kicker>{L({ fr: "Questions", en: "Questions" })}</Kicker>
                <H2 className="mt-4">{L({ fr: "Ce qu'on nous demande.", en: "What people ask us." })}</H2>
                <a href={mailto} className="mt-6 inline-flex items-center gap-2 text-[15px] font-medium underline-offset-4 hover:underline">
                  <Mail className="h-4 w-4" strokeWidth={1.8} /> {OOBLE_OTC_EMAIL}
                </a>
              </Reveal>
              <div className="flex flex-col gap-3">
                {FAQ.map((item, i) => {
                  const open = faqOpen === i;
                  return (
                    <Reveal key={item.q.fr} delay={i * 60} className={cn("rounded-[22px] border border-border transition-colors", open ? "bg-card" : "bg-transparent")}>
                      <button
                        onClick={() => setFaqOpen(open ? null : i)}
                        aria-expanded={open}
                        className="flex w-full items-center justify-between gap-6 px-6 py-5 text-left"
                      >
                        <span className="font-display text-[16px] tracking-[-0.02em] sm:text-[18px]">{L(item.q)}</span>
                        <span className={cn("flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-secondary text-[18px] leading-none text-foreground/60 transition-transform", open && "rotate-45")} aria-hidden>
                          +
                        </span>
                      </button>
                      {open && <p className="-mt-1 px-6 pb-6 text-[15px] leading-[1.7] text-muted-foreground">{L(item.a)}</p>}
                    </Reveal>
                  );
                })}
              </div>
            </div>
          </Wrap>
        </section>

        {/* ===================== BLOC FINAL ===================== */}
        <section>
          <Wrap className="pb-6 pt-24 lg:pt-28">
            <Reveal className="flex flex-col gap-8 rounded-[32px] bg-foreground px-8 py-12 text-background sm:px-12 sm:py-14 lg:flex-row lg:items-end lg:justify-between">
              <div>
                <p className="text-[12px] uppercase tracking-[0.16em] text-background/55">{L({ fr: "Joindre le desk", en: "Contact the desk" })}</p>
                <h2 className="mt-4 font-display text-[2.2rem] leading-[1.02] tracking-[-0.05em] sm:text-[3rem]">
                  {L({ fr: "Parlons de", en: "Let's talk about" })}
                  <br />
                  <span className="text-background/50">{L({ fr: "votre opération.", en: "your trade." })}</span>
                </h2>
                <a href={mailto} className="mt-6 inline-flex items-center gap-2 text-[17px] font-medium underline-offset-4 hover:underline sm:text-[19px]">
                  {OOBLE_OTC_EMAIL} <ArrowRight className="h-4 w-4" strokeWidth={1.8} />
                </a>
              </div>
              <div className="flex flex-wrap gap-3">
                <Primary inverted />
              </div>
            </Reveal>
          </Wrap>
        </section>
      </main>

      <Footer />
    </div>
  );
};

export default OTC;
