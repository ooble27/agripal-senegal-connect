import { useEffect, useState } from "react";
import { Pointer } from "lucide-react";
import { cn } from "@/lib/utils";
import { useLang } from "@/lib/i18n";

/**
 * Illustration du desk OTC, dans le langage de l'illustration Interac
 * (InteracFlowArt) : trois cartes en projection isométrique — la demande, la
 * vérification, puis le prix ferme. Le curseur clique « Accepter » sur la
 * carte du premier plan, qui se soulève ; le compte à rebours de validité du
 * prix défile.
 *
 * Même géométrie que InteracFlowArt (cartes, pas, bouton) : le trajet du
 * curseur (.ooble-dep-cursor, index.css) tombe exactement sur le bouton.
 */

const SKEW_DEG = 9;
const K = Math.tan((SKEW_DEG * Math.PI) / 180);
const SKEW = `matrix(1 ${(-K).toFixed(4)} 0 1 0 0)`;

const CARD = { w: 470, h: 264, r: 24 };
const STEP = { x: 60, y: 120 };
const ORIGINS = [0, 1, 2].map((i) => ({ x: i * STEP.x, y: i * STEP.y }));

const VIEW_BOX = "-24 -150 690 720";

const FADE_Y = "linear-gradient(to bottom, transparent 0%, #000 8%, #000 70%, transparent 100%)";
const FADE_X = "linear-gradient(to right, transparent 0%, #000 7%, #000 93%, transparent 100%)";

const Card = ({ i, lift, children }: { i: number; lift?: boolean; children: React.ReactNode }) => {
  const inner = (
    <g transform={`translate(${ORIGINS[i].x} ${ORIGINS[i].y}) ${SKEW}`}>
      <rect
        width={CARD.w}
        height={CARD.h}
        rx={CARD.r}
        className="fill-background stroke-foreground/[0.07] dark:stroke-foreground/[0.13]"
        strokeWidth="1.5"
        filter="url(#ooble-otc-shadow)"
      />
      {children}
    </g>
  );
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

/** Ligne cochée de la carte « Vérification ». */
const Checked = ({ y, w }: { y: number; w: number }) => (
  <g>
    <circle cx={56} cy={y + 10} r={12} className="fill-foreground/[0.08] dark:fill-foreground/[0.12]" />
    <path
      d={`M50 ${y + 10} l4.5 4.5 l8 -9`}
      fill="none"
      strokeWidth="2.4"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="stroke-foreground/45 dark:stroke-foreground/60"
    />
    <Bar x={82} y={y} w={w} />
  </g>
);

/** Compte à rebours de validité du prix : 15:00 → 0:00, en boucle. */
function useCountdown(from = 15 * 60): string {
  const [left, setLeft] = useState(from - 1);
  useEffect(() => {
    if (window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) return;
    const id = window.setInterval(() => setLeft((s) => (s <= 0 ? from - 1 : s - 1)), 1000);
    return () => window.clearInterval(id);
  }, [from]);
  return `${Math.floor(left / 60)}:${String(left % 60).padStart(2, "0")}`;
}

const OtcQuoteArt = ({ className }: { className?: string }) => {
  const [lang] = useLang();
  const en = lang === "en";
  const clock = useCountdown();
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
        aria-label={en ? "OTC desk: your request, the review, then a firm price to accept" : "Desk OTC : votre demande, la vérification, puis un prix ferme à accepter"}
      >
        <defs>
          <filter id="ooble-otc-shadow" x="-15%" y="-15%" width="130%" height="130%">
            <feDropShadow dx="0" dy="6" stdDeviation="14" floodColor="#0b1b1f" floodOpacity="0.035" />
          </filter>
        </defs>

        {/* ---------- La demande (au fond) ---------- */}
        <Card i={0}>
          <Title>{en ? "Your request" : "Votre demande"}</Title>
          <text x="44" y="118" className="fill-foreground/40 dark:fill-foreground/50" fontSize="20">
            {en ? "Buy USDT" : "Achat de USDT"}
          </text>
          <text
            x="44"
            y="170"
            className="fill-foreground/[0.55] font-display dark:fill-foreground/[0.65]"
            fontSize="40"
            fontWeight="600"
            letterSpacing="-1.2"
          >
            25 000 $
          </text>
          <rect x={330} y={96} width={96} height={40} rx={12} className="fill-foreground/[0.05] dark:fill-foreground/[0.08]" />
        </Card>

        {/* ---------- La vérification (au milieu) ---------- */}
        <Card i={1}>
          <Title>{en ? "Review" : "Vérification"}</Title>
          <Checked y={100} w={220} />
          <Checked y={140} w={280} />
          <Checked y={180} w={170} />
        </Card>

        {/* ---------- Le prix ferme (au premier plan, se soulève) ---------- */}
        <Card i={2} lift>
          <Title>{en ? "Firm price" : "Prix ferme"}</Title>
          <text x="44" y="112" className="fill-foreground/40 dark:fill-foreground/50" fontSize="20">
            {en ? "You receive" : "Vous recevez"}
          </text>
          <text
            x="44"
            y="164"
            className="fill-foreground/[0.7] font-display dark:fill-foreground/80"
            fontSize="46"
            fontWeight="600"
            letterSpacing="-1.5"
          >
            17 260 USDT
          </text>
          {/* Validité du prix, qui défile. */}
          <g>
            <circle cx={58} cy={218} r={11} fill="none" strokeWidth="2" className="stroke-foreground/30 dark:stroke-foreground/45" />
            <path d="M58 211 v7 l4.5 3" fill="none" strokeWidth="2" strokeLinecap="round" className="stroke-foreground/40 dark:stroke-foreground/55" />
            <text x="78" y="225" className="fill-foreground/45 dark:fill-foreground/55" fontSize="19" style={{ fontVariantNumeric: "tabular-nums" }}>
              {en ? `Valid ${clock}` : `Valable ${clock}`}
            </text>
          </g>
          <g className="ooble-dep-btn">
            <rect x={280} y={196} width={146} height={44} rx={12} className="fill-foreground" />
            <text x={353} y={224} textAnchor="middle" className="fill-background" fontSize="19" fontWeight="600">
              {en ? "Accept" : "Accepter"}
            </text>
          </g>
        </Card>

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

export default OtcQuoteArt;
