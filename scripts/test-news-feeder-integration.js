// Test script to verify News Feeder integration
import { newsFeederService } from '../server/utils/newsFeeder.js';

async function testIntegration() {
  console.log('🧪 Testing News Feeder Integration...');
  
  try {
    // Test manual update
    console.log('1. Testing manual update...');
    const result = await newsFeederService.manualUpdate();
    console.log('Result:', result);
    
    // Test config access
    console.log('2. Testing config access...');
    const config = newsFeederService.config;
    console.log('Config:', config);
    
    console.log('✅ Integration test completed successfully!');
  } catch (error) {
    console.error('❌ Integration test failed:', error);
  }
}

testIntegration();
