import { Suspense } from 'react';
import AuthScreen from '@/components/auth/AuthScreen';
export const metadata = { title: 'Nova senha | Acolher', robots: { index: false } };
export default function ResetPage() { return <Suspense fallback={<p>Carregando...</p>}><AuthScreen mode="reset" /></Suspense>; }
