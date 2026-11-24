/* TOUCH PRO ACCESS / FASHION — grille produits du département (data-dep sur <body>) */
import { initPage, chargeProduits, majBadgePanier } from "./tp-pages.js?v=21";

initPage(document.body.dataset.dep + ".html");
chargeProduits("#grille", document.body.dataset.dep);
majBadgePanier();
