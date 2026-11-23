import { url } from "../base";
import brut from "../data/lyon.json";

export type Etape = {
  id: string; nom: string; lieu: string; quartier: string; lon: number; lat: number;
  duree: number; themes: string[]; fait: string; conseil: string; videos: string[]; horsCentre?: boolean;
};
export type Adresse = {
  id: string; nom: string; type: string; repas: boolean; rue: string; quartier: string; detail?: string;
  lon: number; lat: number; note: number | null; avis: string | null;
};
export type Depart = { id: string; nom: string; lon: number; lat: number };
export type Video = { titre: string; source: string; de: number; a: number };
export type Theme = { id: string; nom: string };
export type Visite = { id: string; nom: string; depart: string; etapes: string[] };

export const VILLE = brut.ville as { slug: string; nom: string; centre: [number, number]; zoom: number };
export const THEMES = brut.themes as Theme[];
export const DEPARTS = brut.departs as Depart[];
export const ETAPES = brut.etapes as Etape[];
export const ADRESSES = brut.adresses as Adresse[];
export const VIDEOS = brut.videos as Record<string, Video>;
export const VISITES = brut.visites as Visite[];

export const etape = (id: string) => ETAPES.find((e) => e.id === id)!;
export const adresse = (id: string) => ADRESSES.find((a) => a.id === id)!;
export const depart = (id: string) => DEPARTS.find((d) => d.id === id)!;
export const dureeVideo = (id: string) => Math.round((VIDEOS[id].a - VIDEOS[id].de) / 30);
export const NB_VIDEOS = Object.keys(VIDEOS).length;

/** Les trajets à pied calculés à l'avance (outils/trajets.mjs) : « a|b » → mètres, secondes, polyligne. */
export type Trajets = { trajets: Record<string, { m: number; s: number; g: string }>; alt: Record<string, number> };

let cache: Promise<Trajets> | null = null;
export const chargerTrajets = () => (cache ??= fetch(url("/data/lyon-trajets.json")).then((r) => r.json() as Promise<Trajets>));
