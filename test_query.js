import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  'https://bfjhxbuhxyppzrtvtrqz.supabase.co',
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY // I will need to get this from .env.local
);

async function test() {
  const { data, error } = await supabase
    .from('pacientes')
    .select('id, plano_id, planos(nome, preco, periodicidade)')
    .limit(1);
    
  console.log("Query 1 Error:", error);
}

test();
