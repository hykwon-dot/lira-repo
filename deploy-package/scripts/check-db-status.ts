#!/usr/bin/env tsx

async function checkDBStatus() {
  console.log('🔍 Checking database connection status...\n');
  
  try {
    const response = await fetch('https://lira365.com/api/health/deployment');
    const data = await response.json();
    
    console.log('📊 Health Check Results:');
    console.log('Status:', data.status);
    console.log('Response Time:', data.elapsedMs + 'ms');
    console.log('\n🌍 Environment:');
    console.log('Node ENV:', data.environment?.nodeEnv);
    console.log('DB URL Configured:', data.environment?.databaseUrlConfigured);
    console.log('DB Host:', data.environment?.databaseHost);
    console.log('DB Name:', data.environment?.databaseName);
    
    if (data.checks?.database) {
      console.log('\n💾 Database:');
      console.log('Reachable:', data.checks.database.reachable);
      if (data.checks.database.reachable) {
        console.log('Version:', data.checks.database.version);
        console.log('Investigation Requests:', data.checks.database.investigationRequests);
        console.log('Investigator Profiles:', data.checks.database.investigatorProfiles);
      } else {
        console.log('❌ Error:', data.checks.database.error);
        if (data.checks.database.stack) {
          console.log('Stack:', data.checks.database.stack);
        }
      }
    }
    
    if (data.checks?.environment) {
      console.log('\n⚙️ Environment Check:');
      console.log('Valid:', data.checks.environment.valid);
      if (!data.checks.environment.valid) {
        console.log('❌ Error:', data.checks.environment.error);
      }
    }
    
  } catch (error) {
    console.error('❌ Failed to check status:', error);
  }
}

checkDBStatus();

export {};