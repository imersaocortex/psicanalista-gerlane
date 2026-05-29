'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/utils/supabase/client';
import { useToast } from '@/context/ToastContext';
import styles from './novo.module.css';
import Button from '@/components/ui/Button';
import { 
  User, Phone, Calendar, Mail, MapPin, Save, ArrowLeft, 
  Camera, ShieldCheck, CreditCard, ChevronRight, ChevronLeft,
  CheckCircle2, Plus
} from 'lucide-react';
import Link from 'next/link';

export default function NovoPacientePage() {
  const router = useRouter();
  const { addToast } = useToast();
  const supabase = createClient();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [plans, setPlans] = useState([]);
  const [photo, setPhoto] = useState(null);
  const [photoPreview, setPhotoPreview] = useState(null);
  const [debugStatus, setDebugStatus] = useState('');

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
    senha: '',
    plano_id: '',
    status_pagamento: 'pendente'
  });

  useEffect(() => {
    async function fetchPlans() {
      const { data } = await supabase.from('planos').select('*').eq('ativo', true);
      setPlans(data || []);
      if (data?.length > 0) setFormData(prev => ({ ...prev, plano_id: data[0].id }));
    }
    fetchPlans();
  }, []);

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
    setLoading(true);
    setDebugStatus('Iniciando cadastro...');

    try {
      // 1. Photo Upload (if exists)
      let foto_url = null;
      if (photo) {
        setDebugStatus('Fazendo upload da foto...');
        const fileExt = photo.name.split('.').pop();
        const fileName = `${Math.random()}.${fileExt}`;
        const { error: uploadError, data: uploadData } = await supabase.storage
          .from('clinica_media')
          .upload(`avatars/${fileName}`, photo);
        
        if (uploadError) {
          if (uploadError.message.includes('Bucket not found')) {
            throw new Error('O bucket "clinica_media" não foi encontrado. Por favor, crie-o no painel do Supabase Storage como "Public".');
          }
          throw uploadError;
        }
        const { data: { publicUrl } } = supabase.storage.from('clinica_media').getPublicUrl(`avatars/${fileName}`);
        foto_url = publicUrl;
      }

      setDebugStatus('Chamando API de registro...');
      // 2. Create auth user via our new API to avoid session takeover
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: formData.email,
          password: formData.senha || 'paciente123',
          nome: formData.nome
        })
      });

      setDebugStatus('Processando resposta da API...');
      const authDataResponse = await res.json();
      
      if (!res.ok) {
        throw new Error(authDataResponse.error || 'Erro ao criar o login do paciente');
      }

      const userId = authDataResponse.user.id;

      setDebugStatus('Atualizando perfil do paciente no banco...');
      // 3. Update patient record (a trigger already creates the initial blank row)
      const { error: patientError } = await supabase
        .from('pacientes')
        .update({
          telefone: formData.telefone || null,
          data_nascimento: formData.data_nascimento || null,
          genero: formData.genero || null,
          profissao: formData.profissao || null,
          endereco: formData.endereco || null,
          contato_emergencia: formData.contato_emergencia || null,
          notas: formData.notas || null,
          foto_url,
          plano_id: formData.plano_id || null,
          cpf: formData.cpf || null
        })
        .eq('user_id', userId);

      if (patientError) {
        console.error("Patient Update Error:", patientError);
        throw new Error("Erro ao atualizar os dados adicionais do paciente: " + patientError.message);
      }
      
      setDebugStatus('Verificando plano e pagamentos...');
      // 4. Create initial payment/invoice
      if (formData.plano_id) {
        setDebugStatus('Buscando ID do paciente...');
        // Fetch the created patient to get the ID (Supabase .select() on insert is better)
        const { data: newPatient } = await supabase
          .from('pacientes')
          .select('id')
          .eq('user_id', userId)
          .limit(1)
          .single();

        if (newPatient) {
          setDebugStatus('Inserindo pagamento...');
          const selectedPlan = plans.find(p => p.id === formData.plano_id);
          if (selectedPlan) {
            const { error: paymentError } = await supabase
              .from('pagamentos')
              .insert({
                paciente_id: newPatient.id,
                valor: selectedPlan.preco,
                tipo_plano: selectedPlan.periodicidade || 'avulso',
                status: formData.status_pagamento,
                data: new Date().toISOString()
              });
              
            if (paymentError) {
              console.error("Payment Insert Error:", paymentError);
              // Not throwing here to avoid rolling back the user creation, just log it.
            }
          }
        }
      }

      setDebugStatus('Cadastro finalizado com sucesso! Redirecionando...');
      setLoading(false);

      // Disparar notificação de boas-vindas
      try {
        await fetch('/api/notifications', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            userId: userId,
            telefone: formData.telefone,
            title: 'Bem-vindo(a) ao seu Portal!',
            message: `Olá ${formData.nome.split(' ')[0]}, seu cadastro foi concluído com sucesso. Acesse o sistema usando seu e-mail (${formData.email}) e a senha que definimos para você.`,
            link: '/dashboard/paciente'
          })
        });
      } catch (err) {
        console.error('Erro ao notificar novo paciente:', err);
      }

      addToast('Paciente e acesso criados com sucesso! 🚀', 'success');
      
      // Delay navigation slightly so the user can see the success message
      setTimeout(() => {
        window.location.href = '/dashboard/admin/pacientes';
      }, 1500);
      
    } catch (error) {
      console.error('Registration Error:', error);
      setDebugStatus(`Erro capturado: ${error.message}`);
      addToast(error.message || 'Erro ao cadastrar paciente', 'error');
      setLoading(false);
    }
  };

  const nextStep = () => setStep(s => s + 1);
  const prevStep = () => setStep(s => s - 1);

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <Link href="/dashboard/admin/pacientes" className={styles.backLink}>
          <ArrowLeft size={16} /> Voltar para lista
        </Link>
        <div className={styles.headerInfo}>
          <h1>Nova Ficha Clínica</h1>
          <p>Passo {step} de 3 — {step === 1 ? 'Dados Pessoais' : step === 2 ? 'Informações Clínicas' : 'Acesso e Contrato'}</p>
        </div>
        <div className={styles.stepIndicator}>
          <div className={`${styles.dot} ${step >= 1 ? styles.active : ''}`} />
          <div className={`${styles.line} ${step >= 2 ? styles.active : ''}`} />
          <div className={`${styles.dot} ${step >= 2 ? styles.active : ''}`} />
          <div className={`${styles.line} ${step >= 3 ? styles.active : ''}`} />
          <div className={`${styles.dot} ${step >= 3 ? styles.active : ''}`} />
        </div>
      </div>

      <div className={styles.container}>
        <form className={styles.form} onSubmit={handleSubmit}>
          {step === 1 && (
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
                  <h4>Foto do Paciente</h4>
                  <p>PNG, JPG até 5MB</p>
                </div>
              </div>

              <div className={styles.grid}>
                <div className={styles.formGroup}>
                  <label><User size={14} /> Nome Completo</label>
                  <input name="nome" value={formData.nome} onChange={handleChange} required placeholder="Nome do paciente" />
                </div>
                <div className={styles.formGroup}>
                  <label><Mail size={14} /> E-mail</label>
                  <input type="email" name="email" value={formData.email} onChange={handleChange} required placeholder="email@exemplo.com" />
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
                  <label>Profissão</label>
                  <input name="profissao" value={formData.profissao} onChange={handleChange} placeholder="Ex: Engenheiro" />
                </div>
                <div className={styles.formGroup}>
                  <label>CPF (Necessário para pagamentos)</label>
                  <input name="cpf" value={formData.cpf} onChange={handleChange} placeholder="000.000.000-00" />
                </div>
              </div>
              <div className={styles.actions}>
                <Button type="button" onClick={nextStep} style={{ width: '100%' }}>
                  Próximo <ChevronRight size={16} />
                </Button>
              </div>
            </div>
          )}

          {step === 2 && (
            <div className={styles.stepContent}>
              <div className={styles.sectionHeader}>
                <MapPin size={20} />
                <h3>Localização e Contato</h3>
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

              <div className={styles.sectionHeader} style={{marginTop: '2rem'}}>
                <Save size={20} />
                <h3>Notas Preliminares</h3>
              </div>
              <div className={styles.formGroup}>
                <textarea name="notas" value={formData.notas} onChange={handleChange} placeholder="Queixas principais, histórico relevante ou observações do primeiro contato..." rows={6}></textarea>
              </div>

              <div className={styles.actionsBetween}>
                <Button type="button" variant="outline" onClick={prevStep}>
                  <ChevronLeft size={16} /> Voltar
                </Button>
                <Button type="button" onClick={nextStep}>
                  Próximo <ChevronRight size={16} />
                </Button>
              </div>
            </div>
          )}

          {step === 3 && (
            <div className={styles.stepContent}>
              <div className={styles.authCard}>
                <div className={styles.authIcon}>
                  <ShieldCheck size={32} />
                </div>
                <div className={styles.authText}>
                  <h3>Segurança e Acesso</h3>
                  <p>Defina a senha que o paciente usará para acessar o portal.</p>
                </div>
                <div className={styles.formGroup} style={{width: '100%', marginTop: '1rem'}}>
                  <input 
                    type="password" 
                    name="senha" 
                    value={formData.senha} 
                    onChange={handleChange} 
                    required 
                    placeholder="Defina uma senha segura" 
                    style={{ background: 'white' }}
                  />
                </div>
              </div>

              <div className={styles.planSection}>
                <h3><CreditCard size={20} /> Vincular Plano</h3>
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
                  {plans.length === 0 && <p className={styles.noPlans}>Nenhum plano ativo cadastrado.</p>}
                </div>
              </div>

              <div className={styles.paymentStatusSection} style={{marginTop: '2rem'}}>
                <h3><CheckCircle2 size={20} /> Status do Primeiro Pagamento</h3>
                <p className={styles.sectionDesc}>Informe se o paciente já realizou o pagamento inicial ou se deve ser cobrado.</p>
                <div className={styles.statusToggle}>
                  <button 
                    type="button" 
                    className={`${styles.statusBtn} ${formData.status_pagamento === 'pago' ? styles.statusActive : ''}`}
                    onClick={() => setFormData({ ...formData, status_pagamento: 'pago' })}
                  >
                    Já Pago
                  </button>
                  <button 
                    type="button" 
                    className={`${styles.statusBtn} ${formData.status_pagamento === 'pendente' ? styles.statusActive : ''}`}
                    onClick={() => setFormData({ ...formData, status_pagamento: 'pendente' })}
                  >
                    Pendente (Cobrar no Portal)
                  </button>
                </div>
              </div>

              {debugStatus && (
                <div style={{ marginTop: '2rem', padding: '1rem', background: '#f5f5f5', border: '1px dashed #ccc', borderRadius: '8px', color: '#555', fontSize: '14px', textAlign: 'center' }}>
                  <strong>Status do Sistema:</strong> <br/> {debugStatus}
                </div>
              )}

              <div className={styles.actionsBetween} style={{marginTop: '3rem'}}>
                <Button type="button" variant="outline" onClick={prevStep}>
                  <ChevronLeft size={16} /> Voltar
                </Button>
                <Button type="submit" disabled={loading} style={{ background: 'var(--color-green-dark)' }}>
                  {loading ? 'Criando Acesso...' : <><Save size={16} /> Finalizar e Criar Acesso</>}
                </Button>
              </div>
            </div>
          )}
        </form>
      </div>
    </div>
  );
}
