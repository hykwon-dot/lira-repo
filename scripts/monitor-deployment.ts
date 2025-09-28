#!/usr/bin/env tsx

const SITE_URL = 'https://lira365.com';

async function monitorDeployment() {
  console.log('🔄 Monitoring deployment status...\n');
  
  let attempts = 0;
  const maxAttempts = 20;
  
  while (attempts < maxAttempts) {
    attempts++;
    console.log(`Attempt ${attempts}/${maxAttempts}:`);
    
    try {
      // Test main page
      const mainResponse = await fetch(SITE_URL);
      console.log(`  Main page: ${mainResponse.status}`);
      
      // Test investigators page
      const investigatorsResponse = await fetch(`${SITE_URL}/investigators`);
      console.log(`  Investigators: ${investigatorsResponse.status}`);
      
      // Test health endpoint
      const healthResponse = await fetch(`${SITE_URL}/api/health/deployment`);
      console.log(`  Health API: ${healthResponse.status}`);
      
      if (investigatorsResponse.status === 200) {
        console.log('\n✅ Deployment successful! All pages are working.');
        break;
      } else if (investigatorsResponse.status === 500) {
        console.log('  ⚠️  Still showing 500 error, deployment may be in progress...');
      }
      
    } catch (error) {
      console.log(`  ❌ Network error: ${error}`);
    }
    
    if (attempts < maxAttempts) {
      console.log('  Waiting 30 seconds...\n');
      await new Promise(resolve => setTimeout(resolve, 30000));
    }
  }
  
  if (attempts >= maxAttempts) {
    console.log('❌ Deployment monitoring timed out. Check AWS Amplify console.');
  }
}

monitorDeployment();