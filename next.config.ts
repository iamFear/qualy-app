import type { NextConfig } from 'next';

const config: NextConfig = {
  agentRules: false,
  poweredByHeader: false,
  devIndicators: false,
  outputFileTracingExcludes: { '/*': ['./data/**'] },
  async headers() {
    return [{
      source: '/:path*',
      headers: [
        { key: 'X-Content-Type-Options', value: 'nosniff' },
        { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
      ],
    }, {
      source: '/assets/:path*',
      headers: [{ key: 'Cache-Control', value: 'public, max-age=86400' }],
    }];
  },
};

export default config;
