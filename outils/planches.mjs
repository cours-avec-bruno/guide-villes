// Planches-contact des épisodes « villes » pour choisir l'image de chaque carte du site.
// Usage : node outils/planches.mjs   → outils/tmp/planche-<n>.jpg (8 images par épisode, une ligne par épisode)
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ici = path.dirname(fileURLToPath(import.meta.url));
const TMP = path.join(ici, "tmp");
fs.mkdirSync(TMP, { recursive: true });
const E = "D:/geopolitik/exports/";
const G = "G:/Mon Drive/VIDEOS/Géopolitik/";

export const EPISODES = {
  lyon: E + "2026-11-16_curiosites-lyon-2_v1.mp4",
  paris: E + "2026-11-22_curiosites-paris-2_v7.mp4",
  marseille: E + "2026-11-15_curiosites-marseille-2_v1.mp4",
  bordeaux: E + "2026-11-11_curiosites-bordeaux_v2.mp4",
  toulouse: G + "2026-11-05_curiosites-toulouse_v5.mp4",
  nice: E + "2026-11-12_curiosites-nice_v1.mp4",
  nantes: E + "2026-11-15_curiosites-nantes_v1.mp4",
  rennes: E + "2026-11-15_curiosites-rennes_v1.mp4",
  lille: G + "2026-10-24_curiosites-lille_v1.mp4",
  grenoble: E + "2026-11-05_curiosites-grenoble_v3_publication.mp4",
  montpellier: E + "2026-11-22_curiosites-montpellier_v3.mp4",
};

const duree = (f) => parseFloat(execFileSync("ffprobe", ["-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", f]).toString());

if (process.argv[1].endsWith("planches.mjs")) {
  const N = 8;
  const noms = Object.keys(EPISODES);
  const lignes = [];
  for (const nom of noms) {
    const f = EPISODES[nom];
    if (!fs.existsSync(f)) { console.log("absent :", f); continue; }
    const d = duree(f);
    const vignettes = [];
    for (let i = 0; i < N; i++) {
      const t = (d * (i + 0.5)) / N;
      const out = path.join(TMP, `v-${nom}-${i}.jpg`);
      execFileSync("ffmpeg", ["-v", "error", "-y", "-ss", t.toFixed(2), "-i", f, "-frames:v", "1", "-vf", "scale=180:320", "-q:v", "5", out]);
      vignettes.push(out);
    }
    const ligne = path.join(TMP, `l-${nom}.jpg`);
    execFileSync("ffmpeg", ["-v", "error", "-y", ...vignettes.flatMap((v) => ["-i", v]), "-filter_complex", `hstack=inputs=${N}`, "-q:v", "5", ligne]);
    vignettes.forEach((v) => fs.unlinkSync(v));
    lignes.push(ligne);
    console.log(nom.padEnd(12), d.toFixed(1) + " s", "→ images à", Array.from({ length: N }, (_, i) => ((d * (i + 0.5)) / N).toFixed(1)).join(" · "));
  }
  for (let p = 0; p * 6 < lignes.length; p++) {
    const lot = lignes.slice(p * 6, p * 6 + 6);
    const out = path.join(TMP, `planche-${p + 1}.jpg`);
    if (lot.length === 1) fs.copyFileSync(lot[0], out);
    else execFileSync("ffmpeg", ["-v", "error", "-y", ...lot.flatMap((v) => ["-i", v]), "-filter_complex", `vstack=inputs=${lot.length}`, "-q:v", "5", out]);
    console.log("→", out, "(" + noms.slice(p * 6, p * 6 + 6).join(", ") + ")");
  }
}
