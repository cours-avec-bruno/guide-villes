// La chorégraphie de la page d'accueil, sans bibliothèque. Elle ne tourne que si <html> porte la classe « anime ».
// Ordre : entrée (avion, cartes, pictos → lettres), puis tout suit le défilement :
//   éventail → dispersion (« Tu as vu la vidéo ? ») → pile → roue. La roue tourne ensuite avec le défilement :
//   la ville du milieu est celle qu'on choisit, et chaque carte mène à la page de sa ville.
// Les boutons « guide complet » ([data-roue]) mènent droit à la roue.

const html = document.documentElement;
if (html.classList.contains("anime")) demarrer();

function demarrer() {
  const un = <T extends HTMLElement = HTMLElement>(s: string) => document.querySelector(s) as T;
  const tous = (s: string, racine: ParentNode = document) => [...racine.querySelectorAll<HTMLElement>(s)];

  const histoire = un(".histoire"), hero = un(".hero"), titre = un(".hero__titre"), pictosEl = un(".hero__pictos");
  const avion = un(".avion"), sous = un(".hero__sous"), sur = un(".hero__sur"), processus = un(".processus");
  const choix = un(".choix"), pied = un(".choix__pied"), bouton = un<HTMLAnchorElement>(".choix__btn");
  const lettres = tous(".hero__mot .l"), cartes = tous(".carte-v");
  const liens = cartes.map((c) => c.querySelector("a")!);

  // ——— outils
  const borne = (x: number, a = 0, b = 1) => Math.min(b, Math.max(a, x));
  const norme = (x: number, a: number, b: number) => borne((x - a) / (b - a));
  const mel = (a: number, b: number, t: number) => a + (b - a) * t;
  const eInOut = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
  const eOut = (t: number) => 1 - Math.pow(1 - t, 3);
  const retour = (t: number, s = 1.15) => 1 + (s + 1) * Math.pow(t - 1, 3) + s * Math.pow(t - 1, 2);
  function bezier(x1: number, y1: number, x2: number, y2: number) {
    const f = (a: number, b: number, t: number) => 3 * a * (1 - t) * (1 - t) * t + 3 * b * (1 - t) * t * t + t * t * t;
    return (x: number) => {
      let lo = 0, hi = 1;
      for (let i = 0; i < 22; i++) { const m = (lo + hi) / 2; if (f(x1, x2, m) < x) lo = m; else hi = m; }
      return f(y1, y2, (lo + hi) / 2);
    };
  }
  const eGlisse = bezier(0.25, 0.75, 0.2, 1);

  // ——— le minutage : la part du défilement de l'histoire (0 → 1) où chaque mouvement commence et finit.
  // L'histoire fait 4,6 écrans de défilement (voir « .anime .histoire » dans accueil.css).
  type Plage = [number, number];
  const T_EPARS: Plage = [0.004, 0.12]; // l'éventail se disperse
  const T_PHRASE: Plage = [0.05, 0.09]; // « Tu as vu la vidéo ? » apparaît…
  const T_PHRASE_FIN: Plage = [0.24, 0.29]; // … puis s'efface
  const T_PILE: Plage = [0.22, 0.3]; // les cartes se rangent en pile
  const T_ROUE: Plage = [0.3, 0.39]; // la pile s'ouvre en roue, la ville prête au milieu
  const T_CHOIX: Plage = [0.35, 0.4]; // « Choisis ta ville » et le bouton apparaissent
  const T_TOUR: Plage = [0.45, 0.97]; // la roue tourne : un cran par ville
  const P_CHOIX = 0.42; // là où mènent les boutons « guide complet » : la roue formée, avant qu'elle tourne
  const VITESSE_MOLETTE = 1.25; // un cran de molette fait avancer un peu plus que dans une page ordinaire
  const N = cartes.length; // 12 cartes : 11 villes et « Ta ville »
  const PRETE = Math.max(0, cartes.findIndex((c) => c.hasAttribute("data-pret"))); // celle qui ouvre la roue

  // ——— les pictos en pixels (9 × 9) : avion, épingle, porte de traboule, basilique, couverts, appareil photo, soleil
  const PAL: Record<string, string> = { k: "#16202a", b: "#2a6788", w: "#fffdf6", p: "#f5bd2f", r: "#de3341" };
  const PICTOS = [
    ["........k", "......kkb", "....kkwkb", "..kkwwkb.", "kkwwwkbb.", "..kkkbb..", "....kb...", "....k....", "........."],
    ["..kkkkk..", ".krrrrrk.", "krrwwwrrk", "krrwwwrrk", "krrwwwrrk", ".krrrrrk.", "..krrrk..", "...krk...", "....k...."],
    ["..kkkkk..", ".kbbbbbk.", "kbbkkkbbk", "kbkpppkbk", "kbkpppkbk", "kbkppkkbk", "kbkpppkbk", "kbkpppkbk", "kkkkkkkkk"],
    ["k...k...k", "k...k...k", "kk.kwk.kk", "kwkwwwkwk", "kwwwbwwwk", "kwbwbwbwk", "kwwwwwwwk", "kwbwkwbwk", "kkkkkkkkk"],
    [".k.k...k.", ".k.k..kk.", ".k.k..kk.", ".kkk..kk.", "..k...kk.", "..k....k.", "..k....k.", "..k....k.", "..k....k."],
    [".........", "..kkk....", "kkkkkkkkk", "kwwwkkkrk", "kwwkbbkwk", "kwwkbbkwk", "kwwwkkkwk", "kkkkkkkkk", "........."],
    ["....p....", ".p..k..p.", "...kpk...", "..kpppk..", "pkpppppkp", "..kpppk..", "...kpk...", ".p..k..p.", "....p...."],
  ];
  const pictos = PICTOS.map((lignes) => {
    let svg = '<svg viewBox="0 0 9 9" shape-rendering="crispEdges">';
    lignes.forEach((l, y) => [...l].forEach((c, x) => { if (c !== ".") svg += `<rect x="${x}" y="${y}" width="1.02" height="1.02" fill="${PAL[c]}"/>`; }));
    const el = document.createElement("span");
    el.className = "pi";
    el.innerHTML = `<i>${svg}</svg></i>`;
    pictosEl.appendChild(el);
    return el;
  });

  // ——— préparer les mots
  tous(".m", processus).forEach((m, i) => m.style.setProperty("--i", String(i)));
  tous(".m", choix).forEach((m, i) => m.style.setProperty("--i", String(i)));

  // ——— mesures
  let W = 0, H = 0, mobile = false, n = 1, hfs = 100, ic = 60, cw = 218, navH = 86, ty = 0.38, g = 1.12;
  let hTop = 0, hH = 1;
  let largeurs: number[] = [];
  const estLettre = lettres.map((l) => (l.textContent ?? "").trim() !== "");
  const nbLettres = estLettre.filter(Boolean).length;

  // la roue : son rayon, l'écart entre deux cartes, la hauteur de la carte du milieu
  const rayon = () => (mobile ? W * 1.15 : (860 * W) / 1440);
  const ecart = () => 2 * Math.asin((1.16 * cw * g) / (2 * rayon()));
  const milieuY = () => H * (mobile ? 0.52 : 0.57);
  const GROS = () => (mobile ? 0.25 : 0.18); // la carte du milieu est un peu plus grande que les autres

  function mesurer() {
    W = window.innerWidth; H = window.innerHeight;
    mobile = W < 820 && W < H * 1.1;
    const u = Math.min(W / 1440, H / 800);
    n = mobile ? Math.min(1, W / 560) : borne(W / 1440, 0.62, 1.25);
    ty = mobile ? 0.41 : 0.38; // la hauteur du titre dans le premier écran
    hfs = mobile ? Math.min(W * 0.145, H * 0.1) : Math.min(W * 0.105, H * 0.18);
    const pfs = mobile ? Math.min(W * 0.092, 44) : Math.min(W * 0.045, H * 0.08);
    cw = mobile ? Math.min(W * 0.3, H * 0.2) : Math.min(W / 1440, H / 780) * 218;
    g = mobile ? 1.45 : 1.12; // dans la roue, les cartes sont plus grandes que dans l'éventail
    navH = Math.max(60, 86 * n);
    const s = html.style;
    s.setProperty("--u", u + "px"); s.setProperty("--n", String(n)); s.setProperty("--hfs", hfs + "px");
    s.setProperty("--pfs", pfs + "px"); s.setProperty("--cw", String(cw)); s.setProperty("--nav-h", navH + "px");
    s.setProperty("--ty", ty * 100 + "%");
    // le titre tient sur une ligne : si elle dépasse, la taille des lettres diminue d'autant
    largeurs = lettres.map((l) => l.getBoundingClientRect().width);
    const ligne = largeurs.reduce((a, b) => a + b, 0), place = W - (mobile ? 28 : 120);
    if (ligne > place) {
      const k = place / ligne;
      hfs *= k;
      largeurs = largeurs.map((l) => l * k);
      s.setProperty("--hfs", hfs + "px");
    }
    ic = hfs * 0.6;
    s.setProperty("--ic", ic + "px");
    // le bouton de la ville choisie se place juste sous la carte du milieu
    s.setProperty("--pied-y", (milieuY() + (cw * 1.32 * g * (1 + GROS())) / 2 + (mobile ? 18 : 22)).toFixed(1) + "px");
    hTop = histoire.offsetTop; hH = histoire.offsetHeight;
  }

  // ——— le titre : k lettres visibles, le reste en pictos ; l'ensemble reste centré
  const nbPictos = (k: number) => Math.ceil((7 * estLettre.slice(k).filter(Boolean).length) / nbLettres);
  let visibles = 0;
  function placer(k: number) {
    const np = nbPictos(k);
    const esp = ic * 0.2;
    const mot = largeurs.slice(0, k).reduce((a, b) => a + b, 0);
    const total = mot + (np > 0 && k > 0 ? esp * 1.6 : 0) + (np > 0 ? np * ic + (np - 1) * esp : 0);
    let x = -total / 2;
    lettres.forEach((l, i) => {
      l.style.setProperty("--x", x + "px");
      if (i < k) { x += largeurs[i]; l.classList.add("vu"); } else l.classList.remove("vu");
    });
    if (np > 0 && k > 0) x += esp * 1.6;
    pictos.forEach((p, j) => {
      if (j >= 7 - np) { p.style.setProperty("--x", x + "px"); x += ic + esp; }
    });
  }
  function avaler(j: number) {
    pictos[j].firstElementChild!.animate(
      [
        { transform: "scale(1) rotate(0deg)", filter: "brightness(1)", opacity: 1 },
        { transform: "scale(1.25, 0.16) rotate(-28deg)", filter: "brightness(0)", opacity: 1, offset: 0.45 },
        { transform: "scale(1.25, 0.16) rotate(-90deg)", filter: "brightness(0)", opacity: 0 },
      ],
      { duration: 240, fill: "forwards", easing: "linear" },
    );
  }
  function eclore(j: number) {
    pictos[j].firstElementChild!.animate(
      [{ transform: "scale(0)", opacity: 0 }, { transform: "scale(1.16)", opacity: 1, offset: 0.62 }, { transform: "scale(1)", opacity: 1 }],
      { duration: 320, fill: "forwards", easing: "ease-out" },
    );
  }
  function montrer(k: number) {
    const avant = nbPictos(visibles), apres = nbPictos(k);
    for (let j = 7 - avant; j < 7 - apres; j++) avaler(j);
    visibles = k;
    placer(k);
  }

  // ——— les poses des cartes : [x, y, rotation°, échelle, opacité]
  type Pose = [number, number, number, number, number];
  const deg = (r: number) => (r * 180) / Math.PI;
  const pas = (R: number) => 2 * Math.asin((1.05 * cw) / (2 * R));
  function eventail(i: number): Pose {
    if (i > 5) return [W * 0.5, H * 1.4, 0, 1, 0];
    const R = mobile ? W * 1.35 : (1250 * W) / 1440;
    const th = (i - 2.5) * pas(R);
    const cx = mobile ? W * 0.5 : W * 0.55, cy = H * 0.86 + R;
    return [cx + R * Math.sin(th) - (mobile ? 0 : W * 0.02), cy - R * Math.cos(th) + (mobile ? cw * 0.2 : 0), deg(th), 1, 1];
  }
  const EPARS: [number, number, number][] = [[0.08, 0.5, -20], [0.2, 0.88, -12], [0.8, 0.86, 14], [0.38, 1.04, -8], [0.92, 0.46, 16], [0.62, 1.04, 9]];
  const EPARS_M: [number, number, number][] = [[0.06, 0.66, -20], [0.45, 0.72, 12], [0.94, 0.66, 16], [0.22, 0.95, -14], [0.72, 0.98, 9], [0.5, 1.3, 0]];
  function epars(i: number): Pose {
    if (i > 5) return [W * 0.5, H * 1.4, 0, 1, 0];
    const [x, y, r] = (mobile ? EPARS_M : EPARS)[i];
    return [W * x, H * y, r, 1, 1];
  }
  function pile(i: number): Pose {
    return [W * 0.5 + ((i % 3) - 1) * cw * 0.08, H * (mobile ? 0.62 : 0.62) + (((i * 7) % 5) - 2) * cw * 0.04, (i % 2 ? 1 : -1) * (4 + i * 1.3), 1, 1];
  }
  /** La roue. « rot » : sa position, en crans ; la carte i est au milieu quand i + rot vaut 0 (à 12 près). */
  function roue(i: number, rot: number): Pose {
    const R = rayon();
    const cran = ((((i + rot + N / 2) % N) + N) % N) - N / 2;
    const a = cran * ecart();
    const milieu = Math.max(0, 1 - Math.abs(cran));
    return [W * 0.5 + R * Math.sin(a), milieuY() + R - R * Math.cos(a), deg(a), g * (1 + GROS() * milieu), Math.abs(cran) < (mobile ? 2.6 : 4.4) ? 1 : 0];
  }
  /** La position de la roue pour un défilement donné : elle s'attarde sur chaque ville et passe vite de l'une à l'autre. */
  function rotation(p: number) {
    const r = norme(p, ...T_TOUR) * (N - 1);
    const e = Math.floor(r), f = r - e;
    const m = f < 0.5 ? 0.5 * Math.pow(2 * f, 2.4) : 1 - 0.5 * Math.pow(2 * (1 - f), 2.4);
    return -PRETE - (e + m);
  }
  const melPose = (a: Pose, b: Pose, t: number): Pose => [mel(a[0], b[0], t), mel(a[1], b[1], t), mel(a[2], b[2], t), mel(a[3], b[3], t), mel(a[4], b[4], t)];
  function cible(i: number, p: number): Pose {
    if (p < T_EPARS[0]) return eventail(i);
    if (p < T_EPARS[1]) return melPose(eventail(i), epars(i), eInOut(norme(p, ...T_EPARS)));
    if (p < T_PILE[0]) return epars(i);
    if (p < T_PILE[1]) return melPose(epars(i), pile(i), eInOut(norme(p, ...T_PILE)));
    if (p < T_ROUE[1]) return melPose(pile(i), roue(i, -PRETE), eGlisse(norme(p, ...T_ROUE)));
    return roue(i, rotation(p));
  }
  const poses: Pose[] = cartes.map(() => [0, 0, 0, 1, 0]);
  const poser = (el: HTMLElement, q: Pose) => {
    el.style.transform = `translate3d(${q[0].toFixed(1)}px,${q[1].toFixed(1)}px,0) rotate(${q[2].toFixed(2)}deg) scale(${q[3].toFixed(3)})`;
    el.style.opacity = q[4].toFixed(3);
    el.style.pointerEvents = q[4] > 0.5 ? "" : "none";
  };

  // ——— la ville du milieu : le bouton sous la roue la nomme et mène à sa page
  let choisie = -1;
  function annoncer(k: number) {
    if (k === choisie) return;
    choisie = k;
    const c = cartes[k], pret = c.hasAttribute("data-pret");
    bouton.href = liens[k].href;
    bouton.rel = c.dataset.ville === "autre" ? "noopener" : "";
    bouton.firstElementChild!.textContent = pret ? `Voir le guide ${c.dataset.de}` : c.dataset.ville === "autre" ? "Proposer ma ville sur Instagram" : `${c.dataset.nom} : bientôt`;
    bouton.classList.toggle("btn--plein", pret);
    bouton.classList.toggle("btn--contour", !pret);
    cartes.forEach((x, i) => x.classList.toggle("milieu", i === k));
  }

  // ——— l'entrée, calée sur le temps
  const VOL: [number, number, number][] = [[0.33, -3, 73], [0.45, 4, 71], [0.6, 13, 65], [0.7, 22, 55], [0.8, 31, 44], [0.87, 32.5, 47.5], [0.93, 26, 48], [1.0, 21.5, 45], [1.07, 22.5, 51.5], [1.15, 27, 52]];
  const LEVER: [number, number][] = [[5, 0.53], [2, 0.6], [0, 0.63], [1, 0.7], [3, 0.8], [4, 0.86]];
  const T_PICTOS = 1.27, T_LETTRES = 1.9, PAS_LETTRE = 0.13, T_FIN = T_LETTRES + lettres.length * PAS_LETTRE;
  let t0 = 0, entree = false, fini = false, ecloses = 0;
  function cr(a: number, b: number, c: number, d: number, s: number) {
    return 0.5 * (2 * b + (-a + c) * s + (2 * a - 5 * b + 4 * c - d) * s * s + (-a + 3 * b - 3 * c + d) * s * s * s);
  }
  function volAvion(t: number) {
    const x0 = -(7 * ic + 6 * ic * 0.2) / 2 + ic / 2; // le centre du premier picto, par rapport au milieu de l'écran
    const pts: [number, number, number][] = [...VOL, [T_PICTOS, ((W / 2 + x0) / W) * 100, ty * 100]];
    if (t < pts[0][0]) { avion.style.opacity = "0"; return; }
    if (t >= T_PICTOS) {
      const k = norme(t, T_PICTOS, T_PICTOS + 0.06);
      avion.style.opacity = String(1 - k);
      avion.style.transform = `translate(${W / 2 + x0}px,${H * ty}px) rotate(45deg) scale(${mel(1, 0.6, k)})`;
      return;
    }
    let i = 0;
    while (i < pts.length - 2 && t > pts[i + 1][0]) i++;
    const a = pts[Math.max(0, i - 1)], b = pts[i], c = pts[i + 1], d = pts[Math.min(pts.length - 1, i + 2)];
    const s = norme(t, b[0], c[0]);
    const x = (cr(a[1], b[1], c[1], d[1], s) * W) / 100, y = (cr(a[2], b[2], c[2], d[2], s) * H) / 100;
    const x2 = (cr(a[1], b[1], c[1], d[1], Math.min(1, s + 0.04)) * W) / 100, y2 = (cr(a[2], b[2], c[2], d[2], Math.min(1, s + 0.04)) * H) / 100;
    avion.style.opacity = "1";
    avion.style.transform = `translate(${x}px,${y}px) rotate(${deg(Math.atan2(y2 - y, x2 - x)) + 45}deg)`;
  }
  const montrerTexte = () => { sous.classList.add("vu"); sur.classList.add("vu"); };
  function etatFinal() {
    fini = true;
    titre.classList.add("fixe");
    pictos.forEach((p) => ((p.firstElementChild as HTMLElement).style.opacity = "0"));
    visibles = lettres.length;
    placer(visibles);
    avion.style.opacity = "0";
    montrerTexte();
    requestAnimationFrame(() => titre.classList.remove("fixe"));
  }
  function jouerEntree(t: number) {
    if (t < T_PICTOS + 0.2) volAvion(t);
    if (t >= T_PICTOS && ecloses === 0) { eclore(0); ecloses = 1; }
    while (ecloses >= 1 && ecloses < 7 && t >= T_PICTOS + 0.03 + (ecloses - 1) * 0.07) eclore(ecloses++);
    if (t >= T_LETTRES) {
      const k = Math.min(lettres.length, Math.floor((t - T_LETTRES) / PAS_LETTRE) + 1);
      if (k !== visibles) montrer(k);
    }
    if (t >= 1.5) montrerTexte(); // le texte et les boutons n'attendent pas la fin du titre
    if (t >= T_FIN + 0.4) { fini = true; avion.style.opacity = "0"; }
  }

  // ——— le défilement
  const fin = window.matchMedia("(pointer: fine)").matches;
  let sy = window.scrollY, cibleY = window.scrollY, dernierWheel = 0, dernier = performance.now(), sansPhrase = 0;
  window.addEventListener(
    "wheel",
    (e) => {
      if (!fin || e.ctrlKey) return;
      const limite = hTop + hH - H; // au-delà (le pied de page) : le défilement habituel du navigateur
      if (window.scrollY > limite + 1 || (window.scrollY >= limite - 1 && e.deltaY > 0)) return;
      e.preventDefault();
      if (performance.now() - dernierWheel > 250) cibleY = window.scrollY;
      const d = e.deltaMode === 1 ? e.deltaY * 32 : e.deltaY;
      cibleY = borne(cibleY + d * VITESSE_MOLETTE, 0, html.scrollHeight - H);
      window.scrollTo(0, cibleY);
      dernierWheel = performance.now();
    },
    { passive: false },
  );
  // « Guide complet » : droit à la roue ; les cartes y vont d'un seul mouvement, sans s'arrêter sur la phrase
  tous("[data-roue]").forEach((a) =>
    a.addEventListener("click", (e) => {
      e.preventDefault();
      mesurer();
      if (!fini) etatFinal();
      cibleY = hTop + P_CHOIX * (hH - H);
      if (sy < cibleY) sansPhrase = performance.now() + 1100;
      window.scrollTo(0, cibleY);
      bouton.focus({ preventScroll: true });
    }),
  );

  function image(maintenant: number) {
    const dt = Math.min(1000, maintenant - dernier); // large : si le navigateur ralentit les images, tout rattrape quand même
    dernier = maintenant;
    const reel = window.scrollY;
    if (fin) { sy += (reel - sy) * (1 - Math.pow(1 - 0.085, dt / 16.67)); if (Math.abs(reel - sy) < 0.4) sy = reel; } else sy = reel;
    const p = borne((sy - hTop) / (hH - H));
    const t = (maintenant - t0) / 1000;

    // le hero part avec la page ; son titre s'efface avant d'atteindre la navigation
    if (sy < H * 1.3) {
      hero.style.visibility = "visible";
      hero.style.transform = `translate3d(0,${(reel - sy).toFixed(1)}px,0)`;
      const haut = H * ty - hfs * 0.5 - sy;
      const op = borne((haut - (navH - 0.1 * hfs)) / (0.8 * hfs)).toFixed(3);
      titre.style.opacity = op;
      sur.style.opacity = sur.classList.contains("vu") ? op : "";
      const hautSous = H * ty + hfs * 0.66 - sy;
      sous.style.visibility = hautSous < navH ? "hidden" : "visible";
      if (fini) sous.style.opacity = borne((hautSous - navH) / (hfs * 0.8)).toFixed(3);
    } else hero.style.visibility = "hidden";

    if (entree && !fini) {
      if (p > 0.004) etatFinal(); else jouerEntree(t);
    }

    // les cartes
    cartes.forEach((el, i) => {
      let c = cible(i, p);
      if (p < 0.004 && entree && i < 6 && t < 1.7) {
        const depart = LEVER.find((l) => l[0] === i)![1];
        const k = norme(t, depart, depart + 0.7);
        c = k <= 0 ? [c[0], H + cw * 1.2, c[2] + 8, 1, 0] : [c[0], mel(H + cw * 1.2, c[1], retour(k)), mel(c[2] + 8, c[2], eOut(k)), 1, 1];
        poses[i] = c;
      } else if (p < 0.004) poses[i] = c;
      else {
        const poids = 0.085 + (i % 4) * 0.012;
        const k = 1 - Math.pow(1 - poids, dt / 16.67);
        const q = poses[i];
        for (let j = 0; j < 5; j++) q[j] += (c[j] - q[j]) * (j === 4 ? Math.min(1, k * 2.2) : k);
      }
      poser(el, poses[i]);
    });

    // « Tu as vu la vidéo ? Maintenant, va voir en vrai. »
    const op = maintenant < sansPhrase ? 0 : Math.min(norme(p, ...T_PHRASE), 1 - norme(p, ...T_PHRASE_FIN));
    processus.style.opacity = op.toFixed(3);
    processus.style.visibility = op === 0 ? "hidden" : "visible";
    if (op > 0 && p > T_PHRASE[1]) processus.classList.add("vu"); else if (p < T_PHRASE[0]) processus.classList.remove("vu");

    // « Choisis ta ville » et le bouton de la ville du milieu
    const oc = norme(p, ...T_CHOIX);
    for (const el of [choix, pied]) {
      el.style.opacity = oc.toFixed(3);
      el.style.visibility = oc === 0 ? "hidden" : "visible";
    }
    if (p > T_CHOIX[1]) { choix.classList.add("vu"); pied.classList.add("vu"); } else if (p < T_CHOIX[0]) { choix.classList.remove("vu"); pied.classList.remove("vu"); }
    if (p >= T_ROUE[0]) annoncer((((Math.round(-rotation(p)) % N) + N) % N));

    requestAnimationFrame(image);
  }

  function lancer() {
    mesurer();
    // « …/#villes » (le lien « Toutes les villes » des autres pages) : on arrive directement sur la roue
    if (location.hash === "#villes") { cibleY = hTop + P_CHOIX * (hH - H); sy = cibleY; window.scrollTo(0, cibleY); }
    if (window.scrollY > 8) etatFinal(); else { placer(0); visibles = 0; }
    entree = true;
    t0 = performance.now();
    dernier = t0;
    requestAnimationFrame(image);
  }
  let attente = 0;
  window.addEventListener("resize", () => {
    cancelAnimationFrame(attente);
    attente = requestAnimationFrame(() => { mesurer(); titre.classList.add("fixe"); placer(visibles); requestAnimationFrame(() => titre.classList.remove("fixe")); });
  });
  window.addEventListener("load", () => mesurer());
  // les lettres se mesurent avec la bonne police : on attend qu'elle soit là (1,2 s au plus)
  Promise.race([document.fonts.ready, new Promise((r) => setTimeout(r, 1200))]).then(lancer);
}
