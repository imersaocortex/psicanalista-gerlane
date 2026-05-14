import { Heart, Brain, Activity, CheckCircle, Quote, File, Paperclip } from 'lucide-react';
import styles from './AnamneseReport.module.css';

export default function AnamneseReport({ formData, arquivos = [], id = 'anamnese-report' }) {
  return (
    <div className={styles.reportPaper} id={id}>
      <div className={styles.watermark}><Heart size={300} /></div>

      <div className={styles.reportHeader}>
        <div className={styles.clinicInfo}>
          <div className={styles.clinicLogo}>GA</div>
          <div>
            <h3>Dra. Gerlane Albuquerque</h3>
            <p>Psicanalista Clínica • Psicanálise & Bem-estar</p>
            <p className={styles.crp}>CNP: 20/2832</p>
          </div>
        </div>
        <div className={styles.confidentialBadge}>
          <CheckCircle size={14} /> Documento Confidencial
        </div>
      </div>

      <div className={styles.divider} />

      <div className={styles.reportContent}>
        <section className={styles.reportSection}>
          <div className={styles.sectionHeader}>
            <Brain size={20} />
            <h4>1. Queixa Principal e Motivo da Consulta</h4>
          </div>
          <div className={styles.textBlock}>
            {formData.queixa_principal}
          </div>
        </section>

        <div className={styles.reportGrid}>
          <section className={styles.reportSection}>
            <div className={styles.sectionHeader}>
              <Heart size={20} />
              <h4>2. Histórico de Saúde</h4>
            </div>
            <div className={styles.detailList}>
              <div className={styles.detailItem}>
                <span>Familiar:</span>
                <p>{formData.historico_familiar || 'Nenhuma observação relevante.'}</p>
              </div>
              <div className={styles.detailItem}>
                <span>Saúde Física:</span>
                <p>{formData.saude_fisica || 'Nenhuma condição reportada.'}</p>
              </div>
              <div className={styles.detailItem}>
                <span>Medicação:</span>
                <p>{formData.uso_medicamentos || 'Nenhum uso reportado.'}</p>
              </div>
            </div>
          </section>

          <section className={styles.reportSection}>
            <div className={styles.sectionHeader}>
              <Activity size={20} />
              <h4>3. Hábitos e Estilo de Vida</h4>
            </div>
            <div className={styles.lifestyleGrid}>
              <div className={styles.lifestyleCard}>
                <span>Qualidade do Sono</span>
                <p>{formData.sono}</p>
              </div>
              <div className={styles.lifestyleCard}>
                <span>Alimentação</span>
                <p>{formData.alimentacao}</p>
              </div>
            </div>
          </section>
        </div>

        <section className={styles.reportSection}>
          <div className={styles.sectionHeader}>
            <CheckCircle size={20} />
            <h4>4. Objetivos Terapêuticos</h4>
          </div>
          <div className={styles.textBlock} style={{borderLeft: '4px solid var(--color-green)'}}>
            {formData.objetivos || 'Em definição conjunta.'}
          </div>
        </section>

        {arquivos.length > 0 && (
          <section className={styles.reportSection}>
            <div className={styles.sectionHeader}>
              <Paperclip size={20} />
              <h4>5. Documentos e Anexos Complementares</h4>
            </div>
            <div className={styles.fileGrid}>
              {arquivos.map((file) => (
                <div key={file.id} className={styles.fileCard}>
                  <div className={styles.fileIcon}>
                    <File size={24} />
                  </div>
                  <div className={styles.fileDetails}>
                    <span className={styles.fileName}>{file.name}</span>
                    <span className={styles.fileMeta}>
                      {(file.size / 1024).toFixed(1)} KB • {new Date(file.createdAt).toLocaleDateString()}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}
      </div>

      <div className={styles.reportFooter}>
        <div className={styles.seal}>
          <Quote size={20} />
        </div>
        <p>Documento oficial protegido por sigilo ético profissional.</p>
        <p style={{fontSize: '10px', marginTop: '10px'}}>Gerado em {new Date().toLocaleString()}</p>
      </div>
    </div>
  );
}
