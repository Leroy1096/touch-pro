/* ==========================================================================
   TOUCH PRO — Carte de visite numérique
   (données : infos_entreprise si disponible, sinon valeurs TP par défaut)
   ========================================================================== */

import { TP, waLien } from "./tp-config.js?v=16";
import { getSupabase } from "./supabaseClient.js?v=24";

let infos = { ...TP, horaires: { "Lun-Sam": "08:00 – 20:00", "Dimanche": "Fermé" } };

/* Charge les infos modifiables depuis l'administration */
(async () => {
  try {
    const sb = await getSupabase();
    if (!sb) return;
    const { data } = await sb.from("infos_entreprise").select("*").eq("id", true).maybeSingle();
    if (!data) return;
    infos = {
      ...infos,
      nom: data.nom || infos.nom,
      slogan: data.slogan || infos.slogan,
      whatsapp: data.whatsapp || infos.whatsapp,
      telephone: data.telephone || infos.telephone,
      telephoneLien: "+" + String(data.whatsapp || infos.whatsapp).replace(/\D/g, ""),
      adresse: data.adresse || infos.adresse,
      horaires: data.horaires || infos.horaires,
    };
    document.getElementById("cSlogan").textContent = infos.slogan;
    document.getElementById("cAdresse").innerHTML = "📍 " + infos.adresse.replace(/,? /, " <strong>") + "</strong>";
    const h = infos.horaires;
    document.getElementById("cHoraires").textContent = "🕒 " + Object.entries(h).map(([j, v]) => `${j} : ${v}`).join(" · ");
    document.getElementById("cWhatsapp").href = "https://wa.me/" + String(infos.whatsapp).replace(/\D/g, "");
    document.getElementById("cAppeler").href = "tel:+" + String(infos.whatsapp).replace(/\D/g, "");
  } catch { /* valeurs par défaut conservées */ }
})();

document.getElementById("cItineraire").href =
  "https://www.google.com/maps/search/?api=1&query=" + encodeURIComponent(infos.adresse + ", Côte d'Ivoire");

/* Enregistrer le contact (fiche VCF) */
document.getElementById("cVcf").addEventListener("click", () => {
  const vcf = [
    "BEGIN:VCARD", "VERSION:3.0",
    "FN:" + infos.nom,
    "ORG:" + infos.nom,
    "TEL;TYPE=CELL:+" + String(infos.whatsapp).replace(/\D/g, ""),
    "ADR:;;" + infos.adresse + ";;;Côte d'Ivoire",
    "URL:" + location.origin + "/carte.html",
    "NOTE:" + TP.signature + " — " + infos.slogan,
    "END:VCARD",
  ].join("\r\n");
  const blob = new Blob([vcf], { type: "text/vcard" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = "touch-pro.vcf";
  a.click();
  URL.revokeObjectURL(a.href);
});

/* Partager la carte */
document.getElementById("cPartager").addEventListener("click", async () => {
  const url = location.origin + "/carte.html";
  const texte = `${infos.nom} — ${infos.slogan}\n${infos.adresse}\n📞 ${infos.telephone}`;
  if (navigator.share) {
    try { await navigator.share({ title: infos.nom, text: texte, url }); return; } catch { /* annulé */ }
  }
  // Repli : menu WhatsApp / copie
  const choix = confirm("Partager sur WhatsApp ?\n(Annuler = copier le lien)");
  if (choix) {
    open(waLien(texte + "\n👉 " + url), "_blank", "noopener");
  } else {
    try { await navigator.clipboard.writeText(url); alert("Lien de la carte copié !"); }
    catch { prompt("Copiez le lien :", url); }
  }
});
