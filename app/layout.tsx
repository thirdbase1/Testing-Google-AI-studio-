import type {Metadata} from 'next';
import { Inter, JetBrains_Mono } from 'next/font/google';
import './globals.css'; // Global styles

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-sans',
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ['latin'],
  variable: '--font-mono',
});

export const metadata: Metadata = {
  title: 'City Landmark Guide & AR Narrator',
  description: 'AI-powered photo tourism applet to instantly scan landmarks, search accurate histories, and play narrated guides with HUD visuals.',
};

export default function RootLayout({children}: {children: React.ReactNode}) {
  return (
    <html lang="en" className={`${inter.variable} ${jetbrainsMono.variable}`}>
      <body className="bg-slate-950 text-slate-100 font-sans min-h-screen antialiased" suppressHydrationWarning>
        {children}
      </body>
    </html>
  );
}

