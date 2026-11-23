// Fabrique les images de fond de la page de vente à partir de l'appli elle-même : la carte de Lyon en volume.
//   public/plaques/lyon-paysage.webp   grand écran (1920 × 1200)
//   public/plaques/lyon-portrait.webp  téléphone (900 × 1800)
// La capture passe par l'outil du skill de design (Chrome sans fenêtre, il attend que la carte soit dessinée).
// Le serveur de développement doit tourner (npm run dev). Usage : node outils/captures.mjs
// L'écran du téléphone (public/plaques/appli.webp) est une capture de l'appli à 390 × 844, faite à la main.
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const racine = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const SHOOT = path.join(os.homedir(), ".claude", "skills", "design-taste-frontend", "scripts", "shoot.mjs");
const BASE = process.argv[2] ?? "http://127.0.0.1:4321";
const dst = path.join(racine, "public", "plaques");
const tmp = path.join(racine, "outils", "tmp");
fs.mkdirSync(dst, { recursive: true });
fs.mkdirSync(tmp, { recursive: true });

function capturer(nom, l, h) {
  const png = path.join(tmp, nom + ".png");
  execFileSync("node", [SHOOT, "--url", `${BASE}/lyon?visite=5-secrets&onglet=carte&nu=3d`, "--w", String(l), "--h", String(h), "--wait", "9000", "--no-tiles", "--out", png, "--profile", ".taste-skill/chrome-shoot"], { cwd: racine, stdio: "ignore", timeout: 240000 });
  const out = path.join(dst, nom + ".webp");
  execFileSync("ffmpeg", ["-v", "error", "-y", "-i", png, "-c:v", "libwebp", "-quality", "76", out]);
  console.log(nom.padEnd(16), (fs.statSync(out).size / 1024).toFixed(0) + " Ko");
}
capturer("lyon-paysage", 1920, 1200);
capturer("lyon-portrait", 900, 1800);
