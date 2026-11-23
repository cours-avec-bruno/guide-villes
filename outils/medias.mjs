// Fabrique les médias du site à partir des exports du projet vidéo :
//   public/videos/lyon/<id>.mp4 + <id>.jpg   les clips des étapes (720 × 1280) et leur image d'attente
//   public/cartes/<ville>.webp               l'image de chaque carte de ville (600 × 792)
// Usage : node outils/medias.mjs [clips] [cartes]     (sans argument : tout)
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { EPISODES } from "./planches.mjs";

const ici = path.dirname(fileURLToPath(import.meta.url));
const racine = path.join(ici, "..");
const D = JSON.parse(fs.readFileSync(path.join(racine, "src", "data", "lyon.json"), "utf8"));
const G = "G:/Mon Drive/VIDEOS/Géopolitik/";
const SOURCES = {
  lyon: G + "2026-10-22_curiosites-lyon_v2.mp4",
  lyon2: "D:/geopolitik/exports/2026-11-16_curiosites-lyon-2_v1.mp4",
  souslyon: G + "2026-10-24_sous-lyon_v2.mp4",
  tetedor: G + "2026-10-26_tete-d-or_v2.mp4",
};
// l'image choisie pour chaque carte (seconde dans l'épisode), vue sur les planches-contact
const CARTES = { lyon: 16.5, paris: 78.5, marseille: 57.9, bordeaux: 92.7, toulouse: 20.2, nice: 71.3, nantes: 53.9, rennes: 58.3, lille: 19.7, grenoble: 6.7, montpellier: 41.7 };

const quoi = process.argv.slice(2);
const veut = (k) => quoi.length === 0 || quoi.includes(k);
const ff = (args) => execFileSync("ffmpeg", ["-v", "error", "-y", ...args], { stdio: ["ignore", "inherit", "inherit"] });

if (veut("clips")) {
  const dir = path.join(racine, "public", "videos", "lyon");
  fs.mkdirSync(dir, { recursive: true });
  let total = 0;
  for (const [id, v] of Object.entries(D.videos)) {
    const src = SOURCES[v.source];
    const t0 = v.de / 30, d = (v.a - v.de) / 30;
    const mp4 = path.join(dir, id + ".mp4"), jpg = path.join(dir, id + ".jpg");
    ff(["-ss", t0.toFixed(3), "-i", src, "-t", d.toFixed(3),
      "-vf", "scale=720:1280:flags=lanczos,fps=30",
      "-af", `afade=t=in:st=0:d=0.12,afade=t=out:st=${(d - 0.3).toFixed(3)}:d=0.3`,
      "-c:v", "libx264", "-preset", "medium", "-crf", "28", "-pix_fmt", "yuv420p", "-profile:v", "main",
      "-c:a", "aac", "-b:a", "96k", "-ac", "2", "-movflags", "+faststart", mp4]);
    ff(["-ss", (t0 + d * 0.45).toFixed(3), "-i", src, "-frames:v", "1", "-vf", "scale=540:960:flags=lanczos", "-q:v", "4", jpg]);
    const ko = fs.statSync(mp4).size / 1024;
    total += ko;
    console.log(id.padEnd(12), d.toFixed(1).padStart(5) + " s", ko.toFixed(0).padStart(6) + " Ko");
  }
  console.log("clips :", (total / 1024).toFixed(1), "Mo au total");
}

if (veut("cartes")) {
  const dir = path.join(racine, "public", "cartes");
  fs.mkdirSync(dir, { recursive: true });
  for (const [ville, t] of Object.entries(CARTES)) {
    const out = path.join(dir, ville + ".webp");
    ff(["-ss", String(t), "-i", EPISODES[ville], "-frames:v", "1", "-vf", "crop=1080:1426:0:0,scale=600:792:flags=lanczos", "-c:v", "libwebp", "-quality", "80", out]);
    console.log(ville.padEnd(12), (fs.statSync(out).size / 1024).toFixed(0) + " Ko");
  }
  // planche de contrôle
  const tmp = path.join(ici, "tmp");
  const villes = Object.keys(CARTES);
  ff([...villes.flatMap((v) => ["-i", path.join(dir, v + ".webp")]), "-filter_complex", villes.map((_, i) => `[${i}:v]scale=240:317[v${i}]`).join(";") + ";" + villes.map((_, i) => `[v${i}]`).join("") + `hstack=inputs=${villes.length}`, "-q:v", "4", path.join(tmp, "cartes-controle.jpg")]);
}
