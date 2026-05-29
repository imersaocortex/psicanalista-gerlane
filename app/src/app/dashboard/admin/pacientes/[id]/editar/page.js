'use client';
import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { createClient } from '@/utils/supabase/client';
import { useToast } from '@/context/ToastContext';
import styles from '../../novo/novo.module.css';
import Button from '@/components/ui/Button';
import { 
  User, Phone, Calendar, Mail, MapPin, Save, ArrowLeft, 
  Camera, ShieldCheck, CreditCard, Plus, CheckCircle2,
  Trash2
} from 'lucide-react';
import Link from 'next/link';

export default function EditarPacientePage() {
  const { id } = useParams();
  const router = useRouter();
  const { addToast } = useToast();
  const supabase = createClient();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [plans, setPlans] = useState([]);
  const [photo, setPhoto] = useState(null);
  const [photoPreview, setPhotoPreview] = useState(null);
  const [userId, setUserId] = useState(null);
  const [originalPlanoId, setOriginalPlanoId] = useState('');
  const [lastPayment, setLastPayment] = useState(null);
  const [paymentStatus, setPaymentStatus] = useState('pendente');
  const [isNewPayment, setIsNewPayment] = useState(false);

  const [formData, setFormData] = useState({
    nome: '',
    email: '',
    telefone: '',
    data_nascimento: '',
    genero: '',
    profissao: '',
    cpf: '',
    endereco: '',
    contato_emergencia: '',
    notas: '',
    plano_id: '',
    status: 'ativo'
  });

  useEffect(() => {
    async function fetchData() {
      try {
        // Fetch Patient and Profile
        const { data: patient, error: pError } = await supabase
          .from('pacientes')
          .select(`
            *,
            profiles:user_id (id, nome, email, avatar_url)
          `)
          .eq('id', id)
          .single();

        if (pError) throw pError;

        if (patient) {
          setUserId(patient.profiles?.id);
          setFormData({
            nome: patient.profiles?.nome || '',
            email: patient.profiles?.email || '',
            telefone: patient.telefone || '',
            data_nascimento: patient.data_nascimento || '',
            genero: patient.genero || '',
            profissao: patient.profissao || '',
            cpf: patient.cpf || '',
            endereco: patient.endereco || '',
            contato_emergencia: patient.contato_emergencia || '',
            notas: patient.notas || '',
            plano_id: patient.plano_id || '',
            status: patient.status || 'ativo'
          });
          setOriginalPlanoId(patient.plano_id || '');
          if (patient.profiles?.avatar_url) {
            setPhotoPreview(patient.profiles.avatar_url);
          } else if (patient.foto_url) {
            setPhotoPreview(patient.foto_url);
          }
        }

        // Fetch Plans
        const { data: plansData } = await supabase.from('planos').select('*').eq('ativo', true);
        setPlans(plansData || []);

        // Fetch Last Payment
        const { data: payData } = await supabase
          .from('pagamentos')
          .select('*')
          .eq('paciente_id', id)
          .order('data', { ascending: false })
          .limit(1)
          .maybeSingle();
        
        if (payData) {
          setLastPayment(payData);
          setPaymentStatus(payData.status);
        } else {
          setIsNewPayment(true);
        }

      } catch (error) {
        console.error('Error fetching patient:', error);
        addToast('Erro ao carregar dados do paciente', 'error');
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, [id]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handlePhotoChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setPhoto(file);
      const reader = new FileReader();
      reader.onloadend = () => setPhotoPreview(reader.result);
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);

    try {
      let avatarUrl = photoPreview;

      // 1. Photo Upload (if a new photo was selected)
      if (photo) {
        const fileExt = photo.name.split('.').pop();
        const fileName = `${userId || Math.random()}.${fileExt}`;
        const { error: uploadError } = await supabase.storage
          .from('clinica_media')
          .upload(`avatars/${fileName}`, photo, { upsert: true });
        
        if (uploadError) throw uploadError;

        const { data: { publicUrl } } = supabase.storage.from('clinica_media').getPublicUrl(`avatars/${fileName}`);
        avatarUrl = publicUrl;
      }

      // 2. Update Profile (Name and Avatar)
      if (userId) {
        const { error: profileError } = await supabase
          .from('profiles')
          .update({
            nome: formData.nome,
            avatar_url: avatarUrl
          })
          .eq('id', userId);
        
        if (profileError) throw profileError;
      }

      // 3. Update Patient record
      const { error: patientError } = await supabase
        .from('pacientes')
        .update({
          telefone: formData.telefone,
          data_nascimento: formData.data_nascimento,
          genero: formData.genero,
          profissao: formData.profissao,
          endereco: formData.endereco,
          contato_emergencia: formData.contato_emergencia,
          notas: formData.notas,
          foto_url: avatarUrl,
          plano_id: formData.plano_id,
          status: formData.status,
          cpf: formData.cpf
        })
        .eq('id', id);

      if (patientError) throw patientError;

      // 4. Lógica de Pagamentos e Troca de Plano
      const selectedPlan = plans.find(p => p.id === formData.plano_id);

      if (formData.plano_id && formData.plano_id !== originalPlanoId) {
        // O PLANO MUDOU!
        if (selectedPlan) {
          // Criar nova fatura para o novo plano
          const { error: invoiceError } = await supabase.from('pagamentos').insert({
            paciente_id: id,
            valor: selectedPlan.preco,
            tipo_plano: selectedPlan.periodicidade || 'avulso',
            status: paymentStatus === 'pago' ? 'pago' : 'pendente', 
            data: new Date().toISOString()
          });
          
          if (invoiceError) {
             console.error("Erro na Fatura:", invoiceError);
             addToast(`Erro ao criar fatura: ${invoiceError.message}`, 'error');
             throw invoiceError;
          }

          // Disparar notificação (que envia WhatsApp) avisando da troca
          if (userId) {
            try {
              const res = await fetch('/api/notifications', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  userId: userId,
                  telefone: formData.telefone, // Passa o telefone direto da tela
                  title: 'Plano Atualizado',
                  message: `Seu plano foi alterado para: ${selectedPlan.nome}. Acesse o portal para verificar o status do pagamento.`,
                  link: '/dashboard/paciente/pagamentos'
                })
              });
              const data = await res.json();
              if (!res.ok) {
                 throw new Error(data.error || 'Erro desconhecido na API de notificações');
              }
            } catch (err) {
              console.error('Erro ao notificar troca de plano:', err);
              addToast(`Falha ao enviar WhatsApp: ${err.message}`, 'error');
            }
          }
        }
      } else if (!lastPayment && isNewPayment && formData.plano_id) {
        // Cadastro inicial de plano sem faturas anteriores
        if (selectedPlan) {
          await supabase.from('pagamentos').insert({
            paciente_id: id,
            valor: selectedPlan.preco,
            tipo_plano: selectedPlan.periodicidade || 'avulso',
            status: paymentStatus,
            data: new Date().toISOString()
          });
        }
      } else if (lastPayment && paymentStatus !== lastPayment.status) {
        // Apenas mudou o status do pagamento atual
        await supabase
          .from('pagamentos')
          .update({ status: paymentStatus })
          .eq('id', lastPayment.id);
      }

      addToast('Cadastro atualizado com sucesso! ✨', 'success');
      router.push('/dashboard/admin/pacientes');
      router.refresh();
    } catch (error) {
      addToast(error.message || 'Erro ao atualizar cadastro', 'error');
    } finally {
      setSaving(false);
    }
  };

  if (loading) return (
    <div className={styles.loadingContainer}>
      <div className={styles.spinner}></div>
      <p>Carregando ficha do paciente...</p>
    </div>
  );

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <Link href="/dashboard/admin/pacientes" className={styles.backLink}>
          <ArrowLeft size={16} /> Voltar para lista
        </Link>
        <div className={styles.headerInfo}>
          <h1>Editar Ficha do Paciente</h1>
          <p>Atualize as informações pessoais, clínicas e de plano do paciente.</p>
        </div>
      </div>

      <div className={styles.container}>
        <form className={styles.form} onSubmit={handleSubmit}>
          {/* SEÇÃO: PERFIL E FOTO */}
          <div className={styles.stepContent}>
            <div className={styles.photoUpload}>
              <div className={styles.previewContainer}>
                {photoPreview ? (
                  <img src={photoPreview} alt="Preview" className={styles.previewImg} />
                ) : (
                  <div className={styles.photoPlaceholder}>
                    <Camera size={32} />
                  </div>
                )}
                <label htmlFor="photo" className={styles.uploadBtn}>
                  <Plus size={16} />
                </label>
              </div>
              <input type="file" id="photo" hidden accept="image/*" onChange={handlePhotoChange} />
              <div className={styles.photoInfo}>
                <h4>Foto de Perfil</h4>
                <p>Clique no "+" para alterar a imagem</p>
              </div>
            </div>

            <div className={styles.sectionHeader}>
              <User size={20} />
              <h3>Dados Pessoais</h3>
            </div>

            <div className={styles.grid}>
              <div className={styles.formGroup}>
                <label>Nome Completo</label>
                <input name="nome" value={formData.nome} onChange={handleChange} required />
              </div>
              <div className={styles.formGroup}>
                <label>E-mail (Login)</label>
                <input value={formData.email} disabled style={{ background: '#f8fafc', cursor: 'not-allowed' }} />
                <small style={{ color: '#64748b', fontSize: '0.7rem', marginTop: '0.3rem' }}>O e-mail é a identidade de acesso e não pode ser alterado.</small>
              </div>
              <div className={styles.formGroup}>
                <label><Phone size={14} /> Telefone</label>
                <input name="telefone" value={formData.telefone} onChange={handleChange} placeholder="(00) 00000-0000" />
              </div>
              <div className={styles.formGroup}>
                <label><Calendar size={14} /> Data de Nascimento</label>
                <input type="date" name="data_nascimento" value={formData.data_nascimento} onChange={handleChange} />
              </div>
              <div className={styles.formGroup}>
                <label>Gênero</label>
                <select name="genero" value={formData.genero} onChange={handleChange}>
                  <option value="">Selecione</option>
                  <option value="Masculino">Masculino</option>
                  <option value="Feminino">Feminino</option>
                  <option value="Outro">Outro</option>
                </select>
              </div>
              <div className={styles.formGroup}>
                <label>CPF</label>
                <input name="cpf" value={formData.cpf} onChange={handleChange} placeholder="000.000.000-00" />
              </div>
              <div className={styles.formGroup}>
                <label>Status do Paciente</label>
                <select name="status" value={formData.status} onChange={handleChange}>
                  <option value="ativo">Ativo</option>
                  <option value="inativo">Inativo</option>
                </select>
              </div>
              <div className={styles.formGroup}>
                <label>Profissão</label>
                <input name="profissao" value={formData.profissao} onChange={handleChange} placeholder="Ex: Engenheiro" />
              </div>
            </div>
          </div>

          {/* SEÇÃO: INFO CLÍNICA E ENDEREÇO */}
          <div className={styles.stepContent} style={{marginTop: '2rem'}}>
            <div className={styles.sectionHeader}>
              <MapPin size={20} />
              <h3>Informações Clínicas e Localização</h3>
            </div>
            <div className={styles.gridFull}>
              <div className={styles.formGroup}>
                <label>Endereço Residencial</label>
                <input name="endereco" value={formData.endereco} onChange={handleChange} placeholder="Rua, Número, Bairro, Cidade - UF" />
              </div>
            </div>
            <div className={styles.grid}>
              <div className={styles.formGroup}>
                <label>Contato de Emergência</label>
                <input name="contato_emergencia" value={formData.contato_emergencia} onChange={handleChange} placeholder="Nome e Telefone" />
              </div>
            </div>
            <div className={styles.formGroup} style={{marginTop: '1.5rem'}}>
              <label>Notas e Observações</label>
              <textarea name="notas" value={formData.notas} onChange={handleChange} placeholder="Histórico relevante ou observações..." rows={4}></textarea>
            </div>
          </div>

          {/* SEÇÃO: PLANO DE ASSINATURA */}
          <div className={styles.stepContent} style={{marginTop: '2rem'}}>
            <div className={styles.planSection}>
              <h3><CreditCard size={20} /> Plano Vinculado</h3>
              <div className={styles.plansGrid}>
                {plans.map(plan => (
                  <div 
                    key={plan.id} 
                    className={`${styles.planCard} ${formData.plano_id === plan.id ? styles.selected : ''}`}
                    onClick={() => setFormData({ ...formData, plano_id: plan.id })}
                  >
                    <div className={styles.planHeader}>
                      <h4>{plan.nome}</h4>
                      {formData.plano_id === plan.id && <CheckCircle2 size={16} className={styles.check} />}
                    </div>
                    <p className={styles.planPrice}>R$ {plan.preco}<span>/{plan.periodicidade}</span></p>
                  </div>
                ))}
              </div>
              
              <div className={styles.paymentStatusSection} style={{marginTop: '2rem'}}>
                <div className={styles.sectionHeader}>
                  <CreditCard size={20} />
                  <h3>Status do Pagamento</h3>
                </div>
                <p className={styles.sectionDesc}>Defina se o pagamento deste período já foi realizado.</p>
                <div className={styles.statusToggle}>
                  <button 
                    type="button"
                    className={`${styles.statusBtn} ${paymentStatus === 'pago' ? styles.statusActive : ''}`}
                    onClick={() => setPaymentStatus('pago')}
                  >
                    Pago
                  </button>
                  <button 
                    type="button"
                    className={`${styles.statusBtn} ${paymentStatus === 'pendente' ? styles.statusActive : ''}`}
                    onClick={() => setPaymentStatus('pendente')}
                  >
                    Pendente
                  </button>
                </div>
                {!lastPayment && (
                  <div className={styles.infoBox} style={{marginTop: '1rem', padding: '1rem', background: 'rgba(230, 126, 34, 0.1)', borderRadius: '1rem', border: '1px dashed #e67e22'}}>
                    <p style={{fontSize: '0.8rem', color: '#e67e22'}}><strong>Nota:</strong> Este paciente não tinha faturas. Uma nova será criada ao salvar.</p>
                  </div>
                )}
              </div>
            </div>

            <div className={styles.actions} style={{marginTop: '3rem'}}>
              <Button type="submit" disabled={saving} style={{ width: '100%', background: 'var(--color-green-dark)' }}>
                {saving ? 'Salvando Alterações...' : <><Save size={18} /> Salvar Cadastro Completo</>}
              </Button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
