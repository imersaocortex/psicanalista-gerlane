'use client';
import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { createClient } from '@/utils/supabase/client';
import styles from './imprimir.module.css';
import { User, Phone, Mail, Calendar, MapPin, ClipboardList } from 'lucide-react';

export default function ImprimirPacientePage() {
  const { id } = useParams();
  const supabase = createClient();
  const [patient, setPatient] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchPatient() {
      const { data, error } = await supabase
        .from('pacientes')
        .select(`
          *,
          profiles:user_id (nome, email, avatar_url)
        `)
        .eq('id', id)
        .single();

      if (data) {
        setPatient(data);
      }
      setLoading(false);
    }
    fetchPatient();
  }, [id]);

  useEffect(() => {
    if (!loading && patient) {
      // Pequeno delay para garantir que imagens carreguem se necessário
      setTimeout(() => {
        window.print();
      }, 1000);
    }
  }, [loading, patient]);

  if (loading) return <div className={styles.loading}>Gerando ficha para impressão...</div>;
  if (!patient) return <div>Paciente não encontrado.</div>;

  const age = patient.data_nascimento ? new Date().getFullYear() - new Date(patient.data_nascimento).getFullYear() : 'N/A';

  return (
    <div className={styles.printPage}>
      {/* CABEÇALHO DO RELATÓRIO */}
      <div className={styles.header}>
        <div className={styles.logoInfo}>
          <h2>FICHA CLÍNICA INDIVIDUAL</h2>
          <p>Registro Profissional de Psicanálise</p>
        </div>
        <div className={styles.date}>
          Emissão: {new Date().toLocaleDateString('pt-BR')}
        </div>
      </div>

      {/* PERFIL E FOTO */}
      <div className={styles.profileSection}>
        <div className={styles.photoContainer}>
          {patient.profiles?.avatar_url || patient.foto_url ? (
            <img src={patient.profiles?.avatar_url || patient.foto_url} alt="Foto do Paciente" />
          ) : (
            <div className={styles.noPhoto}>SEM FOTO</div>
          )}
        </div>
        <div className={styles.mainData}>
          <h1>{patient.profiles?.nome}</h1>
          <div className={styles.status}>Status: <strong>{patient.status?.toUpperCase()}</strong></div>
          <p><Mail size={14} /> {patient.profiles?.email}</p>
          <p><Phone size={14} /> {patient.telefone || 'Não informado'}</p>
        </div>
      </div>

      <div className={styles.divider} />

      {/* DADOS PESSOAIS */}
      <div className={styles.section}>
        <div className={styles.sectionTitle}>
          <User size={18} />
          <h3>Dados Cadastrais</h3>
        </div>
        <div className={styles.grid}>
          <div className={styles.item}>
            <span className={styles.label}>CPF</span>
            <span className={styles.value}>{patient.cpf || 'Não informado'}</span>
          </div>
          <div className={styles.item}>
            <span className={styles.label}>Nascimento</span>
            <span className={styles.value}>{patient.data_nascimento ? new Date(patient.data_nascimento).toLocaleDateString('pt-BR') : 'N/A'} ({age} anos)</span>
          </div>
          <div className={styles.item}>
            <span className={styles.label}>Gênero</span>
            <span className={styles.value}>{patient.genero || 'Não informado'}</span>
          </div>
          <div className={styles.item}>
            <span className={styles.label}>Profissão</span>
            <span className={styles.value}>{patient.profissao || 'Não informado'}</span>
          </div>
        </div>
      </div>

      {/* LOCALIZAÇÃO E EMERGÊNCIA */}
      <div className={styles.section}>
        <div className={styles.sectionTitle}>
          <MapPin size={18} />
          <h3>Endereço e Contato de Emergência</h3>
        </div>
        <div className={styles.gridFull}>
          <div className={styles.item}>
            <span className={styles.label}>Endereço Residencial</span>
            <span className={styles.value}>{patient.endereco || 'Não informado'}</span>
          </div>
        </div>
        <div className={styles.grid}>
          <div className={styles.item}>
            <span className={styles.label}>Contato de Emergência</span>
            <span className={styles.value}>{patient.contato_emergencia || 'Não informado'}</span>
          </div>
        </div>
      </div>

      {/* NOTAS CLÍNICAS */}
      <div className={styles.section}>
        <div className={styles.sectionTitle}>
          <ClipboardList size={18} />
          <h3>Observações e Notas Clínicas</h3>
        </div>
        <div className={styles.notesBox}>
          {patient.notas ? (
            <p>{patient.notas}</p>
          ) : (
            <p className={styles.empty}>Nenhuma nota registrada para este paciente.</p>
          )}
        </div>
      </div>

      {/* RODAPÉ DE ASSINATURA */}
      <div className={styles.footer}>
        <div className={styles.signatureLine}>
          <div className={styles.line} />
          <p>Assinatura do Profissional Responsável</p>
        </div>
        <p className={styles.disclaimer}>Este documento é de uso estritamente confidencial e profissional.</p>
      </div>
    </div>
  );
}
