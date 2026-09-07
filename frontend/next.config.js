/** @type {import('next').NextConfig} */
const nextConfig = {
  // Proxy all /api/* requests to the backend at port 5000.
  // This makes cookies work properly (same-origin from the browser's perspective)
  async rewrites() {
    return [
      {
        source: '/api/:path*',
        destination: 'http://localhost:5000/api/:path*',
      },
    ];
  },
};

module.exports = nextConfig;
