-- Run only in an isolated schema containing the billing migration and copied table
-- definitions. The deployment validation replaces public. with that schema.
do $$
declare u1 uuid:=gen_random_uuid(); u2 uuid:=gen_random_uuid(); p1 uuid:=gen_random_uuid(); p2 uuid:=gen_random_uuid(); a uuid:=gen_random_uuid();
 paid uuid:=gen_random_uuid(); pending uuid:=gen_random_uuid(); slot timestamptz; day_name text;
begin
 perform set_config('request.jwt.claims','{"role":"service_role"}',true);
 insert into public.profiles(id,nome,tipo) values(u1,'Billing test 1','paciente'),(u2,'Billing test 2','paciente'),(a,'Billing test admin','admin');
 insert into public.pacientes(id,user_id,status) values(p1,u1,'ativo'),(p2,u2,'ativo');
 insert into public.pagamentos(id,paciente_id,tipo_plano,valor,status,gateway_id) values(paid,p1,'avulso',250,'pago','pay_test_1'),(pending,p2,'avulso',250,'processando','pay_test_2');
 slot:=((current_date+10)::timestamp+interval '9 hours') at time zone 'America/Sao_Paulo';
 day_name:=(array['Domingo','Segunda','Terça','Quarta','Quinta','Sexta','Sábado'])[extract(dow from slot at time zone 'America/Sao_Paulo')::integer+1];
 insert into public.disponibilidade(dia_semana,horarios) values(day_name,array['09:00','10:00','11:00']);
 perform set_config('acolher.test.u1',u1::text,true); perform set_config('acolher.test.u2',u2::text,true);
 perform set_config('acolher.test.p1',p1::text,true); perform set_config('acolher.test.p2',p2::text,true);
 perform set_config('acolher.test.paid',paid::text,true); perform set_config('acolher.test.pending',pending::text,true);
 perform set_config('acolher.test.slot',slot::text,true);
end $$;

set local role authenticated;
do $$
declare result uuid; blocked boolean; slot timestamptz:=current_setting('acolher.test.slot')::timestamptz; p1 uuid:=current_setting('acolher.test.p1')::uuid;
begin
 perform set_config('request.jwt.claims',jsonb_build_object('sub',current_setting('acolher.test.u2'),'role','authenticated')::text,true);
 blocked:=false;
 begin perform public.acolher_book_session(slot,'online'); exception when sqlstate '22023' then blocked:=true; end;
 if not blocked then raise exception 'FAIL: processing payment released booking'; end if;
 blocked:=false;
 begin insert into public.pagamentos(paciente_id,tipo_plano,valor,status) values(current_setting('acolher.test.p2')::uuid,'avulso',250,'pago'); exception when insufficient_privilege then blocked:=true; end;
 if not blocked then raise exception 'FAIL: patient forged paid invoice'; end if;
 blocked:=false;
 begin update public.profiles set tipo='admin' where id=current_setting('acolher.test.u2')::uuid; exception when insufficient_privilege then blocked:=true; end;
 if not blocked then raise exception 'FAIL: patient escalated own role'; end if;
 blocked:=false;
 begin perform public.acolher_reconcile_credits(current_setting('acolher.test.pending')::uuid,20,'Forged patient adjustment'); exception when insufficient_privilege then blocked:=true; end;
 if not blocked then raise exception 'FAIL: patient granted own credits'; end if;
 if exists(select 1 from public.pagamentos where paciente_id=p1) then raise exception 'FAIL: patient saw another patient invoice'; end if;

 perform set_config('request.jwt.claims',jsonb_build_object('sub',current_setting('acolher.test.u1'),'role','authenticated')::text,true);
 if public.acolher_booking_balance()<>1 then raise exception 'FAIL: expected one paid credit'; end if;
 result:=public.acolher_book_session(slot,'online');
 if result is null or public.acolher_booking_balance()<>0 then raise exception 'FAIL: booking did not consume one credit'; end if;
 blocked:=false;
 begin perform public.acolher_book_session(slot+interval '1 hour','presencial'); exception when sqlstate '22023' then blocked:=true; end;
 if not blocked then raise exception 'FAIL: one payment funded two appointments'; end if;
 blocked:=false;
 begin perform public.acolher_book_session(slot,'online'); exception when sqlstate '22023' then blocked:=true; end;
 if not blocked then raise exception 'FAIL: duplicate calendar slot'; end if;
 blocked:=false;
 begin perform public.acolher_book_session(slot,'invalid'); exception when insufficient_privilege then blocked:=true; end;
 if not blocked then raise exception 'FAIL: unsupported modality'; end if;
end $$;
reset role;

do $$
declare pending uuid:=current_setting('acolher.test.pending')::uuid; paid uuid:=current_setting('acolher.test.paid')::uuid;
 payload jsonb; blocked boolean;
begin
 perform set_config('request.jwt.claims','{"role":"service_role"}',true);
 payload:=jsonb_build_object('id','pay_test_2','externalReference',pending,'value',250,'billingType','PIX','status','CONFIRMED');
 blocked:=false;
 begin perform public.process_asaas_event('wrong-amount','PAYMENT_RECEIVED',payload||'{"value":1,"status":"RECEIVED"}'::jsonb); exception when sqlstate '22023' then blocked:=true; end;
 if not blocked then raise exception 'FAIL: accepted mismatched amount'; end if;
 perform public.process_asaas_event('pix-analysis','PAYMENT_CONFIRMED',payload);
 if (select status from public.pagamentos where id=pending)='pago' then raise exception 'FAIL: Pix under analysis released credits'; end if;
 payload:=payload||'{"status":"RECEIVED"}'::jsonb;
 perform public.process_asaas_event('pix-received','PAYMENT_RECEIVED',payload);
 perform public.process_asaas_event('pix-received','PAYMENT_RECEIVED',payload);
 if (select count(*) from public.pagamentos where gateway_payment_id='pay_test_2')<>1 or (select status from public.pagamentos where id=pending)<>'pago' then raise exception 'FAIL: payment confirmation not idempotent'; end if;
 payload:=jsonb_build_object('id','pay_test_1','externalReference',paid,'value',250,'billingType','PIX','status','REFUNDED');
 perform public.process_asaas_event('refund','PAYMENT_REVOKED',payload);
 if (select status from public.pagamentos where id=paid)<>'cancelado' or exists(select 1 from public.sessoes where pagamento_id=paid and status<>'cancelada') then raise exception 'FAIL: refund left an unpaid future booking'; end if;
end $$;
