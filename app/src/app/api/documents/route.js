import { NextResponse } from 'next/server';
import { apiError, HttpError, requireUser } from '@/lib/server/security';

export async function GET(request) {
  try {
    const { supabase } = await requireUser();
    const fileId = new URL(request.url).searchParams.get('file');
    if (!fileId || !/^[a-zA-Z0-9-]{5,64}$/.test(fileId)) throw new HttpError(400, 'Documento inválido.');
    const { data, error } = await supabase.from('anamneses').select('paciente_id, arquivos').contains('arquivos', [{ id: fileId }]).single();
    if (error || !data) throw new HttpError(404, 'Documento não encontrado.');
    const file = data.arquivos.find(item => item.id === fileId);
    if (!file?.path || file.bucket !== 'clinica_documentos' || !file.path.startsWith(data.paciente_id + '/') || file.path.includes('..')) throw new HttpError(409, 'Este anexo precisa ser migrado pela clínica para o armazenamento privado.');
    const { data: signed, error: signError } = await supabase.storage.from('clinica_documentos').createSignedUrl(file.path, 60, { download: file.name });
    if (signError || !signed?.signedUrl) throw new HttpError(503, 'Não foi possível abrir o documento.');
    const response = NextResponse.redirect(signed.signedUrl);
    response.headers.set('Cache-Control', 'private, no-store');
    response.headers.set('Referrer-Policy', 'no-referrer');
    return response;
  } catch (error) { return apiError(error); }
}
