# Guide de villes — V1 Lyon

Le site que les Reels « Ce que tu ne sais pas sur… » font connaître :

- `/` : la page d'accueil (ce qu'est le guide, les villes à faire glisser, comment ça marche, les deux formules, les questions) ;
- `/guides/<ville>/` : la page d'achat du guide de chaque ville (Lyon) ou sa page « en préparation » (les autres) ;
- `/lyon/` : l'appli de visite, qui s'ouvre avec un code. Elle propose des balades prêtes à lancer ou sur mesure, les fait
  suivre sur une carte, donne des adresses et garde un carnet de voyage. `/lyon/?nouveau` ouvre le choix des balades,
  `/lyon/?mesure` le sur-mesure.

Le nom « Dédale », le prix de 6,90 €, le lien de paiement et la vidéo à commenter se règlent dans `src/marque.ts`.

## Les deux formules et les codes

| | Guide gratuit | Guide complet (6,90 €) |
|---|---|---|
| Comment l'avoir | un code reçu par e-mail après un commentaire sous la vidéo | un code donné après l'achat |
| Balades | « Les 5 secrets » seulement | toutes, et le sur-mesure |
| Carte, vidéos, adresses, carnet | oui | oui |
| Photos dans le carnet | non | oui |

Le visiteur entre son code sur `/lyon/`, ou ouvre directement `/lyon/?code=LE-CODE` (le lien à mettre dans l'e-mail, et
l'adresse de retour après le paiement). L'accès reste ensuite sur son téléphone.

Le dépôt est public : **les codes n'y sont jamais écrits**, seulement leur empreinte (`src/data/codes.json`). Pour changer
un code, puis envoyer le site en ligne :

```powershell
node outils/code.mjs lyon gratuit NOUVEAU-CODE      # remplace le code du guide gratuit
node outils/code.mjs lyon complet NOUVEAU-CODE      # remplace le code du guide complet
node outils/code.mjs lyon gratuit AUTRE --ajouter   # ajoute un code sans retirer les autres
```

Ceux qui ont déjà ouvert le guide gardent leur accès. C'est une protection simple, adaptée à un site sans serveur :
quelqu'un qui connaît le code peut le partager.

**Le paiement** : mettre dans `LIEN_PAIEMENT` (`src/marque.ts`) un lien de paiement (Stripe « Payment Link », Lemon
Squeezy…), et régler ce lien pour qu'après le paiement l'acheteur revienne sur
`https://cours-avec-bruno.github.io/guide-villes/lyon/?code=<code du guide complet>`. Écrire aussi le code dans le reçu,
pour qu'il puisse ouvrir le guide sur un autre téléphone. Tant que le lien est vide, les pages affichent « Paiement
bientôt ouvert ».

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

Les pages de vente défilent normalement : pas de chorégraphie, seulement les blocs qui apparaissent doucement (rien du
tout si l'appareil demande de réduire les animations).

## Où est quoi

| Dossier | Contenu |
|---|---|
| `src/pages/index.astro`, `src/pages/guides/[ville].astro` | la page d'accueil et les pages d'achat des villes |
| `src/components/` | leurs morceaux : navigation et menu, rangée des villes, comment ça marche, formules, questions… |
| `src/layouts/Site.astro`, `src/styles/site.css`, `src/scripts/site.ts` | leur cadre, leur mise en forme, et le peu de mouvement (menu, rangée des villes, apparitions) |
| `src/data/villes.ts`, `src/data/faq.ts` | la liste des villes (prêtes ou non) et les questions |
| `src/pages/lyon.astro`, `src/app/` | l'appli : `App.tsx` (onglets, mémoire), `Acces.tsx` et `acces.ts` (le code, les deux formules), `Ecrans.tsx` (balades prêtes à lancer, sur-mesure, parcours, adresses, carnet, fiches), `Carte.tsx` (MapLibre), `moteur.ts` (composition et horaires), `stockage.ts` (parcours et photos gardés sur le téléphone) |
| `src/data/codes.json` | les empreintes des codes d'accès (voir `outils/code.mjs`) |
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
| `code.mjs` | change le code d'accès d'un guide (gratuit ou complet) |
| `vendor.mjs` | copie MapLibre dans `public/vendor/` (fait tout seul avant `dev` et `build`) |

Après avoir ajouté une étape ou une adresse dans `lyon.json` : `geocoder` si besoin, puis `trajets`, puis `medias clips`.

## Ce qui n'est pas branché

- **Le paiement** : tant que `LIEN_PAIEMENT` est vide (voir plus haut).
- **L'envoi des codes par e-mail** après un commentaire : à faire hors du site (outil de réponse automatique, ou à la main).
- **Les notes des adresses** : les champs `note` et `avis` de `lyon.json` sont vides ; l'appli les affiche dès qu'ils sont remplis.
- **Les autres villes** : seules leurs cartes et leur page « en préparation » existent.
- **L'hébergement**, le nom de domaine, les mentions légales et la collecte d'e-mails.

## Sources et licences

Fond de carte, trajets et altitudes : IGN, Géoplateforme (licence ouverte Etalab 2.0). Coordonnées des lieux :
contributeurs OpenStreetMap (ODbL). Vidéos et images : les épisodes du projet « Géopolitik ».
