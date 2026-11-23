// Géocode les étapes, les points de départ et les adresses de Lyon avec Nominatim (OpenStreetMap).
// 1 requête par seconde au plus (règles d'usage de Nominatim). Résultat : outils/tmp/geocodage.json
// Usage : node outils/geocoder.mjs
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ici = path.dirname(fileURLToPath(import.meta.url));
const SORTIE = path.join(ici, "tmp", "geocodage.json");
const BOITE = "4.76,45.80,4.92,45.70"; // Lyon (ouest, nord, est, sud)

const REQUETES = {
  // étapes
  traboules: "54 rue Saint-Jean, Lyon",
  guignol: "Laurent Mourguet, avenue du Doyenné, Lyon",
  guignol_b: "avenue du Doyenné, Lyon",
  fourviere: "Basilique Notre-Dame de Fourvière, Lyon",
  lugdunum: "Théâtre antique de Lyon",
  lugdunum_b: "Lugdunum Musée et théâtres romains, Lyon",
  terreaux: "Fontaine Bartholdi, Lyon",
  celestins: "Place des Célestins, Lyon",
  perrache: "Place Carnot, Lyon",
  voraces: "Cour des Voraces, Lyon",
  jacquard: "Place de la Croix-Rousse, Lyon",
  jacquard_b: "Statue de Jacquard, Lyon",
  aretes: "Rue des Fantasques, Lyon",
  tetedor: "Porte des Enfants du Rhône, Lyon",
  lac: "Embarcadère, Parc de la Tête d'Or, Lyon",
  lac_b: "Lac de la Tête d'Or, Lyon",
  premierfilm: "Rue du Premier-Film, Lyon",
  // points de départ
  dep_perrache: "Gare de Lyon-Perrache",
  dep_partdieu: "Gare de Lyon-Part-Dieu",
  dep_bellecour: "Place Bellecour, Lyon",
  dep_vieuxlyon: "Vieux Lyon - Cathédrale Saint-Jean, métro, Lyon",
  dep_hoteldeville: "Hôtel de Ville - Louis Pradel, métro, Lyon",
  // adresses
  a_danieldenise: "Daniel et Denise, rue Tramassac, Lyon",
  a_abel: "Café Comptoir Abel, Lyon",
  a_federations: "Café des Fédérations, Lyon",
  a_garet: "Le Garet, rue du Garet, Lyon",
  a_halles: "Halles de Lyon Paul Bocuse",
  a_terreadelice: "Terre Adélice, Lyon",
  a_pralus: "Pralus, rue Saint-Jean, Lyon",
  a_bernachon: "Bernachon, Lyon",
  a_bouchonfilles: "Le Bouchon des Filles, Lyon",
  a_marchecr: "Marché de la Croix-Rousse, Lyon",
  a_mokxa: "Mokxa, Lyon",
  a_georges: "Brasserie Georges, Lyon",
  a_negociants: "Grand Café des Négociants, Lyon",
};

const pause = (ms) => new Promise((r) => setTimeout(r, ms));
const sortie = {};
for (const [cle, q] of Object.entries(REQUETES)) {
  const url = `https://nominatim.openstreetmap.org/search?format=jsonv2&limit=1&addressdetails=1&viewbox=${BOITE}&bounded=1&q=${encodeURIComponent(q)}`;
  try {
    const r = await fetch(url, { headers: { "User-Agent": "guide-villes-prototype/0.1", "Accept-Language": "fr" } });
    const j = await r.json();
    const h = j[0];
    sortie[cle] = h
      ? { q, lat: +(+h.lat).toFixed(6), lon: +(+h.lon).toFixed(6), nom: h.name, type: `${h.category}/${h.type}`, rue: h.address?.road ?? h.address?.pedestrian ?? h.address?.square ?? null, quartier: h.address?.suburb ?? h.address?.neighbourhood ?? h.address?.quarter ?? null }
      : { q, absent: true };
  } catch (e) {
    sortie[cle] = { q, erreur: String(e) };
  }
  const s = sortie[cle];
  console.log(cle.padEnd(16), s.absent ? "— introuvable" : s.erreur ? "— erreur " + s.erreur : `${s.lat}, ${s.lon}  ${s.type}  « ${s.nom} »  ${s.rue ?? ""} · ${s.quartier ?? ""}`);
  await pause(1100);
}
fs.mkdirSync(path.dirname(SORTIE), { recursive: true });
fs.writeFileSync(SORTIE, JSON.stringify(sortie, null, 1));
console.log("→", SORTIE);
