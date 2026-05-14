'use client';
import { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { createClient } from '@/utils/supabase/client';
import { useToast } from '@/context/ToastContext';
import styles from './perfil.module.css';
import Button from '@/components/ui/Button';
import { User, Mail, Phone, Calendar, Briefcase, Save, Lock } from 'lucide-react';

export default function PacientePerfilPage() {
  const { user } = useAuth();
  const { addToast } = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState({
    nome: '',
    email: '',
    telefone: '',
    data_nascimento: '',
    profissao: '',
    cpf: '',
    genero: '',
    endereco: '',
    foto_url: ''
  });
  const [photo, setPhoto] = useState(null);
  const [photoPreview, setPhotoPreview] = useState(null);

  const supabase = createClient();

  useEffect(() => {
    if (!user) return;

    async function fetchProfile() {
      const { data: patient, error: patientError } = await supabase
        .from('pacientes')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle();

      if (patientError) {
        console.error('Error fetching patient profile:', patientError.message);
        setLoading(false);
        return;
      }

      if (patient) {
        setFormData({
          nome: user.nome || '',
          email: user.email || '',
          telefone: patient.telefone || '',
          data_nascimento: patient.data_nascimento || '',
          profissao: patient.profissao || '',
          cpf: patient.cpf || '',
          genero: patient.genero || '',
          endereco: patient.endereco || '',
          foto_url: patient.foto_url || ''
        });
        setPhotoPreview(patient.foto_url);
      }
      setLoading(false);
    }
    fetchProfile();
  }, [user]);

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      // 0. Photo Upload
      let currentFotoUrl = formData.foto_url;
      if (photo) {
        const fileExt = photo.name.split('.').pop();
        const fileName = `${user.id}-${Math.random()}.${fileExt}`;
        const { error: uploadError } = await supabase.storage
          .from('clinica_media')
          .upload(`avatars/${fileName}`, photo);
        
        if (!uploadError) {
          const { data: { publicUrl } } = supabase.storage.from('clinica_media').getPublicUrl(`avatars/${fileName}`);
          currentFotoUrl = publicUrl;
        }
      }

      // 1. Update Profile
      const { error: profileError } = await supabase
        .from('profiles')
        .update({ nome: formData.nome })
        .eq('id', user.id);

      if (profileError) throw profileError;

      // 2. Update Patient clinical record
      const { error: patientError } = await supabase
        .from('pacientes')
        .update({
          telefone: formData.telefone,
          data_nascimento: formData.data_nascimento,
          profissao: formData.profissao,
          genero: formData.genero,
          endereco: formData.endereco,
          foto_url: currentFotoUrl
        })
        .eq('user_id', user.id);

      if (patientError) throw patientError;

      addToast('Perfil atualizado com sucesso! ✨', 'success');
    } catch (error) {
      console.error('Error updating profile:', error);
      addToast('Erro ao atualizar perfil.', 'error');
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className={styles.loading}>Carregando perfil...</div>;

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <h1>Meu Perfil</h1>
        <p>Mantenha seus dados atualizados para facilitar nosso contato.</p>
      </div>

      <div className={styles.grid}>
        <div className={styles.card}>
          <div className={styles.cardHeader}>
            <User size={20} color="var(--color-green)" />
            <h3>Dados Pessoais</h3>
          </div>
          <div className={styles.photoSection}>
            <div className={styles.avatarContainer}>
              {photoPreview ? (
                <img src={photoPreview} alt="Avatar" className={styles.avatarImg} />
              ) : (
                <div className={styles.avatarPlaceholder}><User size={40} /></div>
              )}
              <label htmlFor="photo-upload" className={styles.photoLabel}>
                <Save size={16} />
              </label>
              <input 
                id="photo-upload" 
                type="file" 
                hidden 
                accept="image/*" 
                onChange={(e) => {
                  const file = e.target.files[0];
                  if (file) {
                    setPhoto(file);
                    const reader = new FileReader();
                    reader.onloadend = () => setPhotoPreview(reader.result);
                    reader.readAsDataURL(file);
                  }
                }} 
              />
            </div>
            <div className={styles.photoInfo}>
              <h4>Foto de Perfil</h4>
              <p>Clique no ícone para alterar sua imagem.</p>
            </div>
          </div>

          <form onSubmit={handleSave} className={styles.form}>
            <div className={styles.grid2}>
              <div className={styles.formGroup}>
                <label>Nome Completo</label>
                <div className={styles.inputWrapper}>
                  <User size={16} className={styles.inputIcon} />
                  <input 
                    type="text"
                    value={formData.nome}
                    onChange={e => setFormData({ ...formData, nome: e.target.value })}
                    className={styles.input}
                    required
                  />
                </div>
              </div>

              <div className={styles.formGroup}>
                <label>CPF</label>
                <div className={styles.inputWrapper}>
                  <Lock size={16} className={styles.inputIcon} />
                  <input 
                    type="text"
                    value={formData.cpf}
                    disabled
                    className={styles.input}
                    style={{ opacity: 0.7 }}
                  />
                  <Lock size={14} className={styles.lockIcon} />
                </div>
              </div>
            </div>

            <div className={styles.formGroup}>
              <label>E-mail</label>
              <div className={styles.inputWrapper}>
                <Mail size={16} className={styles.inputIcon} />
                <input 
                  type="email"
                  value={formData.email}
                  disabled
                  className={styles.input}
                  style={{ opacity: 0.7 }}
                />
                <Lock size={14} className={styles.lockIcon} />
              </div>
            </div>

            <div className={styles.row}>
              <div className={styles.formGroup}>
                <label>Telefone</label>
                <div className={styles.inputWrapper}>
                  <Phone size={16} className={styles.inputIcon} />
                  <input 
                    type="text"
                    value={formData.telefone}
                    onChange={e => setFormData({ ...formData, telefone: e.target.value })}
                    placeholder="(00) 00000-0000"
                    className={styles.input}
                  />
                </div>
              </div>
              <div className={styles.formGroup}>
                <label>Gênero</label>
                <select 
                  value={formData.genero}
                  onChange={e => setFormData({ ...formData, genero: e.target.value })}
                  className={styles.input}
                >
                  <option value="">Selecione</option>
                  <option value="Masculino">Masculino</option>
                  <option value="Feminino">Feminino</option>
                  <option value="Outro">Outro</option>
                </select>
              </div>
            </div>

            <div className={styles.row}>
              <div className={styles.formGroup}>
                <label>Data de Nascimento</label>
                <div className={styles.inputWrapper}>
                  <Calendar size={16} className={styles.inputIcon} />
                  <input 
                    type="date"
                    value={formData.data_nascimento}
                    onChange={e => setFormData({ ...formData, data_nascimento: e.target.value })}
                    className={styles.input}
                  />
                </div>
              </div>
              <div className={styles.formGroup}>
                <label>Profissão</label>
                <div className={styles.inputWrapper}>
                  <Briefcase size={16} className={styles.inputIcon} />
                  <input 
                    type="text"
                    value={formData.profissao}
                    onChange={e => setFormData({ ...formData, profissao: e.target.value })}
                    className={styles.input}
                  />
                </div>
              </div>
            </div>

            <div className={styles.formGroup}>
              <label>Endereço Residencial</label>
              <textarea 
                value={formData.endereco}
                onChange={e => setFormData({ ...formData, endereco: e.target.value })}
                className={styles.input}
                rows={3}
                placeholder="Rua, Número, Bairro, Cidade - UF"
              />
            </div>

            <div className={styles.footer}>
              <Button type="submit" disabled={saving} style={{ width: '100%' }}>
                {saving ? 'Sincronizando...' : <><Save size={16} /> Atualizar Meu Perfil</>}
              </Button>
            </div>
          </form>
        </div>

        <div className={styles.sideInfo}>
          <div className={styles.securityCard}>
            <h3>Segurança</h3>
            <p>Seus dados são protegidos por criptografia de ponta a ponta e acessíveis apenas pela Dra. Gerlane.</p>
            <Button variant="outline" size="sm" style={{ marginTop: '1rem' }}>
              Alterar Senha
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
