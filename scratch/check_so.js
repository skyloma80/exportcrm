const fetch = require('node-fetch');

async function checkPB() {
    const baseUrl = 'http://localhost:8091/api/collections/so';
    try {
        const response = await fetch(baseUrl);
        const data = await response.json();
        console.log('Collection Info:', JSON.stringify(data, null, 2));
        
        const listResponse = await fetch(`${baseUrl}/records?page=1&perPage=1`);
        console.log('List Response Status:', listResponse.status);
        const listData = await listResponse.json();
        console.log('List Data:', JSON.stringify(listData, null, 2));
    } catch (e) {
        console.error('Error:', e.message);
    }
}

checkPB();
