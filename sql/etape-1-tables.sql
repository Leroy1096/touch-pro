-- TOUCH PRO — ÉTAPE 1/4 — tables boutique & contenus (exécutez les étapes dans l'ordre 1→2→3→4, bouton Run)

---------- Départements ----------
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
alter table public.produits add column if not exists categorie text; -- rayon boutique (accessoires|homme|femme|chaussures|sacs|beaute)
alter table public.produits add column if not exists ventes integer not null default 0;
alter table public.produits add column if not exists note numeric(2,1);
alter table public.produits add column if not exists badge text;
alter table public.produits add column if not exists flash boolean not null default false;
alter table public.produits add column if not exists points jsonb default '[]';
alter table public.produits enable row level security;
create policy produits_lecture_publique on public.produits for select using (actif);
create policy produits_admin on public.produits for all using (public.is_admin()) with check (public.is_admin());

--
