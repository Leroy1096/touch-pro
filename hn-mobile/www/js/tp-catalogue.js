/* ==========================================================================
   TOUCH PRO — Catalogue officiel des services (source unique de vérité)
   Organisé par département → catégories → prestations.
   « populaire: true » = services les plus demandés / rentables.
   ========================================================================== */

export const CATALOGUE = {
  /* ------------------------------ BEAUTY ------------------------------ */
  beauty: [
    { titre: "Coiffure Homme", icone: "💈", services: [
      { nom: "Coupe simple", detail: "ciseaux / tondeuse" },
      { nom: "Dégradé", detail: "américain, bas, moyen, haut", populaire: true },
      { nom: "Rasage / Taille de barbe", detail: "contours, rasage à l'ancienne", populaire: true },
      { nom: "Traçage / Lignes", detail: "devanture nette, design" },
      { nom: "Shampoing + Coiffage", detail: "" },
      { nom: "Teinture / Coloration", detail: "noir, blond, couleurs" },
      { nom: "Dreadlocks", detail: "création, entretien, retouche racines" },
      { nom: "Tissage / Perruque homme", detail: "" },
      { nom: "Coiffure pour événement", detail: "mariage, anniversaire, shooting" },
    ]},
    { titre: "Coiffure Femme", icone: "👩🏾‍🦱", services: [
      { nom: "Tresses", detail: "nattes, braids, box braids, crochet, fulani", populaire: true },
      { nom: "Tissage / Perruque", detail: "pose, customisation, entretien", populaire: true },
      { nom: "Défrisage / Lissage", detail: "défrisage, silk press, brésilien", populaire: true },
      { nom: "Coloration / Mèches", detail: "teinture, balayage, ombré" },
      { nom: "Coupe femme", detail: "coupe, pointes, coupe garçonne" },
      { nom: "Shampoing + Brushing / Coiffage", detail: "" },
      { nom: "Soin capillaire", detail: "hydratant, protéiné, bain d'huile, anti-chute" },
      { nom: "Coiffure événementielle", detail: "mariage, anniversaire, chignon, pose de perruque", populaire: true },
      { nom: "Pose de cils / Make-up", detail: "souvent demandé avec la coiffure" },
    ]},
    { titre: "Soin du visage", icone: "🧖", services: [
      { nom: "Gommage", detail: "" },
      { nom: "Masque visage", detail: "" },
      { nom: "Serviette chaude", detail: "" },
    ]},
    { titre: "Pédicure & Manucure", icone: "💅", services: [
      { nom: "Manucure", detail: "soin des mains, vernis" },
      { nom: "Pédicure", detail: "soin des pieds, vernis" },
    ]},
  ],

  /* ------------------------------- TECH ------------------------------- */
  tech: [
    { titre: "Écran", icone: "🖥️", services: [
      { nom: "Écran cassé / fissuré", detail: "chute — la panne n°1", populaire: true },
      { nom: "Tactile qui ne répond plus", detail: "ou qui répond tout seul" },
      { nom: "Écran noir", detail: "alors que le téléphone vibre / sonne" },
      { nom: "Taches, lignes, scintillement", detail: "" },
    ]},
    { titre: "Batterie", icone: "🔋", services: [
      { nom: "Batterie qui se décharge vite", detail: "ou qui gonfle", populaire: true },
      { nom: "Téléphone qui s'éteint à 20-30 %", detail: "" },
      { nom: "Téléphone qui chauffe anormalement", detail: "" },
    ]},
    { titre: "Charge", icone: "🔌", services: [
      { nom: "Ne charge plus", detail: "ou charge très lentement" },
      { nom: "Faux contact", detail: "il faut tenir le câble dans une position" },
      { nom: "Port de charge sale ou abîmé", detail: "connecteur cassé" },
    ]},
    { titre: "Logiciel / Système", icone: "💾", services: [
      { nom: "Bloqué sur le logo", detail: "ou redémarre en boucle" },
      { nom: "Lenteur, bugs, applications qui plantent", detail: "" },
      { nom: "Mot de passe / compte Google / iCloud oublié", detail: "" },
      { nom: "Mise à jour échouée", detail: "" },
    ]},
    { titre: "Réseau / SIM", icone: "📶", services: [
      { nom: "Pas de réseau, SIM non détectée", detail: "" },
      { nom: "Problème d'IMEI", detail: "téléphone non reconnu par le réseau" },
      { nom: "Wifi ou Bluetooth en panne", detail: "" },
    ]},
    { titre: "Audio / Caméra / Boutons", icone: "🔊", services: [
      { nom: "Haut-parleur ou micro en panne", detail: "on n'entend pas l'interlocuteur" },
      { nom: "Caméra floue, noire ou bloquée", detail: "" },
      { nom: "Bouton Power / Volume cassé", detail: "ou enfoncé" },
      { nom: "Empreinte / Face ID hors service", detail: "" },
    ]},
    { titre: "Eau / Carte mère", icone: "💧", services: [
      { nom: "Téléphone tombé dans l'eau", detail: "oxydation, court-circuit" },
      { nom: "Ne s'allume plus du tout", detail: "après chute ou eau" },
    ]},
  ],

  /* ------------------------------ DIGITAL ------------------------------ */
  digital: [
    { titre: "Design Graphique", icone: "✏️", services: [
      { nom: "Logo professionnel", detail: "", populaire: true },
      { nom: "Affiche / Flyer", detail: "événement, promo, boutique" },
      { nom: "Carte de visite / d'invitation", detail: "" },
      { nom: "Menu restaurant / Catalogue produit", detail: "" },
      { nom: "Visuels réseaux sociaux", detail: "post, story, statut WhatsApp" },
    ]},
    { titre: "Réseaux Sociaux", icone: "📱", services: [
      { nom: "Gestion de page", detail: "Facebook, TikTok, Instagram" },
      { nom: "Création de contenu", detail: "vidéos, Reels, TikTok" },
      { nom: "Montage vidéo", detail: "pub, clip, vidéo produit" },
      { nom: "Publicité Facebook / TikTok Ads", detail: "pour vendre plus", populaire: true },
      { nom: "Création de compte pro + bio optimisée", detail: "" },
    ]},
    { titre: "Photo / Vidéo", icone: "📸", services: [
      { nom: "Shooting photo produit", detail: "vêtements, nourriture, cosmétiques" },
      { nom: "Shooting portrait / événement", detail: "anniversaire, mariage, entreprise" },
      { nom: "Vidéo publicitaire", detail: "présentation boutique, service, vlog" },
      { nom: "Voix off / Spot radio", detail: "" },
    ]},
    { titre: "Web / Tech", icone: "🌐", services: [
      { nom: "Création de site web / boutique en ligne", detail: "", populaire: true },
      { nom: "Boutique WhatsApp Business", detail: "" },
      { nom: "QR Code, lien de commande", detail: "" },
      { nom: "CV professionnel / portfolio", detail: "" },
    ]},
    { titre: "Branding / Entreprise", icone: "🏢", services: [
      { nom: "Identité visuelle complète", detail: "logo + couleurs + flyer + carte" },
      { nom: "Nom d'entreprise + slogan", detail: "" },
      { nom: "Présentation PowerPoint pro", detail: "entreprise / école" },
      { nom: "Factures, reçus, en-têtes personnalisés", detail: "" },
    ]},
    { titre: "Musique pour une personne", icone: "🎵", services: [
      { nom: "Chanson d'anniversaire personnalisée", detail: "nom, âge, histoire de la personne", populaire: true },
      { nom: "Chanson d'amour / Déclaration", detail: "demande en mariage, Saint-Valentin" },
      { nom: "Chanson de mariage", detail: "entrée des mariés, première danse" },
      { nom: "Chanson pour enfant / baptême", detail: "avec le nom du bébé" },
      { nom: "Chanson hommage", detail: "parent, ami, mentor" },
    ]},
    { titre: "Musique Business / Marque", icone: "🎤", services: [
      { nom: "Jingle publicitaire", detail: "boutique, restaurant, salon…" },
      { nom: "Sonnerie / Hymne d'entreprise", detail: "" },
      { nom: "Musique pour pub TikTok / Facebook", detail: "" },
      { nom: "Intro / Outro YouTube, podcast", detail: "" },
      { nom: "Musique d'attente téléphonique", detail: "" },
    ]},
    { titre: "Musique pour Événement", icone: "🎉", services: [
      { nom: "Anniversaire d'entreprise", detail: "" },
      { nom: "Musique de campagne", detail: "politique, association, école" },
      { nom: "Chanson pour équipe de foot", detail: "supporters" },
      { nom: "Musique pour vidéo de mariage / anniversaire", detail: "" },
    ]},
    { titre: "Production / Studio", icone: "🎚️", services: [
      { nom: "Beat / Instrumental sur mesure", detail: "Afrobeat, Amapiano, Rap, Zouglou, Coupé-décalé" },
      { nom: "Enregistrement voix", detail: "chant, rap, voix off" },
      { nom: "Mixage / Mastering", detail: "chanson déjà enregistrée" },
      { nom: "Écriture de paroles personnalisées", detail: "" },
      { nom: "Cover / Remix", detail: "chanson connue, nouveau texte" },
    ]},
  ],
};

/* Rendu d'un catalogue : une carte par catégorie, prestations cliquables.
   onChoix(service, categorie) : appelé au clic sur une prestation (pré-remplissage). */
export function rendCatalogue(zone, categories, { couleur = "var(--tp-or)", onChoix = null, prixDe = null } = {}) {
  zone.innerHTML = categories.map((cat) => `
    <article class="catalogue-cat" style="--cat-couleur:${couleur}">
      <h3><span class="cat-icone">${cat.icone}</span> ${cat.titre}</h3>
      <ul>
        ${cat.services.map((s) => {
          const p = prixDe ? prixDe(s.nom) : null;
          return `<li data-s="${encodeURIComponent(s.nom)}" data-c="${encodeURIComponent(cat.titre)}"${onChoix ? ' role="button" tabindex="0"' : ""}>
            <span class="s-nom">${s.nom}${s.populaire ? ' <em class="tag-pop">⭐ Très demandé</em>' : ""}</span>
            ${s.detail ? `<small>${s.detail}</small>` : ""}
            ${p ? `<span class="s-prix">${p}</span>` : ""}
          </li>`;
        }).join("")}
      </ul>
    </article>`).join("");
  if (onChoix) {
    const choisir = (li) => {
      const nom = decodeURIComponent(li.dataset.s);
      const cat = decodeURIComponent(li.dataset.c);
      onChoix(nom, cat);
    };
    zone.addEventListener("click", (e) => { const li = e.target.closest("li[data-s]"); if (li) choisir(li); });
    zone.addEventListener("keydown", (e) => {
      if (e.key !== "Enter") return;
      const li = e.target.closest("li[data-s]"); if (li) choisir(li);
    });
  }
}
