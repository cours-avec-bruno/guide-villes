// L'accès à un guide, retenu sur l'appareil du visiteur (localStorage).
//   « gratuit » : la visite gratuite d'une ville, ouverte par un code à 4 chiffres reçu après un commentaire sous le Reel.
//   « complet » : le guide entier, ouvert par la clé d'achat que le paiement renvoie dans l'adresse (?cle=…).
// C'est une barrière légère : le site est fait de pages statiques, tout se vérifie dans le navigateur. Elle suffit
// pour une visite offerte et un guide à petit prix ; un vrai contrôle demanderait un serveur.
export type Acces = "gratuit" | "complet" | null;

const nom = (ville: string) => `guide-villes:acces:${ville}`;

export function lireAcces(ville: string): Acces {
  try {
    const v = localStorage.getItem(nom(ville));
    return v === "gratuit" || v === "complet" ? v : null;
  } catch {
    return null; // stockage indisponible (navigation privée)
  }
}

/** Ouvre un accès. Un guide complet déjà obtenu n'est jamais ramené à la visite gratuite. */
export function donnerAcces(ville: string, niveau: Exclude<Acces, null>) {
  try {
    if (niveau === "gratuit" && lireAcces(ville) === "complet") return;
    localStorage.setItem(nom(ville), niveau);
  } catch {
    /* sans stockage, l'accès ne dure que le temps de la page */
  }
}

/** La règle des codes gratuits : 4 chiffres qui forment un multiple de 6 ou un multiple de 8 (0000 exclu). */
export function codeValide(code: string): boolean {
  if (!/^\d{4}$/.test(code)) return false;
  const n = Number(code);
  return n > 0 && (n % 6 === 0 || n % 8 === 0);
}

// L'empreinte (SHA-256) de la clé d'achat de chaque ville. La clé elle-même n'est pas dans le dépôt.
const EMPREINTE_ACHAT: Record<string, string> = {
  lyon: "1fb3da0dcd594c86ef0adf2ef8f2c96eb70d900b7110d9472cf70333d1a38472",
};

export async function cleAchatValide(ville: string, cle: string): Promise<boolean> {
  const attendue = EMPREINTE_ACHAT[ville];
  if (!attendue || !cle || !globalThis.crypto?.subtle) return false;
  const octets = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(cle));
  const hex = [...new Uint8Array(octets)].map((o) => o.toString(16).padStart(2, "0")).join("");
  return hex === attendue;
}
