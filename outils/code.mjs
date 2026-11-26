// Change le code d'accès d'un guide. Le code lui-même n'est jamais écrit dans le dépôt (il est public) :
// seule son empreinte (SHA-256) va dans src/data/codes.json.
//   node outils/code.mjs lyon gratuit LYON-ABCD           remplace le code du guide gratuit
//   node outils/code.mjs lyon complet LYON-WXYZ-1234      remplace le code du guide complet
//   node outils/code.mjs lyon gratuit LYON-EFGH --ajouter garde les anciens codes et ajoute celui-ci
// Ceux qui ont déjà ouvert le guide gardent leur accès. Les majuscules, espaces, tirets et accents ne comptent pas.
import { createHash } from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const fichier = path.join(path.dirname(fileURLToPath(import.meta.url)), "..", "src", "data", "codes.json");
const [ville, niveau, code, option] = process.argv.slice(2);
if (!ville || !["gratuit", "complet"].includes(niveau) || !code) {
  console.error("Usage : node outils/code.mjs <ville> <gratuit|complet> <CODE> [--ajouter]");
  process.exit(1);
}
// la même règle que src/app/acces.ts
const normaliser = (c) => c.normalize("NFD").replace(/[̀-ͯ]/g, "").toUpperCase().replace(/[^A-Z0-9]/g, "");
const empreinte = createHash("sha256").update(`dedale:${ville}:${normaliser(code)}`).digest("hex");

const codes = fs.existsSync(fichier) ? JSON.parse(fs.readFileSync(fichier, "utf8")) : {};
codes[ville] ??= { gratuit: [], complet: [] };
codes[ville][niveau] = option === "--ajouter" ? [...new Set([...codes[ville][niveau], empreinte])] : [empreinte];
fs.writeFileSync(fichier, JSON.stringify(codes, null, 2) + "\n");
console.log(`${ville}, guide ${niveau} : ${codes[ville][niveau].length} code(s) valable(s). Pense à envoyer le site en ligne.`);
