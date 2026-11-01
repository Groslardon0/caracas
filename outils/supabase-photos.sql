-- Le Caracas : stockage des photos (véhicules, justificatifs). À exécuter après supabase.sql.
-- Dossier public « photos » : tout le monde peut voir les images (catalogue), seuls les employés peuvent en ajouter ou en supprimer.
-- Ne touche à aucune donnée existante.

insert into storage.buckets (id, name, public)
values ('photos', 'photos', true)
on conflict (id) do update set public = true;

drop policy if exists "photos ajout employes" on storage.objects;
drop policy if exists "photos suppression employes" on storage.objects;

create policy "photos ajout employes" on storage.objects for insert to authenticated
  with check (bucket_id = 'photos' and public.est_employe());
create policy "photos suppression employes" on storage.objects for delete to authenticated
  using (bucket_id = 'photos' and public.est_employe());

select id, public from storage.buckets where id = 'photos';
