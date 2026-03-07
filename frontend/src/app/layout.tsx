import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'CobraIA — Facturación inteligente para Colombia',
  description: 'Sistema profesional de facturación con IA para comerciantes y PyMEs colombianas',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="es">
      <body>{children}</body>
    </html>
  );
}