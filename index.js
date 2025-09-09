// Entry point for Render deployment
// This file redirects to the actual backend application

const path = require('path');
const { spawn } = require('child_process');

// Change to backend directory and start the application
process.chdir(path.join(__dirname, 'backend'));

// Check if dist/index.js exists, if not build first
const fs = require('fs');
if (!fs.existsSync('./dist/index.js')) {
  console.log('Building TypeScript...');
  const build = spawn('npm', ['run', 'build'], { stdio: 'inherit' });
  build.on('close', (code) => {
    if (code === 0) {
      startApp();
    } else {
      console.error('Build failed');
      process.exit(1);
    }
  });
} else {
  startApp();
}

function startApp() {
  console.log('Starting CrisisAssist backend...');
  const app = spawn('node', ['dist/index.js'], { stdio: 'inherit' });
  
  app.on('close', (code) => {
    console.log(`Backend process exited with code ${code}`);
    process.exit(code);
  });
  
  app.on('error', (err) => {
    console.error('Failed to start backend:', err);
    process.exit(1);
  });
}
