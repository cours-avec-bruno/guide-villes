// La page « Visiter gratuitement » : on entre le code à 4 chiffres reçu après un commentaire sous le Reel de la ville.
// La règle du code est dans src/acces.ts. Un bon code ouvre la visite gratuite de la ville choisie.
import { codeValide, donnerAcces, lireAcces } from "../acces";
import { url } from "../base";

const formulaire = document.querySelector<HTMLFormElement>(".code")!;
const champ = formulaire.querySelector<HTMLInputElement>("#code")!;
const liste = formulaire.querySelector<HTMLSelectElement>("#ville")!;
const message = formulaire.querySelector<HTMLElement>(".code__message")!;
const deja = formulaire.querySelector<HTMLAnchorElement>(".code__deja")!;

// la ville peut venir de l'adresse (?ville=lyon), quand on arrive de la page d'une ville
const demandee = new URLSearchParams(location.search).get("ville");
if (demandee && [...liste.options].some((o) => o.value === demandee && !o.disabled)) liste.value = demandee;

function etat() {
  const complet = lireAcces(liste.value) === "complet";
  deja.hidden = !complet;
  if (complet) deja.href = url(`/${liste.value}/visite/`);
}
etat();
liste.addEventListener("change", etat);

champ.addEventListener("input", () => {
  champ.value = champ.value.replace(/\D/g, "").slice(0, 4);
  message.textContent = "";
  champ.removeAttribute("aria-invalid");
});

formulaire.addEventListener("submit", (e) => {
  e.preventDefault();
  const code = champ.value.trim();
  const refuser = (texte: string) => { message.textContent = texte; champ.setAttribute("aria-invalid", "true"); champ.focus(); champ.select(); };
  if (!/^\d{4}$/.test(code)) return refuser("Entre les 4 chiffres de ton code.");
  if (!codeValide(code)) return refuser("Ce code n'est pas reconnu. Vérifie les 4 chiffres reçus en message privé.");
  donnerAcces(liste.value, "gratuit");
  location.href = url(`/${liste.value}/visite/?visite=5-secrets`);
});
