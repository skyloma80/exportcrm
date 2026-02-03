/**
 * Commercial Invoice PDF Template (English)
 * 商业发票 PDF 模板（英文）
 * 
 * Requirements: 3.2, 3.3, 3.4, 3.5
 */

import React from 'react';
import { Document, Page, Text, View, Image, StyleSheet } from '@react-pdf/renderer';
import { defaultFontFamily } from './fonts';
import { DocumentBranding } from '@/lib/branding/types';

const styles = StyleSheet.create({
  page: {
    fontFamily: defaultFontFamily,
    fontSize: 10,
    padding: 40,
    backgroundColor: '#ffffff',
    color: '#000000',
  },
  headerSection: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 30,
    paddingBottom: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  logoSection: {
    flexDirection: 'column',
    alignItems: 'flex-start',
    width: '50%',
  },
  logo: {
    width: 150,
    maxHeight: 40,
    objectFit: 'contain',
    marginTop: 8,
  },
  companyName: {
    fontSize: 10,
    color: '#000000',
    marginTop: 10,
  },
  websiteUrl: {
    fontSize: 11,
    color: '#f97316',
    marginTop: 10,
  },
  titleSection: {
    textAlign: 'left',
    width: '50%',
    paddingLeft: 30,
  },
  title: {
    fontSize: 18,
    fontWeight: 'normal',
    color: '#000000',
    letterSpacing: 2,
    marginBottom: 10,
  },
  documentCode: {
    fontSize: 10,
    fontWeight: 'bold',
    color: '#000000',
  },
  documentDate: {
    fontSize: 10,
    fontWeight: 'bold',
    color: '#000000',
    marginTop: 2,
  },
  officesSection: {
    flexDirection: 'row',
    marginBottom: 25,
  },
  officeBox: {
    width: '50%',
  },
  officeBoxRight: {
    width: '50%',
    paddingLeft: 30,
  },
  officeLabel: {
    fontSize: 10,
    color: '#f97316',
    textTransform: 'capitalize',
    letterSpacing: 1,
    marginBottom: 6,
  },
  officeText: {
    fontSize: 9,
    color: '#000000',
    lineHeight: 1.5,
  },
  officeContact: {
    fontSize: 9,
    color: '#000000',
    marginTop: 4,
  },
  infoGrid: {
    flexDirection: 'row',
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: '#e5e7eb',
    paddingVertical: 10,
    marginBottom: 25,
  },
  infoBox: {
    flex: 1,
    paddingHorizontal: 10,
    borderRightWidth: 1,
    borderRightColor: '#e5e7eb',
  },
  infoBoxLast: {
    flex: 1,
    paddingHorizontal: 10,
  },
  infoLabel: {
    fontSize: 7,
    color: '#6b7280',
    textTransform: 'capitalize',
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  infoValue: {
    fontSize: 10,
    color: '#000000',
  },
  infoSubtext: {
    fontSize: 8,
    color: '#000000',
    marginTop: 2,
  },
  table: {
    marginBottom: 30,
  },
  tableHeader: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
    backgroundColor: '#f3f4f6',
  },
  tableRow: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  colNo: { width: '5%', padding: 10 },
  colPartNo: { width: '15%', padding: 10 },
  colProduct: { width: '30%', padding: 10 },
  colQty: { width: '10%', padding: 10, textAlign: 'center' },
  colUnit: { width: '10%', padding: 10, textAlign: 'center' },
  colPrice: { width: '15%', padding: 10, textAlign: 'right' },
  colAmount: { width: '15%', padding: 10, textAlign: 'right' },
  headerCell: {
    fontSize: 8,
    fontWeight: 'bold',
    color: '#6b7280',
    textTransform: 'capitalize',
    letterSpacing: 0.5,
  },
  cell: {
    fontSize: 9,
    color: '#000000',
  },
  totalRow: {
    flexDirection: 'row',
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
    justifyContent: 'flex-end',
  },
  totalLabel: {
    flex: 1,
    padding: 10,
    textAlign: 'right',
    fontSize: 10,
    fontWeight: 'bold',
    color: '#000000',
    textTransform: 'capitalize',
  },
  totalValue: {
    padding: 10,
    textAlign: 'right',
    fontSize: 12,
    fontWeight: 'bold',
    color: '#000000',
    flexShrink: 0,
  },
  bankInfo: {
    marginTop: 10,  // 与上方内容的间距，统一为 10pt
    marginBottom: 0,  // 与签名区域的间距由 footerSection.marginTop 控制
    padding: 15,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 4,
  },
  bankTitle: {
    fontSize: 10,
    fontWeight: 'bold',
    color: '#000000',
    marginBottom: 10,
    textTransform: 'capitalize',
  },
  bankRow: {
    flexDirection: 'row',
    marginBottom: 4,
  },
  bankLabel: {
    width: 120,
    fontSize: 9,
    color: '#000000',
  },
  bankValue: {
    flex: 1,
    fontSize: 9,
    color: '#000000',
  },
  remarks: {
    marginTop: 10,
    marginBottom: 0,
  },
  remarksTitle: {
    fontSize: 10,
    fontWeight: 'bold',
    color: '#000000',
    marginBottom: 8,
  },
  remarksText: {
    fontSize: 9,
    color: '#000000',
    lineHeight: 1.5,
  },
  footerSection: {
    marginTop: 10,  // 与银行信息的间距，减小以节省空间
    paddingTop: 10,  // 减小内边距
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
  },
  signatureRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
  },
  signatureLeft: {
    width: '55%',
  },
  signatureLabel: {
    fontSize: 9,
    color: '#000000',
    marginBottom: 5,
  },
  signatureLine: {
    width: 200,
    height: 30,
    borderBottomWidth: 1,
    borderBottomColor: '#000000',
    borderStyle: 'dashed',
    marginBottom: 10,
  },
  signatureImage: {
    width: 100,
    height: 30,
    objectFit: 'contain',
    marginBottom: 5,
  },
  signerInfoBox: {
    borderTopWidth: 1,
    borderTopColor: '#000000',
    width: 200,
    paddingTop: 10,
  },
  signerName: {
    fontSize: 9,
    color: '#000000',
  },
  signerTitle: {
    fontSize: 9,
    color: '#000000',
    marginTop: 2,
  },
  stampSection: {
    marginLeft: 30,
    alignItems: 'center',
  },
  stampLabel: {
    fontSize: 9,
    color: '#000000',
    marginTop: 5,
    textAlign: 'center',
  },
  stamp: {
    width: 70,
    height: 70,
    objectFit: 'contain',
  },
  stampPlaceholder: {
    width: 70,
    height: 70,
    borderWidth: 2,
    borderColor: '#e5e7eb',
    borderRadius: 35,
    borderStyle: 'dashed',
    backgroundColor: '#f9fafb',
  },
});

export interface CommercialInvoicePDFData {
  code: string;
  issue_date: string;
  currency: string;
  total_amount: number;
  remarks?: string;
  order?: {
    code: string;
    incoterm?: string;
    port_of_loading?: string;
    port_of_destination?: string;
    payment_terms?: string;
  };
  customer?: {
    name: string;
    address?: string;
    tax_id?: string;
    contact_person?: string;
    phone?: string;
    email?: string;
    country?: string;
  };
  project?: {
    name: string;
    code?: string;
  };
  items: Array<{
    part_number?: string;
    product_code?: string;
    product_name?: string;
    quantity: number;
    unit: string;
    unit_price: number;
    amount: number;
  }>;
  bank_info?: {
    bank_name?: string;
    account_name?: string;
    account_number?: string;
    swift_code?: string;
    bank_address?: string;
  };
 
  branding?: DocumentBranding;
}

const formatDate = (date: string) => {
  if (!date) return '-';
  return new Date(date).toLocaleDateString('en-US', {
    month: 'short',
  });
};

const currencySymbols: Record<string, string> = {
  USD: '$',
  EUR: '€',
  GBP: '£',
  CNY: '¥',
  JPY: '¥',
  RMB: '¥',
};

const formatCurrency = (amount: number, currency: string = 'USD') => {
  const symbol = currencySymbols[currency] || currency;
  return `${symbol}${amount.toLocaleString('en-US', { 
    minimumFractionDigits: 2, 
    maximumFractionDigits: 2 
  })}`;
};

const formatCurrencyWithCode = (amount: number, currency: string = 'USD') => {
  return `${currency} ${amount.toLocaleString('en-US', { 
    minimumFractionDigits: 2, 
    maximumFractionDigits: 2 
  })}`;
};


export const CommercialInvoicePDF: React.FC<{ data: CommercialInvoicePDFData }> = ({ data }) => {
  const branding = data.branding;
  const logoSrc = branding?.logoBase64 || branding?.logoPath;
  const stampSrc = branding?.stampBase64 || branding?.stampPath;
  const signatureSrc = branding?.signatureBase64;

  // 西班牙使用 NIF，其他欧盟国家使用 VAT Number
  const euCountries = [
    'AT', 'BE', 'BG', 'HR', 'CY', 'CZ', 'DK', 'EE', 'FI', 'FR',
    'DE', 'GR', 'HU', 'IE', 'IT', 'LV', 'LT', 'LU', 'MT', 'NL',
    'PL', 'PT', 'RO', 'SK', 'SI', 'ES', 'SE'
  ];

  // 判断税号标签
  const isSpain = data.customer?.country === 'ES';
  const isEuCustomer = data.customer?.country && euCountries.includes(data.customer.country);
  const taxLabel = isSpain ? 'NIF' : (isEuCustomer ? 'VAT Number' : 'Tax ID');
  const signatureSrc = branding?.signatureBase64;

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        {/* Header: Logo + Title */}
        <View style={styles.headerSection}>
          <View style={styles.logoSection}>
            {logoSrc && <Image src={logoSrc} style={styles.logo} />}
            {branding?.primaryOffice?.name && (
              <Text style={styles.companyName}>{branding.primaryOffice.name}</Text>
            )}
            <Text style={styles.websiteUrl}>{branding?.websiteUrl || 'www.example.com'}</Text>
          </View>
          <View style={styles.titleSection}>
            <Text style={styles.title}>COMMERCIAL INVOICE</Text>
            <Text style={styles.documentCode}>{data.code}</Text>
            <Text style={styles.documentDate}>Issue Date: {formatDate(data.issue_date)}</Text>
          </View>
        </View>

        {/* Offices Section */}
        {branding && (
          <View style={styles.officesSection}>
            <View style={styles.officeBox}>
              <Text style={styles.officeLabel}>China Office</Text>
              <Text style={styles.officeText}>{branding.primaryOffice.address}</Text>
              {branding.primaryOffice.phone && (
                <Text style={styles.officeContact}>Tel: {branding.primaryOffice.phone}</Text>
              )}
              {branding.primaryOffice.email && (
                <Text style={styles.officeContact}>Email: {branding.primaryOffice.email}</Text>
              )}
            </View>
            <View style={styles.officeBoxRight}>
              <Text style={styles.officeLabel}>Spain Office</Text>
              <Text style={styles.officeText}>{branding.secondaryOffice.address}</Text>
              {branding.secondaryOffice.phone && (
                <Text style={styles.officeContact}>Tel: {branding.secondaryOffice.phone}</Text>
              )}
              {branding.secondaryOffice.email && (
                <Text style={styles.officeContact}>Email: {branding.secondaryOffice.email}</Text>
              )}
            </View>
          </View>
        )}

        {/* Info Grid: Bill To, Order Ref, Trade Terms, Payment Terms */}
        <View style={styles.infoGrid}>
          <View style={styles.infoBox}>
            <Text style={styles.infoLabel}>Bill To</Text>
            <Text style={styles.infoValue}>{data.customer?.name || '-'}</Text>
            {data.customer?.address && (
              <Text style={styles.infoSubtext}>{data.customer.address}</Text>
            )}
            {data.customer?.tax_id && (
              <Text style={styles.infoSubtext}>{taxLabel}: {data.customer.tax_id}</Text>
            )}
          </View>
          <View style={styles.infoBox}>
            <Text style={styles.infoLabel}>Order Reference</Text>
            <Text style={styles.infoValue}>{data.order?.code || '-'}</Text>
            {data.project?.name && (
              <Text style={styles.infoSubtext}>{data.project.code}</Text>
            )}
          </View>
          <View style={styles.infoBox}>
            <Text style={styles.infoLabel}>Incoterms</Text>
            <Text style={styles.infoValue}>{data.order?.incoterm || '-'}</Text>
          </View>
          <View style={styles.infoBoxLast}>
            <Text style={styles.infoLabel}>Payment Terms</Text>
            <Text style={styles.infoValue}>T/T</Text>
            {data.order?.payment_terms && (
              <Text style={styles.infoSubtext}>{data.order.payment_terms}</Text>
            )}
          </View>
        </View>

        {/* Shipping Info Grid */}
        <View style={styles.infoGrid}>
          <View style={styles.infoBox}>
            <Text style={styles.infoLabel}>Port of Discharge</Text>
            <Text style={styles.infoValue}>{data.order?.port_of_destination || '-'}</Text>
          </View>
          <View style={styles.infoBox}>
            <Text style={styles.infoLabel}>Port of Loading</Text>
            <Text style={styles.infoValue}>{data.order?.port_of_loading || '-'}</Text>
          </View>
          <View style={styles.infoBox}>
            <Text style={styles.infoLabel}>Currency</Text>
            <Text style={styles.infoValue}>{data.currency || 'USD'}</Text>
          </View>
          <View style={styles.infoBoxLast}>
            <Text style={styles.infoLabel}>Project</Text>
            <Text style={styles.infoValue}>{data.project?.name || '-'}</Text>
          </View>
        </View>

        {/* Items Table */}
        <View style={styles.table}>
          <View style={styles.tableHeader}>
            <View style={styles.colNo}>
              <Text style={styles.headerCell}>#</Text>
            </View>
            <View style={styles.colPartNo}>
              <Text style={styles.headerCell}>Part No.</Text>
            </View>
            <View style={styles.colProduct}>
              <Text style={styles.headerCell}>Description</Text>
            </View>
            <View style={styles.colQty}>
              <Text style={styles.headerCell}>Qty</Text>
            </View>
            <View style={styles.colUnit}>
              <Text style={styles.headerCell}>Unit</Text>
            </View>
            <View style={styles.colPrice}>
              <Text style={styles.headerCell}>Unit Price</Text>
            </View>
            <View style={styles.colAmount}>
              <Text style={styles.headerCell}>Amount</Text>
            </View>
          </View>

          {data.items.map((item, index) => (
            <View style={styles.tableRow} key={index}>
              <View style={styles.colNo}>
                <Text style={styles.cell}>{index + 1}</Text>
              </View>
              <View style={styles.colPartNo}>
                <Text style={styles.cell}>{item.part_number || '-'}</Text>
              </View>
              <View style={styles.colProduct}>
                <Text style={styles.cell}>{item.product_name || '-'}</Text>
              </View>
              <View style={styles.colQty}>
                <Text style={styles.cell}>{item.quantity?.toLocaleString() || 0}</Text>
              </View>
              <View style={styles.colUnit}>
                <Text style={styles.cell}>{item.unit || 'PCS'}</Text>
              </View>
              <View style={styles.colPrice}>
                <Text style={styles.cell}>{formatCurrency(item.unit_price || 0, data.currency)}</Text>
              </View>
              <View style={styles.colAmount}>
                <Text style={styles.cell}>{formatCurrency(item.amount || 0, data.currency)}</Text>
              </View>
            </View>
          ))}

          <View style={styles.totalRow}>
            <Text style={styles.totalLabel}>Total:</Text>
            <Text style={styles.totalValue}>{formatCurrencyWithCode(data.total_amount || 0, data.currency)}</Text>
          </View>
        </View>

        

        {/* Remarks */}
        {data.remarks && (
          <View style={styles.remarks}>
            <Text style={styles.remarksTitle}>Remarks</Text>
            <Text style={styles.remarksText}>{data.remarks}</Text>
          </View>
        )}

        {/* Bank Information */}
        {data.bank_info && (
          <View style={styles.bankInfo}>
            <Text style={styles.bankTitle}>Bank Information</Text>
            {data.bank_info.bank_name && (
              <View style={styles.bankRow}>
                <Text style={styles.bankLabel}>Bank Name:</Text>
                <Text style={styles.bankValue}>{data.bank_info.bank_name}</Text>
              </View>
            )}
            {data.bank_info.account_name && (
              <View style={styles.bankRow}>
                <Text style={styles.bankLabel}>Account Name:</Text>
                <Text style={styles.bankValue}>{data.bank_info.account_name}</Text>
              </View>
            )}
            {data.bank_info.account_number && (
              <View style={styles.bankRow}>
                <Text style={styles.bankLabel}>Account Number:</Text>
                <Text style={styles.bankValue}>{data.bank_info.account_number}</Text>
              </View>
            )}
            {data.bank_info.swift_code && (
              <View style={styles.bankRow}>
                <Text style={styles.bankLabel}>SWIFT Code:</Text>
                <Text style={styles.bankValue}>{data.bank_info.swift_code}</Text>
              </View>
            )}
            {data.bank_info.bank_address && (
              <View style={styles.bankRow}>
                <Text style={styles.bankLabel}>Bank Address:</Text>
                <Text style={styles.bankValue}>{data.bank_info.bank_address}</Text>
              </View>
            )}
          </View>
        )}

        {/* Footer: Signature + Stamp (不可分页) */}
        <View style={styles.footerSection} wrap={false}>
          <View style={styles.signatureRow}>
            <View style={styles.signatureLeft}>
              <Text style={styles.signatureLabel}>Signed by:</Text>
              <View style={{ flexDirection: 'row', alignItems: 'flex-end' }}>
                <View>
                  {signatureSrc ? (
                    <Image src={signatureSrc} style={styles.signatureImage} />
                  ) : (
                    <View style={styles.signatureLine} />
                  )}
                  <View style={styles.signerInfoBox}>
                    <Text style={styles.signerName}>{branding?.signer?.name || '-'}</Text>
                    <Text style={styles.signerTitle}>{branding?.signer?.title || '-'}</Text>
                  </View>
                </View>
                <View style={styles.stampSection}>
                  {stampSrc ? (
                    <Image src={stampSrc} style={styles.stamp} />
                  ) : (
                    <View style={styles.stampPlaceholder} />
                  )}
                  <Text style={styles.stampLabel}>(Company Seal)</Text>
                </View>
              </View>
            </View>
          </View>
        </View>
      </Page>
    </Document>
  );
};

export default CommercialInvoicePDF;
