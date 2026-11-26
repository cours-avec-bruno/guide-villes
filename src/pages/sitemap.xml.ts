// Le plan du site, pour les moteurs de recherche.
import type { APIRoute } from "astro";
import { VILLES } from "../data/villes";

export const GET: APIRoute = ({ site }) => {
  const base = import.meta.env.BASE_URL.replace(/\/$/, "");
  const pages = ["/", ...VILLES.map((v) => `/guides/${v.id}/`)].map((p) => `  <url><loc>${new URL(base + p, site).href}</loc></url>`);
  return new Response(`<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${pages.join("\n")}\n</urlset>\n`, {
    headers: { "Content-Type": "application/xml; charset=utf-8" },
  });
};
