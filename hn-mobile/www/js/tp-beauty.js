/* TOUCH PRO BEAUTY — prestations (table services du salon, conservée) */
import { initPage, getSupabase, esc, formatPrix } from "./tp-pages.js?v=16";

initPage("beauty.html");
document.querySelectorAll('a[href="rendez-vous.html"]').forEach(a => a.id = "rdv");

(async () => {
  const zone = document.getElementById("grilleServices");
  const sb = await getSupabase();
  if (!sb) { zone.innerHTML = `<div class="tp-vide">Nos prestations s'affichent bientôt ici.</div>`; return; }
  try {
    const { data, error } = await sb.from("services").select("*").order("nom").limit(40);
    if (error) throw error;
    if (!data?.length) { zone.innerHTML = `<div class="tp-vide">Nos prestations s'affichent bientôt ici.</div>`; return; }
    zone.innerHTML = data.map((s) => {
      const prix = s.prix_min != null
        ? (s.prix_max && s.prix_max !== s.prix_min ? `${formatPrix(s.prix_min)} – ${formatPrix(s.prix_max)}` : formatPrix(s.prix_min))
        : (s.prix != null ? formatPrix(s.prix) : "");
      return `<article class="tp-carte"><div class="corps">
        <h3>${esc(s.nom)}</h3>
        ${s.description ? `<p>${esc(s.description)}</p>` : ""}
        ${prix ? `<p class="tp-prix">${prix}</p>` : ""}
        <a class="btn btn-or" href="rendez-vous.html" style="align-self:flex-start">Réserver</a>
      </div></article>`;
    }).join("");
  } catch { zone.innerHTML = `<div class="tp-vide">Nos prestations s'affichent bientôt ici.</div>`; }
})();
