'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/utils/supabase/client';
import { getInitials } from '@/utils/helpers';
import Link from 'next/link';
import styles from './pacientes.module.css';
import Button from '@/components/ui/Button';
import { Users, Search as SearchIcon, Plus, Filter, MoreHorizontal, Trash2 } from 'lucide-react';
import Skeleton from '@/components/ui/Skeleton';
import { useToast } from '@/context/ToastContext';


export default function PacientesPage() {
  const router = useRouter();
  const [search, setSearch] = useState('');
  const [patients, setPatients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeMenu, setActiveMenu] = useState(null);
  const { addToast } = useToast();
  const supabase = createClient();

  useEffect(() => {
    async function fetchPatients() {
      const { data, error } = await supabase
        .from('pacientes')
        .select(`
          id,
          user_id,
          telefone,
          data_nascimento,
          profissao,
          status,
          created_at,
          profiles:user_id (
            nome,
            email,
            avatar_url
          ),
          anamneses (
            queixa_principal
          )
        `)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching patients:', error);
      } else {
        const mapped = data.map(p => ({
          id: p.id,
          userId: p.user_id,
          name: p.profiles?.nome || 'Paciente sem Nome',
          email: p.profiles?.email || 'Sem e-mail',
          profession: p.profissao || 'Profissão não informada',
          status: p.status || 'ativo',
          startDate: p.created_at,
          mainComplaint: p.anamneses?.[0]?.queixa_principal || 'Aguardando primeira consulta',
          age: p.data_nascimento ? new Date().getFullYear() - new Date(p.data_nascimento).getFullYear() : '?'
        }));
        setPatients(mapped);
      }
      setLoading(false);
    }

    fetchPatients();
  }, []);

  const filtered = patients.filter(p => 
    p.name.toLowerCase().includes(search.toLowerCase()) || 
    p.email.toLowerCase().includes(search.toLowerCase()) ||
    p.mainComplaint.toLowerCase().includes(search.toLowerCase())
  );
  
  // Close menu when clicking outside
  useEffect(() => {
    const handleClickOutside = () => setActiveMenu(null);
    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, []);

  const handleToggleMenu = (e, id) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.nativeEvent && e.nativeEvent.stopImmediatePropagation) {
      e.nativeEvent.stopImmediatePropagation();
    }
    console.log("Toggle menu requested for:", id);
    setActiveMenu(prev => prev === id ? null : id);
  };

  const handleInativar = async (e, id, currentStatus) => {
    e.preventDefault();
    e.stopPropagation();
    const newStatus = currentStatus === 'ativo' ? 'inativo' : 'ativo';
    const { error } = await supabase
      .from('pacientes')
      .update({ status: newStatus })
      .eq('id', id);
    
    if (!error) {
      setPatients(prev => prev.map(p => p.id === id ? { ...p, status: newStatus } : p));
      addToast(newStatus === 'ativo' ? 'Paciente reativado com sucesso!' : 'Paciente inativado com sucesso!', 'success');
    } else {
      addToast('Erro ao atualizar status do paciente.', 'error');
    }
    setActiveMenu(null);
  };

  const handleDelete = async (e, id, userId) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (confirm('Tem certeza que deseja excluir permanentemente este paciente e todos os seus dados (sessões, pagamentos, anamnese)? Esta ação não pode ser desfeita.')) {
      setLoading(true);
      try {
        // 1. Delete sessoes
        const { error: sessoesError } = await supabase
          .from('sessoes')
          .delete()
          .eq('paciente_id', id);
        if (sessoesError) throw sessoesError;

        // 2. Delete pagamentos
        const { error: pagamentosError } = await supabase
          .from('pagamentos')
          .delete()
          .eq('paciente_id', id);
        if (pagamentosError) throw pagamentosError;

        // 3. Delete anamneses
        const { error: anamnesesError } = await supabase
          .from('anamneses')
          .delete()
          .eq('paciente_id', id);
        if (anamnesesError) throw anamnesesError;

        // 4. Delete pacientes
        const { error: pacienteError } = await supabase
          .from('pacientes')
          .delete()
          .eq('id', id);
        if (pacienteError) throw pacienteError;

        // 5. Delete profiles
        if (userId) {
          const { error: profileError } = await supabase
            .from('profiles')
            .delete()
            .eq('id', userId);
          if (profileError) throw profileError;
        }

        setPatients(prev => prev.filter(p => p.id !== id));
        addToast('Paciente excluído com sucesso!', 'success');
      } catch (error) {
        console.error('Error deleting patient:', error);
        addToast(error.message || 'Erro ao excluir paciente.', 'error');
      } finally {
        setLoading(false);
        setActiveMenu(null);
      }
    }
  };


  if (loading) return (
    <div className={styles.page}>
      <div className={styles.header}>
        <Skeleton width="250px" height="40px" />
        <Skeleton width="150px" height="40px" />
      </div>
      <div className={styles.grid}>
        {[1, 2, 3, 4, 5, 6].map(i => (
          <div key={i} className={styles.patientCard}>
            <div className={styles.cardHeader}>
              <Skeleton width="48px" height="48px" borderRadius="50%" />
              <div style={{flex: 1, marginLeft: '12px'}}>
                <Skeleton width="60%" height="16px" />
                <Skeleton width="40%" height="12px" style={{marginTop: '8px'}} />
              </div>
            </div>
            <div className={styles.cardDetails} style={{marginTop: '20px'}}>
              <Skeleton width="100%" height="60px" />
            </div>
            <Skeleton width="100%" height="40px" style={{marginTop: '20px'}} />
          </div>
        ))}
      </div>
    </div>
  );

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <div className={styles.headerTitle}>
          <div className={styles.iconCircle}>
            <Users size={24} color="white" />
          </div>
          <div>
            <h1>Gestão de Pacientes</h1>
            <p className={styles.subtitle}>Você tem {patients.length} pacientes na sua base clínica.</p>
          </div>
        </div>
        <Link href="/dashboard/admin/pacientes/novo">
          <Button><Plus size={16} /> Novo Paciente</Button>
        </Link>
      </div>

      <div className={styles.actionsBar}>
        <div className={styles.searchWrapper}>
          <SearchIcon size={18} className={styles.searchIcon} />
          <input 
            type="text" 
            placeholder="Buscar por nome, e-mail ou queixa..." 
            value={search} 
            onChange={e => setSearch(e.target.value)} 
            className={styles.searchInput} 
          />
        </div>
        <button className={styles.filterBtn}>
          <Filter size={18} /> Filtros
        </button>
      </div>

      <div className={styles.grid}>
        {filtered.map((p, index) => (
          <div 
            key={p.id} 
            className={styles.patientCard} 
            style={{ animationDelay: `${index * 0.05}s` }}
          >
            <div className={styles.menuContainer} onClick={(e) => e.stopPropagation()}>
              <button 
                className={styles.moreBtn} 
                onClick={(e) => handleToggleMenu(e, p.id)}
              >
                <MoreHorizontal size={18} />
              </button>
              
              {activeMenu === p.id && (
                <div className={styles.dropdown} onClick={(e) => e.stopPropagation()}>
                  <Link href={`/dashboard/admin/pacientes/${p.id}`} className={styles.dropdownItem}>
                    <Users size={16} /> VER PRONTUÁRIO
                  </Link>
                  <Link href={`/dashboard/admin/pacientes/${p.id}/editar`} className={styles.dropdownItem}>
                    <Plus size={16} style={{transform: 'rotate(45deg)'}} /> EDITAR CADASTRO
                  </Link>
                  <Link 
                      href={`/dashboard/admin/pacientes/${p.id}/imprimir`} 
                      target="_blank" 
                      className={styles.dropdownItem}
                      onClick={() => setActiveMenu(null)}
                    >
                      <Plus size={16} /> IMPRIMIR FICHA
                    </Link>
                  <div className={styles.divider} />
                  <button 
                    onClick={(e) => handleInativar(e, p.id, p.status)} 
                    className={`${styles.dropdownItem} ${p.status === 'ativo' ? styles.danger : styles.success}`}
                  >
                    <MoreHorizontal size={16} /> {p.status === 'ativo' ? 'INATIVAR PACIENTE' : 'REATIVAR PACIENTE'}
                  </button>
                  <div className={styles.divider} />
                  <button 
                    onClick={(e) => handleDelete(e, p.id, p.userId)} 
                    className={`${styles.dropdownItem} ${styles.danger}`}
                  >
                    <Trash2 size={16} /> EXCLUIR PACIENTE
                  </button>
                </div>
              )}
            </div>

            <div 
              className={styles.cardClickableArea}
              onClick={() => router.push(`/dashboard/admin/pacientes/${p.id}`)}
            >
              <div className={styles.cardHeader}>
                <div className={styles.avatarWrapper}>
                  <div className={styles.avatar}>{getInitials(p.name)}</div>
                  <div className={`${styles.statusDot} ${p.status === 'ativo' ? styles.active : ''}`} />
                </div>
                <div className={styles.info}>
                  <h4>{p.name}</h4>
                  <span className={styles.email}>{p.email}</span>
                </div>
              </div>
              
              <div className={styles.cardDetails}>
                <div className={styles.detail}>
                  <span className={styles.label}>Profissão</span>
                  <span className={styles.value}>{p.profession}</span>
                </div>
                <div className={styles.detail}>
                  <span className={styles.label}>Idade</span>
                  <span className={styles.value}>{p.age} anos</span>
                </div>
                <div className={styles.detail}>
                  <span className={styles.label}>Desde</span>
                  <span className={styles.value}>{new Date(p.startDate).toLocaleDateString('pt-BR', {month: 'short', year: 'numeric'})}</span>
                </div>
              </div>

              <div className={styles.complaintBox}>
                <p className={styles.complaintText}>{p.mainComplaint}</p>
              </div>

              <div className={styles.cardFooter}>
                <span className={styles.statusBadge} data-status={p.status}>
                  {p.status.charAt(0).toUpperCase() + p.status.slice(1)}
                </span>
                <span className={styles.viewLink}>Ver prontuário →</span>
              </div>
            </div>
          </div>
        ))}
      </div>

      {filtered.length === 0 && !loading && (
        <div className={styles.emptyState}>
          <Users size={48} color="var(--border-color)" />
          <h3>Nenhum paciente encontrado</h3>
          <p>Tente ajustar sua busca ou cadastrar um novo paciente.</p>
        </div>
      )}
    </div>
  );
}
