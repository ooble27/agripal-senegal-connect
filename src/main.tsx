import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";
import { initTheme } from "./lib/theme";
import { initLang } from "./lib/i18n";
import { registerServiceWorker } from "./lib/pushNotifications";

initTheme();
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
