// Le nom de la marque est PROVISOIRE : il se change ici, à un seul endroit.
export const MARQUE = "Dédale";
export const PRIX_GUIDE = "17,90 €"; // prix d'un guide complet
// Le lien de paiement de chaque guide (un lien de paiement Stripe, par exemple). Vide : le bouton d'achat dit que le
// paiement n'est pas encore ouvert. Après paiement, le prestataire doit renvoyer vers /<ville>/visite/?cle=<clé d'achat>.
export const LIENS_PAIEMENT: Record<string, string> = { lyon: "" };
export const INSTAGRAM = "https://www.instagram.com/geopolitik13/";
// Vues de la série « Ce que tu ne sais pas sur… » (Instagram + TikTok), relevées le 23.11.2026 : 1,83 million.
export const PREUVE = "plus de 1,8 million de vues";
