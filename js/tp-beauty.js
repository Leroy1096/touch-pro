/* ==========================================================================
   TOUCH PRO BEAUTY — catalogue officiel des prestations (coiffure mixte,
   soin du visage, pédicure/manucure) + tarifs fusionnés depuis la BDD.
   ========================================================================== */

import { initPage, getSupabase, formatPrix } from "./tp-pages.js?v=19";
import { CATALOGUE, rendCatalogue } from "./tp-catalogue.js?v=19";

initPage("beauty.html");
document.querySelectorAll('a[href="rendez-vous.html"]').forEach((a) => (a.id = "rdv"));

const zone = document.getElementById("grilleServices");
let servicesBdd = null;

/* Correspondance souple catalogue ↔ table services (mots significatifs) */
const norm = (s) => s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");
function prixPour(nom) {
  if (!servicesBdd) return null;
  const mots = norm(nom).split(/[^a-z0-9]+/).filter((w) => w.length > 3);
  let best = null, bestScore = 0;
  for (const s of servicesBdd) {
    const cible = norm(s.nom + " " + (s.description || ""));
    const score = mots.reduce((acc, w) => acc + (cible.includes(w) ? 1 : 0), 0);
    if (score > bestScore) { best = s; bestScore = score; }
  }
  if (!best || bestScore < 1) return null;
  return best.prix_max && best.prix_max !== best.prix
    ? `${formatPrix(best.prix)} – ${formatPrix(best.prix_max)}`
    : formatPrix(best.prix);
}

function rend() {
  rendCatalogue(zone, CATALOGUE.beauty, {
    couleur: "#d6a94f",
    prixDe: servicesBdd ? prixPour : null,
    onChoix: () => { location.href = "rendez-vous.html"; },
  });
}

rend();
(async () => {
  try {
    const sb = await getSupabase();
    if (!sb) return;
    const { data, error } = await sb.from("services").select("nom,description,prix,prix_max").eq("actif", true);
    if (!error && data?.length) { servicesBdd = data; rend(); }
  } catch { /* catalogue sans prix conservé */ }
})();
