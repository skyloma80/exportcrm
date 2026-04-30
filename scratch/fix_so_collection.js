const PocketBase = require('pocketbase/cjs');

async function fixSoCollection() {
  const pb = new PocketBase('http://127.0.0.1:8091');

  try {
    // 1. 登录管理员
    await pb.admins.authWithPassword('admin@example.com', 'admin123456');
    console.log('Authenticated as admin');

    // 2. 检查 so 集合是否存在
    try {
      await pb.collections.getOne('so');
      console.log('Collection "so" already exists. No action needed.');
      return;
    } catch (e) {
      console.log('Collection "so" missing, creating now...');
    }

    // 3. 创建 so 集合
    const collection = {
      name: 'so',
      type: 'base',
      system: false,
      schema: [
        { name: 'code', type: 'text', required: true },
        { name: 'customer_id', type: 'text' },
        { name: 'customer_name', type: 'text', required: true },
        { name: 'customer_address', type: 'text' },
        { name: 'customer_tax_id', type: 'text' },
        { name: 'customer_po', type: 'text' },
        { name: 'vendor_code', type: 'text' },
        { name: 'currency', type: 'text', required: true },
        { name: 'incoterm', type: 'text' },
        { name: 'port_of_loading', type: 'text' },
        { name: 'port_of_destination', type: 'text' },
        { name: 'payment_terms', type: 'text' },
        { name: 'bank_info', type: 'text' },
        { name: 'country_of_origin', type: 'text' },
        { name: 'country_of_destination', type: 'text' },
        { name: 'mode_of_shipment', type: 'text' },
        { name: 'shipping_marks', type: 'text' },
        { name: 'expected_delivery_date', type: 'date' },
        { name: 'estimated_shipping_date', type: 'date' },
        { name: 'remarks', type: 'text' },
        { name: 'total_amount', type: 'number' },
        { 
          name: 'status', 
          type: 'select', 
          options: { 
            values: ['draft', 'confirmed', 'in_production', 'shipped', 'completed', 'cancelled'] 
          } 
        },
        { name: 'items', type: 'json' }
      ],
      listRule: '',
      viewRule: '',
      createRule: '',
      updateRule: '',
      deleteRule: ''
    };

    await pb.collections.create(collection);
    console.log('SUCCESS: Collection "so" created successfully!');

  } catch (error) {
    console.error('FAILED to fix collection:', error.message);
    if (error.data) console.error('Error details:', JSON.stringify(error.data));
  }
}

fixSoCollection();
