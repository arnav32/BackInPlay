import './globals.css';
import { Outfit } from 'next/font/google';

export const metadata = {
  title: 'BackInPlay',
  description: 'Smart physiotherapy exercise coach — get real-time form feedback and get back in the game.',
};

const outfit = Outfit({ subsets: ['latin'], weight: ['400', '500', '600', '700'], variable: '--font-outfit' });

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={outfit.variable}>
      <body className={outfit.className}>{children}</body>
    </html>
  );
}
