import { Pointer } from "lucide-react";
import { cn } from "@/lib/utils";
import { getLang } from "@/lib/i18n";

/**
 * Illustration de la section « Payez par virement Interac ».
 *
 * Pile de trois écrans en projection isométrique (Compte bancaire · Question de
 * sécurité · Interac e-Transfer), dans le même langage que l'illustration du
 * héros mais avec une histoire propre : la main reste sur le bouton « Déposer »,
 * l'enfonce (petit clic), et c'est la carte Interac — elle seule — qui se
 * soulève à ce moment. Les deux autres cartes restent immobiles.
 */

const SKEW_DEG = 9;
const K = Math.tan((SKEW_DEG * Math.PI) / 180); // ≈ 0.1584
const SKEW = `matrix(1 ${(-K).toFixed(4)} 0 1 0 0)`;

const CARD = { w: 470, h: 264, r: 24 };
const STEP = { x: 60, y: 120 };
const ORIGINS = [0, 1, 2].map((i) => ({ x: i * STEP.x, y: i * STEP.y }));

const VIEW_BOX = "-24 -150 690 720";

const FADE_Y = "linear-gradient(to bottom, transparent 0%, #000 8%, #000 66%, transparent 100%)";
const FADE_X = "linear-gradient(to right, transparent 0%, #000 7%, #000 93%, transparent 100%)";

/**
 * Carte. `lift` (la carte Interac uniquement) l'anime : elle se soulève au clic.
 * Les autres sont statiques.
 */
const Card = ({ i, lift, children }: { i: number; lift?: boolean; children: React.ReactNode }) => {
  const inner = (
    <g transform={`translate(${ORIGINS[i].x} ${ORIGINS[i].y}) ${SKEW}`}>
      <rect
        width={CARD.w}
        height={CARD.h}
        rx={CARD.r}
        className="fill-background stroke-foreground/[0.07] dark:stroke-foreground/[0.13]"
        strokeWidth="1.5"
        filter="url(#ooble-pay-shadow)"
      />
      {children}
    </g>
  );
  // Le soulèvement est une animation CSS : elle doit porter sur un groupe SANS
  // attribut `transform` (sinon elle l'écraserait), d'où le groupe englobant.
  return lift ? <g className="ooble-dep-lift">{inner}</g> : inner;
};

const Title = ({ children }: { children: string }) => (
  <text
    x="44"
    y="62"
    className="fill-foreground/[0.42] font-display dark:fill-foreground/[0.5]"
    fontSize="34"
    fontWeight="500"
    letterSpacing="-0.8"
  >
    {children}
  </text>
);

const Bar = ({ x, y, w, h = 20 }: { x: number; y: number; w: number; h?: number }) => (
  <rect x={x} y={y} width={w} height={h} rx={h / 2} className="fill-foreground/[0.05] dark:fill-foreground/[0.08]" />
);

const Dashed = ({ x, y, w, h }: { x: number; y: number; w: number; h: number }) => (
  <rect
    x={x}
    y={y}
    width={w}
    height={h}
    rx="14"
    fill="none"
    className="stroke-foreground/[0.12] dark:stroke-foreground/[0.19]"
    strokeWidth="1.6"
    strokeDasharray="10 9"
  />
);

const InteracFlowArt = ({ className }: { className?: string }) => {
  const lang = getLang();
  return (
  <div className={cn("flex w-full justify-center", className)}>
    <svg
      viewBox={VIEW_BOX}
      className="h-auto w-full"
      style={{
        maskImage: `${FADE_Y}, ${FADE_X}`,
        WebkitMaskImage: `${FADE_Y}, ${FADE_X}`,
        maskComposite: "intersect",
        WebkitMaskComposite: "source-in",
      }}
      fill="none"
      role="img"
      aria-label={lang === "en" ? "Receive an Interac transfer: notification, security question, bank deposit" : "Recevoir un virement Interac : notification, question de sécurité, dépôt en banque"}
    >
      <defs>
        <filter id="ooble-pay-shadow" x="-15%" y="-15%" width="130%" height="130%">
          <feDropShadow dx="0" dy="6" stdDeviation="14" floodColor="#0b1b1f" floodOpacity="0.035" />
        </filter>
      </defs>

      {/* ---------- Compte bancaire (au fond, immobile) ---------- */}
      <Card i={0}>
        <Title>{lang === "en" ? "Bank account" : "Compte bancaire"}</Title>
        <Bar x={44} y={104} w={150} h={16} />
        <Bar x={44} y={140} w={300} />
        <Bar x={44} y={176} w={230} />
        <rect x={330} y={96} width={96} height={40} rx={12} className="fill-foreground/[0.05] dark:fill-foreground/[0.08]" />
      </Card>

      {/* ---------- Question de sécurité (au milieu, immobile) ---------- */}
      <Card i={1}>
        <Title>{lang === "en" ? "Security question" : "Question de sécurité"}</Title>
        <Bar x={44} y={104} w={250} h={16} />
        <Dashed x={44} y={140} w={382} h={70} />
      </Card>

      {/* ---------- Interac e-Transfer (au premier plan, se soulève) ---------- */}
      <Card i={2} lift>
        <Title>Interac e-Transfer</Title>
        <text x="44" y="112" className="fill-foreground/40 dark:fill-foreground/50" fontSize="20">
          {lang === "en" ? "Transfer received" : "Virement reçu"}
        </text>
        <text
          x="44"
          y="164"
          className="fill-foreground/[0.7] font-display dark:fill-foreground/80"
          fontSize="46"
          fontWeight="600"
          letterSpacing="-1.5"
        >
          500,00 $
        </text>
        {/* Bouton « Déposer » — s'enfonce d'un cran quand la main clique. */}
        <g className="ooble-dep-btn">
          <rect x={280} y={196} width={146} height={44} rx={12} className="fill-foreground" />
          <text x={353} y={224} textAnchor="middle" className="fill-background" fontSize="19" fontWeight="600">
            {lang === "en" ? "Deposit" : "Déposer"}
          </text>
        </g>
      </Card>

      {/*
        Curseur : il n'est plus figé. Il glisse vers le bouton « Déposer »
        (approche depuis le bas-droite), l'atteint, l'enfonce, puis se retire —
        micro-interaction soignée. Deux groupes imbriqués : le déplacement (et
        l'apparition) sur l'extérieur, l'enfoncement de la main sur l'intérieur.
        Il vient se poser sous le bord du bouton, sans masquer le mot « Déposer ».
      */}
      <g className="ooble-dep-cursor">
        <g className="ooble-dep-press">
          <Pointer
            x={-11}
            y={-3}
            width={34}
            height={34}
            strokeWidth={1.7}
            fill="none"
            className="stroke-foreground/[0.42] dark:stroke-foreground/[0.58]"
          />
        </g>
      </g>
    </svg>
  </div>
  );
};

export default InteracFlowArt;
