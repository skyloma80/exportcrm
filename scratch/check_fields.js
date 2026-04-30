async function check() {
    try {
        const response = await fetch('http://localhost:8091/api/collections/purchase_order_items');
        console.log('PO Items status:', response.status);
        const data = await response.json();
        console.log('PO Items fields:', data.fields?.map(f => f.name));
        if (!data.fields) console.log('Full data:', JSON.stringify(data));
        
        const response2 = await fetch('http://localhost:8091/api/collections/order_items');
        console.log('Order Items status:', response2.status);
        const data2 = await response2.json();
        console.log('Order Items fields:', data2.fields?.map(f => f.name));
    } catch (error) {
        console.error('Error fetching collections:', error.message);
    }
}

check();
