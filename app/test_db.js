const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

const envStr = fs.readFileSync('.env.local', 'utf8');
const envVars = {};
envStr.split('\n').forEach(line => {
  if (line.includes('=')) {
    const [key, ...rest] = line.split('=');
    let val = rest.join('=').trim();
    if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
      val = val.slice(1, -1);
    }
    envVars[key.trim()] = val;
  }
});

const supabaseUrl = envVars.NEXT_PUBLIC_SUPABASE_URL;
const anonKey = envVars.NEXT_PUBLIC_SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl, anonKey);

async function runTest() {
  console.log('Testing pagamentos insert...');
  
  // 1. Get a random patient
  const { data: patient } = await supabase.from('pacientes').select('*').limit(1).single();
  if (!patient) {
    console.log('No patients found.');
    return;
  }
  
  console.log('Using patient:', patient.id);
  
  // 2. Try inserting a payment and CATCH the error!
  const { data, error } = await supabase.from('pagamentos').insert({
    paciente_id: patient.id,
    valor: 150,
    tipo_plano: 'mensal',
    status: 'pendente',
    data: new Date().toISOString()
  }).select();
  
  console.log('Insert Result:', data);
  if (error) {
    console.error('INSERT ERROR:', error);
  }
  
  // 3. Test WhatsApp config parsing
  const { data: configs } = await supabase
    .from('configuracoes_sistema')
    .select('chave, valor')
    .in('chave', ['evolution_api_url', 'evolution_api_instance', 'evolution_api_apikey']);
    
  console.log('WhatsApp Configs DB:', configs);
  
  const configMap = {};
  configs.forEach(c => {
    try {
      configMap[c.chave] = JSON.parse(c.valor);
    } catch (e) {
      configMap[c.chave] = c.valor;
    }
  });
  
  console.log('Parsed Configs:', configMap);
}

runTest();
