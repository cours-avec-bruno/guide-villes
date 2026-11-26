// Le peu de mouvement des pages de vente : le menu qui se déroule, la rangée des villes qu'on fait glisser,
// les blocs qui apparaissent, la barre d'achat sur téléphone, et la vidéo d'exemple.
const tous = <T extends HTMLElement = HTMLElement>(s: string, r: ParentNode = document) => [...r.querySelectorAll<T>(s)];

// ——— le menu (téléphone et tablette)
const bouton = document.querySelector<HTMLButtonElement>("[data-menu]");
const menu = document.getElementById("menu");
if (bouton && menu) {
  const ouvrir = (oui: boolean) => {
    bouton.setAttribute("aria-expanded", String(oui));
    menu.hidden = !oui;
    document.body.classList.toggle("menu-ouvert", oui);
  };
  bouton.addEventListener("click", () => ouvrir(bouton.getAttribute("aria-expanded") !== "true"));
  menu.addEventListener("click", (e) => { if ((e.target as HTMLElement).closest("a")) ouvrir(false); });
  document.addEventListener("keydown", (e) => { if (e.key === "Escape" && !menu.hidden) { ouvrir(false); bouton.focus(); } });
  matchMedia("(min-width: 1081px)").addEventListener("change", (m) => m.matches && ouvrir(false));
}

// ——— l'ombre sous la navigation dès qu'on a défilé
const ombre = () => document.body.classList.toggle("defile", window.scrollY > 8);
ombre();
window.addEventListener("scroll", ombre, { passive: true });

// ——— les blocs apparaissent en entrant à l'écran (une fois)
const vue = new IntersectionObserver(
  (entrees) => entrees.forEach((e) => { if (e.isIntersecting) { e.target.classList.add("vu"); vue.unobserve(e.target); } }),
  { rootMargin: "0px 0px -8% 0px" },
);
tous(".entre").forEach((el) => vue.observe(el));

// ——— la rangée des villes : au doigt (natif), à la souris (on l'attrape et on la tire), ou avec les flèches
tous("[data-rangee]").forEach((rangee) => {
  const section = rangee.closest("section")!;
  const fleches = tous<HTMLButtonElement>("[data-defile]", section);
  const pas = () => {
    const carte = rangee.querySelector("li");
    return carte ? (carte.getBoundingClientRect().width + parseFloat(getComputedStyle(rangee).columnGap || "16")) * 2 : 300;
  };
  const maj = () => {
    const fin = rangee.scrollWidth - rangee.clientWidth - 2;
    fleches.forEach((f) => (f.disabled = Number(f.dataset.defile) < 0 ? rangee.scrollLeft <= 2 : rangee.scrollLeft >= fin));
  };
  fleches.forEach((f) => f.addEventListener("click", () => rangee.scrollBy({ left: Number(f.dataset.defile) * pas(), behavior: "smooth" })));
  rangee.addEventListener("scroll", maj, { passive: true });
  window.addEventListener("resize", maj);
  maj();

  // à la souris : on tire la rangée ; un vrai glissé n'ouvre pas la carte sous le pointeur
  let x0 = 0, gauche0 = 0, tire = false, glisse = false;
  rangee.addEventListener("pointerdown", (e) => {
    if (e.pointerType !== "mouse" || e.button !== 0) return;
    tire = true; glisse = false; x0 = e.clientX; gauche0 = rangee.scrollLeft;
  });
  window.addEventListener("pointermove", (e) => {
    if (!tire) return;
    const dx = e.clientX - x0;
    if (!glisse && Math.abs(dx) > 6) { glisse = true; rangee.classList.add("saisie"); }
    if (glisse) rangee.scrollLeft = gauche0 - dx;
  });
  window.addEventListener("pointerup", () => {
    if (!tire) return;
    tire = false;
    rangee.classList.remove("saisie"); // la rangée se recale d'elle-même sur la carte la plus proche
  });
  rangee.addEventListener("click", (e) => { if (glisse) { e.preventDefault(); glisse = false; } }, true);
  rangee.addEventListener("dragstart", (e) => e.preventDefault());
});

// ——— la barre d'achat (téléphone) : visible une fois le haut de page passé, cachée quand les tarifs sont à l'écran
const barre = document.querySelector("[data-barre]");
const hero = document.querySelector(".hero");
const formules = document.getElementById("formules");
if (barre && hero && formules) {
  let apresHero = false, surTarifs = false;
  const maj = () => document.body.classList.toggle("barre-vue", apresHero && !surTarifs);
  new IntersectionObserver(([e]) => { apresHero = !e.isIntersecting && e.boundingClientRect.top < 0; maj(); }).observe(hero);
  new IntersectionObserver(([e]) => { surTarifs = e.isIntersecting; maj(); }).observe(formules);
}

// ——— l'arrêt d'exemple : un clic remplace l'image par la vraie vidéo, avec le son
tous<HTMLButtonElement>(".lecteur-ex").forEach((b) =>
  b.addEventListener("click", () => {
    const v = document.createElement("video");
    v.src = b.dataset.video!;
    v.controls = true;
    v.playsInline = true;
    v.autoplay = true;
    v.className = "lecteur-ex__video";
    v.setAttribute("aria-label", b.getAttribute("aria-label") ?? "Vidéo de l'arrêt");
    b.replaceWith(v);
    v.play().catch(() => {});
  }),
);
