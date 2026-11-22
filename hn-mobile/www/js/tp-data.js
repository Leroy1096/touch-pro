/* ==========================================================================
   TOUCH PRO — Données de présentation (affichées si la base est vide/hors-ligne)
   Dès que l'admin ajoute de vrais contenus, ils remplacent automatiquement ceux-ci.
   ========================================================================== */

export const PRODUITS_DEMO = [
  { id: "d1", departement: "access", nom: "Coque premium iPhone / Samsung", prix: 3500, prix_promo: 2500, stock: 24, image_url: "images/tp/dept-access.jpg", description: "Protection renforcée, plusieurs coloris." },
  { id: "d2", departement: "access", nom: "Écouteurs Bluetooth", prix: 8000, prix_promo: null, stock: 15, image_url: "images/tp/dept-access.jpg", description: "Son clair, boîtier de charge." },
  { id: "d3", departement: "access", nom: "Chargeur rapide 25W", prix: 5000, prix_promo: null, stock: 20, image_url: "images/tp/dept-access.jpg", description: "Charge ultra-rapide, câble inclus." },
  { id: "d4", departement: "access", nom: "Montre connectée", prix: 15000, prix_promo: 12500, stock: 8, image_url: "images/tp/dept-access.jpg", description: "Appels, sport, notifications." },
  { id: "d5", departement: "fashion", nom: "T-shirt TOUCH PRO", prix: 6000, prix_promo: null, stock: 30, tailles: "S,M,L,XL", image_url: "images/tp/dept-fashion.jpg", description: "Coton premium, logo brodé." },
  { id: "d6", departement: "fashion", nom: "Ensemble tendance homme", prix: 18000, prix_promo: null, stock: 10, tailles: "M,L,XL", image_url: "images/tp/dept-fashion.jpg", description: "Look complet, qualité supérieure." },
  { id: "d7", departement: "fashion", nom: "Sac à main élégant", prix: 12000, prix_promo: 9900, stock: 6, image_url: "images/tp/dept-fashion.jpg", description: "Cuir synthétique haut de gamme." },
  { id: "d8", departement: "tech", nom: "Protection d'écran trempée", prix: 1500, prix_promo: null, stock: 50, image_url: "images/tp/dept-tech.jpg", description: "Pose offerte en boutique." },
];

export const PROMOS_DEMO = [
  { titre: "−20% sur les coques premium", description: "Cette semaine seulement, sur tout le rayon accessoires.", image_url: "images/tp/dept-access.jpg" },
  { titre: "Diagnostic téléphone GRATUIT", description: "Pour toute réparation confiée à TOUCH PRO TECH.", image_url: "images/tp/dept-tech.jpg" },
  { titre: "Coiffure + soin = −1 000 F", description: "Le duo beauté du mois au département BEAUTY.", image_url: "images/salon.jpg" },
];

export const ACTUS_DEMO = [
  { titre: "Bienvenue chez TOUCH PRO 🎉", texte: "Votre nouvel univers multiservices ouvre ses portes à Oupoyo : beauté, tech, fashion, accessoires et création digitale — tout au même endroit !", media_url: "images/tp/hero-tp.jpg", media_type: "image", categorie: "Actualités de l'entreprise", date_publication: new Date().toISOString() },
  { titre: "Nouveau : réparation express", texte: "Écran cassé ? Diagnostic gratuit et réparation express chez TOUCH PRO TECH, toutes marques.", media_url: "images/tp/dept-tech.jpg", media_type: "image", categorie: "Réparation de téléphones", date_publication: new Date().toISOString() },
  { titre: "Shooting photo en boutique", texte: "TOUCH PRO DIGITAL réalise vos portraits et visuels produits directement en boutique. Réservez votre séance !", media_url: "images/tp/dept-digital.jpg", media_type: "image", categorie: "Création digitale", date_publication: new Date().toISOString() },
];

export const AVIS_DEMO = [
  { nom: "Awa K.", message: "Service impeccable et accueil chaleureux. Ma coiffure était parfaite !", note: 5 },
  { nom: "Yann D.", message: "Mon téléphone réparé en 1 heure, écran comme neuf. Je recommande TOUCH PRO TECH.", note: 5 },
  { nom: "Fatou S.", message: "J'ai trouvé ma tenue et mes accessoires au même endroit. Concept génial !", note: 5 },
];

export const SERVICES_DEMO = [
  { nom: "Coupe femme", prix_min: 2000, prix_max: 5000 },
  { nom: "Coupe homme / barber", prix_min: 500, prix_max: 1500 },
  { nom: "Tresses & vanilles", prix_min: 3000, prix_max: 8000 },
  { nom: "Coloration", prix_min: 5000, prix_max: 12000 },
  { nom: "Soin capillaire complet", prix_min: 2500, prix_max: 6000 },
  { nom: "Mise en beauté événement", prix_min: 8000, prix_max: 20000 },
];
