/**
 * Script per testare le chiamate API al server Xtream originale
 * e vedere il formato esatto delle risposte
 */

import * as http from 'http';
import * as https from 'https';

const XTREAM_URL = 'http://fn2ilpirata.rearc.xn--t60b56a';
const USERNAME = 'Emmgen2';
const PASSWORD = 'gJWB28F';

function makeRequest(url: string): Promise<{ status: number; data: string }> {
  return new Promise((resolve, reject) => {
    const isHttps = url.startsWith('https');
    const client = isHttps ? https : http;
    
    const options = {
      headers: {
        'User-Agent': 'VLC/3.0.0',
      },
    };

    const req = client.get(url, options, (res) => {
      let data = '';
      res.on('data', (chunk) => {
        data += chunk.toString();
      });
      res.on('end', () => {
        resolve({ status: res.statusCode || 0, data });
      });
    });

    req.on('error', (error) => {
      reject(error);
    });

    req.setTimeout(30000, () => {
      req.destroy();
      reject(new Error('Request timeout'));
    });
  });
}

async function testAPI() {
  console.log('=== Testing Xtream API Responses ===\n');

  try {
    // Test 1: get_user_info
    console.log('1. Testing: get_user_info');
    const url1 = `${XTREAM_URL}/player_api.php?username=${USERNAME}&password=${PASSWORD}&action=get_user_info`;
    const result1 = await makeRequest(url1);
    console.log('Status:', result1.status);
    console.log('Response:');
    try {
      const json = JSON.parse(result1.data);
      console.log(JSON.stringify(json, null, 2));
    } catch (e) {
      console.log(result1.data.substring(0, 500));
    }

    // Test 2: senza action
    console.log('\n2. Testing: player_api.php senza action');
    const url2 = `${XTREAM_URL}/player_api.php?username=${USERNAME}&password=${PASSWORD}`;
    const result2 = await makeRequest(url2);
    console.log('Status:', result2.status);
    console.log('Response:');
    try {
      const json = JSON.parse(result2.data);
      console.log(JSON.stringify(json, null, 2));
    } catch (e) {
      console.log(result2.data.substring(0, 500));
    }

    // Test 3: get_live_categories (primi 3)
    console.log('\n3. Testing: get_live_categories');
    const url3 = `${XTREAM_URL}/player_api.php?username=${USERNAME}&password=${PASSWORD}&action=get_live_categories`;
    const result3 = await makeRequest(url3);
    console.log('Status:', result3.status);
    console.log('Response (first 3 items):');
    try {
      const json = JSON.parse(result3.data);
      if (Array.isArray(json)) {
        console.log(JSON.stringify(json.slice(0, 3), null, 2), '... (showing first 3 items)');
      } else {
        console.log(JSON.stringify(json, null, 2));
      }
    } catch (e) {
      console.log(result3.data.substring(0, 500));
    }

    // Test 4: get_live_streams (primo elemento)
    console.log('\n4. Testing: get_live_streams (first item only)');
    const url4 = `${XTREAM_URL}/player_api.php?username=${USERNAME}&password=${PASSWORD}&action=get_live_streams`;
    const result4 = await makeRequest(url4);
    console.log('Status:', result4.status);
    console.log('Response (first item):');
    try {
      const json = JSON.parse(result4.data);
      if (Array.isArray(json) && json.length > 0) {
        console.log(JSON.stringify(json[0], null, 2));
      } else {
        console.log(JSON.stringify(json, null, 2));
      }
    } catch (e) {
      console.log(result4.data.substring(0, 500));
    }

    console.log('\n=== Tests Complete ===');
  } catch (error) {
    console.error('Error:', error);
  }
}

testAPI();

