/* TOUCH PRO TECH — catalogue des pannes + formulaire de réparation */
import { initPage, nettoie, alerte, boutonChargement, montreWA, clientCourant, envoiTropRapide } from "./tp-pages.js?v=19";
import { CATALOGUE, rendCatalogue } from "./tp-catalogue.js?v=19";

initPage("tech.html");
const form = document.getElementById("formRepa");

/* Catalogue des pannes : un tap pré-remplit le formulaire de dépôt */
rendCatalogue(document.getElementById("catalogueTech"), CATALOGUE.tech, {
  couleur: "#2ea8ff",
  onChoix: (nom, cat) => {
    form.panne.value = `${cat} — ${nom}`;
    form.scrollIntoView({ behavior: "smooth", block: "center" });
    setTimeout(() => form.appareil.focus({ preventScroll: true }), 500);
  },
});

form.addEventListener("submit", async (e) => {
  e.preventDefault();
  if (form.entreprise.value) { form.reset(); return; }
  if (envoiTropRapide()) { alerte("alerteRepa", "err", "Envoi trop rapide, merci de réessayer."); return; }

  const nom = nettoie(form.nom.value, 80);
  const tel = nettoie(form.telephone.value, 20).replace(/[\s.]/g, "");
  const appareil = nettoie(form.appareil.value, 80);
  const panne = nettoie(form.panne.value, 500);
  if (nom.length < 2) { alerte("alerteRepa", "err", "Merci d'indiquer votre nom."); return; }
  if (!/^\+?\d{8,15}$/.test(tel)) { alerte("alerteRepa", "err", "Numéro de téléphone invalide."); return; }
  if (appareil.length < 2 || panne.length < 5) { alerte("alerteRepa", "err", "Précisez l'appareil et la panne."); return; }

  const btn = form.querySelector("button[type=submit]");
  boutonChargement(btn, true);
  const { sb, user } = await clientCourant();
  if (!sb) { boutonChargement(btn, false); alerte("alerteRepa", "err", "Connexion indisponible. Contactez-nous sur WhatsApp."); return; }

  const { data, error } = await sb.from("reparations").insert({
    client_id: user?.id || null, client_nom: nom, client_telephone: tel, appareil, panne,
  }).select("id").single();
  boutonChargement(btn, false);
  if (error) { alerte("alerteRepa", "err", "L'envoi a échoué. Réessayez dans un instant."); return; }

  form.reset();
  alerte("alerteRepa", "ok", `✅ Demande enregistrée ! Votre numéro de suivi : TP-TECH-${data.id}. Déposez l'appareil en boutique.`);
  montreWA(form, `Bonjour TOUCH PRO TECH ! Demande de réparation n°TP-TECH-${data.id}\n• Appareil : ${appareil}\n• Panne : ${panne}\n• Nom : ${nom}\n• Tél : ${tel}`);
});
