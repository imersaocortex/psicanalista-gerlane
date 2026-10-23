import { Suspense } from 'react';
import AuthScreen from '@/components/auth/AuthScreen';
export const metadata = { title: 'Criar conta | Acolher', description: 'Seu bem-estar em um só lugar', robots: { index: false }, manifest: '/manifest.json' };
export default function CadastroPage() { return <Suspense fallback={<p>Carregando...</p>}><AuthScreen mode="register" /></Suspense>; }
