-- ============================================================
-- TOUCH PRO — Panneau Gérant (style Yves Store)
-- Colonnes supplémentaires + mouvements de stock + photos
-- Idempotent : peut être exécuté plusieurs fois sans erreur.
-- ============================================================

-- ---------- Clients : blocage + ville ----------
alter table public.profils_clients add column if not exists bloque boolean not null default false;
alter table public.profils_clients add column if not exists ville text;

-- Un client bloqué ne peut plus passer commande
drop policy if exists cmd_insertion on public.commandes;
create policy cmd_insertion on public.commandes for insert
  with check (
    not exists (select 1 from public.profils_clients p
                where p.id = auth.uid() and p.bloque = true)
  );

-- ---------- Avis : réponse du gérant + marqueur « lu » ----------
alter table public.avis add column if not exists reponse text;
alter table public.avis add column if not exists lu boolean not null default false;

-- ---------- Table admin : colonne email (compatibilité ancien panneau) ----------
alter table public.admin add column if not exists email text;
update public.admin a set email = u.email from auth.users u
  where u.id = a.user_id and (a.email is null or a.email = '');

-- ---------- Mouvements de stock (entrées / sorties) ----------
create table if not exists public.mouvements_stock (
  id bigint generated always as identity primary key,
  produit_id bigint references public.produits(id) on delete cascade,
  type text not null check (type in ('entree','sortie')),
  quantite integer not null check (quantite > 0),
  motif text,
  created_at timestamptz not null default now()
);
alter table public.mouvements_stock enable row level security;

drop policy if exists mvs_admin on public.mouvements_stock;
create policy mvs_admin on public.mouvements_stock for all
  using (exists (select 1 from public.admin a where a.user_id = auth.uid()))
  with check (exists (select 1 from public.admin a where a.user_id = auth.uid()));

-- Chaque article commandé enregistre une sortie de stock
create or replace function public.log_sortie_stock()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.mouvements_stock (produit_id, type, quantite, motif)
  values (new.produit_id, 'sortie', new.quantite, 'Commande #' || new.commande_id);
  return new;
end $$;

drop trigger if exists trg_sortie_stock on public.commande_items;
create trigger trg_sortie_stock
  after insert on public.commande_items
  for each row execute function public.log_sortie_stock();

-- Annulation de commande = retour en stock (entrée)
create or replace function public.log_retour_annulation()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.statut = 'annulee' and old.statut is distinct from 'annulee' then
    insert into public.mouvements_stock (produit_id, type, quantite, motif)
    select ci.produit_id, 'entree', ci.quantite, 'Annulation commande #' || new.id
    from public.commande_items ci where ci.commande_id = new.id;
    update public.produits p set stock = p.stock + ci.quantite
    from public.commande_items ci
    where ci.commande_id = new.id and ci.produit_id = p.id;
  end if;
  return new;
end $$;

drop trigger if exists trg_retour_annulation on public.commandes;
create trigger trg_retour_annulation
  after update of statut on public.commandes
  for each row execute function public.log_retour_annulation();

-- ---------- Photos produits : bucket Storage public ----------
insert into storage.buckets (id, name, public)
values ('produits', 'produits', true)
on conflict (id) do nothing;

drop policy if exists photos_lecture_publique on storage.objects;
create policy photos_lecture_publique on storage.objects for select
  using (bucket_id = 'produits');

drop policy if exists photos_ecriture_admin on storage.objects;
create policy photos_ecriture_admin on storage.objects for insert
  with check (bucket_id = 'produits'
    and exists (select 1 from public.admin a where a.user_id = auth.uid()));

drop policy if exists photos_maj_admin on storage.objects;
create policy photos_maj_admin on storage.objects for update
  using (bucket_id = 'produits'
    and exists (select 1 from public.admin a where a.user_id = auth.uid()));

drop policy if exists photos_suppression_admin on storage.objects;
create policy photos_suppression_admin on storage.objects for delete
  using (bucket_id = 'produits'
    and exists (select 1 from public.admin a where a.user_id = auth.uid()));

-- ============================================================
-- FIN — Panneau Gérant
-- ============================================================
