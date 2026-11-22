/* TOUCH PRO — Fil d'actualité public (publications publiées uniquement) */
import { initPage, getSupabase, esc, waLien, toast } from "./tp-pages.js?v=16";

initPage("actualites.html");

const zone = document.getElementById("grilleActus");
const filtres = document.getElementById("filtresActus");
const btnPlus = document.getElementById("btnPlus");
const PAR_PAGE = 9;
let page = 0, categorie = "", categories = [];

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
      <div style="display:flex;gap:.5rem;margin-top:.4rem">
        <a class="btn btn-wa" style="padding:.5rem 1rem;font-size:.8rem" href="${partage}" target="_blank" rel="noopener">Partager</a>
        <button class="btn btn-contour" style="padding:.5rem 1rem;font-size:.8rem" data-copie="${esc(a.titre)} — ${esc(url)}">Copier le lien</button>
      </div>
    </div>
  </article>`;
}

async function charge(reinit = false) {
  const sb = await getSupabase();
  if (!sb) { zone.innerHTML = `<div class="tp-vide">Le fil d'actualité arrive bientôt.</div>`; return; }
  if (reinit) { page = 0; zone.innerHTML = `<div class="tp-vide">Chargement…</div>`; }
  try {
    let q = sb.from("publications").select("titre,texte,media_url,media_type,categorie,date_publication")
      .order("date_publication", { ascending: false }).range(page * PAR_PAGE, (page + 1) * PAR_PAGE - 1);
    if (categorie) q = q.eq("categorie", categorie);
    const { data, error } = await q;
    if (error) throw error;
    if (page === 0) zone.innerHTML = "";
    if (!data?.length && page === 0) { zone.innerHTML = `<div class="tp-vide">Aucune publication pour le moment — revenez vite !</div>`; btnPlus.hidden = true; return; }
    zone.insertAdjacentHTML("beforeend", (data || []).map(carteActu).join(""));
    btnPlus.hidden = (data || []).length < PAR_PAGE;
    if (page === 0) {
      const cats = [...new Set((data || []).map((d) => d.categorie))];
      categories = [...new Set([...categories, ...cats])];
      filtres.innerHTML = `<button data-cat="" class="${!categorie ? "actif" : ""}" style="background:var(--noir-3);color:${!categorie ? "#171310" : "var(--gris)"};${!categorie ? "background:var(--or)" : ""};border:var(--bordure);border-radius:999px;padding:.45rem 1.1rem;cursor:pointer;font-weight:600">Tout</button>`
        + categories.map((c) => `<button data-cat="${esc(c)}" style="background:${categorie === c ? "var(--or)" : "var(--noir-3)"};color:${categorie === c ? "#171310" : "var(--gris)"};border:var(--bordure);border-radius:999px;padding:.45rem 1.1rem;cursor:pointer;font-weight:600">${esc(c)}</button>`).join("");
    }
  } catch { zone.innerHTML = `<div class="tp-vide">Le fil d'actualité arrive bientôt.</div>`; }
}

filtres.addEventListener("click", (e) => {
  const b = e.target.closest("button"); if (!b) return;
  categorie = b.dataset.cat; charge(true);
});
btnPlus.addEventListener("click", () => { page++; charge(); });
zone.addEventListener("click", async (e) => {
  const b = e.target.closest("[data-copie]"); if (!b) return;
  try { await navigator.clipboard.writeText(b.dataset.copie); toast("Lien copié !"); } catch { /* silencieux */ }
});

charge();
