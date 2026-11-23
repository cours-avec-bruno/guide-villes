import { defineConfig } from "astro/config";
import react from "@astrojs/react";

// Site statique : la page de vente (/) et l'appli de visite (/lyon/).
// BASE_PATH : le dossier où le site est servi (« /guide-villes » sur GitHub Pages ; rien en local ou sur son propre domaine).
export default defineConfig({
  site: process.env.SITE_URL || "https://cours-avec-bruno.github.io",
  base: process.env.BASE_PATH || "/",
  integrations: [react()],
  server: { port: 4321, host: "127.0.0.1" },
  devToolbar: { enabled: false },
  build: { inlineStylesheets: "auto" },
});
