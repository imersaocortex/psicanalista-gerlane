import { ImageResponse } from 'next/og';
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
export const runtime = 'nodejs';
export const alt = 'Dra. Gerlane Albuquerque — Psicanálise clínica online e presencial';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';
export default async function SocialImage() {
  const portrait = await readFile(join(process.cwd(), 'public/images/gerlane.jpg'));
  return new ImageResponse(
    <div style={{ width: '100%', height: '100%', display: 'flex', background: '#FDF8F0', color: '#1B4332', padding: 56, alignItems: 'center', justifyContent: 'space-between', borderBottom: '18px solid #C5A55A' }}>
      <div style={{ display: 'flex', flexDirection: 'column', width: 650 }}>
        <div style={{ fontSize: 26, color: '#856C32', marginBottom: 26 }}>PSICANÁLISE CLÍNICA</div>
        <div style={{ fontSize: 62, fontWeight: 700, lineHeight: 1.1 }}>Dra. Gerlane Albuquerque</div>
        <div style={{ fontSize: 30, lineHeight: 1.4, marginTop: 28 }}>Acolhimento e escuta para cuidar da sua saúde emocional.</div>
        <div style={{ fontSize: 24, marginTop: 28 }}>Atendimento online e presencial</div>
      </div>
      {/* ImageResponse renders this image directly into the share card. */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={'data:image/jpeg;base64,' + portrait.toString('base64')} alt="" width={330} height={438} style={{ objectFit: 'cover', borderRadius: 24 }} />
    </div>, size,
  );
}
