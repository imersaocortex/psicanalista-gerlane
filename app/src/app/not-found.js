import Link from 'next/link';
export const metadata = { title: 'Página não encontrada | Dra. Gerlane Albuquerque', robots: { index: false, follow: false } };
export default function NotFound() {
  return <main style={{ maxWidth: 720, margin: '0 auto', padding: '80px 24px' }}><h1>Página não encontrada</h1><p>O endereço pode ter mudado ou não estar disponível.</p><p><Link href="/">Voltar à página inicial</Link> · <Link href="/login">Acessar o Acolher</Link></p></main>;
}
