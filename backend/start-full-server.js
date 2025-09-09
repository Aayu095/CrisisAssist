const { spawn } = require('child_process');
const path = require('path');

// Full CrisisAssist server startup script
async function startFullServer() {
  console.log('🚀 Starting CrisisAssist Full Server...');

  // Set environment variables
  process.env.DEMO_MODE = 'true';
  process.env.PORT = '3001';
  process.env.NODE_ENV = 'development';
  process.env.DATABASE_URL = 'postgresql://postgres:password@localhost:5432/crisisassist';
  process.env.DESCOPE_PROJECT_ID = 'P2oUXbG3TAaHoAXFmU36727jEd';
  process.env.DESCOPE_MANAGEMENT_KEY = 'K2oUXbG3TAaHoAXFmU36727jEd.demo.key';
  process.env.JWT_SECRET = 'crisis_assist_jwt_secret_key_for_development_only';
  process.env.CORS_ORIGIN = 'http://localhost:3000';
  process.env.LOG_LEVEL = 'info';
  process.env.VERIFIER_PRIVATE_KEY = 'demo-private-key';
  process.env.SLACK_BOT_TOKEN = 'xoxb-demo-slack-bot-token';
  process.env.GOOGLE_CALENDAR_ACCESS_TOKEN = 'demo_google_access_token';
  process.env.TWILIO_ACCOUNT_SID = 'ACdemo123456789';
  process.env.TWILIO_AUTH_TOKEN = 'demo_twilio_auth_token';
  process.env.TWILIO_PHONE_NUMBER = '+1234567890';

  console.log('✅ Environment variables configured');
  console.log('📍 Server will run on: http://localhost:3001');
  console.log('🔧 Demo mode: ENABLED');
  console.log('');

  // Start the server using ts-node
  const serverProcess = spawn('npx', ['ts-node', 'src/index.ts'], {
    cwd: __dirname,
    stdio: 'inherit',
    env: process.env
  });

  serverProcess.on('error', (error) => {
    console.error('❌ Failed to start server:', error);
  });

  serverProcess.on('exit', (code) => {
    console.log(`🔄 Server process exited with code ${code}`);
  });

  // Handle graceful shutdown
  process.on('SIGINT', () => {
    console.log('\n🛑 Shutting down server...');
    serverProcess.kill('SIGINT');
    process.exit(0);
  });
}

if (require.main === module) {
  startFullServer().catch(console.error);
}

module.exports = { startFullServer };
