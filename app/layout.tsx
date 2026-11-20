import type {Metadata} from 'next';
import './globals.css'; // Global styles

export const metadata: Metadata = {
  title: 'MOVIX SlideVideo - PowerPoint & Vídeo com Narração',
  description: 'Crie apresentações em PowerPoint (.pptx) com textos e fotos anexadas, valide e transforme em vídeos com narração automática e download.',
  openGraph: {
    title: 'MOVIX SlideVideo - PowerPoint & Vídeo com Narração',
    description: 'Crie apresentações em PowerPoint (.pptx) com textos e fotos anexadas, valide e transforme em vídeos com narração automática e download.',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'MOVIX SlideVideo - PowerPoint & Vídeo com Narração',
    description: 'Crie apresentações em PowerPoint (.pptx) com textos e fotos anexadas, valide e transforme em vídeos com narração automática e download.',
  },
};

export default function RootLayout({children}: {children: React.ReactNode}) {
  return (
    <html lang="pt-BR">
      <body suppressHydrationWarning>{children}</body>
    </html>
  );
}
