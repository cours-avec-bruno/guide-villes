// Fabrique la vidéo du film de présentation : Chrome (sans fenêtre) affiche outils/film/film.html, on lui demande
// chaque image avec rendu(t) et ffmpeg les assemble avec la voix.
//   60 images par seconde, avec un flou de mouvement : 4 poses par image, étalées sur une demi-image (obturateur à 180°).
// Sorties : la vidéo de la page (public/videos/presentation.mp4, 720 × 1280) et son image d'attente (.jpg) ;
//           l'original en 1080 × 1920 dans FILM_SORTIE (D:/geopolitik/guide-villes-film), pour s'en servir ailleurs.
// Usage : node outils/film-rendu.mjs               (la vidéo entière ; la voix doit exister : outils/film-voix.mjs)
//         node outils/film-rendu.mjs --images 1,5  (seulement ces instants, en images, pour contrôler)
//         node outils/film-rendu.mjs --sans-flou   (une pose par image : quatre fois plus rapide)
import { execFileSync, spawn } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const racine = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const SORTIE = process.env.FILM_SORTIE ?? "D:/geopolitik/guide-villes-film";
const CHROME = process.env.CHROME ?? "C:/Program Files/Google/Chrome/Application/chrome.exe";
const L = 1080, H = 1920, IPS = 60;
const arg = (nom) => { const i = process.argv.indexOf(nom); return i < 0 ? null : process.argv[i + 1] ?? ""; };
const POSES = process.argv.includes("--sans-flou") ? 1 : 4;
const instants = arg("--images")?.split(",").map(Number);

const lyon = JSON.parse(fs.readFileSync(path.join(racine, "src", "data", "lyon.json"), "utf8"));
const page = pathToFileURL(path.join(racine, "outils", "film", "film.html")).href + `#lieux=${lyon.etapes.length}&videos=${Object.keys(lyon.videos).length}&adresses=${lyon.adresses.length}`;
fs.mkdirSync(SORTIE, { recursive: true });

// ——— Chrome, piloté par son protocole de débogage
const port = 9340 + Math.floor(Math.random() * 40);
const profil = fs.mkdtempSync(path.join(os.tmpdir(), "film-chrome-"));
const chrome = spawn(CHROME, ["--headless=new", `--remote-debugging-port=${port}`, `--user-data-dir=${profil}`, "--hide-scrollbars", "--allow-file-access-from-files", "--force-device-scale-factor=1", `--window-size=${L},${H}`, "--no-first-run", ...(process.env.CHROME_OPTIONS ?? "").split(" ").filter(Boolean), "about:blank"], { stdio: "ignore" });
const fermer = () => { try { chrome.kill(); } catch {} try { fs.rmSync(profil, { recursive: true, force: true }); } catch {} };
process.on("exit", fermer);

async function cible() {
  for (let i = 0; i < 60; i++) {
    try {
      const l = await (await fetch(`http://127.0.0.1:${port}/json/list`)).json();
      const p = l.find((x) => x.type === "page");
      if (p) return p.webSocketDebuggerUrl;
    } catch {}
    await new Promise((r) => setTimeout(r, 250));
  }
  throw new Error("Chrome ne répond pas.");
}
const ws = new WebSocket(await cible());
await new Promise((ok, ko) => { ws.onopen = ok; ws.onerror = ko; });
let no = 0;
const attentes = new Map(), evenements = new Map();
ws.onmessage = (m) => {
  const d = JSON.parse(m.data);
  if (d.id && attentes.has(d.id)) { const [ok, ko] = attentes.get(d.id); attentes.delete(d.id); d.error ? ko(new Error(d.error.message)) : ok(d.result); }
  else if (d.method && evenements.has(d.method)) { evenements.get(d.method)(); evenements.delete(d.method); }
};
const cdp = (method, params = {}) => new Promise((ok, ko) => { const id = ++no; attentes.set(id, [ok, ko]); ws.send(JSON.stringify({ id, method, params })); });
const quand = (method) => new Promise((ok) => evenements.set(method, ok));
const js = async (expression) => {
  const r = await cdp("Runtime.evaluate", { expression, awaitPromise: true, returnByValue: true });
  if (r.exceptionDetails) throw new Error("Dans la page : " + (r.exceptionDetails.exception?.description ?? r.exceptionDetails.text));
  return r.result.value;
};
const image = async (t) => {
  await js(`rendu(${t.toFixed(5)})`);
  return Buffer.from((await cdp("Page.captureScreenshot", { format: "jpeg", quality: 95, optimizeForSpeed: true })).data, "base64");
};

await cdp("Page.enable");
await cdp("Emulation.setDeviceMetricsOverride", { width: L, height: H, deviceScaleFactor: 1, mobile: false });
const charge = quand("Page.loadEventFired");
await cdp("Page.navigate", { url: page });
await charge;
await js("preparer()");
const duree = await js("DUREE");

if (instants) {
  for (const t of instants) {
    const f = path.join(SORTIE, `image-${t.toFixed(2)}.jpg`);
    fs.writeFileSync(f, await image(t));
    console.log(f);
  }
  ws.close(); fermer(); process.exit(0);
}

// ——— la vidéo : les poses partent dans ffmpeg, qui les fond 4 par 4 et ajoute la voix
const voix = path.join(SORTIE, "voix.wav");
if (!fs.existsSync(voix)) throw new Error("La voix manque : lancer d'abord node outils/film-voix.mjs");
const original = path.join(SORTIE, "presentation-1080.mp4");
const N = Math.round((Number(arg("--duree")) || duree) * IPS); // --duree 2 : seulement le début, pour un essai
const flou = POSES > 1 ? `tmix=frames=${POSES},select='eq(mod(n\\,${POSES})\\,${POSES - 1})',setpts=N/(${IPS}*TB)` : "null";
const ffmpeg = spawn("ffmpeg", ["-v", "error", "-y", "-f", "image2pipe", "-c:v", "mjpeg", "-framerate", String(IPS * POSES), "-i", "-", "-i", voix,
  "-vf", flou, "-r", String(IPS), "-c:v", "libx264", "-preset", "slow", "-crf", "15", "-pix_fmt", "yuv420p", "-c:a", "aac", "-b:a", "192k", "-t", duree.toFixed(3), "-movflags", "+faststart", original], { stdio: ["pipe", "inherit", "inherit"] });
const fini = new Promise((ok, ko) => ffmpeg.on("close", (c) => (c === 0 ? ok() : ko(new Error("ffmpeg : code " + c)))));
const debut = Date.now();
for (let k = 0; k < N; k++) {
  for (let j = 0; j < POSES; j++) {
    const t = k / IPS + j / (IPS * POSES * 2); // les poses d'une image tiennent dans sa première moitié
    if (!ffmpeg.stdin.write(await image(t))) await new Promise((r) => ffmpeg.stdin.once("drain", r));
  }
  if (k % 120 === 0) console.log(`image ${k} / ${N}  (${Math.round((Date.now() - debut) / 1000)} s)`);
}
ffmpeg.stdin.end();
await fini;
ws.close(); fermer();

// ——— la version de la page (plus légère) et son image d'attente
const dst = path.join(racine, "public", "videos");
execFileSync("ffmpeg", ["-v", "error", "-y", "-i", original, "-vf", "scale=720:1280:flags=lanczos", "-c:v", "libx264", "-preset", "slow", "-crf", "28", "-pix_fmt", "yuv420p", "-c:a", "aac", "-b:a", "112k", "-movflags", "+faststart", path.join(dst, "presentation.mp4")]);
execFileSync("ffmpeg", ["-v", "error", "-y", "-ss", "2.4", "-i", original, "-frames:v", "1", "-vf", "scale=720:1280:flags=lanczos", "-q:v", "3", path.join(dst, "presentation.jpg")]);
for (const f of [original, path.join(dst, "presentation.mp4"), path.join(dst, "presentation.jpg")]) console.log(f, (fs.statSync(f).size / 1e6).toFixed(2) + " Mo");
