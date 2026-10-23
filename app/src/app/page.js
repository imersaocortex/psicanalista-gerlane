import PublicAnalytics from '@/components/landing/PublicAnalytics';
import { publicMetadata, HOME_TITLE, HOME_DESCRIPTION, structuredData } from '@/lib/site';

export const metadata = publicMetadata(HOME_TITLE, HOME_DESCRIPTION, '/');

import Navbar from '@/components/landing/Navbar';
import Hero from '@/components/landing/Hero';
import { About, Psychoanalysis, AreasOfPractice, Modalities, Burnout, WhoIsItFor, Differentials, FinalCTA, Contact, Footer } from '@/components/landing/LandingSections';

export default function Home() {
  return (
    <>
      <a className="skip-link" href="#conteudo">Ir para o conteúdo</a>
      <Navbar />
      <main id="conteudo">
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData).replace(/</g, '\\u003c') }} />
        <Hero />
        <About />
        <Psychoanalysis />
        <AreasOfPractice />
        <Modalities />
        <Burnout />
        <WhoIsItFor />
        <Differentials />
        <FinalCTA />
        <Contact />
      </main>
      <Footer />
      <PublicAnalytics />
    </>
  );
}
