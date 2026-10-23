begin;

-- Scoped prerequisites for existing installations: only billing/booking tables and
-- the identity fields on which their authorization depends. No storage changes.
alter table public.pagamentos add column if not exists plano_id uuid references public.planos(id);
alter table public.pagamentos add column if not exists gateway_id text;
alter table public.pagamentos add column if not exists gateway_payment_id text;
alter table public.pagamentos drop constraint if exists pagamentos_status_check;
alter table public.pagamentos add constraint pagamentos_status_check check(status in ('pendente','processando','pago','vencido','cancelado'));
alter table public.pagamentos drop constraint if exists pagamentos_tipo_plano_check;
alter table public.pagamentos add constraint pagamentos_tipo_plano_check check(tipo_plano in ('avulso','mensal','trimestral','semestral','anual'));
create unique index if not exists acolher_gateway_payment_id on public.pagamentos(gateway_payment_id) where gateway_payment_id is not null;
create unique index if not exists acolher_patient_user on public.pacientes(user_id);
create table if not exists public.payment_checkout_locks (pagamento_id uuid primary key references public.pagamentos(id),created_at timestamptz default now());
create table if not exists public.asaas_events (id text primary key,payment_id text not null,event_type text not null,created_at timestamptz default now());
alter table public.payment_checkout_locks enable row level security;
alter table public.asaas_events enable row level security;

create or replace function public.acolher_is_admin() returns boolean language sql stable security definer set search_path='' as $$
 select exists(select 1 from public.profiles where id=auth.uid() and tipo='admin');
$$;
revoke all on function public.acolher_is_admin() from public,anon;
grant execute on function public.acolher_is_admin() to authenticated;
create or replace function public.acolher_owns_patient(patient uuid) returns boolean language sql stable security definer set search_path='' as $$
 select exists(select 1 from public.pacientes where id=patient and user_id=auth.uid());
$$;
revoke all on function public.acolher_owns_patient(uuid) from public,anon;
grant execute on function public.acolher_owns_patient(uuid) to authenticated;

create or replace function public.acolher_billing_identity_guard() returns trigger language plpgsql security definer set search_path='' as $$
begin
 if auth.role()='service_role' or public.acolher_is_admin() then return new; end if;
 if tg_table_name='profiles' then
  if tg_op='INSERT' then new.tipo:='paciente';
  elsif new.tipo is distinct from old.tipo or new.id is distinct from old.id then raise exception 'Tipo de acesso protegido.' using errcode='42501'; end if;
 elsif tg_table_name='pacientes' and (new.user_id is distinct from old.user_id or new.id is distinct from old.id or new.plano_id is distinct from old.plano_id or new.asaas_customer_id is distinct from old.asaas_customer_id) then raise exception 'Vínculo financeiro protegido.' using errcode='42501'; end if;
 return new;
end $$;
create trigger acolher_billing_profile_guard before insert or update on public.profiles for each row execute function public.acolher_billing_identity_guard();
create trigger acolher_billing_patient_guard before update on public.pacientes for each row execute function public.acolher_billing_identity_guard();
create policy acolher_billing_patient_insert on public.pacientes as restrictive for insert to authenticated with check(public.acolher_is_admin());
create policy acolher_billing_patient_update on public.pacientes as restrictive for update to authenticated using(user_id=auth.uid() or public.acolher_is_admin()) with check(user_id=auth.uid() or public.acolher_is_admin());

alter table public.pagamentos enable row level security;
alter table public.sessoes enable row level security;
create policy acolher_billing_payment_scope on public.pagamentos as restrictive for all to authenticated using(public.acolher_is_admin() or public.acolher_owns_patient(paciente_id)) with check(public.acolher_is_admin() or public.acolher_owns_patient(paciente_id));
create policy acolher_billing_payment_insert on public.pagamentos as restrictive for insert to authenticated with check(public.acolher_is_admin());
create policy acolher_billing_payment_update on public.pagamentos as restrictive for update to authenticated using(public.acolher_is_admin()) with check(public.acolher_is_admin());
create policy acolher_billing_payment_delete on public.pagamentos as restrictive for delete to authenticated using(public.acolher_is_admin());
create policy acolher_billing_payment_anon on public.pagamentos as restrictive for all to anon using(false) with check(false);
create policy acolher_billing_session_anon on public.sessoes as restrictive for all to anon using(false) with check(false);
create policy acolher_billing_session_scope on public.sessoes as restrictive for all to authenticated using(public.acolher_is_admin() or public.acolher_owns_patient(paciente_id)) with check(public.acolher_is_admin() or public.acolher_owns_patient(paciente_id));
create policy acolher_billing_session_insert on public.sessoes as restrictive for insert to authenticated with check(public.acolher_is_admin() or (public.acolher_owns_patient(paciente_id) and status='pendente'));
create policy acolher_billing_session_update on public.sessoes as restrictive for update to authenticated using(public.acolher_is_admin()) with check(public.acolher_is_admin());
create policy acolher_billing_session_delete on public.sessoes as restrictive for delete to authenticated using(public.acolher_is_admin());

create or replace function public.booked_session_slots(p_day date) returns table(data timestamptz) language sql stable security definer set search_path='' as $$
 select s.data from public.sessoes s where auth.uid() is not null and s.status<>'cancelada' and s.data>=p_day::timestamp at time zone 'America/Sao_Paulo' and s.data<(p_day+1)::timestamp at time zone 'America/Sao_Paulo';
$$;
revoke all on function public.booked_session_slots(date) from public,anon;
grant execute on function public.booked_session_slots(date) to authenticated;

-- No expiry is introduced. Each confirmed invoice grants a finite number of sessions.
-- Legacy paid invoices deliberately start with zero credits: reconcile their already
-- consumed sessions before an administrator grants a remaining balance.
alter table public.pagamentos add column if not exists sessoes_contratadas integer not null default 0 check (sessoes_contratadas >= 0);
alter table public.sessoes add column if not exists pagamento_id uuid references public.pagamentos(id);
create index if not exists acolher_session_payment on public.sessoes(pagamento_id) where status <> 'cancelada';
-- Several actual gateway invoices may coexist; only one unsubmitted purchase per plan.
drop index if exists public.acolher_one_pending_plan;
create unique index acolher_one_pending_plan on public.pagamentos(paciente_id,plano_id) where plano_id is not null and gateway_id is null and status in ('pendente','processando');

create or replace function public.acolher_payment_credits() returns trigger language plpgsql security definer set search_path='' as $$
declare quantity integer;
begin
 if tg_op='INSERT' then
  if auth.role()='service_role' and new.gateway_id like 'sub_%' and new.gateway_payment_id is not null and new.sessoes_contratadas>0 then return new; end if;
  if new.plano_id is null and new.tipo_plano <> 'avulso' then
   if new.sessoes_contratadas<1 then raise exception 'Informe a quantidade de sessões da fatura.' using errcode='22023'; end if;
   return new;
  end if;
  if new.tipo_plano='avulso' then quantity:=1;
  else select limite_sessoes into quantity from public.planos where id=new.plano_id;
  end if;
  if quantity is null or quantity<1 then raise exception 'Plano sem quantidade válida de sessões.' using errcode='22023'; end if;
  new.sessoes_contratadas:=quantity;
 end if;
 return new;
end $$;
drop trigger if exists acolher_payment_credits on public.pagamentos;
create trigger acolher_payment_credits before insert on public.pagamentos for each row execute function public.acolher_payment_credits();

-- Pending invoices have not consumed credits and can safely take their plan snapshot.
update public.pagamentos p set sessoes_contratadas=case when p.tipo_plano='avulso' then 1 else pl.limite_sessoes end
from public.planos pl where p.plano_id=pl.id and p.status in ('pendente','processando','vencido') and p.sessoes_contratadas=0;
update public.pagamentos set sessoes_contratadas=1 where tipo_plano='avulso' and status in ('pendente','processando','vencido') and sessoes_contratadas=0;

create or replace function public.acolher_validate_session() returns trigger language plpgsql security definer set search_path='' as $$
declare local_start timestamp; day_name text; paid uuid;
begin
 -- One transaction protects both the calendar slot and consumption of payment credits.
 perform pg_advisory_xact_lock(hashtextextended('acolher-calendar',0));
 if tg_op='UPDATE' and new.pagamento_id is distinct from old.pagamento_id then raise exception 'Vínculo financeiro protegido.' using errcode='42501'; end if;
 if new.status='cancelada' then return new; end if;
 if tg_op='UPDATE' and old.status<>'cancelada' and new.data=old.data and new.paciente_id=old.paciente_id and new.status=old.status then return new; end if;
 if not exists(select 1 from public.pacientes p where p.id=new.paciente_id and p.status='ativo' and (p.user_id=auth.uid() or public.acolher_is_admin() or auth.role()='service_role')) then raise exception 'Paciente indisponível para agendamento.' using errcode='42501'; end if;
 if new.data<=now() and (tg_op='INSERT' or new.data is distinct from old.data or old.status='cancelada') then raise exception 'Escolha um horário futuro.' using errcode='22023'; end if;
 if exists(select 1 from public.sessoes s where s.id<>new.id and s.status<>'cancelada' and s.data=new.data) then raise exception 'Horário indisponível. Escolha outro horário.' using errcode='22023'; end if;
 local_start:=new.data at time zone 'America/Sao_Paulo';
 day_name:=(array['Domingo','Segunda','Terça','Quarta','Quinta','Sexta','Sábado'])[extract(dow from local_start)::integer+1];
 if not exists(select 1 from public.disponibilidade d where d.dia_semana=day_name and to_jsonb(d.horarios) ? to_char(local_start,'HH24:MI')) or extract(second from local_start)<>0 then raise exception 'Horário fora da disponibilidade da clínica.' using errcode='22023'; end if;
 select p.id into paid from public.pagamentos p
 where p.paciente_id=new.paciente_id and p.status='pago'
 and (new.pagamento_id is null or p.id=new.pagamento_id)
 and p.sessoes_contratadas>(select count(*) from public.sessoes s where s.pagamento_id=p.id and s.status<>'cancelada' and s.id<>new.id)
 order by p.data,p.id limit 1 for update of p;
 if paid is null then raise exception 'É necessário um pagamento confirmado com saldo de sessões para agendar. Consulte Pagamentos.' using errcode='22023'; end if;
 new.pagamento_id:=paid;
 return new;
end $$;
drop trigger if exists acolher_validate_session on public.sessoes;
create trigger acolher_validate_session before insert or update on public.sessoes for each row execute function public.acolher_validate_session();

create or replace function public.acolher_book_session(p_date timestamptz,p_modality text) returns uuid language plpgsql security invoker set search_path='' as $$
declare patient uuid; result uuid;
begin
 if auth.uid() is null or p_modality not in ('online','presencial') or p_modality is null then raise exception 'Solicitação inválida.' using errcode='42501'; end if;
 select id into patient from public.pacientes where user_id=auth.uid();
 if patient is null then raise exception 'Ficha de paciente indisponível.' using errcode='42501'; end if;
 insert into public.sessoes(paciente_id,data,status,observacoes) values(patient,p_date,'pendente','Modalidade: '||p_modality||' | Solicitado via Acolher') returning id into result;
 return result;
end $$;
revoke all on function public.acolher_book_session(timestamptz,text) from public,anon;
grant execute on function public.acolher_book_session(timestamptz,text) to authenticated;

create table if not exists public.billing_credit_audit (
 id uuid primary key default gen_random_uuid(), pagamento_id uuid not null references public.pagamentos(id),
 actor_id uuid not null references public.profiles(id), previous_total integer not null, new_total integer not null,
 reason text not null, created_at timestamptz not null default now()
);
alter table public.billing_credit_audit enable row level security;
create policy acolher_credit_audit_read on public.billing_credit_audit for select to authenticated using(public.acolher_is_admin());
create or replace function public.acolher_reconcile_credits(p_payment uuid,p_remaining integer,p_reason text) returns integer language plpgsql security definer set search_path='' as $$
declare pay public.pagamentos%rowtype; used integer; total integer;
begin
 if not public.acolher_is_admin() then raise exception 'Acesso administrativo obrigatório.' using errcode='42501'; end if;
 if p_remaining is null or p_remaining<0 or p_remaining>1000 or char_length(trim(coalesce(p_reason,'')))<10 then raise exception 'Informe o saldo conferido e a justificativa (mínimo de 10 caracteres).' using errcode='22023'; end if;
 perform pg_advisory_xact_lock(hashtextextended('acolher-calendar',0));
 select * into pay from public.pagamentos where id=p_payment and status='pago' for update;
 if not found then raise exception 'Somente faturas pagas podem liberar sessões.' using errcode='22023'; end if;
 select count(*) into used from public.sessoes where pagamento_id=p_payment and status<>'cancelada';
 total:=used+p_remaining;
 update public.pagamentos set sessoes_contratadas=total where id=p_payment;
 insert into public.billing_credit_audit(pagamento_id,actor_id,previous_total,new_total,reason) values(p_payment,auth.uid(),pay.sessoes_contratadas,total,trim(p_reason));
 return total;
end $$;
revoke all on function public.acolher_reconcile_credits(uuid,integer,text) from public,anon;
grant execute on function public.acolher_reconcile_credits(uuid,integer,text) to authenticated;

create or replace function public.acolher_booking_balance() returns integer language sql stable security definer set search_path='' as $$
 select coalesce(sum(greatest(0,p.sessoes_contratadas-(select count(*) from public.sessoes s where s.pagamento_id=p.id and s.status<>'cancelada'))),0)::integer
 from public.pagamentos p join public.pacientes patient on patient.id=p.paciente_id
 where patient.user_id=auth.uid() and patient.status='ativo' and p.status='pago';
$$;
revoke all on function public.acolher_booking_balance() from public,anon;
grant execute on function public.acolher_booking_balance() to authenticated;

create or replace function public.process_asaas_event(event_id text,event_type text,payment_data jsonb) returns void language plpgsql security definer set search_path='' as $$
declare pay public.pagamentos%rowtype; target uuid; event_inserted integer; next_status text;
begin
 if auth.role() is distinct from 'service_role' then raise exception 'Forbidden' using errcode='42501'; end if;
 perform pg_advisory_xact_lock(hashtextextended('acolher-calendar',0));
 select * into pay from public.pagamentos where id=(payment_data->>'externalReference')::uuid for update;
 if not found or pay.gateway_id is null or (pay.gateway_id is distinct from (payment_data->>'id') and pay.gateway_id is distinct from (payment_data->>'subscription')) or pay.valor is distinct from (payment_data->>'value')::numeric then raise exception 'Payment mismatch' using errcode='22023'; end if;
 insert into public.asaas_events(id,payment_id,event_type) values(event_id,payment_data->>'id',event_type) on conflict do nothing;
 get diagnostics event_inserted=row_count;
 if event_inserted=0 then return; end if;
 next_status:=case
 when event_type='PAYMENT_RECEIVED' and payment_data->>'status' in ('RECEIVED','RECEIVED_IN_CASH') then 'pago'
 when event_type='PAYMENT_CONFIRMED' and payment_data->>'status'='CONFIRMED' and payment_data->>'billingType' in ('CREDIT_CARD','BOLETO') then 'pago'
 when event_type='PAYMENT_REVOKED' then 'cancelado'
 when event_type='PAYMENT_OVERDUE' then 'vencido'
 else 'processando' end;
 select id into target from public.pagamentos where gateway_payment_id=payment_data->>'id';
 if target is null and pay.gateway_payment_id is null then
  target:=pay.id;
  update public.pagamentos set gateway_payment_id=payment_data->>'id' where id=target;
 elsif target is null then
  insert into public.pagamentos(paciente_id,plano_id,valor,tipo_plano,status,data,gateway_id,gateway_payment_id,sessoes_contratadas)
  values(pay.paciente_id,pay.plano_id,pay.valor,pay.tipo_plano,next_status,now(),pay.gateway_id,payment_data->>'id',pay.sessoes_contratadas) returning id into target;
 end if;
 update public.pagamentos set status=next_status where id=target;
 if next_status='pago' and pay.plano_id is not null then update public.pacientes set plano_id=pay.plano_id,status='ativo' where id=pay.paciente_id; end if;
 if next_status='cancelado' then
  update public.sessoes set status='cancelada' where pagamento_id=target and data>now() and status<>'cancelada';
 end if;
end $$;
revoke all on function public.process_asaas_event(text,text,jsonb) from public,anon,authenticated;
grant execute on function public.process_asaas_event(text,text,jsonb) to service_role;
commit;
