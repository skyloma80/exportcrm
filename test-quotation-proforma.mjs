/**
 * Test script for Quotation Proforma PDF Template
 * 测试报价单形式发票PDF模板
 */

import React from 'react';
import { renderToFile } from '@react-pdf/renderer';
import { QuotationProformaPDF, prepareQuotationProformaPdfData } from './lib/pdf';

// Mock data for testing
const mockQuotationData = {
  code: 'QTN-2026-001',
  created: '2026-02-09T10:00:00Z',
  valid_until: '2026-03-09T10:00:00Z',
  currency: 'USD',
  incoterm: 'FOB',
  delivery_port: 'Shanghai Port',
  payment_terms: 'T/T',
  total_amount: 15000.00,
  remarks: 'Special packaging required for fragile items.',
  delivery_time: '2026-03-15T00:00:00Z',
  
  // Conditional fields - some present, some absent to test conditional display
  port_of_loading: 'Ningbo Port',
  mode_of_shipment: 'Sea',
  country_of_origin: 'CN',
  country_of_destination: 'US',
  customer_po: 'PO-CUST-2026-001',
  vendor_code: 'VEND-001',
  bank_info: 'Bank: ABC Bank\nAccount: 123456789\nSWIFT: ABCBCNBJ',
};

const mockCustomerData = {
  name: 'Global Trading Co., Ltd.',
  address: '123 Business Street, New York, NY 10001, USA',
  tax_id: '12-3456789',
  contact_person: 'John Smith',
  email: 'john.smith@globaltrading.com',
  country: 'US',
};

const mockItemsData = [
  {
    product_code: 'PROD-001',
    quantity: 500,
    unit: 'PCS',
    unit_price: 20.00,
    amount: 10000.00,
    expand: {
      product: {
        part_number: 'PART-001',
        name: 'High Quality Widget A',
        description: 'Premium quality widget with extended warranty',
        unit: 'PCS',
        pcs_per_carton: 50,
        carton_dimensions: {
          length: 60,
          width: 40,
          height: 30,
        },
        carton_gross_weight: 15,
      }
    }
  },
  {
    product_code: 'PROD-002',
    quantity: 250,
    unit: 'PCS',
    unit_price: 20.00,
    amount: 5000.00,
    expand: {
      product: {
        part_number: 'PART-002',
        name: 'Standard Widget B',
        description: 'Standard widget with basic features',
        unit: 'PCS',
        pcs_per_carton: 25,
        carton_dimensions: {
          length: 50,
          width: 30,
          height: 25,
        },
        carton_gross_weight: 10,
      }
    }
  }
];

const mockBrandingData = {
  primaryOffice: {
    name: 'ABC Export Company',
    address: 'No. 128, Industry Road, Shanghai, China',
    phone: '+86-21-12345678',
    email: 'info@abcexport.com',
  },
  secondaryOffice: {
    name: 'ABC Europe Branch',
    address: 'Calle Comercio, 12, Madrid, Spain',
    phone: '+34-91-1234567',
    email: 'europe@abcexport.com',
  },
  vat: 'CN123456789',
  websiteUrl: 'www.abcexport.com',
  logoBase64: '', // Will be ignored in this test
  stampBase64: '', // Will be ignored in this test
  signatureBase64: '', // Will be ignored in this test
  signer: {
    name: 'Li Wei',
    title: 'Export Manager',
  }
};

async function testPdfGeneration() {
  console.log('Testing Quotation Proforma PDF generation...');
  
  try {
    // Prepare PDF data using the new function
    const pdfData = prepareQuotationProformaPdfData({
      quotation: mockQuotationData,
      customer: mockCustomerData,
      project: {
        name: 'Annual Supply Contract',
        code: 'PROJECT-2026-A'
      },
      items: mockItemsData,
      branding: mockBrandingData,
    });
    
    console.log('PDF data prepared successfully');
    console.log('Sample of prepared data:', {
      code: pdfData.code,
      total_amount: pdfData.total_amount,
      customer_name: pdfData.customer?.name,
      items_count: pdfData.items.length,
      has_bank_info: !!pdfData.bank_info,
      has_customer_po: !!pdfData.customer_po,
      has_vendor_code: !!pdfData.vendor_code,
      has_port_of_loading: !!pdfData.port_of_loading,
      has_mode_of_shipment: !!pdfData.mode_of_shipment,
      has_country_of_origin: !!pdfData.country_of_origin,
      has_country_of_destination: !!pdfData.country_of_destination,
      has_delivery_time: !!pdfData.delivery_time,
      has_remarks: !!pdfData.remarks,
    });
    
    // Generate PDF
    const outputPath = './test-quotation-proforma.pdf';
    await renderToFile(<QuotationProformaPDF data={pdfData} />, outputPath);
    
    console.log(`PDF generated successfully: ${outputPath}`);
    console.log('Test completed successfully!');
  } catch (error) {
    console.error('Error during PDF generation:', error);
  }
}

// Run the test
testPdfGeneration();