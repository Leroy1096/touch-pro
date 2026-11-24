/* ==========================================================================
   TOUCH PRO — Fiche produit (façon Yves Store) : galerie, note, tailles,
   quantité, garanties, produits similaires, ajout panier / WhatsApp.
   ========================================================================== */

import {
  initPage, formatPrix, esc, ajoutePanier, waLien, getSupabase, majBadgePanier, exigeCompte,
} from "./tp-pages.js?v=21";
import { majBadgeGlobal } from "./tp-config.js?v=19";

initPage("boutique.html");

/* 🛡️ La boutique (fiches produits comprises) est réservée aux membres. */
if (!(await exigeCompte("produit.html"))) await new Promise(() => {}); // redirection en cours

const zone = document.getElementById("pageProduit");
const barre = document.getElementById("barreAchat");
const id = new URLSearchParams(location.search).get("id");

let produit = null;
let qte = 1;
let tailleChoisie = null;

/* ---------- Chargement : démo immédiat, puis BDD ---------- */
async function charge() {
  const { PRODUITS_DEMO } = await import("./tp-data.js?v=19");
  let tous = PRODUITS_DEMO;
  produit = tous.find((p) => String(p.id) === String(id)) || tous[0];
  rend(tous);
  try {
    const sb = await getSupabase();
    if (!sb) return;
    const { data, error } = await sb.from("produits").select("*").eq("actif", true);
    if (!error && data?.length) {
      tous = data;
      const trouve = tous.find((p) => String(p.id) === String(id));
      if (trouve) { produit = trouve; rend(tous); }
    }
  } catch { /* démo conservée */ }
}

const reducPct = (p) => (p.prix_promo && p.prix_promo < p.prix) ? Math.round((1 - p.prix_promo / p.prix) * 100) : 0;
const fmtVentes = (n) => n >= 1000 ? (n / 1000).toFixed(1).replace(".", ",").replace(",0", "") + "k+" : n + "+";
const prixUnit = () => produit.prix_promo || produit.prix;

function rend(tous) {
  const p = produit;
  document.title = `${p.nom} — Boutique TOUCH PRO`;
  const reduc = reducPct(p);
  const tailles = p.tailles ? p.tailles.split(",").map((t) => t.trim()).filter(Boolean) : [];
  tailleChoisie = tailles[0] || null;
  const rupture = Number(p.stock) <= 0;
  let similaires = tous.filter((x) => String(x.id) !== String(p.id) && (x.categorie || x.departement) === (p.categorie || p.departement)).slice(0, 4);
  if (similaires.length < 4) {
    const autres = tous.filter((x) => String(x.id) !== String(p.id) && !similaires.includes(x))
      .sort((a, b) => (b.ventes || 0) - (a.ventes || 0));
    similaires = [...similaires, ...autres].slice(0, 4);
  }

  zone.innerHTML = `
    <a class="retour" href="boutique.html">‹ Boutique</a>
    <div class="produit-visuel">
      ${p.image_url ? `<img src="${esc(p.image_url)}" alt="${esc(p.nom)}">` : `<span class="emoji">🛍️</span>`}
      ${reduc ? `<span class="promo">-${reduc}%</span>` : ""}
      ${p.badge ? `<span class="badge-art">${esc(p.badge)}</span>` : ""}
    </div>
    <div class="produit-corps">
      <h1>${esc(p.nom)}</h1>
      <p class="meta">${p.note ? `★ ${String(p.note).replace(".", ",")}` : ""}${p.note && p.ventes ? " · " : ""}${p.ventes ? `${fmtVentes(p.ventes)} vendus` : ""}</p>
      <p class="prix"><strong>${formatPrix(prixUnit())}</strong>${p.prix_promo ? `<del>${formatPrix(p.prix)}</del>` : ""}${reduc ? `<span class="promo-txt">-${reduc}%</span>` : ""}</p>
      ${rupture ? `<p class="stock-bas">⚠️ Article épuisé — réapprovisionnement bientôt.</p>`
        : Number(p.stock) <= 10 ? `<p class="stock-bas">🔥 Plus que ${p.stock} en stock</p>` : ""}

      ${tailles.length ? `
        <div class="bloc-tailles">
          <h4>Taille / Pointure</h4>
          <div class="tailles" id="tailles">${tailles.map((t, i) => `<button class="${i === 0 ? "actif" : ""}" data-t="${esc(t)}">${esc(t)}</button>`).join("")}</div>
        </div>` : ""}

      <div class="bloc-qte">
        <h4>Quantité</h4>
        <div class="qte-grand">
          <button id="qteMoins" aria-label="Moins">−</button>
          <strong id="qteVal">1</strong>
          <button id="qtePlus" aria-label="Plus">+</button>
        </div>
      </div>

      ${p.description ? `<p class="desc">${esc(p.description)}</p>` : ""}
      ${p.points?.length ? `<ul class="points">${p.points.map((x) => `<li>✓ ${esc(x)}</li>`).join("")}</ul>` : ""}

      <div class="garanties">
        <div>🚚<span>Livraison Abidjan & Agboville</span></div>
        <div>💵<span>Paiement à la livraison</span></div>
        <div>↩️<span>Retours 7 jours</span></div>
        <div>🏬<span>Retrait boutique gratuit</span></div>
      </div>

      ${similaires.length ? `
        <h2 class="titre-sim">Vous aimerez aussi</h2>
        <div class="similaires">${similaires.map((s) => `
          <a class="sim" href="produit.html?id=${encodeURIComponent(String(s.id))}">
            ${s.image_url ? `<img src="${esc(s.image_url)}" alt="${esc(s.nom)}" loading="lazy">` : `<span class="emoji">🛍️</span>`}
            <strong>${esc(s.nom)}</strong>
            <span class="prix">${formatPrix(s.prix_promo || s.prix)}</span>
          </a>`).join("")}</div>` : ""}
    </div>`;

  /* Interactions */
  zone.querySelector("#tailles")?.addEventListener("click", (e) => {
    const b = e.target.closest("button");
    if (!b) return;
    zone.querySelectorAll("#tailles button").forEach((x) => x.classList.toggle("actif", x === b));
    tailleChoisie = b.dataset.t;
  });
  const majQte = () => {
    zone.querySelector("#qteVal").textContent = qte;
    document.getElementById("totalAchat").textContent = formatPrix(prixUnit() * qte);
  };
  zone.querySelector("#qteMoins").addEventListener("click", () => { qte = Math.max(1, qte - 1); majQte(); });
  zone.querySelector("#qtePlus").addEventListener("click", () => { qte = Math.min(Math.max(Number(p.stock) || 99, 1), qte + 1); majQte(); });

  barre.hidden = rupture;
  majQte();
}

document.getElementById("btnAjouter").addEventListener("click", () => {
  if (Number(produit.stock) <= 0) { alert("⚠️ Cet article est épuisé."); return; }
  ajoutePanier({ id: String(produit.id), nom: produit.nom, prix: prixUnit(), taille: tailleChoisie, qte });
  majBadgePanier();
  majBadgeGlobal();
});

document.getElementById("btnAcheter").addEventListener("click", () => {
  if (Number(produit.stock) <= 0) { alert("⚠️ Cet article est épuisé."); return; }
  ajoutePanier({ id: String(produit.id), nom: produit.nom, prix: prixUnit(), taille: tailleChoisie, qte });
  majBadgeGlobal();
  location.href = "boutique.html";
});

charge();
majBadgePanier();
majBadgeGlobal();
