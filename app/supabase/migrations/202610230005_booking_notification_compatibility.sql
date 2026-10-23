begin;
-- Existing notification triggers are invoked inside the booking RPC, whose
-- search_path is intentionally empty. Give those helpers a fixed search_path.
alter function public.notify_session_change() set search_path=public,pg_temp;
alter function public.notify_payment_change() set search_path=public,pg_temp;
alter function public.create_notification(uuid,text,text,text,text) set search_path=public,pg_temp;
revoke all on function public.create_notification(uuid,text,text,text,text) from public,anon,authenticated;
revoke all on function public.notify_session_change() from public,anon,authenticated;
revoke all on function public.notify_payment_change() from public,anon,authenticated;
revoke all on function public.acolher_billing_identity_guard() from public,anon,authenticated;
revoke all on function public.acolher_payment_credits() from public,anon,authenticated;
revoke all on function public.acolher_validate_session() from public,anon,authenticated;
commit;
