/* ==========================================================================
   Page « Services & Tarifs » : liste complète regroupée par catégorie.
   Stratégie « jamais vide » : les tarifs de démonstration s'affichent
   immédiatement, puis sont remplacés par les vrais si la base répond.
   ========================================================================== */

import { loadServices, FALLBACK, el } from "./data.js";
import { serviceCard } from "./home.js";
import { animeReveals } from "./tp-config.js?v=19";

const ORDRE_CATEGORIES = ["Homme", "Femme"];

function affiche(services) {
  const zone = document.getElementById("servicesList");
  if (!zone) return;
  const parCategorie = new Map();
  for (const s of services) {
    if (!parCategorie.has(s.categorie)) parCategorie.set(s.categorie, []);
    parCategorie.get(s.categorie).push(s);
  }

  const fragments = [];
  const categories = [
    ...ORDRE_CATEGORIES.filter((c) => parCategorie.has(c)),
    ...[...parCategorie.keys()].filter((c) => !ORDRE_CATEGORIES.includes(c)),
  ];

  for (const cat of categories) {
    const section = el("section", { class: "service-group", "aria-labelledby": `cat-${cat}` });
    const head = el("div", { class: "section-head reveal" });
    head.append(el("h2", { id: `cat-${cat}`, text: cat }));
    const grid = el("div", { class: "grid grid-3" });
    grid.append(...parCategorie.get(cat).map((s) => serviceCard(s, true)));
    section.append(head, grid);
    section.style.marginBottom = "3rem";
    fragments.push(section);
  }

  zone.replaceChildren(...fragments);
  animeReveals();
}

function renderServices() {
  if (!document.getElementById("servicesList")) return;
  affiche(FALLBACK.services); // immédiat — jamais de trou noir
  loadServices().then((s) => { if (s !== FALLBACK.services) affiche(s); }); // remplace si la base répond
}

renderServices();
