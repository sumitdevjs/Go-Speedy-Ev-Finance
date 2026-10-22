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
    icon: '/favicon.png',
    shortcut: '/favicon.ico',
    apple: '/apple-icon.png',
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
        <script
          dangerouslySetInnerHTML={{
            __html: `
              if (typeof window !== 'undefined' && window.location.hostname !== 'localhost' && window.location.hostname !== '127.0.0.1') {
                (function() {
                  var noop = function() {};
                  var methods = ['log', 'debug', 'info', 'warn', 'error', 'table', 'trace', 'dir', 'dirxml', 'group', 'groupCollapsed', 'groupEnd', 'time', 'timeEnd', 'timeLog', 'count', 'countReset', 'assert', 'clear'];
                  for (var i = 0; i < methods.length; i++) {
                    try {
                      Object.defineProperty(window.console, methods[i], {
                        get: function() { return noop; },
                        set: function() {},
                        configurable: true,
                        enumerable: true,
                      });
                    } catch (e) {
                      try { window.console[methods[i]] = noop; } catch (e2) {}
                    }
                  }
                })();
              }
            `,
          }}
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
        <div id="modal-portal-root" />
      </body>
    </html>
  );
}
