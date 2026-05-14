import styles from './Skeleton.module.css';

export default function Skeleton({ width, height, borderRadius, className = '' }) {
  return (
    <div 
      className={`${styles.skeleton} ${className}`} 
      style={{ 
        width: width || '100%', 
        height: height || '20px', 
        borderRadius: borderRadius || 'var(--radius-md)' 
      }} 
    />
  );
}
