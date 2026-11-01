-- Le Caracas : base de données Supabase.
-- À coller en entier dans Supabase > SQL Editor > New query, puis « Run ». Peut être relancé sans risque.
--
-- Toutes les données de l'espace employé sont dans une seule table « elements » :
-- une ligne par élément (vente, pointage, dépense, employé…), rangée par « collection ».
-- Connexion : comptes Supabase Auth dont l'e-mail est « identifiant@caracas.app ».

create extension if not exists pgcrypto with schema extensions;

create table if not exists public.elements (
  collection text not null,
  id text not null,
  data jsonb not null,
  maj timestamptz not null default now(),
  primary key (collection, id)
);
alter table public.elements enable row level security;
-- Droits de base (la sécurité ligne par ligne ci-dessous décide ensuite qui voit quoi)
grant select, insert, update, delete on public.elements to anon, authenticated;
alter table public.elements replica identity full;

-- ---------- Qui est connecté ? (security definer : lit la table sans passer par la sécurité) ----------
create or replace function public.mon_compte() returns jsonb
language sql stable security definer set search_path = public as $$
  select data from public.elements
  where collection = 'comptes' and data->>'userId' = auth.uid()::text
  limit 1
$$;

create or replace function public.mon_poste() returns text
language sql stable security definer set search_path = public as $$
  select e.data->>'poste' from public.elements e
  where e.collection = 'equipe' and e.id = (public.mon_compte()->>'employeId')
$$;

create or replace function public.est_employe() returns boolean
language sql stable security definer set search_path = public as $$
  select coalesce((public.mon_compte()->>'actif')::boolean, false)
$$;

create or replace function public.est_responsable() returns boolean
language sql stable security definer set search_path = public as $$
  select public.est_employe() and coalesce(public.mon_poste() in ('patron', 'copatron', 'manager'), false)
$$;

create or replace function public.est_patron() returns boolean
language sql stable security definer set search_path = public as $$
  select public.est_employe() and coalesce(public.mon_poste() = 'patron', false)
$$;

-- Poste d'une fiche Équipe (par son id)
create or replace function public.poste_de(p_employe text) returns text
language sql stable security definer set search_path = public as $$
  select data->>'poste' from public.elements where collection = 'equipe' and id = p_employe
$$;

-- Une fiche Équipe ou un compte touchant au patron ne peut être modifié que par le patron.
create or replace function public.modifiable_par_moi(p_collection text, p_data jsonb) returns boolean
language sql stable security definer set search_path = public as $$
  select public.est_patron() or (
    case p_collection
      when 'equipe' then coalesce(p_data->>'poste', '') <> 'patron'
      when 'comptes' then coalesce(public.poste_de(p_data->>'employeId'), '') <> 'patron'
      else true
    end
  )
$$;

-- Vrai tant qu'aucun compte n'existe : autorise la première installation (compte du patron).
create or replace function public.base_vide() returns boolean
language sql stable security definer set search_path = public as $$
  select not exists (select 1 from public.elements where collection = 'comptes')
$$;

-- ---------- Règles d'accès ----------
drop policy if exists "employes lisent" on public.elements;
drop policy if exists "employes ecrivent" on public.elements;
drop policy if exists "employes modifient" on public.elements;
drop policy if exists "employes suppriment" on public.elements;
drop policy if exists "direction ajoute equipe et comptes" on public.elements;
drop policy if exists "direction modifie equipe et comptes" on public.elements;
drop policy if exists "direction supprime equipe et comptes" on public.elements;
drop policy if exists "premiere installation" on public.elements;
drop policy if exists "premiere installation lecture" on public.elements;
drop policy if exists "patron lit les mots de passe" on public.elements;
drop policy if exists "public lit le catalogue" on public.elements;
drop policy if exists "public envoie une reservation" on public.elements;

-- Employés (compte actif) : lisent tout sauf les mots de passe en clair (collection « mdp »),
-- écrivent tout sauf l'équipe et les comptes (réservés à la direction, voir plus bas).
create policy "employes lisent" on public.elements for select to authenticated
  using (public.est_employe() and collection <> 'mdp');
create policy "employes ecrivent" on public.elements for insert to authenticated
  with check (public.est_employe() and collection not in ('mdp', 'equipe', 'comptes'));
create policy "employes modifient" on public.elements for update to authenticated
  using (public.est_employe() and collection not in ('mdp', 'equipe', 'comptes'))
  with check (public.est_employe() and collection not in ('mdp', 'equipe', 'comptes'));
create policy "employes suppriment" on public.elements for delete to authenticated
  using (public.est_employe() and collection not in ('mdp', 'equipe', 'comptes'));

-- Équipe et comptes : direction uniquement ; la fiche et le compte du patron, par le patron seul.
create policy "direction ajoute equipe et comptes" on public.elements for insert to authenticated
  with check (public.est_responsable() and collection in ('equipe', 'comptes') and public.modifiable_par_moi(collection, data));
create policy "direction modifie equipe et comptes" on public.elements for update to authenticated
  using (public.est_responsable() and collection in ('equipe', 'comptes') and public.modifiable_par_moi(collection, data))
  with check (public.est_responsable() and collection in ('equipe', 'comptes') and public.modifiable_par_moi(collection, data));
create policy "direction supprime equipe et comptes" on public.elements for delete to authenticated
  using (public.est_responsable() and collection in ('equipe', 'comptes') and public.modifiable_par_moi(collection, data));

-- Première installation : le tout premier compte (patron) peut créer les données de départ.
create policy "premiere installation" on public.elements for insert to authenticated
  with check (public.base_vide() and collection <> 'mdp');
-- (l'enregistrement « insérer ou mettre à jour » vérifie aussi la règle de lecture)
create policy "premiere installation lecture" on public.elements for select to authenticated
  using (public.base_vide() and collection <> 'mdp');

-- Mots de passe en clair : visibles par le patron uniquement (écrits par la fonction definir_mdp).
create policy "patron lit les mots de passe" on public.elements for select to authenticated
  using (collection = 'mdp' and public.est_patron());

-- Site public : lit les véhicules publiés, envoie des demandes de réservation.
create policy "public lit le catalogue" on public.elements for select to anon, authenticated
  using (collection = 'vehicules' and coalesce(data->>'publie', 'true') <> 'false');
create policy "public envoie une reservation" on public.elements for insert to anon, authenticated
  with check (collection = 'reservations' and data->>'statut' = 'nouvelle');

-- ---------- Gestion des comptes de connexion ----------
-- Change le mot de passe d'un compte et garde une copie lisible par le patron.
-- Autorisé : soi-même, ou un responsable.
create or replace function public.definir_mdp(p_user uuid, p_mdp text) returns void
language plpgsql security definer set search_path = public, extensions, auth as $$
begin
  if not (public.est_employe() and (p_user = auth.uid() or public.est_responsable())) then
    raise exception 'non autorisé';
  end if;
  if length(p_mdp) < 6 then raise exception 'mot de passe trop court'; end if;
  update auth.users set encrypted_password = extensions.crypt(p_mdp, extensions.gen_salt('bf')), updated_at = now() where id = p_user;
  insert into public.elements (collection, id, data, maj)
  values ('mdp', p_user::text, jsonb_build_object('mdp', p_mdp), now())
  on conflict (collection, id) do update set data = excluded.data, maj = now();
end $$;

-- Change l'identifiant (e-mail de connexion) d'un compte. Réservé aux responsables.
create or replace function public.changer_identifiant(p_user uuid, p_email text) returns void
language plpgsql security definer set search_path = public, auth as $$
begin
  if not public.est_responsable() then raise exception 'non autorisé'; end if;
  update auth.users set email = lower(p_email), updated_at = now() where id = p_user;
  update auth.identities set identity_data = jsonb_set(identity_data, '{email}', to_jsonb(lower(p_email)))
    where user_id = p_user and provider = 'email';
end $$;

-- Supprime un compte de connexion. Réservé aux responsables, jamais son propre compte.
create or replace function public.supprimer_utilisateur(p_user uuid) returns void
language plpgsql security definer set search_path = public, auth as $$
begin
  if not public.est_responsable() or p_user = auth.uid() then raise exception 'non autorisé'; end if;
  delete from public.elements where collection = 'mdp' and id = p_user::text;
  delete from auth.users where id = p_user;
end $$;

-- La page de connexion du site doit savoir si la base est vide (première installation).
grant execute on function public.base_vide() to anon, authenticated;
grant execute on function public.definir_mdp(uuid, text) to authenticated;
grant execute on function public.changer_identifiant(uuid, text) to authenticated;
grant execute on function public.supprimer_utilisateur(uuid) to authenticated;
revoke execute on function public.definir_mdp(uuid, text) from anon;
revoke execute on function public.changer_identifiant(uuid, text) from anon;
revoke execute on function public.supprimer_utilisateur(uuid) from anon;

-- ---------- Temps réel : chaque modification arrive aussitôt chez les autres employés ----------
do $$
begin
  if not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'elements') then
    alter publication supabase_realtime add table public.elements;
  end if;
end $$;
