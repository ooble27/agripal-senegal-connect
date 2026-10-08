import { forwardRef, useEffect, useImperativeHandle, useRef } from "react";
import { TURNSTILE_SITE_KEY } from "@/lib/config";
import { useLang } from "@/lib/i18n";

/**
 * Captcha Cloudflare Turnstile (inscription, connexion, mot de passe oublié).
 *
 * Le jeton obtenu est transmis à Supabase Auth (`options.captchaToken`), qui
 * le vérifie avec la clé secrète configurée dans Supabase → Authentication →
 * Attack Protection. Un jeton ne sert qu'une fois : après chaque tentative,
 * le formulaire appelle `reset()`.
 *
 * Tant que TURNSTILE_SITE_KEY est vide, rien ne s'affiche et aucun jeton
 * n'est envoyé (le captcha n'est pas encore activé côté Supabase).
 */

type TurnstileApi = {
  render: (el: HTMLElement, opts: Record<string, unknown>) => string;
  reset: (id?: string) => void;
  remove: (id: string) => void;
};
declare global {
  interface Window { turnstile?: TurnstileApi }
}

export const captchaEnabled = () => TURNSTILE_SITE_KEY !== "";

let loader: Promise<void> | null = null;
function loadTurnstile(): Promise<void> {
  if (window.turnstile) return Promise.resolve();
  if (!loader) {
    loader = new Promise((resolve, reject) => {
      const s = document.createElement("script");
      s.src = "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit";
      s.async = true;
      s.onload = () => resolve();
      s.onerror = () => { loader = null; reject(new Error("Captcha indisponible")); };
      document.head.appendChild(s);
    });
  }
  return loader;
}

export interface CaptchaHandle { reset: () => void }

const Captcha = forwardRef<CaptchaHandle, { onToken: (token: string | null) => void; className?: string }>(
  ({ onToken, className }, ref) => {
    const box = useRef<HTMLDivElement>(null);
    const id = useRef<string | null>(null);
    const [lang] = useLang();
    const cb = useRef(onToken);
    cb.current = onToken;

    useImperativeHandle(ref, () => ({
      reset: () => {
        cb.current(null);
        if (id.current && window.turnstile) window.turnstile.reset(id.current);
      },
    }));

    useEffect(() => {
      if (!captchaEnabled()) return;
      let gone = false;
      loadTurnstile().then(() => {
        if (gone || !box.current || !window.turnstile) return;
        id.current = window.turnstile.render(box.current, {
          sitekey: TURNSTILE_SITE_KEY,
          language: lang,
          theme: document.documentElement.classList.contains("dark") ? "dark" : "light",
          size: "flexible",
          callback: (t: string) => cb.current(t),
          "expired-callback": () => cb.current(null),
          "error-callback": () => cb.current(null),
        });
      }).catch(() => cb.current(null));
      return () => {
        gone = true;
        if (id.current && window.turnstile) window.turnstile.remove(id.current);
        id.current = null;
      };
    }, [lang]);

    if (!captchaEnabled()) return null;
    return <div ref={box} className={className} />;
  },
);
Captcha.displayName = "Captcha";

export default Captcha;
