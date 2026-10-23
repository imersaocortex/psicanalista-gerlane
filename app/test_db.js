// Read-only connectivity check. Does not print patient records or configuration secrets.
const { loadEnvConfig } = require('@next/env');
loadEnvConfig(process.cwd());
async function check() {
 const response = await fetch(process.env.NEXT_PUBLIC_SUPABASE_URL + '/auth/v1/health', { headers: { apikey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY }, signal: AbortSignal.timeout(10000) });
 if (!response.ok) throw new Error('Supabase indisponível (HTTP ' + response.status + ')');
 console.log('Conexão com Supabase disponível.');
}
check().catch(() => { console.error('Não foi possível conectar ao Supabase. Verifique a rede e a configuração.'); process.exitCode = 1; });
