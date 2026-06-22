import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  // outputFile tracingRoot: path.resolve(__dirname, '../../'),  // Uncomment and add 'import path from "path"' if needed
  /* config options here */
  allowedDevOrigins: ['*.dev.coze.site', '192.168.*.*', '127.0.0.1'],
  onDemandEntries: {
    maxInactiveAge: 0,
    pagesBufferLength: 10,
  },
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '*',
        pathname: '/**',
      },
    ],
  },
  // 标记使用 child_process 的包为服务端专用
  serverExternalPackages: ['coze-coding-dev-sdk'],
  turbopack: {},
  webpack: (config, { isServer }) => {
    // 在客户端构建时排除 Node.js 原生模块
    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        child_process: false,
        fs: false,
        path: false,
        os: false,
        crypto: false,
        net: false,
        tls: false,
        zlib: false,
        stream: false,
        buffer: false,
        events: false,
        http: false,
        https: false,
        cluster: false,
        dgram: false,
        dns: false,
        process: false,
      };
    }
    return config;
  },
};

export default nextConfig;
