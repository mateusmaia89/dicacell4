// app/fonts.ts
import localFont from 'next/font/local';

export const geomanist = localFont({
  src: [
    { path: '../public/fonts/geomanist/Geomanist-Regular.woff2', weight: '400', style: 'normal' },
    { path: '../public/fonts/geomanist/Geomanist-Bold.woff2',    weight: '700', style: 'normal' },
  ],
  variable: '--font-geomanist',
  display: 'swap',
  preload: true,
});
