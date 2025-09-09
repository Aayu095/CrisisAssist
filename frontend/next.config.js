/** @type {import('next').NextConfig} */
const nextConfig = {
  webpack: (config, { dev, isServer }) => {
    if (dev && !isServer) {
      // Disable chunk splitting to prevent timeout issues
      config.optimization.splitChunks = false;
      
      // Increase chunk timeout
      config.output.chunkLoadTimeout = 120000; // 2 minutes
    }
    return config;
  },
  // Disable on-demand entries to prevent chunk loading issues
  onDemandEntries: {
    maxInactiveAge: 120 * 1000,
    pagesBufferLength: 2,
  }
}

module.exports = nextConfig