#!/usr/bin/env tsx

const DEPLOYMENT_URL = 'https://lira365.com';

async function checkDeployment() {
  console.log('🚀 Checking deployment status...\n');
  
  try {
    // 1. Health check
    console.log('1️⃣ Testing health endpoint...');
    const healthResponse = await fetch(`${DEPLOYMENT_URL}/api/health/deployment`);
    const healthData = await healthResponse.json();
    
    if (healthResponse.ok) {
      console.log('✅ Health check passed');
      console.log(`   Database: ${healthData.checks.database.version}`);
      console.log(`   Environment: ${healthData.environment.nodeEnv}`);
      console.log(`   Response time: ${healthData.elapsedMs}ms\n`);
    } else {
      console.log('❌ Health check failed');
      console.log(`   Error: ${healthData.checks?.database?.error || 'Unknown error'}\n`);
      return false;
    }

    // 2. API endpoints test
    console.log('2️⃣ Testing API endpoints...');
    
    const endpoints = [
      '/api/scenarios',
      '/api/health/db'
    ];
    
    for (const endpoint of endpoints) {
      try {
        const response = await fetch(`${DEPLOYMENT_URL}${endpoint}`);
        console.log(`   ${endpoint}: ${response.status === 200 ? '✅' : '❌'} (${response.status})`);
      } catch (error) {
        console.log(`   ${endpoint}: ❌ (Network error)`);
      }
    }
    
    console.log('\n3️⃣ Testing main page...');
    const mainResponse = await fetch(DEPLOYMENT_URL);
    console.log(`   Main page: ${mainResponse.ok ? '✅' : '❌'} (${mainResponse.status})`);
    
    return true;
    
  } catch (error) {
    console.error('❌ Deployment check failed:', error);
    return false;
  }
}

checkDeployment().then(success => {
  process.exit(success ? 0 : 1);
});

export {};