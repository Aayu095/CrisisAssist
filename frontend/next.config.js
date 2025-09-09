/** @type {import('next').NextConfig} */
const nextConfig = {
  // Disable SWC minification to prevent chunk errors
  swcMinify: false,
  
  webpack: (config, { dev, isServer }) => {
    // Fix chunk loading timeout issues
    config.output.chunkLoadTimeout = 300000; // 5 minutes
    
    if (dev) {
      // Disable chunk splitting in development
      config.optimization.splitChunks = {
        chunks: 'all',
        cacheGroups: {
          default: false,
          vendors: false,
        },
      };
      
      // Reduce memory usage
      config.optimization.removeAvailableModules = false;
      config.optimization.removeEmptyChunks = false;
      config.optimization.mergeDuplicateChunks = false;
    }
    
    return config;
  },
  
  // Disable experimental features that can cause issues
  experimental: {
    optimizeCss: false,
  },
  
  // Optimize images
  images: {
    unoptimized: true,
  },
  
  // Disable source maps for faster builds
  productionBrowserSourceMaps: false,
}

module.exports = nextConfig