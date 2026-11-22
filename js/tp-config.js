/* ==========================================================================
   TOUCH PRO — Configuration de marque (conception : Kouamelan)
   ========================================================================== */

export const TP = {
  nom: "TOUCH PRO",
  slogan: "Tout ce dont vous avez besoin, au même endroit !",
  signature: "BEAUTY • TECH • FASHION • DIGITAL",
  whatsapp: "2250140810415",
  telephone: "01 40 81 04 15",
  telephoneLien: "+2250140810415",
  adresse: "Oupoyo, derrière le marché, Carrefour Boutique de Malick",
  createur: "Kouamelan",
  email: "haut10niveau@gmail.com", // ← adresse de test, remplacée par l'officielle à votre signal
  waInfos: "https://wa.me/2250140810415?text=" + encodeURIComponent("Bonjour TOUCH PRO, je souhaite obtenir des informations sur vos services."),
  itineraire: "https://www.google.com/maps/search/?api=1&query=" + encodeURIComponent("Oupoyo, derrière le marché, Carrefour Boutique de Malick, Côte d'Ivoire"),
};

export const DEPARTEMENTS = [
  { num: "01", code: "beauty", nom: "BEAUTY", icone: "💇", couleur: "#d6a94f", url: "beauty.html", img: "images/salon.jpg", desc: "Coiffure homme & femme, barber shop, soins capillaires, mise en beauté, RDV en ligne." },
  { num: "02", code: "tech", nom: "TECH", icone: "📱", couleur: "#2ea8ff", url: "tech.html", img: "images/tp/dept-tech.jpg", desc: "Réparation de téléphones toutes marques, écrans, logiciel, diagnostic et suivi." },
  { num: "03", code: "access", nom: "ACCESS", icone: "🎧", couleur: "#a99e88", url: "access.html", img: "images/tp/dept-access.jpg", desc: "Coques, écouteurs, chargeurs, montres connectées, protections, gadgets." },
  { num: "04", code: "fashion", nom: "FASHION", icone: "👕", couleur: "#c05a7a", url: "fashion.html", img: "images/tp/dept-fashion.jpg", desc: "Vêtements homme & femme, chaussures, sacs, accessoires, nouveautés." },
  { num: "05", code: "digital", nom: "DIGITAL", icone: "🎨", couleur: "#7a5ac0", url: "digital.html", img: "images/tp/dept-digital.jpg", desc: "Shooting photo, logos, flyers, vidéos pub, sites web, contenus, musiques." },
];

export function waLien(message) {
  return "https://wa.me/" + TP.whatsapp + "?text=" + encodeURIComponent(message);
}

export function formatPrix(n) {
  return new Intl.NumberFormat("fr-CI").format(n) + " FCFA";
}

/* En-tête + pied de page partagés (injection) */
export function injecteChrome(pageActive = "") {
  const liens = [
    ["index.html", "Accueil"],
    ["index.html#departements", "Départements"],
    ["boutique.html", "Boutique"],
    ["actualites.html", "Actualités"],
    ["carte.html", "Carte de visite"],
    ["contact.html", "Contact"],
  ];
  const nav = liens.map(([u, l]) => `<a href="${u}" class="${pageActive === u ? "actif" : ""}">${l}</a>`).join("");
  const header = document.createElement("header");
  header.className = "tp-header";
  header.innerHTML = `
    <div class="wrap tp-nav">
      <a class="tp-logo" href="index.html">
        <img src="images/tp/icon-192.png" alt="Logo TOUCH PRO">
        <span class="nom">TOUCH <span>PRO</span><small>${TP.signature}</small></span>
      </a>
      <button class="tp-burger" aria-label="Ouvrir le menu" aria-expanded="false">☰</button>
      <nav>${nav}<a href="compte.html" class="nav-compte">👤 Mon compte</a></nav>
    </div>`;
  document.body.prepend(header);
  const burger = header.querySelector(".tp-burger");
  burger.addEventListener("click", () => {
    const navEl = header.querySelector("nav");
    const ouvert = navEl.classList.toggle("ouvert");
    burger.setAttribute("aria-expanded", String(ouvert));
  });

  const footer = document.createElement("footer");
  footer.className = "tp-footer";
  footer.innerHTML = `
    <div class="wrap colonnes">
      <div>
        <h4>TOUCH PRO</h4>
        <p>${TP.slogan}</p>
        <p style="margin-top:.6rem;color:var(--tp-or);font-size:.75rem;letter-spacing:2px;font-weight:700">${TP.signature}</p>
      </div>
      <div>
        <h4>CONTACT</h4>
        <p>📍 ${TP.adresse}</p>
        <p>📞 <a href="tel:${TP.telephoneLien}">${TP.telephone}</a></p>
        <p>💬 <a href="${TP.waInfos}" target="_blank" rel="noopener">WhatsApp</a></p>
      </div>
      <div>
        <h4>DÉPARTEMENTS</h4>
        ${DEPARTEMENTS.map(d => `<p><a href="${d.url}">${d.icone} ${d.nom}</a></p>`).join("")}
      </div>
      <div>
        <h4>PRATIQUE</h4>
        <p><a href="boutique.html">🛍️ Boutique</a></p>
        <p><a href="carte.html">📇 Carte de visite</a></p>
        <p><a href="compte.html">👤 Mon compte</a></p>
      </div>
    </div>
    <div class="wrap signature">© ${new Date().getFullYear()} TOUCH PRO · Conception et réalisation : <strong>Kouamelan</strong></div>`;
  document.body.append(footer);

  const wa = document.createElement("a");
  wa.className = "tp-wa-flottant";
  wa.href = TP.waInfos;
  wa.target = "_blank";
  wa.rel = "noopener";
  wa.setAttribute("aria-label", "Nous contacter sur WhatsApp");
  wa.innerHTML = `<svg viewBox="0 0 24 24"><path d="M12 .5C5.7.5.6 5.6.6 11.8c0 2 .5 3.9 1.5 5.6L.5 23.5l6.3-1.6c1.6.9 3.4 1.3 5.2 1.3 6.3 0 11.4-5.1 11.4-11.4S18.3.5 12 .5zm0 20.9c-1.6 0-3.2-.4-4.6-1.2l-.3-.2-3.7 1 1-3.6-.2-.4c-1-1.5-1.5-3.3-1.5-5.2C3.4 6.6 7.3 2.7 12 2.7s8.7 3.9 8.7 8.7-3.9 10-8.7 10zm4.8-7.2c-.3-.1-1.6-.8-1.8-.9-.2-.1-.4-.1-.6.1-.2.3-.7.9-.8 1-.1.2-.3.2-.5.1-.3-.1-1.1-.4-2.1-1.3-.8-.7-1.3-1.6-1.4-1.8-.1-.3 0-.4.1-.5l.4-.5c.1-.2.2-.3.3-.5.1-.2 0-.4 0-.5l-.8-2c-.2-.5-.4-.4-.6-.4h-.5c-.2 0-.5.1-.7.3-.3.3-.9.9-.9 2.2s.9 2.6 1.1 2.8c.1.2 1.9 2.9 4.6 4 .6.3 1.1.4 1.5.6.6.2 1.2.2 1.7.1.5-.1 1.6-.7 1.8-1.3.2-.7.2-1.2.2-1.3-.1-.2-.3-.2-.6-.3z"/></svg>`;
  document.body.append(wa);

  // Animations d'apparition
  animeReveals();
}

/* (Ré)active l'observation des éléments .reveal (appeler après tout rendu dynamique) */
export function animeReveals() {
  const obs = new IntersectionObserver((es) => es.forEach(e => {
    if (e.isIntersecting) { e.target.classList.add("visible"); obs.unobserve(e.target); }
  }), { threshold: .1 });
  document.querySelectorAll(".reveal:not(.visible)").forEach(elm => obs.observe(elm));
}
