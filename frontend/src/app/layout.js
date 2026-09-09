import './globals.css';
import { ThemeProvider } from '../store/themeContext';

export const metadata = {
  title: 'Go Speedy EV — Rent & Purchase Finance Monitor',
  description: 'Production-grade EV Rent & Purchase Monitor System for Delhi operations.',
};

export default function RootLayout({ children }) {
  return (
    <html lang="en" className="h-full" suppressHydrationWarning>
      <body
        className="h-full antialiased text-slate-900 dark:text-slate-100 bg-slate-50 dark:bg-slate-950 transition-colors"
        suppressHydrationWarning
      >
        <ThemeProvider>
          {children}
        </ThemeProvider>
      </body>
    </html>
  );
}
