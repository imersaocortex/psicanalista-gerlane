-- Persistent claims contain no phone numbers, message text or clinical data.
create table if not exists public.whatsapp_deliveries (
  id text primary key,
  status text not null check (status in ('processing','sent','failed')),
  created_at timestamptz not null default now()
);
alter table public.whatsapp_deliveries enable row level security;
revoke all on public.whatsapp_deliveries from anon, authenticated;
grant select, insert, update on public.whatsapp_deliveries to service_role;

alter table public.anamneses add column if not exists notification_revision uuid not null default gen_random_uuid();
create or replace function public.acolher_anamnesis_revision() returns trigger
language plpgsql set search_path='' as $$
begin
  if TG_OP='INSERT' then
    new.notification_revision := gen_random_uuid();
  elsif (new.queixa_principal, new.respostas, new.arquivos) is distinct from (old.queixa_principal, old.respostas, old.arquivos) then
    new.notification_revision := gen_random_uuid();
  else
    new.notification_revision := old.notification_revision;
  end if;
  return new;
end;
$$;
revoke all on function public.acolher_anamnesis_revision() from public, anon, authenticated;
drop trigger if exists acolher_anamnesis_revision on public.anamneses;
create trigger acolher_anamnesis_revision before insert or update on public.anamneses
for each row execute function public.acolher_anamnesis_revision();

-- The database remains the single writer of the in-app anamnesis notification.
create or replace function public.notify_anamnesis_change() returns trigger
language plpgsql security definer set search_path='' as $$
declare target_id uuid;
begin
  if TG_OP='UPDATE' and new.notification_revision=old.notification_revision then return new; end if;
  select user_id into target_id from public.pacientes where id=new.paciente_id;
  if target_id is not null then
    perform public.create_notification(target_id,'Ficha de Anamnese Atualizada',
      'Sua terapeuta atualizou sua ficha clínica. Clique para visualizar.', 'sistema','/dashboard/paciente/anamnese');
  end if;
  return new;
end;
$$;
revoke all on function public.notify_anamnesis_change() from public, anon, authenticated;
