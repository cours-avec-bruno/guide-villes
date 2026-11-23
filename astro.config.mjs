import { defineConfig } from "astro/config";
import react from "@astrojs/react";

// Site statique : la page de vente (/) et l'appli de visite (/lyon/).
export default defineConfig({
  integrations: [react()],
  server: { port: 4321, host: "127.0.0.1" },
  devToolbar: { enabled: false },
  build: { inlineStylesheets: "auto" },
});
