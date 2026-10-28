-- Exercise copies of the live Storage policies; no clinical record or real object is changed.
begin;
create schema acolher_storage_validation;
create table acolher_storage_validation.objects (like storage.objects including defaults including constraints);
alter table acolher_storage_validation.objects enable row level security;
grant usage on schema acolher_storage_validation to authenticated, anon;
grant select, insert, update, delete on acolher_storage_validation.objects to authenticated, anon;
do $copy$
declare p record; roles_sql text; command_sql text;
begin
 for p in select pol.*, pg_get_expr(polqual,polrelid) as q, pg_get_expr(polwithcheck,polrelid) as c
          from pg_policy pol where polrelid='storage.objects'::regclass loop
  select string_agg(case when r=0 then 'public' else quote_ident(pg_get_userbyid(r)) end, ',')
    into roles_sql from unnest(p.polroles) as r;
  command_sql := case p.polcmd when '*' then 'all' when 'r' then 'select'
                   when 'a' then 'insert' when 'w' then 'update' when 'd' then 'delete' end;
  execute format('create policy %I on acolher_storage_validation.objects as %s for %s to %s %s %s',
    p.polname, case when p.polpermissive then 'permissive' else 'restrictive' end,
    command_sql, roles_sql,
    case when p.q is null then '' else 'using ('||p.q||')' end,
    case when p.c is null then '' else 'with check ('||p.c||')' end);
 end loop;
end $copy$;
do $test$
declare admin_id uuid; patient_id uuid; patient_user uuid; other_id uuid := gen_random_uuid(); n integer;
begin
 select id into admin_id from public.profiles where tipo='admin' limit 1;
 select id,user_id into patient_id,patient_user from public.pacientes where user_id is not null limit 1;
 if admin_id is null or patient_user is null then raise exception 'Test requires existing admin and patient'; end if;
 insert into acolher_storage_validation.objects(bucket_id,name) values
 ('clinica_documentos',patient_id::text||'/fixture.pdf'),
 ('clinica_documentos',other_id::text||'/other.pdf');

 perform set_config('request.jwt.claims',json_build_object('sub',admin_id,'role','authenticated')::text,true);
 execute 'set local role authenticated';
 insert into acolher_storage_validation.objects(bucket_id,name) values ('clinica_documentos',patient_id::text||'/admin-test.pdf');
 select count(*) into n from acolher_storage_validation.objects where bucket_id='clinica_documentos';
 if n<>3 then raise exception 'Admin read failed'; end if;
 update acolher_storage_validation.objects set metadata='{"mimetype":"application/pdf"}'::jsonb where name=patient_id::text||'/admin-test.pdf';
 get diagnostics n=row_count; if n<>1 then raise exception 'Admin update failed'; end if;
 delete from acolher_storage_validation.objects where name=patient_id::text||'/admin-test.pdf';
 get diagnostics n=row_count; if n<>1 then raise exception 'Admin delete failed'; end if;
 execute 'reset role';

 perform set_config('request.jwt.claims',json_build_object('sub',patient_user,'role','authenticated')::text,true);
 execute 'set local role authenticated';
 select count(*) into n from acolher_storage_validation.objects where bucket_id='clinica_documentos';
 if n<>1 then raise exception 'Own patient read or cross-patient isolation failed'; end if;
 update acolher_storage_validation.objects set metadata='{}'::jsonb;
 get diagnostics n=row_count; if n<>0 then raise exception 'Patient update was allowed'; end if;
 delete from acolher_storage_validation.objects;
 get diagnostics n=row_count; if n<>0 then raise exception 'Patient delete was allowed'; end if;
 begin
  insert into acolher_storage_validation.objects(bucket_id,name) values ('clinica_documentos',patient_id::text||'/unauthorized.pdf');
  raise exception 'Patient upload was allowed';
 exception when insufficient_privilege then null; end;
 execute 'reset role';

 perform set_config('request.jwt.claims',json_build_object('sub',other_id,'role','authenticated')::text,true);
 execute 'set local role authenticated';
 select count(*) into n from acolher_storage_validation.objects;
 if n<>0 then raise exception 'Unrelated user could read files'; end if;
 execute 'reset role';

 perform set_config('request.jwt.claims','{"role":"anon"}',true);
 execute 'set local role anon';
 begin
  select count(*) into n from acolher_storage_validation.objects;
  if n<>0 then raise exception 'Anonymous read was allowed'; end if;
 exception when insufficient_privilege then null; end;
 execute 'reset role';
end $test$;
rollback;
select true as admin_upload_read_update_delete, true as patient_own_read_only,
       true as other_patients_blocked, true as anonymous_blocked, true as test_data_rolled_back;
