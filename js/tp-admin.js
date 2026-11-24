/* ==========================================================================
   TOUCH PRO — Tableau de bord administrateur
   Auth Supabase (compte présent dans table `admin`) + RLS côté base.
   ========================================================================== */

import { getSupabase } from "../js/supabaseClient.js?v=16";
import { DEPARTEMENTS, TP } from "../js/tp-config.js?v=17";
import { esc, formatPrix, alerte, boutonChargement, nettoie } from "../js/tp-pages.js?v=21";

let sb = null;

/* ============================ CONNEXION ============================ */
async function demarrage() {
  sb = await getSupabase();
  if (!sb) { alerte("alerteLogin", "err", "Base de données indisponible."); return; }
  const { data } = await sb.auth.getUser();
  if (data?.user) verifieAdmin(data.user);
}
demarrage();

document.getElementById("formLogin").addEventListener("submit", async (e) => {
  e.preventDefault();
  const btn = e.target.querySelector("button");
  boutonChargement(btn, true);
  const { data, error } = await sb.auth.signInWithPassword({
    email: e.target.email.value.trim(),
    password: e.target.password.value,
  });
  boutonChargement(btn, false);
  if (error) { alerte("alerteLogin", "err", "Identifiants incorrects."); return; }
  verifieAdmin(data.user);
});

async function verifieAdmin(user) {
  const { data } = await sb.from("admin").select("email").eq("email", user.email).maybeSingle();
  if (!data) {
    alerte("alerteLogin", "err", "Ce compte n'est pas administrateur.");
    await sb.auth.signOut();
    return;
  }
  document.getElementById("zoneLogin").hidden = true;
  document.getElementById("zoneAdmin").hidden = false;
  chargeKPIs();
  montreTab("commandes");
}

document.getElementById("btnOut").addEventListener("click", async () => { await sb.auth.signOut(); location.reload(); });

/* ============================ KPI ============================ */
async function compte(table, filtre = null) {
  let q = sb.from(table).select("id", { count: "exact", head: true });
  if (q && filtresOk(filtre)) q = filtre(q);
  const { count, error } = await q;
  return error ? "—" : (count ?? 0);
}
const filtresOk = (f) => typeof f === "function";

async function chargeKPIs() {
  const kpi = document.getElementById("kpi");
  kpi.innerHTML = `<div><b>…</b><span>Chargement</span></div>`;
  const [cmds, attente, rdv, repas, encours, prods, rupture, publi, devis] = await Promise.all([
    compte("commandes"), compte("commandes", q => q.eq("statut", "en_attente")),
    compte("rendez_vous", q => q.eq("statut", "en_attente")),
    compte("reparations"), compte("reparations", q => q.in("statut", ["recu", "diagnostic", "en_cours"])),
    compte("produits", q => q.eq("actif", true)), compte("produits", q => q.eq("stock", 0)),
    compte("publications", q => q.eq("statut", "publie")), compte("devis", q => q.eq("statut", "en_attente")),
  ]);
  kpi.innerHTML = [
    [cmds, "Commandes"], [attente, "à traiter"], [rdv, "RDV en attente"],
    [repas, "Réparations"], [encours, "en cours"], [prods, "Produits"],
    [rupture, "ruptures"], [publi, "Publications"], [devis, "Devis en attente"],
  ].map(([v, l]) => `<div><b>${v}</b><span>${l}</span></div>`).join("");
}

/* ============================ ONGLETS ============================ */
const TABS = [
  ["commandes", "🛒 Commandes"], ["reparations", "📱 Réparations"], ["devis", "🎨 Devis"],
  ["produits", "🏷️ Produits"], ["publications", "📰 Publications"], ["promotions", "🔥 Promotions"],
  ["infos", "📇 Infos entreprise"],
];
const tabs = document.getElementById("tabs");
tabs.innerHTML = TABS.map(([id, l]) => `<button data-tab="${id}">${l}</button>`).join("");
tabs.addEventListener("click", (e) => {
  const b = e.target.closest("button"); if (!b) return;
  montreTab(b.dataset.tab);
});

const STATUTS_CMD = ["en_attente", "confirmee", "prete", "livree", "annulee"];
const STATUTS_REPA = ["recu", "diagnostic", "en_cours", "pret", "livre", "annule"];
const STATUTS_DEVIS = ["en_attente", "envoye", "accepte", "refuse"];
const STATUTS_PUB = ["brouillon", "publie", "programme", "archive"];
const CATEGORIES_PUB = ["Actualités de l'entreprise", "Promotions et offres spéciales", "Nouveautés", "Produits disponibles", "Réalisations", "Coiffure et beauté", "Réparation de téléphones", "Accessoires", "Mode et vêtements", "Création digitale", "Annonces importantes"];

async function montreTab(id) {
  tabs.querySelectorAll("button").forEach(b => b.classList.toggle("actif", b.dataset.tab === id));
  const zone = document.getElementById("contenuTab");
  zone.innerHTML = `<div class="tp-vide">Chargement…</div>`;
  await ({ commandes, reparations, devis, produits, publications, promotions, infos })[id]();
  chargeKPIs();
}

const selectStatut = (id, val, liste, cls) =>
  `<select data-id="${id}" class="${cls}">${liste.map(s => `<option ${s === val ? "selected" : ""}>${s}</option>`).join("")}</select>`;
const ligneDate = (d) => new Date(d).toLocaleDateString("fr-FR", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" });

/* ============================ COMMANDES ============================ */
async function commandes() {
  const zone = document.getElementById("contenuTab");
  const { data } = await sb.from("commandes").select("*").order("id", { ascending: false }).limit(100);
  if (!data?.length) { zone.innerHTML = `<div class="tp-vide">Aucune commande pour le moment.</div>`; return; }
  zone.innerHTML = `<div style="overflow-x:auto"><table class="tp-table">
    <tr><th>N°</th><th>Client</th><th>Total</th><th>Récupération</th><th>Statut</th><th>Date</th><th></th></tr>
    ${data.map(c => `<tr>
      <td>#${c.id}</td>
      <td><strong>${esc(c.client_nom)}</strong><br><small>${esc(c.client_telephone)}</strong></small></td>
      <td>${formatPrix(c.total)}</td>
      <td>${c.livraison === "livraison" ? "🚚 " + esc(c.adresse_livraison || "") : "🏪 Boutique"}</td>
      <td>${selectStatut(c.id, c.statut, STATUTS_CMD, "sel-cmd")}</td>
      <td><small>${ligneDate(c.created_at)}</small></td>
      <td class="actions"><a class="btn btn-wa" style="padding:.35rem .7rem;font-size:.78rem" target="_blank" rel="noopener"
        href="https://wa.me/225${esc(c.client_telephone.replace(/\D/g, "").replace(/^0+/, "").replace(/^225/, ""))}?text=${encodeURIComponent("Bonjour " + c.client_nom + ", votre commande #" + c.id + " TOUCH PRO :")}">💬</a></td>
    </tr>`).join("")}</table></div>`;
}

/* ============================ RÉPARATIONS ============================ */
async function reparations() {
  const zone = document.getElementById("contenuTab");
  const { data } = await sb.from("reparations").select("*").order("id", { ascending: false }).limit(100);
  if (!data?.length) { zone.innerHTML = `<div class="tp-vide">Aucune réparation.</div>`; return; }
  zone.innerHTML = `<div style="overflow-x:auto"><table class="tp-table">
    <tr><th>Suivi</th><th>Client</th><th>Appareil / panne</th><th>Devis (FCFA)</th><th>Statut</th><th>Date</th></tr>
    ${data.map(r => `<tr>
      <td>TP-TECH-${r.id}</td>
      <td><strong>${esc(r.client_nom)}</strong><br><small>${esc(r.client_telephone)}</small></td>
      <td>${esc(r.appareil)}<br><small style="color:#b3a78f">${esc((r.panne || "").slice(0, 60))}</small></td>
      <td><input type="number" min="0" value="${r.devis_montant ?? ""}" data-id="${r.id}" class="inp-devis" style="width:110px" placeholder="—"></td>
      <td>${selectStatut(r.id, r.statut, STATUTS_REPA, "sel-repa")}</td>
      <td><small>${ligneDate(r.created_at)}</small></td>
    </tr>`).join("")}</table></div>
    <p style="color:#b3a78f;font-size:.8rem;margin-top:.6rem">Les changements de statut et devis sont enregistrés automatiquement — le client voit l'évolution dans « Mon compte ».</p>`;
}

/* ============================ DEVIS ============================ */
async function devis() {
  const zone = document.getElementById("contenuTab");
  const { data } = await sb.from("devis").select("*").order("id", { ascending: false }).limit(100);
  if (!data?.length) { zone.innerHTML = `<div class="tp-vide">Aucune demande de devis.</div>`; return; }
  zone.innerHTML = `<div style="overflow-x:auto"><table class="tp-table">
    <tr><th>Client</th><th>Service</th><th>Projet</th><th>Budget</th><th>Statut</th><th>Date</th></tr>
    ${data.map(d => `<tr>
      <td><strong>${esc(d.nom)}</strong><br><small>${esc(d.telephone || "")} ${esc(d.email || "")}</small></td>
      <td>${esc(d.service)}</td>
      <td><small>${esc((d.description || "").slice(0, 80))}</small></td>
      <td>${d.budget ? formatPrix(d.budget) : "—"}</td>
      <td>${selectStatut(d.id, d.statut, STATUTS_DEVIS, "sel-devis")}</td>
      <td><small>${ligneDate(d.created_at)}</small></td>
    </tr>`).join("")}</table></div>`;
}

/* ============================ PRODUITS ============================ */
async function produits() {
  const zone = document.getElementById("contenuTab");
  const { data } = await sb.from("produits").select("*").order("id", { ascending: false });
  zone.innerHTML = `
    <form id="formProduit" class="form-tp" style="max-width:none;margin-bottom:2rem;background:#14110c;padding:1.2rem;border-radius:14px;border:1px solid rgba(214,169,79,.25)">
      <h3 style="color:var(--tp-or);margin-bottom:.6rem">➕ Nouveau produit</h3>
      <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(150px,1fr));gap:.7rem">
        <input name="nom" placeholder="Nom *" required>
        <select name="departement">${DEPARTEMENTS.map(d => `<option value="${d.code}">${d.icone} ${d.nom}</option>`).join("")}</select>
        <input name="prix" type="number" min="0" placeholder="Prix FCFA *" required>
        <input name="prix_promo" type="number" min="0" placeholder="Prix promo">
        <input name="stock" type="number" min="0" placeholder="Stock *" required>
        <input name="tailles" placeholder="Tailles (S,M,L)">
        <input name="image_url" placeholder="URL image">
      </div>
      <textarea name="description" placeholder="Description" rows="2" style="margin-top:.7rem"></textarea>
      <button class="btn btn-or" style="margin-top:.9rem">Enregistrer le produit</button>
    </form>
    <div style="overflow-x:auto"><table class="tp-table">
      <tr><th>Produit</th><th>Dép.</th><th>Prix</th><th>Stock</th><th>Visible</th><th></th></tr>
      ${(data || []).map(p => `<tr>
        <td><strong>${esc(p.nom)}</strong></td><td>${esc(p.departement || "")}</td>
        <td>${formatPrix(p.prix)}${p.prix_promo ? ` → <b style="color:var(--tp-or)">${formatPrix(p.prix_promo)}</b>` : ""}</td>
        <td><input type="number" min="0" value="${p.stock}" data-id="${p.id}" class="inp-stock" style="width:80px"></td>
        <td><input type="checkbox" ${p.actif ? "checked" : ""} data-id="${p.id}" class="chk-actif"></td>
        <td class="actions"><button class="btn btn-contour btn-suppr" data-id="${p.id}">🗑</button></td>
      </tr>`).join("") || `<tr><td colspan="6" style="color:#b3a78f">Aucun produit.</td></tr>`}
    </table></div>`;

  document.getElementById("formProduit").addEventListener("submit", async (e) => {
    e.preventDefault();
    const f = e.target;
    const { error } = await sb.from("produits").insert({
      nom: nettoie(f.nom.value, 100), departement: f.departement.value,
      prix: parseInt(f.prix.value, 10) || 0,
      prix_promo: f.prix_promo.value ? parseInt(f.prix_promo.value, 10) : null,
      stock: parseInt(f.stock.value, 10) || 0,
      tailles: nettoie(f.tailles.value, 60) || null,
      image_url: nettoie(f.image_url.value, 300) || null,
      description: nettoie(f.description.value, 500) || null,
    });
    if (error) { alert("Erreur : " + error.message); return; }
    montreTab("produits");
  });
}

/* ============================ PUBLICATIONS ============================ */
async function publications() {
  const zone = document.getElementById("contenuTab");
  const { data } = await sb.from("publications").select("*").order("id", { ascending: false });
  zone.innerHTML = `
    <form id="formPub" class="form-tp" style="max-width:none;margin-bottom:2rem;background:#14110c;padding:1.2rem;border-radius:14px;border:1px solid rgba(214,169,79,.25)">
      <h3 style="color:var(--tp-or);margin-bottom:.6rem">📰 Nouvelle publication</h3>
      <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(170px,1fr));gap:.7rem">
        <input name="titre" placeholder="Titre *" required>
        <select name="categorie">${CATEGORIES_PUB.map(c => `<option>${c}</option>`).join("")}</select>
        <select name="departement"><option value="">— Aucun département —</option>${DEPARTEMENTS.map(d => `<option value="${d.code}">${d.icone} ${d.nom}</option>`).join("")}</select>
        <input name="media_url" placeholder="URL image ou vidéo">
        <select name="media_type"><option value="image">Image</option><option value="video">Vidéo</option><option value="affiche">Affiche</option></select>
        <input name="date_publication" type="datetime-local" title="Date de publication (vide = maintenant)">
      </div>
      <textarea name="texte" placeholder="Texte de la publication…" rows="3" style="margin-top:.7rem"></textarea>
      <div style="display:flex;gap:.6rem;margin-top:.9rem;flex-wrap:wrap">
        <button class="btn btn-or" data-statut="publie">✅ Publier maintenant</button>
        <button class="btn btn-bleu" data-statut="programme" type="submit">🕒 Programmer</button>
        <button class="btn btn-contour" data-statut="brouillon" type="submit">📝 Brouillon</button>
      </div>
    </form>
    <div style="overflow-x:auto"><table class="tp-table">
      <tr><th>Titre</th><th>Catégorie</th><th>Statut</th><th>Date publi</th><th></th></tr>
      ${(data || []).map(p => `<tr>
        <td><strong>${esc(p.titre)}</strong></td><td><small>${esc(p.categorie)}</small></td>
        <td>${selectStatut(p.id, p.statut, STATUTS_PUB, "sel-pub")}</td>
        <td><small>${p.date_publication ? ligneDate(p.date_publication) : "—"}</small></td>
        <td class="actions"><button class="btn btn-contour btn-suppr-pub" data-id="${p.id}">🗑</button></td>
      </tr>`).join("") || `<tr><td colspan="5" style="color:#b3a78f">Aucune publication.</td></tr>`}
    </table></div>`;

  document.getElementById("formPub").addEventListener("submit", async (e) => {
    e.preventDefault();
    const f = e.target;
    const statut = e.submitter?.dataset.statut || "brouillon";
    const { error } = await sb.from("publications").insert({
      titre: nettoie(f.titre.value, 140), texte: nettoie(f.texte.value, 2000) || null,
      categorie: f.categorie.value, departement: f.departement.value || null,
      media_url: nettoie(f.media_url.value, 300) || null, media_type: f.media_type.value,
      statut,
      date_publication: statut === "publie" ? new Date().toISOString() : (f.date_publication.value ? new Date(f.date_publication.value).toISOString() : null),
    });
    if (error) { alert("Erreur : " + error.message); return; }
    montreTab("publications");
  });
}

/* ============================ PROMOTIONS ============================ */
async function promotions() {
  const zone = document.getElementById("contenuTab");
  const { data } = await sb.from("promotions").select("*").order("id", { ascending: false });
  zone.innerHTML = `
    <form id="formPromo" class="form-tp" style="max-width:none;margin-bottom:2rem;background:#14110c;padding:1.2rem;border-radius:14px;border:1px solid rgba(214,169,79,.25)">
      <h3 style="color:var(--tp-or);margin-bottom:.6rem">🔥 Nouvelle promotion</h3>
      <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(170px,1fr));gap:.7rem">
        <input name="titre" placeholder="Titre *" required>
        <select name="departement"><option value="">— Tous —</option>${DEPARTEMENTS.map(d => `<option value="${d.code}">${d.icone} ${d.nom}</option>`).join("")}</select>
        <input name="image_url" placeholder="URL image">
        <input name="date_debut" type="date"><input name="date_fin" type="date">
      </div>
      <textarea name="description" placeholder="Description" rows="2" style="margin-top:.7rem"></textarea>
      <button class="btn btn-or" style="margin-top:.9rem">Publier la promotion</button>
    </form>
    <div style="overflow-x:auto"><table class="tp-table">
      <tr><th>Titre</th><th>Période</th><th>Active</th><th></th></tr>
      ${(data || []).map(p => `<tr>
        <td><strong>${esc(p.titre)}</strong><br><small style="color:#b3a78f">${esc(p.description || "")}</small></td>
        <td><small>${p.date_debut || "…"} → ${p.date_fin || "…"}</small></td>
        <td><input type="checkbox" ${p.actif ? "checked" : ""} data-id="${p.id}" class="chk-promo"></td>
        <td class="actions"><button class="btn btn-contour btn-suppr-promo" data-id="${p.id}">🗑</button></td>
      </tr>`).join("") || `<tr><td colspan="4" style="color:#b3a78f">Aucune promotion.</td></tr>`}
    </table></div>`;

  document.getElementById("formPromo").addEventListener("submit", async (e) => {
    e.preventDefault();
    const f = e.target;
    const { error } = await sb.from("promotions").insert({
      titre: nettoie(f.titre.value, 140), description: nettoie(f.description.value, 500) || null,
      departement: f.departement.value || null, image_url: nettoie(f.image_url.value, 300) || null,
      date_debut: f.date_debut.value || null, date_fin: f.date_fin.value || null,
    });
    if (error) { alert("Erreur : " + error.message); return; }
    montreTab("promotions");
  });
}

/* ============================ INFOS ENTREPRISE ============================ */
async function infos() {
  const zone = document.getElementById("contenuTab");
  const { data: i } = await sb.from("infos_entreprise").select("*").eq("id", true).maybeSingle();
  const h = i?.horaires || {};
  zone.innerHTML = `
    <form id="formInfos" class="form-tp" style="max-width:none;background:#14110c;padding:1.2rem;border-radius:14px;border:1px solid rgba(214,169,79,.25)">
      <h3 style="color:var(--tp-or);margin-bottom:.6rem">📇 Informations & carte de visite</h3>
      <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(200px,1fr));gap:.7rem">
        <input name="nom" value="${esc(i?.nom || TP.nom)}" placeholder="Nom">
        <input name="whatsapp" value="${esc(i?.whatsapp || TP.whatsapp)}" placeholder="WhatsApp (225…)" >
        <input name="telephone" value="${esc(i?.telephone || TP.telephone)}" placeholder="Téléphone affiché">
        <input name="adresse" value="${esc(i?.adresse || TP.adresse)}" placeholder="Adresse">
        <input name="horaires" value="${esc(Object.entries(h).map(([j, v]) => `${j}: ${v}`).join(" | "))}" placeholder="Horaires : Lun-Sam: 08h-20h | Dim: fermé">
      </div>
      <textarea name="slogan" rows="2" style="margin-top:.7rem">${esc(i?.slogan || TP.slogan)}</textarea>
      <textarea name="description" rows="2" style="margin-top:.7rem" placeholder="Description de l'entreprise">${esc(i?.description || "")}</textarea>
      <button class="btn btn-or" style="margin-top:.9rem">💾 Enregistrer (répercuté sur la carte de visite)</button>
    </form>`;
  document.getElementById("formInfos").addEventListener("submit", async (e) => {
    e.preventDefault();
    const f = e.target;
    const horaires = {};
    f.horaires.value.split("|").forEach(part => {
      const [j, v] = part.split(":").map(s => s?.trim());
      if (j && v) horaires[j] = v;
    });
    const { error } = await sb.from("infos_entreprise").upsert({
      id: true, nom: nettoie(f.nom.value, 60), whatsapp: nettoie(f.whatsapp.value, 20),
      telephone: nettoie(f.telephone.value, 20), adresse: nettoie(f.adresse.value, 200),
      slogan: nettoie(f.slogan.value, 200), description: nettoie(f.description.value, 500),
      horaires,
    });
    alert(error ? "Erreur : " + error.message : "✅ Informations enregistrées !");
  });
}

/* ============================ ACTIONS DÉLÉGUÉES ============================ */
document.getElementById("contenuTab").addEventListener("change", async (e) => {
  const t = e.target, id = t.dataset.id;
  if (!id) return;
  try {
    if (t.classList.contains("sel-cmd")) await sb.from("commandes").update({ statut: t.value }).eq("id", id);
    if (t.classList.contains("sel-repa")) await sb.from("reparations").update({ statut: t.value, updated_at: new Date().toISOString() }).eq("id", id);
    if (t.classList.contains("sel-devis")) await sb.from("devis").update({ statut: t.value }).eq("id", id);
    if (t.classList.contains("sel-pub")) await sb.from("publications").update({ statut: t.value, ...(t.value === "publie" ? { date_publication: new Date().toISOString() } : {}) }).eq("id", id);
    if (t.classList.contains("inp-devis")) await sb.from("reparations").update({ devis_montant: t.value ? parseInt(t.value, 10) : null }).eq("id", id);
    if (t.classList.contains("inp-stock")) await sb.from("produits").update({ stock: parseInt(t.value, 10) || 0 }).eq("id", id);
    if (t.classList.contains("chk-actif")) await sb.from("produits").update({ actif: t.checked }).eq("id", id);
    if (t.classList.contains("chk-promo")) await sb.from("promotions").update({ actif: t.checked }).eq("id", id);
    chargeKPIs();
  } catch { alert("Enregistrement impossible (droits admin requis)."); }
});

document.getElementById("contenuTab").addEventListener("click", async (e) => {
  const b = e.target.closest("button"); if (!b) return;
  if (b.classList.contains("btn-suppr") && confirm("Supprimer ce produit ?")) { await sb.from("produits").delete().eq("id", b.dataset.id); montreTab("produits"); }
  if (b.classList.contains("btn-suppr-pub") && confirm("Supprimer cette publication ?")) { await sb.from("publications").delete().eq("id", b.dataset.id); montreTab("publications"); }
  if (b.classList.contains("btn-suppr-promo") && confirm("Supprimer cette promotion ?")) { await sb.from("promotions").delete().eq("id", b.dataset.id); montreTab("promotions"); }
});
