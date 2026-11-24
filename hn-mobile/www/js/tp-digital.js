/* TOUCH PRO DIGITAL — catalogue des services + demande de devis */
import { initPage, nettoie, alerte, boutonChargement, montreWA, clientCourant, envoiTropRapide } from "./tp-pages.js?v=21";
import { CATALOGUE, rendCatalogue } from "./tp-catalogue.js?v=19";

initPage("digital.html");
const form = document.getElementById("formDevis");

/* Catalogue : un tap sélectionne la catégorie et pré-remplit le devis */
rendCatalogue(document.getElementById("catalogueDigital"), CATALOGUE.digital, {
  couleur: "#7a5ac0",
  onChoix: (nom, cat) => {
    form.service.value = [...form.service.options].some((o) => o.value === cat) ? cat : "Autre";
    if (!form.description.value.trim()) form.description.value = `Bonjour, je souhaite : ${nom}. `;
    form.scrollIntoView({ behavior: "smooth", block: "center" });
    setTimeout(() => form.nom.focus({ preventScroll: true }), 500);
  },
});

form.addEventListener("submit", async (e) => {
  e.preventDefault();
  if (form.entreprise.value) { form.reset(); return; }
  if (envoiTropRapide()) { alerte("alerteDevis", "err", "Envoi trop rapide, merci de réessayer."); return; }

  const nom = nettoie(form.nom.value, 80);
  const tel = nettoie(form.telephone.value, 20).replace(/[\s.]/g, "");
  const email = nettoie(form.email.value, 120) || null;
  const service = form.service.value;
  const description = nettoie(form.description.value, 800);
  const budget = form.budget.value ? Math.max(0, parseInt(form.budget.value, 10) || 0) : null;
  if (nom.length < 2) { alerte("alerteDevis", "err", "Merci d'indiquer votre nom."); return; }
  if (!/^\+?\d{8,15}$/.test(tel)) { alerte("alerteDevis", "err", "Numéro de téléphone invalide."); return; }
  if (description.length < 10) { alerte("alerteDevis", "err", "Décrivez votre projet un peu plus."); return; }

  const btn = form.querySelector("button[type=submit]");
  boutonChargement(btn, true);
  const { sb, user } = await clientCourant();
  if (!sb) { boutonChargement(btn, false); alerte("alerteDevis", "err", "Connexion indisponible. Contactez-nous sur WhatsApp."); return; }

  const { error } = await sb.from("devis").insert({
    client_id: user?.id || null, nom, telephone: tel, email, service, description, budget,
  });
  boutonChargement(btn, false);
  if (error) { alerte("alerteDevis", "err", "L'envoi a échoué. Réessayez dans un instant."); return; }

  form.reset();
  alerte("alerteDevis", "ok", "✅ Demande de devis envoyée ! Nous vous répondons sous 24 h ouvrées.");
  montreWA(form, `Bonjour TOUCH PRO DIGITAL ! Je viens de demander un devis :\n• Service : ${service}\n• Projet : ${description}${budget ? `\n• Budget : ${budget} FCFA` : ""}\n• Nom : ${nom}\n• Tél : ${tel}`);
});
