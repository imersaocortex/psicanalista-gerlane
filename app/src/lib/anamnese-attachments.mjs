export const DOCUMENT_BUCKET = 'clinica_documentos';
export const MAX_DOCUMENT_SIZE = 10 * 1024 * 1024;
export const DOCUMENT_ACCEPT = '.pdf,.jpg,.jpeg,.png,application/pdf,image/jpeg,image/png';
const FORMATS = {
  pdf: { type: 'application/pdf', extension: 'pdf', signature: [37, 80, 68, 70, 45] },
  jpg: { type: 'image/jpeg', extension: 'jpg', signature: [255, 216, 255] },
  jpeg: { type: 'image/jpeg', extension: 'jpg', signature: [255, 216, 255] },
  png: { type: 'image/png', extension: 'png', signature: [137, 80, 78, 71, 13, 10, 26, 10] },
};

export class AttachmentError extends Error {}

export async function validateDocument(file) {
  if (!file || !Number.isFinite(file.size) || file.size <= 0) throw new AttachmentError('O arquivo está vazio. Selecione um PDF, JPG ou PNG.');
  if (file.size > MAX_DOCUMENT_SIZE) throw new AttachmentError('O arquivo ultrapassa 10 MB. Reduza o tamanho antes de anexar.');
  const extension = String(file.name || '').split('.').pop().toLowerCase();
  const format = FORMATS[extension];
  if (!format) throw new AttachmentError('Formato não aceito. Envie um PDF, JPG ou PNG de até 10 MB.');
  // Some mobile browsers provide an empty MIME type or application/octet-stream.
  // Verify the bytes and set the canonical MIME explicitly instead of rejecting those files.
  const bytes = new Uint8Array(await file.slice(0, 8).arrayBuffer());
  if (!format.signature.every((byte, index) => bytes[index] === byte)) throw new AttachmentError('O conteúdo do arquivo não corresponde ao formato selecionado. Exporte-o novamente como PDF, JPG ou PNG.');
  return { contentType: format.type, extension: format.extension };
}

export function attachmentErrorMessage(error) {
  if (error instanceof AttachmentError) return error.message;
  const message = String(error?.message || '').toLowerCase();
  const status = Number(error?.statusCode || error?.status);
  if (message.includes('bucket') && (message.includes('not found') || message.includes('does not exist'))) return 'O armazenamento privado de documentos não está disponível. A clínica precisa verificar a configuração dos anexos.';
  if (status === 401 || message.includes('jwt') || message.includes('session')) return 'Sua sessão expirou. Entre novamente e tente anexar o arquivo.';
  if (status === 403 || message.includes('row-level security') || message.includes('permission') || message.includes('unauthorized')) return 'Seu acesso não permite enviar este anexo. A clínica precisa verificar as permissões do armazenamento privado.';
  if (status === 413 || message.includes('maximum allowed size') || message.includes('too large') || message.includes('payload too large')) return 'O arquivo excede o limite permitido pelo armazenamento. Envie um arquivo menor, de até 10 MB.';
  if (status === 415 || message.includes('mime') || message.includes('file type')) return 'O armazenamento recusou o formato. Envie um PDF, JPG ou PNG; se persistir, a clínica deve verificar os formatos permitidos.';
  if (error instanceof TypeError || message.includes('fetch') || message.includes('network') || message.includes('timeout')) return 'Não foi possível concluir o envio. Verifique sua conexão e tente novamente.';
  return 'Não foi possível anexar o arquivo. Tente novamente; se persistir, entre em contato com a clínica.';
}

export async function uploadAnamneseAttachment(storage, patientId, file, uuid = () => crypto.randomUUID()) {
  if (!/^[\da-f]{8}-(?:[\da-f]{4}-){3}[\da-f]{12}$/i.test(patientId || '')) throw new AttachmentError('Paciente não encontrado. Reabra o prontuário antes de anexar.');
  const { contentType, extension } = await validateDocument(file);
  const id = uuid();
  const path = `${patientId}/${id}.${extension}`;
  // The Storage SDK uses the Blob MIME in multipart uploads, even when contentType is supplied.
  const body = file.type === contentType ? file : file.slice(0, file.size, contentType);
  const { error } = await storage.from(DOCUMENT_BUCKET).upload(path, body, { contentType, upsert: false });
  if (error) throw error;
  return { id, name: file.name, bucket: DOCUMENT_BUCKET, path, size: file.size, type: contentType, createdAt: new Date().toISOString() };
}
