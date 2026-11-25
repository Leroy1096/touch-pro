-- ============================================================
-- TOUCH PRO — correctif : anti-spam compatible TOUTES les tables
-- (commandes a client_telephone/client_nom, pas email/telephone)
-- Lecture via JSON : plus jamais d'erreur « no field ».
-- ============================================================

create or replace function public.securise_insertion_publique() returns trigger
language plpgsql security definer set search_path = public as $$
declare
  v_empreinte text;
  v jsonb := to_jsonb(new);
begin
  perform public.verifie_origine();
  v_empreinte := coalesce(
    nullif(v->>'client_telephone', ''),
    nullif(v->>'telephone', ''),
    nullif(v->>'email', ''),
    nullif(v->>'client_nom', ''),
    nullif(v->>'nom', ''),
    '?');
  perform public.antispam_controle(TG_TABLE_NAME, v_empreinte);
  return new;
end $$;

-- ============================================================
-- FIN DU CORRECTIF
-- ============================================================
