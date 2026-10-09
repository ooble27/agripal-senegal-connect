import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";
import { initTheme } from "./lib/theme";
import { initLang } from "./lib/i18n";
import { registerServiceWorker } from "./lib/pushNotifications";

initTheme();
initLang();

createRoot(document.getElementById("root")!).render(<App />);

// Service worker : notifications push (abonnement automatique une fois connecté).
registerServiceWorker();
