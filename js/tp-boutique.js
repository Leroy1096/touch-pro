/* ==========================================================================
   TOUCH PRO — Boutique façon Yves Store : ventes flash + compte à rebours,
   coupons, tri, favoris, recherche, ajout rapide, panier en tiroir.
   ========================================================================== */

import {
  initPage, getPanier, retireDuPanier, changeQte, videPanier, totalPanier,
  formatPrix, esc, nettoie, alerte, boutonChargement, montreWA,
  clientCourant, envoiTropRapide, ajoutePanier, waLien, getSupabase, exigeCompte,
} from "./tp-pages.js?v=23";
import { CATEGORIES_BOUTIQUE, majBadgeGlobal } from "./tp-config.js?v=21";

initPage("boutique.html");

/* 🛡️ La boutique est réservée aux membres : inscription ou connexion obligatoire.
   (Base injoignable → navigation libre en mode démo, jamais de blocage.) */
if (!(await exigeCompte("boutique.html"))) await new Promise(() => {}); // redirection en cours

/* Zones de livraison — règles officielles TOUCH PRO :
   retrait boutique GRATUIT · Oupoyo 500 F · ailleurs aux frais du client */
const ZONES_LIVRAISON = [
  { code: "boutique", nom: "🏬 Retrait en boutique", frais: 0, info: "Gratuit" },
  { code: "oupoyo", nom: "🚚 Livraison à Oupoyo", frais: 500, info: "500 F" },
  { code: "autre", nom: "🌍 Autre localité", frais: null, info: "frais à votre charge (confirmés par téléphone)" },
];

const grille = document.getElementById("grille");
const chips = document.getElementById("chips");
const recherche = document.getElementById("recherche");

/* Chips catégories produit (rayons de la boutique) */
chips.innerHTML = CATEGORIES_BOUTIQUE.map((c, i) =>
  `<button data-dep="${c.code}" class="${i === 0 ? "actif" : ""}">${c.icone} ${c.nom}</button>`).join("");

document.getElementById("waShop").href = waLien("Bonjour TOUCH PRO ! J'ai une question sur un article de la boutique.");

let tous = [];
let coupons = [];
let livraisonOfferte = 50000;
let depActif = new URLSearchParams(location.search).get("cat") || "";
let favActif = false;
let triActif = "populaires";

/* Active la chip correspondant au rayon demandé dans l'URL */
if (depActif) {
  chips.querySelectorAll("button").forEach((b) => b.classList.toggle("actif", b.dataset.dep === depActif));
}

/* ---------- Favoris (localStorage) ---------- */
const CLE_FAV = "tp_favoris";
const getFavs = () => { try { return JSON.parse(localStorage.getItem(CLE_FAV)) || []; } catch { return []; } };
function toggleFav(id) {
  let f = getFavs();
  f = f.includes(id) ? f.filter((x) => x !== id) : [...f, id];
  localStorage.setItem(CLE_FAV, JSON.stringify(f));
}

/* ---------- Coupon (localStorage) ---------- */
const CLE_COUPON = "tp_coupon";
const getCoupon = () => { try { return JSON.parse(localStorage.getItem(CLE_COUPON)); } catch { return null; } };
function calcRemise(sousTotal) {
  const c = getCoupon();
  if (!c) return 0;
  if (c.min && sousTotal < c.min) return 0;
  return c.type === "pct" ? Math.round(sousTotal * c.taux) : Math.min(c.montant, sousTotal);
}

const fmtVentes = (n) => n >= 1000 ? (n / 1000).toFixed(1).replace(".", ",").replace(",0", "") + "k+" : n + "+";
const reducPct = (p) => (p.prix_promo && p.prix_promo > p.prix) ? Math.round((1 - p.prix / p.prix_promo) * 100) : 0;

/* ---------- Rendu carte ---------- */
function carte(p, compacte = false) {
  const prix = p.prix; /* convention unique : prix = prix de vente, prix_promo = prix barré */
  const reduc = reducPct(p);
  const rupture = Number(p.stock) <= 0;
  const tailles = p.tailles ? p.tailles.split(",").map((t) => t.trim()).filter(Boolean) : [];
  const fav = getFavs().includes(String(p.id));
  const pctVendu = Math.min(96, Math.round(((p.ventes || 0) / ((p.ventes || 0) + Math.max(p.stock || 0, 1))) * 100));
  return `
  <article class="shop-carte ${rupture ? "rupture" : ""}" data-id="${esc(String(p.id))}" data-nom="${esc(p.nom)}" data-prix="${prix}" data-stock="${Number(p.stock) || 0}">
    <div class="visuel" role="link" tabindex="0" aria-label="Voir ${esc(p.nom)}">
      ${p.image_url ? `<img src="${esc(p.image_url)}" alt="${esc(p.nom)}" loading="lazy">` : `<span class="emoji">🛍️</span>`}
      ${reduc ? `<span class="promo">-${reduc}%</span>` : ""}
      ${p.badge ? `<span class="badge-art">${esc(p.badge)}</span>` : ""}
      ${rupture ? `<span class="badge-rupture">Épuisé</span>` : ""}
      <button class="fav ${fav ? "actif" : ""}" data-fav="${esc(String(p.id))}" aria-label="Favori">${fav ? "❤️" : "🤍"}</button>
      ${rupture ? "" : `<button class="ajout-rapide" aria-label="Ajouter au panier">＋</button>`}
    </div>
    <div class="infos">
      <h3>${esc(p.nom)}</h3>
      <p class="prix"><strong>${formatPrix(prix)}</strong>${reduc ? `<del>${formatPrix(p.prix_promo)}</del>` : ""}</p>
      ${(p.ventes || p.note) ? `<p class="meta">${p.note ? `★ ${String(p.note).replace(".", ",")}` : ""}${p.note && p.ventes ? " · " : ""}${p.ventes ? `${fmtVentes(p.ventes)} vendus` : ""}</p>` : ""}
      ${p.flash && !compacte ? `<div class="jauge"><i style="width:${pctVendu}%"></i></div><small class="jauge-txt">${pctVendu}% vendu${pctVendu >= 80 ? " · Presque épuisé" : ""}</small>` : ""}
      ${!p.flash && Number(p.stock) > 0 && Number(p.stock) <= 10 ? `<small class="stock-bas">Plus que ${p.stock} en stock</small>` : ""}
      ${tailles.length && !compacte ? `<select class="sel-taille" aria-label="Taille">${tailles.map((t) => `<option>${esc(t)}</option>`).join("")}</select>` : ""}
    </div>
  </article>`;
}

/* ---------- Tri + filtres ---------- */
function filtreCourant() {
  const q = nettoie(recherche.value, 60).toLowerCase();
  const favs = getFavs();
  let liste = tous.filter((p) =>
    (!depActif || (p.categorie || p.departement) === depActif) &&
    (!favActif || favs.includes(String(p.id))) &&
    (!q || (p.nom + " " + (p.description || "")).toLowerCase().includes(q)));
  const prixDe = (p) => p.prix;
  switch (triActif) {
    case "prix-asc": liste.sort((a, b) => prixDe(a) - prixDe(b)); break;
    case "prix-desc": liste.sort((a, b) => prixDe(b) - prixDe(a)); break;
    case "promos": liste = liste.filter((p) => reducPct(p) > 0).sort((a, b) => reducPct(b) - reducPct(a)); break;
    case "nouveautes": liste.sort((a, b) => (b.badge === "Nouveau") - (a.badge === "Nouveau") || String(b.id).localeCompare(String(a.id), undefined, { numeric: true })); break;
    default: liste.sort((a, b) => (b.ventes || 0) - (a.ventes || 0));
  }
  return liste;
}

function rendGrille() {
  const liste = filtreCourant();
  document.getElementById("compteurProd").textContent = `${liste.length} article${liste.length > 1 ? "s" : ""}`;
  grille.innerHTML = liste.length
    ? liste.map((p) => carte(p)).join("")
    : `<div class="tp-vide">${favActif ? "Aucun favori pour le moment — touchez 🤍 sur un article !" : "Aucun article trouvé. Essayez un autre mot-clé."}</div>`;
}

/* ---------- Ventes flash + compte à rebours ---------- */
function rendFlash() {
  const flash = tous.filter((p) => p.flash && Number(p.stock) > 0);
  const section = document.getElementById("sectionFlash");
  if (!flash.length) { section.hidden = true; return; }
  section.hidden = false;
  document.getElementById("railFlash").innerHTML = flash.map((p) => carte(p, true)).join("");
}
function tickCompteRebours() {
  const fin = new Date(); fin.setHours(23, 59, 59, 999);
  const d = Math.max(0, fin - Date.now());
  const h = String(Math.floor(d / 3.6e6)).padStart(2, "0");
  const m = String(Math.floor(d % 3.6e6 / 6e4)).padStart(2, "0");
  const s = String(Math.floor(d % 6e4 / 1e3)).padStart(2, "0");
  const el = document.getElementById("compteRebours");
  if (el) el.textContent = `${h}:${m}:${s}`;
}
setInterval(tickCompteRebours, 1000); tickCompteRebours();

/* ---------- Coupons ---------- */
function rendCoupons() {
  document.getElementById("railCoupons").innerHTML = coupons.map((c) => `
    <div class="coupon">
      <div class="coupon-gauche"><strong>${esc(c.titre)}</strong><small>${esc(c.sous)}</small></div>
      <div class="coupon-droite"><code>${esc(c.code)}</code><small>${esc(c.cond)}</small>
        <button data-code="${esc(c.code)}">Copier</button></div>
    </div>`).join("")
    + `<div class="coupon auto"><div class="coupon-gauche"><strong>Offerte</strong><small>Automatique</small></div>
       <div class="coupon-droite"><code>Sans code</code><small>livraison dès ${formatPrix(livraisonOfferte)}</small></div></div>`;
}
document.getElementById("railCoupons").addEventListener("click", (e) => {
  const b = e.target.closest("button[data-code]");
  if (!b) return;
  const c = coupons.find((x) => x.code === b.dataset.code);
  if (!c) return;
  localStorage.setItem(CLE_COUPON, JSON.stringify(c));
  try { navigator.clipboard.writeText(c.code); } catch { /* presse-papiers indisponible */ }
  b.textContent = "Copié ✓";
  setTimeout(() => (b.textContent = "Copier"), 1500);
  rendPanier(); rendBarre();
});

/* ---------- Chargement : démo immédiat, puis BDD ---------- */
async function charge() {
  const data = await import("./tp-data.js?v=21");
  tous = data.PRODUITS_DEMO;
  coupons = data.COUPONS;
  livraisonOfferte = data.LIVRAISON_OFFERTE;
  rendCoupons(); rendFlash(); rendGrille();
  try {
    const sb = await getSupabase();
    if (!sb) return;
    const { data: d, error } = await sb.from("produits").select("*").eq("actif", true).order("id", { ascending: false });
    if (!error && d?.length) { tous = d; rendFlash(); rendGrille(); }
  } catch { /* démo conservée */ }
}

/* ---------- Filtres / tri / recherche ---------- */
chips.addEventListener("click", (e) => {
  const b = e.target.closest("button");
  if (!b) return;
  chips.querySelectorAll("button").forEach((x) => x.classList.toggle("actif", x === b));
  if (b.dataset.dep === "fav") { favActif = true; depActif = ""; }
  else { favActif = false; depActif = b.dataset.dep; }
  rendGrille();
});
const chipFav = document.createElement("button");
chipFav.dataset.dep = "fav";
chipFav.textContent = "❤️ Favoris";
chips.append(chipFav);

document.getElementById("tri").addEventListener("change", (e) => { triActif = e.target.value; rendGrille(); });

let timerRecherche;
recherche.addEventListener("input", () => {
  clearTimeout(timerRecherche);
  timerRecherche = setTimeout(rendGrille, 180);
});

/* ---------- Clics sur cartes (grille + rail flash) ---------- */
function brancheCartes(conteneur) {
  conteneur.addEventListener("click", (e) => {
    const carteEl = e.target.closest(".shop-carte");
    if (!carteEl) return;
    const btnFav = e.target.closest(".fav");
    if (btnFav) {
      toggleFav(btnFav.dataset.fav);
      rendGrille(); rendFlash();
      return;
    }
    if (e.target.closest(".ajout-rapide")) { ajoutRapide(carteEl); return; }
    if (e.target.closest("select")) return;
    /* Clic ailleurs sur la carte → fiche produit */
    location.href = "produit.html?id=" + encodeURIComponent(carteEl.dataset.id);
  });
  conteneur.addEventListener("keydown", (e) => {
    if (e.key === "Enter" && e.target.classList?.contains("visuel")) {
      location.href = "produit.html?id=" + encodeURIComponent(e.target.closest(".shop-carte").dataset.id);
    }
  });
}
brancheCartes(grille);
brancheCartes(document.getElementById("railFlash"));

/* ---------- Barre panier + tiroir ---------- */
const barre = document.getElementById("barrePanier");
const overlay = document.getElementById("overlay");
const tiroir = document.getElementById("tiroir");
const contenu = document.getElementById("contenuPanier");
const form = document.getElementById("formCommande");
const couponZone = document.getElementById("couponZone");

/* Remplit le select livraison depuis les zones */
const selLiv = document.getElementById("selLivraison");
const tiroirPied = document.getElementById("tiroirPied");
selLiv.innerHTML = ZONES_LIVRAISON.map((z) =>
  `<option value="${z.code}">${z.nom} — ${z.frais ? formatPrix(z.frais) : z.info}</option>`).join("");
const zoneChoisie = () => ZONES_LIVRAISON.find((z) => z.code === selLiv.value) || ZONES_LIVRAISON[0];
/* null = frais à définir avec le client (autre localité) */
const fraisLivraison = () => zoneChoisie().frais;

/* Pré-remplit nom/téléphone si le client est connecté */
(async () => {
  try {
    const { user } = await clientCourant();
    if (user) {
      if (!form.nom.value) form.nom.value = user.user_metadata?.nom || user.user_metadata?.full_name || "";
      if (!form.telephone.value) form.telephone.value = user.user_metadata?.telephone || user.user_metadata?.phone || "";
    }
  } catch { /* invité */ }
})();

function rendBarre() {
  const p = getPanier();
  const n = p.reduce((s, i) => s + i.qte, 0);
  barre.hidden = n === 0;
  document.getElementById("nbArticles").textContent = `${n} article${n > 1 ? "s" : ""}`;
  document.getElementById("totalBarre").textContent = formatPrix(totalPanier() - calcRemise(totalPanier()));
}

function rendPanier() {
  rendBarre();
  const p = getPanier();
  couponZone.hidden = !p.length;
  if (!p.length) {
    contenu.innerHTML = `<div class="tp-vide">Votre panier est vide.<br><small>Explorez la boutique et touchez ＋ pour ajouter un article.</small></div>`;
    form.hidden = true;
    tiroirPied.hidden = true;
    return;
  }
  const sousTotal = totalPanier();
  const remise = calcRemise(sousTotal);
  const zone = zoneChoisie();
  const livOfferte = zone.code === "oupoyo" && (sousTotal - remise) >= livraisonOfferte;
  const frais = livOfferte ? 0 : zone.frais; /* null = à définir (autre localité) */
  const total = sousTotal - remise + (frais || 0);
  const txtLivraison = zone.code === "boutique" ? "🎉 Gratuite (retrait boutique)"
    : livOfferte ? "🎉 Offerte (dès " + formatPrix(livraisonOfferte) + ")"
    : frais === null ? "À votre charge (confirmée par téléphone)"
    : formatPrix(frais);
  contenu.innerHTML = p.map((i) => `
    <div class="ligne">
      <div class="infos">
        <strong>${esc(i.nom)}</strong>${i.taille ? ` <span class="tp-badge">${esc(i.taille)}</span>` : ""}
        <small>${formatPrix(i.prix)} × ${i.qte}</small>
      </div>
      <div class="qte">
        <button data-a="-" data-k="${esc(i.id + "|" + (i.taille || ""))}" aria-label="Moins">−</button>
        <strong>${i.qte}</strong>
        <button data-a="+" data-k="${esc(i.id + "|" + (i.taille || ""))}" aria-label="Plus">+</button>
      </div>
      <strong class="montant">${formatPrix(i.prix * i.qte)}</strong>
      <button class="suppr" data-a="x" data-k="${esc(i.id + "|" + (i.taille || ""))}" aria-label="Retirer">✕</button>
    </div>`).join("")
    + `<div class="tiroir-recap">
        <p><span>Sous-total</span><span>${formatPrix(sousTotal)}</span></p>
        ${remise ? `<p class="remise"><span>🎁 Coupon ${esc(getCoupon().code)}</span><span>−${formatPrix(remise)}</span></p>` : ""}
        <p><span>Livraison</span><span>${txtLivraison}</span></p>
        <p class="tiroir-total"><span>Total</span><strong>${formatPrix(total)}${frais === null ? " <small>+ livraison</small>" : ""}</strong></p>
      </div>`;
  form.hidden = false;
  tiroirPied.hidden = false;
}

/* ---------- Coupon dans le tiroir ---------- */
const champCoupon = document.getElementById("champCoupon");
const msgCoupon = document.getElementById("msgCoupon");
function majMsgCoupon() {
  const c = getCoupon();
  const sousTotal = totalPanier();
  if (!c) { msgCoupon.textContent = ""; return; }
  if (c.min && sousTotal < c.min) {
    msgCoupon.textContent = `⚠️ ${c.code} : minimum ${formatPrix(c.min)} d'achat (encore ${formatPrix(c.min - sousTotal)}).`;
    msgCoupon.style.color = "#e8a25e";
  } else {
    msgCoupon.textContent = `✅ ${c.code} appliqué : −${formatPrix(calcRemise(sousTotal))}`;
    msgCoupon.style.color = "#7fd08a";
  }
}
document.getElementById("btnCoupon").addEventListener("click", () => {
  const code = nettoie(champCoupon.value, 20).toUpperCase();
  const c = coupons.find((x) => x.code === code);
  if (!c) { msgCoupon.textContent = "❌ Code invalide."; msgCoupon.style.color = "#e88"; return; }
  localStorage.setItem(CLE_COUPON, JSON.stringify(c));
  champCoupon.value = "";
  rendPanier(); majMsgCoupon();
});

function ouvreTiroir(versFormulaire = false) {
  rendPanier(); majMsgCoupon();
  overlay.hidden = false;
  tiroir.hidden = false;
  requestAnimationFrame(() => { document.body.classList.add("tiroir-ouvert"); });
  /* Ouverture depuis l'icône 🛒 de l'en-tête : intention = commander.
     On fait défiler jusqu'au récap + formulaire de coordonnées. */
  if (versFormulaire && getPanier().length) {
    setTimeout(() => {
      const corps = tiroir.querySelector(".tiroir-corps");
      const recap = contenu.querySelector(".tiroir-recap");
      if (corps && recap) {
        corps.scrollTo({ top: Math.max(0, recap.offsetTop - corps.offsetTop - 10), behavior: "smooth" });
      }
    }, 380);
  }
}
function fermeTiroir() {
  document.body.classList.remove("tiroir-ouvert");
  setTimeout(() => { overlay.hidden = true; tiroir.hidden = true; }, 280);
}

document.getElementById("btnVoirPanier").addEventListener("click", () => ouvreTiroir());
document.getElementById("btnFermerTiroir").addEventListener("click", fermeTiroir);
overlay.addEventListener("click", fermeTiroir);

/* Icône 🛒 de l'en-tête : sur la boutique, elle OUVRE le panier au lieu
   de recharger la page ; depuis une autre page (?panier=1), le tiroir
   s'ouvre automatiquement à l'arrivée. */
const lienPanierTete = document.querySelector(".tp-panier-tete");
if (lienPanierTete) {
  lienPanierTete.addEventListener("click", (e) => { e.preventDefault(); ouvreTiroir(true); });
}
if (new URLSearchParams(location.search).get("panier") === "1") {
  ouvreTiroir(true);
  history.replaceState(null, "", "boutique.html");
}

contenu.addEventListener("click", (e) => {
  const b = e.target.closest("button");
  if (!b) return;
  const { a, k } = b.dataset;
  if (a === "x") retireDuPanier(k);
  if (a === "+") changeQte(k, 1);
  if (a === "-") changeQte(k, -1);
  rendPanier(); majMsgCoupon(); majBadgeGlobal();
  if (!getPanier().length) fermeTiroir();
});

form.livraison.addEventListener("change", () => {
  const besoinAdresse = selLiv.value !== "boutique";
  document.getElementById("zoneAdresse").hidden = !besoinAdresse;
  rendPanier(); /* recalculer avec les frais */
});

/* ---------- Ajout rapide : bloque si rupture + maj badge global ---------- */
function ajoutRapide(carteEl) {
  const { id, nom, prix, stock } = carteEl.dataset;
  if (Number(stock) <= 0) { alert("⚠️ Cet article est épuisé."); return; }
  const taille = carteEl.querySelector(".sel-taille")?.value || null;
  ajoutePanier({ id, nom, prix: Number(prix), taille });
  rendBarre();
  majBadgeGlobal();
}

/* ---------- Validation de commande ---------- */
form.addEventListener("submit", async (e) => {
  e.preventDefault();
  if (form.entreprise.value) { form.reset(); return; }
  if (envoiTropRapide()) { alerte("alerteCmd", "err", "Envoi trop rapide, merci de réessayer."); return; }

  const nom = nettoie(form.nom.value, 80);
  const tel = nettoie(form.telephone.value, 20).replace(/[\s.]/g, "");
  const panier = getPanier();
  if (nom.length < 2) { alerte("alerteCmd", "err", "Merci d'indiquer votre nom."); return; }
  if (!/^\+?\d{8,15}$/.test(tel)) { alerte("alerteCmd", "err", "Numéro de téléphone invalide."); return; }
  if (!panier.length) { alerte("alerteCmd", "err", "Votre panier est vide."); return; }

  const btn = document.getElementById("btnCommander");
  boutonChargement(btn, true);
  const { sb, user } = await clientCourant();
  if (!sb) { boutonChargement(btn, false); alerte("alerteCmd", "err", "Connexion indisponible. Commandez directement sur WhatsApp : wa.me/2250140810415"); return; }

  const sousTotal = totalPanier();
  const remise = calcRemise(sousTotal);
  const coupon = getCoupon();
  const zone = zoneChoisie();
  const livOfferte = zone.code === "oupoyo" && (sousTotal - remise) >= livraisonOfferte;
  const fraisReels = livOfferte ? 0 : (zone.frais || 0);
  const aDefinir = zone.frais === null; /* autre localité : frais confirmés par téléphone */
  const total = sousTotal - remise + fraisReels;
  const zoneTxt = `${zone.nom} — ${livOfferte ? "offerte" : aDefinir ? zone.info : formatPrix(zone.frais)}`;

  /* Revalider le stock avant d'enregistrer */
  const rupture = panier.find((i) => {
    const prod = tous.find((x) => String(x.id) === String(i.id));
    return prod && Number(prod.stock) <= 0;
  });
  if (rupture) { boutonChargement(btn, false); alerte("alerteCmd", "err", `⚠️ « ${rupture.nom} » est épuisé. Retirez-le du panier.`); return; }

  const { data: cmd, error } = await sb.from("commandes").insert({
    client_id: user?.id || null,
    client_nom: nom,
    client_telephone: tel,
    livraison: selLiv.value,
    adresse_livraison: selLiv.value !== "boutique" ? nettoie(form.adresse.value, 200) : null,
    paiement: selLiv.value !== "boutique" ? "a_la_livraison" : "en_boutique",
    total,
    note: [nettoie(form.note.value, 300), coupon ? `Coupon: ${coupon.code} (−${formatPrix(remise)})` : "", aDefinir ? "Frais de livraison à définir avec le client" : fraisReels ? `Livraison: ${formatPrix(fraisReels)}` : ""].filter(Boolean).join(" | ") || null,
  }).select("id").single();

  if (error || !cmd) {
    boutonChargement(btn, false);
    /* Montre la vraie raison (ex. anti-spam) plutôt qu'un message générique */
    const msgSql = error?.message && !/fetch|network|failed|timeout/i.test(error.message) ? error.message : "";
    alerte("alerteCmd", "err", msgSql ? `⚠️ ${msgSql}` : "L'envoi a échoué. Réessayez ou commandez sur WhatsApp : wa.me/2250140810415");
    return;
  }

  const items = panier.map((i) => ({
    commande_id: cmd.id, produit_id: /^\d+$/.test(String(i.id)) ? Number(i.id) : null, nom_produit: i.nom,
    prix_unitaire: i.prix, quantite: i.qte, taille: i.taille,
  }));
  const { error: errItems } = await sb.from("commande_items").insert(items);
  boutonChargement(btn, false);
  if (errItems) { alerte("alerteCmd", "err", "Commande enregistrée mais détails incomplets — le salon vous contactera."); return; }

  const lignes = panier.map((i) => `• ${i.qte}× ${i.nom}${i.taille ? " (" + i.taille + ")" : ""} — ${formatPrix(i.prix * i.qte)}`);
  videPanier();
  localStorage.removeItem(CLE_COUPON);
  rendPanier();
  rendBarre();
  majBadgeGlobal();
  form.reset();
  const txtTotal = `Total : ${formatPrix(total)}${aDefinir ? " (+ livraison à définir)" : ""}`;
  alerte("alerteCmd", "ok", `✅ Commande n°${cmd.id} enregistrée ! ${txtTotal}. Nous vous contactons très vite.`);
  montreWA(form,
    `Bonjour TOUCH PRO ! Je viens de passer la commande n°${cmd.id} :\n${lignes.join("\n")}${coupon ? `\nCoupon : ${coupon.code}` : ""}\n📦 ${zoneTxt}\n${txtTotal}\nNom : ${nom}\nTél : ${tel}`,
    "💬 Confirmer ma commande par WhatsApp");
  form.hidden = false; /* laisser le bouton WhatsApp visible */
  tiroirPied.hidden = true; /* commande envoyée : masquer « Valider » */
});

charge();
rendBarre();
majBadgeGlobal();
