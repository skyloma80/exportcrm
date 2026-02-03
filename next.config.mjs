/** @type {import('next').NextConfig} */
const nextConfig = {
  // Enable React strict mode for better development experience
  reactStrictMode: true,
  // Enable standalone output for Docker deployment
  output: 'standalone',
  // Increase body size limit for file uploads (50MB)
  experimental: {
    serverActions: {
      bodySizeLimit: '50mb',
    },
  },
  // Transpile ESM packages for compatibility
  transpilePackages: ['@react-pdf/renderer'],
  // Increase body size limit for API routes
  serverExternalPackages: [],
}

export default nextConfig
