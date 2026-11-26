// Les réglages de la marque et de la vente, à un seul endroit.
export const MARQUE = "Dédale"; // nom PROVISOIRE
export const PRIX_COMPLET = "17,90 €"; // prix du guide complet
export const PRIX_COMPLET_NOMBRE = "17.90"; // le même, pour les moteurs de recherche

// Le lien de paiement du guide complet de Lyon (un « Payment Link » Stripe, Lemon Squeezy…). Vide : le bouton d'achat
// affiche « Paiement bientôt ouvert ». Après le paiement, faire revenir l'acheteur sur
// <adresse du site>/lyon/?code=<le code du guide complet> : le guide s'ouvre en version complète (voir outils/code.mjs).
export const LIEN_PAIEMENT = "";

// La vidéo à commenter pour recevoir le code du guide gratuit (mettre l'adresse exacte du Reel de Lyon).
export const LIEN_VIDEO = "https://www.instagram.com/geopolitik13/";
export const INSTAGRAM = "https://www.instagram.com/geopolitik13/";
// Vues de la série « Ce que tu ne sais pas sur… » (Instagram + TikTok), relevées le 23.11.2026 : 1,83 million.
export const PREUVE = "plus de 1,8 million de vues";
