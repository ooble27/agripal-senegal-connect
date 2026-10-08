import { Compass, Coins, HandCoins, Send, ShieldCheck, UserCheck, type LucideIcon } from "lucide-react";
import type { TKey } from "./translations";
import { GUIDES, type GuideDef } from "./guides";

/**
 * Centre d'aide (/faq) : un thème par page (/faq/:slug), chacun avec ses
 * vidéos explicatives (guides de /guide) et ses questions. L'ordre du tableau
 * est l'ordre d'affichage. Une question s'ouvre directement avec
 * /faq/<thème>#<id>.
 */
export interface FaqItem {
  id: string;
  q: TKey;
  a: TKey;
}

export interface FaqCategory {
  slug: string;
  icon: LucideIcon;
  title: TKey;
  desc: TKey;
  /** Guides vidéo (slugs de /guide) montrés en tête de page. */
  videos: string[];
  /** Encadré des quatre règles du virement Interac. */
  rules?: boolean;
  items: FaqItem[];
}

const item = (id: string, q: string, a: string): FaqItem => ({ id, q: `faqp.${q}` as TKey, a: `faqp.${a}` as TKey });

export const FAQ_CATEGORIES: FaqCategory[] = [
  {
    slug: "le-service",
    icon: Compass,
    title: "faqp.topic1",
    desc: "faqp.cat.service",
    videos: ["ooble-en-une-minute"],
    items: [
      item("ooble", "1q", "1a"),
      item("frais", "2q", "2a"),
      item("taux", "3q", "3a"),
      item("limites", "limitsQ", "limitsA"),
    ],
  },
  {
    slug: "compte",
    icon: UserCheck,
    title: "faqp.topicAccount",
    desc: "faqp.cat.account",
    videos: ["creer-un-compte", "verifier-identite"],
    items: [
      item("verification", "9q", "9a"),
      item("nom", "nameQ", "nameA"),
      item("entreprise", "bizQ", "bizA"),
    ],
  },
  {
    slug: "acheter",
    icon: Coins,
    title: "faqp.topic2",
    desc: "faqp.cat.buy",
    videos: ["acheter-usdt"],
    items: [
      item("acheter", "4q", "4a"),
      item("reseaux", "6q", "6a"),
      item("delai", "7q", "7a"),
      item("suivi", "trackQ", "trackA"),
    ],
  },
  {
    slug: "payer-par-interac",
    icon: Send,
    title: "faqp.topicPay",
    desc: "faqp.cat.pay",
    videos: ["payer-par-interac"],
    rules: true,
    items: [
      item("reference", "payRefQ", "payRefA"),
      item("nom-expediteur", "payNameQ", "payNameA"),
      item("question-securite", "payQuestionQ", "payQuestionA"),
      item("erreur", "payMistakeQ", "payMistakeA"),
      item("plusieurs-ordres", "paySplitQ", "paySplitA"),
      item("en-attente", "payDelayQ", "payDelayA"),
    ],
  },
  {
    slug: "vendre",
    icon: HandCoins,
    title: "faqp.topicSell",
    desc: "faqp.cat.sell",
    videos: ["vendre-usdt"],
    items: [
      item("vendre", "5q", "5a"),
      item("plateforme", "sellExchangeQ", "sellExchangeA"),
      item("recevoir", "sellPayoutQ", "sellPayoutA"),
    ],
  },
  {
    slug: "securite",
    icon: ShieldCheck,
    title: "faqp.topic3",
    desc: "faqp.cat.safety",
    videos: ["votre-securite"],
    items: [
      item("fonds", "8q", "8a"),
      item("arnaques", "scamQ", "scamA"),
      item("codes", "contactQ", "contactA"),
    ],
  },
];

/** Les quatre règles du virement Interac (encadré du thème « Payer par Interac »). */
export const PAY_RULES: { title: TKey; body: TKey }[] = [
  { title: "faqp.rules.r1", body: "faqp.rules.r1d" },
  { title: "faqp.rules.r2", body: "faqp.rules.r2d" },
  { title: "faqp.rules.r3", body: "faqp.rules.r3d" },
  { title: "faqp.rules.r4", body: "faqp.rules.r4d" },
];

/** Vidéos d'un thème qui existent vraiment dans les guides. */
export const categoryVideos = (c: FaqCategory): GuideDef[] =>
  c.videos.map((slug) => GUIDES.find((g) => g.slug === slug)).filter((g): g is GuideDef => !!g);

/** Retire les accents et la casse, pour la recherche. */
export const fold = (s: string) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
