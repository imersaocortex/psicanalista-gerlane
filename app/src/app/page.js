import Navbar from '@/components/landing/Navbar';
import Hero from '@/components/landing/Hero';
import { About, Psychoanalysis, AreasOfPractice, Modalities, Burnout, WhoIsItFor, Differentials, FinalCTA, Contact, Footer } from '@/components/landing/LandingSections';

export default function Home() {
  return (
    <>
      <Navbar />
      <main>
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
    </>
  );
}
