import { Suspense } from 'react';
import AuthScreen from '@/components/auth/AuthScreen';
export const metadata = { title: 'Recuperar acesso | Acolher', robots: { index: false } };
export default function RecoverPage() { return <Suspense fallback={<p>Carregando...</p>}><AuthScreen mode="recover" /></Suspense>; }
