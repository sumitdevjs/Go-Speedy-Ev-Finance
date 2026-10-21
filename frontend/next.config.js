/** @type {import('next').NextConfig} */
const nextConfig = {
  devIndicators: {
    buildActivity: false,
  },
  compiler: {
    removeConsole: process.env.NODE_ENV === 'production',
  },
  // Proxy all /api/* requests to the backend at local port 5000.
  // This makes cookies work properly (same-origin from the browser's perspective)
  async rewrites() {
    const backendUrl = process.env.INTERNAL_BACKEND_URL || 'http://127.0.0.1:5000';
    return [
      {
        source: '/api/:path*',
        destination: `${backendUrl}/api/:path*`,
      },
    ];
  },

  // Redirect old /login route to root (login is now on the landing page)
  async redirects() {
    const isProduction = process.env.NODE_ENV === 'production' || process.env.VERCEL === '1';
    return [
      {
        source: '/login',
        destination: '/',
        permanent: true,
      },
      // In live production, block Swagger docs from ever being exposed on the frontend
      ...(isProduction
        ? [
          {
            source: '/api/docs',
            destination: '/',
            permanent: false,
          },
          {
            source: '/api/docs/:path*',
            destination: '/',
            permanent: false,
          },
        ]
        : []),
    ];
  },
};

module.exports = nextConfig;
