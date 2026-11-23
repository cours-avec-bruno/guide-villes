// Calcule à l'avance les trajets à pied de Lyon avec le service d'itinéraire de l'IGN (Géoplateforme, profil piéton)
// et les altitudes (RGE ALTI). Résultat : public/data/lyon-trajets.json
//   trajets["a|b"] = { m: mètres, s: secondes, g: polyligne encodée (précision 5) de a vers b }   (a < b, ordre alphabétique)
//   alt[id] = altitude en mètres
// Usage : node outils/trajets.mjs        (≈ 300 requêtes, 4 par seconde au plus ; reprend là où il s'est arrêté)
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ici = path.dirname(fileURLToPath(import.meta.url));
const racine = path.join(ici, "..");
const D = JSON.parse(fs.readFileSync(path.join(racine, "src", "data", "lyon.json"), "utf8"));
const SORTIE = path.join(racine, "public", "data", "lyon-trajets.json");
fs.mkdirSync(path.dirname(SORTIE), { recursive: true });

const pts = {};
for (const e of D.etapes) pts[e.id] = { lon: e.lon, lat: e.lat, k: "etape" };
for (const d of D.departs) pts["dep:" + d.id] = { lon: d.lon, lat: d.lat, k: "depart" };
for (const a of D.adresses) pts["adr:" + a.id] = { lon: a.lon, lat: a.lat, k: "adresse" };

const ids = Object.keys(pts);
const paires = [];
for (let i = 0; i < ids.length; i++)
  for (let j = i + 1; j < ids.length; j++) {
    const [a, b] = [ids[i], ids[j]].sort();
    const ka = pts[a].k, kb = pts[b].k;
    const utile = (ka === "etape" && kb === "etape") || (ka === "etape" && kb !== "etape") || (kb === "etape" && ka !== "etape");
    if (utile) paires.push([a, b]);
  }

const sortie = fs.existsSync(SORTIE) ? JSON.parse(fs.readFileSync(SORTIE, "utf8")) : { trajets: {}, alt: {} };
const pause = (ms) => new Promise((r) => setTimeout(r, ms));
const UA = { "User-Agent": "guide-villes-prototype/0.1" };

// altitudes
if (Object.keys(sortie.alt).length < ids.length) {
  const lon = ids.map((i) => pts[i].lon).join("|"), lat = ids.map((i) => pts[i].lat).join("|");
  try {
    const r = await fetch(`https://data.geopf.fr/altimetrie/1.0/calcul/alti/rest/elevation.json?lon=${lon}&lat=${lat}&resource=ign_rge_alti_wld&zonly=true`, { headers: UA });
    const j = await r.json();
    ids.forEach((id, i) => (sortie.alt[id] = Math.round(j.elevations[i])));
    console.log("altitudes :", ids.map((i) => `${i} ${sortie.alt[i]} m`).join(" · "));
  } catch (e) {
    console.log("altitudes indisponibles :", String(e));
  }
}

let faits = 0, erreurs = 0;
for (const [a, b] of paires) {
  const cle = `${a}|${b}`;
  if (sortie.trajets[cle]) continue;
  const A = pts[a], B = pts[b];
  const url = `https://data.geopf.fr/navigation/itineraire?resource=bdtopo-osrm&profile=pedestrian&optimization=shortest&start=${A.lon},${A.lat}&end=${B.lon},${B.lat}&geometryFormat=polyline&getSteps=false`;
  try {
    const r = await fetch(url, { headers: UA });
    if (!r.ok) throw new Error("HTTP " + r.status);
    const j = await r.json();
    sortie.trajets[cle] = { m: Math.round(j.distance), s: Math.round(j.duration), g: j.geometry };
    faits++;
  } catch (e) {
    erreurs++;
    console.log("échec", cle, String(e));
  }
  if (faits % 40 === 0) fs.writeFileSync(SORTIE, JSON.stringify(sortie));
  await pause(260);
}
fs.writeFileSync(SORTIE, JSON.stringify(sortie));
const n = Object.keys(sortie.trajets).length;
console.log(`${n} trajets sur ${paires.length} (${faits} nouveaux, ${erreurs} échecs) → ${SORTIE} (${(fs.statSync(SORTIE).size / 1024).toFixed(0)} Ko)`);
