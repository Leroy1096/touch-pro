/* ==========================================================================
   Client Supabase — v2.20 : librairie hébergée EN LOCAL (js/vendor/)
   Fini la dépendance au CDN (échecs sur 3G) + réessai automatique.
   Toutes les requêtes passent par ce client : les appels sont paramétrés
   par construction (postgREST), ce qui empêche toute injection SQL.
   ========================================================================== */

import { SUPABASE_URL, SUPABASE_ANON_KEY, isSupabaseConfigured } from "./config.js?v=16";

let clientPromise = null;

/** Charge la librairie Supabase locale (1 seule fois, avec 1 réessai). */
function chargeLibrairie(essais = 2) {
  return new Promise((resolve, reject) => {
    if (window.supabase?.createClient) return resolve();
    const tenter = (reste) => {
      const s = document.createElement("script");
      s.src = new URL("./vendor/supabase.min.js", import.meta.url).href;
      s.async = true;
      const echoue = () => {
        s.remove();
        if (reste > 0) setTimeout(() => tenter(reste - 1), 1200);
        else reject(new Error("librairie Supabase introuvable"));
      };
      const minuteur = setTimeout(echoue, 20000);
      s.onload = () => { clearTimeout(minuteur); resolve(); };
      s.onerror = () => { clearTimeout(minuteur); echoue(); };
      document.head.append(s);
    };
    tenter(essais);
  });
}

/** Retourne le client Supabase ou null si non configuré / hors-ligne. */
export function getSupabase() {
  if (!isSupabaseConfigured()) return Promise.resolve(null);
  if (clientPromise) return clientPromise;

  clientPromise = chargeLibrairie()
    .then(() =>
      window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
        auth: { persistSession: true, autoRefreshToken: true },
      })
    )
    .catch((err) => {
      console.warn("Supabase indisponible, mode dégradé :", err);
      clientPromise = null; // permet de réessayer sans recharger la page
      return null;
    });

  return clientPromise;
}
