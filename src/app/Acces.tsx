// L'entrée du guide : le code (reçu par e-mail ou après l'achat), et la fiche « guide complet » qui s'ouvre quand on
// touche une balade, le sur-mesure ou les photos avec le guide gratuit.
import { useState } from "react";
import { url } from "../base";
import { LIEN_PAIEMENT, LIEN_VIDEO, PRIX_COMPLET } from "../marque";
import { verifier, type Niveau } from "./acces";
import { ETAPES, NB_VIDEOS, VILLE, VISITES } from "./donnees";
import { Feuille } from "./Ecrans";
import { Icone } from "./Icone";

const nomVille = VILLE.nom;
export const AVANTAGES_COMPLET = [
  `Les ${ETAPES.length} lieux et leurs ${NB_VIDEOS} vidéos`,
  "Toutes les balades, de 1 h 30 à la journée",
  "Ta balade sur mesure : ton temps, ton départ, tes envies",
  "Tes photos dans ton carnet de voyage",
];

/** Le champ du code. Il appelle onOuvert avec le niveau obtenu. */
export function ChampCode({ initial = "", onOuvert, bouton = "Ouvrir le guide" }: { initial?: string; onOuvert: (n: Niveau) => void; bouton?: string }) {
  const [code, setCode] = useState(initial);
  const [erreur, setErreur] = useState(initial ? "Ce code ne marche pas. Recopie-le depuis ton e-mail." : "");
  const envoyer = (e: React.FormEvent) => {
    e.preventDefault();
    if (!code.trim()) return setErreur("Écris ton code, par exemple LYON-ABCD.");
    const n = verifier(VILLE.slug, code);
    if (n) onOuvert(n);
    else setErreur("Ce code ne marche pas. Recopie-le depuis ton e-mail.");
  };
  return (
    <form className="code" onSubmit={envoyer} noValidate>
      <label className="code__label" htmlFor="code">Ton code</label>
      <div className="code__ligne">
        <input
          id="code" className="code__champ" value={code} placeholder="LYON-…" autoComplete="one-time-code" autoCapitalize="characters" spellCheck={false}
          aria-invalid={!!erreur} aria-describedby={erreur ? "code-erreur" : undefined}
          onChange={(e) => { setCode(e.target.value); setErreur(""); }}
        />
        <button type="submit" className="btn btn--plein">{bouton}</button>
      </div>
      {erreur && <p className="code__erreur" id="code-erreur" role="alert">{erreur}</p>}
    </form>
  );
}

/** Le bouton d'achat : le lien de paiement s'il existe, sinon l'annonce que le paiement ouvre bientôt. */
export function BoutonAchat({ bloc = false, attente = "En attendant, le guide gratuit t'attend." }: { bloc?: boolean; attente?: string }) {
  if (LIEN_PAIEMENT)
    return (
      <a className={`btn btn--plein${bloc ? " btn--bloc" : ""}`} href={LIEN_PAIEMENT} rel="noopener">
        Acheter le guide complet · {PRIX_COMPLET} <Icone nom="fleche" taille={16} />
      </a>
    );
  return (
    <p className="achat-bientot" role="note">
      <strong>Paiement bientôt ouvert.</strong> {attente}
    </p>
  );
}

/** Le premier écran sans accès : entrer son code, ou savoir comment en avoir un. */
export function EcranAcces({ code, onOuvert }: { code: string; onOuvert: (n: Niveau) => void }) {
  const secrets = VISITES[0];
  return (
    <main className="q acces" id="contenu">
      <p className="etiquette">{nomVille}</p>
      <h1 className="q__titre">Ouvre ton guide</h1>
      <p className="q__chapo">Entre le code reçu par e-mail. Ta balade s'ouvre tout de suite, avec la carte et une vidéo à chaque arrêt.</p>
      <ChampCode initial={code} onOuvert={onOuvert} />

      <h2 className="acces__titre">Pas encore de code ?</h2>
      <div className="formule-app">
        <p className="formule-app__tag">Gratuit</p>
        <h3>{secrets.nom} de {nomVille}</h3>
        <p>Une balade de {secrets.etapes.length} lieux, avec la carte et une vidéo à chaque arrêt.</p>
        <ol className="etapes-code">
          <li><Icone nom="message" taille={18} /> Commente la vidéo de {nomVille}.</li>
          <li><Icone nom="cle" taille={18} /> Tu reçois ton code par e-mail.</li>
          <li><Icone nom="check" taille={18} /> Tu l'entres ici : ta balade s'ouvre.</li>
        </ol>
        <a className="btn btn--contour btn--bloc" href={LIEN_VIDEO} target="_blank" rel="noopener">Voir la vidéo à commenter <Icone nom="fleche" taille={16} /></a>
      </div>
      <div className="formule-app formule-app--complet">
        <p className="formule-app__tag">Guide complet · {PRIX_COMPLET}</p>
        <h3>Tout {nomVille}</h3>
        <ul className="avantages">
          {AVANTAGES_COMPLET.map((a) => <li key={a}><Icone nom="check" taille={16} /> {a}</li>)}
        </ul>
        <BoutonAchat bloc />
      </div>
      <p className="acces__lien"><a href={url(`/guides/${VILLE.slug}/`)}>Voir tout ce que contient le guide</a></p>
    </main>
  );
}

/** La fiche qui s'ouvre quand on touche ce que seul le guide complet permet. */
export function FeuilleComplet({ raison, onFermer, onOuvert }: { raison: string; onFermer: () => void; onOuvert: (n: Niveau) => void }) {
  const [code, setCode] = useState(false);
  return (
    <Feuille titre="Le guide complet" onFermer={onFermer}>
      <p className="etiquette">Guide complet · {PRIX_COMPLET}</p>
      <h2 id="feuille-titre">{raison}</h2>
      <p className="feuille__fait">Ton guide gratuit contient une balade. Le guide complet ouvre tout {nomVille} :</p>
      <ul className="avantages">
        {AVANTAGES_COMPLET.map((a) => <li key={a}><Icone nom="check" taille={16} /> {a}</li>)}
      </ul>
      <div className="feuille__actions feuille__actions--pile">
        <BoutonAchat bloc attente="Profite de ta balade en attendant." />
        {!code && (
          <button type="button" className="btn btn--contour btn--bloc" onClick={() => setCode(true)}>
            <Icone nom="cle" taille={16} /> J'ai déjà acheté : entrer mon code
          </button>
        )}
      </div>
      {code && <ChampCode onOuvert={onOuvert} bouton="Valider" />}
    </Feuille>
  );
}
