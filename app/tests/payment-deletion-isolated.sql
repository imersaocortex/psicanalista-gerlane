-- Regression test using empty structural copies and synthetic identities only.
-- Covers invoice cleanup, audit retention, session protection, admin authorization,
-- atomic rollback on dependency errors, and removal of a simulated login.
begin;
create schema acolher_delete_validation;
create table acolher_delete_validation.profiles (like public.profiles including defaults including constraints including indexes);
create table acolher_delete_validation.pacientes (like public.pacientes including defaults including constraints including indexes);
create table acolher_delete_validation.pagamentos (like public.pagamentos including defaults including constraints including indexes);
create table acolher_delete_validation.sessoes (like public.sessoes including defaults including constraints including indexes);
create table acolher_delete_validation.anamneses (like public.anamneses including defaults including constraints including indexes);
create table acolher_delete_validation.prontuarios (like public.prontuarios including defaults including constraints including indexes);
create table acolher_delete_validation.mensagens (like public.mensagens including defaults including constraints including indexes);
create table acolher_delete_validation.notificacoes (like public.notificacoes including defaults including constraints including indexes);
create table acolher_delete_validation.payment_checkout_locks (like public.payment_checkout_locks including defaults including constraints including indexes);
create table acolher_delete_validation.billing_credit_audit (like public.billing_credit_audit including defaults including constraints including indexes);
create table acolher_delete_validation.auth_users(id uuid primary key);
set local search_path=acolher_delete_validation,public;
create function acolher_delete_validation.acolher_is_admin() returns boolean language sql stable security definer set search_path='' as $$ select exists(select 1 from acolher_delete_validation.profiles where id=auth.uid() and tipo='admin'); $$;
create function acolher_delete_validation.acolher_owns_patient(patient uuid) returns boolean language sql stable security definer set search_path='' as $$ select exists(select 1 from acolher_delete_validation.pacientes where id=patient and user_id=auth.uid()); $$;
do $$ declare c record; p record; roles text; begin
for c in select con.*, cl.relname from pg_constraint con join pg_class cl on cl.oid=con.conrelid where con.contype='f' and con.conrelid in ('public.profiles'::regclass,'public.pacientes'::regclass,'public.pagamentos'::regclass,'public.sessoes'::regclass,'public.anamneses'::regclass,'public.prontuarios'::regclass,'public.mensagens'::regclass,'public.notificacoes'::regclass,'public.payment_checkout_locks'::regclass,'public.billing_credit_audit'::regclass) and con.confrelid in ('public.profiles'::regclass,'public.pacientes'::regclass,'public.pagamentos'::regclass,'public.sessoes'::regclass,'public.anamneses'::regclass,'public.prontuarios'::regclass,'public.mensagens'::regclass,'public.notificacoes'::regclass,'public.payment_checkout_locks'::regclass,'public.billing_credit_audit'::regclass) loop
execute format('alter table acolher_delete_validation.%I add constraint %I %s',c.relname,c.conname,replace(pg_get_constraintdef(c.oid),'public.','acolher_delete_validation.'));
end loop;
for p in select pol.*,cl.relname from pg_policy pol join pg_class cl on cl.oid=pol.polrelid where pol.polrelid in ('public.profiles'::regclass,'public.pacientes'::regclass,'public.pagamentos'::regclass,'public.sessoes'::regclass,'public.anamneses'::regclass,'public.prontuarios'::regclass,'public.mensagens'::regclass,'public.notificacoes'::regclass,'public.payment_checkout_locks'::regclass,'public.billing_credit_audit'::regclass) loop
select string_agg(case when r=0 then 'public' else quote_ident(pg_get_userbyid(r)) end,',') into roles from unnest(p.polroles) r;
execute format('alter table acolher_delete_validation.%I enable row level security',p.relname);
execute format('create policy %I on acolher_delete_validation.%I as %s for %s to %s %s %s',p.polname,p.relname,case when p.polpermissive then 'permissive' else 'restrictive' end,case p.polcmd when 'r' then 'select' when 'a' then 'insert' when 'w' then 'update' when 'd' then 'delete' else 'all' end,roles,
case when p.polqual is null then '' else 'using('||replace(pg_get_expr(p.polqual,p.polrelid),'public.','acolher_delete_validation.')||')' end,
case when p.polwithcheck is null then '' else 'with check('||replace(pg_get_expr(p.polwithcheck,p.polrelid),'public.','acolher_delete_validation.')||')' end);
end loop; end $$;
create function acolher_delete_validation.delete_patient_user_cascade() returns trigger language plpgsql security definer as $$ begin delete from profiles where id=old.user_id; delete from acolher_delete_validation.auth_users where id=old.user_id; return old; end $$;
create trigger on_paciente_deleted after delete on acolher_delete_validation.pacientes for each row execute function acolher_delete_validation.delete_patient_user_cascade();
set local lock_timeout='5s';

-- A checkout lock is an internal child of its invoice, not a financial record.
alter table acolher_delete_validation.payment_checkout_locks
 drop constraint if exists payment_checkout_locks_pagamento_id_fkey;
alter table acolher_delete_validation.payment_checkout_locks
 add constraint payment_checkout_locks_pagamento_id_fkey
 foreign key(pagamento_id) references acolher_delete_validation.pagamentos(id) on delete cascade;

-- Retain the adjustment audit even when an administrator deletes an invoice.
alter table acolher_delete_validation.billing_credit_audit alter column pagamento_id drop not null;
alter table acolher_delete_validation.billing_credit_audit
 drop constraint if exists billing_credit_audit_pagamento_id_fkey;
alter table acolher_delete_validation.billing_credit_audit
 add constraint billing_credit_audit_pagamento_id_fkey
 foreign key(pagamento_id) references acolher_delete_validation.pagamentos(id) on delete set null;

-- Keep sessoes.pagamento_id protected: deleting an invoice must never silently
-- remove the payment that covers an existing appointment.

create or replace function acolher_delete_validation.acolher_delete_patient(p_patient uuid)
returns void language plpgsql security invoker set search_path='' as $$
declare target_user uuid;
begin
 if auth.uid() is null or not acolher_delete_validation.acolher_is_admin() then
  raise exception 'Acesso exclusivo da administração.' using errcode='42501';
 end if;
 perform pg_advisory_xact_lock(hashtextextended('acolher-calendar',0));
 select p.user_id into target_user from acolher_delete_validation.pacientes p
 join acolher_delete_validation.profiles profile on profile.id=p.user_id and profile.tipo='paciente'
 where p.id=p_patient for update of p;
 if target_user is null then
  raise exception 'Paciente não encontrado ou perfil protegido.' using errcode='22023';
 end if;

 -- A single database call is atomic. Any remaining FK/RLS error rolls ALL of
 -- these statements back, including deletions performed by existing triggers.
 delete from acolher_delete_validation.sessoes where paciente_id=p_patient;
 delete from acolher_delete_validation.pagamentos where paciente_id=p_patient;
 delete from acolher_delete_validation.anamneses where paciente_id=p_patient;
 delete from acolher_delete_validation.prontuarios where paciente_id=p_patient;
 -- Existing profile FKs anonymize messages and cascade notifications.
 delete from acolher_delete_validation.pacientes where id=p_patient;
end $$;
revoke all on function acolher_delete_validation.acolher_delete_patient(uuid) from public,anon;
grant execute on function acolher_delete_validation.acolher_delete_patient(uuid) to authenticated;
-- The legacy Auth cleanup trigger runs inside the RPC's empty search_path.
alter function acolher_delete_validation.delete_patient_user_cascade() set search_path=acolher_delete_validation,pg_temp;

grant usage on schema acolher_delete_validation to authenticated;
grant all on all tables in schema acolher_delete_validation to authenticated;
create table acolher_delete_validation.extra_dependency(patient uuid references acolher_delete_validation.pacientes(id));
grant select,delete on acolher_delete_validation.extra_dependency to authenticated;
do $$ declare admin uuid:=gen_random_uuid(); person uuid:=gen_random_uuid(); patient uuid:=gen_random_uuid(); pay uuid:=gen_random_uuid(); freepay uuid:=gen_random_uuid(); begin
insert into acolher_delete_validation.profiles(id,nome,tipo) values(admin,'Deletion test admin','admin'),(person,'Deletion test patient','paciente');
insert into acolher_delete_validation.auth_users values(person);
insert into acolher_delete_validation.pacientes(id,user_id,status) values(patient,person,'ativo');
insert into acolher_delete_validation.pagamentos(id,paciente_id,valor,tipo_plano,status,sessoes_contratadas) values(pay,patient,250,'avulso','pago',1),(freepay,patient,250,'avulso','processando',1);
insert into acolher_delete_validation.payment_checkout_locks(pagamento_id) values(pay),(freepay);
insert into acolher_delete_validation.billing_credit_audit(pagamento_id,actor_id,previous_total,new_total,reason) values(pay,admin,0,1,'Synthetic audit'),(freepay,admin,0,1,'Synthetic audit');
insert into acolher_delete_validation.sessoes(paciente_id,data,status,pagamento_id) values(patient,now()+interval '10 days','pendente',pay);
insert into acolher_delete_validation.extra_dependency values(patient);
perform set_config('test.admin',admin::text,true); perform set_config('test.person',person::text,true); perform set_config('test.patient',patient::text,true); perform set_config('test.pay',pay::text,true); perform set_config('test.freepay',freepay::text,true);
end $$;
set local role authenticated;
do $$ declare blocked boolean:=false; begin
perform set_config('request.jwt.claims',jsonb_build_object('sub',current_setting('test.person'),'role','authenticated')::text,true);
begin perform acolher_delete_validation.acolher_delete_patient(current_setting('test.patient')::uuid); exception when insufficient_privilege then blocked:=true; end;
if not blocked then raise exception 'Patient was allowed to delete'; end if;
perform set_config('request.jwt.claims',jsonb_build_object('sub',current_setting('test.admin'),'role','authenticated')::text,true);
delete from acolher_delete_validation.pagamentos where id=current_setting('test.freepay')::uuid;
if exists(select 1 from acolher_delete_validation.payment_checkout_locks where pagamento_id=current_setting('test.freepay')::uuid) then raise exception 'Checkout lock was not removed'; end if;
if not exists(select 1 from acolher_delete_validation.billing_credit_audit where pagamento_id is null) then raise exception 'Audit was not retained'; end if;
blocked:=false;
begin delete from acolher_delete_validation.pagamentos where id=current_setting('test.pay')::uuid; exception when foreign_key_violation then blocked:=true; end;
if not blocked then raise exception 'Invoice linked to session was deleted'; end if;
blocked:=false;
begin perform acolher_delete_validation.acolher_delete_patient(current_setting('test.patient')::uuid); exception when foreign_key_violation then blocked:=true; end;
if not blocked then raise exception 'Extra dependency was ignored'; end if;
if not exists(select 1 from acolher_delete_validation.pagamentos where id=current_setting('test.pay')::uuid) or not exists(select 1 from acolher_delete_validation.sessoes where paciente_id=current_setting('test.patient')::uuid) then raise exception 'Failed deletion was not atomic'; end if;
delete from acolher_delete_validation.extra_dependency where patient=current_setting('test.patient')::uuid;
perform acolher_delete_validation.acolher_delete_patient(current_setting('test.patient')::uuid);
if exists(select 1 from acolher_delete_validation.pacientes where id=current_setting('test.patient')::uuid) or exists(select 1 from acolher_delete_validation.profiles where id=current_setting('test.person')::uuid) or exists(select 1 from acolher_delete_validation.auth_users where id=current_setting('test.person')::uuid) then raise exception 'Patient/profile/login not fully removed'; end if;
if exists(select 1 from acolher_delete_validation.payment_checkout_locks) or (select count(*) from acolher_delete_validation.billing_credit_audit where pagamento_id is null)<>2 then raise exception 'Wrong cleanup or lost audit'; end if;
end $$;
reset role;
drop schema acolher_delete_validation cascade;
commit;