// app/layout.tsx
import './globals.css';
import { geomanist } from './fonts';
import type { ReactNode } from 'react';

export const metadata = {
  title: 'dicacell4',
  description: 'Portal',
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="pt-BR" className={geomanist.variable}>
      {/* Se você controla tema via data-theme no <html>, mantenha aqui */}
      <body className="font-sans">{children}</body>
    </html>
  );
}
