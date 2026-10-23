-- Invoice dependencies and atomic patient deletion. Does not delete existing data.
begin;
set local lock_timeout='5s';

-- A checkout lock is an internal child of its invoice, not a financial record.
alter table public.payment_checkout_locks
 drop constraint if exists payment_checkout_locks_pagamento_id_fkey;
alter table public.payment_checkout_locks
 add constraint payment_checkout_locks_pagamento_id_fkey
 foreign key(pagamento_id) references public.pagamentos(id) on delete cascade;

-- Retain the adjustment audit even when an administrator deletes an invoice.
alter table public.billing_credit_audit alter column pagamento_id drop not null;
alter table public.billing_credit_audit
 drop constraint if exists billing_credit_audit_pagamento_id_fkey;
alter table public.billing_credit_audit
 add constraint billing_credit_audit_pagamento_id_fkey
 foreign key(pagamento_id) references public.pagamentos(id) on delete set null;

-- Keep sessoes.pagamento_id protected: deleting an invoice must never silently
-- remove the payment that covers an existing appointment.

create or replace function public.acolher_delete_patient(p_patient uuid)
returns void language plpgsql security invoker set search_path='' as $$
declare target_user uuid;
begin
 if auth.uid() is null or not public.acolher_is_admin() then
  raise exception 'Acesso exclusivo da administração.' using errcode='42501';
 end if;
 perform pg_advisory_xact_lock(hashtextextended('acolher-calendar',0));
 select p.user_id into target_user from public.pacientes p
 join public.profiles profile on profile.id=p.user_id and profile.tipo='paciente'
 where p.id=p_patient for update of p;
 if target_user is null then
  raise exception 'Paciente não encontrado ou perfil protegido.' using errcode='22023';
 end if;

 -- A single database call is atomic. Any remaining FK/RLS error rolls ALL of
 -- these statements back, including deletions performed by existing triggers.
 delete from public.sessoes where paciente_id=p_patient;
 delete from public.pagamentos where paciente_id=p_patient;
 delete from public.anamneses where paciente_id=p_patient;
 delete from public.prontuarios where paciente_id=p_patient;
 -- Existing profile FKs anonymize messages and cascade notifications.
 delete from public.pacientes where id=p_patient;
end $$;
revoke all on function public.acolher_delete_patient(uuid) from public,anon;
grant execute on function public.acolher_delete_patient(uuid) to authenticated;
-- The legacy Auth cleanup trigger runs inside the RPC's empty search_path.
alter function public.delete_patient_user_cascade() set search_path=public,pg_temp;
commit;
