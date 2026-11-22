/* ==========================================================================
   TOUCH PRO — Accueil : départements, promos, produits, actus, témoignages
   ========================================================================== */

import { TP, DEPARTEMENTS, injecteChrome, formatPrix } from "./tp-config.js?v=16";
import { getSupabase } from "./supabaseClient.js?v=16";

injecteChrome("index.html");
document.getElementById("btnItineraire").href = TP.itineraire;

/* Service worker (PWA) */
if ("serviceWorker" in navigator && !location.pathname.startsWith("/admin")) {
  navigator.serviceWorker.register("/sw.js").catch(() => {});
}

/* ---------- Départements (statiques) ---------- */
const grilleDepts = document.getElementById("grilleDepts");
grilleDepts.innerHTML = DEPARTEMENTS.map(d => `
  <a class="tp-dept reveal" style="--dept-couleur:${d.couleur}" href="${d.url}">
    <div class="fond" style="background-image:url('${d.img}')"></div>
    <div class="txt">
      <span class="num">DÉPARTEMENT ${d.num} · ${d.icone}</span>
      <h3>TOUCH PRO ${d.nom}</h3>
      <p>${d.desc}</p>
      <span class="lien">Découvrir →</span>
    </div>
  </a>`).join("");

const esc = (s) => String(s ?? "").replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
const vide = (msg) => `<div class="tp-vide">${msg}</div>`;

async function charge(sel, requete, rendu, msgVide) {
  const zone = document.querySelector(sel);
  const sb = await getSupabase();
  if (!sb) { zone.innerHTML = vide("Bientôt disponible."); return; }
  try {
    const { data, error } = await requete(sb);
    if (error) throw error;
    zone.innerHTML = (data && data.length) ? data.map(rendu).join("") : vide(msgVide);
  } catch {
    zone.innerHTML = vide("Bientôt disponible.");
  }
}

/* ---------- Promotions ---------- */
charge("#grillePromos",
  (sb) => sb.from("promotions").select("titre,description,image_url,departement").order("id", { ascending: false }).limit(6),
  (p) => `
    <article class="tp-carte">
      ${p.image_url ? `<img class="visuel" src="${esc(p.image_url)}" alt="${esc(p.titre)}" loading="lazy">` : ""}
      <div class="corps">
        <span class="cat">🔥 Promotion</span>
        <h3>${esc(p.titre)}</h3>
        <p>${esc(p.description || "")}</p>
      </div>
    </article>`,
  "Aucune promotion en cours — revenez vite !");

/* ---------- Produits populaires ---------- */
charge("#grilleProduits",
  (sb) => sb.from("produits").select("nom,prix,prix_promo,image_url,stock").eq("actif", true).order("id", { ascending: false }).limit(4),
  (p) => `
    <article class="tp-carte">
      ${p.image_url ? `<img class="visuel" src="${esc(p.image_url)}" alt="${esc(p.nom)}" loading="lazy">` : ""}
      <div class="corps">
        <h3>${esc(p.nom)}</h3>
        <p class="tp-prix">${p.prix_promo ? `<del>${formatPrix(p.prix)}</del>${formatPrix(p.prix_promo)}` : formatPrix(p.prix)}</p>
        <p>${p.stock > 0 ? "✅ En stock" : "❌ Rupture"}</p>
      </div>
    </article>`,
  "La boutique ouvre bientôt ses portes !");

/* ---------- Actualités ---------- */
charge("#grilleActus",
  (sb) => sb.from("publications").select("titre,texte,media_url,categorie,date_publication").order("date_publication", { ascending: false }).limit(3),
  (a) => `
    <article class="tp-carte">
      ${a.media_url ? `<img class="visuel" src="${esc(a.media_url)}" alt="${esc(a.titre)}" loading="lazy">` : ""}
      <div class="corps">
        <span class="cat">${esc(a.categorie)}</span>
        <h3>${esc(a.titre)}</h3>
        <p>${esc((a.texte || "").slice(0, 140))}${(a.texte || "").length > 140 ? "…" : ""}</p>
        <span class="date">📅 ${a.date_publication ? new Date(a.date_publication).toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" }) : ""}</span>
      </div>
    </article>`,
  "Les actualités arrivent bientôt !");

/* ---------- Témoignages (table avis existante) ---------- */
charge("#grilleAvis",
  (sb) => sb.from("avis").select("*").limit(3),
  (t) => `
    <blockquote class="tp-temoignage">
      <p>« ${esc(t.message || t.texte || t.commentaire || "")} »</p>
      <strong>— ${esc(t.nom || t.client_nom || "Client·e")}</strong>
    </blockquote>`,
  "Vos avis s'afficheront ici.");
