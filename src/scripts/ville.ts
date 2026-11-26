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

// ——— le film : une horloge, des plans (les écrans de l'appli), cinq phrases, des autocollants
if (document.documentElement.classList.contains("anime")) film();

function film() {
  const scene = document.querySelector<HTMLElement>(".film")!;
  const tel = scene.querySelector<HTMLElement>(".tel")!;
  const plans = [...scene.querySelectorAll<HTMLElement>(".film__plan")];
  const textes = [...scene.querySelectorAll<HTMLElement>(".film__texte")];
  const barres = [...scene.querySelectorAll<HTMLElement>(".film__barre b")];
  const colles = [...scene.querySelectorAll<HTMLElement>(".film__c")].map((el) => ({ el, de: Number(el.dataset.de), a: Number(el.dataset.a) }));
  textes.forEach((p) => p.querySelectorAll<HTMLElement>(".m").forEach((m, i) => m.style.setProperty("--i", String(i))));

  const DUREE = 21; // secondes, puis ça recommence
  const DEBUTS = [0, 4.3, 8.6, 13.4, 17.4]; // le moment où chaque phrase arrive
  // chaque plan : quand il entre, d'où il vient (1 : du bas), le point qu'il regarde, son zoom du début à la fin ;
  // « glisse » : entre ces deux moments, l'image descend pour montrer son haut (le reste du temps elle montre son bas)
  const PLANS: { de: number; a: number; sens: number; point: string; zoom: [number, number]; glisse?: [number, number] }[] = [
    { de: 0, a: 8.6, sens: 1, point: "50% 26%", zoom: [1, 1.14] }, // le parcours
    { de: 8.6, a: 11.3, sens: 1, point: "50% 30%", zoom: [1, 1.07] }, // la fiche d'un arrêt, avec sa vidéo
    { de: 11.3, a: 13.4, sens: 1, point: "50% 42%", zoom: [1.03, 1.12] }, // la carte et les adresses
    // le carnet : d'abord les étapes et les photos (le bas de l'écran), puis l'image glisse vers la carte du voyage (le haut)
    { de: 13.4, a: DUREE, sens: 1, point: "50% 50%", zoom: [1.24, 1.3], glisse: [16.9, 18.4] },
  ];
  const ENTREE = 0.65;
  const borne = (x: number) => Math.min(1, Math.max(0, x));
  const norme = (x: number, a: number, b: number) => borne((x - a) / (b - a));
  const sortie = (x: number) => 1 - Math.pow(1 - x, 3);
  const douce = (x: number) => (x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2);
  plans.forEach((p, i) => (p.style.transformOrigin = PLANS[i].point));

  let actif = -1, t0 = performance.now(), pause = 0, visible = true;
  new IntersectionObserver((e) => { visible = e[0].isIntersecting; }, { threshold: 0.1 }).observe(scene);

  function image(maintenant: number) {
    requestAnimationFrame(image);
    if (!visible || document.hidden) { pause = pause || maintenant; return; }
    if (pause) { t0 += maintenant - pause; pause = 0; } // le film reprend où il s'était arrêté
    const ecoule = (maintenant - t0) / 1000, t = ecoule % DUREE, reprise = ecoule >= DUREE; // « reprise » : à partir du deuxième tour

    // les plans glissent l'un sur l'autre (jamais de coupe), et chacun avance doucement vers ce qu'il montre
    plans.forEach((p, i) => {
      const P = PLANS[i], dernier = i === plans.length - 1;
      const reste = dernier && reprise && t < ENTREE; // le dernier plan reste dessous pendant que le premier revient
      const la = (t >= P.de && t < P.a + ENTREE) || reste;
      p.style.visibility = la ? "visible" : "hidden";
      if (!la) return;
      const e = reste || (i === 0 && !reprise) ? 1 : sortie(norme(t, P.de, P.de + ENTREE));
      const z = P.zoom[0] + (P.zoom[1] - P.zoom[0]) * norme(reste ? DUREE : t, P.de, P.a + ENTREE);
      p.style.zIndex = String(i === 0 && t < ENTREE + 0.1 ? plans.length : i);
      // un plan zoomé peut glisser de (z − 1) / 2 de sa hauteur sans montrer son bord
      const marge = ((z - 1) / 2) * 100 * 0.92;
      const y = P.glisse ? marge * (2 * douce(norme(reste ? DUREE : t, ...P.glisse)) - 1) : 0;
      p.style.transform = `translate3d(0,${((1 - e) * 100 * P.sens + y).toFixed(2)}%,0) scale(${z.toFixed(4)})`;
    });

    // la phrase du moment, et la barre qui avance
    let k = 0;
    for (let i = 0; i < DEBUTS.length; i++) if (t >= DEBUTS[i]) k = i;
    if (k !== actif) { actif = k; textes.forEach((p, i) => p.classList.toggle("vu", i === k)); }
    barres.forEach((b, i) => (b.style.transform = `scaleX(${norme(t, DEBUTS[i], DEBUTS[i + 1] ?? DUREE).toFixed(3)})`));

    // les autocollants autour du téléphone
    colles.forEach((c) => c.el.classList.toggle("vu", t >= c.de && t < c.a));

    // le téléphone flotte et pivote lentement
    const s = maintenant / 1000;
    tel.style.transform = `perspective(900px) translateY(${(Math.sin(s * 1.5) * 5).toFixed(1)}px) rotateY(${(Math.sin(s * 0.55) * 9).toFixed(2)}deg)`;
  }
  requestAnimationFrame(image);
}
