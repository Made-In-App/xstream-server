/**
 * Script per testare le chiamate API al server Xtream originale
 * e vedere il formato esatto delle risposte
 */

const http = require('http');
const https = require('https');

const XTREAM_URL = 'http://fn2ilpirata.rearc.xn--t60b56a';
const USERNAME = 'Emmgen2';
const PASSWORD = 'gJWB28F';

function makeRequest(url, callback) {
  const isHttps = url.startsWith('https');
  const client = isHttps ? https : http;
  
  const options = {
    headers: {
      'User-Agent': 'VLC/3.0.0',
    },
  };

  client.get(url, options, (res) => {
    let data = '';
    res.on('data', (chunk) => {
      data += chunk.toString();
    });
    res.on('end', () => {
      callback(null, data, res.statusCode);
    });
  }).on('error', (error) => {
    callback(error, null, null);
  });
}

console.log('=== Testing Xtream API Responses ===\n');

// Test 1: get_user_info
console.log('1. Testing: get_user_info');
const url1 = `${XTREAM_URL}/player_api.php?username=${USERNAME}&password=${PASSWORD}&action=get_user_info`;
makeRequest(url1, (err, data, status) => {
  if (err) {
    console.error('Error:', err.message);
  } else {
    console.log('Status:', status);
    console.log('Response:');
    try {
      const json = JSON.parse(data);
      console.log(JSON.stringify(json, null, 2));
    } catch (e) {
      console.log(data.substring(0, 500));
    }
  }
  
  // Test 2: senza action
  console.log('\n2. Testing: player_api.php senza action');
  const url2 = `${XTREAM_URL}/player_api.php?username=${USERNAME}&password=${PASSWORD}`;
  makeRequest(url2, (err, data, status) => {
    if (err) {
      console.error('Error:', err.message);
    } else {
      console.log('Status:', status);
      console.log('Response:');
      try {
        const json = JSON.parse(data);
        console.log(JSON.stringify(json, null, 2));
      } catch (e) {
        console.log(data.substring(0, 500));
      }
    }
    
    // Test 3: get_live_categories
    console.log('\n3. Testing: get_live_categories');
    const url3 = `${XTREAM_URL}/player_api.php?username=${USERNAME}&password=${PASSWORD}&action=get_live_categories`;
    makeRequest(url3, (err, data, status) => {
      if (err) {
        console.error('Error:', err.message);
      } else {
        console.log('Status:', status);
        console.log('Response (first 500 chars):');
        try {
          const json = JSON.parse(data);
          console.log(JSON.stringify(json.slice(0, 3), null, 2), '... (showing first 3 items)');
        } catch (e) {
          console.log(data.substring(0, 500));
        }
      }
      
      // Test 4: get_live_streams (primi elementi)
      console.log('\n4. Testing: get_live_streams (first item only)');
      const url4 = `${XTREAM_URL}/player_api.php?username=${USERNAME}&password=${PASSWORD}&action=get_live_streams`;
      makeRequest(url4, (err, data, status) => {
        if (err) {
          console.error('Error:', err.message);
        } else {
          console.log('Status:', status);
          console.log('Response (first item):');
          try {
            const json = JSON.parse(data);
            if (Array.isArray(json) && json.length > 0) {
              console.log(JSON.stringify(json[0], null, 2));
            } else {
              console.log(JSON.stringify(json, null, 2));
            }
          } catch (e) {
            console.log(data.substring(0, 500));
          }
        }
        
        console.log('\n=== Tests Complete ===');
        process.exit(0);
      });
    });
  });
});

