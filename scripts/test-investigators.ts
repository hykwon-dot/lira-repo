#!/usr/bin/env tsx

const INVESTIGATORS_TEST_URL = 'https://lira365.com';

async function testInvestigatorsPage() {
  console.log('🔍 Testing /investigators page...\n');
  
  try {
    const response = await fetch(`${INVESTIGATORS_TEST_URL}/investigators`);
    
    console.log(`Status: ${response.status} ${response.statusText}`);
    
    if (response.ok) {
      const html = await response.text();
      console.log('✅ Page loaded successfully');
      console.log(`   Content length: ${html.length} characters`);
      
      // Check for key content
      if (html.includes('신뢰할 수 있는 민간조사 네트워크')) {
        console.log('✅ Page title found');
      } else {
        console.log('⚠️  Page title not found - possible rendering issue');
      }
      
      if (html.includes('등록 탐정')) {
        console.log('✅ Statistics section found');
      } else {
        console.log('⚠️  Statistics section not found');
      }
      
    } else {
      console.log('❌ Page failed to load');
      const errorText = await response.text();
      console.log(`   Error: ${errorText.substring(0, 200)}...`);
    }
    
  } catch (error) {
    console.error('❌ Network error:', error);
  }
}

testInvestigatorsPage();