import 'lenis/dist/lenis.css';
import './globals.css';
import { ThemeProvider } from '../store/themeContext';
import SmoothScroll from '../components/ui/SmoothScroll';
import WebsiteIntro from '../components/ui/WebsiteIntro';

export const viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
  viewportFit: 'cover',
};

export const metadata = {
  title: 'Go Speedy Pvt. Ltd — Welcome to The Future | The House of Ev',
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
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Charis+SIL:ital,wght@0,400;0,700;1,400;1,700&display=swap"
          rel="stylesheet"
        />
      </head>
      <body
        className="min-h-full antialiased text-slate-900 dark:text-slate-100 bg-slate-50 dark:bg-slate-950 transition-colors"
        suppressHydrationWarning
      >
        <ThemeProvider>
          <WebsiteIntro />
          <SmoothScroll>
            {children}
          </SmoothScroll>
        </ThemeProvider>
      </body>
    </html>
  );
}
