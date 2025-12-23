const nextConfig = {
  // 빌드 시 자동으로 타임스탬프 설정 (2주 만료 체크용)
  env: {
    NEXT_PUBLIC_BUILD_TIME: new Date().toISOString(),
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
  experimental: {
    serverComponentsExternalPackages: ['@node-rs/bcrypt'],
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
