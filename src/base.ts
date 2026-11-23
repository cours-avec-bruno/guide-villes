// Le préfixe du site : vide quand il est servi à la racine (en local, ou plus tard sur son propre nom de domaine),
// « /guide-villes » sur GitHub Pages. Tous les chemins vers /public passent par url().
export const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");
export const url = (chemin: string) => BASE + chemin;
