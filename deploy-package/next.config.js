const nextConfig = {
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
