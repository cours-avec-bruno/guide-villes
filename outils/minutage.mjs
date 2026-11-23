// Lit le minutage des voix des épisodes de Lyon (mots.ts du projet vidéo) et l'affiche unité par unité.
// Usage : node outils/minutage.mjs [slug…]
import fs from "node:fs";
import path from "node:path";
import os from "node:os";

const RACINE = path.join(os.homedir(), "Desktop", "Géopolitik", "remotion", "src", "dossiers");
const slugs = process.argv.slice(2).length ? process.argv.slice(2) : ["curiosites-lyon", "curiosites-lyon-2", "sous-lyon", "tete-d-or"];

export function lire(slug) {
  const src = fs.readFileSync(path.join(RACINE, slug, "mots.ts"), "utf8");
  const prendre = (nom) => {
    const m = src.match(new RegExp(`export const ${nom}[^=]*= (\\{.*?\\});`, "s"));
    if (!m) throw new Error(`${slug} : ${nom} introuvable`);
    return JSON.parse(m[1]);
  };
  return { M: prendre("M"), AT: prendre("UNIT_AT"), END: prendre("UNIT_END") };
}

if (process.argv[1] && process.argv[1].endsWith("minutage.mjs")) {
  for (const slug of slugs) {
    const { M, AT, END } = lire(slug);
    console.log(`\n=== ${slug}`);
    for (const u of Object.keys(M)) {
      const mots = M[u];
      console.log(`u${u}  ${AT[u]} → ${END[u]}  (${(AT[u] / 30).toFixed(2)} s → ${(END[u] / 30).toFixed(2)} s)`);
      console.log("   " + mots.map(([m, f]) => `${m}@${f}`).join(" "));
    }
  }
}
