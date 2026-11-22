/* ==========================================================================
   TOUCH PRO — Accueil : départements, services, promos, produits, actus,
   galerie, témoignages. Données BDD en priorité, données démo en repli.
   ========================================================================== */

import { TP, DEPARTEMENTS, injecteChrome, animeReveals, formatPrix } from "./tp-config.js?v=17";
import { getSupabase } from "./supabaseClient.js?v=16";
import { PRODUITS_DEMO, PROMOS_DEMO, ACTUS_DEMO, AVIS_DEMO, SERVICES_DEMO } from "./tp-data.js?v=17";

injecteChrome("index.html");
document.getElementById("btnItineraire").href = TP.itineraire;

/* Service worker (PWA) */
if ("serviceWorker" in navigator && !location.pathname.startsWith("/admin")) {
  navigator.serviceWorker.register("/sw.js").catch(() => {});
}

/* ---------- Départements ---------- */
document.getElementById("grilleDepts").innerHTML = DEPARTEMENTS.map(d => `
  <a class="tp-dept" style="--dept-couleur:${d.couleur}" href="${d.url}">
    <div class="fond" style="background-image:url('${d.img}')"></div>
    <div class="txt">
      <span class="num">DÉPARTEMENT ${d.num} · ${d.icone}</span>
      <h3>TOUCH PRO ${d.nom}</h3>
      <p>${d.desc}</p>
      <span class="lien">Découvrir →</span>
    </div>
  </a>`).join("");

const esc = (s) => String(s ?? "").replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));

/* Affiche le contenu démo immédiatement, puis le remplace par les vraies données si la BDD répond */
async function charge(sel, requete, rendu, demo) {
  const zone = document.querySelector(sel);
  zone.innerHTML = demo.map(rendu).join("");
  try {
    const sb = await getSupabase();
    if (!sb) return;
    const { data: d, error } = await requete(sb);
    if (!error && d?.length) zone.innerHTML = d.map(rendu).join("");
  } catch { /* démo conservée */ }
}

/* ---------- Services populaires (BEAUTY) ---------- */
charge("#grilleServices",
  (sb) => sb.from("services").select("*").order("nom").limit(6),
  (s) => {
    const prix = s.prix_min != null
      ? (s.prix_max && s.prix_max !== s.prix_min ? `${formatPrix(s.prix_min)} – ${formatPrix(s.prix_max)}` : formatPrix(s.prix_min))
      : (s.prix != null ? formatPrix(s.prix) : "");
    return `<article class="tp-carte"><div class="corps">
      <span class="cat">💇 Beauty</span><h3>${esc(s.nom)}</h3>
      ${prix ? `<p class="tp-prix">${prix}</p>` : ""}
      <a class="btn btn-or" href="rendez-vous.html" style="align-self:flex-start;padding:.55rem 1.2rem;font-size:.85rem">Réserver</a>
    </div></article>`;
  },
  SERVICES_DEMO);

/* ---------- Promotions ---------- */
charge("#grillePromos",
  (sb) => sb.from("promotions").select("titre,description,image_url").order("id", { ascending: false }).limit(6),
  (p) => `
    <article class="tp-carte">
      ${p.image_url ? `<img class="visuel" src="${esc(p.image_url)}" alt="${esc(p.titre)}" loading="lazy">` : ""}
      <div class="corps"><span class="cat">🔥 Promotion</span><h3>${esc(p.titre)}</h3><p>${esc(p.description || "")}</p></div>
    </article>`,
  PROMOS_DEMO);

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
  PRODUITS_DEMO.slice(0, 4));

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
  ACTUS_DEMO);

/* ---------- Galerie photo ---------- */
const GALERIE = ["galerie-coupe.jpg", "galerie-fade-barbe.jpg", "galerie-tresses.jpg", "galerie-coloration.jpg", "galerie-coiffage-blond.jpg", "galerie-mariage.jpg"];
document.getElementById("galerieStrip").innerHTML = GALERIE.map(g =>
  `<a href="galerie.html"><img src="images/${g}" alt="Réalisation TOUCH PRO BEAUTY" loading="lazy"></a>`).join("");

/* ---------- Témoignages ---------- */
charge("#grilleAvis",
  (sb) => sb.from("avis").select("*").limit(3),
  (t) => `
    <blockquote class="tp-temoignage">
      <div class="tp-etoiles">${"★".repeat(t.note || 5)}</div>
      <p>« ${esc(t.message || t.texte || t.commentaire || "")} »</p>
      <strong>— ${esc(t.nom || t.client_nom || "Client·e")}</strong>
    </blockquote>`,
  AVIS_DEMO);

animeReveals();
