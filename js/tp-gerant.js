/* ==========================================================================
   TOUCH PRO — Espace Gérant (modèle Yves Store)
   Tableau de bord, commandes, clients, produits & prix, stock, avis.
   ========================================================================== */

import { getSupabase } from "../js/supabaseClient.js?v=16";
import { CATEGORIES_BOUTIQUE } from "../js/tp-config.js?v=19";
import { esc, formatPrix, alerte, boutonChargement } from "../js/tp-pages.js?v=21";

const $ = (id) => document.getElementById(id);
const RAYONS = CATEGORIES_BOUTIQUE.filter((c) => c.code);
const nomRayon = (code) => CATEGORIES_BOUTIQUE.find((c) => c.code === code)?.nom || code || "—";
const STATUTS_CMD = { en_attente: "Nouvelle", confirmee: "En préparation", prete: "Prête", livree: "Livrée", annulee: "Annulée" };
const ETAG_STATUT = { en_attente: "bleu", confirmee: "or", prete: "or", livree: "vert", annulee: "rouge" };

let sb = null;
const cache = { commandes: null, items: null, clients: null, produits: null, avis: null, admins: null };

/* ============================ OUTILS ============================ */
const fmtDate = (iso) => new Date(iso).toLocaleDateString("fr-FR", { day: "numeric", month: "short" })
  + ", " + new Date(iso).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" });
const fmtJour = (iso) => new Date(iso).toLocaleDateString("fr-FR", { weekday: "short", day: "numeric" });
const cleJour = (iso) => iso.slice(0, 10);
const cleMois = (iso) => iso.slice(0, 7);

function debutPeriode(p) {
  const d = new Date(); d.setHours(0, 0, 0, 0);
  if (p === "jour") return d;
  if (p === "7j") { d.setDate(d.getDate() - 6); return d; }
  if (p === "30j") { d.setDate(d.getDate() - 29); return d; }
  return null; // debut / tout
}

function exportCSV(nom, entetes, lignes) {
  const csv = [entetes, ...lignes]
    .map((l) => l.map((c) => `"${String(c ?? "").replace(/"/g, '""')}"`).join(";")).join("\r\n");
  const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = nom;
  a.click();
  URL.revokeObjectURL(a.href);
}

/* Graphique en barres SVG (aucune librairie) */
function graphBarres(el, detailEl, series) {
  const W = 340, H = 150, PAD = 6;
  const max = Math.max(1, ...series.flatMap((s) => [s.v1 || 0, s.v2 || 0]));
  const n = series.length, slot = (W - 2 * PAD) / n, bw = Math.min(series[0]?.v2 !== undefined ? slot / 2 - 2 : slot - 4, 26);
  let svg = `<svg viewBox="0 0 ${W} ${H}" style="width:100%;height:auto;display:block">`;
  series.forEach((s, i) => {
    const x = PAD + i * slot + (slot - (s.v2 !== undefined ? bw * 2 + 2 : bw)) / 2;
    const h1 = Math.max(s.v1 ? 3 : 0, (s.v1 / max) * (H - 34));
    svg += `<rect class="barre" data-i="${i}" x="${x}" y="${H - 20 - h1}" width="${bw}" height="${h1}" rx="3" fill="var(--or,#d6a94f)" opacity="${s.estompe ? ".45" : "1"}"><title>${esc(s.info || "")}</title></rect>`;
    if (s.v2 !== undefined) {
      const h2 = Math.max(s.v2 ? 3 : 0, (s.v2 / max) * (H - 20));
      svg += `<rect class="barre" data-i="${i}" x="${x + bw + 2}" y="${H - 20 - h2}" width="${bw}" height="${h2}" rx="3" fill="#d6783c"><title>${esc(s.info || "")}</title></rect>`;
    }
    if (n <= 12 || i % Math.ceil(n / 10) === 0) {
      svg += `<text x="${PAD + i * slot + slot / 2}" y="${H - 6}" text-anchor="middle" font-size="9" fill="#9a917e">${esc(s.label)}</text>`;
    }
  });
  svg += `<line x1="${PAD}" y1="${H - 20}" x2="${W - PAD}" y2="${H - 20}" stroke="rgba(214,169,79,.25)" /></svg>`;
  el.innerHTML = svg;
  el.querySelectorAll(".barre").forEach((b) => b.addEventListener("click", () => {
    detailEl.textContent = series[+b.dataset.i]?.info || "";
  }));
}

/* ============================ CONNEXION ============================ */
async function demarrage() {
  sb = await getSupabase();
  if (!sb) { alerte("alerteLogin", "err", "Base de données indisponible."); return; }
  const { data } = await sb.auth.getSession();
  if (data?.session?.user) verifieAdmin();
}
demarrage();

$("formLogin").addEventListener("submit", async (e) => {
  e.preventDefault();
  const btn = e.target.querySelector("button");
  boutonChargement(btn, true);
  const { error } = await sb.auth.signInWithPassword({
    email: e.target.email.value.trim(), password: e.target.motdepasse.value,
  });
  boutonChargement(btn, false);
  if (error) { alerte("alerteLogin", "err", "Identifiants incorrects."); return; }
  verifieAdmin();
});

async function verifieAdmin() {
  const { data: adm, error } = await sb.rpc("is_admin");
  if (error || adm !== true) {
    alerte("alerteLogin", "err", "Ce compte n'est pas administrateur.");
    await sb.auth.signOut();
    return;
  }
  $("zoneLogin").hidden = true;
  $("zoneAdmin").hidden = false;
  initOnglets();
  chargeBord();
}

$("btnOut").addEventListener("click", async () => { await sb.auth.signOut(); location.reload(); });

/* ============================ ONGLETS ============================ */
const CHARGEURS = { bord: () => chargeBord(), commandes: () => chargeCmd(), clients: () => chargeClients(), produits: () => chargeProd(), stock: () => chargeStock(), avis: () => chargeAvis() };
const DEJA_CHARGE = {};

function initOnglets() {
  // Remplit les selects de rayons
  const opts = RAYONS.map((r) => `<option value="${r.code}">${r.icone} ${r.nom}</option>`).join("");
  $("ajoutRayon").innerHTML = opts;
  $("selRayon").innerHTML = `<option value="">Toutes catégories</option>` + opts;
  $("gtabs").addEventListener("click", (e) => {
    const b = e.target.closest("button[data-tab]");
    if (!b) return;
    $("gtabs").querySelectorAll("button").forEach((x) => x.classList.toggle("actif", x === b));
    document.querySelectorAll("[id^='tab-']").forEach((s) => (s.hidden = s.id !== "tab-" + b.dataset.tab));
    CHARGEURS[b.dataset.tab]();
  });
}

/* ============================ TABLEAU DE BORD ============================ */
let periodeBord = "7j";
$("periodesBord").addEventListener("click", (e) => {
  const b = e.target.closest("button[data-p]");
  if (!b) return;
  periodeBord = b.dataset.p;
  $("periodesBord").querySelectorAll("button").forEach((x) => x.classList.toggle("actif", x === b));
  chargeBord();
});

async function chargeBord() {
  const debut = debutPeriode(periodeBord);
  let qc = sb.from("commandes").select("id,total,statut,created_at");
  let qm = sb.from("mouvements_stock").select("type,quantite,motif,created_at");
  let qp = sb.from("profils_clients").select("id", { count: "exact", head: true });
  if (debut) {
    qc = qc.gte("created_at", debut.toISOString());
    qm = qm.gte("created_at", debut.toISOString());
    qp = qp.gte("created_at", debut.toISOString());
  }
  const [{ data: cmds }, { data: mvs }, { data: prods }, { count: inscrits }, { count: totalInscrits }] = await Promise.all([
    qc, qm, sb.from("produits").select("stock,prix,prix_promo,actif"), qp,
    sb.from("profils_clients").select("id", { count: "exact", head: true }),
  ]);

  const valides = (cmds || []).filter((c) => c.statut !== "annulee");
  const ca = valides.reduce((s, c) => s + (c.total || 0), 0);
  const annulees = (cmds || []).filter((c) => c.statut === "annulee").length;
  const livrees = (cmds || []).filter((c) => c.statut === "livree").length;
  const sorties = (mvs || []).filter((m) => m.type === "sortie");
  const entrees = (mvs || []).filter((m) => m.type === "entree");
  const somme = (l) => l.reduce((s, m) => s + m.quantite, 0);
  const vendus = somme(sorties.filter((m) => (m.motif || "").startsWith("Commande")));
  const actifs = (prods || []).filter((p) => p.actif);
  const stockTotal = actifs.reduce((s, p) => s + (p.stock || 0), 0);
  const valeurStock = actifs.reduce((s, p) => s + (p.prix_promo || p.prix || 0) * (p.stock || 0), 0);

  $("cartesBord1").innerHTML = [
    [`${formatPrix(ca)}`, "CHIFFRE D'AFFAIRES", "💵", "", "Hors commandes annulées"],
    [`${valides.length}`, "COMMANDES REÇUES", "🧾", "vert", `${livrees} livrée(s)`],
    [`${formatPrix(valides.length ? Math.round(ca / valides.length) : 0)}`, "PANIER MOYEN", "👛", "", ""],
    [`${annulees}`, "ANNULÉES", "🚫", "rouge", ""],
  ].map(carteStat).join("");

  $("cartesBord2").innerHTML = [
    [`${somme(sorties)}`, "ARTICLES SORTIS", "📤", "", `dont ${vendus} vendus (net)`],
    [`${somme(entrees)}`, "ARTICLES ENTRÉS", "📥", "vert", "Réceptions + retours"],
    [`${stockTotal}`, "STOCK DISPONIBLE", "📦", "", `Valeur de vente : ${formatPrix(valeurStock)}`],
    [`${inscrits ?? 0}`, "NOUVEAUX INSCRITS", "👤", "", `${totalInscrits ?? 0} inscrits au total`],
  ].map(carteStat).join("");

  // Graphique CA
  const parJour = periodeBord !== "debut";
  const groupes = {};
  valides.forEach((c) => {
    const cle = parJour ? cleJour(c.created_at) : cleMois(c.created_at);
    groupes[cle] = (groupes[cle] || 0) + (c.total || 0);
  });
  const series = [];
  if (parJour) {
    const n = periodeBord === "jour" ? 1 : periodeBord === "7j" ? 7 : 30;
    for (let i = n - 1; i >= 0; i--) {
      const d = new Date(); d.setHours(0, 0, 0, 0); d.setDate(d.getDate() - i);
      const cle = d.toISOString().slice(0, 10);
      series.push({ label: n > 1 ? d.toLocaleDateString("fr-FR", { weekday: n <= 7 ? "short" : undefined, day: "numeric" }).replace(".", "") : "Aujourd'hui", v1: groupes[cle] || 0, info: `${n > 1 ? fmtJour(d.toISOString()) : "Aujourd'hui"} : ${formatPrix(groupes[cle] || 0)}` });
    }
  } else {
    const cles = Object.keys(groupes).sort();
    cles.forEach((cle) => {
      const [a, m] = cle.split("-");
      const nom = new Date(a, m - 1).toLocaleDateString("fr-FR", { month: "short", year: n_an(cles) > 6 ? "2-digit" : undefined });
      series.push({ label: nom, v1: groupes[cle], info: `${nom} : ${formatPrix(groupes[cle])}` });
    });
    if (!series.length) series.push({ label: "—", v1: 0, info: "Aucune commande" });
  }
  graphBarres($("graphCA"), $("detailCA"), series);
  $("detailCA").textContent = `Période : ${formatPrix(ca)} — ${valides.length} commande(s). Touchez une barre pour le détail.`;

  // Graphique mouvements
  const seriesS = [];
  const nS = periodeBord === "jour" ? 1 : periodeBord === "7j" ? 7 : 30;
  const gE = {}, gS = {};
  (mvs || []).forEach((m) => {
    const cle = parJour ? cleJour(m.created_at) : cleMois(m.created_at);
    if (m.type === "entree") gE[cle] = (gE[cle] || 0) + m.quantite; else gS[cle] = (gS[cle] || 0) + m.quantite;
  });
  if (parJour) {
    for (let i = nS - 1; i >= 0; i--) {
      const d = new Date(); d.setHours(0, 0, 0, 0); d.setDate(d.getDate() - i);
      const cle = d.toISOString().slice(0, 10);
      seriesS.push({ label: d.toLocaleDateString("fr-FR", { day: "numeric", weekday: nS <= 7 ? "short" : undefined }), v1: gE[cle] || 0, v2: gS[cle] || 0, info: `${fmtJour(d.toISOString())} : +${gE[cle] || 0} entrés / −${gS[cle] || 0} sortis` });
    }
  } else {
    Object.keys({ ...gE, ...gS }).sort().forEach((cle) => {
      seriesS.push({ label: cle, v1: gE[cle] || 0, v2: gS[cle] || 0, info: `${cle} : +${gE[cle] || 0} / −${gS[cle] || 0}` });
    });
    if (!seriesS.length) seriesS.push({ label: "—", v1: 0, v2: 0, info: "Aucun mouvement" });
  }
  graphBarres($("graphStock"), $("detailStock"), seriesS);
  $("detailStock").textContent = "Touchez une barre pour voir le détail.";
}
const n_an = (l) => l.length;

function carteStat([val, lbl, ico, couleur, sub]) {
  return `<div class="carte-stat">
    <div class="lbl"><span>${lbl}</span><span class="ico ${couleur || ""}">${ico}</span></div>
    <div class="val">${val}</div>
    ${sub ? `<div class="sub">${sub}</div>` : ""}
  </div>`;
}

/* ============================ COMMANDES ============================ */
let filtreCmd = "", rechCmd = "";
$("pilulesCmd").addEventListener("click", (e) => {
  const b = e.target.closest("button[data-s]");
  if (!b) return;
  filtreCmd = b.dataset.s;
  rendCommandes();
});
$("rechCmd").addEventListener("input", (e) => { rechCmd = e.target.value.toLowerCase(); rendCommandes(); });
$("btnMajCmd").addEventListener("click", () => { cache.commandes = null; chargeCmd(); });
$("btnExportCmd").addEventListener("click", () => {
  const lignes = commandesFiltrees().map((c) => [
    "#" + c.id, fmtDate(c.created_at), c.client_nom, c.client_telephone,
    (cache.items || []).filter((i) => i.commande_id === c.id).map((i) => `${i.nom_produit} x${i.quantite}`).join(" | "),
    c.livraison, c.paiement, STATUTS_CMD[c.statut] || c.statut, c.total + " FCFA",
  ]);
  exportCSV("touchpro-commandes.csv", ["N°", "Date", "Client", "Téléphone", "Articles", "Livraison", "Paiement", "Statut", "Total"], lignes);
});

async function chargeCmd() {
  if (!cache.commandes) {
    $("listeCmd").innerHTML = `<p class="gsous">Chargement…</p>`;
    const { data: cmds } = await sb.from("commandes").select("*").order("created_at", { ascending: false }).limit(300);
    cache.commandes = cmds || [];
    const ids = cache.commandes.map((c) => c.id);
    const { data: items } = ids.length
      ? await sb.from("commande_items").select("*").in("commande_id", ids)
      : { data: [] };
    cache.items = items || [];
  }
  rendCommandes();
}

const commandesFiltrees = () => (cache.commandes || []).filter((c) =>
  (!filtreCmd || c.statut === filtreCmd) &&
  (!rechCmd || String(c.id).includes(rechCmd) || (c.client_nom || "").toLowerCase().includes(rechCmd) || (c.client_telephone || "").includes(rechCmd)));

function rendCommandes() {
  const tous = cache.commandes || [];
  const PILULES = [["", "Toutes"], ["en_attente", "Nouvelle"], ["confirmee", "En préparation"], ["prete", "Prête"], ["livree", "Livrée"], ["annulee", "Annulée"]];
  $("pilulesCmd").innerHTML = PILULES.map(([s, nom]) =>
    `<button data-s="${s}" class="${filtreCmd === s ? "actif" : ""}">${nom}<span class="nb">${s ? tous.filter((c) => c.statut === s).length : tous.length}</span></button>`).join("");

  const liste = commandesFiltrees();
  if (!liste.length) { $("listeCmd").innerHTML = `<div class="vide">Aucune commande</div>`; return; }
  $("listeCmd").innerHTML = liste.map((c) => {
    const items = (cache.items || []).filter((i) => i.commande_id === c.id);
    return `<div class="ligne">
      <div class="ligne-tete">
        <div>
          <h4>#${c.id} — ${esc(c.client_nom || "Client")}</h4>
          <p class="meta">📞 ${esc(c.client_telephone || "—")} · ${fmtDate(c.created_at)}<br>
          🚚 ${c.livraison === "livraison" ? "Livraison" : "Retrait boutique"}${c.adresse_livraison ? " — " + esc(c.adresse_livraison) : ""} · 💳 ${c.paiement === "livraison" ? "À la livraison" : "À la boutique"}</p>
        </div>
        <div style="text-align:right">
          <div class="total">${formatPrix(c.total)}</div>
          <span class="etag ${ETAG_STATUT[c.statut] || "gris"}">${STATUTS_CMD[c.statut] || c.statut}</span>
        </div>
      </div>
      <p class="meta" style="margin-top:.5rem">${items.map((i) => `${esc(i.nom_produit)} ×${i.quantite}${i.taille ? " (" + esc(i.taille) + ")" : ""}`).join("<br>") || "—"}</p>
      ${c.note ? `<p class="meta">📝 ${esc(c.note)}</p>` : ""}
      <div class="actions-ligne">
        <select data-cmd="${c.id}" class="sel-statut">
          ${Object.entries(STATUTS_CMD).map(([v, n]) => `<option value="${v}" ${c.statut === v ? "selected" : ""}>${n}</option>`).join("")}
        </select>
        <a class="btn btn-wa" href="https://wa.me/${String(c.client_telephone || "").replace(/\D/g, "")}" target="_blank" rel="noopener">💬 WhatsApp</a>
      </div>
    </div>`;
  }).join("");
  $("listeCmd").querySelectorAll(".sel-statut").forEach((sel) => sel.addEventListener("change", async (e) => {
    const id = +e.target.dataset.cmd;
    const { error } = await sb.from("commandes").update({ statut: e.target.value }).eq("id", id);
    if (error) alert("Erreur : " + error.message);
    else { cache.commandes.find((c) => c.id === id).statut = e.target.value; rendCommandes(); }
  }));
}

/* ============================ CLIENTS ============================ */
let filtreClients = "", rechClients = "";
$("pilulesClients").addEventListener("click", (e) => {
  const b = e.target.closest("button[data-f]");
  if (!b) return;
  filtreClients = b.dataset.f;
  rendClients();
});
$("rechClients").addEventListener("input", (e) => { rechClients = e.target.value.toLowerCase(); rendClients(); });
$("btnMajClients").addEventListener("click", () => { cache.clients = null; cache.commandes = null; chargeClients(); });
$("btnExportClients").addEventListener("click", () => {
  const lignes = clientsFiltres().map((c) => [c.nom, c.telephone, c.ville || "", new Date(c.created_at).toLocaleDateString("fr-FR"), c._nbCmd, c._total + " FCFA", c.bloque ? "Bloqué" : "Actif"]);
  exportCSV("touchpro-clients.csv", ["Nom", "Téléphone", "Ville", "Inscrit le", "Commandes", "Total dépensé", "Statut"], lignes);
});

async function chargeClients() {
  if (!cache.clients) {
    $("listeClients").innerHTML = `<p class="gsous">Chargement…</p>`;
    const [{ data: cls }, { data: cmds }, { data: adms }] = await Promise.all([
      sb.from("profils_clients").select("*").order("created_at", { ascending: false }).limit(500),
      sb.from("commandes").select("client_id,total,statut"),
      sb.from("admin").select("user_id,email"),
    ]);
    cache.clients = cls || [];
    cache.admins = adms || [];
    cache.clients.forEach((c) => {
      const cs = (cmds || []).filter((x) => x.client_id === c.id && x.statut !== "annulee");
      c._nbCmd = cs.length;
      c._total = cs.reduce((s, x) => s + (x.total || 0), 0);
      c._admin = cache.admins.some((a) => a.user_id === c.id);
    });
  }
  rendClients();
}

const clientsFiltres = () => (cache.clients || []).filter((c) => {
  const okF = !filtreClients
    || (filtreClients === "cmd" && c._nbCmd > 0)
    || (filtreClients === "sans" && c._nbCmd === 0)
    || (filtreClients === "bloque" && c.bloque)
    || (filtreClients === "gerant" && c._admin);
  const okR = !rechClients || (c.nom || "").toLowerCase().includes(rechClients) || (c.telephone || "").includes(rechClients) || (c.ville || "").toLowerCase().includes(rechClients);
  return okF && okR;
});

function rendClients() {
  const tous = cache.clients || [];
  const nbCmd = tous.filter((c) => c._nbCmd > 0).length;
  const trente = new Date(); trente.setDate(trente.getDate() - 30);
  $("cartesClients").innerHTML = [
    [`${tous.length}`, "INSCRITS", "👥", "", ""],
    [`${nbCmd}`, "ONT COMMANDÉ", "🧾", "vert", `${tous.length ? Math.round((nbCmd / tous.length) * 100) : 0} % des inscrits`],
    [`${tous.filter((c) => new Date(c.created_at) >= trente).length}`, "NOUVEAUX (30 J)", "✨", "", ""],
    [`${tous.filter((c) => c.bloque).length}`, "BLOQUÉS", "🚫", "rouge", ""],
  ].map(carteStat).join("");

  const PILULES = [["", "Tous"], ["cmd", "Ont commandé"], ["sans", "Sans commande"], ["bloque", "Bloqués"], ["gerant", "Gérants"]];
  $("pilulesClients").innerHTML = PILULES.map(([f, nom]) =>
    `<button data-f="${f}" class="${filtreClients === f ? "actif" : ""}">${nom}<span class="nb">${
      f === "cmd" ? nbCmd : f === "sans" ? tous.length - nbCmd : f === "bloque" ? tous.filter((c) => c.bloque).length : f === "gerant" ? tous.filter((c) => c._admin).length : tous.length}</span></button>`).join("");

  const liste = clientsFiltres();
  if (!liste.length) { $("listeClients").innerHTML = `<div class="vide">Aucun client</div>`; return; }
  $("listeClients").innerHTML = liste.map((c) => {
    const initiales = (c.nom || "?").split(" ").map((m) => m[0]).slice(0, 2).join("").toUpperCase();
    return `<div class="ligne">
      <div class="ligne-tete">
        <div style="display:flex;gap:.7rem;align-items:center">
          <span class="avatar">${esc(initiales)}</span>
          <div>
            <h4>${esc(c.nom || "Client")} ${c._admin ? `<span class="etag or">👑 Gérant</span>` : ""} ${c.bloque ? `<span class="etag rouge">Bloqué</span>` : ""}</h4>
            <p class="meta">📞 ${esc(c.telephone || "—")}${c.ville ? " · 📍 " + esc(c.ville) : ""}<br>
            Inscrit le ${new Date(c.created_at).toLocaleDateString("fr-FR", { day: "numeric", month: "short", year: "numeric" })}</p>
          </div>
        </div>
        <div style="text-align:right">
          <div class="total">${formatPrix(c._total)}</div>
          <p class="meta">${c._nbCmd} commande(s)</p>
        </div>
      </div>
      <div class="actions-ligne">
        <button class="btn ${c.bloque ? "btn-or" : "btn-contour"}" data-bloque="${c.id}" data-etat="${c.bloque ? 1 : 0}">${c.bloque ? "✅ Débloquer" : "🚫 Bloquer"}</button>
        <a class="btn btn-wa" href="https://wa.me/${String(c.telephone || "").replace(/\D/g, "")}" target="_blank" rel="noopener">💬 WhatsApp</a>
        ${!c._admin ? `<button class="btn btn-contour" data-suppr="${c.id}" style="color:#ef8585">🗑 Supprimer l'inscription</button>` : ""}
      </div>
    </div>`;
  }).join("");

  $("listeClients").querySelectorAll("[data-bloque]").forEach((b) => b.addEventListener("click", async () => {
    const c = cache.clients.find((x) => x.id === b.dataset.bloque);
    const nouveau = b.dataset.etat !== "1";
    if (nouveau && !confirm(`Bloquer ${c.nom || "ce client"} ? Il ne pourra plus commander.`)) return;
    const { error } = await sb.from("profils_clients").update({ bloque: nouveau }).eq("id", c.id);
    if (error) alert("Erreur : " + error.message);
    else { c.bloque = nouveau; rendClients(); }
  }));
  $("listeClients").querySelectorAll("[data-suppr]").forEach((b) => b.addEventListener("click", async () => {
    const c = cache.clients.find((x) => x.id === b.dataset.suppr);
    if (!confirm(`Supprimer l'inscription de ${c.nom || "ce client"} ?\n(Son compte de connexion restera mais ses données seront effacées)`)) return;
    const { error } = await sb.from("profils_clients").delete().eq("id", c.id);
    if (error) alert("Erreur : " + error.message);
    else { cache.clients = cache.clients.filter((x) => x.id !== c.id); rendClients(); }
  }));
}

/* ============================ PRODUITS & PRIX ============================ */
let filtreProd = "vente", rechProd = "", rayonProd = "";
$("pilulesProd").addEventListener("click", (e) => {
  const b = e.target.closest("button[data-f]");
  if (!b) return;
  filtreProd = b.dataset.f;
  rendProduits();
});
$("rechProd").addEventListener("input", (e) => { rechProd = e.target.value.toLowerCase(); rendProduits(); });
$("selRayon").addEventListener("change", (e) => { rayonProd = e.target.value; rendProduits(); });

async function chargeProd() {
  if (!cache.produits) {
    $("listeProd").innerHTML = `<p class="gsous">Chargement…</p>`;
    const { data } = await sb.from("produits").select("*").order("id", { ascending: false });
    cache.produits = data || [];
  }
  rendProduits();
}

function rendProduits() {
  const tous = cache.produits || [];
  const enVente = tous.filter((p) => p.actif);
  const retires = tous.filter((p) => !p.actif);
  $("pilulesProd").innerHTML = [["vente", "En vente"], ["retires", "Retirés"], ["tous", "Tous"]]
    .map(([f, nom]) => `<button data-f="${f}" class="${filtreProd === f ? "actif" : ""}">${nom}<span class="nb">${f === "vente" ? enVente.length : f === "retires" ? retires.length : tous.length}</span></button>`).join("");

  const liste = tous.filter((p) =>
    (filtreProd === "tous" || (filtreProd === "vente" ? p.actif : !p.actif)) &&
    (!rayonProd || p.departement === rayonProd) &&
    (!rechProd || p.nom.toLowerCase().includes(rechProd)));

  if (!liste.length) { $("listeProd").innerHTML = `<div class="vide">Aucun article</div>`; return; }
  $("listeProd").innerHTML = liste.map((p) => {
    const pct = p.prix_promo && p.prix_promo > p.prix ? Math.round((1 - p.prix / p.prix_promo) * 100) : null;
    return `<div class="ligne">
      <div class="ligne-tete">
        <div style="display:flex;gap:.7rem;align-items:center">
          ${p.image_url ? `<img class="thumb" src="${esc(p.image_url)}" alt="" loading="lazy">` : `<span class="thumb"></span>`}
          <div>
            <h4>${esc(p.nom)}</h4>
            <p class="meta">${nomRayon(p.departement)} · Réf. P${String(p.id).padStart(2, "0")} · Stock : <b style="color:${p.stock === 0 ? "#ef8585" : p.stock <= 3 ? "#d6783c" : "#6fd69f"}">${p.stock}</b></p>
          </div>
        </div>
        <span class="etag ${p.actif ? "vert" : "gris"}">${p.actif ? "En vente" : "Retiré"}</span>
      </div>
      <div class="prix-grille">
        <div>
          <label>PRIX DE VENTE</label>
          <div class="champ-prix"><input type="number" min="0" value="${p.prix}" data-prix="${p.id}" inputmode="numeric"><span>FCFA</span></div>
        </div>
        <div>
          <label>PRIX BARRÉ ${pct ? `<span style="color:#ef8585">−${pct} %</span>` : ""}</label>
          <div class="champ-prix"><input type="number" min="0" value="${p.prix_promo || ""}" placeholder="aucun" data-barre="${p.id}" inputmode="numeric"><span>FCFA</span></div>
        </div>
      </div>
      <div class="actions-ligne">
        <button class="btn btn-or" data-save="${p.id}">💾 Enregistrer</button>
        ${p.actif ? `<button class="btn btn-contour" data-annonce="${p.id}">📣 Annoncer</button>
        <button class="btn btn-contour" data-retire="${p.id}" style="color:#ef8585">🚫 Retirer</button>`
        : `<button class="btn btn-or" data-remet="${p.id}">↩️ Remettre en vente</button>`}
      </div>
    </div>`;
  }).join("");

  $("listeProd").querySelectorAll("[data-save]").forEach((b) => b.addEventListener("click", async () => {
    const id = +b.dataset.save;
    const prix = +$(`listeProd`).querySelector(`[data-prix="${id}"]`).value || 0;
    const barreV = $(`listeProd`).querySelector(`[data-barre="${id}"]`).value;
    const prix_promo = barreV ? +barreV : null;
    if (prix_promo && prix_promo <= prix) { alert("Le prix barré doit être supérieur au prix de vente."); return; }
    boutonChargement(b, true);
    const { error } = await sb.from("produits").update({ prix, prix_promo }).eq("id", id);
    boutonChargement(b, false);
    if (error) alert("Erreur : " + error.message);
    else { Object.assign(cache.produits.find((p) => p.id === id), { prix, prix_promo }); rendProduits(); }
  }));
  $("listeProd").querySelectorAll("[data-annonce]").forEach((b) => b.addEventListener("click", async () => {
    const p = cache.produits.find((x) => x.id === +b.dataset.annonce);
    boutonChargement(b, true);
    const { error } = await sb.from("publications").insert({
      titre: `🆕 ${p.nom}`,
      texte: `${p.nom} — ${formatPrix(p.prix)}${p.prix_promo ? ` au lieu de ${formatPrix(p.prix_promo)}` : ""}. Disponible en boutique !${p.description ? "\n" + p.description : ""}`,
      media_url: p.image_url, media_type: "image", categorie: "Produits disponibles", statut: "publie",
    });
    boutonChargement(b, false);
    alert(error ? "Erreur : " + error.message : "📣 Annoncé sur le fil d'actualité !");
  }));
  $("listeProd").querySelectorAll("[data-retire]").forEach((b) => b.addEventListener("click", async () => {
    if (!confirm("Retirer cet article de la boutique ?")) return;
    const { error } = await sb.from("produits").update({ actif: false }).eq("id", +b.dataset.retire);
    if (error) alert("Erreur : " + error.message);
    else { cache.produits.find((p) => p.id === +b.dataset.retire).actif = false; rendProduits(); }
  }));
  $("listeProd").querySelectorAll("[data-remet]").forEach((b) => b.addEventListener("click", async () => {
    const { error } = await sb.from("produits").update({ actif: true }).eq("id", +b.dataset.remet);
    if (error) alert("Erreur : " + error.message);
    else { cache.produits.find((p) => p.id === +b.dataset.remet).actif = true; rendProduits(); }
  }));
}

/* ============================ STOCK ============================ */
let periodeStock = "30j";
const photosAjout = [];
$("periodesStock").addEventListener("click", (e) => {
  const b = e.target.closest("button[data-p]");
  if (!b) return;
  periodeStock = b.dataset.p;
  $("periodesStock").querySelectorAll("button").forEach((x) => x.classList.toggle("actif", x === b));
  chargeStock();
});

$("inputPhotos").addEventListener("change", (e) => {
  for (const f of e.target.files) {
    if (photosAjout.length >= 4) break;
    photosAjout.push(f);
  }
  e.target.value = "";
  rendPhotosAjout();
});

function rendPhotosAjout() {
  const zone = $("zonePhotos");
  zone.querySelectorAll(".apercu").forEach((x) => x.remove());
  photosAjout.forEach((f, i) => {
    const img = document.createElement("img");
    img.className = "apercu";
    img.src = URL.createObjectURL(f);
    img.title = "Touchez pour retirer";
    img.addEventListener("click", () => { photosAjout.splice(i, 1); rendPhotosAjout(); });
    zone.prepend(img);
  });
  zone.previousElementSibling.textContent = `PHOTOS (${photosAjout.length}/4)`;
}

async function chargeStock() {
  const debut = periodeStock === "tout" ? null : debutPeriode(periodeStock);
  let qm = sb.from("mouvements_stock").select("type,quantite,motif");
  if (debut) qm = qm.gte("created_at", debut.toISOString());
  const [{ data: mvs }, { data: prods }] = await Promise.all([qm, sb.from("produits").select("id,nom,stock,actif,image_url")]);
  const entrees = (mvs || []).filter((m) => m.type === "entree");
  const sorties = (mvs || []).filter((m) => m.type === "sortie");
  const somme = (l) => l.reduce((s, m) => s + m.quantite, 0);
  const vendus = somme(sorties.filter((m) => (m.motif || "").startsWith("Commande")));
  const actifs = (prods || []).filter((p) => p.actif);
  cache.produits = cache.produits || [];
  const { data: full } = await sb.from("produits").select("*").order("stock", { ascending: true });
  cache.produits = full || [];

  $("cartesStock").innerHTML = [
    [`+${somme(entrees)}`, "ENTRÉES", "📥", "vert", `dont ${somme(entrees.filter((m) => (m.motif || "").startsWith("Réception")))} réceptionnés`],
    [`−${somme(sorties)}`, "SORTIES", "📤", "", `dont ${vendus} vendus sur le site`],
    [`${actifs.reduce((s, p) => s + (p.stock || 0), 0)}`, "EN STOCK", "📦", "", `${actifs.length} articles en vente`],
    [`${actifs.filter((p) => p.stock === 0).length} / ${actifs.filter((p) => p.stock > 0 && p.stock <= 3).length}`, "RUPTURES / FAIBLES", "⚠️", "rouge", ""],
  ].map(carteStat).join("");

  rendEtatStock();
}

function rendEtatStock() {
  const liste = (cache.produits || []).filter((p) => p.actif).sort((a, b) => a.stock - b.stock);
  if (!liste.length) { $("etatStock").innerHTML = `<div class="vide">Aucun article en vente</div>`; return; }
  $("etatStock").innerHTML = liste.map((p) => {
    const etat = p.stock === 0 ? ["Rupture", "rouge"] : p.stock <= 3 ? ["Faible", "or"] : ["OK", "vert"];
    return `<div style="display:flex;align-items:center;gap:.7rem;padding:.6rem 0;border-bottom:1px solid rgba(214,169,79,.1)">
      ${p.image_url ? `<img class="thumb" src="${esc(p.image_url)}" alt="" loading="lazy">` : `<span class="thumb"></span>`}
      <div style="flex:1;min-width:0">
        <p style="margin:0;font-size:.88rem;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${esc(p.nom)}</p>
        <p class="meta" style="margin:0">${nomRayon(p.departement)}</p>
      </div>
      <b style="font-size:1rem;min-width:2ch;text-align:right">${p.stock}</b>
      <span class="etag ${etat[1]}">${etat[0]}</span>
      <button class="btn btn-contour" data-entree="${p.id}" style="font-size:.72rem;padding:.4rem .6rem;min-height:36px">＋ Entrée</button>
    </div>`;
  }).join("");
  $("etatStock").querySelectorAll("[data-entree]").forEach((b) => b.addEventListener("click", async () => {
    const p = cache.produits.find((x) => x.id === +b.dataset.entree);
    const q = parseInt(prompt(`Quantité reçue pour « ${p.nom} » :`, "10"), 10);
    if (!q || q <= 0) return;
    const [{ error: e1 }, { error: e2 }] = await Promise.all([
      sb.from("produits").update({ stock: (p.stock || 0) + q }).eq("id", p.id),
      sb.from("mouvements_stock").insert({ produit_id: p.id, type: "entree", quantite: q, motif: "Réception" }),
    ]);
    if (e1 || e2) alert("Erreur : " + (e1 || e2).message);
    else { p.stock = (p.stock || 0) + q; rendEtatStock(); }
  }));
}

/* Ajout produit */
$("formAjout").addEventListener("submit", async (e) => {
  e.preventDefault();
  const f = e.target;
  const btn = f.querySelector("button[type=submit]");
  boutonChargement(btn, true);
  try {
    // 1. Upload des photos
    let image_url = null;
    for (let i = 0; i < photosAjout.length; i++) {
      const fichier = photosAjout[i];
      const ext = (fichier.name.split(".").pop() || "jpg").toLowerCase();
      const chemin = `${Date.now()}-${i}.${ext}`;
      const { error: errUp } = await sb.storage.from("produits").upload(chemin, fichier, { contentType: fichier.type || "image/jpeg" });
      if (errUp) throw new Error("Photo : " + errUp.message);
      if (i === 0) image_url = sb.storage.from("produits").getPublicUrl(chemin).data.publicUrl;
    }
    // 2. Création du produit
    const stock = Math.max(0, parseInt(f.stock.value, 10) || 0);
    const prixPromo = f.prix_promo.value ? +f.prix_promo.value : null;
    if (prixPromo && prixPromo <= +f.prix.value) throw new Error("Le prix barré doit être supérieur au prix de vente.");
    const { data: prod, error } = await sb.from("produits").insert({
      nom: f.nom.value.trim(), departement: f.departement.value,
      prix: +f.prix.value, prix_promo: prixPromo, stock,
      description: f.description.value.trim() || null,
      tailles: f.tailles.value.trim() || null,
      image_url, actif: true,
    }).select().single();
    if (error) throw new Error(error.message);
    // 3. Mouvement d'entrée
    if (stock > 0) await sb.from("mouvements_stock").insert({ produit_id: prod.id, type: "entree", quantite: stock, motif: "Réception initiale" });
    alerte("alerteAjout", "ok", `✅ « ${prod.nom} » est en vente sur la boutique !`);
    f.reset();
    photosAjout.length = 0;
    rendPhotosAjout();
    cache.produits = null;
    chargeStock();
  } catch (err) {
    alerte("alerteAjout", "err", "❌ " + err.message);
  }
  boutonChargement(btn, false);
});

/* ============================ AVIS ============================ */
let filtreAvis = "", rechAvis = "";
$("pilulesAvis").addEventListener("click", (e) => {
  const b = e.target.closest("button[data-f]");
  if (!b) return;
  filtreAvis = b.dataset.f;
  rendAvis();
});
$("rechAvis").addEventListener("input", (e) => { rechAvis = e.target.value.toLowerCase(); rendAvis(); });

async function chargeAvis() {
  if (!cache.avis) {
    $("listeAvis").innerHTML = `<p class="gsous">Chargement…</p>`;
    const { data } = await sb.from("avis").select("*").order("created_at", { ascending: false }).limit(200);
    cache.avis = data || [];
  }
  rendAvis();
}

function rendAvis() {
  const tous = cache.avis || [];
  const publies = tous.filter((a) => a.approuve);
  const moyenne = publies.length ? (publies.reduce((s, a) => s + a.note, 0) / publies.length).toFixed(1) : "—";
  const aLire = tous.filter((a) => !a.lu).length;
  const sansRep = publies.filter((a) => !a.reponse).length;
  $("cartesAvis").innerHTML = [
    [`${moyenne}`, "NOTE MOYENNE", "⭐", "", publies.length ? "sur 5" : ""],
    [`${publies.length}`, "AVIS PUBLIÉS", "✅", "vert", ""],
    [`${aLire}`, "À LIRE", "📩", aLire ? "rouge" : "", ""],
    [`${sansRep}`, "SANS RÉPONSE", "💬", "", ""],
  ].map(carteStat).join("");

  const PILULES = [["", "Tous"], ["alire", "À lire"], ["neg", "Négatifs"], ["sansrep", "Sans réponse"], ["masques", "Masqués"]];
  $("pilulesAvis").innerHTML = PILULES.map(([f, nom]) =>
    `<button data-f="${f}" class="${filtreAvis === f ? "actif" : ""}">${nom}<span class="nb">${
      f === "alire" ? aLire : f === "neg" ? tous.filter((a) => a.note <= 2).length : f === "sansrep" ? sansRep : f === "masques" ? tous.filter((a) => !a.approuve).length : tous.length}</span></button>`).join("");

  const liste = tous.filter((a) => {
    const okF = !filtreAvis
      || (filtreAvis === "alire" && !a.lu)
      || (filtreAvis === "neg" && a.note <= 2)
      || (filtreAvis === "sansrep" && a.approuve && !a.reponse)
      || (filtreAvis === "masques" && !a.approuve);
    const okR = !rechAvis || (a.auteur || "").toLowerCase().includes(rechAvis) || (a.commentaire || "").toLowerCase().includes(rechAvis);
    return okF && okR;
  });

  if (!liste.length) { $("listeAvis").innerHTML = `<div class="vide">Aucun avis pour le moment. Ils apparaîtront ici dès qu'un client notera un service.</div>`; return; }
  $("listeAvis").innerHTML = liste.map((a) => `
    <div class="ligne" data-avis="${a.id}" data-lu="${a.lu ? 1 : 0}">
      <div class="ligne-tete">
        <div>
          <h4>${esc(a.auteur || "Client")} ${!a.lu ? `<span class="etag bleu">Nouveau</span>` : ""}</h4>
          <p class="meta"><span class="etoiles">${"★".repeat(a.note)}${"☆".repeat(5 - a.note)}</span>
          ${a.service_mentionne ? ` · <span class="etag or">${esc(a.service_mentionne)}</span>` : ""} · ${fmtDate(a.created_at)}</p>
        </div>
        <span class="etag ${a.approuve ? "vert" : "gris"}">${a.approuve ? "Publié" : "Masqué"}</span>
      </div>
      <p style="margin:.6rem 0 0;font-size:.9rem">${esc(a.commentaire || "")}</p>
      ${a.reponse ? `<div class="reponse-gerant"><b>Votre réponse :</b> ${esc(a.reponse)}</div>` : ""}
      <div class="actions-ligne">
        <button class="btn btn-contour" data-toggle-avis="${a.id}">${a.approuve ? "🙈 Masquer" : "✅ Publier"}</button>
        <button class="btn btn-contour" data-repondre="${a.id}">💬 ${a.reponse ? "Modifier la réponse" : "Répondre"}</button>
      </div>
      <div class="zone-reponse" hidden>
        <textarea placeholder="Votre réponse publique…">${esc(a.reponse || "")}</textarea>
        <button class="btn btn-or" data-publie-rep="${a.id}" style="margin-top:.5rem;font-size:.8rem;min-height:40px">Publier la réponse</button>
      </div>
    </div>`).join("");

  // Marquer comme lu au clic sur la carte
  $("listeAvis").querySelectorAll("[data-avis]").forEach((el) => el.addEventListener("click", async () => {
    if (el.dataset.lu === "1") return;
    el.dataset.lu = "1";
    const a = cache.avis.find((x) => String(x.id) === el.dataset.avis);
    if (a) { a.lu = true; sb.from("avis").update({ lu: true }).eq("id", a.id).then(() => {}); }
  }, { once: true }));

  $("listeAvis").querySelectorAll("[data-toggle-avis]").forEach((b) => b.addEventListener("click", async () => {
    const a = cache.avis.find((x) => String(x.id) === b.dataset.toggleAvis);
    const { error } = await sb.from("avis").update({ approuve: !a.approuve, lu: true }).eq("id", a.id);
    if (error) alert("Erreur : " + error.message);
    else { a.approuve = !a.approuve; a.lu = true; rendAvis(); }
  }));
  $("listeAvis").querySelectorAll("[data-repondre]").forEach((b) => b.addEventListener("click", () => {
    const zone = b.closest(".ligne").querySelector(".zone-reponse");
    zone.hidden = !zone.hidden;
  }));
  $("listeAvis").querySelectorAll("[data-publie-rep]").forEach((b) => b.addEventListener("click", async () => {
    const a = cache.avis.find((x) => String(x.id) === b.dataset.publieRep);
    const reponse = b.closest(".zone-reponse").querySelector("textarea").value.trim();
    const { error } = await sb.from("avis").update({ reponse: reponse || null, lu: true }).eq("id", a.id);
    if (error) alert("Erreur : " + error.message);
    else { a.reponse = reponse || null; a.lu = true; rendAvis(); }
  }));
}
