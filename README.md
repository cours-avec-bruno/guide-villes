# Guide de villes — V1 Lyon

Le site que les Reels « Ce que tu ne sais pas sur… » font connaître : une page de vente (`/`) et une appli de visite
(`/lyon`) qui compose un itinéraire sur mesure, le fait suivre sur une carte, propose des adresses et garde un carnet
de voyage avec les photos.

Le nom « Dédale » et le prix de 6,90 € sont **provisoires** : ils se changent dans `src/marque.ts`.

## Lancer

```powershell
npm run dev        # http://127.0.0.1:4321
npm run build      # le site statique dans dist/
npm run verifier   # contrôle des types
```

## En ligne

Chaque envoi sur `main` reconstruit le site et le publie sur GitHub Pages (`.github/workflows/pages.yml`) :
https://cours-avec-bruno.github.io/guide-villes/

Le site y est servi dans le dossier `/guide-villes` : tous les chemins passent par `url()` (`src/base.ts`).
Pour le voir en local comme en ligne : `npm run build:pages` puis `npm run preview:pages`
(http://127.0.0.1:4322/guide-villes/). Le jour où le site a son propre nom de domaine, il suffit de retirer `BASE_PATH`
du fichier de mise en ligne et d'y mettre la bonne `SITE_URL`.

La page d'accueil s'ouvre toujours en version animée (le défilement avec les cartes de villes). Sur un appareil qui
demande de « réduire les animations », un lien « Version sans animation » apparaît sous le menu : il mène à
`/?simple`, la page sans chorégraphie, et ce choix est retenu ; `/?anime` revient à la version animée.

## Où est quoi

| Dossier | Contenu |
|---|---|
| `src/pages/index.astro` | la page de vente (textes, cartes de villes, offres) |
| `src/styles/accueil.css`, `src/scripts/accueil.ts` | sa mise en forme et sa chorégraphie au défilement |
| `src/pages/lyon.astro`, `src/app/` | l'appli : `App.tsx` (onglets, mémoire), `Ecrans.tsx` (questionnaire, parcours, adresses, carnet, fiches), `Carte.tsx` (MapLibre), `moteur.ts` (composition et horaires), `stockage.ts` (parcours et photos gardés sur le téléphone) |
| `src/data/lyon.json` | **les contenus de Lyon** : étapes, vidéos (image de début et de fin dans l'épisode), adresses, points de départ |
| `src/styles/base.css` | la charte (papier, encre, mer, étiquettes jaunes ; Bebas Neue et Space Grotesk) |
| `public/videos/lyon/` | les clips des étapes, découpés dans les épisodes |
| `public/cartes/`, `public/plaques/` | les images des cartes de villes, les fonds de carte et l'écran du téléphone |
| `public/data/` | les trajets à pied calculés à l'avance et le fond de carte « papier » |
| `outils/` | les scripts qui fabriquent tout ça (voir ci-dessous) |

## Refaire les contenus

Tous les scripts se lancent depuis la racine : `node outils/<script>.mjs`.

| Script | Rôle |
|---|---|
| `minutage.mjs` | affiche le minutage mot à mot des épisodes de Lyon (lu dans le projet vidéo) |
| `geocoder.mjs` | cherche les coordonnées des lieux dans OpenStreetMap (Nominatim) |
| `trajets.mjs` | calcule les trajets à pied et les altitudes avec les services de l'IGN → `public/data/lyon-trajets.json` |
| `medias.mjs` | découpe les clips et fabrique les images des cartes de villes (ffmpeg) |
| `style-carte.mjs` | recolore le Plan IGN aux couleurs « papier » → `public/data/style-papier.json` |
| `captures.mjs` | fabrique les fonds de carte de la page de vente à partir de l'appli (serveur lancé) |
| `vendor.mjs` | copie MapLibre dans `public/vendor/` (fait tout seul avant `dev` et `build`) |

Après avoir ajouté une étape ou une adresse dans `lyon.json` : `geocoder` si besoin, puis `trajets`, puis `medias clips`.

## Ce qui n'est pas branché

- **Le paiement** : le bouton « Créer mon itinéraire » ouvre l'appli sans rien faire payer.
- **Les notes des adresses** : les champs `note` et `avis` de `lyon.json` sont vides ; l'appli les affiche dès qu'ils sont remplis.
- **Les autres villes** : seules leurs cartes existent, marquées « Bientôt ».
- **L'hébergement**, le nom de domaine, les mentions légales et la collecte d'e-mails.

## Sources et licences

Fond de carte, trajets et altitudes : IGN, Géoplateforme (licence ouverte Etalab 2.0). Coordonnées des lieux :
contributeurs OpenStreetMap (ODbL). Vidéos et images : les épisodes du projet « Géopolitik ».
