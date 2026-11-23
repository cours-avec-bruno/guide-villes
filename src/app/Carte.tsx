// La carte (MapLibre + fond Plan IGN recoloré « papier »). Deux vues :
//   « itineraire » : le parcours prévu (pointillés rouges à faire, trait d'encre déjà fait), les étapes numérotées, les adresses ;
//   « carnet »     : le voyage tel qu'il a été fait, dans l'ordre où les étapes ont été cochées, avec les photos.
import { useEffect, useRef, useState } from "react";
import type * as ML from "maplibre-gl";
import { url } from "../base";
import { ADRESSES, VILLE, etape, type Trajets } from "./donnees";
import { coord, noeudDepart, troncon, type Plan } from "./moteur";
import type { Voyage } from "./stockage";

type Props = {
  T: Trajets;
  voyage: Voyage;
  plan: Plan;
  vue: "itineraire" | "carnet";
  visible: boolean;
  rejouer: number; // on l'incrémente pour lancer « Rejouer mon voyage »
  vignettes: Record<string, string>; // étape → URL de sa première photo
  onEtape: (id: string) => void;
  onAdresse: (id: string) => void;
  onPosition: (p: [number, number]) => void;
};

let promesse: Promise<typeof ML> | null = null;
function chargerMapLibre() {
  if (!promesse) {
    const lien = document.createElement("link");
    lien.rel = "stylesheet";
    lien.href = url("/vendor/maplibre/maplibre-gl.css");
    document.head.appendChild(lien);
    // import « à la main » : le fichier est servi tel quel depuis /public (MapLibre 6 charge son worker à côté de lui),
    // il ne doit donc pas passer par le bundler
    const importer = new Function("u", "return import(u)") as (u: string) => Promise<typeof ML>;
    promesse = importer(url("/vendor/maplibre/maplibre-gl.mjs"));
  }
  return promesse;
}

const ligne = (coords: [number, number][], props: Record<string, unknown>) => ({ type: "Feature" as const, properties: props, geometry: { type: "LineString" as const, coordinates: coords } });
const VIDE = { type: "FeatureCollection" as const, features: [] as ReturnType<typeof ligne>[] };

/** Le voyage réel : les étapes dans l'ordre où elles ont été cochées, et le chemin qui les relie. */
export function traceCarnet(T: Trajets, v: Voyage) {
  const ordre = Object.entries(v.vus).sort((a, b) => a[1] - b[1]).map(([id]) => id);
  const pts: [number, number][] = [];
  let metres = 0;
  const r = { ...v.reponses, montees: true };
  ordre.forEach((id, i) => {
    if (i === 0) { pts.push(coord(id)); return; }
    const t = troncon(T, ordre[i - 1], id, r);
    metres += t.m;
    pts.push(...t.geo);
  });
  return { ordre, pts, metres };
}

export default function Carte({ T, voyage, plan, vue, visible, rejouer, vignettes, onEtape, onAdresse, onPosition }: Props) {
  const boite = useRef<HTMLDivElement>(null);
  const carte = useRef<ML.Map | null>(null);
  const ml = useRef<typeof ML | null>(null);
  const marqueurs = useRef<ML.Marker[]>([]);
  const anim = useRef(0);
  const rappels = useRef({ onEtape, onAdresse, onPosition });
  rappels.current = { onEtape, onAdresse, onPosition };
  const [pret, setPret] = useState(false);
  const [erreur, setErreur] = useState(false);

  // création, une seule fois
  useEffect(() => {
    let annule = false;
    chargerMapLibre()
      .then((lib) => {
        if (annule || !boite.current) return;
        ml.current = lib;
        const m = new lib.Map({
          container: boite.current,
          style: url("/data/style-papier.json"),
          center: VILLE.centre,
          zoom: VILLE.zoom,
          minZoom: 11,
          maxZoom: 18,
          maxBounds: [[4.68, 45.66], [5.0, 45.86]],
          attributionControl: { compact: true },
          cooperativeGestures: false,
        });
        m.addControl(new lib.NavigationControl({ showCompass: false }), "top-right");
        const geo = new lib.GeolocateControl({ positionOptions: { enableHighAccuracy: true }, trackUserLocation: true });
        m.addControl(geo, "top-right");
        geo.on("geolocate", (e) => rappels.current.onPosition([e.coords.longitude, e.coords.latitude]));
        m.on("load", () => {
          m.addSource("trace", { type: "geojson", data: VIDE });
          m.addLayer({ id: "trace-bord", type: "line", source: "trace", layout: { "line-cap": "round", "line-join": "round" }, paint: { "line-color": "#FFFDF6", "line-width": 8, "line-opacity": 0.9 } });
          m.addLayer({ id: "trace-fait", type: "line", source: "trace", filter: ["==", ["get", "etat"], "fait"], layout: { "line-cap": "round", "line-join": "round" }, paint: { "line-color": "#16202A", "line-width": 4 } });
          m.addLayer({ id: "trace-afaire", type: "line", source: "trace", filter: ["==", ["get", "etat"], "afaire"], layout: { "line-cap": "round", "line-join": "round" }, paint: { "line-color": "#DE3341", "line-width": 4, "line-dasharray": [0.1, 1.9] } });
          m.addLayer({ id: "trace-carnet", type: "line", source: "trace", filter: ["==", ["get", "etat"], "carnet"], layout: { "line-cap": "round", "line-join": "round" }, paint: { "line-color": "#DE3341", "line-width": 4.5 } });
          setPret(true);
        });
        carte.current = m;
      })
      .catch(() => setErreur(true));
    return () => {
      annule = true;
      cancelAnimationFrame(anim.current);
      carte.current?.remove();
      carte.current = null;
    };
  }, []);

  // le tracé et les marqueurs suivent le voyage et la vue
  useEffect(() => {
    const m = carte.current, lib = ml.current;
    if (!m || !lib || !pret) return;
    cancelAnimationFrame(anim.current);
    marqueurs.current.forEach((x) => x.remove());
    marqueurs.current = [];
    const src = m.getSource("trace") as ML.GeoJSONSource;
    const poser = (el: HTMLElement, p: [number, number], ancre: "bottom" | "center" = "bottom") => marqueurs.current.push(new lib.Marker({ element: el, anchor: ancre }).setLngLat(p).addTo(m));
    const bouton = (classe: string, html: string, titre: string, clic: () => void) => {
      const b = document.createElement("button");
      b.type = "button";
      b.className = classe;
      b.innerHTML = html;
      b.setAttribute("aria-label", titre);
      b.addEventListener("click", (e) => { e.stopPropagation(); clic(); });
      return b;
    };

    if (vue === "carnet") {
      const { ordre, pts } = traceCarnet(T, voyage);
      src.setData({ type: "FeatureCollection", features: pts.length > 1 ? [ligne(pts, { etat: "carnet" })] : [] });
      ordre.forEach((id, i) => {
        const e = etape(id);
        const photo = vignettes[id];
        const html = photo ? `<img src="${photo}" alt=""><i>${i + 1}</i>` : `<span>${i + 1}</span>`;
        poser(bouton(photo ? "pin pin--photo" : "pin pin--vu", html, `${e.nom}, étape ${i + 1} de ton voyage`, () => rappels.current.onEtape(id)), [e.lon, e.lat]);
      });
    } else {
      const feats: ReturnType<typeof ligne>[] = [];
      let fait = true; // un tronçon est « fait » tant que l'étape où il arrive est cochée
      for (const l of plan.lignes) {
        if (l.type === "etape") fait = fait && !!voyage.vus[l.id];
        if (l.type === "trajet") {
          const cible = plan.lignes[plan.lignes.indexOf(l) + 1];
          const arrive = cible && cible.type === "etape" ? !!voyage.vus[cible.id] : false;
          feats.push(ligne(l.troncon.geo, { etat: fait && arrive ? "fait" : "afaire" }));
        }
      }
      src.setData({ type: "FeatureCollection", features: feats });
      const d = coord(noeudDepart(voyage.reponses), voyage.reponses);
      const dep = document.createElement("div");
      dep.className = "pin-depart";
      dep.textContent = "Départ";
      poser(dep, d, "center");
      for (const a of ADRESSES) poser(bouton("pin-adresse", `<svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><path d="M7 3v7a2 2 0 002 2v9M5 3v5M9 3v5M17 3c-1.7 1-3 3.5-3 7 0 1.5 1 2 3 2v9"/></svg>`, `${a.nom}, ${a.type}`, () => rappels.current.onAdresse(a.id)), [a.lon, a.lat], "center");
      voyage.etapes.forEach((id, i) => {
        const e = etape(id);
        const vu = !!voyage.vus[id];
        poser(bouton(vu ? "pin pin--vu" : "pin", `<span>${i + 1}</span>`, `Étape ${i + 1} : ${e.nom}${vu ? ", cochée" : ""}`, () => rappels.current.onEtape(id)), [e.lon, e.lat]);
      });
    }
  }, [pret, vue, voyage, plan, T, vignettes]);

  // cadrer sur le parcours quand il change ou quand la carte s'affiche
  const cleCadre = vue + "|" + voyage.id + "|" + voyage.etapes.join(".") + "|" + (vue === "carnet" ? Object.keys(voyage.vus).length : "");
  useEffect(() => {
    const m = carte.current, lib = ml.current;
    if (!m || !lib || !pret || !visible) return;
    m.resize();
    const ids = vue === "carnet" && Object.keys(voyage.vus).length ? Object.keys(voyage.vus) : voyage.etapes;
    const b = new lib.LngLatBounds();
    ids.forEach((id) => b.extend(coord(id)));
    if (vue !== "carnet") b.extend(coord(noeudDepart(voyage.reponses), voyage.reponses));
    const large = window.matchMedia("(min-width: 1000px)").matches;
    m.fitBounds(b, { padding: large ? 110 : { top: 70, bottom: 60, left: 44, right: 56 }, maxZoom: 16, duration: 600, pitch: 0 });
    // « ?nu=3d » : une vue inclinée du Vieux-Lyon, bâtiments en volume (image de fond de la page de vente)
    if (document.documentElement.dataset.nu === "3d") m.jumpTo({ center: [4.8296, 45.7622], zoom: 15.45, pitch: 58, bearing: -24 });
  }, [pret, visible, cleCadre]);

  // « Rejouer mon voyage » : le trait se redessine d'étape en étape
  useEffect(() => {
    const m = carte.current;
    if (!m || !pret || rejouer === 0 || vue !== "carnet") return;
    const { pts } = traceCarnet(T, voyage);
    if (pts.length < 2) return;
    const src = m.getSource("trace") as ML.GeoJSONSource;
    const duree = Math.min(9000, 1400 + pts.length * 14);
    const t0 = performance.now();
    const sansAnim = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const pas = (t: number) => {
      const k = sansAnim ? 1 : Math.min(1, (t - t0) / duree);
      const n = Math.max(2, Math.round(k * pts.length));
      src.setData({ type: "FeatureCollection", features: [ligne(pts.slice(0, n), { etat: "carnet" })] });
      if (!sansAnim) m.easeTo({ center: pts[n - 1], duration: 120, easing: (x) => x });
      if (k < 1) anim.current = requestAnimationFrame(pas);
    };
    if (!sansAnim) m.easeTo({ center: pts[0], zoom: Math.max(m.getZoom(), 15), duration: 500 });
    anim.current = requestAnimationFrame(pas);
    return () => cancelAnimationFrame(anim.current);
  }, [rejouer]);

  return (
    <div className="carte">
      <div ref={boite} className="carte__fond" role="application" aria-label={vue === "carnet" ? "Carte de ton voyage" : "Carte de ton itinéraire"} />
      {erreur && <p className="carte__erreur">La carte n'a pas pu se charger. Ton parcours reste disponible dans la liste.</p>}
    </div>
  );
}
