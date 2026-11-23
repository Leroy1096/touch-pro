-- ============================================================================
-- TOUCH PRO — Extension du catalogue BEAUTY (coiffure mixte + soins)
-- À exécuter APRÈS touchpro-migration.sql. Idempotent (on conflict do nothing).
-- ============================================================================

-- La catégorie accepte désormais aussi « Soins » (visage, pédicure, manucure)
alter table public.services drop constraint if exists services_categorie_check;
alter table public.services add constraint services_categorie_check
  check (categorie in ('Homme','Femme','Soins'));

-- Prestations complémentaires du catalogue officiel TOUCH PRO BEAUTY
insert into public.services (id, nom, description, categorie, prix, prix_max, duree_min, ordre) values
  -- Homme (compléments)
  ('a3000000-0000-4000-8000-000000000001','Traçage / Lignes','Devanture nette, design à la lame.','Homme',500,1000,20,12),
  ('a3000000-0000-4000-8000-000000000002','Tissage / Perruque homme','Pose et ajustement naturel.','Homme',5000,15000,60,13),
  ('a3000000-0000-4000-8000-000000000003','Coiffure événement homme','Mariage, anniversaire, shooting.','Homme',3000,8000,60,14),
  -- Femme (compléments)
  ('a3000000-0000-4000-8000-000000000004','Crochet braids','Pose crochet, mèches comprises.','Femme',3000,7000,150,13),
  ('a3000000-0000-4000-8000-000000000005','Silk press / Lissage brésilien','Lissage soyeux, protection thermique.','Femme',5000,12000,150,14),
  ('a3000000-0000-4000-8000-000000000006','Pose de cils / Make-up','Le complément beauté de votre coiffure.','Femme',2000,6000,45,15),
  -- Soins (mixte)
  ('a3000000-0000-4000-8000-000000000007','Soin du visage complet','Gommage, masque, serviette chaude.','Soins',2000,5000,45,1),
  ('a3000000-0000-4000-8000-000000000008','Manucure','Soin des mains, vernis au choix.','Soins',1500,4000,45,2),
  ('a3000000-0000-4000-8000-000000000009','Pédicure','Soin des pieds, vernis au choix.','Soins',2000,5000,60,3),
  ('a3000000-0000-4000-8000-000000000010','Forfait Manucure + Pédicure','Le duo soin complet.','Soins',3000,8000,90,4)
on conflict (nom) do nothing;

-- Fin de l'extension catalogue BEAUTY.
