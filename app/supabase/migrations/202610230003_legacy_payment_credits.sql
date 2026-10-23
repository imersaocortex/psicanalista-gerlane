begin;
-- Match old invoices only to the patient's existing plan with the exact same
-- price and billing period. Do not infer a new plan or a paid status.
update public.pagamentos p set plano_id=pl.id
from public.pacientes patient join public.planos pl on pl.id=patient.plano_id
where p.paciente_id=patient.id and p.plano_id is null
and p.tipo_plano=pl.periodicidade and p.valor=pl.preco;

-- No session history means no credits were consumed in this application.
-- Paid invoices with history require explicit administrative reconciliation.
update public.pagamentos p set sessoes_contratadas=case when p.tipo_plano='avulso' then 1 else pl.limite_sessoes end
from public.planos pl where p.plano_id=pl.id and p.sessoes_contratadas=0
and p.status in ('pendente','processando','vencido','pago')
and (p.status<>'pago' or not exists(select 1 from public.sessoes s where s.paciente_id=p.paciente_id));
update public.pagamentos p set sessoes_contratadas=1
where p.tipo_plano='avulso' and p.sessoes_contratadas=0
and p.status in ('pendente','processando','vencido','pago')
and (p.status<>'pago' or not exists(select 1 from public.sessoes s where s.paciente_id=p.paciente_id));
commit;
