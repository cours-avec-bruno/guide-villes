// Copie MapLibre dans public/vendor/maplibre : la version 6 charge son « worker » à côté de son propre fichier,
// on le sert donc tel quel au lieu de le faire passer par le bundler.
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
const racine = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const src = path.join(racine, "node_modules", "maplibre-gl", "dist");
const dst = path.join(racine, "public", "vendor", "maplibre");
fs.mkdirSync(dst, { recursive: true });
for (const f of ["maplibre-gl.mjs", "maplibre-gl-worker.mjs", "maplibre-gl-shared.mjs", "maplibre-gl.css"]) fs.copyFileSync(path.join(src, f), path.join(dst, f));
console.log("MapLibre copié dans public/vendor/maplibre");
