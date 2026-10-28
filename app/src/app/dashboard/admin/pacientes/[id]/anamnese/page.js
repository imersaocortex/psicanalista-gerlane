'use client';
import { useState, useEffect, useRef } from 'react';
import { DOCUMENT_ACCEPT, attachmentErrorMessage, uploadAnamneseAttachment } from '@/lib/anamnese-attachments.mjs';
import { useParams, useRouter } from 'next/navigation';
import { createClient } from '@/utils/supabase/client';
import { useToast } from '@/context/ToastContext';
import styles from './anamneseAdmin.module.css';
import Button from '@/components/ui/Button';
import { ArrowLeft, Save, ClipboardList, Brain, Heart, Activity, FileUp, File, Trash2, Loader2, Paperclip, Download } from 'lucide-react';
import Link from 'next/link';
import { exportToPDF } from '@/utils/exportPDF';
import AnamneseReport from '@/components/dashboard/AnamneseReport';

export default function AnamneseAdminPage() {
  const { id } = useParams();
  const router = useRouter();
  const { addToast } = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [patient, setPatient] = useState(null);
  const [formData, setFormData] = useState({
    queixa_principal: '',
    historico_familiar: '',
    saude_fisica: '',
    uso_medicamentos: '',
    sono: 'Bom',
    alimentacao: 'Equilibrada',
    objetivos: ''
  });
  const [arquivos, setArquivos] = useState([]);
  const [uploading, setUploading] = useState(false);
  const uploadInProgress = useRef(false);

  const [supabase] = useState(() => createClient());

  useEffect(() => {
    async function fetchData() {
      // Fetch patient
      const { data: p } = await supabase
        .from('pacientes')
        .select('id, user_id, telefone, profiles:user_id(nome)')
        .eq('id', id)
        .single();

      setPatient(p);

      // Fetch existing anamnesis
      const { data: a } = await supabase
        .from('anamneses')
        .select('*')
        .eq('paciente_id', id)
        .maybeSingle();

      if (a) {
        setFormData({
          queixa_principal: a.queixa_principal || '',
          ...a.respostas
        });
        setArquivos(a.arquivos || []);
      }
      setLoading(false);
    }
    fetchData();
  }, [id, supabase]);

  const handleFileUpload = async (e) => {
    const file = e.currentTarget.files?.[0];
    e.currentTarget.value = ''; // Also allow retrying a file rejected during validation.
    if (!file || uploadInProgress.current || saving) return;

    uploadInProgress.current = true;
    setUploading(true);
    try {
      const newFile = await uploadAnamneseAttachment(supabase.storage, patient?.id, file);
      setArquivos(previous => [...previous, newFile]);
      addToast('Arquivo anexado à lista. Salve a anamnese para confirmar.', 'success');
    } catch (error) {
      // Never include document names, contents, or signed URLs in logs.
      console.error('Falha no anexo:', error?.statusCode || error?.name || 'UploadError');
      addToast(attachmentErrorMessage(error), 'error');
    } finally {
      uploadInProgress.current = false;
      setUploading(false);
    }
  };

  const handleRemoveFile = (fileId) => {
    setArquivos(prev => prev.filter(f => f.id !== fileId));
    addToast('Arquivo removido da lista (salve para confirmar)', 'info');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (saving) return;
    if (uploadInProgress.current) {
      addToast('Aguarde o envio do arquivo antes de salvar a anamnese.', 'warning');
      return;
    }
    setSaving(true);
    try {
      const { queixa_principal, ...respostas } = formData;

      // Upsert anamnesis
      const { data: existing } = await supabase
        .from('anamneses')
        .select('id')
        .eq('paciente_id', id)
        .maybeSingle();

      let error;
      if (existing) {
        const { error: e } = await supabase
          .from('anamneses')
          .update({
            queixa_principal,
            respostas,
            arquivos // Salva o array de arquivos
          })
          .eq('id', existing.id);
        error = e;
      } else {
        const { error: e } = await supabase
          .from('anamneses')
          .insert({
            paciente_id: id,
            queixa_principal,
            respostas,
            arquivos // Salva o array de arquivos
          });
        error = e;
      }

      if (error) throw error;

      // Disparar notificação avisando da atualização do prontuário
      if (patient?.user_id) {
        try {
          const controller = new AbortController();
          const timeoutId = setTimeout(() => controller.abort(), 5000); // 5 segundos de timeout para não travar o save

          await fetch('/api/notifications', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            signal: controller.signal,
            body: JSON.stringify({
              userId: patient.user_id,
              telefone: patient.telefone,
              title: 'Prontuário Atualizado',
              message: `Olá ${patient.profiles?.nome?.split(' ')[0] || ''}, seu prontuário clínico foi atualizado pela Dra. Gerlane. Este é um registro seguro e confidencial do seu acompanhamento.`,
              link: '/dashboard/paciente/prontuario'
            })
          });
          clearTimeout(timeoutId);
        } catch (err) {
          console.error('Erro ao notificar anamnese:', err);
        }
      }

      addToast('Anamnese salva com sucesso!', 'success');
      router.push(`/dashboard/admin/pacientes/${id}`);
    } catch (error) {
      addToast('Erro ao salvar anamnese.', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleExport = async () => {
    addToast('Gerando relatório PDF...', 'info');
    // Pequeno delay para garantir que o componente de preview esteja renderizado (mesmo que fora da tela)
    setTimeout(async () => {
      const success = await exportToPDF('anamnese-report-admin', `Anamnese_${patient?.profiles?.nome || 'Paciente'}.pdf`);
      if (success) {
        addToast('PDF gerado com sucesso!', 'success');
      } else {
        addToast('Erro ao gerar PDF.', 'error');
      }
    }, 100);
  };

  if (loading) return <div className={styles.loading}>Carregando prontuário...</div>;

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <Link href={`/dashboard/admin/pacientes/${id}`} className={styles.backLink}>
          <ArrowLeft size={16} /> Voltar ao Perfil
        </Link>
        <div className={styles.titleArea}>
          <div className={styles.iconCircle}><ClipboardList size={24} color="white" /></div>
          <div>
            <h1>Preenchimento de Anamnese</h1>
            <p>Paciente: <strong>{patient?.profiles?.nome}</strong></p>
          </div>
        </div>
        <div className={styles.headerButtons}>
          <Button onClick={handleExport} variant="secondary">
            <Download size={16} /> Exportar PDF
          </Button>
        </div>
      </div>

      <form onSubmit={handleSubmit} className={styles.form}>
        <div className={styles.section}>
          <div className={styles.sectionHeader}>
            <Brain size={20} />
            <h3>1. Queixa e Motivo da Consulta</h3>
          </div>
          <div className={styles.formGroup}>
            <label>Queixa Principal</label>
            <textarea
              value={formData.queixa_principal}
              onChange={e => setFormData({...formData, queixa_principal: e.target.value})}
              placeholder="Descreva a queixa trazida pelo paciente..."
              rows={5}
              required
            />
          </div>
        </div>

        <div className={styles.grid}>
          <div className={styles.section}>
            <div className={styles.sectionHeader}>
              <Heart size={20} />
              <h3>2. Histórico de Saúde</h3>
            </div>
            <div className={styles.formGroup}>
              <label>Histórico Familiar</label>
              <textarea
                value={formData.historico_familiar}
                onChange={e => setFormData({...formData, historico_familiar: e.target.value})}
                placeholder="Doenças mentais na família, relacionamentos..."
              />
            </div>
            <div className={styles.formGroup}>
              <label>Saúde Física</label>
              <textarea
                value={formData.saude_fisica}
                onChange={e => setFormData({...formData, saude_fisica: e.target.value})}
                placeholder="Condições físicas, dores, patologias..."
              />
            </div>
            <div className={styles.formGroup}>
              <label>Medicamentos</label>
              <input
                type="text"
                value={formData.uso_medicamentos}
                onChange={e => setFormData({...formData, uso_medicamentos: e.target.value})}
                placeholder="Uso de psicotrópicos ou outros..."
              />
            </div>
          </div>

          <div className={styles.section}>
            <div className={styles.sectionHeader}>
              <Activity size={20} />
              <h3>3. Estilo de Vida</h3>
            </div>
            <div className={styles.formGroup}>
              <label>Qualidade do Sono</label>
              <select value={formData.sono} onChange={e => setFormData({...formData, sono: e.target.value})}>
                <option value="Bom">Bom</option>
                <option value="Regular">Regular</option>
                <option value="Ruim">Ruim</option>
              </select>
            </div>
            <div className={styles.formGroup}>
              <label>Alimentação</label>
              <select value={formData.alimentacao} onChange={e => setFormData({...formData, alimentacao: e.target.value})}>
                <option value="Equilibrada">Equilibrada</option>
                <option value="Irregular">Irregular</option>
                <option value="Compulsiva">Compulsiva</option>
              </select>
            </div>
            <div className={styles.formGroup}>
              <label>Objetivos Terapêuticos</label>
              <textarea
                value={formData.objetivos}
                onChange={e => setFormData({...formData, objetivos: e.target.value})}
                placeholder="O que se pretende alcançar com este paciente?"
                rows={4}
              />
            </div>
          </div>
        </div>

        <div className={styles.section}>
          <div className={styles.sectionHeader}>
            <Paperclip size={20} />
            <h3>4. Documentos e Anexos</h3>
          </div>

          <div className={styles.uploadArea}>
            <label htmlFor="anamnese-arquivo" className={styles.uploadLabel}>
              {uploading ? (
                <><Loader2 size={24} className={styles.spin} /> Enviando...</>
              ) : (
                <><FileUp size={24} /> Anexar documento (PDF, JPG ou PNG, até 10 MB)</>
              )}
              <input
                id="anamnese-arquivo"
                aria-label="Anexar documento à anamnese"
                aria-describedby="anamnese-arquivo-ajuda"
                accept={DOCUMENT_ACCEPT}
                type="file"
                onChange={handleFileUpload}
                disabled={uploading || saving || !patient}
                hidden
              />
            </label>
          </div>

          <p id="anamnese-arquivo-ajuda">Documentos privados. Após anexar, clique em “Salvar Anamnese no Prontuário” para confirmar e liberar o download.</p>

          <div className={styles.fileList}>
            {arquivos.map((file) => (
              <div key={file.id} className={styles.fileItem}>
                <div className={styles.fileInfo}>
                  <File size={18} />
                  <div>
                    <span className={styles.fileName}>{file.name}</span>
                    <span className={styles.fileMeta}>
                      {(file.size / 1024).toFixed(1)} KB • {new Date(file.createdAt).toLocaleDateString()}
                    </span>
                  </div>
                </div>
                <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                  {file.id && (
                    <a
                      href={'/api/documents?file=' + encodeURIComponent(file.id)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className={styles.downloadBtn}
                      title="Baixar anexo"
                      style={{ color: 'var(--color-green)', display: 'flex' }}
                    >
                      <Download size={16} />
                    </a>
                  )}
                  <button
                    type="button"
                    onClick={() => handleRemoveFile(file.id)}
                    className={styles.removeBtn}
                    title="Remover anexo"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
            ))}
            {arquivos.length === 0 && (
              <p className={styles.noFiles}>Nenhum documento anexado ainda.</p>
            )}
          </div>
        </div>

        <div className={styles.footer}>
          <Button type="submit" disabled={saving || uploading}>
            {saving ? 'Salvando...' : <><Save size={16} /> Salvar Anamnese no Prontuário</>}
          </Button>
        </div>
      </form>

      {/* Container invisível apenas para geração do PDF */}
      <div style={{ position: 'absolute', left: '-9999px', top: '0', width: '800px' }}>
        <AnamneseReport
          formData={formData}
          arquivos={arquivos}
          id="anamnese-report-admin"
        />
      </div>
    </div>
  );
}
