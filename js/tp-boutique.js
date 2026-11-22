/* ==========================================================================
   TOUCH PRO — Boutique façon SHEIN : grille 2 colonnes, chips, recherche,
   favoris, ajout rapide, panier en tiroir, commande WhatsApp.
   ========================================================================== */

import {
  initPage, getPanier, retireDuPanier, changeQte, videPanier, totalPanier,
  formatPrix, esc, nettoie, alerte, boutonChargement, montreWA,
  clientCourant, envoiTropRapide, ajoutePanier, waLien, getSupabase, toast,
} from "./tp-pages.js?v=18";

initPage("boutique.html");

const grille = document.getElementById("grille");
const chips = document.getElementById("chips");
const recherche = document.getElementById("recherche");

document.getElementById("waShop").href = waLien("Bonjour TOUCH PRO ! J'ai une question sur un article de la boutique.");

let tous = [];
let depActif = "";
let favActif = false;

/* ---------- Favoris (localStorage) ---------- */
const CLE_FAV = "tp_favoris";
const getFavs = () => { try { return JSON.parse(localStorage.getItem(CLE_FAV)) || []; } catch { return []; } };
function toggleFav(id) {
  let f = getFavs();
  f = f.includes(id) ? f.filter((x) => x !== id) : [...f, id];
  localStorage.setItem(CLE_FAV, JSON.stringify(f));
}

/* ---------- Rendu grille ---------- */
function carte(p) {
  const prix = p.prix_promo || p.prix;
  const reduc = p.prix_promo && p.prix_promo < p.prix ? Math.round((1 - p.prix_promo / p.prix) * 100) : 0;
  const rupture = Number(p.stock) <= 0;
  const tailles = p.tailles ? p.tailles.split(",").map((t) => t.trim()).filter(Boolean) : [];
  const fav = getFavs().includes(String(p.id));
  return `
  <article class="shop-carte ${rupture ? "rupture" : ""}" data-produit='${esc(JSON.stringify({ id: String(p.id), nom: p.nom, prix }))}'>
    <div class="visuel">
      ${p.image_url ? `<img src="${esc(p.image_url)}" alt="${esc(p.nom)}" loading="lazy">` : `<span class="emoji">🛍️</span>`}
      ${reduc ? `<span class="promo">-${reduc}%</span>` : ""}
      ${rupture ? `<span class="badge-rupture">Épuisé</span>` : ""}
      <button class="fav ${fav ? "actif" : ""}" data-fav="${esc(String(p.id))}" aria-label="Favori">${fav ? "❤️" : "🤍"}</button>
      ${rupture ? "" : `<button class="ajout-rapide" aria-label="Ajouter au panier">＋</button>`}
    </div>
    <div class="infos">
      <h3>${esc(p.nom)}</h3>
      <p class="prix"><strong>${formatPrix(prix)}</strong>${p.prix_promo ? `<del>${formatPrix(p.prix)}</del>` : ""}</p>
      ${tailles.length ? `<select class="sel-taille" aria-label="Taille">${tailles.map((t) => `<option>${esc(t)}</option>`).join("")}</select>` : ""}
    </div>
  </article>`;
}

function filtreCourant() {
  const q = nettoie(recherche.value, 60).toLowerCase();
  const favs = getFavs();
  return tous.filter((p) =>
    (!depActif || p.departement === depActif) &&
    (!favActif || favs.includes(String(p.id))) &&
    (!q || (p.nom + " " + (p.description || "")).toLowerCase().includes(q)));
}

function rendGrille() {
  const liste = filtreCourant();
  grille.innerHTML = liste.length
    ? liste.map(carte).join("")
    : `<div class="tp-vide">${favActif ? "Aucun favori pour le moment — touchez 🤍 sur un article !" : "Aucun article trouvé. Essayez un autre mot-clé."}</div>`;
}

/* ---------- Chargement : démo immédiat, puis BDD ---------- */
async function charge() {
  const { PRODUITS_DEMO } = await import("./tp-data.js?v=18");
  tous = PRODUITS_DEMO;
  rendGrille();
  try {
    const sb = await getSupabase();
    if (!sb) return;
    const { data, error } = await sb.from("produits").select("*").eq("actif", true).order("id", { ascending: false });
    if (!error && data?.length) { tous = data; rendGrille(); }
  } catch { /* démo conservée */ }
}

/* ---------- Filtres ---------- */
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

let timerRecherche;
recherche.addEventListener("input", () => {
  clearTimeout(timerRecherche);
  timerRecherche = setTimeout(rendGrille, 180);
});

/* ---------- Ajout rapide / favoris ---------- */
grille.addEventListener("click", (e) => {
  const carteEl = e.target.closest(".shop-carte");
  if (!carteEl) return;
  const btnFav = e.target.closest(".fav");
  if (btnFav) {
    toggleFav(btnFav.dataset.fav);
    rendGrille();
    return;
  }
  if (e.target.closest(".ajout-rapide")) {
    const p = JSON.parse(carteEl.dataset.produit);
    const taille = carteEl.querySelector(".sel-taille")?.value || null;
    ajoutePanier({ id: p.id, nom: p.nom, prix: p.prix, taille });
    rendBarre();
  }
});

/* ---------- Barre panier + tiroir ---------- */
const barre = document.getElementById("barrePanier");
const overlay = document.getElementById("overlay");
const tiroir = document.getElementById("tiroir");
const contenu = document.getElementById("contenuPanier");
const form = document.getElementById("formCommande");

function rendBarre() {
  const p = getPanier();
  const n = p.reduce((s, i) => s + i.qte, 0);
  barre.hidden = n === 0;
  document.getElementById("nbArticles").textContent = `${n} article${n > 1 ? "s" : ""}`;
  document.getElementById("totalBarre").textContent = formatPrix(totalPanier());
}

function rendPanier() {
  rendBarre();
  const p = getPanier();
  if (!p.length) {
    contenu.innerHTML = `<div class="tp-vide">Votre panier est vide.<br><small>Explorez la boutique et touchez ＋ pour ajouter un article.</small></div>`;
    form.hidden = true;
    return;
  }
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
    + `<p class="tiroir-total">Total : <strong>${formatPrix(totalPanier())}</strong></p>`;
  form.hidden = false;
}

function ouvreTiroir() {
  rendPanier();
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
  rendPanier();
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

  const total = totalPanier();
  const { data: cmd, error } = await sb.from("commandes").insert({
    client_id: user?.id || null,
    client_nom: nom,
    client_telephone: tel,
    livraison: form.livraison.value,
    adresse_livraison: form.livraison.value === "livraison" ? nettoie(form.adresse.value, 200) : null,
    paiement: form.livraison.value === "livraison" ? "a_la_livraison" : "en_boutique",
    total,
    note: nettoie(form.note.value, 300) || null,
  }).select("id").single();

  if (error || !cmd) { boutonChargement(btn, false); alerte("alerteCmd", "err", "L'envoi a échoué. Réessayez ou commandez sur WhatsApp."); return; }

  const items = panier.map((i) => ({
    commande_id: cmd.id, produit_id: i.id, nom_produit: i.nom,
    prix_unitaire: i.prix, quantite: i.qte, taille: i.taille,
  }));
  const { error: errItems } = await sb.from("commande_items").insert(items);
  boutonChargement(btn, false);
  if (errItems) { alerte("alerteCmd", "err", "Commande enregistrée mais détails incomplets — le salon vous contactera."); return; }

  const lignes = panier.map((i) => `• ${i.qte}× ${i.nom}${i.taille ? " (" + i.taille + ")" : ""} — ${formatPrix(i.prix * i.qte)}`);
  videPanier();
  rendPanier();
  rendBarre();
  form.reset();
  form.hidden = true;
  alerte("alerteCmd", "ok", `✅ Commande n°${cmd.id} enregistrée ! Total : ${formatPrix(total)}. Nous vous contactons très vite.`);
  montreWA(form,
    `Bonjour TOUCH PRO ! Je viens de passer la commande n°${cmd.id} :\n${lignes.join("\n")}\nTotal : ${formatPrix(total)}\nNom : ${nom}\nTél : ${tel}`,
    "💬 Confirmer ma commande par WhatsApp");
  form.hidden = false; /* laisser le bouton WhatsApp visible */
});

charge();
rendBarre();
