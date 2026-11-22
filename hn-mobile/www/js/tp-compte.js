/* TOUCH PRO — Espace client : auth + historique */
import { initPage, getSupabase, esc, formatPrix, alerte, boutonChargement, nettoie } from "./tp-pages.js?v=16";

initPage("compte.html");

const STATUTS = {
  en_attente: ["En attente", "#d6a94f"], confirmee: ["Confirmée", "#2ea8ff"], prete: ["Prête", "#22b358"],
  livree: ["Livrée", "#22b358"], annulee: ["Annulée", "#d05050"],
  recu: ["Reçu", "#d6a94f"], diagnostic: ["Diagnostic", "#2ea8ff"], en_cours: ["En cours", "#2ea8ff"],
  pret: ["Prêt", "#22b358"], livre: ["Récupéré", "#22b358"], annule: ["Annulé", "#d05050"],
  envoye: ["Devis envoyé", "#2ea8ff"], accepte: ["Accepté", "#22b358"], refuse: ["Refusé", "#d05050"],
};
const badge = (s) => { const [l, c] = STATUTS[s] || [s, "#a99e88"]; return `<span class="statut" style="background:${c}22;color:${c};border:1px solid ${c}66">${esc(l)}</span>`; };
const d8 = (d) => new Date(d).toLocaleDateString("fr-FR", { day: "numeric", month: "short", year: "numeric" });

let mode = "connexion";
const form = document.getElementById("formAuth");
const btnAuth = document.getElementById("btnAuth");

function setMode(m) {
  mode = m;
  document.getElementById("tabConnexion").classList.toggle("actif", m === "connexion");
  document.getElementById("tabInscription").classList.toggle("actif", m === "inscription");
  document.getElementById("champNom").hidden = m === "connexion";
  document.getElementById("champTel").hidden = m === "connexion";
  btnAuth.textContent = m === "connexion" ? "Se connecter" : "Créer mon compte";
}
document.getElementById("tabConnexion").addEventListener("click", () => setMode("connexion"));
document.getElementById("tabInscription").addEventListener("click", () => setMode("inscription"));

form.addEventListener("submit", async (e) => {
  e.preventDefault();
  const email = nettoie(form.email.value, 120);
  const mdp = form.motdepasse.value;
  const sb = await getSupabase();
  if (!sb) { alerte("alerteAuth", "err", "Connexion indisponible, réessayez plus tard."); return; }
  boutonChargement(btnAuth, true);
  try {
    if (mode === "inscription") {
      const nom = nettoie(form.nom.value, 80);
      const tel = nettoie(form.telephone.value, 20);
      if (nom.length < 2 || tel.length < 8) { alerte("alerteAuth", "err", "Nom et téléphone requis."); boutonChargement(btnAuth, false); return; }
      const { data, error } = await sb.auth.signUp({ email, password: mdp, options: { data: { nom, telephone: tel } } });
      if (error) throw error;
      if (!data.session) alerte("alerteAuth", "ok", "✅ Compte créé ! Vérifiez votre e-mail pour confirmer, puis connectez-vous.");
      else alerte("alerteAuth", "ok", "✅ Bienvenue chez TOUCH PRO !");
    } else {
      const { error } = await sb.auth.signInWithPassword({ email, password: mdp });
      if (error) throw error;
    }
  } catch (err) {
    alerte("alerteAuth", "err", mode === "connexion" ? "E-mail ou mot de passe incorrect." : (err.message || "Inscription impossible."));
  }
  boutonChargement(btnAuth, false);
  rafraichitVue();
});

document.getElementById("btnLogout").addEventListener("click", async () => {
  const sb = await getSupabase();
  await sb?.auth.signOut();
  rafraichitVue();
});

async function rafraichitVue() {
  const sb = await getSupabase();
  const { data } = sb ? await sb.auth.getUser() : { data: { user: null } };
  const user = data?.user;
  document.getElementById("zoneAuth").hidden = !!user;
  document.getElementById("zoneCompte").hidden = !user;
  if (!user || !sb) return;

  const { data: profil } = await sb.from("profils_clients").select("nom").eq("id", user.id).maybeSingle();
  document.getElementById("nomClient").textContent = "👤 " + (profil?.nom || user.user_metadata?.nom || user.email);

  const tableau = (rows, cols, rendu, msgVide) =>
    rows?.length
      ? `<div style="overflow-x:auto"><table class="tp-table"><tr>${cols.map((c) => `<th>${c}</th>`).join("")}</tr>${rows.map(rendu).join("")}</table></div>`
      : `<div class="tp-vide">${msgVide}</div>`;

  const { data: cmds } = await sb.from("commandes").select("id,total,statut,created_at").eq("client_id", user.id).order("id", { ascending: false });
  document.getElementById("mesCommandes").innerHTML = tableau(cmds, ["N°", "Total", "Statut", "Date"],
    (c) => `<tr><td>#${c.id}</td><td>${formatPrix(c.total)}</td><td>${badge(c.statut)}</td><td>${d8(c.created_at)}</td></tr>`,
    "Aucune commande pour le moment — visitez la boutique !");

  const { data: reps } = await sb.from("reparations").select("id,appareil,panne,statut,devis_montant,created_at").eq("client_id", user.id).order("id", { ascending: false });
  document.getElementById("mesReparations").innerHTML = tableau(reps, ["Suivi", "Appareil", "Statut", "Devis", "Date"],
    (r) => `<tr><td>TP-TECH-${r.id}</td><td>${esc(r.appareil)}</td><td>${badge(r.statut)}</td><td>${r.devis_montant ? formatPrix(r.devis_montant) : "—"}</td><td>${d8(r.created_at)}</td></tr>`,
    "Aucune réparation en cours.");

  const { data: devs } = await sb.from("devis").select("service,statut,created_at").eq("client_id", user.id).order("id", { ascending: false });
  document.getElementById("mesDevis").innerHTML = tableau(devs, ["Service", "Statut", "Date"],
    (d) => `<tr><td>${esc(d.service)}</td><td>${badge(d.statut)}</td><td>${d8(d.created_at)}</td></tr>`,
    "Aucune demande de devis.");
}

rafraichitVue();
