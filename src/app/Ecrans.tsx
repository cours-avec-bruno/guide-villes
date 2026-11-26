// Les écrans de l'appli : les balades, le sur-mesure, le parcours, les adresses, le carnet, et la fiche d'une étape.
import { useEffect, useMemo, useRef, useState } from "react";
import { url } from "../base";
import { ADRESSES, DEPARTS, THEMES, VIDEOS, dureeVideo, etape, type Adresse, type Trajets } from "./donnees";
import { distance, duree, hhmm, troncon, type Plan, type Reponses } from "./moteur";
import { Icone } from "./Icone";
import type { Voyage } from "./stockage";

const DUREES = [
  { min: 90, nom: "1 h 30" },
  { min: 180, nom: "3 h" },
  { min: 300, nom: "5 h" },
  { min: 480, nom: "La journée" },
];
const guidage = (lat: number, lon: number) => `https://www.google.com/maps/dir/?api=1&destination=${lat},${lon}&travelmode=walking`;
const heureReelle = (t: number) => new Date(t).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" });

function Puce({ actif, onClick, children }: { actif: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button type="button" className="puce" aria-pressed={actif} onClick={onClick}>
      {children}
    </button>
  );
}

// ——————————————————————————————————————————————————————————— les balades prêtes à lancer (le premier écran)
export type Balade = { id: string; nom: string; etiquette: string; accroche: string; etapes: string[]; minutes: number; depart: string; verrou?: boolean };

export function Balades({ balades, peutFermer, gratuit, onChoisir, onSurMesure, onFermer, onVerrou }: {
  balades: Balade[]; peutFermer: boolean; gratuit: boolean;
  onChoisir: (id: string) => void; onSurMesure: () => void; onFermer: () => void; onVerrou: (raison: string) => void;
}) {
  return (
    <main className="q" id="contenu">
      <div className="q__tete">
        <p className="etiquette">Lyon</p>
        {peutFermer && (
          <button type="button" className="rond" onClick={onFermer} aria-label="Revenir à ma balade">
            <Icone nom="fermer" />
          </button>
        )}
      </div>
      <h1 className="q__titre">Le guide de Lyon</h1>
      <p className="q__chapo">
        {gratuit
          ? "Ton guide gratuit contient « Les 5 secrets ». Les autres balades et le sur-mesure sont dans le guide complet."
          : "Choisis une balade. Elle s'ouvre tout de suite, avec la carte et une vidéo à chaque étape."}
      </p>

      <ul className="balades">
        {balades.map((b) => (
          <li key={b.id}>
            <button type="button" className="balade" data-verrou={b.verrou || undefined} onClick={() => (b.verrou ? onVerrou(`« ${b.nom} » est dans le guide complet`) : onChoisir(b.id))}>
              <span className="balade__images" aria-hidden="true">
                {[b.etapes[0], b.etapes[Math.floor(b.etapes.length / 2)], b.etapes[b.etapes.length - 1]].map((id) => (
                  <img key={id} src={url(`/videos/lyon/${etape(id).videos[0]}.jpg`)} alt="" loading="lazy" width="60" height="80" />
                ))}
              </span>
              <span className="balade__texte">
                <span className="adresse__type">{b.verrou ? <><Icone nom="cadenas" taille={13} /> Guide complet</> : b.etiquette}</span>
                <strong>{b.nom}</strong>
                <span>{b.accroche}</span>
                <span className="balade__meta">{b.etapes.length} étapes · {duree(b.minutes)} · départ {b.depart}</span>
              </span>
              <span className="balade__fleche"><Icone nom={b.verrou ? "cadenas" : "fleche"} /></span>
            </button>
          </li>
        ))}
      </ul>

      <div className="q__pied">
        <button type="button" className="btn btn--contour btn--bloc" onClick={() => (gratuit ? onVerrou("La balade sur mesure est dans le guide complet") : onSurMesure())}>
          <Icone nom={gratuit ? "cadenas" : "crayon"} taille={16} /> Composer ma balade sur mesure
        </button>
      </div>
    </main>
  );
}

// ——————————————————————————————————————————————————————————— le sur-mesure (après les balades)
export function Questionnaire({ depart, apercu, onCreer, onFermer }: {
  depart: Reponses; apercu: (r: Reponses) => { n: number; minutes: number; metres: number };
  onCreer: (r: Reponses) => void; onFermer: () => void;
}) {
  const [r, setR] = useState<Reponses>(depart);
  const [geo, setGeo] = useState<"" | "attente" | "refus">("");
  const maj = (p: Partial<Reponses>) => setR((x) => ({ ...x, ...p }));
  const maPosition = () => {
    if (!navigator.geolocation) return setGeo("refus");
    setGeo("attente");
    navigator.geolocation.getCurrentPosition(
      (p) => { maj({ depart: "position", position: [p.coords.longitude, p.coords.latitude] }); setGeo(""); },
      () => setGeo("refus"),
      { enableHighAccuracy: true, timeout: 10000 },
    );
  };
  const res = useMemo(() => apercu(r), [r]);
  return (
    <main className="q q--mesure" id="contenu">
      <div className="q__tete">
        <p className="etiquette">Lyon</p>
        <button type="button" className="rond" onClick={onFermer} aria-label="Revenir aux balades">
          <Icone nom="retour" />
        </button>
      </div>
      <h1 className="q__titre">Ta balade sur mesure</h1>
      <p className="q__chapo">Règle ton temps et tes envies : le résultat se met à jour en bas de l'écran.</p>

      <fieldset className="q__bloc">
        <legend>Combien de temps ?</legend>
        <div className="puces">
          {DUREES.map((d) => (
            <Puce key={d.min} actif={r.duree === d.min} onClick={() => maj({ duree: d.min })}>{d.nom}</Puce>
          ))}
        </div>
      </fieldset>

      <fieldset className="q__bloc">
        <legend>Départ</legend>
        <div className="puces">
          {DEPARTS.map((d) => (
            <Puce key={d.id} actif={r.depart === d.id} onClick={() => maj({ depart: d.id })}>{d.nom}</Puce>
          ))}
          <Puce actif={r.depart === "position"} onClick={maPosition}>
            <Icone nom="cible" taille={16} /> {geo === "attente" ? "Recherche…" : "Ma position"}
          </Puce>
        </div>
        {geo === "refus" && <p className="q__note" role="status">Position indisponible. Choisis un point de départ dans la liste.</p>}
      </fieldset>

      <fieldset className="q__bloc">
        <legend>Tes envies <span>Facultatif, plusieurs choix possibles</span></legend>
        <div className="puces">
          {THEMES.map((t) => (
            <Puce key={t.id} actif={r.themes.includes(t.id)} onClick={() => maj({ themes: r.themes.includes(t.id) ? r.themes.filter((x) => x !== t.id) : [...r.themes, t.id] })}>
              {t.nom}
            </Puce>
          ))}
        </div>
      </fieldset>

      <fieldset className="q__bloc">
        <legend>Les collines</legend>
        <div className="puces">
          <Puce actif={r.montees} onClick={() => maj({ montees: true })}>Je monte à pied</Puce>
          <Puce actif={!r.montees} onClick={() => maj({ montees: false })}>Funiculaire et métro</Puce>
        </div>
      </fieldset>

      <fieldset className="q__bloc q__bloc--ligne">
        <legend>Heure et repas</legend>
        <label className="champ">
          <span>Heure de départ</span>
          <input type="time" value={r.heure} step={300} onChange={(ev) => maj({ heure: ev.target.value || "10:00" })} />
        </label>
        <label className="bascule">
          <input type="checkbox" checked={r.repas} onChange={(ev) => maj({ repas: ev.target.checked })} />
          <span>Prévoir une pause repas</span>
        </label>
      </fieldset>

      <div className="q__resultat">
        <p role="status">
          <strong>{res.n} étape{res.n > 1 ? "s" : ""} · {duree(res.minutes)}</strong>
          <span>{distance(res.metres)} à pied</span>
        </p>
        <button type="button" className="btn btn--plein" onClick={() => onCreer(r)}>
          Voir ma balade <Icone nom="fleche" taille={16} />
        </button>
      </div>
    </main>
  );
}

// ——————————————————————————————————————————————————————————— le parcours
export function Parcours({ voyage, plan, proche, photos, onOuvrir, onCocher, onModifier, onPartager, onAdresse, onCarnet, partage }: {
  voyage: Voyage; plan: Plan; proche: string | null; partage: string; photos: boolean;
  onOuvrir: (id: string) => void; onCocher: (id: string) => void; onModifier: () => void; onPartager: () => void; onAdresse: (id: string) => void; onCarnet: () => void;
}) {
  const n = voyage.etapes.length;
  const vus = voyage.etapes.filter((id) => voyage.vus[id]).length;
  return (
    <section className="ecran" aria-labelledby="t-parcours">
      <div className="resume">
        <p className="etiquette">Lyon</p>
        <h1 id="t-parcours">{voyage.nom ?? (voyage.mode === "5-secrets" ? "Les 5 secrets de Lyon" : "Ta balade sur mesure")}</h1>
        <p className="resume__chiffres">
          {n} étape{n > 1 ? "s" : ""} · {duree(plan.minutes)} · {distance(plan.metres)} à pied
        </p>
        <div className="jauge" role="progressbar" aria-valuemin={0} aria-valuemax={n} aria-valuenow={vus} aria-label="Étapes cochées">
          <span style={{ width: `${(vus / n) * 100}%` }} />
        </div>
        <p className="resume__etat">{vus === 0 ? "Coche chaque étape quand tu y es." : vus === n ? "Toutes les étapes sont cochées. Ton carnet est complet." : `${vus} étape${vus > 1 ? "s" : ""} sur ${n} cochée${vus > 1 ? "s" : ""}.`}</p>
        <div className="resume__actions">
          <button type="button" className="btn btn--contour" onClick={onModifier}><Icone nom="rejouer" taille={16} /> Autre balade</button>
          <button type="button" className="btn btn--contour" onClick={onPartager}><Icone nom="partage" taille={16} /> {partage || "Partager"}</button>
        </div>
      </div>

      {vus === n && (
        <div className="fini">
          <p className="fini__titre">Balade terminée</p>
          <p>Tes {n} étapes sont dans ton carnet, avec l'heure de passage{photos ? " et tes photos" : ""}.</p>
          <div className="resume__actions">
            <button type="button" className="btn btn--plein" onClick={onCarnet}>Voir mon carnet <Icone nom="fleche" taille={16} /></button>
            <button type="button" className="btn btn--contour" onClick={onModifier}>Autre balade</button>
          </div>
        </div>
      )}

      {proche && !voyage.vus[proche] && (
        <button type="button" className="tu-y-es" onClick={() => onOuvrir(proche)}>
          <Icone nom="cible" /> <span><strong>Tu y es.</strong> {etape(proche).nom}</span> <Icone nom="fleche" taille={16} />
        </button>
      )}

      <ol className="fil">
        {plan.lignes.map((l, i) => {
          if (l.type === "depart")
            return (
              <li key={i} className="fil__borne">
                <span className="fil__heure">{hhmm(l.heure)}</span>
                <span>Départ : {l.nom}</span>
              </li>
            );
          if (l.type === "trajet")
            return (
              <li key={i} className="fil__trajet">
                <Icone nom={l.troncon.mode === "pied" ? "pied" : "rail"} taille={16} />
                <span>
                  {l.troncon.mode === "pied" ? `${l.troncon.min} min à pied · ${distance(l.troncon.m)}` : `${l.troncon.min} min · ${l.troncon.note}`}
                </span>
              </li>
            );
          if (l.type === "repas")
            return (
              <li key={i} className="fil__repas">
                <span className="fil__heure">{hhmm(l.heure)}</span>
                <div className="repas">
                  <p className="repas__titre"><Icone nom="fourchette" taille={18} /> Pause repas · {duree(l.duree)}</p>
                  <button type="button" className="repas__table" onClick={() => onAdresse(l.adresse.id)}>
                    <strong>{l.adresse.nom}</strong>
                    <span>{l.adresse.type} · {l.adresse.rue}</span>
                  </button>
                  {l.autres.length > 0 && (
                    <p className="repas__autres">
                      Sur le chemin aussi :{" "}
                      {l.autres.map((a, k) => (
                        <span key={a.id}>
                          {k > 0 && ", "}
                          <button type="button" className="lien" onClick={() => onAdresse(a.id)}>{a.nom}</button>
                        </span>
                      ))}
                    </p>
                  )}
                </div>
              </li>
            );
          if (l.type === "fin")
            return (
              <li key={i} className="fil__borne fil__borne--fin">
                <span className="fil__heure">{hhmm(l.heure)}</span>
                <span>Fin du parcours</span>
              </li>
            );
          const e = etape(l.id);
          const vu = !!voyage.vus[l.id];
          return (
            <li key={i} className="fil__etape" data-vu={vu || undefined}>
              <span className="fil__heure">{hhmm(l.heure)}</span>
              <button type="button" className="etape" onClick={() => onOuvrir(l.id)}>
                <span className="etape__image">
                  <img src={url(`/videos/lyon/${e.videos[0]}.jpg`)} alt="" loading="lazy" width="72" height="96" />
                  <span className="etape__num">{l.numero}</span>
                </span>
                <span className="etape__texte">
                  <strong>{e.nom}</strong>
                  <span>{e.quartier} · {e.duree} min sur place</span>
                  <span className="etape__video"><Icone nom="lecture" taille={13} /> {e.videos.length} vidéo{e.videos.length > 1 ? "s" : ""}</span>
                </span>
              </button>
              <button type="button" className="coche" aria-pressed={vu} aria-label={vu ? `Décocher ${e.nom}` : `Cocher ${e.nom}`} onClick={() => onCocher(l.id)}>
                <Icone nom="check" />
              </button>
            </li>
          );
        })}
      </ol>
    </section>
  );
}

// ——————————————————————————————————————————————————————————— les adresses
export function Adresses({ T, voyage, onAdresse }: { T: Trajets; voyage: Voyage; onAdresse: (id: string) => void }) {
  const [filtre, setFiltre] = useState<"tout" | "repas" | "pause">("tout");
  const liste = ADRESSES.map((a) => {
    let mieux = { min: Infinity, id: "" };
    for (const id of voyage.etapes) {
      const t = troncon(T, id, "adr:" + a.id, { ...voyage.reponses, montees: true });
      if (t.min < mieux.min) mieux = { min: t.min, id };
    }
    return { a, ...mieux };
  })
    .filter((x) => filtre === "tout" || (filtre === "repas" ? x.a.repas : !x.a.repas))
    .sort((x, y) => x.min - y.min);
  return (
    <section className="ecran" aria-labelledby="t-adresses">
      <div className="resume">
        <p className="etiquette">Lyon</p>
        <h1 id="t-adresses">Les bonnes adresses</h1>
        <p className="resume__chiffres">Classées par distance à ton parcours.</p>
        <div className="puces">
          <Puce actif={filtre === "tout"} onClick={() => setFiltre("tout")}>Toutes</Puce>
          <Puce actif={filtre === "repas"} onClick={() => setFiltre("repas")}>Pour un repas</Puce>
          <Puce actif={filtre === "pause"} onClick={() => setFiltre("pause")}>Pour une pause</Puce>
        </div>
      </div>
      <ul className="adresses">
        {liste.map(({ a, min, id }) => (
          <li key={a.id}>
            <button type="button" className="adresse" onClick={() => onAdresse(a.id)}>
              <span className="adresse__type">{a.type}</span>
              <strong>{a.nom}</strong>
              <span>{a.rue}, {a.quartier}</span>
              <span className="adresse__proche">À {min} min de « {etape(id).nom} »</span>
            </button>
          </li>
        ))}
      </ul>
    </section>
  );
}

export function FicheAdresse({ a, onFermer }: { a: Adresse; onFermer: () => void }) {
  return (
    <Feuille titre={a.nom} onFermer={onFermer}>
      <p className="etiquette">{a.type}</p>
      <h2 id="feuille-titre">{a.nom}</h2>
      <p className="feuille__lieu">{a.rue}, {a.quartier}</p>
      {a.detail && <p className="feuille__fait">{a.detail}.</p>}
      {a.note !== null && (
        <p className="feuille__note">
          <strong>{String(a.note).replace(".", ",")} / 5</strong> {a.avis}
        </p>
      )}
      <div className="feuille__actions">
        <a className="btn btn--plein" href={guidage(a.lat, a.lon)} target="_blank" rel="noopener">
          Me guider jusque-là <Icone nom="fleche" taille={16} />
        </a>
      </div>
    </Feuille>
  );
}

// ——————————————————————————————————————————————————————————— la fiche d'une étape
export function Feuille({ titre, onFermer, children }: { titre: string; onFermer: () => void; children: React.ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const avant = document.activeElement as HTMLElement | null;
    ref.current?.focus();
    const touche = (e: KeyboardEvent) => e.key === "Escape" && onFermer();
    document.addEventListener("keydown", touche);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", touche);
      document.body.style.overflow = "";
      avant?.focus?.();
    };
  }, []);
  return (
    <div className="voile" onClick={onFermer}>
      <div className="feuille" role="dialog" aria-modal="true" aria-label={titre} tabIndex={-1} ref={ref} onClick={(e) => e.stopPropagation()}>
        <button type="button" className="rond feuille__fermer" onClick={onFermer} aria-label="Fermer">
          <Icone nom="fermer" />
        </button>
        {children}
      </div>
    </div>
  );
}

export function Photos({ cles, urls, onAjouter, onSupprimer }: {
  cles: string[]; urls: Record<string, string>; onAjouter: (f: File) => void; onSupprimer: (cle: string) => void;
}) {
  const champ = useRef<HTMLInputElement>(null);
  return (
    <div className="photos">
      {cles.map((c) => (
        <figure key={c} className="photos__une">
          {urls[c] ? <img src={urls[c]} alt="Ta photo de cette étape" /> : <span className="photos__attente" />}
          <button type="button" className="rond rond--petit" onClick={() => onSupprimer(c)} aria-label="Supprimer cette photo">
            <Icone nom="corbeille" taille={15} />
          </button>
        </figure>
      ))}
      <button type="button" className="photos__ajout" onClick={() => champ.current?.click()}>
        <Icone nom="photo" /> <span>Ajouter une photo</span>
      </button>
      <input
        ref={champ} type="file" accept="image/*" hidden
        onChange={(e) => { const f = e.target.files?.[0]; if (f) onAjouter(f); e.target.value = ""; }}
      />
    </div>
  );
}

/** À la place des photos, avec le guide gratuit. */
function PhotosVerrou({ onDebloquer }: { onDebloquer: () => void }) {
  return (
    <button type="button" className="photos-verrou" onClick={onDebloquer}>
      <Icone nom="cadenas" /> <span><strong>Tes photos dans ton carnet</strong> Avec le guide complet, tu gardes tes photos à chaque étape.</span>
    </button>
  );
}

export function FicheEtape({ id, numero, voyage, urls, photos, onFermer, onCocher, onAjouter, onSupprimer, onDebloquer }: {
  id: string; numero: number | null; voyage: Voyage; urls: Record<string, string>; photos: boolean;
  onFermer: () => void; onCocher: (id: string) => void; onAjouter: (id: string, f: File) => void; onSupprimer: (id: string, cle: string) => void; onDebloquer: () => void;
}) {
  const e = etape(id);
  const [v, setV] = useState(e.videos[0]);
  const [joue, setJoue] = useState(false);
  const video = useRef<HTMLVideoElement>(null);
  const vu = voyage.vus[id];
  const choisir = (x: string) => { setV(x); setJoue(true); };
  useEffect(() => { if (joue) video.current?.play().catch(() => {}); }, [v, joue]);
  return (
    <Feuille titre={e.nom} onFermer={onFermer}>
      <div className="lecteur">
        <video
          ref={video} key={v} src={joue ? url(`/videos/lyon/${v}.mp4`) : undefined} poster={url(`/videos/lyon/${v}.jpg`)}
          controls={joue} playsInline preload="none" aria-label={`Vidéo : ${VIDEOS[v].titre}`}
        />
        {!joue && (
          <button type="button" className="lecteur__lancer" onClick={() => setJoue(true)}>
            <span className="lecteur__rond"><Icone nom="lecture" taille={26} /></span>
            <span>Voir la vidéo · {dureeVideo(v)} s</span>
          </button>
        )}
      </div>
      {e.videos.length > 1 && (
        <div className="lecteur__liste" role="group" aria-label="Les vidéos de cette étape">
          {e.videos.map((x) => (
            <button type="button" key={x} className="puce" aria-pressed={x === v} onClick={() => choisir(x)}>
              <Icone nom="lecture" taille={13} /> {VIDEOS[x].titre}
            </button>
          ))}
        </div>
      )}
      <p className="etiquette">{numero ? `Étape ${numero} · ` : ""}{e.quartier}</p>
      <h2 id="feuille-titre">{e.nom}</h2>
      <p className="feuille__lieu">{e.lieu}</p>
      <p className="feuille__fait">{e.fait}</p>
      <p className="feuille__conseil"><strong>Sur place.</strong> {e.conseil}</p>
      <div className="feuille__actions">
        <button type="button" className={vu ? "btn btn--contour" : "btn btn--plein"} aria-pressed={!!vu} onClick={() => onCocher(id)}>
          <Icone nom="check" taille={16} /> {vu ? `Cochée à ${heureReelle(vu)}` : "J'y suis, je coche"}
        </button>
        <a className="btn btn--contour" href={guidage(e.lat, e.lon)} target="_blank" rel="noopener">Me guider</a>
      </div>
      <h3 className="feuille__sous-titre">Tes photos ici</h3>
      {photos ? (
        <Photos cles={voyage.photos[id] ?? []} urls={urls} onAjouter={(f) => onAjouter(id, f)} onSupprimer={(c) => onSupprimer(id, c)} />
      ) : (
        <PhotosVerrou onDebloquer={onDebloquer} />
      )}
    </Feuille>
  );
}

// ——————————————————————————————————————————————————————————— le carnet
export function Carnet({ voyage, metres, urls, photos, onOuvrir, onRejouer, onAjouter, onSupprimer, onParcours, onDebloquer }: {
  voyage: Voyage; metres: number; urls: Record<string, string>; photos: boolean;
  onOuvrir: (id: string) => void; onRejouer: () => void; onParcours: () => void;
  onAjouter: (id: string, f: File) => void; onSupprimer: (id: string, cle: string) => void; onDebloquer: () => void;
}) {
  const ordre = Object.entries(voyage.vus).sort((a, b) => a[1] - b[1]);
  const nbPhotos = Object.values(voyage.photos).reduce((n, l) => n + l.length, 0);
  const temps = ordre.length > 1 ? Math.round((ordre[ordre.length - 1][1] - ordre[0][1]) / 60000) : 0;
  const jour = ordre.length ? new Date(ordre[0][1]).toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long" }) : "";
  return (
    <section className="ecran ecran--carnet" aria-labelledby="t-carnet">
      <div className="resume">
        <p className="etiquette">Lyon</p>
        <h1 id="t-carnet">Ton carnet de voyage</h1>
        {ordre.length === 0 ? (
          <>
            <p className="resume__chiffres">Chaque étape cochée s'ajoute ici, sur la carte, avec l'heure{photos ? " et tes photos" : ""}.</p>
            <div className="resume__actions">
              <button type="button" className="btn btn--plein" onClick={onParcours}>Voir mon parcours <Icone nom="fleche" taille={16} /></button>
            </div>
          </>
        ) : (
          <>
            <p className="resume__chiffres">
              {jour} · {ordre.length} étape{ordre.length > 1 ? "s" : ""}
              {metres > 0 && ` · ${distance(metres)}`}
              {temps > 0 && ` · ${duree(temps)}`}
              {nbPhotos > 0 && ` · ${nbPhotos} photo${nbPhotos > 1 ? "s" : ""}`}
            </p>
            {ordre.length > 1 && (
              <div className="resume__actions">
                <button type="button" className="btn btn--plein" onClick={onRejouer}><Icone nom="rejouer" taille={16} /> Rejouer mon voyage</button>
              </div>
            )}
          </>
        )}
        {!photos && <PhotosVerrou onDebloquer={onDebloquer} />}
      </div>
      <ol className="journal">
        {ordre.map(([id, t], i) => {
          const e = etape(id);
          return (
            <li key={id} className="journal__ligne">
              <button type="button" className="journal__tete" onClick={() => onOuvrir(id)}>
                <span className="journal__num">{i + 1}</span>
                <span>
                  <strong>{e.nom}</strong>
                  <span>{heureReelle(t)} · {e.quartier}</span>
                </span>
              </button>
              {photos && <Photos cles={voyage.photos[id] ?? []} urls={urls} onAjouter={(f) => onAjouter(id, f)} onSupprimer={(c) => onSupprimer(id, c)} />}
            </li>
          );
        })}
      </ol>
    </section>
  );
}
