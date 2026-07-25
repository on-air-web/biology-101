/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Static export by default: every tool page is a pre-rendered HTML file.
  // Fast, cheap, indexable, and deployable to Cloudflare Pages with no runtime.
  // Revisit only when a feature genuinely requires a server (accounts, AI).
  output: 'export',
  trailingSlash: true,
  images: { unoptimized: true },
};

export default nextConfig;
