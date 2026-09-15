import { useLang } from "@/lib/i18n";

/**
 * Inline translation component — no dictionary key needed.
 * Write French as children, pass English as `en` prop.
 *
 *   <T en="Buy USDT">Acheter des USDT</T>
 */
export function T({ children, en }: { children: React.ReactNode; en: string }) {
  const [lang] = useLang();
  return lang === "en" ? <>{en}</> : <>{children}</>;
}
