// L'accès au guide : « gratuit » (une balade, sans photos) ou « complet » (toutes les balades, le sur-mesure, les photos).
// On l'ouvre avec un code : celui du guide gratuit arrive par e-mail après un commentaire sous la vidéo, celui du guide
// complet après l'achat. Le site est statique : seules les empreintes des codes sont publiées (src/data/codes.json,
// à changer avec outils/code.mjs) et l'accès obtenu reste sur le téléphone.
import codes from "../data/codes.json";

export type Niveau = "gratuit" | "complet";
const TABLE = codes as Record<string, Record<Niveau, string[]>>;
const cle = (ville: string) => `guide-villes:${ville}:acces`;

export function lireAcces(ville: string): Niveau | null {
  try {
    const n = localStorage.getItem(cle(ville));
    return n === "gratuit" || n === "complet" ? n : null;
  } catch {
    return null;
  }
}
export function ecrireAcces(ville: string, n: Niveau) {
  try {
    // on ne redescend jamais : un code gratuit entré après l'achat ne retire pas le guide complet
    if (lireAcces(ville) !== "complet") localStorage.setItem(cle(ville), n);
  } catch {
    /* navigation privée : l'accès vaut pour cette visite seulement */
  }
}

/** Les majuscules, espaces, tirets et accents ne comptent pas (même règle que outils/code.mjs). */
export const normaliser = (c: string) => c.normalize("NFD").replace(/[̀-ͯ]/g, "").toUpperCase().replace(/[^A-Z0-9]/g, "");

/** Le niveau qu'ouvre ce code pour cette ville, ou null. */
export function verifier(ville: string, code: string): Niveau | null {
  const n = normaliser(code);
  if (n.length < 4) return null;
  const e = sha256(`dedale:${ville}:${n}`);
  const t = TABLE[ville];
  if (!t) return null;
  if (t.complet.includes(e)) return "complet";
  if (t.gratuit.includes(e)) return "gratuit";
  return null;
}

/** SHA-256 en hexadécimal, sans dépendre de crypto.subtle (absent hors https). */
function sha256(texte: string): string {
  const K = [
    0x428a2f98, 0x71374491, 0xb5c0fbcf, 0xe9b5dba5, 0x3956c25b, 0x59f111f1, 0x923f82a4, 0xab1c5ed5, 0xd807aa98, 0x12835b01, 0x243185be, 0x550c7dc3,
    0x72be5d74, 0x80deb1fe, 0x9bdc06a7, 0xc19bf174, 0xe49b69c1, 0xefbe4786, 0x0fc19dc6, 0x240ca1cc, 0x2de92c6f, 0x4a7484aa, 0x5cb0a9dc, 0x76f988da,
    0x983e5152, 0xa831c66d, 0xb00327c8, 0xbf597fc7, 0xc6e00bf3, 0xd5a79147, 0x06ca6351, 0x14292967, 0x27b70a85, 0x2e1b2138, 0x4d2c6dfc, 0x53380d13,
    0x650a7354, 0x766a0abb, 0x81c2c92e, 0x92722c85, 0xa2bfe8a1, 0xa81a664b, 0xc24b8b70, 0xc76c51a3, 0xd192e819, 0xd6990624, 0xf40e3585, 0x106aa070,
    0x19a4c116, 0x1e376c08, 0x2748774c, 0x34b0bcb5, 0x391c0cb3, 0x4ed8aa4a, 0x5b9cca4f, 0x682e6ff3, 0x748f82ee, 0x78a5636f, 0x84c87814, 0x8cc70208,
    0x90befffa, 0xa4506ceb, 0xbef9a3f7, 0xc67178f2,
  ];
  const octets = new TextEncoder().encode(texte);
  const l = octets.length;
  const taille = Math.ceil((l + 9) / 64) * 64;
  const m = new Uint8Array(taille);
  m.set(octets);
  m[l] = 0x80;
  const bits = l * 8;
  const v = new DataView(m.buffer);
  v.setUint32(taille - 8, Math.floor(bits / 0x100000000));
  v.setUint32(taille - 4, bits >>> 0);
  const H = [0x6a09e667, 0xbb67ae85, 0x3c6ef372, 0xa54ff53a, 0x510e527f, 0x9b05688c, 0x1f83d9ab, 0x5be0cd19];
  const W = new Uint32Array(64);
  const rot = (x: number, n: number) => (x >>> n) | (x << (32 - n));
  for (let o = 0; o < taille; o += 64) {
    for (let i = 0; i < 16; i++) W[i] = v.getUint32(o + i * 4);
    for (let i = 16; i < 64; i++) {
      const s0 = rot(W[i - 15], 7) ^ rot(W[i - 15], 18) ^ (W[i - 15] >>> 3);
      const s1 = rot(W[i - 2], 17) ^ rot(W[i - 2], 19) ^ (W[i - 2] >>> 10);
      W[i] = (W[i - 16] + s0 + W[i - 7] + s1) >>> 0;
    }
    let [a, b, c, d, e, f, g, h] = H;
    for (let i = 0; i < 64; i++) {
      const t1 = (h + (rot(e, 6) ^ rot(e, 11) ^ rot(e, 25)) + ((e & f) ^ (~e & g)) + K[i] + W[i]) >>> 0;
      const t2 = ((rot(a, 2) ^ rot(a, 13) ^ rot(a, 22)) + ((a & b) ^ (a & c) ^ (b & c))) >>> 0;
      h = g; g = f; f = e; e = (d + t1) >>> 0; d = c; c = b; b = a; a = (t1 + t2) >>> 0;
    }
    H[0] = (H[0] + a) >>> 0; H[1] = (H[1] + b) >>> 0; H[2] = (H[2] + c) >>> 0; H[3] = (H[3] + d) >>> 0;
    H[4] = (H[4] + e) >>> 0; H[5] = (H[5] + f) >>> 0; H[6] = (H[6] + g) >>> 0; H[7] = (H[7] + h) >>> 0;
  }
  return H.map((x) => x.toString(16).padStart(8, "0")).join("");
}
