const nextConfig = {
  // 빌드 시 자동으로 타임스탬프 설정 (2주 만료 체크용)
  env: {
    NEXT_PUBLIC_BUILD_TIME: new Date().toISOString(),
    // Amplify에서 secret은 런타임에 처리되지만 Public은 여기서
    // (보안) OPENAI 키는 서버사이드 전용이므로 제거 권장하나 호환성 유지
    NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL,
  },
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'i.pravatar.cc',
      },
      {
        protocol: 'https',
        hostname: 'images.unsplash.com',
      },
    ],
  },
  // output: 'standalone', // Consider enabling if Amplify issues persist
  experimental: {
    serverComponentsExternalPackages: ['@node-rs/bcrypt', '@prisma/client', 'prisma'],
    serverActions: {
      bodySizeLimit: '10mb',
    },
  },
  eslint: {
    // Warning: This allows production builds to successfully complete even if
    // your project has ESLint errors.
    ignoreDuringBuilds: true,
  },
  typescript: {
    // !! WARN !!
    // Dangerously allow production builds to successfully complete even if
    // your project has type errors.
    ignoreBuildErrors: true,
  },
  async headers() {
    return [
      {
        source: '/api/:path*',
        headers: [
          { key: 'Access-Control-Allow-Credentials', value: 'true' },
          { key: 'Access-Control-Allow-Origin', value: '*' },
          { key: 'Access-Control-Allow-Methods', value: 'GET,DELETE,PATCH,POST,PUT' },
          { key: 'Access-Control-Allow-Headers', value: 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version' },
        ],
      },
    ];
  },
  webpack: (config, { isServer }) => {
    if (isServer) {
      config.externals = config.externals || [];
      config.externals.push('@node-rs/bcrypt');
    }
    return config;
  },
  // ...기타 옵션
};

module.exports = nextConfig;
