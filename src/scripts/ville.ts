// La page d'une ville : le film de présentation (il démarre tout seul et tourne en boucle) et le bouton d'achat.
import { lireAcces } from "../acces";
import { url } from "../base";
import { LIENS_PAIEMENT } from "../marque";

const page = document.querySelector<HTMLElement>(".ville")!;
const ville = page.dataset.ville!;

// ——— l'achat : le bouton mène au paiement ; si le guide est déjà là, il l'ouvre
const acces = lireAcces(ville);
const boutons = [...document.querySelectorAll<HTMLAnchorElement>("[data-achat]")];
const message = document.querySelector<HTMLElement>(".achat__message");
const paiement = LIENS_PAIEMENT[ville] ?? "";
if (acces === "complet") {
  boutons.forEach((b) => { b.href = url(`/${ville}/visite/`); b.firstElementChild!.textContent = "Ouvrir mon guide"; });
} else {
  boutons.forEach((b) => {
    if (paiement) { b.href = paiement; return; }
    b.addEventListener("click", (e) => {
      e.preventDefault(); // pas encore de paiement en ligne : on le dit, et on montre la visite gratuite
      if (!message) return;
      message.hidden = false;
      message.scrollIntoView({ block: "center", behavior: "smooth" });
    });
  });
  if (acces === "gratuit") {
    const g = document.querySelector<HTMLAnchorElement>(".achat__gratuit");
    if (g) { g.href = url(`/${ville}/visite/`); g.querySelector(".achat__gratuit-texte")!.textContent = "Reprendre ma visite gratuite"; }
  }
}

// ——— le film : la vidéo démarre seule et sans le son (les navigateurs l'exigent) ; un bouton fait entendre la voix
const video = document.querySelector<HTMLVideoElement>(".film__video");
const son = document.querySelector<HTMLButtonElement>(".film__son");
if (video && son) {
  const texte = son.querySelector("span")!;
  const silence = () => {
    video.muted = true;
    video.loop = true;
    son.setAttribute("aria-pressed", "false");
    texte.textContent = "Écouter la présentation";
    video.play().catch(() => {});
  };
  son.addEventListener("click", () => {
    if (!video.muted) return silence();
    video.currentTime = 0; // une écoute, du début à la fin
    video.muted = false;
    video.loop = false;
    son.setAttribute("aria-pressed", "true");
    texte.textContent = "Couper le son";
    video.play().catch(() => {});
  });
  video.addEventListener("ended", silence); // après l'écoute, le film reprend sa boucle muette
  if (document.documentElement.classList.contains("simple")) {
    // version sans animation : rien ne démarre tout seul, la vidéo a ses commandes
    video.removeAttribute("autoplay");
    video.pause();
    video.controls = true;
  } else {
    new IntersectionObserver(([e]) => { if (e.isIntersecting) video.play().catch(() => {}); else if (video.muted) video.pause(); }, { threshold: 0.15 }).observe(video);
  }
}
