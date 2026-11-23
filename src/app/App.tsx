// L'appli de visite de Lyon : questionnaire → itinéraire avec horaires → carte, adresses et carnet de voyage.
import { useEffect, useMemo, useRef, useState } from "react";
import { url } from "../base";
import { MARQUE } from "../marque";
import Carte, { traceCarnet } from "./Carte";
import { ADRESSES, DEPARTS, ETAPES, VISITES, chargerTrajets, depart as leDepart, type Trajets } from "./donnees";
import { Adresses, Carnet, FicheAdresse, FicheEtape, Parcours, Questionnaire } from "./Ecrans";
import { Icone } from "./Icone";
import { composer, coord, planifier, vol, type Reponses } from "./moteur";
import { ajouterPhoto, ecrire, lire, lirePhoto, nouvelId, supprimerPhoto, type Etat, type Voyage } from "./stockage";

type Onglet = "parcours" | "carte" | "adresses" | "carnet";
const ONGLETS: { id: Onglet; nom: string; icone: string }[] = [
  { id: "parcours", nom: "Parcours", icone: "liste" },
  { id: "carte", nom: "Carte", icone: "carte" },
  { id: "adresses", nom: "Adresses", icone: "fourchette" },
  { id: "carnet", nom: "Carnet", icone: "carnet" },
];

function heureParDefaut() {
  const d = new Date();
  const m = d.getHours() * 60 + d.getMinutes();
  if (m < 8 * 60 || m > 19 * 60) return "10:00";
  const q = Math.ceil(m / 15) * 15;
  return `${String(Math.floor(q / 60)).padStart(2, "0")}:${String(q % 60).padStart(2, "0")}`;
}
const reponsesParDefaut = (): Reponses => ({ duree: 180, depart: "bellecour", themes: [], montees: true, repas: true, heure: heureParDefaut() });
const nomDepart = (r: Reponses) => (r.depart === "position" ? "ta position" : leDepart(r.depart).nom);

function useLarge() {
  const [large, setLarge] = useState(() => typeof window !== "undefined" && window.matchMedia("(min-width: 1000px)").matches);
  useEffect(() => {
    const mq = window.matchMedia("(min-width: 1000px)");
    const f = () => setLarge(mq.matches);
    mq.addEventListener("change", f);
    return () => mq.removeEventListener("change", f);
  }, []);
  return large;
}

export default function App() {
  const [T, setT] = useState<Trajets | null>(null);
  const [etat, setEtatBrut] = useState<Etat>(lire);
  const [onglet, setOnglet] = useState<Onglet>("parcours");
  const [edition, setEdition] = useState(false);
  const [fiche, setFiche] = useState<string | null>(null);
  const [ficheAdr, setFicheAdr] = useState<string | null>(null);
  const [ici, setIci] = useState<[number, number] | null>(null);
  const [rejouer, setRejouer] = useState(0);
  const [urls, setUrls] = useState<Record<string, string>>({});
  const [partage, setPartage] = useState("");
  const [panne, setPanne] = useState(false);
  const large = useLarge();
  const lu = useRef(false);

  const setEtat = (f: (e: Etat) => Etat) => setEtatBrut((e) => { const n = f(e); ecrire(n); return n; });
  const voyage = etat.voyages.find((v) => v.id === etat.courant) ?? null;
  const majVoyage = (f: (v: Voyage) => Voyage) => setEtat((e) => ({ ...e, voyages: e.voyages.map((v) => (v.id === e.courant ? f(v) : v)) }));
  const creerVoyage = (v: Omit<Voyage, "id" | "cree" | "vus" | "photos">) => {
    const neuf: Voyage = { ...v, id: nouvelId(), cree: Date.now(), vus: {}, photos: {} };
    setEtat((e) => ({ voyages: [...e.voyages.slice(-9), neuf], courant: neuf.id }));
    setEdition(false);
    setOnglet("parcours");
    window.scrollTo(0, 0);
  };
  const lancerSecrets = (heure?: string) => {
    const s = VISITES[0];
    creerVoyage({ mode: "5-secrets", etapes: s.etapes, reponses: { ...reponsesParDefaut(), depart: s.depart, repas: false, duree: 120, ...(heure ? { heure } : {}) } });
  };

  useEffect(() => { chargerTrajets().then(setT).catch(() => setPanne(true)); }, []);

  // l'adresse de la page peut porter une visite toute faite (?visite=5-secrets) ou un itinéraire partagé (?i=…)
  useEffect(() => {
    if (lu.current) return;
    lu.current = true;
    const p = new URLSearchParams(location.search);
    const ids = (p.get("i") ?? "").split(".").filter((id) => ETAPES.some((e) => e.id === id));
    if (p.get("visite") === "5-secrets") {
      const h = /^\d\d:\d\d$/.test(p.get("h") ?? "") ? p.get("h")! : undefined;
      if (voyage?.mode !== "5-secrets" || h) lancerSecrets(h);
    } else if (ids.length) {
      const d = p.get("d") ?? "bellecour";
      creerVoyage({
        mode: "sur-mesure", etapes: ids,
        reponses: { ...reponsesParDefaut(), depart: DEPARTS.some((x) => x.id === d) ? d : "bellecour", heure: /^\d\d:\d\d$/.test(p.get("h") ?? "") ? p.get("h")! : "10:00", montees: p.get("m") !== "0", repas: p.get("r") === "1" },
      });
    } else if (p.get("nouveau") !== null) setEdition(true);
    const o = p.get("onglet") as Onglet | null;
    if (o && ONGLETS.some((x) => x.id === o)) setOnglet(o);
    // « ?nu » : la carte seule, sans en-tête ni boutons (sert à fabriquer les images de la page de vente)
    if (p.has("nu")) { document.documentElement.dataset.nu = p.get("nu") ?? ""; return; }
    if (p.size) history.replaceState(null, "", location.pathname);
  }, []);

  const plan = useMemo(() => (T && voyage ? planifier(T, voyage.reponses, voyage.etapes, nomDepart(voyage.reponses)) : null), [T, voyage?.id, voyage?.etapes, voyage?.reponses]);
  const carnet = useMemo(() => (T && voyage ? traceCarnet(T, voyage) : null), [T, voyage?.vus]);

  // les photos : une adresse d'image par clé, tant que la page est ouverte
  const toutes = voyage ? Object.values(voyage.photos).flat() : [];
  useEffect(() => {
    let vivant = true;
    toutes.filter((c) => !urls[c]).forEach(async (c) => {
      const b = await lirePhoto(c);
      if (b && vivant) setUrls((u) => (u[c] ? u : { ...u, [c]: URL.createObjectURL(b) }));
    });
    return () => { vivant = false; };
  }, [toutes.join("|")]);
  const vignettes = useMemo(() => {
    const v: Record<string, string> = {};
    if (voyage) for (const [id, l] of Object.entries(voyage.photos)) if (l[0] && urls[l[0]]) v[id] = urls[l[0]];
    return v;
  }, [voyage?.photos, urls]);

  const cocher = (id: string) => majVoyage((v) => {
    const vus = { ...v.vus };
    if (vus[id]) delete vus[id]; else vus[id] = Date.now();
    return { ...v, vus };
  });
  const ajouter = async (id: string, f: File) => {
    const cle = await ajouterPhoto(f);
    majVoyage((v) => ({ ...v, photos: { ...v.photos, [id]: [...(v.photos[id] ?? []), cle] }, vus: v.vus[id] ? v.vus : { ...v.vus, [id]: Date.now() } }));
  };
  const supprimer = (id: string, cle: string) => {
    supprimerPhoto(cle);
    majVoyage((v) => ({ ...v, photos: { ...v.photos, [id]: (v.photos[id] ?? []).filter((c) => c !== cle) } }));
  };
  const partager = async () => {
    if (!voyage) return;
    const r = voyage.reponses;
    const url = `${location.origin}${location.pathname}?i=${voyage.etapes.join(".")}&d=${r.depart === "position" ? "bellecour" : r.depart}&h=${r.heure}&m=${r.montees ? 1 : 0}&r=${r.repas ? 1 : 0}`;
    try {
      if (navigator.share) await navigator.share({ title: `Mon itinéraire dans Lyon`, url });
      else { await navigator.clipboard.writeText(url); setPartage("Lien copié"); setTimeout(() => setPartage(""), 2200); }
    } catch { /* partage annulé */ }
  };

  // l'étape non cochée la plus proche, quand la position est connue (à moins de 80 m)
  const proche = useMemo(() => {
    if (!ici || !voyage) return null;
    const cible = voyage.etapes.filter((id) => !voyage.vus[id]).map((id) => ({ id, d: vol(ici, coord(id)) })).sort((a, b) => a.d - b.d)[0];
    return cible && cible.d < 80 ? cible.id : null;
  }, [ici, voyage?.etapes, voyage?.vus]);

  if (panne) return <p className="attente">Le guide n'a pas pu se charger. Vérifie ta connexion, puis recharge la page.</p>;
  if (!T) return <p className="attente" role="status">Chargement du guide de Lyon…</p>;

  if (!voyage || !plan || edition) {
    return (
      <div className="appli appli--q">
        <EnTete />
        <Questionnaire
          depart={voyage?.mode === "sur-mesure" ? voyage.reponses : reponsesParDefaut()}
          peutFermer={!!voyage}
          onFermer={() => setEdition(false)}
          onSecrets={() => lancerSecrets()}
          onCreer={(r) => creerVoyage({ mode: "sur-mesure", reponses: r, etapes: composer(T, r) })}
        />
      </div>
    );
  }

  const actif: Onglet = large && onglet === "carte" ? "parcours" : onglet;
  const carteVisible = large || actif === "carte" || actif === "carnet";
  const ouvrirEtape = (id: string) => { setFicheAdr(null); setFiche(id); };
  const ouvrirAdresse = (id: string) => { setFiche(null); setFicheAdr(id); };

  return (
    <div className="appli" data-onglet={actif}>
      <EnTete />
      <nav className="onglets" aria-label="Les parties du guide">
        {ONGLETS.map((o) => (
          <button key={o.id} type="button" className="onglet" data-id={o.id} aria-current={actif === o.id ? "page" : undefined} onClick={() => { setOnglet(o.id); window.scrollTo(0, 0); }}>
            <Icone nom={o.icone} /> <span>{o.nom}</span>
          </button>
        ))}
      </nav>

      <div className="zone-carte" aria-hidden={!carteVisible}>
        <Carte
          T={T} voyage={voyage} plan={plan} vue={actif === "carnet" ? "carnet" : "itineraire"} visible={carteVisible}
          rejouer={rejouer} vignettes={vignettes} onEtape={ouvrirEtape} onAdresse={ouvrirAdresse} onPosition={setIci}
        />
      </div>

      <main className="panneau" id="contenu">
        {actif === "parcours" && (
          <Parcours voyage={voyage} plan={plan} proche={proche} partage={partage} onOuvrir={ouvrirEtape} onCocher={cocher} onModifier={() => setEdition(true)} onPartager={partager} onAdresse={ouvrirAdresse} />
        )}
        {actif === "adresses" && <Adresses T={T} voyage={voyage} onAdresse={ouvrirAdresse} />}
        {actif === "carnet" && (
          <Carnet voyage={voyage} metres={carnet?.metres ?? 0} urls={urls} onOuvrir={ouvrirEtape} onRejouer={() => setRejouer((n) => n + 1)} onParcours={() => setOnglet("parcours")} onAjouter={ajouter} onSupprimer={supprimer} />
        )}
      </main>

      {fiche && (
        <FicheEtape
          key={fiche} id={fiche} voyage={voyage} urls={urls}
          numero={voyage.etapes.includes(fiche) ? voyage.etapes.indexOf(fiche) + 1 : null}
          onFermer={() => setFiche(null)} onCocher={cocher} onAjouter={ajouter} onSupprimer={supprimer}
        />
      )}
      {ficheAdr && <FicheAdresse a={ADRESSES.find((a) => a.id === ficheAdr)!} onFermer={() => setFicheAdr(null)} />}
    </div>
  );
}

function EnTete() {
  return (
    <header className="tete">
      <a className="evitement" href="#contenu">Aller au contenu</a>
      <a className="tete__marque" href={url("/")} aria-label={`${MARQUE}, retour à l'accueil`}>
        <svg viewBox="0 0 48 48" width="26" height="26" aria-hidden="true">
          <path d="M24 44S9 30.6 9 19.5a15 15 0 1130 0C39 30.6 24 44 24 44z" fill="currentColor" />
          <path d="M17 19.5a7 7 0 0114 0v5h-4.5v-5a2.5 2.5 0 00-5 0V28" fill="none" stroke="#f3eddd" strokeWidth="3" strokeLinecap="round" />
        </svg>
        <span>{MARQUE}</span>
      </a>
      <span className="tete__ville">Lyon</span>
    </header>
  );
}
