'use client';
import styles from './Button.module.css';

export default function Button({ children, variant = 'primary', size = 'md', className = '', ...props }) {
  const classes = `${styles.btn} ${styles[variant]} ${styles[size]} ${className}`;
  
  return (
    <button className={classes} {...props}>
      {variant === 'primary' && <span className={styles.glow} />}
      {children}
    </button>
  );
}
