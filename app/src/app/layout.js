import './globals.css';
import { AuthProvider } from '@/context/AuthContext';
import { ToastProvider } from '@/context/ToastContext';

export const metadata = {
  title: 'Dra. Gerlane Albuquerque | Psicanalista Clínica',
  description: 'Psicanalista clínica especializada em atendimento para crianças, adolescentes, adultos e casais. CNP: 20/2832.',
  icons: {
    icon: '/images/favicon.png',
    apple: '/images/favicon.png',
  },
};

export const viewport = { themeColor: '#1B4332' };

export default function RootLayout({ children }) {
  return (
    <html lang="pt-BR" data-scroll-behavior="smooth">
      <body>
        <AuthProvider>
          <ToastProvider>
            {children}
          </ToastProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
