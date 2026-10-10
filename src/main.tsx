import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";
import { initTheme } from "./lib/theme";
import { initLang } from "./lib/i18n";
import { captureSource } from "./lib/origin";
import { registerServiceWorker, dropOrphanPush } from "./lib/pushNotifications";
import { supabase } from "./integrations/supabase/client";

initTheme();
captureSource();
const { basename, redirect } = initLang();

if (redirect) {
  // Le visiteur a choisi l'anglais : version anglaise de la même page.
  window.location.replace(redirect);
} else {
  // Les pages publiques arrivent déjà rendues (pré-rendu SEO) ; React les
  // remplace par l'app, à l'identique.
  createRoot(document.getElementById("root")!).render(<App basename={basename} />);
}

// Service worker : notifications push (abonnement automatique une fois connecté).
registerServiceWorker();
// Personne de connecté sur cet appareil : pas de notifications de compte.
void supabase.auth.getSession().then(({ data }) => { if (!data.session) void dropOrphanPush(); });
