#!/usr/bin/env node

/**
 * CrisisAssist Setup Verification Script
 * This script verifies that all components are properly configured and connected
 */

const fs = require('fs');
const path = require('path');
const https = require('https');
const { execSync } = require('child_process');

// Load environment variables
require('dotenv').config();

console.log('🔍 CrisisAssist Setup Verification');
console.log('==================================\n');

let allChecks = [];
let criticalIssues = [];
let warnings = [];

// Helper functions
function checkPassed(name, details = '') {
  console.log(`✅ ${name}${details ? ` - ${details}` : ''}`);
  allChecks.push({ name, status: 'passed', details });
}

function checkWarning(name, details = '') {
  console.log(`⚠️  ${name}${details ? ` - ${details}` : ''}`);
  warnings.push({ name, details });
  allChecks.push({ name, status: 'warning', details });
}

function checkFailed(name, details = '') {
  console.log(`❌ ${name}${details ? ` - ${details}` : ''}`);
  criticalIssues.push({ name, details });
  allChecks.push({ name, status: 'failed', details });
}

function checkFileExists(filePath, description) {
  if (fs.existsSync(filePath)) {
    checkPassed(`${description} exists`, filePath);
    return true;
  } else {
    checkFailed(`${description} missing`, filePath);
    return false;
  }
}

async function testHttpEndpoint(url, description) {
  return new Promise((resolve) => {
    const request = https.get(url, (res) => {
      if (res.statusCode === 200) {
        checkPassed(`${description} accessible`, `Status: ${res.statusCode}`);
        resolve(true);
      } else {
        checkWarning(`${description} returned ${res.statusCode}`, url);
        resolve(false);
      }
    });

    request.on('error', (error) => {
      checkWarning(`${description} not accessible`, error.message);
      resolve(false);
    });

    request.setTimeout(5000, () => {
      request.destroy();
      checkWarning(`${description} timeout`, 'Request timed out after 5s');
      resolve(false);
    });
  });
}

async function runVerification() {
  console.log('📋 1. File Structure Verification');
  console.log('----------------------------------');

  // Check critical files
  const criticalFiles = [
    ['.env', 'Backend environment file'],
    ['frontend/.env', 'Frontend environment file'],
    ['package.json', 'Backend package.json'],
    ['frontend/package.json', 'Frontend package.json'],
    ['backend/src/index.ts', 'Backend entry point'],
    ['frontend/src/app/page.tsx', 'Frontend entry point']
  ];

  criticalFiles.forEach(([file, desc]) => {
    checkFileExists(file, desc);
  });

  console.log('\n🔐 2. Environment Variables');
  console.log('----------------------------');

  // Check required environment variables
  const requiredEnvVars = [
    ['DESCOPE_PROJECT_ID', 'Descope Project ID'],
    ['DESCOPE_MANAGEMENT_KEY', 'Descope Management Key'],
    ['NEXT_PUBLIC_DESCOPE_PROJECT_ID', 'Frontend Descope Project ID']
  ];

  requiredEnvVars.forEach(([envVar, desc]) => {
    if (process.env[envVar]) {
      checkPassed(`${desc} configured`, `${envVar}=${process.env[envVar].substring(0, 20)}...`);
    } else {
      checkFailed(`${desc} missing`, `${envVar} not found in .env`);
    }
  });

  // Check optional environment variables
  const optionalEnvVars = [
    ['GOOGLE_CALENDAR_CLIENT_ID', 'Google Calendar integration'],
    ['SLACK_CLIENT_ID', 'Slack integration'],
    ['TWILIO_ACCOUNT_SID', 'Twilio SMS integration']
  ];

  optionalEnvVars.forEach(([envVar, desc]) => {
    if (process.env[envVar] && !process.env[envVar].startsWith('your_')) {
      checkPassed(`${desc} configured`, 'Ready for use');
    } else {
      checkWarning(`${desc} not configured`, 'Will use demo mode');
    }
  });

  console.log('\n📦 3. Dependencies Check');
  console.log('-------------------------');

  // Check if node_modules exist
  if (fs.existsSync('node_modules')) {
    checkPassed('Backend dependencies installed');
  } else {
    checkFailed('Backend dependencies missing', 'Run: npm install');
  }

  if (fs.existsSync('frontend/node_modules')) {
    checkPassed('Frontend dependencies installed');
  } else {
    checkFailed('Frontend dependencies missing', 'Run: cd frontend && npm install');
  }

  console.log('\n🌐 4. External Services Check');
  console.log('------------------------------');

  // Test Descope API
  if (process.env.DESCOPE_PROJECT_ID && process.env.DESCOPE_MANAGEMENT_KEY) {
    try {
      await testHttpEndpoint('https://api.descope.com/v1/mgmt/project', 'Descope API');
    } catch (error) {
      checkWarning('Descope API test failed', error.message);
    }
  } else {
    checkWarning('Descope API test skipped', 'Missing credentials');
  }

  // Test Google Calendar API (if configured)
  if (process.env.GOOGLE_CALENDAR_CLIENT_ID && !process.env.GOOGLE_CALENDAR_CLIENT_ID.startsWith('your_')) {
    await testHttpEndpoint('https://www.googleapis.com/calendar/v3/calendars/primary', 'Google Calendar API');
  } else {
    checkWarning('Google Calendar API test skipped', 'Not configured');
  }

  // Test Slack API (if configured)
  if (process.env.SLACK_CLIENT_ID && !process.env.SLACK_CLIENT_ID.startsWith('your_')) {
    await testHttpEndpoint('https://slack.com/api/auth.test', 'Slack API');
  } else {
    checkWarning('Slack API test skipped', 'Not configured');
  }

  console.log('\n🏗️  5. Build Verification');
  console.log('-------------------------');

  // Test TypeScript compilation
  try {
    execSync('npx tsc --noEmit', { cwd: 'backend', stdio: 'pipe' });
    checkPassed('Backend TypeScript compilation');
  } catch (error) {
    checkFailed('Backend TypeScript compilation failed', 'Check for syntax errors');
  }

  try {
    execSync('npx tsc --noEmit', { cwd: 'frontend', stdio: 'pipe' });
    checkPassed('Frontend TypeScript compilation');
  } catch (error) {
    checkFailed('Frontend TypeScript compilation failed', 'Check for syntax errors');
  }

  console.log('\n🎯 6. Demo Mode Verification');
  console.log('----------------------------');

  if (process.env.DEMO_MODE === 'true') {
    checkPassed('Demo mode enabled', 'System will work without external services');
  } else {
    checkWarning('Demo mode disabled', 'External services must be properly configured');
  }

  console.log('\n📊 7. Summary');
  console.log('-------------');

  const passed = allChecks.filter(c => c.status === 'passed').length;
  const warned = allChecks.filter(c => c.status === 'warning').length;
  const failed = allChecks.filter(c => c.status === 'failed').length;

  console.log(`Total Checks: ${allChecks.length}`);
  console.log(`✅ Passed: ${passed}`);
  console.log(`⚠️  Warnings: ${warned}`);
  console.log(`❌ Failed: ${failed}`);

  if (failed === 0) {
    console.log('\n🎉 Setup Verification Complete!');
    console.log('Your CrisisAssist system is ready to run.');
    
    console.log('\n🚀 Next Steps:');
    console.log('1. Start backend: npm run dev');
    console.log('2. Start frontend: cd frontend && npm run dev');
    console.log('3. Visit: http://localhost:3000');
    
    if (warned > 0) {
      console.log('\n💡 Optional Improvements:');
      warnings.forEach(warning => {
        console.log(`   • ${warning.name}: ${warning.details}`);
      });
    }
  } else {
    console.log('\n⚠️  Critical Issues Found:');
    criticalIssues.forEach(issue => {
      console.log(`   • ${issue.name}: ${issue.details}`);
    });
    
    console.log('\n🔧 Fix these issues before running the application.');
  }

  console.log('\n📚 Documentation:');
  console.log('• Setup Guide: DESCOPE_SETUP_FINAL.md');
  console.log('• External Services: EXTERNAL_SERVICES_SIMPLE.md');
  console.log('• Frontend Guide: FRONTEND_USAGE_GUIDE.md');

  console.log('\n🏆 Hackathon Ready Checklist:');
  console.log('□ Descope authentication working');
  console.log('□ Frontend dashboard accessible');
  console.log('□ Multi-agent simulator functional');
  console.log('□ At least one external service (Slack recommended)');
  console.log('□ Audit logs showing token validation');
  
  return failed === 0;
}

// Run verification
runVerification().then(success => {
  process.exit(success ? 0 : 1);
}).catch(error => {
  console.error('❌ Verification failed:', error);
  process.exit(1);
});