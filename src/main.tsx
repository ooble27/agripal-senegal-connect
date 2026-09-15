import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";
import { initTheme } from "./lib/theme";
import { initLang } from "./lib/i18n";

initTheme();
initLang();

createRoot(document.getElementById("root")!).render(<App />);
