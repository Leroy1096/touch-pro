/* ==========================================================================
   TOUCH PRO — Boutique : catalogue, filtres, panier, commande
   ========================================================================== */

import {
  initPage, chargeProduits, getPanier, retireDuPanier, changeQte, videPanier,
  totalPanier, formatPrix, esc, nettoie, alerte, boutonChargement, montreWA,
  clientCourant, envoiTropRapide, majBadgePanier,
} from "./tp-pages.js?v=16";

initPage("boutique.html");

const grille = document.getElementById("grille");
let depActif = "";

async function rafraichit() {
  grille.innerHTML = `<div class="tp-vide">Chargement…</div>`;
  await chargeProduits("#grille", depActif || null);
}
document.getElementById("filtres").addEventListener("click", (e) => {
  const b = e.target.closest("button");
  if (!b) return;
  document.querySelectorAll("#filtres button").forEach((x) => x.classList.toggle("actif", x === b));
  depActif = b.dataset.dep;
  rafraichit();
});
rafraichit();

/* ---------- Panier ---------- */
const contenu = document.getElementById("contenuPanier");
const form = document.getElementById("formCommande");

function rendPanier() {
  majBadgePanier();
  const p = getPanier();
  if (!p.length) {
    contenu.innerHTML = `<div class="tp-vide">Votre panier est vide.</div>`;
    form.hidden = true;
    return;
  }
  contenu.innerHTML = p.map((i) => `
    <div class="ligne">
      <div style="flex:1"><strong>${esc(i.nom)}</strong>${i.taille ? ` <span class="tp-badge">${esc(i.taille)}</span>` : ""}<br>
      <small style="color:var(--gris)">${formatPrix(i.prix)} × ${i.qte}</small></div>
      <div class="qte">
        <button data-a="-" data-k="${esc(i.id + "|" + (i.taille || ""))}">−</button>
        <strong style="margin:0 .5rem">${i.qte}</strong>
        <button data-a="+" data-k="${esc(i.id + "|" + (i.taille || ""))}">+</button>
      </div>
      <strong style="min-width:90px;text-align:right">${formatPrix(i.prix * i.qte)}</strong>
      <button data-a="x" data-k="${esc(i.id + "|" + (i.taille || ""))}" style="background:none;border:none;color:var(--rouge);cursor:pointer;font-size:1.1rem">✕</button>
    </div>`).join("")
    + `<p style="text-align:right;font-size:1.25rem;margin-top:1rem">Total : <strong style="color:var(--or)">${formatPrix(totalPanier())}</strong></p>`;
  form.hidden = false;
}

contenu.addEventListener("click", (e) => {
  const b = e.target.closest("button");
  if (!b) return;
  const { a, k } = b.dataset;
  if (a === "x") retireDuPanier(k);
  if (a === "+") changeQte(k, 1);
  if (a === "-") changeQte(k, -1);
  rendPanier();
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
  form.reset();
  form.hidden = true;
  alerte("alerteCmd", "ok", `✅ Commande n°${cmd.id} enregistrée ! Total : ${formatPrix(total)}. Nous vous contactons très vite.`);
  document.getElementById("panier").scrollIntoView({ behavior: "smooth" });
  montreWA(form,
    `Bonjour TOUCH PRO ! Je viens de passer la commande n°${cmd.id} :\n${lignes.join("\n")}\nTotal : ${formatPrix(total)}\nNom : ${nom}\nTél : ${tel}`,
    "💬 Confirmer ma commande par WhatsApp");
});

rendPanier();
