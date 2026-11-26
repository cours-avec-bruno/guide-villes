// Les villes des guides. « pret » : le guide est en vente ; les autres ont leur page « en préparation ».
// Lyon en premier : c'est le guide disponible.
export type Ville = { id: string; nom: string; pret?: boolean };
export const VILLES: Ville[] = [
  { id: "lyon", nom: "Lyon", pret: true },
  { id: "paris", nom: "Paris" },
  { id: "marseille", nom: "Marseille" },
  { id: "bordeaux", nom: "Bordeaux" },
  { id: "nice", nom: "Nice" },
  { id: "toulouse", nom: "Toulouse" },
  { id: "nantes", nom: "Nantes" },
  { id: "rennes", nom: "Rennes" },
  { id: "lille", nom: "Lille" },
  { id: "grenoble", nom: "Grenoble" },
  { id: "montpellier", nom: "Montpellier" },
];
export const ville = (id: string) => VILLES.find((v) => v.id === id);
