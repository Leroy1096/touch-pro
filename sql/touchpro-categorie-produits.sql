-- ==========================================================================
-- TOUCH PRO — Rayon boutique sur les produits
-- --------------------------------------------------------------------------
-- La boutique filtre par rayon (accessoires, homme, femme, chaussures, sacs,
-- beaute) lu dans `categorie` ; `departement` (beauty/tech/digital) reste
-- utilisé pour les pages départements. À exécuter une seule fois.
-- ==========================================================================

alter table public.produits add column if not exists categorie text;
comment on column public.produits.categorie is 'Rayon boutique : accessoires | homme | femme | chaussures | sacs | beaute';
create index if not exists produits_categorie_idx on public.produits (categorie) where actif;
