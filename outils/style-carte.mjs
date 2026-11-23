// Fabrique le fond de carte « papier » de l'appli à partir du style vectoriel Plan IGN (Géoplateforme, licence ouverte).
// On garde les tuiles et les polices de l'IGN ; on ne change que les couleurs et on retire le superflu.
// Usage : node outils/style-carte.mjs   → public/data/style-papier.json
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ici = path.dirname(fileURLToPath(import.meta.url));
const racine = path.join(ici, "..");
const SRC = path.join(ici, "tmp", "planign.json");
const URL_STYLE = "https://data.geopf.fr/annexes/ressources/vectorTiles/styles/PLAN.IGN/standard.json";
if (!fs.existsSync(SRC)) {
  fs.mkdirSync(path.dirname(SRC), { recursive: true });
  fs.writeFileSync(SRC, Buffer.from(await (await fetch(URL_STYLE)).arrayBuffer()));
}
const s = JSON.parse(fs.readFileSync(SRC, "utf8"));

const C = {
  terre: "#F1EAD8", eau: "#2A6788", vert: "#CFDDB9", bati: "#E3D6BA", batiBord: "#CDBE9C", batiHaut: "#EFE4CB",
  route: "#FFFDF6", routeBord: "#D6C9AB", chemin: "#C9BB9A", rail: "#A99C82", place: "#F8F2E3",
  texte: "#3D4852", texteFort: "#16202A", halo: "#FBF6E9", texteEau: "#E4EEF4",
};
const RETIRER = /^(oro_|ocs_nature_sol_surf|bati_zai|bati_zone_surf|limite_lin|parcellaire|toponyme_parcellaire|routier_ponc|hydro_ponc|bati_ponc|toponyme_routier_borne|toponyme_routier_numero_lin|toponyme_routier_liaison_lin|toponyme_oro|toponyme_limite|toponyme_ferre|routier_liaison)/;

const couches = [];
for (const l of s.layers) {
  const sl = l["source-layer"] ?? "";
  const id = l.id.toLowerCase();
  if (l.type === "background" || sl === "fond_opaque") {
    couches.push({ id: "fond", type: "background", paint: { "background-color": C.terre } });
    continue;
  }
  if (RETIRER.test(sl)) continue;
  const p = (l.paint = { ...(l.paint ?? {}) });
  if (l.type === "fill") {
    delete p["fill-pattern"];
    if (sl === "hydro_surf") { p["fill-color"] = C.eau; delete p["fill-outline-color"]; p["fill-opacity"] = 1; }
    else if (sl === "ocs_vegetation_surf") { p["fill-color"] = C.vert; delete p["fill-outline-color"]; p["fill-opacity"] = 0.85; }
    else if (sl === "bati_surf") { p["fill-color"] = C.bati; p["fill-outline-color"] = C.batiBord; p["fill-opacity"] = 1; }
    else if (sl === "routier_surf") { p["fill-color"] = C.place; delete p["fill-outline-color"]; }
    else continue;
  } else if (l.type === "line") {
    delete p["line-pattern"];
    if (sl.startsWith("hydro")) p["line-color"] = C.eau;
    else if (sl.startsWith("ferre")) { p["line-color"] = C.rail; if (/sou/.test(sl)) continue; }
    else if (sl.startsWith("bati")) { p["line-color"] = C.batiBord; }
    else if (sl.startsWith("routier_chemin")) p["line-color"] = C.chemin;
    else if (sl.startsWith("routier")) {
      if (/_sou$/.test(sl)) continue; // les tunnels
      if (id.includes("axe centra")) continue;
      p["line-color"] = id.includes("filet ext") ? C.routeBord : C.route;
    } else continue;
  } else if (l.type === "symbol") {
    const lay = (l.layout = { ...(l.layout ?? {}) });
    for (const k of Object.keys(lay)) if (k.startsWith("icon-")) delete lay[k];
    for (const k of Object.keys(p)) if (k.startsWith("icon-")) delete p[k];
    if (!lay["text-field"]) continue;
    const surEau = sl.startsWith("toponyme_hydro");
    p["text-color"] = surEau ? C.texteEau : sl === "toponyme_localite_ponc" ? C.texteFort : C.texte;
    p["text-halo-color"] = surEau ? C.eau : C.halo;
    p["text-halo-width"] = 1.4;
    delete p["text-halo-blur"];
  } else if (l.type === "circle") continue;
  couches.push(l);
}

// les bâtiments en volume, comme les maquettes en papier des vidéos (à partir du zoom 15)
const iBati = couches.findLastIndex((l) => l["source-layer"] === "bati_surf" || (l["source-layer"] ?? "").startsWith("bati_lin"));
couches.splice(iBati + 1, 0, {
  id: "bati-volume", type: "fill-extrusion", source: "plan_ign", "source-layer": "bati_surf", minzoom: 15,
  filter: [">", ["to-number", ["get", "hauteur"], 0], 2],
  paint: {
    "fill-extrusion-color": C.batiHaut,
    "fill-extrusion-height": ["interpolate", ["linear"], ["zoom"], 15, 0, 15.6, ["to-number", ["get", "hauteur"], 6]],
    "fill-extrusion-opacity": 0.92,
    "fill-extrusion-vertical-gradient": true,
  },
});

const style = {
  version: 8, name: "Papier (d'après Plan IGN)",
  sources: { plan_ign: { type: "vector", tiles: s.sources.plan_ign.tiles, minzoom: 0, maxzoom: 18, attribution: "© IGN · Géoplateforme" } },
  glyphs: s.glyphs,
  layers: couches,
};
const out = path.join(racine, "public", "data", "style-papier.json");
fs.mkdirSync(path.dirname(out), { recursive: true });
fs.writeFileSync(out, JSON.stringify(style));
console.log(`${s.layers.length} couches IGN → ${couches.length} couches · ${(fs.statSync(out).size / 1024).toFixed(0)} Ko → ${out}`);
