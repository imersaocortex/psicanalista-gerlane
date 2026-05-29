-- ====================================================================
-- SCRIPT PARA EXCLUSÃO AUTOMÁTICA DE USUÁRIO E PERFIL NO SUPABASE
-- 
-- Como rodar:
-- 1. Acesse o painel do Supabase (https://supabase.com)
-- 2. Vá em "SQL Editor" no menu lateral esquerdo
-- 3. Clique em "New Query" (Nova consulta)
-- 4. Cole este código e clique em "Run" (Executar)
-- ====================================================================

-- 1. Cria a função que deleta o perfil e o login (auth.users)
-- Usamos "security definer" para que a função rode com privilégios de administrador (postgres)
-- permitindo deletar da tabela "auth.users" (o que não é permitido diretamente pelo client frontend)
create or replace function public.delete_patient_user_cascade()
returns trigger
language plpgsql
security definer
as $$
begin
  -- Deleta o perfil da tabela public.profiles
  delete from public.profiles where id = old.user_id;
  
  -- Deleta o usuário da tabela auth.users (login)
  delete from auth.users where id = old.user_id;
  
  return old;
end;
$$;

-- 2. Cria o gatilho (trigger) na tabela public.pacientes
-- Ele será ativado automaticamente toda vez que um paciente for excluído da tabela
create or replace trigger on_paciente_deleted
  after delete on public.pacientes
  for each row
  execute function public.delete_patient_user_cascade();
