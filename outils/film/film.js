// Le film de présentation : rendu(t) pose toute la scène pour l'instant t (en secondes). Rien ne dépend de l'horloge
// du navigateur, donc la vidéo se fabrique image par image (outils/film-rendu.mjs).
// Règles de la série : jamais d'image fixe (le fond respire, le téléphone flotte, chaque plan avance), jamais de coupe
// (les plans glissent l'un sur l'autre), et la fin se raccorde au début pour que la vidéo tourne en boucle.
(function () {
  const M = window.MINUTAGE, D = M.duree, P = M.phrases;
  const un = (s) => document.querySelector(s), tous = (s) => [...document.querySelectorAll(s)];
  const borne = (x) => Math.min(1, Math.max(0, x));
  const norme = (x, a, b) => borne((x - a) / (b - a));
  const mel = (a, b, k) => a + (b - a) * k;
  const sortie = (x) => 1 - Math.pow(1 - x, 3);
  const douce = (x) => (x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2);
  const rebond = (x, s = 1.7) => 1 + (s + 1) * Math.pow(x - 1, 3) + s * Math.pow(x - 1, 2);
  const TOUR = (2 * Math.PI) / D; // un tour sur la durée du film : tout ce qui oscille se raccorde à la boucle

  // les nombres de la ville (lieux, vidéos, adresses) viennent de l'adresse
  const donnees = new URLSearchParams(location.hash.slice(1));
  tous("[data-n]").forEach((b) => { const v = donnees.get(b.dataset.n); if (v) b.textContent = v; });

  // ——— les sous-titres : un bloc par phrase, un carton par ligne, un élément par mot
  const textes = un("#textes");
  const blocs = P.map((p, i) => {
    const el = document.createElement("p");
    el.className = "bloc";
    el.style.margin = "0";
    const mots = [];
    M.cartes.filter((c) => c.phrase === i).forEach((c) => {
      const ligne = document.createElement("span");
      ligne.className = "carton" + (c.gris ? " gris" : "");
      c.mots.forEach((m) => {
        const s = document.createElement("span");
        s.className = "mot";
        s.textContent = m.m;
        ligne.appendChild(s);
        mots.push({ el: s, t: m.t });
      });
      el.appendChild(ligne);
    });
    textes.appendChild(el);
    return { el, mots, de: p.de, fin: i + 1 < P.length ? P[i + 1].de : D - 0.45 };
  });
  // une ligne trop longue fait diminuer les lettres de son bloc
  function ajuster() {
    const place = textes.clientWidth;
    blocs.forEach((b) => {
      b.el.style.fontSize = "";
      const large = Math.max(...[...b.el.children].map((l) => l.scrollWidth));
      if (large > place) b.el.style.fontSize = Math.floor((100 * place) / large) + "px";
    });
  }

  // ——— les plans : les écrans de l'appli. « de » : l'entrée (par le bas), « point » : ce que le plan regarde,
  // « zoom » : du début à la fin, « glisse » : entre ces deux moments l'image descend pour montrer son haut
  const ENT = 0.7;
  const plans = tous(".plan");
  const DEF = [
    { de: -ENT, a: P[2].de - 0.1, point: "50% 26%", zoom: [1.05, 1.18] }, // le parcours (il revient à la fin : la boucle)
    { de: P[2].de - 0.1, a: P[3].de - 0.1, point: "50% 30%", zoom: [1.0, 1.08] }, // la fiche d'un arrêt et sa vidéo
    { de: P[3].de - 0.1, a: P[4].de - 0.1, point: "50% 42%", zoom: [1.03, 1.14] }, // la carte et les adresses
    { de: P[4].de - 0.1, a: D, point: "50% 50%", zoom: [1.24, 1.31], glisse: [P[5].de - 0.2, P[5].de + 1.3] }, // le carnet, puis sa carte
  ];
  plans.forEach((p, i) => (p.style.transformOrigin = DEF[i].point));

  // ——— les autocollants : « phrase.carton+délai » dit quand ils se posent, data-fin la phrase où ils partent
  const colles = tous(".colle").map((el, i) => {
    const [pc, delai] = el.dataset.quand.split("+");
    const [p, c] = pc.split(".").map(Number);
    const de = M.cartes.filter((x) => x.phrase === p)[c].de + Number(delai);
    const fin = el.dataset.fin ? P[Number(el.dataset.fin)].de - 0.2 : D - 1.0;
    return { el, de, fin, r: parseFloat(el.style.getPropertyValue("--r")) || 0, i };
  });

  const fond = un("#fond"), tel = un("#tel");

  window.DUREE = D;
  window.preparer = async () => {
    await document.fonts.ready;
    await Promise.all(tous("img").map((i) => i.decode().catch(() => {})));
    ajuster();
  };
  window.rendu = (t) => {
    // le fond respire : un petit cercle et un souffle de zoom, sans jamais s'arrêter
    fond.style.transform = `translate(${(18 * Math.cos(2 * TOUR * t)).toFixed(2)}px,${(18 * Math.sin(2 * TOUR * t)).toFixed(2)}px) scale(${(1.1 + 0.03 * Math.sin(TOUR * t)).toFixed(4)})`;

    // le téléphone flotte et pivote
    tel.style.transform = `translateY(${(14 * Math.sin(3 * TOUR * t)).toFixed(2)}px) rotateY(${(8 * Math.sin(2 * TOUR * t)).toFixed(3)}deg) rotateX(${(2.2 * Math.sin(TOUR * t + 1)).toFixed(3)}deg)`;

    // les plans glissent l'un sur l'autre
    plans.forEach((p, i) => {
      const d = DEF[i];
      const retourne = i === 0 && t >= D - ENT; // le premier plan revient par-dessus le dernier, pour la boucle
      const tt = retourne ? t - D : t; // son temps à lui
      const suivant = DEF[i + 1];
      const la = retourne || (tt >= d.de && (suivant ? t < suivant.de + ENT : true));
      p.style.visibility = la ? "visible" : "hidden";
      if (!la) return;
      const e = sortie(norme(tt, d.de, d.de + ENT));
      const z = mel(d.zoom[0], d.zoom[1], norme(tt, d.de, d.a + ENT));
      const marge = ((z - 1) / 2) * 100 * 0.92; // un plan zoomé peut glisser d'autant sans montrer son bord
      const y = d.glisse ? marge * (2 * douce(norme(t, d.glisse[0], d.glisse[1])) - 1) : 0;
      p.style.zIndex = String(retourne ? 10 : i);
      p.style.transform = `translate3d(0,${((1 - e) * 100 + y).toFixed(3)}%,0) scale(${z.toFixed(5)})`;
    });

    // les sous-titres : chaque mot monte quand la voix le dit ; le bloc s'en va quand la phrase suivante commence
    blocs.forEach((b) => {
      const la = t >= b.de - 0.15 && t < b.fin + 0.14;
      b.el.style.visibility = la ? "visible" : "hidden";
      if (!la) return;
      const part = norme(t, b.fin - 0.1, b.fin + 0.14);
      const vie = norme(t, b.de, b.fin);
      b.el.style.opacity = (1 - part).toFixed(3);
      b.el.style.transform = `translateY(${(-8 * vie - 34 * douce(part)).toFixed(2)}px) scale(${(1 + 0.02 * vie).toFixed(4)})`;
      b.mots.forEach((m) => {
        const k = norme(t, m.t - 0.05, m.t + 0.17);
        m.el.style.opacity = k.toFixed(3);
        m.el.style.transform = `translateY(${((1 - sortie(k)) * 0.34).toFixed(4)}em) rotate(${((1 - sortie(k)) * 5).toFixed(2)}deg)`;
      });
    });

    // les autocollants : ils se posent avec un rebond, bougent un peu tant qu'ils sont là, puis se retirent
    colles.forEach((c) => {
      const la = t >= c.de && t < c.fin + 0.3;
      c.el.style.visibility = la ? "visible" : "hidden";
      if (!la) return;
      const k = norme(t, c.de, c.de + 0.45);
      const taille = Math.max(0, rebond(k)) * (1 - douce(norme(t, c.fin, c.fin + 0.3)));
      const angle = mel(-18, c.r, sortie(k)) + 1.8 * Math.sin(4 * TOUR * t + c.i);
      c.el.style.transform = `translateY(${(7 * Math.sin(3 * TOUR * t + c.i * 1.7)).toFixed(2)}px) rotate(${angle.toFixed(2)}deg) scale(${taille.toFixed(4)})`;
    });
  };
})();
