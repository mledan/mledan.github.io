#!/usr/bin/env node

const https = require('https');

// Test if the CDN URL is accessible
const cdnUrl = 'https://cdn.jsdelivr.net/npm/@azure/web-pubsub-client@1.0.2/dist/web-pubsub-client.js';

console.log('Testing CDN accessibility...');
console.log(`URL: ${cdnUrl}\n`);

https.get(cdnUrl, (res) => {
    console.log(`Status Code: ${res.statusCode}`);
    console.log(`Status Message: ${res.statusMessage}`);
    console.log(`Content-Type: ${res.headers['content-type']}`);
    console.log(`Content-Length: ${res.headers['content-length']} bytes`);
    
    if (res.statusCode === 200) {
        console.log('\n✅ CDN is accessible!');
        
        // Read first 500 characters to verify it's JavaScript
        let data = '';
        let charsRead = 0;
        
        res.on('data', (chunk) => {
            if (charsRead < 500) {
                data += chunk.toString();
                charsRead += chunk.length;
            }
        });
        
        res.on('end', () => {
            console.log('\nFirst 500 characters of the script:');
            console.log('-----------------------------------');
            console.log(data.substring(0, 500));
            console.log('...\n');
            
            // Check if it contains expected patterns
            if (data.includes('azure') && data.includes('webPubSub')) {
                console.log('✅ Script contains expected Azure WebPubSub code');
            } else {
                console.log('⚠️  Script content doesn\'t match expected patterns');
            }
        });
    } else {
        console.log('\n❌ CDN returned an error');
    }
}).on('error', (err) => {
    console.error('❌ Error accessing CDN:', err.message);
});