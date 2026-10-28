-- Restore the private bucket used by the existing anamnesis upload and download flows.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('clinica_documentos', 'clinica_documentos', false, 10485760,
        array['application/pdf', 'image/jpeg', 'image/png'])
on conflict (id) do update
set public = false, file_size_limit = excluded.file_size_limit,
    allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists acolher_documents_admin on storage.objects;
create policy acolher_documents_admin on storage.objects
for all to authenticated
using (bucket_id = 'clinica_documentos' and public.acolher_is_admin())
with check (bucket_id = 'clinica_documentos' and public.acolher_is_admin());

drop policy if exists acolher_documents_patient on storage.objects;
create policy acolher_documents_patient on storage.objects
for select to authenticated
using (
  bucket_id = 'clinica_documentos'
  and exists (
    select 1 from public.pacientes
    where id::text = (storage.foldername(name))[1]
      and user_id = (select auth.uid())
  )
);

-- Existing policies for public images remain unchanged. This guard also prevents
-- an unrelated permissive policy from exposing clinical documents.
drop policy if exists acolher_documents_guard on storage.objects;
create policy acolher_documents_guard on storage.objects
as restrictive for all to anon, authenticated
using (
  bucket_id <> 'clinica_documentos'
  or public.acolher_is_admin()
  or ((select auth.uid()) is not null and exists (
    select 1 from public.pacientes
    where id::text = (storage.foldername(name))[1]
      and user_id = (select auth.uid())
  ))
)
with check (
  bucket_id <> 'clinica_documentos' or public.acolher_is_admin()
);
