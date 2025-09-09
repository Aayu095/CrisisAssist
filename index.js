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
  
  // Build with memory optimization
  const { execSync } = require('child_process');
  try {
    execSync('node --max-old-space-size=512 ./node_modules/.bin/tsc --skipLibCheck --noEmit false', { 
      stdio: 'inherit',
      env: { ...process.env, NODE_OPTIONS: '--max-old-space-size=512' }
    });
    console.log('Build completed successfully');
  } catch (error) {
    console.error('Build failed:', error.message);
    process.exit(1);
  }
}

// Start the application
console.log('Starting application...');
require('./dist/index.js');
