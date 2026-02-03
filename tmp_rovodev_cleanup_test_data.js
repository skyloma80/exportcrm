/**
 * 清理测试数据脚本
 * 删除指定的测试客户和供应商及其相关数据
 */

const PocketBase = require('pocketbase/cjs');

// 配置
const PB_URL = process.env.PB_URL || 'http://127.0.0.1:8090';
const ADMIN_EMAIL = process.env.ADMIN_EMAIL || 'admin@example.com';
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'admin123456';

// 要删除的测试数据
const TEST_CUSTOMERS = ['CUS-2026-0006'];
const TEST_SUPPLIERS = ['SUP-2026-0002', 'SUP-2026-0005'];

async function cleanup() {
  const pb = new PocketBase(PB_URL);

  try {
    // 登录管理员账号
    console.log('正在登录管理员账号...');
    await pb.admins.authWithPassword(ADMIN_EMAIL, ADMIN_PASSWORD);
    console.log('✅ 登录成功\n');

    // 删除测试客户及相关数据
    console.log('========== 删除测试客户 ==========');
    for (const customerCode of TEST_CUSTOMERS) {
      console.log(`\n处理客户: ${customerCode}`);
      
      try {
        // 查找客户
        const customers = await pb.collection('customers').getFullList({
          filter: `code = "${customerCode}"`,
        });

        if (customers.length === 0) {
          console.log(`  ⚠️  未找到客户 ${customerCode}`);
          continue;
        }

        const customer = customers[0];
        const customerId = customer.id;
        console.log(`  找到客户: ${customer.name} (ID: ${customerId})`);

        // 1. 删除客户联系人
        const contacts = await pb.collection('customer_contacts').getFullList({
          filter: `customer = "${customerId}"`,
        });
        console.log(`  - 找到 ${contacts.length} 个联系人`);
        for (const contact of contacts) {
          await pb.collection('customer_contacts').delete(contact.id);
          console.log(`    ✓ 删除联系人: ${contact.name}`);
        }

        // 2. 删除相关项目
        const projects = await pb.collection('projects').getFullList({
          filter: `customer = "${customerId}"`,
        });
        console.log(`  - 找到 ${projects.length} 个项目`);
        for (const project of projects) {
          // 先删除项目成本表
          const costTables = await pb.collection('project_cost_tables').getFullList({
            filter: `project = "${project.id}"`,
          });
          for (const costTable of costTables) {
            await pb.collection('project_cost_tables').delete(costTable.id);
          }
          
          await pb.collection('projects').delete(project.id);
          console.log(`    ✓ 删除项目: ${project.code}`);
        }

        // 3. 删除相关 RFQ
        const rfqs = await pb.collection('rfqs').getFullList({
          filter: `customer = "${customerId}"`,
        });
        console.log(`  - 找到 ${rfqs.length} 个 RFQ`);
        for (const rfq of rfqs) {
          await pb.collection('rfqs').delete(rfq.id);
          console.log(`    ✓ 删除 RFQ: ${rfq.code}`);
        }

        // 4. 删除相关报价单
        const quotations = await pb.collection('quotations').getFullList({
          filter: `customer = "${customerId}"`,
        });
        console.log(`  - 找到 ${quotations.length} 个报价单`);
        for (const quotation of quotations) {
          await pb.collection('quotations').delete(quotation.id);
          console.log(`    ✓ 删除报价单: ${quotation.code}`);
        }

        // 5. 删除相关订单
        const orders = await pb.collection('orders').getFullList({
          filter: `customer = "${customerId}"`,
        });
        console.log(`  - 找到 ${orders.length} 个订单`);
        for (const order of orders) {
          await pb.collection('orders').delete(order.id);
          console.log(`    ✓ 删除订单: ${order.code}`);
        }

        // 6. 删除相关发票
        const invoices = await pb.collection('invoices').getFullList({
          filter: `customer = "${customerId}"`,
        });
        console.log(`  - 找到 ${invoices.length} 个发票`);
        for (const invoice of invoices) {
          await pb.collection('invoices').delete(invoice.id);
          console.log(`    ✓ 删除发票: ${invoice.code}`);
        }

        // 7. 删除相关运输单
        const shipments = await pb.collection('shipments').getFullList({
          filter: `customer = "${customerId}"`,
        });
        console.log(`  - 找到 ${shipments.length} 个运输单`);
        for (const shipment of shipments) {
          await pb.collection('shipments').delete(shipment.id);
          console.log(`    ✓ 删除运输单: ${shipment.code}`);
        }

        // 8. 删除客户本身
        await pb.collection('customers').delete(customerId);
        console.log(`  ✅ 删除客户: ${customerCode}\n`);

      } catch (error) {
        console.error(`  ❌ 删除客户 ${customerCode} 时出错:`, error.message);
      }
    }

    // 删除测试供应商及相关数据
    console.log('\n========== 删除测试供应商 ==========');
    for (const supplierCode of TEST_SUPPLIERS) {
      console.log(`\n处理供应商: ${supplierCode}`);
      
      try {
        // 查找供应商
        const suppliers = await pb.collection('suppliers').getFullList({
          filter: `code = "${supplierCode}"`,
        });

        if (suppliers.length === 0) {
          console.log(`  ⚠️  未找到供应商 ${supplierCode}`);
          continue;
        }

        const supplier = suppliers[0];
        const supplierId = supplier.id;
        console.log(`  找到供应商: ${supplier.name} (ID: ${supplierId})`);

        // 1. 删除供应商联系人
        const contacts = await pb.collection('supplier_contacts').getFullList({
          filter: `supplier = "${supplierId}"`,
        });
        console.log(`  - 找到 ${contacts.length} 个联系人`);
        for (const contact of contacts) {
          await pb.collection('supplier_contacts').delete(contact.id);
          console.log(`    ✓ 删除联系人: ${contact.name}`);
        }

        // 2. 删除相关采购订单
        const purchaseOrders = await pb.collection('purchase_orders').getFullList({
          filter: `supplier = "${supplierId}"`,
        });
        console.log(`  - 找到 ${purchaseOrders.length} 个采购订单`);
        for (const po of purchaseOrders) {
          // 先删除采购订单付款记录
          const payments = await pb.collection('po_payments').getFullList({
            filter: `purchase_order = "${po.id}"`,
          });
          for (const payment of payments) {
            await pb.collection('po_payments').delete(payment.id);
          }
          
          // 删除采购订单模具项
          const moldItems = await pb.collection('purchase_order_mold_items').getFullList({
            filter: `purchase_order = "${po.id}"`,
          });
          for (const moldItem of moldItems) {
            await pb.collection('purchase_order_mold_items').delete(moldItem.id);
          }
          
          await pb.collection('purchase_orders').delete(po.id);
          console.log(`    ✓ 删除采购订单: ${po.code}`);
        }

        // 3. 删除供应商本身
        await pb.collection('suppliers').delete(supplierId);
        console.log(`  ✅ 删除供应商: ${supplierCode}\n`);

      } catch (error) {
        console.error(`  ❌ 删除供应商 ${supplierCode} 时出错:`, error.message);
      }
    }

    console.log('\n========== 清理完成 ==========');
    console.log('✅ 所有测试数据已删除');

  } catch (error) {
    console.error('❌ 清理过程出错:', error);
    process.exit(1);
  }
}

// 运行清理
cleanup().catch(console.error);
