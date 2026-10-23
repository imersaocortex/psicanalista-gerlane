-- Acolher: baseline and security migration. Apply in a reviewed Supabase SQL migration.
-- Existing records are preserved. The transaction rolls back if the existing schema differs.
begin;
create extension if not exists pgcrypto;
create table if not exists public.profiles (
 id uuid primary key references auth.users(id) on delete cascade, nome text not null default '', email text,
 tipo text not null default 'paciente' check (tipo in ('admin','paciente')),
 avatar_url text, bio text, especialidade text, created_at timestamptz default now()
);
create table if not exists public.planos (
 id uuid primary key default gen_random_uuid(), nome text not null, descricao text,
 preco numeric(12,2) not null check(preco > 0), periodicidade text not null,
 limite_sessoes integer not null default 4 check(limite_sessoes > 0),
 ativo boolean not null default true, asaas_id text, created_at timestamptz default now()
);
create table if not exists public.pacientes (
 id uuid primary key default gen_random_uuid(), user_id uuid unique not null references public.profiles(id) on delete cascade,
 telefone text, data_nascimento date, genero text, profissao text, cpf text, endereco text,
 contato_emergencia text, notas text, foto_url text, plano_id uuid references public.planos(id),
 status text not null default 'ativo', asaas_customer_id text, created_at timestamptz default now()
);
create table if not exists public.sessoes (
 id uuid primary key default gen_random_uuid(), paciente_id uuid not null references public.pacientes(id),
 data timestamptz not null, status text not null default 'pendente', observacoes text,
 created_at timestamptz default now()
);
create table if not exists public.pagamentos (
 id uuid primary key default gen_random_uuid(), paciente_id uuid not null references public.pacientes(id),
 valor numeric(12,2) not null check(valor > 0), tipo_plano text not null, status text not null default 'pendente',
 data timestamptz not null default now(), gateway_id text, created_at timestamptz default now()
);
alter table public.pagamentos add column if not exists plano_id uuid references public.planos(id);
alter table public.pagamentos add column if not exists gateway_payment_id text;
create unique index if not exists acolher_gateway_payment_id on public.pagamentos(gateway_payment_id) where gateway_payment_id is not null;
create unique index if not exists acolher_one_pending_plan on public.pagamentos(paciente_id,plano_id) where plano_id is not null and status in ('pendente','processando');
create table if not exists public.anamneses (
 id uuid primary key default gen_random_uuid(), paciente_id uuid not null references public.pacientes(id),
 queixa_principal text, respostas jsonb default '{}', arquivos jsonb default '[]', created_at timestamptz default now()
);
create table if not exists public.disponibilidade (
 id uuid primary key default gen_random_uuid(), admin_id uuid not null references public.profiles(id),
 dia_semana text not null, horarios jsonb not null default '[]', unique(admin_id,dia_semana)
);
alter table public.disponibilidade add column if not exists updated_at timestamptz default now();
create table if not exists public.configuracoes_sistema (
 id uuid primary key default gen_random_uuid(), admin_id uuid not null references public.profiles(id),
 chave text unique not null, valor jsonb, updated_at timestamptz default now()
);
create table if not exists public.notificacoes (
 id uuid primary key default gen_random_uuid(), user_id uuid not null references public.profiles(id) on delete cascade,
 titulo text not null, mensagem text not null, link text, lida boolean default false, created_at timestamptz default now()
);
create table if not exists public.mensagens (
 id uuid primary key default gen_random_uuid(), remetente_id uuid not null references public.profiles(id),
 destinatario_id uuid not null references public.profiles(id), mensagem text not null,
 data timestamptz default now(), lida boolean default false
);
create table if not exists public.automation_deliveries (
 id text primary key, status text not null, created_at timestamptz default now()
);
create table if not exists public.payment_checkout_locks (
 pagamento_id uuid primary key references public.pagamentos(id), created_at timestamptz default now()
);
create table if not exists public.asaas_events (
 id text primary key, payment_id text not null, event_type text not null, created_at timestamptz default now()
);
create or replace function public.acolher_is_admin() returns boolean language sql stable security definer
 set search_path = '' as $$
 select exists(select 1 from public.profiles where id = (select auth.uid()) and tipo = 'admin');
$$;
revoke all on function public.acolher_is_admin() from public;
grant execute on function public.acolher_is_admin() to authenticated;
create or replace function public.acolher_owns_patient(patient uuid) returns boolean language sql stable security definer
 set search_path = '' as $$
 select exists(select 1 from public.pacientes where id = patient and user_id = (select auth.uid()));
$$;
revoke all on function public.acolher_owns_patient(uuid) from public;
grant execute on function public.acolher_owns_patient(uuid) to authenticated;

-- Restrictive policies also constrain any pre-existing permissive policy.
do $$
declare tbl text;
begin
 foreach tbl in array array['profiles','pacientes','planos','sessoes','pagamentos','anamneses','disponibilidade','configuracoes_sistema','notificacoes','mensagens','automation_deliveries','payment_checkout_locks','asaas_events'] loop
  execute format('alter table public.%I enable row level security',tbl);
  execute format('drop policy if exists acolher_no_anonymous on public.%I',tbl);
  execute format('create policy acolher_no_anonymous on public.%I as restrictive for all to anon using(false) with check(false)',tbl);
  execute format('drop policy if exists acolher_admin on public.%I',tbl);
  execute format('create policy acolher_admin on public.%I for all to authenticated using(public.acolher_is_admin()) with check(public.acolher_is_admin())',tbl);
 end loop;
end $$;
do $$
declare tbl text;
begin
 foreach tbl in array array['automation_deliveries','payment_checkout_locks','asaas_events'] loop
  execute format('drop policy if exists acolher_server_only on public.%I',tbl);
  execute format('create policy acolher_server_only on public.%I as restrictive for all to authenticated using(false) with check(false)',tbl);
 end loop;
end $$;
-- Reusable owner constraints; write restrictions are tightened below.
do $$
declare item record;
begin
 for item in select * from (values
 ('profiles','id = auth.uid() or tipo = ''admin'''),
 ('pacientes','user_id = auth.uid()'),
 ('sessoes','public.acolher_owns_patient(paciente_id)'),
 ('pagamentos','public.acolher_owns_patient(paciente_id)'),
 ('anamneses','public.acolher_owns_patient(paciente_id)'),
 ('notificacoes','user_id = auth.uid()'),
 ('mensagens','remetente_id = auth.uid() or destinatario_id = auth.uid()')
 ) as v(tbl,expr) loop
  execute format('drop policy if exists acolher_owner_scope on public.%I',item.tbl);
  execute format('create policy acolher_owner_scope on public.%I as restrictive for all to authenticated using(public.acolher_is_admin() or (%s)) with check(public.acolher_is_admin() or (%s))',item.tbl,item.expr,item.expr);
  execute format('drop policy if exists acolher_owner_read on public.%I',item.tbl);
  execute format('create policy acolher_owner_read on public.%I for select to authenticated using(%s)',item.tbl,item.expr);
 end loop;
end $$;
do $$
declare tbl text;
begin
 foreach tbl in array array['profiles','pacientes','notificacoes','mensagens'] loop
  execute format('drop policy if exists acolher_owner_update on public.%I',tbl);
 end loop;
end $$;
create policy acolher_owner_update on public.profiles for update to authenticated using(id=auth.uid()) with check(id=auth.uid());
create policy acolher_owner_update on public.pacientes for update to authenticated using(user_id=auth.uid()) with check(user_id=auth.uid());
create policy acolher_owner_update on public.notificacoes for update to authenticated using(user_id=auth.uid()) with check(user_id=auth.uid());
create policy acolher_owner_update on public.mensagens for update to authenticated using(destinatario_id=auth.uid()) with check(destinatario_id=auth.uid());
drop policy if exists acolher_notification_delete on public.notificacoes;
create policy acolher_notification_delete on public.notificacoes for delete to authenticated using(user_id=auth.uid());
drop policy if exists acolher_session_request on public.sessoes;
create policy acolher_session_request on public.sessoes for insert to authenticated with check(public.acolher_owns_patient(paciente_id) and status='pendente');
drop policy if exists acolher_message_send on public.mensagens;
create policy acolher_message_send on public.mensagens for insert to authenticated with check(remetente_id=auth.uid() and exists(select 1 from public.profiles where id=destinatario_id and tipo='admin') and char_length(mensagem) between 1 and 4000 and not lida);
-- Never let legacy permissive write policies bypass these operation guards.
do $$
declare item record; op text;
begin
 for item in select * from (values
 ('profiles','id = auth.uid()'),
 ('pacientes','user_id = auth.uid()'),
 ('notificacoes','user_id = auth.uid()'),
 ('mensagens','destinatario_id = auth.uid()')
 ) as v(tbl,expr) loop
  execute format('drop policy if exists acolher_update_guard on public.%I',item.tbl);
  execute format('create policy acolher_update_guard on public.%I as restrictive for update to authenticated using(public.acolher_is_admin() or (%s)) with check(public.acolher_is_admin() or (%s))',item.tbl,item.expr,item.expr);
 end loop;
 foreach op in array array['insert','update','delete'] loop
  for item in select * from (values ('pagamentos'),('anamneses'),('configuracoes_sistema'),('disponibilidade'),('planos')) as v(tbl) loop
   execute format('drop policy if exists %I on public.%I','acolher_admin_'||op,item.tbl);
   execute format('create policy %I on public.%I as restrictive for %s to authenticated %s','acolher_admin_'||op,item.tbl,op,
    case when op='insert' then 'with check(public.acolher_is_admin())' when op='delete' then 'using(public.acolher_is_admin())' else 'using(public.acolher_is_admin()) with check(public.acolher_is_admin())' end);
  end loop;
 end loop;
end $$;
-- Additional operation guards.
do $$
declare tbl text;
begin
 foreach tbl in array array['profiles','pacientes','notificacoes'] loop
  execute format('drop policy if exists acolher_insert_admin on public.%I',tbl);
  execute format('create policy acolher_insert_admin on public.%I as restrictive for insert to authenticated with check(public.acolher_is_admin())',tbl);
 end loop;
 foreach tbl in array array['profiles','pacientes','sessoes','mensagens'] loop
  execute format('drop policy if exists acolher_delete_admin on public.%I',tbl);
  execute format('create policy acolher_delete_admin on public.%I as restrictive for delete to authenticated using(public.acolher_is_admin())',tbl);
 end loop;
end $$;
drop policy if exists acolher_session_update_admin on public.sessoes;
create policy acolher_session_update_admin on public.sessoes as restrictive for update to authenticated using(public.acolher_is_admin()) with check(public.acolher_is_admin());
drop policy if exists acolher_message_insert_guard on public.mensagens;
create policy acolher_message_insert_guard on public.mensagens as restrictive for insert to authenticated with check(remetente_id=auth.uid() and char_length(mensagem) between 1 and 4000 and not lida and (public.acolher_is_admin() or exists(select 1 from public.profiles where id=destinatario_id and tipo='admin')));
drop policy if exists acolher_session_insert_guard on public.sessoes;
create policy acolher_session_insert_guard on public.sessoes as restrictive for insert to authenticated with check(public.acolher_is_admin() or (public.acolher_owns_patient(paciente_id) and status='pendente'));
drop policy if exists acolher_config_scope on public.configuracoes_sistema;
create policy acolher_config_scope on public.configuracoes_sistema as restrictive for all to authenticated using(public.acolher_is_admin()) with check(public.acolher_is_admin());
drop policy if exists acolher_public_plans on public.planos;
create policy acolher_public_plans on public.planos for select to authenticated using(ativo or public.acolher_is_admin());
drop policy if exists acolher_plan_read_guard on public.planos;
create policy acolher_plan_read_guard on public.planos as restrictive for select to authenticated using(ativo or public.acolher_is_admin());
drop policy if exists acolher_availability_read on public.disponibilidade;
create policy acolher_availability_read on public.disponibilidade for select to authenticated using(true);

create or replace function public.acolher_protect_fields() returns trigger language plpgsql security definer set search_path='' as $$
begin
 if auth.role() = 'service_role' or auth.uid() is null or public.acolher_is_admin() then return new; end if;
 if tg_table_name='profiles' and (new.tipo is distinct from old.tipo or new.id is distinct from old.id or new.email is distinct from old.email) then raise exception 'Campo de acesso protegido' using errcode='42501'; end if;
 if tg_table_name='pacientes' and (new.id is distinct from old.id or new.user_id is distinct from old.user_id or new.plano_id is distinct from old.plano_id or new.status is distinct from old.status or new.notas is distinct from old.notas or new.asaas_customer_id is distinct from old.asaas_customer_id) then raise exception 'Campo clínico protegido' using errcode='42501'; end if;
 if tg_table_name='notificacoes' and (to_jsonb(new)-'lida') is distinct from (to_jsonb(old)-'lida') then raise exception 'Notificação protegida' using errcode='42501'; end if;
 if tg_table_name='mensagens' and (to_jsonb(new)-'lida') is distinct from (to_jsonb(old)-'lida') then raise exception 'Mensagem protegida' using errcode='42501'; end if;
 return new;
end $$;
do $$
declare tbl text;
begin
 foreach tbl in array array['profiles','pacientes','notificacoes','mensagens'] loop
  execute format('drop trigger if exists acolher_protect_fields on public.%I',tbl);
  execute format('create trigger acolher_protect_fields before update on public.%I for each row execute function public.acolher_protect_fields()',tbl);
 end loop;
end $$;

-- Ignore client-provided role metadata: every self registration is a patient.
create or replace function public.handle_new_user() returns trigger language plpgsql security definer set search_path='' as $$
begin
 insert into public.profiles(id,nome,email,tipo) values(new.id,coalesce(new.raw_user_meta_data->>'nome',''),new.email,'paciente')
 on conflict(id) do update set tipo='paciente';
 insert into public.pacientes(user_id) values(new.id) on conflict(user_id) do nothing;
 return new;
end $$;
do $
declare item record;
begin
 for item in select t.tgname from pg_trigger t join pg_proc p on p.oid=t.tgfoid where t.tgrelid='auth.users'::regclass and not t.tgisinternal and p.proname in ('handle_new_user','acolher_handle_new_user') loop
  execute format('drop trigger %I on auth.users',item.tgname);
 end loop;
end $;
create trigger acolher_new_user after insert on auth.users for each row execute function public.handle_new_user();
-- Existing application signup triggers must be reviewed for compatibility before applying.

create or replace function public.acolher_validate_session() returns trigger language plpgsql security definer set search_path='' as $$
declare owner_id uuid; session_limit integer; active_plan uuid; local_start timestamp; month_start timestamptz; day_name text;
begin
 if new.status='cancelada' then return new; end if;
 if tg_op='UPDATE' and new.data=old.data and new.paciente_id=old.paciente_id then return new; end if;
 perform pg_advisory_xact_lock(hashtextextended('acolher-calendar',0));
 if exists(select 1 from public.sessoes s where s.status<>'cancelada' and s.id<>new.id and s.data=new.data) then raise exception 'Horário indisponível. Escolha outro horário.' using errcode='22023'; end if;
 if auth.role()='service_role' or public.acolher_is_admin() then return new; end if;
 if new.data <= now() then raise exception 'Escolha uma data futura.' using errcode='22023'; end if;
 select p.user_id,p.plano_id,pl.limite_sessoes into owner_id,active_plan,session_limit from public.pacientes p left join public.planos pl on pl.id=p.plano_id where p.id=new.paciente_id and p.status='ativo' for update of p;
 if owner_id is distinct from auth.uid() or active_plan is null or session_limit is null then raise exception 'Plano indisponível para agendamento. Fale com a clínica.' using errcode='42501'; end if;
 if exists(select 1 from public.pagamentos where paciente_id=new.paciente_id and status in ('pendente','vencido')) then raise exception 'Regularize as cobranças pendentes antes de agendar.' using errcode='22023'; end if;
 local_start := new.data at time zone 'America/Sao_Paulo';
 day_name := (array['Domingo','Segunda','Terça','Quarta','Quinta','Sexta','Sábado'])[extract(dow from local_start)::integer+1];
 if not exists(select 1 from public.disponibilidade d where d.dia_semana=day_name and to_jsonb(d.horarios) ? to_char(local_start,'HH24:MI')) then raise exception 'Horário fora da disponibilidade da clínica.' using errcode='22023'; end if;
 month_start := date_trunc('month',local_start) at time zone 'America/Sao_Paulo';
 if (select count(*) from public.sessoes where paciente_id=new.paciente_id and status<>'cancelada' and id<>new.id and data>=month_start and data<month_start+interval '1 month') >= session_limit then raise exception 'Limite de sessões do plano atingido neste mês.' using errcode='22023'; end if;
 return new;
end $$;
drop trigger if exists acolher_validate_session on public.sessoes;
create trigger acolher_validate_session before insert or update of data,paciente_id,status on public.sessoes for each row execute function public.acolher_validate_session();
create or replace function public.booked_session_slots(p_day date) returns table(data timestamptz) language sql stable security definer set search_path='' as $$
 select s.data from public.sessoes s where auth.uid() is not null and s.status<>'cancelada'
 and s.data>=p_day::timestamp at time zone 'America/Sao_Paulo'
 and s.data<(p_day+1)::timestamp at time zone 'America/Sao_Paulo';
$$;
revoke all on function public.booked_session_slots(date) from public;
grant execute on function public.booked_session_slots(date) to authenticated;

create or replace function public.process_asaas_event(event_id text,event_type text,payment_data jsonb) returns void language plpgsql security definer set search_path='' as $$
declare pay public.pagamentos%rowtype; is_paid boolean; event_inserted integer; first_paid boolean;
begin
 if auth.role() is distinct from 'service_role' then raise exception 'Forbidden' using errcode='42501'; end if;
 select * into pay from public.pagamentos where id=(payment_data->>'externalReference')::uuid for update;
 if not found or pay.gateway_id is null or (pay.gateway_id is distinct from (payment_data->>'id') and pay.gateway_id is distinct from (payment_data->>'subscription')) or pay.valor is distinct from (payment_data->>'value')::numeric then raise exception 'Payment mismatch' using errcode='22023'; end if;
 insert into public.asaas_events(id,payment_id,event_type) values(event_id,payment_data->>'id',event_type) on conflict do nothing;
 get diagnostics event_inserted = row_count;
 if event_inserted=0 then return; end if;
 is_paid := event_type in ('PAYMENT_RECEIVED','PAYMENT_CONFIRMED');
 first_paid := pay.status<>'pago';
 if is_paid then
  if pay.gateway_payment_id is null or pay.gateway_payment_id=payment_data->>'id' then
   update public.pagamentos set status='pago',gateway_payment_id=payment_data->>'id' where id=pay.id;
  else
   -- A recurring renewal gets a separate accounting row; the original invoice remains intact.
   insert into public.pagamentos(paciente_id,plano_id,valor,tipo_plano,status,data,gateway_id,gateway_payment_id)
   values(pay.paciente_id,pay.plano_id,pay.valor,pay.tipo_plano,'pago',now(),pay.gateway_id,payment_data->>'id')
   on conflict(gateway_payment_id) where gateway_payment_id is not null do update set status='pago';
  end if;
  if pay.plano_id is not null then update public.pacientes set plano_id=pay.plano_id,status='ativo' where id=pay.paciente_id; end if;
  if first_paid then
   insert into public.notificacoes(user_id,titulo,mensagem,link)
   select user_id,'Pagamento confirmado','Seu pagamento foi confirmado. Consulte os detalhes no Acolher.','/dashboard/paciente/pagamentos' from public.pacientes where id=pay.paciente_id;
  end if;
 elsif event_type='PAYMENT_OVERDUE' then
  if pay.gateway_payment_id is null or pay.gateway_payment_id=payment_data->>'id' then
   if pay.status<>'pago' then update public.pagamentos set status='vencido' where id=pay.id; end if;
  elsif not exists(select 1 from public.pagamentos where gateway_payment_id=payment_data->>'id') then
   insert into public.pagamentos(paciente_id,plano_id,valor,tipo_plano,status,data,gateway_id,gateway_payment_id) values(pay.paciente_id,pay.plano_id,pay.valor,pay.tipo_plano,'vencido',now(),pay.gateway_id,payment_data->>'id');
  end if;
 end if;
end $$;
revoke all on function public.process_asaas_event(text,text,jsonb) from public,anon,authenticated;
grant execute on function public.process_asaas_event(text,text,jsonb) to service_role;

-- A separate private bucket for future clinical attachments. Existing public attachments must be moved.
insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types) values('clinica_documentos','clinica_documentos',false,10485760,array['application/pdf','image/jpeg','image/png']) on conflict(id) do update set public=false;
drop policy if exists acolher_documents_admin on storage.objects;
create policy acolher_documents_admin on storage.objects for all to authenticated using(bucket_id='clinica_documentos' and public.acolher_is_admin()) with check(bucket_id='clinica_documentos' and public.acolher_is_admin());
drop policy if exists acolher_documents_patient on storage.objects;
create policy acolher_documents_patient on storage.objects for select to authenticated using(bucket_id='clinica_documentos' and exists(select 1 from public.pacientes where id::text=(storage.foldername(name))[1] and user_id=auth.uid()));
drop policy if exists acolher_documents_guard on storage.objects;
create policy acolher_documents_guard on storage.objects as restrictive for all to anon,authenticated using(bucket_id<>'clinica_documentos' or public.acolher_is_admin() or (auth.uid() is not null and exists(select 1 from public.pacientes where id::text=(storage.foldername(name))[1] and user_id=auth.uid()))) with check(bucket_id<>'clinica_documentos' or public.acolher_is_admin());
commit;
