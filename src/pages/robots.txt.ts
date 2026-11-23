// Les consignes aux moteurs de recherche (lues seulement si le site est à la racine d'un nom de domaine).
import type { APIRoute } from "astro";

export const GET: APIRoute = ({ site }) => {
  const base = import.meta.env.BASE_URL.replace(/\/$/, "");
  return new Response(`User-agent: *\nAllow: /\nSitemap: ${new URL(base + "/sitemap.xml", site).href}\n`, { headers: { "Content-Type": "text/plain; charset=utf-8" } });
};
