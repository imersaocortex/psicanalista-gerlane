'use client';
import { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { createClient } from '@/utils/supabase/client';
import { useToast } from '@/context/ToastContext';
import styles from './perfilAdmin.module.css';
import Button from '@/components/ui/Button';
import { User, Mail, Camera, Save, Star, Award, Shield } from 'lucide-react';

export default function AdminPerfilPage() {
  const { user } = useAuth();
  const { addToast } = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [photo, setPhoto] = useState(null);
  const [photoPreview, setPhotoPreview] = useState(null);

  const [formData, setFormData] = useState({
    nome: '',
    email: '',
    bio: '',
    especialidade: ''
  });

  const supabase = createClient();

  useEffect(() => {
    if (!user) return;
    setFormData({
      nome: user.nome || '',
      email: user.email || '',
      bio: user.bio || '',
      especialidade: user.especialidade || ''
    });
    if (user.foto_url || user.avatar_url) {
      setPhotoPreview(user.foto_url || user.avatar_url);
    }
    setLoading(false);
  }, [user]);

  const handlePhotoChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setPhoto(file);
      const reader = new FileReader();
      reader.onloadend = () => setPhotoPreview(reader.result);
      reader.readAsDataURL(file);
    }
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      let foto_url = user.foto_url || user.avatar_url;

      if (photo) {
        const fileExt = photo.name.split('.').pop();
        const fileName = `admin_${user.id}.${fileExt}`;
        
        // Tentativa de upload com tratamento de erro específico para bucket
        const { error: uploadError } = await supabase.storage
          .from('clinica_media')
          .upload(`avatars/${fileName}`, photo, { upsert: true });
        
        if (uploadError) {
          if (uploadError.message.includes('Bucket not found')) {
            throw new Error('O bucket "clinica_media" não foi encontrado no Supabase. Por favor, crie-o no painel do Supabase Storage como "Public".');
          }
          throw uploadError;
        }

        const { data: { publicUrl } } = supabase.storage.from('clinica_media').getPublicUrl(`avatars/${fileName}`);
        foto_url = publicUrl;
      }

      const { error } = await supabase
        .from('profiles')
        .update({
          nome: formData.nome,
          bio: formData.bio,
          especialidade: formData.especialidade,
          avatar_url: foto_url // Using avatar_url to maintain consistency with the profiles table
        })
        .eq('id', user.id);

      if (error) throw error;

      addToast('Perfil atualizado com sucesso! ✨', 'success');
    } catch (error) {
      console.error('Error:', error);
      addToast('Erro ao atualizar perfil.', 'error');
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className={styles.loading}>Carregando perfil...</div>;

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <h1>Meu Perfil Profissional</h1>
        <p>Gerencie como você aparece para seus pacientes.</p>
      </div>

      <div className={styles.grid}>
        <div className={styles.mainCard}>
          <form onSubmit={handleSave} className={styles.form}>
            <div className={styles.photoSection}>
              <div className={styles.avatarWrapper}>
                {photoPreview ? (
                  <img src={photoPreview} alt="Avatar" className={styles.avatarImg} />
                ) : (
                  <div className={styles.avatarPlaceholder}><User size={48} /></div>
                )}
                <label htmlFor="adminPhoto" className={styles.cameraBtn}>
                  <Camera size={18} />
                </label>
              </div>
              <input type="file" id="adminPhoto" hidden accept="image/*" onChange={handlePhotoChange} />
              <div className={styles.photoInfo}>
                <h3>Foto de Perfil</h3>
                <p>Use uma foto profissional para transmitir confiança.</p>
              </div>
            </div>

            <div className={styles.inputsGrid}>
              <div className={styles.formGroup}>
                <label><User size={14} /> Nome Completo</label>
                <input 
                  type="text" 
                  value={formData.nome} 
                  onChange={e => setFormData({ ...formData, nome: e.target.value })}
                  placeholder="Seu nome"
                />
              </div>
              <div className={styles.formGroup}>
                <label><Mail size={14} /> E-mail Profissional</label>
                <input 
                  type="email" 
                  value={formData.email} 
                  disabled
                  style={{ opacity: 0.6 }}
                />
              </div>
              <div className={styles.formGroupFull}>
                <label><Award size={14} /> Especialidade / Título</label>
                <input 
                  type="text" 
                  value={formData.especialidade} 
                  onChange={e => setFormData({ ...formData, especialidade: e.target.value })}
                  placeholder="Ex: Psicanalista Clínica, Especialista em TCC"
                />
              </div>
              <div className={styles.formGroupFull}>
                <label><Star size={14} /> Biografia Profissional</label>
                <textarea 
                  value={formData.bio} 
                  onChange={e => setFormData({ ...formData, bio: e.target.value })}
                  placeholder="Conte um pouco sobre sua formação e abordagem..."
                  rows={6}
                />
              </div>
            </div>

            <div className={styles.footer}>
              <Button type="submit" disabled={saving}>
                {saving ? 'Salvando...' : <><Save size={16} /> Salvar Alterações</>}
              </Button>
            </div>
          </form>
        </div>

        <div className={styles.sideColumn}>
          <div className={styles.card}>
            <div className={styles.cardHeader}>
              <Shield size={20} color="var(--color-green)" />
              <h3>Segurança da Conta</h3>
            </div>
            <p className={styles.sideText}>Último acesso: {new Date().toLocaleDateString('pt-BR')}</p>
            <Button variant="outline" style={{ width: '100%', marginTop: '1rem' }}>
              Alterar Senha
            </Button>
          </div>

          <div className={styles.badgeCard}>
            <div className={styles.badgeIcon}><Award size={32} /></div>
            <h4>Verificação Profissional</h4>
            <p>Seu perfil está visível para os pacientes e pronto para agendamentos.</p>
          </div>
        </div>
      </div>
    </div>
  );
}
