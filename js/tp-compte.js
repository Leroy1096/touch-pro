/* ==========================================================================
   TOUCH PRO — Espace membre : inscription par e-mail + suivi client.
   - La boutique exige un compte : ?mode=inscription&retour=boutique.html
   - Inscription : prénom, nom, téléphone (WhatsApp), e-mail, mot de passe.
   - Compte administrateur ≠ compte client : le bouton Administration
     n'apparaît que si le serveur confirme le rôle (is_admin côté BDD).
   ========================================================================== */
import { initPage, getSupabase, esc, formatPrix, alerte, boutonChargement, nettoie, toast } from "./tp-pages.js?v=21";

initPage("compte.html");

const params = new URLSearchParams(location.search);
let mode = params.get("mode") === "inscription" ? "inscription" : "connexion";
/* Sécurité : n'accepter qu'une page locale du site (jamais d'URL externe) */
const retourBrut = params.get("retour") || "";
const retour = /^[a-z0-9-]+\.html(\?[^\s"]*)?$/i.test(retourBrut) ? retourBrut : "";

/* getSupabase avec garde-fou : la base peut être en pause — jamais de blocage */
const sbRapide = () => Promise.race([
  getSupabase(),
  new Promise((_, r) => setTimeout(() => r(new Error("delai")), 3000)),
]).catch(() => null);

const STATUTS = {
  en_attente: ["En attente", "#d6a94f"], confirmee: ["Confirmée", "#2ea8ff"], prete: ["Prête", "#22b358"],
  livree: ["Livrée", "#22b358"], annulee: ["Annulée", "#d05050"],
  recu: ["Reçu", "#d6a94f"], diagnostic: ["Diagnostic", "#2ea8ff"], en_cours: ["En cours", "#2ea8ff"],
  pret: ["Prêt", "#22b358"], livre: ["Récupéré", "#22b358"], annule: ["Annulé", "#d05050"],
  envoye: ["Devis envoyé", "#2ea8ff"], accepte: ["Accepté", "#22b358"], refuse: ["Refusé", "#d05050"],
};
const badge = (s) => { const [l, c] = STATUTS[s] || [s, "#a99e88"]; return `<span class="statut" style="background:${c}22;color:${c};border:1px solid ${c}66">${esc(l)}</span>`; };
const d8 = (d) => new Date(d).toLocaleDateString("fr-FR", { day: "numeric", month: "short", year: "numeric" });

const form = document.getElementById("formAuth");
const btnAuth = document.getElementById("btnAuth");

function setMode(m, majUrl = true) {
  mode = m;
  const inscr = m === "inscription";
  document.getElementById("tabConnexion").classList.toggle("actif", !inscr);
  document.getElementById("tabInscription").classList.toggle("actif", inscr);
  document.getElementById("champsInscription").hidden = !inscr;
  document.getElementById("champMdp2").hidden = !inscr;
  document.getElementById("titreAuth").textContent = inscr ? "✨ Créer mon compte" : "👤 Mon compte";
  form.motdepasse.autocomplete = inscr ? "new-password" : "current-password";
  btnAuth.textContent = inscr ? "Créer mon compte" : "Se connecter";
  document.getElementById("txtBascule").textContent = inscr ? "Déjà membre ?" : "Pas encore membre ?";
  document.getElementById("btnBascule").textContent = inscr ? "Se connecter" : "Créer un compte";
  if (majUrl) {
    const p = new URLSearchParams(location.search);
    p.set("mode", inscr ? "inscription" : "connexion");
    history.replaceState(null, "", location.pathname + "?" + p.toString());
  }
}
document.getElementById("tabConnexion").addEventListener("click", () => setMode("connexion"));
document.getElementById("tabInscription").addEventListener("click", () => setMode("inscription"));
document.getElementById("btnBascule").addEventListener("click", () => setMode(mode === "connexion" ? "inscription" : "connexion"));

function redirigeRetour() {
  if (retour) { location.href = retour; return; }
  rafraichitVue();
}

form.addEventListener("submit", async (e) => {
  e.preventDefault();
  const email = nettoie(form.email.value, 120).toLowerCase();
  const mdp = form.motdepasse.value;
  const sb = await sbRapide();
  if (!sb) { alerte("alerteAuth", "err", "Connexion au serveur impossible pour le moment — réessayez dans quelques minutes."); return; }
  boutonChargement(btnAuth, true);
  try {
    if (mode === "inscription") {
      const prenom = nettoie(form.prenom.value, 40);
      const nom = nettoie(form.nom.value, 40);
      const tel = nettoie(form.telephone.value, 20).replace(/[\s.\-]/g, "");
      if (prenom.length < 2 || nom.length < 2) { alerte("alerteAuth", "err", "Prénom et nom requis."); boutonChargement(btnAuth, false); return; }
      if (!/^\+?\d{8,15}$/.test(tel)) { alerte("alerteAuth", "err", "Numéro de téléphone invalide (8 chiffres minimum)."); boutonChargement(btnAuth, false); return; }
      if (mdp.length < 6) { alerte("alerteAuth", "err", "Mot de passe : 6 caractères minimum."); boutonChargement(btnAuth, false); return; }
      if (form.motdepasse2.value !== mdp) { alerte("alerteAuth", "err", "Les deux mots de passe ne correspondent pas."); boutonChargement(btnAuth, false); return; }
      const { data, error } = await sb.auth.signUp({
        email, password: mdp,
        options: { data: { nom: `${prenom} ${nom}`, prenom, nom_famille: nom, telephone: tel } },
      });
      if (error) throw error;
      if (!data.session) {
        alerte("alerteAuth", "ok", "✅ Compte créé ! Vérifiez votre e-mail pour confirmer, puis connectez-vous.");
        setMode("connexion");
      } else {
        toast("Bienvenue dans la famille TOUCH PRO 🎉");
        redirigeRetour();
      }
    } else {
      const { error } = await sb.auth.signInWithPassword({ email, password: mdp });
      if (error) throw error;
      toast("Bon retour parmi nous 👋");
      redirigeRetour();
    }
  } catch (err) {
    alerte("alerteAuth", "err", mode === "connexion" ? "E-mail ou mot de passe incorrect." : (err.message || "Inscription impossible."));
  }
  boutonChargement(btnAuth, false);
});

document.getElementById("btnLogout").addEventListener("click", async () => {
  const sb = await sbRapide();
  await sb?.auth.signOut();
  rafraichitVue();
});

async function rafraichitVue() {
  const sb = await sbRapide();
  let user = null;
  if (sb) {
    try {
      const { data } = await Promise.race([sb.auth.getUser(), new Promise((_, r) => setTimeout(() => r(new Error("delai")), 3000))]);
      user = data?.user || null;
    } catch { user = null; }
  }
  document.getElementById("zoneAuth").hidden = !!user;
  document.getElementById("zoneCompte").hidden = !user;
  if (!user || !sb) return;

  const { data: profil } = await sb.from("profils_clients").select("nom").eq("id", user.id).maybeSingle();
  document.getElementById("nomClient").textContent = "👤 " + (profil?.nom || user.user_metadata?.nom || user.email);

  /* Compte administrateur ≠ compte client : le rôle est confirmé côté serveur */
  try {
    const { data: adm } = await sb.rpc("is_admin");
    document.getElementById("btnAdmin").hidden = !adm;
  } catch { document.getElementById("btnAdmin").hidden = true; }

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

setMode(mode, false); // respecte ?mode=inscription / connexion de l'URL
rafraichitVue();
