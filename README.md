# Guide de villes — V1 Lyon

Le site que les Reels « Ce que tu ne sais pas sur… » font connaître. Quatre sortes de pages :

- `/` : l'accueil. Ce qu'est le guide, puis la roue des villes (elle tourne au défilement, chaque carte mène à sa ville).
- `/<ville>/` : la page d'une ville. Le « film » de présentation (le téléphone montre l'appli pendant que le texte dit
  ce qu'on y gagne) et l'achat du guide complet. Une ville sans guide a la même page, marquée « bientôt ».
- `/gratuit/` : « Visiter gratuitement ». On y entre le code à 4 chiffres reçu après un commentaire sous le Reel de la ville.
- `/lyon/visite/` : l'appli de visite (balades prêtes ou sur mesure, carte, adresses, carnet avec les photos).

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

Les pages s'ouvrent toujours en version animée (le défilement avec les cartes de villes, le film). Sur un appareil qui
demande de « réduire les animations », un lien « Version sans animation » apparaît sous le menu : il mène à
`/?simple`, la page sans chorégraphie, et ce choix est retenu ; `/?anime` revient à la version animée.

## Les accès

L'appli s'ouvre avec un accès, retenu sur l'appareil du visiteur (`src/acces.ts`) :

| Accès | Ce qu'il ouvre | Comment on l'obtient |
|---|---|---|
| gratuit | la visite des 5 secrets | un code à 4 chiffres, multiple de 6 ou de 8, entré sur `/gratuit/` (ou porté par un lien `/lyon/visite/?code=1234`) |
| complet | tout le guide | la clé d'achat, que le paiement renvoie dans l'adresse : `/lyon/visite/?cle=<clé>` |

Sans accès, l'appli renvoie à la page de la ville. C'est une barrière légère : le site est statique, tout se vérifie
dans le navigateur. Le dépôt ne contient que l'empreinte de la clé d'achat, pas la clé.

Le paiement n'est pas encore branché. Le jour où il l'est : mettre le lien de paiement dans `LIENS_PAIEMENT`
(`src/marque.ts`) et régler chez le prestataire l'adresse de retour `/lyon/visite/?cle=<clé>`.

## Où est quoi

| Dossier | Contenu |
|---|---|
| `src/villes.ts`, `src/marque.ts` | la liste des villes ; le nom, le prix, les liens de paiement |
| `src/pages/index.astro`, `src/scripts/accueil.ts` | l'accueil et sa chorégraphie au défilement (éventail → roue des villes) |
| `src/pages/[ville]/index.astro`, `src/scripts/ville.ts` | la page d'une ville : le film (plans, phrases, autocollants, tous calés sur une horloge) et l'achat |
| `src/pages/gratuit.astro`, `src/scripts/gratuit.ts` | la page du code gratuit |
| `src/styles/accueil.css`, `src/styles/pages.css` | la mise en forme de ces pages |
| `src/pages/lyon/visite.astro`, `src/app/` | l'appli : `App.tsx` (accès, onglets, mémoire), `Ecrans.tsx` (balades, sur-mesure, parcours, adresses, carnet, fiches), `Carte.tsx` (MapLibre), `moteur.ts` (composition et horaires), `stockage.ts` (parcours et photos gardés sur le téléphone) |
| `src/data/lyon.json` | **les contenus de Lyon** : étapes, vidéos (image de début et de fin dans l'épisode), adresses, points de départ |
| `src/styles/base.css` | la charte (papier, encre, mer, étiquettes jaunes ; Bebas Neue et Space Grotesk) |
| `public/videos/lyon/` | les clips des étapes, découpés dans les épisodes |
| `public/cartes/`, `public/plaques/` | les images des cartes de villes, les fonds de carte et les écrans du téléphone |
| `public/data/` | les trajets à pied calculés à l'avance et le fond de carte « papier » |
| `outils/` | les scripts qui fabriquent tout ça (voir ci-dessous) |

Ajouter une ville : la passer à `pret: true` dans `src/villes.ts`, lui donner ses plaques (`public/plaques/<ville>-paysage.webp`
et `-portrait.webp`), sa page d'appli et sa clé d'achat.

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
