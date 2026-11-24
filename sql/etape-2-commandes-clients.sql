-- TOUCH PRO — ÉTAPE 2/4 — commandes, réparations, devis, profils
-- Exécutez les 4 étapes DANS L'ORDRE (1, 2, 3 puis 4) : coller → Run → suivant.

-- ---------- Commandes ----------
create table if not exists public.commandes (
  id bigint generated always as identity primary key,
  client_id uuid references auth.users(id) on delete set null,
  client_nom text not null,
  client_telephone text not null,
  livraison text not null default 'boutique' check (livraison in ('boutique','livraison')),
  adresse_livraison text,
  paiement text not null default 'a_la_livraison' check (paiement in ('a_la_livraison','en_boutique','mobile_money')),
  total integer not null default 0 check (total >= 0),
  statut text not null default 'en_attente' check (statut in ('en_attente','confirmee','prete','livree','annulee')),
  note text,
  created_at timestamptz default now()
);
alter table public.commandes enable row level security;
create policy cmd_insertion on public.commandes for insert with check (true);
create policy cmd_lecture_propre on public.commandes for select using (auth.uid() = client_id);
create policy cmd_admin on public.commandes for all using (public.is_admin()) with check (public.is_admin());

create table if not exists public.commande_items (
  id bigint generated always as identity primary key,
  commande_id bigint not null references public.commandes(id) on delete cascade,
  produit_id bigint references public.produits(id) on delete set null,
  nom_produit text not null,
  prix_unitaire integer not null check (prix_unitaire >= 0),
  quantite integer not null check (quantite > 0),
  taille text
);
alter table public.commande_items enable row level security;
create policy items_insertion on public.commande_items for insert with check (true);
create policy items_lecture_propre on public.commande_items for select
  using (exists (select 1 from public.commandes c where c.id = commande_id and c.client_id = auth.uid()));
create policy items_admin on public.commande_items for all using (public.is_admin()) with check (public.is_admin());

-- ---------- Réparations (TECH) ----------
create table if not exists public.reparations (
  id bigint generated always as identity primary key,
  client_id uuid references auth.users(id) on delete set null,
  client_nom text not null,
  client_telephone text not null,
  appareil text not null,
  panne text not null,
  statut text not null default 'recu' check (statut in ('recu','diagnostic','en_cours','pret','livre','annule')),
  devis_montant integer check (devis_montant is null or devis_montant >= 0),
  note_interne text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);
alter table public.reparations enable row level security;
create policy repa_insertion on public.reparations for insert with check (true);
create policy repa_lecture_propre on public.reparations for select using (auth.uid() = client_id);
create policy repa_admin on public.reparations for all using (public.is_admin()) with check (public.is_admin());

-- ---------- Devis (DIGITAL) ----------
create table if not exists public.devis (
  id bigint generated always as identity primary key,
  client_id uuid references auth.users(id) on delete set null,
  nom text not null,
  telephone text,
  email text,
  service text not null,              -- shooting, logo, flyer, vidéo, site web, contenu RS, musique…
  description text not null,
  budget integer check (budget is null or budget >= 0),
  statut text not null default 'en_attente' check (statut in ('en_attente','envoye','accepte','refuse')),
  created_at timestamptz default now()
);
alter table public.devis enable row level security;
create policy devis_insertion on public.devis for insert with check (true);
create policy devis_lecture_propre on public.devis for select using (auth.uid() = client_id);
create policy devis_admin on public.devis for all using (public.is_admin()) with check (public.is_admin());

-- ---------- Promotions ----------
create table if not exists public.promotions (
  id bigint generated always as identity primary key,
  titre text not null,
  description text,
  image_url text,
  departement text references public.departements(code),
  date_debut date,
  date_fin date,
  actif boolean default true
);
alter table public.promotions enable row level security;
create policy promo_lecture_publique on public.promotions for select
  using (actif and (date_debut is null or date_debut <= current_date) and (date_fin is null or date_fin >= current_date));
create policy promo_admin on public.promotions for all using (public.is_admin()) with check (public.is_admin());

-- ---------- Infos entreprise (singleton, carte de visite) ----------
create table if not exists public.infos_entreprise (
  id boolean primary key default true check (id),
  nom text default 'TOUCH PRO',
  slogan text default 'Tout ce dont vous avez besoin, au même endroit !',
  whatsapp text default '2250140810415',
  telephone text default '01 40 81 04 15',
  adresse text default 'Oupoyo, derrière le marché, Carrefour Boutique de Malick',
  horaires jsonb default '{"Lun-Sam":"08:00 – 20:00","Dimanche":"Fermé"}',
  reseaux jsonb default '{}',
  description text default 'Centre multiservices : beauté, technologie, mode et création digitale.',
  logo_url text
);
alter table public.infos_entreprise enable row level security;
create policy infos_lecture_publique on public.infos_entreprise for select using (true);
create policy infos_admin on public.infos_entreprise for all using (public.is_admin()) with check (public.is_admin());
insert into public.infos_entreprise (id) values (true) on conflict (id) do nothing;

-- ---------- Profils clients (comptes Supabase Auth) ----------
create table if not exists public.profils_clients (
  id uuid primary key references auth.users(id) on delete cascade,
  nom text,
  telephone text,
  created_at timestamptz default now()
);
alter table public.profils_clients enable row level security;
create policy profil_propre on public.profils_clients for select using (auth.uid() = id);
create policy profil_update on public.profils_clients for update using (auth.uid() = id) with check (auth.uid() = id);
create policy profil_admin on public.profils_clients for all using (public.is_admin()) with check (public.is_admin());
-- Création automatique du profil à l'inscription
create or replace function public.cree_profil_client() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into public.profils_clients (id, nom, telephone)
  values (new.id, new.raw_user_meta_data ->> 'nom', new.raw_user_meta_data ->> 'telephone')
  on conflict (id) do nothing;
  return new;
end $$;
drop trigger if exists trg_profil_client on auth.users;
create trigger trg_profil_client after insert on auth.users
  for each row execute function public.cree_profil_client();
