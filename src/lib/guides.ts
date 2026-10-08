import type { Lang } from "./i18n";
import type { TKey } from "./translations";

/** Guides vidéo du centre d'aide (/guide). L'ordre du tableau est l'ordre de lecture. */
export type GuideKey = "account" | "kyc" | "buy" | "pay" | "sell";
export type GuideGroup = "start" | "trade";

export interface GuideDef {
  slug: string;
  key: GuideKey;
  group: GuideGroup;
  /** Page de la plateforme où l'on passe à l'action. */
  to: string;
  /** Durée de la vidéo, en secondes, par langue. */
  duration: Record<Lang, number>;
}

export const GUIDES: GuideDef[] = [
  { slug: "creer-un-compte", key: "account", group: "start", to: "/inscription", duration: { fr: 40, en: 37 } },
  { slug: "verifier-identite", key: "kyc", group: "start", to: "/app/verification", duration: { fr: 48, en: 43 } },
  { slug: "acheter-usdt", key: "buy", group: "trade", to: "/app/acheter", duration: { fr: 47, en: 42 } },
  { slug: "payer-par-interac", key: "pay", group: "trade", to: "/faq/payer-par-interac", duration: { fr: 66, en: 61 } },
  { slug: "vendre-usdt", key: "sell", group: "trade", to: "/app/vendre", duration: { fr: 46, en: 43 } },
];

export const GUIDE_GROUPS: { id: GuideGroup; titleKey: TKey; subKey: TKey }[] = [
  { id: "start", titleKey: "guide.group.start", subKey: "guide.group.startSub" },
  { id: "trade", titleKey: "guide.group.trade", subKey: "guide.group.tradeSub" },
];

export const STEP_COUNT = 6;
export const TIP_COUNT = 3;

export const guideKey = (g: GuideDef, field: string) => `guide.${g.key}.${field}` as TKey;

export const guideMedia = (g: GuideDef, lang: Lang) => {
  const base = `/guides/videos/${g.slug}-${lang}`;
  return { video: `${base}.mp4`, poster: `${base}.jpg`, thumb: `${base}-thumb.jpg` };
};
