// La chorégraphie de la page de vente, sans bibliothèque. Elle ne tourne que si <html> porte la classe « anime ».
// Ordre : entrée (avion, cartes, pictos → lettres), puis tout suit le défilement :
//   éventail → dispersion → pile → roue qui tourne → le panneau de l'appli grandit → les quatre écrans défilent dans le
//   téléphone → on plonge dans l'écran → la ligne défile de côté (les trois gestes, puis les 13 lieux).

const html = document.documentElement;
lecteurExemple();
if (html.classList.contains("anime")) demarrer();

/** L'arrêt d'exemple : un clic remplace l'image par la vraie vidéo, avec le son. Marche aussi sans animation. */
function lecteurExemple() {
  const bouton = document.querySelector<HTMLButtonElement>(".lecteur-ex");
  if (!bouton) return;
  bouton.addEventListener("click", () => {
    const v = document.createElement("video");
    v.src = bouton.dataset.video!;
    v.controls = true;
    v.playsInline = true;
    v.autoplay = true;
    v.className = "lecteur-ex__video";
    v.setAttribute("aria-label", bouton.getAttribute("aria-label") ?? "Vidéo de l'arrêt");
    bouton.replaceWith(v);
    v.play().catch(() => {});
  });
}

function demarrer() {
  const un = <T extends HTMLElement = HTMLElement>(s: string) => document.querySelector(s) as T;
  const tous = (s: string, racine: ParentNode = document) => [...racine.querySelectorAll<HTMLElement>(s)];

  const histoire = un(".histoire"), hero = un(".hero"), titre = un(".hero__titre"), pictosEl = un(".hero__pictos");
  const avion = un(".avion"), sous = un(".hero__sous"), sur = un(".hero__sur"), processus = un(".processus");
  const lettres = tous(".hero__mot .l"), cartes = tous(".carte-v");
  const panneau = un(".panneau"), fond = un(".panneau__fond img"), tel = un(".tel"), noir = un(".noir");
  const motsHG = un(".mots--hg"), legendes = un(".legendes"), ecrans = tous(".tel__ecran"), legs = tous(".legende");
  const manifeste = un(".manifeste"), piste = un(".piste");
  const suite = manifeste.nextElementSibling as HTMLElement; // la première section « normale » après la chorégraphie
  const zones = [...tous("main > section"), un(".pied")];
  const liens = tous(".nav__liens a");

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
  tous(".processus .m").forEach((m, i) => m.style.setProperty("--i", String(i)));
  tous(".m", motsHG).forEach((m, i) => m.style.setProperty("--i", String(i)));
  tous(".mot", piste).forEach((mot) => {
    const txt = mot.textContent ?? "";
    mot.textContent = "";
    [...txt].forEach((c, k) => {
      const s = document.createElement("span");
      s.className = "c";
      s.textContent = c;
      s.style.setProperty("--k", String(k));
      mot.appendChild(s);
    });
  });
  // les éléments de la ligne qui apparaissent un par un : ses enfants directs, et chaque carte de lieu
  const elements = tous(":scope > :not(.piste__fin):not(.lieux), :scope > .lieux > .lieu", piste);

  // les blocs des sections « normales » montent quand ils entrent à l'écran
  const vue = new IntersectionObserver(
    (entrees) => entrees.forEach((e) => { if (e.isIntersecting) { e.target.classList.add("vu"); vue.unobserve(e.target); } }),
    { rootMargin: "0px 0px -12% 0px" },
  );
  tous(".entre").forEach((el, i) => { el.style.setProperty("--d", String(i % 4)); vue.observe(el); });

  // ——— mesures
  let W = 0, H = 0, mobile = false, n = 1, hfs = 100, ic = 60, cw = 218, navH = 86, ty = 0.38;
  let hTop = 0, hH = 1, mTop = 0, mH = 1, sTop = 0, pisteW = 0;
  let largeurs: number[] = [], gauches: number[] = [], hauts: number[] = [];
  const estLettre = lettres.map((l) => (l.textContent ?? "").trim() !== "");
  const nbLettres = estLettre.filter(Boolean).length;

  function mesurer() {
    W = window.innerWidth; H = window.innerHeight;
    mobile = W < 820 && W < H * 1.1;
    const u = Math.min(W / 1440, H / 800);
    n = mobile ? Math.min(1, W / 560) : borne(W / 1440, 0.62, 1.25);
    ty = mobile ? 0.41 : 0.38; // la hauteur du titre dans le premier écran
    hfs = mobile ? Math.min(W * 0.145, H * 0.1) : Math.min(W * 0.105, H * 0.18);
    ic = hfs * 0.6;
    const pfs = mobile ? Math.min(W * 0.092, 44) : Math.min(W * 0.045, H * 0.08);
    const sfs = mobile ? Math.min(W * 0.125, 52) : Math.min(W * 0.056, H * 0.105);
    const mfs = mobile ? Math.min(W * 0.16, H * 0.1) : Math.min(W * 0.085, H * 0.17);
    const camw = mobile ? Math.min(W * 0.5, H * 0.3) : Math.min(W * 0.17, H * 0.31);
    cw = mobile ? Math.min(W * 0.3, H * 0.2) : Math.min(W / 1440, H / 780) * 218;
    navH = Math.max(60, 86 * n);
    const s = html.style;
    s.setProperty("--u", u + "px"); s.setProperty("--n", String(n)); s.setProperty("--hfs", hfs + "px"); s.setProperty("--ic", ic + "px");
    s.setProperty("--pfs", pfs + "px"); s.setProperty("--sfs", sfs + "px"); s.setProperty("--mfs", mfs + "px");
    s.setProperty("--camw", camw + "px"); s.setProperty("--cw", String(cw)); s.setProperty("--nav-h", navH + "px");
    s.setProperty("--ty", ty * 100 + "%");
    // la ligne défile à peu près à la vitesse du doigt : sa section est aussi haute que la ligne est longue
    pisteW = piste.scrollWidth;
    manifeste.style.height = Math.round(H + Math.max(0, pisteW - W * 0.9) * 0.5) + "px";
    hTop = histoire.offsetTop; hH = histoire.offsetHeight; mTop = manifeste.offsetTop; mH = manifeste.offsetHeight; sTop = suite.offsetTop;
    hauts = zones.map((z) => z.offsetTop);
    largeurs = lettres.map((l) => l.getBoundingClientRect().width);
    gauches = elements.map((e) => e.offsetLeft);
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
    return [W * 0.5 + ((i % 3) - 1) * cw * 0.08, H * (mobile ? 0.7 : 0.66) + (((i * 7) % 5) - 2) * cw * 0.04, (i % 2 ? 1 : -1) * (4 + i * 1.3), 1, 1];
  }
  function roue(i: number, rot: number): Pose {
    const R = mobile ? W * 1.2 : (900 * W) / 1440;
    const cran = ((((i + rot) % 12) + 12) % 12) - 5.5;
    const a = cran * pas(R);
    const cy = H * (mobile ? 0.8 : 0.84) + R;
    return [W * 0.5 + R * Math.sin(a), cy - R * Math.cos(a), deg(a), 1, Math.abs(deg(a)) < 62 ? 1 : 0];
  }
  const melPose = (a: Pose, b: Pose, t: number): Pose => [mel(a[0], b[0], t), mel(a[1], b[1], t), mel(a[2], b[2], t), mel(a[3], b[3], t), mel(a[4], b[4], t)];
  function cible(i: number, p: number): Pose {
    if (p < 0.004) return eventail(i);
    if (p < 0.085) return melPose(eventail(i), epars(i), eInOut(norme(p, 0.004, 0.085)));
    if (p < 0.21) return epars(i);
    if (p < 0.31) return melPose(epars(i), pile(i), eInOut(norme(p, 0.21, 0.31)));
    if (p < 0.41) return melPose(pile(i), roue(i, 0), eGlisse(norme(p, 0.31, 0.41)));
    return roue(i, -3 * eInOut(norme(p, 0.41, 0.57)));
  }
  const poses: Pose[] = cartes.map(() => [0, 0, 0, 1, 0]);
  const poser = (el: HTMLElement, q: Pose) => {
    el.style.transform = `translate3d(${q[0].toFixed(1)}px,${q[1].toFixed(1)}px,0) rotate(${q[2].toFixed(2)}deg) scale(${q[3].toFixed(3)})`;
    el.style.opacity = q[4].toFixed(3);
  };

  // ——— l'entrée, calée sur le temps
  const VOL: [number, number, number][] = [[0.33, -3, 73], [0.45, 4, 71], [0.6, 13, 65], [0.7, 22, 55], [0.8, 31, 44], [0.87, 32.5, 47.5], [0.93, 26, 48], [1.0, 21.5, 45], [1.07, 22.5, 51.5], [1.15, 27, 52]];
  const LEVER: [number, number][] = [[5, 0.53], [2, 0.6], [0, 0.63], [1, 0.7], [3, 0.8], [4, 0.86]];
  const T_PICTOS = 1.27, T_LETTRES = 1.9, PAS_LETTRE = 0.17, T_FIN = T_LETTRES + lettres.length * PAS_LETTRE;
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
    if (t >= 1.5) montrerTexte(); // le texte et le bouton n'attendent pas la fin du titre
    if (t >= T_FIN + 0.4) { fini = true; avion.style.opacity = "0"; }
  }

  // ——— le défilement
  const fin = window.matchMedia("(pointer: fine)").matches;
  let sy = window.scrollY, cibleY = window.scrollY, dernierWheel = 0, dernier = performance.now();
  window.addEventListener(
    "wheel",
    (e) => {
      if (!fin || e.ctrlKey) return;
      const limite = sTop - H; // au-delà (les sections normales) : le défilement habituel du navigateur
      if (window.scrollY > limite + 1 || (window.scrollY >= limite - 1 && e.deltaY > 0)) return;
      e.preventDefault();
      if (performance.now() - dernierWheel > 250) cibleY = window.scrollY;
      const d = e.deltaMode === 1 ? e.deltaY * 32 : e.deltaY;
      cibleY = borne(cibleY + d * 0.75, 0, html.scrollHeight - H);
      window.scrollTo(0, cibleY);
      dernierWheel = performance.now();
    },
    { passive: false },
  );
  tous("[data-saut]").forEach((a) =>
    a.addEventListener("click", (e) => {
      e.preventDefault();
      window.scrollTo(0, hTop + Number(a.dataset.saut) * (hH - H));
    }),
  );

  let ps = 0, autorise = false, ecranActif = 0;
  function image(maintenant: number) {
    const dt = Math.min(1000, maintenant - dernier); // large : si le navigateur ralentit les images, tout rattrape quand même
    dernier = maintenant;
    const reel = window.scrollY;
    if (fin) { sy += (reel - sy) * (1 - Math.pow(1 - 0.06, dt / 16.67)); if (Math.abs(reel - sy) < 0.4) sy = reel; } else sy = reel;
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
    let posees = true;
    cartes.forEach((el, i) => {
      let c = cible(i, p);
      if (p < 0.004 && entree && i < 6 && t < 1.7) {
        const depart = LEVER.find((l) => l[0] === i)![1];
        const k = norme(t, depart, depart + 0.7);
        c = k <= 0 ? [c[0], H + cw * 1.2, c[2] + 8, 1, 0] : [c[0], mel(H + cw * 1.2, c[1], retour(k)), mel(c[2] + 8, c[2], eOut(k)), 1, 1];
        poses[i] = c;
      } else if (p < 0.004) poses[i] = c;
      else {
        const poids = 0.055 + (i % 4) * 0.008;
        const k = 1 - Math.pow(1 - poids, dt / 16.67);
        const q = poses[i];
        for (let j = 0; j < 5; j++) q[j] += (c[j] - q[j]) * (j === 4 ? Math.min(1, k * 2.2) : k);
        if (Math.abs(c[0] - q[0]) > 3 || Math.abs(c[1] - q[1]) > 3 || Math.abs(c[2] - q[2]) > 1) posees = false;
      }
      poser(el, poses[i]);
    });

    // « Tu as vu la vidéo ? Maintenant, va voir en vrai. »
    const op = p < 0.05 ? 0 : norme(p, 0.05, 0.075);
    processus.style.opacity = op.toFixed(3);
    processus.style.pointerEvents = op > 0.5 && ps < 0.5 ? "auto" : "none";
    processus.style.visibility = op === 0 ? "hidden" : "visible";
    if (p > 0.078) processus.classList.add("vu"); else if (p < 0.05) processus.classList.remove("vu");

    // le panneau de l'appli : il attend que la roue ait fini de tourner et que les cartes soient posées
    if (p >= 0.57 && posees) autorise = true;
    if (p < 0.56) autorise = false;
    const visee = autorise ? norme(p, 0.62, 0.72) : 0;
    ps += (visee - ps) * (1 - Math.pow(1 - 0.09, dt / 16.67));
    if (Math.abs(visee - ps) < 0.0008) ps = visee;
    if (ps > 0.002) {
      const e = eInOut(ps), r = 1 - e;
      const fw = mobile ? 0.42 : 0.17, fh = mobile ? 0.16 : 0.2, dec = mobile ? 0.06 : 0.12;
      const g = (1 - fw) / 2, h = 0.5 - dec - fh / 2, b = 1 - h - fh;
      panneau.style.visibility = "visible";
      panneau.style.clipPath = `inset(${(h * r * 100).toFixed(3)}% ${(g * r * 100).toFixed(3)}% ${(b * r * 100).toFixed(3)}% ${(g * r * 100).toFixed(3)}% round ${(14 * r).toFixed(1)}px)`;
      fond.style.transform = `scale(${(1.18 - 0.18 * e).toFixed(4)})`;
      // les quatre écrans de l'appli se succèdent pendant que le téléphone pivote
      const k = Math.min(ecrans.length - 1, Math.floor(norme(p, 0.735, 0.895) * ecrans.length));
      if (k !== ecranActif) {
        ecranActif = k;
        ecrans.forEach((el, i) => el.classList.toggle("actif", i === k));
        legs.forEach((el, i) => el.classList.toggle("actif", i === k));
      }
      const lacet = mel(-10, 10, norme(p, 0.72, 0.9));
      const houle = Math.sin((maintenant / 1000) * 1.6) * 6 * n;
      const q = Math.pow(norme(p, 0.9, 0.975), 1.6) * norme(ps, 0.9, 1);
      const echelle = (0.5 + 0.5 * e) * (1 + q * q * 28);
      tel.style.transform = `translate(-50%,-50%) perspective(900px) translateY(${houle.toFixed(1)}px) rotateY(${lacet.toFixed(2)}deg) scale(${echelle.toFixed(4)})`;
      noir.style.opacity = norme(q, 0.45, 0.85).toFixed(3);
      const mots = (1 - norme(q, 0, 0.25)).toFixed(3); // les mots s'effacent quand on plonge dans l'écran
      motsHG.style.opacity = mots;
      legendes.style.opacity = mots;
      const plein = ps > 0.985;
      if (plein) motsHG.classList.add("vu"); else if (ps < 0.6) motsHG.classList.remove("vu");
      legendes.classList.toggle("vu", plein);
    } else {
      panneau.style.visibility = "hidden";
      noir.style.opacity = "0";
    }

    // la navigation prend la couleur de la partie qu'elle survole
    let z = 0;
    for (let i = 0; i < zones.length; i++) if (sy + navH * 0.5 >= hauts[i]) z = i;
    const zone = zones[z];
    document.body.classList.toggle("nav-sombre", zone.classList.contains("sombre") || (zone === histoire && p > 0.985));
    document.body.classList.toggle("nav-fond", zone !== histoire && zone !== manifeste);
    const ici = zone === histoire ? (p >= 0.62 ? "#appli" : p > 0.05 ? "#guide" : "") : zone === manifeste ? "#lieux" : zone.id === "offres" || zone.id === "questions" ? "#offres" : "";
    liens.forEach((a) => (a.getAttribute("href") === ici ? a.setAttribute("aria-current", "true") : a.removeAttribute("aria-current")));

    // la ligne qui défile de côté
    if (sy > mTop - H * 1.2 && sy < mTop + mH) {
      const mp = borne((sy - mTop) / (mH - H));
      const x = mel(W * (mobile ? 0.08 : 0.06), -(pisteW - W * 0.9), mp);
      piste.style.transform = `translate3d(${x.toFixed(1)}px,-50%,0)`;
      if (sy > mTop - H * 0.2) {
        const seuil = W * (mobile ? 0.92 : 0.86);
        elements.forEach((el, i) => {
          if (!el.classList.contains("vu") && gauches[i] + x < seuil) {
            el.classList.add("vu");
            tous(".auto", el).forEach((a) => a.classList.add("vu"));
          }
        });
      }
    }
    requestAnimationFrame(image);
  }

  function lancer() {
    mesurer();
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
  window.addEventListener("load", () => mesurer()); // les images chargées, la ligne a sa vraie longueur
  // les lettres se mesurent avec la bonne police : on attend qu'elle soit là (1,2 s au plus)
  Promise.race([document.fonts.ready, new Promise((r) => setTimeout(r, 1200))]).then(lancer);
}
