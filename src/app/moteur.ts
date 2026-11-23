// Le moteur d'itinéraire : choisit les étapes selon le temps et les envies, les met dans un ordre de marche logique,
// puis pose les horaires (trajets à pied de l'IGN calculés à l'avance, + 1 min par 10 m de montée).
import { ADRESSES, DEPARTS, ETAPES, etape, type Adresse, type Trajets } from "./donnees";

export type Reponses = {
  duree: number; // minutes
  depart: string; // id d'un point de départ, ou « position »
  position?: [number, number]; // lon, lat (si depart = « position »)
  themes: string[];
  montees: boolean; // vrai : les montées à pied ne gênent pas
  repas: boolean;
  heure: string; // « HH:MM »
};

export type Troncon = {
  min: number; m: number; mode: "pied" | "funiculaire" | "metro"; note?: string; geo: [number, number][];
};
export type Ligne =
  | { type: "depart"; nom: string; heure: number }
  | { type: "trajet"; troncon: Troncon; vers: string }
  | { type: "etape"; id: string; numero: number; heure: number }
  | { type: "repas"; heure: number; duree: number; adresse: Adresse; autres: Adresse[] }
  | { type: "fin"; heure: number };
export type Plan = { lignes: Ligne[]; minutes: number; metres: number; fin: number; marche: number };

const HAUTS_OUEST = new Set(["fourviere", "lugdunum"]);
const HAUTS_NORD = new Set(["voraces", "jacquard", "aretes"]);
const REPAS_MIN = 60;

// ——— géométrie
const rad = (d: number) => (d * Math.PI) / 180;
export function vol(a: [number, number], b: [number, number]) {
  const dLat = rad(b[1] - a[1]), dLon = rad(b[0] - a[0]);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(rad(a[1])) * Math.cos(rad(b[1])) * Math.sin(dLon / 2) ** 2;
  return 6371000 * 2 * Math.asin(Math.sqrt(h));
}
/** Décode une polyligne encodée (précision 5) en [lon, lat][]. */
export function decoder(str: string): [number, number][] {
  const pts: [number, number][] = [];
  let i = 0, lat = 0, lon = 0;
  while (i < str.length) {
    for (const axe of [0, 1]) {
      let res = 0, dec = 0, b: number;
      do { b = str.charCodeAt(i++) - 63; res |= (b & 0x1f) << dec; dec += 5; } while (b >= 0x20);
      const d = res & 1 ? ~(res >> 1) : res >> 1;
      if (axe === 0) lat += d; else lon += d;
    }
    pts.push([lon / 1e5, lat / 1e5]);
  }
  return pts;
}

// ——— les points : « traboules », « dep:perrache », « adr:abel », « position »
export function coord(id: string, r?: Reponses): [number, number] {
  if (id === "position") return r?.position ?? [4.8335, 45.7635];
  if (id.startsWith("dep:")) { const d = DEPARTS.find((x) => x.id === id.slice(4))!; return [d.lon, d.lat]; }
  if (id.startsWith("adr:")) { const a = ADRESSES.find((x) => x.id === id.slice(4))!; return [a.lon, a.lat]; }
  const e = etape(id); return [e.lon, e.lat];
}
export const noeudDepart = (r: Reponses) => (r.depart === "position" ? "position" : "dep:" + r.depart);

function brut(T: Trajets, a: string, b: string, r?: Reponses): { m: number; s: number; geo: [number, number][] } {
  const [x, y] = [a, b].sort();
  const t = T.trajets[`${x}|${y}`];
  if (t) { const g = decoder(t.g); return { m: t.m, s: t.s, geo: x === a ? g : g.reverse() }; }
  const A = coord(a, r), B = coord(b, r);
  const m = vol(A, B) * 1.3; // à vol d'oiseau, + 30 % pour les rues
  return { m: Math.round(m), s: Math.round(m / 1.0), geo: [A, B] }; // ~3,6 km/h, comme le profil piéton de l'IGN
}
const alt = (T: Trajets, id: string) => T.alt[id] ?? 170;

/** Le tronçon de a vers b, avec la montée, le funiculaire ou le métro quand il le faut. */
export function troncon(T: Trajets, a: string, b: string, r: Reponses): Troncon {
  const direct = brut(T, a, b, r);
  const montee = Math.max(0, alt(T, b) - alt(T, a));
  const aPied: Troncon = { min: Math.ceil(direct.s / 60 + montee / 10), m: direct.m, mode: "pied", geo: direct.geo };
  if (b === "premierfilm" || a === "premierfilm") {
    // Monplaisir est loin du centre : en métro (D), avec ~500 m de marche aux deux bouts ; + 10 min si l'on finit en haut d'une colline
    if (aPied.min > 30) {
      const note = b === "premierfilm" ? "Métro D, arrêt Monplaisir-Lumière" : "Métro D depuis Monplaisir-Lumière";
      return { min: 25 + (montee >= 40 ? 10 : 0), m: 500, mode: "metro", note, geo: [direct.geo[0], direct.geo[direct.geo.length - 1]] };
    }
  }
  if (!r.montees && montee >= 40 && (HAUTS_OUEST.has(b) || HAUTS_NORD.has(b))) {
    const station = HAUTS_OUEST.has(b) ? "dep:vieuxlyon" : "dep:hoteldeville";
    const approche = brut(T, a, station, r);
    const note = HAUTS_OUEST.has(b)
      ? "Funiculaire depuis la station Vieux-Lyon"
      : b === "jacquard" ? "Métro C depuis Hôtel de Ville, arrêt Croix-Rousse" : "Métro C depuis Hôtel de Ville, arrêt Croix-Paquet";
    return { min: Math.ceil(approche.s / 60) + 10, m: approche.m, mode: HAUTS_OUEST.has(b) ? "funiculaire" : "metro", note, geo: [...approche.geo, coord(b, r)] };
  }
  return aPied;
}

// ——— choisir et ordonner
const score = (id: string, themes: string[]) => 1 + 2 * etape(id).themes.filter((t) => themes.includes(t)).length;

function cout(T: Trajets, depart: string, ordre: string[], r: Reponses) {
  let total = 0, prec = depart;
  for (const id of ordre) { total += troncon(T, prec, id, r).min + etape(id).duree; prec = id; }
  return total;
}
function deuxOpt(T: Trajets, depart: string, ordre: string[], r: Reponses) {
  let mieux = ordre.slice(), c = cout(T, depart, mieux, r), bouge = true;
  while (bouge) {
    bouge = false;
    for (let i = 0; i < mieux.length - 1; i++)
      for (let j = i + 1; j < mieux.length; j++) {
        const essai = [...mieux.slice(0, i), ...mieux.slice(i, j + 1).reverse(), ...mieux.slice(j + 1)];
        const ce = cout(T, depart, essai, r);
        if (ce < c - 0.01) { mieux = essai; c = ce; bouge = true; }
      }
  }
  return mieux;
}
const minutesDe = (h: string) => { const [a, b] = h.split(":").map(Number); return a * 60 + b; };
/** Vrai si la visite passe par l'heure du déjeuner ou du dîner. */
function creneauRepas(debut: number, fin: number): number | null {
  for (const h of [12 * 60 + 15, 19 * 60 + 30]) if (debut <= h - 20 && fin >= h + 40) return h;
  return null;
}

/** Compose l'itinéraire : la liste ordonnée des étapes qui tiennent dans le temps donné. */
export function composer(T: Trajets, r: Reponses): string[] {
  const depart = noeudDepart(r);
  const debut = minutesDe(r.heure);
  const reserve = r.repas && r.duree >= 180 && creneauRepas(debut, debut + r.duree) !== null ? REPAS_MIN : 0;
  const budget = r.duree - reserve;
  const candidats = ETAPES.filter((e) => !e.horsCentre || r.duree >= 420).map((e) => e.id);
  let ordre: string[] = [];
  const reste = new Set(candidats);
  // d'abord, une étape par envie cochée (la moins coûteuse en temps), pour que chaque choix se voie dans le parcours
  for (const theme of r.themes) {
    if (ordre.some((id) => etape(id).themes.includes(theme))) continue;
    const possibles = [...reste]
      .filter((id) => etape(id).themes.includes(theme))
      .map((id) => ({ id, c: cout(T, depart, deuxOpt(T, depart, [...ordre, id], r), r) }))
      .filter((x) => x.c <= budget)
      .sort((a, b) => a.c - b.c);
    if (possibles[0]) {
      ordre = deuxOpt(T, depart, [...ordre, possibles[0].id], r);
      reste.delete(possibles[0].id);
    }
  }
  for (;;) {
    let choix: { id: string; pos: number; ratio: number } | null = null;
    const base = cout(T, depart, ordre, r);
    for (const id of reste)
      for (let pos = 0; pos <= ordre.length; pos++) {
        const essai = [...ordre.slice(0, pos), id, ...ordre.slice(pos)];
        const c = cout(T, depart, essai, r);
        if (c > budget) continue;
        const ratio = score(id, r.themes) / Math.max(1, c - base);
        if (!choix || ratio > choix.ratio) choix = { id, pos, ratio };
      }
    if (!choix) break;
    ordre.splice(choix.pos, 0, choix.id);
    reste.delete(choix.id);
    ordre = deuxOpt(T, depart, ordre, r);
  }
  if (ordre.length === 0) {
    // même avec très peu de temps, on propose l'étape la plus proche
    const proche = candidats.slice().sort((a, b) => troncon(T, depart, a, r).min - troncon(T, depart, b, r).min)[0];
    ordre = [proche];
  }
  return ordre;
}

/** Pose les horaires sur une liste d'étapes (et glisse la pause repas au bon moment). */
export function planifier(T: Trajets, r: Reponses, ordre: string[], nomDepart: string): Plan {
  const depart = noeudDepart(r);
  const debut = minutesDe(r.heure);
  const lignes: Ligne[] = [{ type: "depart", nom: nomDepart, heure: debut }];
  const sansRepas = cout(T, depart, ordre, r);
  const cible = r.repas ? creneauRepas(debut, debut + sansRepas + REPAS_MIN) : null;
  let t = debut, prec = depart, metres = 0, marche = 0, repasPose = false;
  const ajouterTrajet = (vers: string, nomVers: string) => {
    const tr = troncon(T, prec, vers, r);
    lignes.push({ type: "trajet", troncon: tr, vers: nomVers });
    t += tr.min; metres += tr.m; marche += tr.min; prec = vers;
  };
  ordre.forEach((id, i) => {
    const arrivee = t + troncon(T, prec, id, r).min;
    if (cible !== null && !repasPose && i > 0 && arrivee >= cible - 10) {
      // la table qui fait faire le moins de détour entre l'étape d'avant et celle d'après
      const tables = ADRESSES.filter((a) => a.repas)
        .map((a) => ({ a, detour: troncon(T, prec, "adr:" + a.id, r).min + troncon(T, "adr:" + a.id, id, r).min }))
        .sort((x, y) => x.detour - y.detour);
      const table = tables[0].a;
      ajouterTrajet("adr:" + table.id, table.nom);
      lignes.push({ type: "repas", heure: t, duree: REPAS_MIN, adresse: table, autres: tables.slice(1, 3).map((x) => x.a) });
      t += REPAS_MIN; repasPose = true;
    }
    ajouterTrajet(id, etape(id).nom);
    lignes.push({ type: "etape", id, numero: i + 1, heure: t });
    t += etape(id).duree;
  });
  lignes.push({ type: "fin", heure: t });
  return { lignes, minutes: t - debut, metres, fin: t, marche };
}

// ——— affichage
export const hhmm = (min: number) => `${String(Math.floor(min / 60) % 24).padStart(2, "0")}:${String(Math.round(min) % 60).padStart(2, "0")}`;
export function duree(min: number) {
  const h = Math.floor(min / 60), m = Math.round(min % 60);
  return h === 0 ? `${m} min` : m === 0 ? `${h} h` : `${h} h ${String(m).padStart(2, "0")}`;
}
export const distance = (m: number) => (m < 950 ? `${Math.round(m / 50) * 50} m` : `${(m / 1000).toFixed(1).replace(".", ",")} km`);
