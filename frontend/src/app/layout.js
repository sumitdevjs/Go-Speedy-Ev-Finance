import './globals.css';

export const metadata = {
  title: 'Go Speedy EV — Rent & Purchase Finance Monitor',
  description: 'Production-grade EV Rent & Purchase Monitor System for Delhi operations.',
};

export default function RootLayout({ children }) {
  return (
    <html lang="en" className="h-full bg-slate-50">
      <body className="h-full antialiased text-slate-900 bg-slate-50">{children}</body>
    </html>
  );
}
