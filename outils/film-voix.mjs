// La voix du film de présentation (la page d'une ville). Un seul appel à ElevenLabs, avec la voix de la série et ses
// réglages (lus dans le projet vidéo) ; les blancs entre les phrases sont resserrés ; le minutage mot à mot est écrit
// dans outils/film/minutage.js, que le film lit pour se caler sur la voix.
// Usage : node outils/film-voix.mjs            (régénère la voix : compte dans le quota)
//         node outils/film-voix.mjs --garder   (garde la prise déjà faite, refait seulement le resserrage et le minutage)
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const racine = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const SORTIE = process.env.FILM_SORTIE ?? "D:/geopolitik/guide-villes-film"; // les fichiers lourds restent hors du dépôt
const VIDEO = path.join(os.homedir(), "Desktop", "Géopolitik", "remotion", "scripts", "lib", "voix-elevenlabs.mjs");
fs.mkdirSync(SORTIE, { recursive: true });

// Le texte dit, phrase par phrase, et son découpage en cartons de sous-titres (« g » : carton en gris, l'amorce).
export const PHRASES = [
  { texte: "Avec le guide, plus besoin de réfléchir quand tu visites une ville.", cartes: [["Avec le guide,", 1], ["plus besoin de réfléchir", 0], ["quand tu visites une ville.", 0]] },
  { texte: "Les meilleurs endroits sont déjà rangés en itinéraire.", cartes: [["Les meilleurs endroits", 1], ["sont déjà rangés", 0], ["en itinéraire.", 0]] },
  { texte: "À chaque arrêt, une vidéo te raconte le lieu.", cartes: [["À chaque arrêt,", 1], ["une vidéo te raconte le lieu.", 0]] },
  { texte: "Tu sais où bien manger, et quoi voir juste à côté.", cartes: [["Tu sais où bien manger,", 1], ["et quoi voir juste à côté.", 0]] },
  { texte: "Tes photos se rangent lieu par lieu.", cartes: [["Tes photos se rangent", 1], ["lieu par lieu.", 0]] },
  { texte: "Et sur la carte, tu retraces tout ton voyage.", cartes: [["Et sur la carte,", 1], ["tu retraces tout ton voyage.", 0]] },
];
const AVANT = 0.07, APRES = 0.13; // ce qu'on garde autour de chaque phrase : il reste 0,2 s entre deux phrases
const DEBUT = 0.3, FIN = 1.0; // le film commence un peu avant la voix et finit un peu après

const brut = path.join(SORTIE, "voix-brute.mp3"), alignement = path.join(SORTIE, "voix-alignement.json");
const texte = PHRASES.map((p) => p.texte).join(" ");
if (!process.argv.includes("--garder") || !fs.existsSync(brut)) {
  const { ttsWithTimestamps, VOICE_ID, VOICE_SETTINGS_HUGO } = await import(pathToFileURL(VIDEO).href);
  const r = ttsWithTimestamps(texte, VOICE_ID, { voiceSettings: VOICE_SETTINGS_HUGO, tmpDir: SORTIE });
  fs.writeFileSync(brut, r.audio);
  fs.writeFileSync(alignement, JSON.stringify({ texte, characters: r.characters, starts: r.starts, ends: r.ends }));
  console.log(`voix générée : ${texte.length} caractères`);
}
const A = JSON.parse(fs.readFileSync(alignement, "utf8"));
if (A.texte !== texte) throw new Error("Le texte a changé depuis la dernière prise : relancer sans --garder.");
const joint = A.characters.join("");

// où tombe chaque phrase, chaque carton, chaque mot dans la prise
let curseur = 0, decalage = DEBUT;
const phrases = [], cartes = [], morceaux = [];
PHRASES.forEach((p, i) => {
  const d = joint.indexOf(p.texte, curseur);
  if (d < 0) throw new Error("Phrase introuvable dans l'alignement : " + p.texte);
  const de = A.starts[d], a = A.ends[d + p.texte.length - 1];
  const coupeDe = Math.max(0, de - AVANT), coupeA = a + APRES;
  const versFilm = (t) => +(t - coupeDe + decalage).toFixed(3); // le temps de la prise → le temps du film
  phrases.push({ de: versFilm(de), a: versFilm(a) });
  let c = d;
  for (const [t, gris] of p.cartes) {
    const k = joint.indexOf(t, c);
    if (k < 0) throw new Error("Carton introuvable : " + t);
    let pos = 0;
    const mots = t.split(" ").map((m) => { const at = t.indexOf(m, pos); pos = at + m.length; return { m, t: versFilm(A.starts[k + at]) }; });
    cartes.push({ texte: t, gris: !!gris, phrase: i, de: mots[0].t, a: versFilm(A.ends[k + t.length - 1]), mots });
    c = k + t.length;
  }
  morceaux.push([coupeDe, coupeA]);
  decalage += coupeA - coupeDe;
  curseur = d + p.texte.length;
});
const duree = +(decalage + FIN - APRES).toFixed(3);

// la voix resserrée : les morceaux bout à bout, un silence au début et à la fin, le niveau réglé pour le web
const filtres = morceaux.map(([de, a], i) => `[0]atrim=start=${de.toFixed(3)}:end=${a.toFixed(3)},asetpts=PTS-STARTPTS,afade=t=in:d=0.01,afade=t=out:st=${(a - de - 0.02).toFixed(3)}:d=0.02[m${i}]`);
const chaine = `${filtres.join(";")};${morceaux.map((_, i) => `[m${i}]`).join("")}concat=n=${morceaux.length}:v=0:a=1,adelay=${Math.round(DEBUT * 1000)}:all=1,apad=whole_dur=${duree},loudnorm=I=-16:TP=-1.5:LRA=11[v]`;
const voix = path.join(SORTIE, "voix.wav");
execFileSync("ffmpeg", ["-v", "error", "-y", "-i", brut, "-filter_complex", chaine, "-map", "[v]", "-ar", "48000", "-ac", "2", voix]);

fs.mkdirSync(path.join(racine, "outils", "film"), { recursive: true });
fs.writeFileSync(
  path.join(racine, "outils", "film", "minutage.js"),
  `// Écrit par outils/film-voix.mjs : le minutage de la voix du film (en secondes). Ne pas modifier à la main.\nwindow.MINUTAGE = ${JSON.stringify({ duree, phrases, cartes }, null, 1)};\n`,
);
// les sous-titres en fichier, pour les lecteurs d'écran et les navigateurs qui les proposent (l'image les porte déjà)
const hms = (t) => `00:00:${t.toFixed(3).padStart(6, "0")}`;
fs.writeFileSync(
  path.join(racine, "public", "videos", "presentation.vtt"),
  "WEBVTT\n\n" + phrases.map((p, i) => `${hms(p.de)} --> ${hms(i + 1 < phrases.length ? phrases[i + 1].de : p.a + 0.4)}\n${PHRASES[i].texte}\n`).join("\n"),
);
console.log(`durée du film : ${duree} s`);
phrases.forEach((p, i) => console.log(`  ${p.de.toFixed(2)} → ${p.a.toFixed(2)}  ${PHRASES[i].texte}`));
