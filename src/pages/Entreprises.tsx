import { useState } from "react";
import { Link } from "react-router-dom";
import { ArrowRight, Building2, Check, FileText, Handshake, Users } from "lucide-react";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import Reveal from "@/components/Reveal";
import OtcVideo from "@/components/OtcVideo";
import { Button } from "@/components/ui/button";
import { NETWORKS } from "@/components/app/networks";
import { TRADE_DAILY_MAX_CAD } from "@/lib/config";
import { useLang } from "@/lib/i18n";
import { cn } from "@/lib/utils";

/* Ooble pour les entreprises : page publique. Même famille que la page OTC
   (en-tête en deux colonnes avec la vidéo, mise en page ouverte, sans
   cartes) : les usages, l'ouverture du compte en bande noire, ce qu'on vous
   demande, les montants, les questions et l'appel final.
   Les durées citées reprennent celles affichées dans l'app (vérification en
   environ 5 minutes, examen généralement sous 1 jour ouvrable). */

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

const USES: { w: Bi; d: Bi }[] = [
  { w: { fr: "Payer", en: "Pay" }, d: { fr: "Réglez vos fournisseurs à l'étranger en USDT, achetés en dollars canadiens.", en: "Pay suppliers abroad in USDT, bought with Canadian dollars." } },
  { w: { fr: "Encaisser", en: "Get paid" }, d: { fr: "Vos clients vous paient en USDT ? Vendez-les et recevez des dollars par Interac.", en: "Clients pay you in USDT? Sell it and receive dollars by Interac." } },
  { w: { fr: "Gérer", en: "Manage" }, d: { fr: "Tout se fait au nom de la société, avec un historique clair de chaque opération.", en: "Everything is in the company's name, with a clear history of every trade." } },
];

const STEPS: { t: Bi; d: Bi }[] = [
  { t: { fr: "Ouvrez le compte", en: "Open the account" }, d: { fr: "Raison sociale, numéro d'entreprise et personne responsable.", en: "Business name, business number and contact person." } },
  { t: { fr: "Vérifiez l'entreprise", en: "Verify the business" }, d: { fr: "Depuis votre espace, en environ 5 minutes : informations, personnes, documents.", en: "From your dashboard, in about 5 minutes: details, people, documents." } },
  { t: { fr: "Examen du dossier", en: "File review" }, d: { fr: "Notre équipe conformité vous répond, généralement sous 1 jour ouvrable.", en: "Our compliance team replies, usually within 1 business day." } },
  { t: { fr: "Achetez et vendez", en: "Buy and sell" }, d: { fr: "Payez par Interac, recevez vos USDT sur le réseau de votre choix.", en: "Pay by Interac, receive your USDT on the network of your choice." } },
];

const ASK: { icon: React.ElementType; t: Bi; items: Bi[] }[] = [
  {
    icon: Building2, t: { fr: "L'entreprise", en: "The business" },
    items: [
      { fr: "Raison sociale et lieu d'immatriculation", en: "Legal name and place of registration" },
      { fr: "Numéro d'entreprise (NEQ ou BN)", en: "Business number (NEQ or BN)" },
      { fr: "Adresse du siège", en: "Head office address" },
      { fr: "Activité principale", en: "Main activity" },
    ],
  },
  {
    icon: Users, t: { fr: "Les personnes", en: "The people" },
    items: [
      { fr: "Chaque administrateur", en: "Every director" },
      { fr: "Chaque propriétaire de 25 % ou plus", en: "Every owner of 25% or more" },
      { fr: "Nom, date de naissance, pays de résidence", en: "Name, date of birth, country of residence" },
    ],
  },
  {
    icon: FileText, t: { fr: "Les documents", en: "The documents" },
    items: [
      { fr: "Certificat ou statuts de constitution", en: "Certificate or articles of incorporation" },
      { fr: "Registre des administrateurs (REQ ou Corporations Canada)", en: "Register of directors (REQ or Corporations Canada)" },
      { fr: "Preuve d'adresse de moins de 3 mois", en: "Proof of address under 3 months old" },
    ],
  },
];

const FAQ: { q: Bi; a: Bi }[] = [
  {
    q: { fr: "Pourquoi vérifier l'entreprise ?", en: "Why verify the business?" },
    a: {
      fr: "La loi canadienne nous demande de connaître l'entreprise et les personnes qui la dirigent ou la détiennent avant le premier échange. C'est obligatoire, une seule fois.",
      en: "Canadian law requires us to know the business and the people who run or own it before the first trade. It's mandatory, and done once.",
    },
  },
  {
    q: { fr: "Combien de temps faut-il ?", en: "How long does it take?" },
    a: {
      fr: "Environ 5 minutes pour remplir le dossier depuis votre espace. Notre équipe l'examine ensuite, généralement sous 1 jour ouvrable, et vous répond par courriel.",
      en: "About 5 minutes to fill in the file from your dashboard. Our team then reviews it, usually within 1 business day, and replies by email.",
    },
  },
  {
    q: { fr: "Y a-t-il des limites ?", en: "Are there limits?" },
    a: {
      fr: `Dans l'application, achats et ventes sont limités à ${TRADE_DAILY_MAX_CAD.toLocaleString("fr-CA")} $ chacun sur 24 heures. Au-delà, le desk OTC traite l'opération en une fois, avec un prix ferme.`,
      en: `In the app, purchases and sales are limited to $${TRADE_DAILY_MAX_CAD.toLocaleString("en-CA")} each over 24 hours. Above that, the OTC desk handles the trade in one go, at a firm price.`,
    },
  },
  {
    q: { fr: "Mes documents sont-ils protégés ?", en: "Are my documents protected?" },
    a: {
      fr: "Oui. Ils sont chiffrés et seule notre équipe conformité y a accès.",
      en: "Yes. They're encrypted and only our compliance team can access them.",
    },
  },
];

const Entreprises = () => {
  const [lang] = useLang();
  const L = (b: Bi) => b[lang];
  const [faqOpen, setFaqOpen] = useState<number | null>(0);

  const Open = ({ className }: { className?: string }) => (
    <Button asChild variant="appSolid" shape="rounded" size="lg" className={cn("px-7", className)}>
      <Link to="/inscription/entreprise">
        <Building2 className="h-4 w-4" strokeWidth={1.8} />
        {L({ fr: "Ouvrir un compte entreprise", en: "Open a business account" })}
      </Link>
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
              <p className="animate-up text-[12px] uppercase tracking-[0.16em] text-muted-foreground">
                {L({ fr: "Ooble pour les entreprises", en: "Ooble for business" })}
              </p>
              <h1 className="animate-up mt-6 font-display text-[2.6rem] leading-[1] tracking-[-0.05em] [animation-delay:80ms] sm:text-[3.3rem] lg:text-[3.5rem]">
                {L({ fr: "Vos USDT,", en: "Your USDT," })}
                <br />
                <span className="text-foreground/35">{L({ fr: "au nom de votre entreprise.", en: "in your company's name." })}</span>
              </h1>
              <p className="animate-up mt-6 max-w-[470px] text-[15px] leading-[1.7] text-muted-foreground [animation-delay:160ms] sm:text-[16px]">
                {L({
                  fr: "Un compte entreprise pour acheter et vendre des USDT en dollars canadiens, payer vos fournisseurs et encaisser vos clients, avec une vérification faite une seule fois.",
                  en: "A business account to buy and sell USDT with Canadian dollars, pay suppliers and get paid by clients, with a verification done once.",
                })}
              </p>
              <div className="animate-up mt-8 flex flex-wrap items-center gap-x-7 gap-y-4 [animation-delay:240ms]">
                <Open />
                <a href="#ouvrir" className="inline-flex items-center gap-1.5 text-[15px] font-medium underline-offset-4 hover:underline">
                  {L({ fr: "Comment ça marche", en: "How it works" })} <ArrowRight className="h-4 w-4" strokeWidth={1.8} />
                </a>
              </div>
              <ul className="animate-up mt-9 flex flex-wrap gap-x-6 gap-y-2 text-[13.5px] text-muted-foreground [animation-delay:320ms]">
                {[
                  { fr: "Vérification en 5 minutes", en: "Verification in 5 minutes" },
                  { fr: "Paiement par Interac", en: "Interac payments" },
                  { fr: "6 réseaux", en: "6 networks" },
                ].map((x) => (
                  <li key={x.fr} className="flex items-center gap-2">
                    <Check className="h-3.5 w-3.5 text-foreground/70" strokeWidth={2.4} />
                    {L(x)}
                  </li>
                ))}
              </ul>
            </div>

            <OtcVideo
              name="biz"
              label={{ fr: "Ooble pour les entreprises en vidéo", en: "Ooble for business, the video" }}
              className="animate-up [animation-delay:200ms]"
            />
          </Wrap>
        </section>

        {/* ===================== USAGES ===================== */}
        <section>
          <Wrap className="pt-28 lg:pt-36">
            <Reveal>
              <Kicker>{L({ fr: "Pour quoi faire", en: "What for" })}</Kicker>
              <H2 className="mt-4 max-w-[760px]">
                {L({ fr: "Ce que votre entreprise", en: "What your business" })}{" "}
                <span className="text-foreground/35">{L({ fr: "fait avec Ooble.", en: "does with Ooble." })}</span>
              </H2>
            </Reveal>
            <div className="mt-14 grid gap-12 md:grid-cols-3 md:gap-10">
              {USES.map((u, i) => (
                <Reveal key={u.w.fr} delay={i * 100}>
                  <p className="font-display text-[3rem] leading-none tracking-[-0.055em] sm:text-[3.6rem]">
                    {L(u.w)}<span className="text-[#26a17b]">.</span>
                  </p>
                  <p className="mt-5 max-w-[320px] text-[15px] leading-[1.7] text-muted-foreground">{L(u.d)}</p>
                </Reveal>
              ))}
            </div>
          </Wrap>
        </section>

        {/* ===================== OUVRIR (bande noire) ===================== */}
        <section id="ouvrir" data-dark className="mt-28 scroll-mt-24 bg-foreground text-background lg:mt-36">
          <Wrap className="py-20 lg:py-24">
            <Reveal className="flex flex-col justify-between gap-6 sm:flex-row sm:items-end">
              <div>
                <p className="text-[12px] uppercase tracking-[0.16em] text-background/55">{L({ fr: "Ouvrir un compte entreprise", en: "Open a business account" })}</p>
                <h2 className="mt-4 font-display text-[2rem] leading-[1.05] tracking-[-0.045em] sm:text-[2.6rem] lg:text-[3rem]">
                  {L({ fr: "Quatre étapes,", en: "Four steps," })} <span className="text-background/45">{L({ fr: "une seule fois.", en: "done once." })}</span>
                </h2>
              </div>
              <p className="max-w-[300px] text-[15px] leading-[1.6] text-background/60">
                {L({ fr: "Une fois l'entreprise vérifiée, vous achetez et vendez quand vous voulez.", en: "Once the business is verified, you buy and sell whenever you want." })}
              </p>
            </Reveal>

            <ol className="mt-14 grid sm:grid-cols-2 lg:grid-cols-4">
              {STEPS.map((s, i) => (
                <Reveal
                  key={s.t.fr}
                  delay={i * 90}
                  className="border-t border-background/15 py-7 sm:pr-8 lg:border-l lg:border-t-0 lg:px-6 lg:py-2 lg:first:border-l-0 lg:first:pl-0"
                >
                  <p className="font-display text-[3.4rem] leading-none tracking-[-0.06em] text-background/25">{i + 1}</p>
                  <h3 className="mt-5 text-[16px] font-semibold tracking-[-0.015em]">{L(s.t)}</h3>
                  <p className="mt-2 text-[14px] leading-[1.6] text-background/60">{L(s.d)}</p>
                </Reveal>
              ))}
            </ol>
          </Wrap>
        </section>

        {/* ===================== CE QU'ON VOUS DEMANDE ===================== */}
        <section>
          <Wrap className="pt-24 lg:pt-28">
            <Reveal className="max-w-[640px]">
              <Kicker>{L({ fr: "Ce qu'on vous demande", en: "What we ask for" })}</Kicker>
              <H2 className="mt-4">{L({ fr: "Un dossier simple, préparé d'avance.", en: "A simple file, ready in advance." })}</H2>
            </Reveal>
            <div className="mt-14 grid gap-12 md:grid-cols-3 md:gap-10">
              {ASK.map(({ icon: Icon, t, items }, i) => (
                <Reveal key={t.fr} delay={i * 90}>
                  <div className="flex items-center gap-3">
                    <Icon className="h-6 w-6 text-foreground/70" strokeWidth={1.5} />
                    <p className="font-display text-[1.25rem] tracking-[-0.025em]">{L(t)}</p>
                  </div>
                  <ul className="mt-5 space-y-3">
                    {items.map((it) => (
                      <li key={it.fr} className="flex gap-3 text-[14.5px] leading-[1.55] text-muted-foreground">
                        <Check className="mt-1 h-3.5 w-3.5 shrink-0 text-[#26a17b]" strokeWidth={2.6} />
                        {L(it)}
                      </li>
                    ))}
                  </ul>
                </Reveal>
              ))}
            </div>
            <Reveal delay={200}>
              <p className="mt-12 text-[13.5px] text-muted-foreground">
                {L({ fr: "Vos documents sont chiffrés et seule notre équipe conformité y a accès.", en: "Your documents are encrypted and only our compliance team can access them." })}
              </p>
            </Reveal>
          </Wrap>
        </section>

        {/* ===================== MONTANTS ===================== */}
        <section>
          <Wrap className="pt-24 lg:pt-32">
            <div className="grid gap-10 lg:grid-cols-2 lg:items-end lg:gap-16">
              <Reveal>
                <p className="text-[15px] text-muted-foreground">{L({ fr: "Dans l'application, jusqu'à", en: "In the app, up to" })}</p>
                <p className="mt-2 font-display text-[4.2rem] leading-[0.9] tracking-[-0.06em] sm:text-[6rem] lg:text-[7.2rem]">
                  {L({ fr: "9 999 $", en: "$9,999" })}
                </p>
                <p className="mt-3 text-[15px] text-muted-foreground">{L({ fr: "à l'achat et à la vente, chacun sur 24 heures.", en: "to buy and to sell, each over 24 hours." })}</p>
              </Reveal>
              <Reveal delay={120} className="lg:pb-3">
                <p className="font-display text-[1.6rem] leading-[1.2] tracking-[-0.03em]">
                  {L({ fr: "Au-delà ? Le desk OTC vous donne un prix ferme pour le montant entier.", en: "Above that? The OTC desk gives you a firm price for the full amount." })}
                </p>
                <Link to="/otc" className="mt-5 inline-flex items-center gap-2 text-[15px] font-medium underline-offset-4 hover:underline">
                  <Handshake className="h-4 w-4" strokeWidth={1.8} /> {L({ fr: "Découvrir le desk OTC", en: "Discover the OTC desk" })} <ArrowRight className="h-4 w-4" strokeWidth={1.8} />
                </Link>
                <div className="mt-8 flex flex-wrap gap-x-5 gap-y-3">
                  {NETWORKS.map((n) => (
                    <span key={n.id} className="flex items-center gap-2 text-[14px] text-muted-foreground">
                      <img src={`/coins/${n.id}.svg`} alt="" className="h-6 w-6 rounded-full" />
                      {n.name}
                    </span>
                  ))}
                </div>
              </Reveal>
            </div>
          </Wrap>
        </section>

        {/* ===================== QUESTIONS ===================== */}
        <section>
          <Wrap className="pt-24 lg:pt-28">
            <div className="grid gap-10 lg:grid-cols-[0.8fr_1.2fr] lg:gap-20">
              <Reveal>
                <Kicker>{L({ fr: "Questions", en: "Questions" })}</Kicker>
                <H2 className="mt-4">{L({ fr: "Ce que les entreprises nous demandent.", en: "What businesses ask us." })}</H2>
              </Reveal>
              <div>
                {FAQ.map((item, i) => {
                  const open = faqOpen === i;
                  return (
                    <Reveal key={item.q.fr} delay={i * 60} className="border-b first:border-t">
                      <button
                        onClick={() => setFaqOpen(open ? null : i)}
                        aria-expanded={open}
                        className="flex w-full items-center justify-between gap-6 py-6 text-left"
                      >
                        <span className="font-display text-[17px] tracking-[-0.02em] sm:text-[19px]">{L(item.q)}</span>
                        <span className={cn("shrink-0 text-[22px] leading-none text-foreground/35 transition-transform", open && "rotate-45")} aria-hidden>+</span>
                      </button>
                      {open && <p className="mb-7 max-w-[600px] text-[15px] leading-[1.7] text-muted-foreground">{L(item.a)}</p>}
                    </Reveal>
                  );
                })}
              </div>
            </div>
          </Wrap>
        </section>

        {/* ===================== APPEL FINAL ===================== */}
        <section>
          <Wrap className="pb-10 pt-28 text-center lg:pt-36">
            <Reveal>
              <h2 className="mx-auto max-w-[860px] text-balance font-display text-[2.6rem] leading-[0.98] tracking-[-0.05em] sm:text-[3.8rem] lg:text-[4.8rem]">
                {L({ fr: "Ouvrez le compte", en: "Open the account" })}
                <br />
                <span className="text-foreground/35">{L({ fr: "dès aujourd'hui.", en: "today." })}</span>
              </h2>
            </Reveal>
            <Reveal delay={140} className="mt-10 flex flex-wrap justify-center gap-3">
              <Open />
              <Button asChild variant="secondary" shape="rounded" size="lg" className="px-7">
                <Link to="/contact">{L({ fr: "Nous écrire", en: "Contact us" })}</Link>
              </Button>
            </Reveal>
          </Wrap>
        </section>
      </main>

      <Footer />
    </div>
  );
};

export default Entreprises;
