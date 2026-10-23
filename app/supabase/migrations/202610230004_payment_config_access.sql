begin;
-- The legacy "Pacientes podem ler certas configs" policy used USING(true),
-- unintentionally exposing gateway secrets alongside the public Pix key.
create policy acolher_payment_config_anon on public.configuracoes_sistema as restrictive for all to anon using(false) with check(false);
create policy acolher_payment_config_access on public.configuracoes_sistema as restrictive for all to authenticated using(public.acolher_is_admin()) with check(public.acolher_is_admin());
commit;
