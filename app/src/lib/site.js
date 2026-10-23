// Public identity only. Never derive canonicals from request hosts or preview URLs.
export const SITE_URL = 'https://psicanalistagerlane.com.br';
export const SITE_NAME = 'Dra. Gerlane Albuquerque';
export const HOME_TITLE = 'Dra. Gerlane Albuquerque | Psicanalista Clínica';
export const HOME_DESCRIPTION = 'Psicanálise online e presencial com a Dra. Gerlane Albuquerque. Acolhimento para crianças, adolescentes, adultos e casais. Conheça o atendimento.';
export const SOCIAL_IMAGE = { url: '/opengraph-image', width: 1200, height: 630, alt: 'Dra. Gerlane Albuquerque — Psicanálise clínica online e presencial' };
export function publicMetadata(title, description, pathname) {
  const url = new URL(pathname, SITE_URL).href;
  return {
    title, description, alternates: { canonical: url },
    robots: { index: true, follow: true, googleBot: { index: true, follow: true, 'max-image-preview': 'large' } },
    openGraph: { title, description, type: 'website', url, siteName: SITE_NAME, locale: 'pt_BR', images: [SOCIAL_IMAGE] },
    twitter: { card: 'summary_large_image', title, description, images: [SOCIAL_IMAGE] },
  };
}
export const structuredData = {
  '@context': 'https://schema.org',
  '@graph': [
    { '@type': 'Organization', '@id': SITE_URL + '/#organization', name: SITE_NAME, url: SITE_URL + '/', logo: SITE_URL + '/images/logo.png', telephone: '+55-84-99812-7788', sameAs: ['https://instagram.com/psicanalista_gerlane', 'https://tiktok.com/@dragerlane.psican'] },
    { '@type': 'Person', '@id': SITE_URL + '/#professional', name: SITE_NAME, jobTitle: 'Psicanalista clínica', image: SITE_URL + '/images/gerlane.jpg', url: SITE_URL + '/#sobre', worksFor: { '@id': SITE_URL + '/#organization' } },
    { '@type': 'WebSite', '@id': SITE_URL + '/#website', url: SITE_URL + '/', name: SITE_NAME, inLanguage: 'pt-BR', publisher: { '@id': SITE_URL + '/#organization' } },
    { '@type': 'WebPage', '@id': SITE_URL + '/#webpage', url: SITE_URL + '/', name: HOME_TITLE, description: HOME_DESCRIPTION, inLanguage: 'pt-BR', isPartOf: { '@id': SITE_URL + '/#website' }, about: { '@id': SITE_URL + '/#service' } },
    { '@type': 'Service', '@id': SITE_URL + '/#service', name: 'Atendimento em psicanálise clínica', serviceType: 'Psicanálise online e presencial', description: 'Atendimento para crianças, adolescentes, adultos e casais. Sessões online em todo o Brasil e atendimento presencial mediante contato.', provider: { '@id': SITE_URL + '/#organization' }, url: SITE_URL + '/#modalidades' },
  ],
};
