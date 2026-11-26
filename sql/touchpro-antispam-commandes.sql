-- ============================================================
-- TOUCH PRO — anti-spam assoupli pour les COMMANDES
-- Un client qui passe plusieurs commandes ne doit jamais être
-- bloqué : 10 commandes / 10 min par contact (au lieu de 3),
-- 20 / 10 min par IP, cap global 300 insertions / heure.
-- Les autres formulaires gardent la limite stricte (3 / 10 min).
-- ============================================================

create or replace function public.antispam_controle(p_sujet text, p_empreinte text)
returns void language plpgsql security definer set search_path = public as $$
declare
  v_headers text;
  v_ip      text;
  n         integer;
  v_max_contact integer := case when p_sujet = 'commandes' then 10 else 3 end;
  v_max_ip      integer := case when p_sujet = 'commandes' then 20 else 10 end;
begin
  delete from public.antispam_journal where cree_le < now() - interval '24 hours';

  v_headers := current_setting('request.headers', true);
  if v_headers is not null and btrim(v_headers) <> '' then
    v_ip := nullif(btrim(split_part(v_headers::json ->> 'x-forwarded-for', ',', 1)), '');
  end if;

  -- a) même téléphone / même e-mail
  select count(*) into n from public.antispam_journal
   where sujet = p_sujet and empreinte = p_empreinte and cree_le > now() - interval '10 minutes';
  if n >= v_max_contact then
    raise exception 'Trop de demandes en peu de temps depuis ce contact. Réessayez dans quelques minutes ou appelez-nous directement.' using errcode = 'P0001';
  end if;

  -- b) même adresse IP
  if v_ip is not null then
    select count(*) into n from public.antispam_journal
     where sujet = p_sujet and ip = v_ip and cree_le > now() - interval '10 minutes';
    if n >= v_max_ip then
      raise exception 'Trop de demandes en peu de temps depuis votre connexion. Réessayez dans quelques minutes.' using errcode = 'P0001';
    end if;
  end if;

  -- c) cap global relevé : 300 insertions publiques par heure
  select count(*) into n from public.antispam_journal where cree_le > now() - interval '1 hour';
  if n >= 300 then
    raise exception 'Le salon reçoit beaucoup de demandes en ce moment. Merci de réessayer dans quelques minutes.' using errcode = 'P0001';
  end if;

  insert into public.antispam_journal (sujet, empreinte, ip) values (p_sujet, p_empreinte, v_ip);
end $$;

notify pgrst, 'reload schema';
