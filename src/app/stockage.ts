// Tout reste sur le téléphone du visiteur : l'itinéraire et les étapes cochées dans localStorage,
// les photos dans IndexedDB. Pas de compte, pas de serveur.
import { del, get, set } from "idb-keyval";
import type { Reponses } from "./moteur";

export type Voyage = {
  id: string;
  cree: number;
  mode: "sur-mesure" | "5-secrets" | "balade";
  nom?: string; // le nom de la balade toute faite
  reponses: Reponses;
  etapes: string[];
  vus: Record<string, number>; // étape → moment où elle a été cochée
  photos: Record<string, string[]>; // étape → clés des photos dans IndexedDB
};
export type Etat = { voyages: Voyage[]; courant: string | null };

const CLE = "guide-villes:lyon:v1";

export function lire(): Etat {
  try {
    const brut = localStorage.getItem(CLE);
    if (brut) {
      const e = JSON.parse(brut) as Etat;
      if (Array.isArray(e.voyages)) return e;
    }
  } catch {
    /* stockage indisponible (navigation privée) : on repart de zéro */
  }
  return { voyages: [], courant: null };
}
export function ecrire(e: Etat) {
  try {
    localStorage.setItem(CLE, JSON.stringify(e));
  } catch {
    /* rien : l'appli marche quand même, sans mémoire */
  }
}
export const nouvelId = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 6);

/** Réduit une photo à 1 600 px de côté au plus (JPEG) pour ne pas remplir le téléphone. */
async function reduire(f: File): Promise<Blob> {
  try {
    const img = await createImageBitmap(f, { imageOrientation: "from-image" });
    const k = Math.min(1, 1600 / Math.max(img.width, img.height));
    const c = document.createElement("canvas");
    c.width = Math.round(img.width * k);
    c.height = Math.round(img.height * k);
    c.getContext("2d")!.drawImage(img, 0, 0, c.width, c.height);
    return await new Promise<Blob>((res) => c.toBlob((b) => res(b ?? f), "image/jpeg", 0.82));
  } catch {
    return f;
  }
}
export async function ajouterPhoto(f: File): Promise<string> {
  const cle = "photo:" + nouvelId();
  await set(cle, await reduire(f));
  return cle;
}
export const lirePhoto = (cle: string) => get<Blob>(cle);
export const supprimerPhoto = (cle: string) => del(cle);
