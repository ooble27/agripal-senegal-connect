// Rend les illustrations e-mail (SVG) en PNG transparents, façon landing.
// Usage : node emails/tools/render.mjs
import { chromium } from "playwright";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const sheet = "file://" + resolve(__dirname, "illustration-sheet.html");
const outDir = resolve(__dirname, "..", "assets");
const SCALE = 3; // densité pour écrans Retina

// Chromium headless_shell pré-installé (implémente l'ancien mode headless).
const executablePath = "/opt/pw-browsers/chromium_headless_shell-1194/chrome-linux/headless_shell";
const browser = await chromium.launch({ executablePath });
const page = await browser.newPage({ deviceScaleFactor: SCALE });
await page.goto(sheet, { waitUntil: "networkidle" });

const names = await page.evaluate(() => window.__ARTS__);
for (const name of names) {
  const el = page.locator(`#svg-${name}`);
  await el.screenshot({ path: resolve(outDir, `${name}.png`), omitBackground: true });
  console.log("✓", `${name}.png`);
}

await browser.close();
console.log("Terminé —", names.length, "illustrations rendues dans emails/assets/");
