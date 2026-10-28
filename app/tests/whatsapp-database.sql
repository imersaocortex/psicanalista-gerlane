begin;
create temporary table anamnesis_revision_test (
  id uuid, queixa_principal text, respostas jsonb, arquivos jsonb,
  notification_revision uuid
);
create trigger revision_test before insert or update on anamnesis_revision_test
for each row execute function public.acolher_anamnesis_revision();
do $$
declare first_revision uuid; second_revision uuid; count_claims integer;
begin
  insert into anamnesis_revision_test values (gen_random_uuid(),'Test','{}','[]',null)
  returning notification_revision into first_revision;
  if first_revision is null then raise exception 'Missing initial revision'; end if;
  update anamnesis_revision_test set queixa_principal='Test', notification_revision=gen_random_uuid()
  returning notification_revision into second_revision;
  if first_revision<>second_revision then raise exception 'Unchanged save must keep revision'; end if;
  update anamnesis_revision_test set respostas='{"changed":true}'
  returning notification_revision into second_revision;
  if first_revision=second_revision then raise exception 'Clinical changes need new revision'; end if;
  first_revision:=second_revision;
  update anamnesis_revision_test set arquivos='[{"id":"synthetic"}]'
  returning notification_revision into second_revision;
  if first_revision=second_revision then raise exception 'Attachment changes need new revision'; end if;
  insert into public.whatsapp_deliveries(id,status) values('isolated-test-claim','processing');
  insert into public.whatsapp_deliveries(id,status) values('isolated-test-claim','processing') on conflict do nothing;
  select count(*) into count_claims from public.whatsapp_deliveries where id='isolated-test-claim';
  if count_claims<>1 then raise exception 'Duplicate claim'; end if;
  if has_table_privilege('anon','public.whatsapp_deliveries','INSERT') or has_table_privilege('authenticated','public.whatsapp_deliveries','SELECT') then
    raise exception 'Delivery metadata must remain server only';
  end if;
end;
$$;
select true as unchanged_save_keeps_revision, true as clinical_and_attachment_changes_rotate_revision,
       true as duplicate_claim_blocked, true as server_only_access;
rollback;
