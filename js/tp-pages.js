/* ==========================================================================
   TOUCH PRO — Moteur partagé : panier, formulaires, rendus
   ========================================================================== */

import { TP, waLien, formatPrix, injecteChrome } from "./tp-config.js?v=16";
import { getSupabase } from "./supabaseClient.js?v=16";

export { TP, waLien, formatPrix, getSupabase };

export const esc = (s) => String(s ?? "").replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));

export function initPage(active) { injecteChrome(active); }

/* ============================ PANIER ============================ */
const CLE_PANIER = "tp_panier";

export function getPanier() {
  try { return JSON.parse(localStorage.getItem(CLE_PANIER)) || []; } catch { return []; }
}
function sauvePanier(p) { localStorage.setItem(CLE_PANIER, JSON.stringify(p)); majBadgePanier(); }

export function ajoutePanier(item) {
  const p = getPanier();
  const k = (i) => i.id + "|" + (i.taille || "");
  const ex = p.find((i) => k(i) === k(item));
  if (ex) ex.qte += item.qte || 1; else p.push({ qte: 1, ...item });
  sauvePanier(p);
  toast("Ajouté au panier 🛒");
}
export function retireDuPanier(cle) { sauvePanier(getPanier().filter((i) => (i.id + "|" + (i.taille || "")) !== cle)); }
export function changeQte(cle, d) {
  const p = getPanier();
  const it = p.find((i) => (i.id + "|" + (i.taille || "")) === cle);
  if (it) { it.qte = Math.max(1, it.qte + d); sauvePanier(p); }
}
export function videPanier() { sauvePanier([]); }
export function totalPanier() { return getPanier().reduce((t, i) => t + i.prix * i.qte, 0); }

export function majBadgePanier() {
  let b = document.getElementById("badgePanier");
  const n = getPanier().reduce((s, i) => s + i.qte, 0);
  if (!b) {
    b = document.createElement("a");
    b.id = "badgePanier";
    b.href = "boutique.html";
    b.style.cssText = "position:fixed;left:18px;bottom:18px;z-index:90;background:var(--or);color:#171310;border-radius:999px;padding:.6rem 1.1rem;font-weight:800;box-shadow:0 8px 30px rgba(214,169,79,.4);display:none";
    document.body.append(b);
  }
  b.textContent = `🛒 Panier · ${n}`;
  b.style.display = n > 0 ? "block" : "none";
}

/* ============================ ACCÈS MEMBRE ============================ */
/* La boutique est réservée aux membres : sans session, redirection vers
   l'inscription/connexion avec retour automatique après connexion.
   Base injoignable → navigation libre : jamais de page bloquée. */
export async function exigeCompte(retour) {
  let sb = null;
  try { sb = await Promise.race([getSupabase(), new Promise((_, r) => setTimeout(() => r(new Error("delai")), 3000))]); } catch { sb = null; }
  if (!sb) return true;
  try {
    const { data } = await Promise.race([sb.auth.getUser(), new Promise((_, r) => setTimeout(() => r(new Error("delai")), 3000))]);
    if (data?.user) return true;
  } catch { return true; }
  const page = (retour || location.pathname.split("/").pop() || "boutique.html") + location.search;
  location.replace("compte.html?mode=inscription&retour=" + encodeURIComponent(page));
  return false;
}

/* ============================ TOAST ============================ */
export function toast(msg) {
  const t = document.createElement("div");
  t.textContent = msg;
  t.style.cssText = "position:fixed;bottom:88px;left:50%;transform:translateX(-50%);background:#1d1913;border:1px solid var(--or);color:var(--blanc);padding:.7rem 1.3rem;border-radius:999px;z-index:99;font-size:.9rem;box-shadow:var(--ombre)";
  document.body.append(t);
  setTimeout(() => t.remove(), 2200);
}

/* ============================ FORMULAIRES ============================ */
export function nettoie(s, max = 500) { return String(s ?? "").replace(/[\u0000-\u001f<>]/g, "").trim().slice(0, max); }

export function alerte(zone, type, msg) {
  const z = typeof zone === "string" ? document.getElementById(zone) : zone;
  z.hidden = false;
  z.className = "alerte alerte-" + (type === "ok" ? "ok" : "err");
  z.textContent = msg;
  z.scrollIntoView({ behavior: "smooth", block: "center" });
}

export function boutonChargement(btn, actif) {
  btn.disabled = actif;
  if (actif) { btn.dataset.label = btn.textContent; btn.textContent = "Envoi en cours…"; }
  else if (btn.dataset.label) btn.textContent = btn.dataset.label;
}

/* Bouton WhatsApp prérempli après envoi réussi */
export function montreWA(zone, message, libelle = "💬 Confirmer par WhatsApp") {
  let b = zone.querySelector(".wa-suite");
  if (!b) {
    b = document.createElement("a");
    b.className = "btn btn-wa btn-bloc wa-suite";
    b.target = "_blank"; b.rel = "noopener";
    b.style.marginTop = ".8rem";
    zone.after(b);
  }
  b.href = waLien(message);
  b.textContent = libelle;
  b.hidden = false;
}

/* Session client courante (ou null) */
export async function clientCourant() {
  const sb = await getSupabase();
  if (!sb) return { sb: null, user: null };
  const { data } = await sb.auth.getUser();
  return { sb, user: data?.user || null };
}

/* ============================ RENDUS ============================ */
export function carteProduit(p) {
  const rupture = p.stock <= 0;
  const tailles = p.tailles ? p.tailles.split(",").map((t) => t.trim()).filter(Boolean) : [];
  return `
  <article class="tp-carte" data-id="${esc(String(p.id))}" data-nom="${esc(p.nom)}" data-prix="${p.prix_promo || p.prix}" data-stock="${Number(p.stock) || 0}">
    ${p.image_url ? `<img class="visuel" src="${esc(p.image_url)}" alt="${esc(p.nom)}" loading="lazy">` : `<div class="visuel" style="display:flex;align-items:center;justify-content:center;font-size:3rem">🛍️</div>`}
    <div class="corps">
      <h3>${esc(p.nom)}</h3>
      ${p.description ? `<p>${esc(p.description)}</p>` : ""}
      <p class="tp-prix">${p.prix_promo ? `<del>${formatPrix(p.prix)}</del>${formatPrix(p.prix_promo)}` : formatPrix(p.prix)}</p>
      ${tailles.length ? `<select class="sel-taille" style="background:var(--noir-3);color:var(--blanc);border:var(--bordure);border-radius:8px;padding:.4rem">${tailles.map((t) => `<option>${esc(t)}</option>`).join("")}</select>` : ""}
      <button class="btn ${rupture ? "btn-contour" : "btn-or"} btn-ajouter" ${rupture ? "disabled" : ""}>${rupture ? "Rupture de stock" : "🛒 Ajouter au panier"}</button>
    </div>
  </article>`;
}

/* Branche les boutons « Ajouter au panier » d'une grille */
export function branchePanier(grille) {
  grille.querySelectorAll(".tp-carte").forEach((carte) => {
    const btn = carte.querySelector(".btn-ajouter");
    if (!btn || btn.disabled) return;
    btn.addEventListener("click", () => {
      const { id, nom, prix, stock } = carte.dataset;
      if (Number(stock) <= 0) return;
      const taille = carte.querySelector(".sel-taille")?.value || null;
      ajoutePanier({ id, nom, prix: Number(prix), taille });
    });
  });
}

/* Affiche le catalogue démo immédiatement, puis le remplace par la BDD si disponible */
export async function chargeProduits(sel, departement = null) {
  const zone = document.querySelector(sel);
  const { PRODUITS_DEMO } = await import("./tp-data.js?v=20");
  const demo = departement ? PRODUITS_DEMO.filter((p) => p.departement === departement) : PRODUITS_DEMO;
  const rendu = (data) => {
    zone.innerHTML = data.length ? data.map(carteProduit).join("") : `<div class="tp-vide">Les produits arrivent très vite !</div>`;
    branchePanier(zone);
  };
  rendu(demo);
  try {
    const sb = await getSupabase();
    if (!sb) return;
    let q = sb.from("produits").select("*").eq("actif", true).order("id", { ascending: false });
    if (departement) q = q.eq("departement", departement);
    const { data: d, error } = await q;
    if (!error && d?.length) rendu(d);
  } catch { /* démo conservée */ }
}

/* Anti-spam : délai mini de remplissage */
export const pageChargeeLe = Date.now();
export function envoiTropRapide(ms = 2500) { return Date.now() - pageChargeeLe < ms; }
