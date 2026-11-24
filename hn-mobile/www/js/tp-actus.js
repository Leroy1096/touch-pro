/* ==========================================================================
   TOUCH PRO — Fil d'actualité public (publications publiées uniquement)
   Stratégie « jamais vide » : les publications de démonstration s'affichent
   immédiatement, puis sont remplacées par les vraies si la base répond.
   ========================================================================== */
import { initPage, getSupabase, esc, waLien, toast } from "./tp-pages.js?v=21";
import { ACTUS_DEMO } from "./tp-data.js?v=20";
import { animeReveals } from "./tp-config.js?v=16";

initPage("actualites.html");

const zone = document.getElementById("grilleActus");
const filtres = document.getElementById("filtresActus");
const btnPlus = document.getElementById("btnPlus");
const PAR_PAGE = 9;
let page = 0, categorie = "", modeDemo = true;

/* Timeout réseau : la base peut être en pause — on ne bloque jamais la page. */
const avecTimeout = (p, ms) => Promise.race([
  p,
  new Promise((_, rej) => setTimeout(() => rej(new Error("delai")), ms)),
]);

function carteActu(a) {
  const url = location.origin + "/actualites.html";
  const partage = waLien(`📰 ${a.titre}\n${(a.texte || "").slice(0, 120)}\n👉 ${url}`);
  return `
  <article class="tp-carte">
    ${a.media_url ? (a.media_type === "video"
      ? `<video class="visuel" src="${esc(a.media_url)}" controls preload="metadata"></video>`
      : `<img class="visuel" src="${esc(a.media_url)}" alt="${esc(a.titre)}" loading="lazy">`) : ""}
    <div class="corps">
      <span class="cat">${esc(a.categorie)}</span>
      <h3>${esc(a.titre)}</h3>
      <p>${esc(a.texte || "")}</p>
      <span class="date">📅 ${a.date_publication ? new Date(a.date_publication).toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" }) : ""}</span>
      <div style="display:flex;gap:.5rem;margin-top:.4rem;flex-wrap:wrap">
        <a class="btn btn-wa" style="padding:.5rem 1rem;font-size:.8rem" href="${partage}" target="_blank" rel="noopener">Partager</a>
        <button class="btn btn-contour" style="padding:.5rem 1rem;font-size:.8rem" data-copie="${esc(a.titre)} — ${esc(url)}">Copier le lien</button>
      </div>
    </div>
  </article>`;
}

function rendFiltres(cats) {
  const style = (actif) => `background:${actif ? "var(--or)" : "var(--noir-3)"};color:${actif ? "#171310" : "var(--gris)"};border:var(--bordure);border-radius:999px;padding:.45rem 1.1rem;cursor:pointer;font-weight:600`;
  filtres.innerHTML = `<button data-cat="" style="${style(!categorie)}">Tout</button>`
    + cats.map((c) => `<button data-cat="${esc(c)}" style="${style(categorie === c)}">${esc(c)}</button>`).join("");
}

/* ---------- Mode démonstration (immédiat, hors ligne / base en pause) ---------- */
function afficheDemo() {
  const liste = categorie ? ACTUS_DEMO.filter((a) => a.categorie === categorie) : ACTUS_DEMO;
  zone.innerHTML = liste.length
    ? liste.map(carteActu).join("")
    : `<div class="tp-vide">Aucune publication dans cette catégorie pour le moment.</div>`;
  btnPlus.hidden = true;
  rendFiltres([...new Set(ACTUS_DEMO.map((a) => a.categorie))]);
  animeReveals();
}

/* ---------- Mode base de données (remplace la démo si la base répond) ---------- */
async function chargeBdd(reinit = false) {
  let sb;
  try { sb = await avecTimeout(getSupabase(), 3000); } catch { return; }
  if (!sb) return;
  if (reinit) page = 0;
  try {
    let q = sb.from("publications").select("titre,texte,media_url,media_type,categorie,date_publication")
      .order("date_publication", { ascending: false }).range(page * PAR_PAGE, (page + 1) * PAR_PAGE - 1);
    if (categorie) q = q.eq("categorie", categorie);
    const { data, error } = await avecTimeout(q, 4000);
    if (error) throw error;
    if (reinit && !data?.length) return; // base vide → on garde la démo (jamais vide)
    modeDemo = false;
    if (page === 0) {
      zone.innerHTML = "";
      rendFiltres([...new Set((data || []).map((d) => d.categorie))]);
    }
    zone.insertAdjacentHTML("beforeend", (data || []).map(carteActu).join(""));
    btnPlus.hidden = (data || []).length < PAR_PAGE;
    animeReveals();
  } catch { /* base injoignable : la démo reste affichée */ }
}

filtres.addEventListener("click", (e) => {
  const b = e.target.closest("button"); if (!b) return;
  categorie = b.dataset.cat;
  if (modeDemo) afficheDemo(); else chargeBdd(true);
});
btnPlus.addEventListener("click", () => { page++; chargeBdd(); });
zone.addEventListener("click", async (e) => {
  const b = e.target.closest("[data-copie]"); if (!b) return;
  try { await navigator.clipboard.writeText(b.dataset.copie); toast("Lien copié !"); } catch { /* silencieux */ }
});

afficheDemo();   // immédiat — la page n'est jamais vide ni bloquée
chargeBdd(true); // puis remplacement si la base répond
