/** @type {import('next').NextConfig} */
const nextConfig = {
  poweredByHeader: false,
  images: { formats: ['image/avif', 'image/webp'] },
  async headers() {
    const privatePaths = ['/dashboard/:path*', '/api/:path*', '/auth/:path*', '/login', '/cadastro', '/recuperar-senha', '/redefinir-senha', '/offline.html'];
    return privatePaths.map(source => ({ source, headers: [{ key: 'X-Robots-Tag', value: 'noindex, nofollow, noarchive' }] }));
  },
};
export default nextConfig;
