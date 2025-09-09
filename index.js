// Entry point for Render deployment
const path = require('path');
const fs = require('fs');

console.log('CrisisAssist starting...');

// Change to backend directory
const backendPath = path.join(__dirname, 'backend');
process.chdir(backendPath);

console.log('Current directory:', process.cwd());

// Check if compiled files exist
if (!fs.existsSync('./dist/index.js')) {
  console.log('Compiled files not found. Building...');
  
  // Build with npx to use global or local TypeScript
  const { execSync } = require('child_process');
  try {
    // Try npx first (uses local or global tsc)
    execSync('npx tsc --skipLibCheck', { 
      stdio: 'inherit',
      env: { ...process.env, NODE_OPTIONS: '--max-old-space-size=512' }
    });
    console.log('Build completed successfully');
  } catch (error) {
    console.error('Build failed:', error.message);
    console.log('Trying alternative build method...');
    
    // Fallback: try using the build script
    try {
      execSync('npm run build', { stdio: 'inherit' });
      console.log('Alternative build successful');
    } catch (fallbackError) {
      console.error('All build methods failed:', fallbackError.message);
      process.exit(1);
    }
  }
}

// Start the application
console.log('Starting application...');
require('./dist/index.js');
