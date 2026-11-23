/* ==========================================================================
   TOUCH PRO — Boutique façon Yves Store : ventes flash + compte à rebours,
   coupons, tri, favoris, recherche, ajout rapide, panier en tiroir.
   ========================================================================== */

import {
  initPage, getPanier, retireDuPanier, changeQte, videPanier, totalPanier,
  formatPrix, esc, nettoie, alerte, boutonChargement, montreWA,
  clientCourant, envoiTropRapide, ajoutePanier, waLien, getSupabase,
} from "./tp-pages.js?v=19";

initPage("boutique.html");

const grille = document.getElementById("grille");
const chips = document.getElementById("chips");
const recherche = document.getElementById("recherche");

document.getElementById("waShop").href = waLien("Bonjour TOUCH PRO ! J'ai une question sur un article de la boutique.");

let tous = [];
let coupons = [];
let livraisonOfferte = 50000;
let depActif = "";
let favActif = false;
let triActif = "populaires";

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
const reducPct = (p) => (p.prix_promo && p.prix_promo < p.prix) ? Math.round((1 - p.prix_promo / p.prix) * 100) : 0;

/* ---------- Rendu carte ---------- */
function carte(p, compacte = false) {
  const prix = p.prix_promo || p.prix;
  const reduc = reducPct(p);
  const rupture = Number(p.stock) <= 0;
  const tailles = p.tailles ? p.tailles.split(",").map((t) => t.trim()).filter(Boolean) : [];
  const fav = getFavs().includes(String(p.id));
  const pctVendu = Math.min(96, Math.round(((p.ventes || 0) / ((p.ventes || 0) + Math.max(p.stock || 0, 1))) * 100));
  return `
  <article class="shop-carte ${rupture ? "rupture" : ""}" data-id="${esc(String(p.id))}" data-produit='${esc(JSON.stringify({ id: String(p.id), nom: p.nom, prix }))}'>
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
      <p class="prix"><strong>${formatPrix(prix)}</strong>${p.prix_promo ? `<del>${formatPrix(p.prix)}</del>` : ""}</p>
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
    (!depActif || p.departement === depActif) &&
    (!favActif || favs.includes(String(p.id))) &&
    (!q || (p.nom + " " + (p.description || "")).toLowerCase().includes(q)));
  const prixDe = (p) => p.prix_promo || p.prix;
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
  const data = await import("./tp-data.js?v=19");
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
    if (e.target.closest(".ajout-rapide")) {
      const p = JSON.parse(carteEl.dataset.produit);
      const taille = carteEl.querySelector(".sel-taille")?.value || null;
      ajoutePanier({ id: p.id, nom: p.nom, prix: p.prix, taille });
      rendBarre();
      return;
    }
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
    return;
  }
  const sousTotal = totalPanier();
  const remise = calcRemise(sousTotal);
  const total = sousTotal - remise;
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
        <p><span>Livraison</span><span>${total >= livraisonOfferte ? "🎉 Offerte" : "à convenir"}</span></p>
        <p class="tiroir-total"><span>Total</span><strong>${formatPrix(total)}</strong></p>
      </div>`;
  form.hidden = false;
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

function ouvreTiroir() {
  rendPanier(); majMsgCoupon();
  overlay.hidden = false;
  tiroir.hidden = false;
  requestAnimationFrame(() => { document.body.classList.add("tiroir-ouvert"); });
}
function fermeTiroir() {
  document.body.classList.remove("tiroir-ouvert");
  setTimeout(() => { overlay.hidden = true; tiroir.hidden = true; }, 280);
}

document.getElementById("btnVoirPanier").addEventListener("click", ouvreTiroir);
document.getElementById("btnFermerTiroir").addEventListener("click", fermeTiroir);
overlay.addEventListener("click", fermeTiroir);

contenu.addEventListener("click", (e) => {
  const b = e.target.closest("button");
  if (!b) return;
  const { a, k } = b.dataset;
  if (a === "x") retireDuPanier(k);
  if (a === "+") changeQte(k, 1);
  if (a === "-") changeQte(k, -1);
  rendPanier(); majMsgCoupon();
  if (!getPanier().length) fermeTiroir();
});

form.livraison.addEventListener("change", () => {
  document.getElementById("zoneAdresse").hidden = form.livraison.value !== "livraison";
});

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
  const total = sousTotal - remise;
  const { data: cmd, error } = await sb.from("commandes").insert({
    client_id: user?.id || null,
    client_nom: nom,
    client_telephone: tel,
    livraison: form.livraison.value,
    adresse_livraison: form.livraison.value === "livraison" ? nettoie(form.adresse.value, 200) : null,
    paiement: form.livraison.value === "livraison" ? "a_la_livraison" : "en_boutique",
    total,
    note: [nettoie(form.note.value, 300), coupon ? `Coupon: ${coupon.code} (−${formatPrix(remise)})` : ""].filter(Boolean).join(" | ") || null,
  }).select("id").single();

  if (error || !cmd) { boutonChargement(btn, false); alerte("alerteCmd", "err", "L'envoi a échoué. Réessayez ou commandez sur WhatsApp."); return; }

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
  form.reset();
  alerte("alerteCmd", "ok", `✅ Commande n°${cmd.id} enregistrée ! Total : ${formatPrix(total)}. Nous vous contactons très vite.`);
  montreWA(form,
    `Bonjour TOUCH PRO ! Je viens de passer la commande n°${cmd.id} :\n${lignes.join("\n")}${coupon ? `\nCoupon : ${coupon.code}` : ""}\nTotal : ${formatPrix(total)}\nNom : ${nom}\nTél : ${tel}`,
    "💬 Confirmer ma commande par WhatsApp");
  form.hidden = false; /* laisser le bouton WhatsApp visible */
});

charge();
rendBarre();
