-- TOUCH PRO — ÉTAPE 3/4 — notifications e-mail & sécurité (exécutez les étapes dans l'ordre 1→2→3→4, bouton Run)

---------- Sécurité anti-CSRF/anti-spam sur les nouveaux formulaires ----------
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

-- 
---------- Décrément de stock automatique à la commande ----------
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
