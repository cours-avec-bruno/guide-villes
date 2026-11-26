// Les villes du guide, dans l'ordre de la roue de la page d'accueil. « pret » : le guide existe et s'ouvre.
// « gratuit » : ce que contient la visite gratuite, ouverte par un code.
export type Ville = { id: string; nom: string; de: string; pret?: boolean; gratuit?: string };

export const VILLES: Ville[] = [
  { id: "bordeaux", nom: "Bordeaux", de: "de Bordeaux" },
  { id: "nice", nom: "Nice", de: "de Nice" },
  { id: "lyon", nom: "Lyon", de: "de Lyon", pret: true, gratuit: "5 lieux, 1 h 45 à pied, une vidéo à chaque arrêt" },
  { id: "paris", nom: "Paris", de: "de Paris" },
  { id: "marseille", nom: "Marseille", de: "de Marseille" },
  { id: "toulouse", nom: "Toulouse", de: "de Toulouse" },
  { id: "nantes", nom: "Nantes", de: "de Nantes" },
  { id: "rennes", nom: "Rennes", de: "de Rennes" },
  { id: "lille", nom: "Lille", de: "de Lille" },
  { id: "grenoble", nom: "Grenoble", de: "de Grenoble" },
  { id: "montpellier", nom: "Montpellier", de: "de Montpellier" },
];
export const ville = (id: string) => VILLES.find((v) => v.id === id);
