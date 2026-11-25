-- ============================================================
-- TOUCH PRO — correctif : zones de livraison officielles
-- boutique (gratuit) · oupoyo (500 F) · autre (frais client)
-- ============================================================

alter table public.commandes drop constraint if exists commandes_livraison_check;
alter table public.commandes add constraint commandes_livraison_check
  check (livraison in ('boutique', 'oupoyo', 'autre', 'livraison'));

-- ============================================================
-- FIN DU CORRECTIF
-- ============================================================
