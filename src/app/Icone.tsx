// Les pictogrammes de l'appli : un seul trait, 24 × 24.
const TRACES: Record<string, string> = {
  fleche: "M5 12h14M13 6l6 6-6 6",
  retour: "M19 12H5M11 6l-6 6 6 6",
  check: "M5 12.5l4.5 4.5L19 7.5",
  fermer: "M6 6l12 12M18 6L6 18",
  liste: "M9 6h11M9 12h11M9 18h11M4.5 6h.01M4.5 12h.01M4.5 18h.01",
  carte: "M9 4L3 6.5v13.5l6-2.5 6 2.5 6-2.5V4l-6 2.5L9 4zM9 4v13.5M15 6.5V20",
  fourchette: "M7 3v7a2 2 0 002 2v9M5 3v5M9 3v5M17 3c-1.7 1-3 3.5-3 7 0 1.5 1 2 3 2v9",
  carnet: "M6 3h11a2 2 0 012 2v14a2 2 0 01-2 2H6V3zM6 3v18M10 8h5M10 12h5",
  photo: "M4 8h3l1.5-2.5h7L17 8h3v11H4V8zM12 16.5a3.2 3.2 0 100-6.4 3.2 3.2 0 000 6.4z",
  lecture: "M8 5.5v13l11-6.5-11-6.5z",
  pied: "M13 4.5a1.5 1.5 0 11-3 0 1.5 1.5 0 013 0zM10 21l1.5-6-2.5-2.5 1-5 3 1 2 2.5 2.5 1M8.5 21l1-4M9.5 8.5L7 10.5v3",
  rail: "M7 4h10a2 2 0 012 2v9a3 3 0 01-3 3H8a3 3 0 01-3-3V6a2 2 0 012-2zM5 11h14M8.5 14.5h.01M15.5 14.5h.01M8 18l-2 3M16 18l2 3",
  partage: "M12 15V4M8 7.5L12 4l4 3.5M5 12v7h14v-7",
  crayon: "M4 20l1-4L16.5 4.5l3 3L8 19l-4 1zM14 7l3 3",
  plus: "M12 5v14M5 12h14",
  corbeille: "M5 7h14M9 7V4.5h6V7M7 7l1 13h8l1-13M10 11v5M14 11v5",
  cible: "M12 21s-6.5-5.6-6.5-11a6.5 6.5 0 1113 0c0 5.4-6.5 11-6.5 11zM12 12.5a2.5 2.5 0 100-5 2.5 2.5 0 000 5z",
  rejouer: "M4 12a8 8 0 108-8H7M10 1L7 4l3 3",
  horloge: "M12 21a9 9 0 100-18 9 9 0 000 18zM12 7v5l3.5 2",
  cadenas: "M6 11h12v9H6v-9zM8.5 11V8a3.5 3.5 0 017 0v3M12 14.5v2",
};

export function Icone({ nom, taille = 20 }: { nom: keyof typeof TRACES | string; taille?: number }) {
  return (
    <svg viewBox="0 0 24 24" width={taille} height={taille} fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d={TRACES[nom] ?? ""} />
    </svg>
  );
}
