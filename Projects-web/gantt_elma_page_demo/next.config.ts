import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          {
            key: "Content-Security-Policy",
            value:
              "frame-ancestors 'self' https://*.elma365.ru https://*.elma365.com;",
          },
        ],
      },
    ];
  },
};

export default nextConfig;
