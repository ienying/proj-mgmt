import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  // 安全：隐藏框架标识（V8）
  poweredByHeader: false,

  // 安全：生产环境禁用 source map（V5）
  productionBrowserSourceMaps: false,

  // 安全响应头（V6/V10）
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          // 基础安全头
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "X-Frame-Options", value: "DENY" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          // V10: 显式禁用已废弃的 X-XSS-Protection（覆盖 Next.js 默认值）
          { key: "X-XSS-Protection", value: "0" },
          // V6: CSP 防御 XSS
          { key: "Content-Security-Policy", value: "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; connect-src 'self'; font-src 'self' data:;" },
          { key: "Strict-Transport-Security", value: "max-age=31536000; includeSubDomains" },
          { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
        ],
      },
    ];
  },

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
