-- ============================================================================
-- TOUCH PRO — Migration multiservices (à exécuter sur la base existante)
-- Conserve TOUTES les tables et données existantes. Ajoute l'univers TOUCH PRO.
-- Conception : Kouamelan
-- ============================================================================

-- ---------- Départements ----------
create table if not exists public.departements (
  code text primary key,                  -- beauty | tech | access | fashion | digital
  nom text not null,
  description text,
  icone text,
  couleur text,
  ordre int default 0,
  actif boolean default true
);
alter table public.departements enable row level security;
create policy dept_lecture_publique on public.departements for select using (actif);
create policy dept_admin on public.departements for all using (public.is_admin()) with check (public.is_admin());
insert into public.departements (code, nom, description, icone, couleur, ordre) values
  ('beauty',  'TOUCH PRO BEAUTY',  'Coiffure homme & femme, barber shop, soins capillaires, mise en beauté.', '💇', '#d6a94f', 1),
  ('tech',    'TOUCH PRO TECH',    'Réparation de téléphones toutes marques, maintenance, diagnostic, suivi.', '📱', '#2ea8ff', 2),
  ('access',  'TOUCH PRO ACCESS',  'Coques, écouteurs, chargeurs, montres connectées, gadgets.', '🎧', '#8a7b5e', 3),
  ('fashion', 'TOUCH PRO FASHION', 'Vêtements homme & femme, chaussures, sacs, accessoires.', '👕', '#c05a7a', 4),
  ('digital', 'TOUCH PRO DIGITAL', 'Shooting photo, logos, flyers, vidéos, sites web, contenus réseaux sociaux.', '🎨', '#7a5ac0', 5)
on conflict (code) do nothing;

-- ---------- Publications (fil d'actualité) ----------
create table if not exists public.publications (
  id bigint generated always as identity primary key,
  departement text references public.departements(code),
  titre text not null,
  texte text,
  media_url text,
  media_type text default 'image' check (media_type in ('image','video','affiche')),
  categorie text not null default 'Actualités de l''entreprise',
  statut text not null default 'brouillon' check (statut in ('brouillon','publie','programme','archive')),
  date_publication timestamptz,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);
alter table public.publications enable row level security;
-- Public : uniquement les publications réellement publiées (jamais brouillon/programmé futur/archivé)
create policy publi_lecture_publique on public.publications for select
  using (statut = 'publie' and (date_publication is null or date_publication <= now()));
create policy publi_admin on public.publications for all using (public.is_admin()) with check (public.is_admin());

-- ---------- Produits (boutique) ----------
create table if not exists public.produits (
  id bigint generated always as identity primary key,
  departement text references public.departements(code),
  nom text not null,
  description text,
  prix integer not null check (prix >= 0),
  prix_promo integer check (prix_promo is null or prix_promo >= 0),
  stock integer not null default 0 check (stock >= 0),
  tailles text,                       -- ex. « S,M,L,XL » (fashion)
  image_url text,
  ventes integer not null default 0,  -- compteur « X vendus » (boutique façon Yves Store)
  note numeric(2,1),                  -- note moyenne affichée (ex. 4.8)
  badge text,                         -- « ★ Best-seller », « Nouveau », « Édition limitée »…
  flash boolean not null default false, -- apparaît dans les Ventes flash
  points jsonb default '[]',          -- points forts affichés sur la fiche produit
  actif boolean default true,
  created_at timestamptz default now()
);
-- Colonnes ajoutées après coup si la table existait déjà
alter table public.produits add column if not exists ventes integer not null default 0;
alter table public.produits add column if not exists note numeric(2,1);
alter table public.produits add column if not exists badge text;
alter table public.produits add column if not exists flash boolean not null default false;
alter table public.produits add column if not exists points jsonb default '[]';
alter table public.produits enable row level security;
create policy produits_lecture_publique on public.produits for select using (actif);
create policy produits_admin on public.produits for all using (public.is_admin()) with check (public.is_admin());

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

-- ---------- Sécurité anti-CSRF/anti-spam sur les nouveaux formulaires ----------
drop trigger if exists trg_securite_insertion on public.commandes;
create trigger trg_securite_insertion before insert on public.commandes
  for each row execute function public.securise_insertion_publique();
drop trigger if exists trg_securite_insertion on public.reparations;
create trigger trg_securite_insertion before insert on public.reparations
  for each row execute function public.securise_insertion_publique();
drop trigger if exists trg_securite_insertion on public.devis;
create trigger trg_securite_insertion before insert on public.devis
  for each row execute function public.securise_insertion_publique();

-- ---------- Notification e-mail étendue (commandes / réparations / devis) ----------
-- Le secret webhook est centralisé dans une table privée (rotation sans toucher au code)
create table if not exists public.config_app (
  cle text primary key,
  valeur text not null
);
revoke all on public.config_app from anon, authenticated;
insert into public.config_app (cle, valeur) values
  ('fnurl', 'https://zwtzaaygkxflnfmxaanj.supabase.co/functions/v1/notify-demande')
on conflict (cle) do nothing;
-- Récupère automatiquement le secret webhook depuis le trigger e-mail existant (aucune coupure)
do $$
declare def text; sec text;
begin
  select pg_get_functiondef(t.tgfoid) into def from pg_trigger t where t.tgname = 'trg_mail_msg' limit 1;
  if def is not null then
    sec := (regexp_match(def, 'x-webhook-secret[^0-9A-Za-z_-]+([0-9A-Za-z_\-]{16,})'))[1];
    if sec is not null then
      insert into public.config_app (cle, valeur) values ('webhook_secret', sec) on conflict (cle) do nothing;
    end if;
  end if;
end $$;

create or replace function public.notifie_demande_http() returns trigger
language plpgsql security definer set search_path = public as $$
declare v_url text; v_secret text;
begin
  select valeur into v_url from public.config_app where cle = 'fnurl';
  select valeur into v_secret from public.config_app where cle = 'webhook_secret';
  if v_url is null or v_secret is null then return new; end if;
  perform net.http_post(
    url := v_url,
    headers := jsonb_build_object('Content-Type','application/json','x-webhook-secret', v_secret),
    body := jsonb_build_object('table', TG_TABLE_NAME, 'record', to_jsonb(new))
  );
  return new;
exception when others then
  return new;  -- l'e-mail ne doit jamais bloquer une insertion
end $$;

drop trigger if exists trg_mail_cmd on public.commandes;
create trigger trg_mail_cmd after insert on public.commandes
  for each row execute function public.notifie_demande_http();
drop trigger if exists trg_mail_repa on public.reparations;
create trigger trg_mail_repa after insert on public.reparations
  for each row execute function public.notifie_demande_http();
drop trigger if exists trg_mail_devis on public.devis;
create trigger trg_mail_devis after insert on public.devis
  for each row execute function public.notifie_demande_http();
-- ⚠ rdv/messages_contact : leurs triggers e-mail existants (trg_mail_rdv / trg_mail_msg) restent inchangés.

-- ---------- Décrément de stock automatique à la commande ----------
create or replace function public.decremente_stock() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if new.produit_id is not null then
    update public.produits set stock = greatest(stock - new.quantite, 0) where id = new.produit_id;
  end if;
  return new;
end $$;
drop trigger if exists trg_stock on public.commande_items;
create trigger trg_stock after insert on public.commande_items
  for each row execute function public.decremente_stock();

-- Fin de migration TOUCH PRO.
