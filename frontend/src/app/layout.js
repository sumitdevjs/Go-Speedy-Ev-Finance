import 'lenis/dist/lenis.css';
import './globals.css';
import { ThemeProvider } from '../store/themeContext';
import SmoothScroll from '../components/ui/SmoothScroll';

export const viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
  viewportFit: 'cover',
};

export const metadata = {
  title: 'Go Speedy EV — Rent & Purchase Finance Monitor',
  description: 'Production-grade EV Rent & Purchase Monitor System for Delhi operations.',
  icons: {
    icon: '/favicon.png?v=3',
    shortcut: '/favicon.ico?v=3',
    apple: '/apple-icon.png?v=3',
  },
};

export default function RootLayout({ children }) {
  return (
    <html lang="en" className="h-full" suppressHydrationWarning>
      <body
        className="min-h-full antialiased text-slate-900 dark:text-slate-100 bg-slate-50 dark:bg-slate-950 transition-colors"
        suppressHydrationWarning
      >
        <ThemeProvider>
          <SmoothScroll>
            {children}
          </SmoothScroll>
        </ThemeProvider>
      </body>
    </html>
  );
}
