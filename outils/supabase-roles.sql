-- Le Caracas : mise à jour des rôles (Admin caché, Comptable). À exécuter après supabase.sql.
-- Niveaux d'accès : admin 3 > patron et comptable 2 (mêmes accès) > les autres 1.
-- Personne ne peut modifier une fiche, un compte ou un mot de passe d'un niveau supérieur au sien.

create or replace function public.niveau(p_poste text) returns int
language sql immutable as $$
  select case p_poste when 'admin' then 3 when 'patron' then 2 when 'comptable' then 2 else 1 end
$$;

create or replace function public.est_responsable() returns boolean
language sql stable security definer set search_path = public as $$
  select public.est_employe() and coalesce(public.mon_poste() in ('admin', 'patron', 'copatron', 'comptable', 'manager'), false)
$$;

create or replace function public.est_patron() returns boolean
language sql stable security definer set search_path = public as $$
  select public.est_employe() and public.niveau(public.mon_poste()) >= 2
$$;

-- Niveau du titulaire d'un compte de connexion
create or replace function public.niveau_user(p_user uuid) returns int
language sql stable security definer set search_path = public as $$
  select public.niveau(public.poste_de((select data->>'employeId' from public.elements
    where collection = 'comptes' and data->>'userId' = p_user::text limit 1)))
$$;

-- Fiche Équipe / compte : modifiable seulement si son niveau ne dépasse pas le sien
create or replace function public.modifiable_par_moi(p_collection text, p_data jsonb) returns boolean
language sql stable security definer set search_path = public as $$
  select public.niveau(public.mon_poste()) >= public.niveau(
    case p_collection
      when 'equipe' then p_data->>'poste'
      when 'comptes' then public.poste_de(p_data->>'employeId')
      else null
    end)
$$;

-- Mots de passe en clair : direction (patron, comptable, admin), sauf ceux d'un niveau supérieur
drop policy if exists "patron lit les mots de passe" on public.elements;
create policy "patron lit les mots de passe" on public.elements for select to authenticated
  using (collection = 'mdp' and public.est_patron() and public.niveau(public.mon_poste()) >= public.niveau_user(id::uuid));

create or replace function public.definir_mdp(p_user uuid, p_mdp text) returns void
language plpgsql security definer set search_path = public, extensions, auth as $$
begin
  if not (public.est_employe() and (p_user = auth.uid() or
      (public.est_responsable() and public.niveau(public.mon_poste()) >= public.niveau_user(p_user)))) then
    raise exception 'non autorisé';
  end if;
  if length(p_mdp) < 6 then raise exception 'mot de passe trop court'; end if;
  update auth.users set encrypted_password = extensions.crypt(p_mdp, extensions.gen_salt('bf')), updated_at = now() where id = p_user;
  insert into public.elements (collection, id, data, maj)
  values ('mdp', p_user::text, jsonb_build_object('mdp', p_mdp), now())
  on conflict (collection, id) do update set data = excluded.data, maj = now();
end $$;

create or replace function public.changer_identifiant(p_user uuid, p_email text) returns void
language plpgsql security definer set search_path = public, auth as $$
begin
  if not public.est_responsable() or public.niveau(public.mon_poste()) < public.niveau_user(p_user) then
    raise exception 'non autorisé';
  end if;
  update auth.users set email = lower(p_email), updated_at = now() where id = p_user;
  update auth.identities set identity_data = jsonb_set(identity_data, '{email}', to_jsonb(lower(p_email)))
    where user_id = p_user and provider = 'email';
end $$;

create or replace function public.supprimer_utilisateur(p_user uuid) returns void
language plpgsql security definer set search_path = public, auth as $$
begin
  if not public.est_responsable() or p_user = auth.uid() or public.niveau(public.mon_poste()) < public.niveau_user(p_user) then
    raise exception 'non autorisé';
  end if;
  delete from public.elements where collection = 'mdp' and id = p_user::text;
  delete from auth.users where id = p_user;
end $$;
