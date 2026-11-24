/* ==========================================================================
   TOUCH PRO — Données de présentation (affichées si la base est vide/hors-ligne)
   Dès que l'admin ajoute de vrais contenus, ils remplacent automatiquement ceux-ci.
   ========================================================================== */

export const PRODUITS_DEMO = [
  /* ---------- ACCESS / TECH ---------- */
  { id: "d1", categorie: "accessoires", nom: "Écouteurs sans fil Pro ANC", prix: 32000, prix_promo: 24900, stock: 14, ventes: 1300, note: 4.8, badge: "★ Best-seller", flash: true,
    image_url: "images/tp/prod-ecouteurs.jpg",
    description: "Réduction de bruit active, 30 h d'autonomie, boîtier de charge.",
    points: ["Réduction de bruit active", "30 h d'autonomie totale", "Bluetooth 5.3 stable", "Garantie boutique 3 mois"] },
  { id: "d2", categorie: "accessoires", nom: "Montre Connectée Sport+", prix: 39000, prix_promo: 29900, stock: 9, ventes: 1100, note: 4.7, badge: "Nouveau", flash: true,
    image_url: "images/tp/prod-montre.jpg",
    description: "Appels, sport, notifications, étanche IP68.",
    points: ["Appels & notifications", "Suivi sport et sommeil", "Étanche IP68", "Bracelet ajustable offert"] },
  { id: "d3", categorie: "accessoires", nom: "Coque premium iPhone / Samsung", prix: 3500, prix_promo: 2500, stock: 24, ventes: 850, note: 4.6,
    image_url: "images/tp/prod-coque.jpg",
    description: "Protection renforcée, plusieurs coloris.",
    points: ["Coins renforcés anti-choc", "Finition mate premium", "Tous modèles iPhone & Samsung"] },
  { id: "d4", categorie: "accessoires", nom: "Batterie externe 20 000 mAh", prix: 18500, prix_promo: 15000, stock: 11, ventes: 900, note: 4.7, flash: true,
    image_url: "images/tp/dept-access.jpg",
    description: "Charge rapide 22,5 W — 4 recharges complètes.",
    points: ["20 000 mAh réels", "Charge rapide 22,5 W", "2 ports USB + USB-C"] },
  { id: "d5", categorie: "accessoires", nom: "Chargeur rapide 25W + câble", prix: 5000, prix_promo: null, stock: 20, ventes: 620, note: 4.5,
    image_url: "images/tp/dept-access.jpg",
    description: "Charge ultra-rapide, câble USB-C inclus.",
    points: ["25 W de puissance", "Câble USB-C 1 m inclus", "Protection surchauffe"] },
  { id: "d6", categorie: "accessoires", nom: "Protection d'écran trempée", prix: 1500, prix_promo: null, stock: 50, ventes: 2100, note: 4.9, badge: "★ Best-seller",
    image_url: "images/tp/dept-tech.jpg",
    description: "Pose offerte en boutique.",
    points: ["Verre trempé 9H", "Pose offerte en boutique", "Tous modèles disponibles"] },

  /* ---------- FASHION ---------- */
  { id: "d7", categorie: "chaussures", nom: "Sneakers Montantes Noir & Or", prix: 45000, prix_promo: 34900, stock: 7, ventes: 950, note: 4.8, badge: "Édition limitée", flash: true,
    image_url: "images/tp/prod-sneakers.jpg",
    description: "Édition limitée noir & or, cuir premium.", tailles: "40,41,42,43,44,45",
    points: ["Cuir premium", "Semelle confort+", "Édition limitée numérotée"] },
  { id: "d8", categorie: "femme", nom: "Robe Longue Wax « Soleil »", prix: 19900, prix_promo: null, stock: 12, ventes: 480, note: 4.9, badge: "Nouveau",
    image_url: "images/tp/prod-robe.jpg", tailles: "S,M,L,XL",
    description: "Wax authentique, coupe élégante.",
    points: ["Tissu wax 100 % coton", "Coupe longue élégante", "Fabriquée en Côte d'Ivoire"] },
  { id: "d9", categorie: "homme", nom: "T-shirt Oversize Blanc Premium", prix: 9500, prix_promo: 7500, stock: 30, ventes: 720, note: 4.6, flash: true,
    image_url: "images/tp/prod-tshirt.jpg", tailles: "S,M,L,XL,XXL",
    description: "Coton lourd 240 g/m², coupe oversize.",
    points: ["Coton épais 240 g/m²", "Coupe oversize tendance", "Logo brodé discret"] },
  { id: "d10", categorie: "homme", nom: "T-shirt TOUCH PRO", prix: 6000, prix_promo: null, stock: 30, ventes: 350, note: 4.5,
    image_url: "images/tp/dept-fashion.jpg", tailles: "S,M,L,XL",
    description: "Coton premium, logo brodé.",
    points: ["Coton premium", "Logo TOUCH PRO brodé", "Noir ou blanc"] },
  { id: "d11", categorie: "homme", nom: "Ensemble tendance homme", prix: 18000, prix_promo: null, stock: 10, ventes: 290, note: 4.4,
    image_url: "images/tp/dept-fashion.jpg", tailles: "M,L,XL",
    description: "Look complet, qualité supérieure.",
    points: ["Haut + bas assortis", "Tissu respirant", "Coupe moderne"] },
  { id: "d12", categorie: "sacs", nom: "Sac à main élégant", prix: 12000, prix_promo: 9900, stock: 6, ventes: 410, note: 4.7, badge: "★ Best-seller",
    image_url: "images/tp/dept-fashion.jpg",
    description: "Cuir synthétique haut de gamme.",
    points: ["Cuir synthétique premium", "Bandoulière ajustable", "Plusieurs coloris"] },
];

export const COUPONS = [
  { code: "BIENVENUE", type: "fixe", montant: 2000, min: 15000, titre: "-2 000 F", sous: "Nouveaux clients", cond: "dès 15 000 FCFA d'achat" },
  { code: "TOUCH10", type: "pct", taux: 0.10, min: 0, titre: "-10 %", sous: "Tout le monde", cond: "sur toute la commande" },
];

/* Livraison offerte à partir de ce montant */
export const LIVRAISON_OFFERTE = 50000;

export const PROMOS_DEMO = [
  { titre: "−20% sur les coques premium", description: "Cette semaine seulement, sur tout le rayon accessoires.", image_url: "images/tp/prod-coque.jpg" },
  { titre: "Diagnostic téléphone GRATUIT", description: "Pour toute réparation confiée à TOUCH PRO TECH.", image_url: "images/tp/dept-tech.jpg" },
  { titre: "Coiffure + soin = −1 000 F", description: "Le duo beauté du mois au département BEAUTY.", image_url: "images/salon.jpg" },
];

/* Publications de démonstration du fil d'actualité — affichées immédiatement,
   remplacées par les vraies publications dès que la base répond. */
const il_y_a = (j) => new Date(Date.now() - j * 864e5).toISOString();
export const ACTUS_DEMO = [
  { titre: "Bienvenue chez TOUCH PRO 🎉", texte: "Votre univers multiservices vous accueille à Oupoyo : beauté, tech, digital et boutique — tout au même endroit ! Passez nous voir derrière le marché, Carrefour Boutique de Malick.", media_url: "images/tp/hero-tp.jpg", media_type: "image", categorie: "Actualités de l'entreprise", date_publication: il_y_a(0) },
  { titre: "🔥 Samedi BEAUTY : -20 % coiffure femme", texte: "Ce samedi uniquement : -20 % sur toutes les coiffures femme (tresses, tissages, brushing). Places limitées — réservez vite sur WhatsApp !", media_url: "images/tp/poster-beauty.jpg", media_type: "image", categorie: "Promotions et offres spéciales", date_publication: il_y_a(1) },
  { titre: "Réparation express : écran changé en 1 h", texte: "Écran cassé ? Diagnostic gratuit et réparation express chez TOUCH PRO TECH, toutes marques. Pièces de qualité et garantie incluse.", media_url: "images/tp/dept-tech.jpg", media_type: "image", categorie: "Réparation de téléphones", date_publication: il_y_a(2) },
  { titre: "Arrivage : sneakers montantes Noir & Or", texte: "Nouvelle collection en boutique : sneakers montantes édition limitée, du 38 au 45. Premier arrivé, premier servi !", media_url: "images/tp/prod-sneakers.jpg", media_type: "image", categorie: "Nouveautés", date_publication: il_y_a(4) },
  { titre: "Shooting photo en boutique", texte: "TOUCH PRO DIGITAL réalise vos portraits et visuels produits directement en boutique. Réservez votre séance !", media_url: "images/tp/dept-digital.jpg", media_type: "image", categorie: "Création digitale", date_publication: il_y_a(5) },
  { titre: "Réalisation : locks ombrées ✨", texte: "Magnifique transformation réalisée par l'équipe BEAUTY cette semaine. Merci à notre cliente pour sa confiance ! Votre tour arrive — prenez rendez-vous.", media_url: "images/galerie-locks-ombre.jpg", media_type: "image", categorie: "Réalisations", date_publication: il_y_a(7) },
  { titre: "Écouteurs sans fil Pro ANC en stock", texte: "Réduction de bruit active, 24 h d'autonomie, boîtier de charge rapide. Disponibles en boutique à 24 900 FCFA au lieu de 32 000 FCFA.", media_url: "images/tp/prod-ecouteurs.jpg", media_type: "image", categorie: "Produits disponibles", date_publication: il_y_a(9) },
  { titre: "🚚 Livraison offerte dès 50 000 FCFA", texte: "Bonne nouvelle ! Toute commande de 50 000 FCFA ou plus est livrée gratuitement. En dessous, la livraison reste accessible dès 500 FCFA selon la zone.", media_url: "images/tp/logo-officiel.jpg", media_type: "image", categorie: "Annonces importantes", date_publication: il_y_a(11) },
  { titre: "Mariages & événements : réservez !", texte: "Mise en beauté événementielle, coiffure mariage, maquillage : l'équipe BEAUTY vous sublime pour vos grands jours. Devis gratuit au salon ou sur WhatsApp.", media_url: "images/galerie-mariage.jpg", media_type: "image", categorie: "Coiffure et beauté", date_publication: il_y_a(13) },
  { titre: "Flyers, logos & cartes de visite", texte: "Commerçants, entrepreneurs : TOUCH PRO DIGITAL crée vos flyers, logos, affiches et contenus réseaux sociaux. Devis gratuit sous 24 h !", media_url: "images/tp/poster-digital.jpg", media_type: "image", categorie: "Création digitale", date_publication: il_y_a(15) },
  { titre: "Mode femme : robes & ensembles 👗", texte: "Le rayon mode femme s'agrandit : robes, ensembles et tenues de soirée à des prix doux. Venez découvrir la sélection en boutique.", media_url: "images/tp/dept-fashion.jpg", media_type: "image", categorie: "Mode et vêtements", date_publication: il_y_a(17) },
  { titre: "Coques premium iPhone / Samsung", texte: "Protégez votre téléphone avec style : coques premium, verres trempés et accessoires à partir de 1 500 FCFA, rayon Téléphones & Accessoires.", media_url: "images/tp/prod-coque.jpg", media_type: "image", categorie: "Accessoires", date_publication: il_y_a(19) },
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
