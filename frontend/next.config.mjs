/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone',
  async rewrites() {
    const backendBase = process.env.BACKEND_API_URL || "http://127.0.0.1:8000/api/v1";

    return [
      {
        source: "/api/v1/:path*",
        destination: `${backendBase}/:path*`,
      },
    ];
  },
}
export default nextConfig
