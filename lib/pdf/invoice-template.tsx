/**
 * Proforma Invoice PDF Template (English)
 * 形式发票 PDF 模板（英文）
 * 
 * 布局与报价单模板一致
 */

import React from 'react';
import { Document, Page, Text, View, Image, StyleSheet } from '@react-pdf/renderer';
import { defaultFontFamily } from './fonts';
import { DocumentBranding } from '@/lib/branding/types';
import { formatUnitPrice, formatAmount, formatAmountWithCode } from '@/lib/utils/currency-formatting';
import { PAYMENT_TERMS } from '@/lib/constants/trade-constants';



const styles = StyleSheet.create({
  page: {
    fontFamily: defaultFontFamily,
    fontSize: 10,
    paddingTop: 40,
    paddingLeft: 40,
    paddingRight: 40,
    paddingBottom: 20, // 为底部offices section预留空间
    backgroundColor: '#ffffff',
    color: '#000000',
    flexDirection: 'column',
    justifyContent: 'flex-start',
  },
  // Header Section
  headerSection: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 10,
    paddingBottom: 10,
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
    marginVertical: 4,
  },
  companyName: {
    fontSize: 12,
    color: '#000000',
    marginTop: 10,
  },
  websiteUrl: {
    fontSize: 12,
    color: '#f97316',
    marginTop: 4,
  },
  titleSection: {
    textAlign: 'left',
    width: '50%',
    paddingLeft: 30,
  },
  title: {
    fontSize: 17,
    fontWeight: 'bold',
    color: '#000000',
    letterSpacing: 1,
    marginBottom: 5,
  },
  documentCode: {
    fontSize: 10,
    fontWeight: 'normal',
    color: '#000000',
    marginTop: 6
  },
  documentDate: {
    fontSize: 10,
    fontWeight: 'normal',
    color: '#000000',
    marginTop: 6
  },
  // Content Section - 中间可跨页内容区
  contentSection: {
    flex: 1,
    flexDirection: 'column',
    flexGrow: 1,
    flexShrink: 1,
    marginBottom: 10, // 为offices section预留空间
  },
  // Offices Section - Added to match Quotation template
  officesSection: {
    flexDirection: 'row',
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
    marginTop: 'auto',
  },
  officeBox: {
    width: '50%',
  },
  officeBoxRight: {
    width: '50%',
    paddingLeft: 30,
  },
  officeLabel: {
    fontSize: 9,
    color: '#f97316', // Orange
    textTransform: 'capitalize',
    letterSpacing: 1,
    marginBottom: 6,
  },
  officeLabelBlack: {
    fontSize: 9,
    color: '#f97316', // Orange (keeping consistent with layout image, using orange for titles)
    textTransform: 'capitalize',
    letterSpacing: 1,
    marginBottom: 6,
  },
  officeText: {
    fontSize: 8,
    color: '#000000',
    lineHeight: 1.5,
  },
  officeContact: {
    fontSize: 8,
    color: '#000000',
    marginTop: 4,
  },

  // TO Section (Customer Info)
  toSection: {
    marginBottom: 10,
  },
  toRow: {
    flexDirection: 'row',
    marginBottom: 4,
  },
  toLabel: {
    fontSize: 10,
    fontWeight: 'bold',
    color: '#000000',
    marginRight: 8,
  },
  toText: {
    fontSize: 9,
    color: '#000000',
    lineHeight: 1.4,
  },
  // Terms Section
  termsSection: {
    marginTop: 10

  },
  termsTitle: {
    fontSize: 10,
    fontWeight: 'bold',
    color: '#1976D2',
    marginBottom: 8,
  },
  termsRow: {
    flexDirection: 'row',
    marginBottom: 3,
  },
  termsLabel: {
    width: '26%', //  
    fontSize: 9,
    color: '#000000', // 黑色 label，与 value 一致
  },
  termsValue: {
    flex: 1,
    fontSize: 9,
    color: '#000000', // 黑色内容
  },
  // Table
  table: {
    marginBottom: 0, // 移除底部边距，由 totalRow 控制
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
  colNo: { width: '5%', padding: 8 },
  colPartNo: { width: '20%', padding: 8 },
  colProduct: { width: '25%', padding: 8 },
  colQty: { width: '10%', padding: 8, textAlign: 'center' },
  colUnit: { width: '8%', padding: 8, textAlign: 'center' },
  colPrice: { width: '13%', padding: 8, textAlign: 'center' },
  colAmount: { width: '19%', padding: 8, textAlign: 'center' },
  headerCell: {
    fontSize: 8,
    fontWeight: 'bold',
    color: '#1976D2',
    textTransform: 'capitalize',
    letterSpacing: 0.5,
  },
  cell: {
    fontSize: 9,
    color: '#000000',
  },
  totalRow: {
    flexDirection: 'row',
    borderTopWidth: 0, // 移除顶部横线，使用产品行的底部横线
    borderBottomWidth: 0,
    justifyContent: 'flex-end',
    marginTop: 8,
    marginBottom: 0, // 不设置底部边距，由下面的组件设置 marginTop
  },
  totalLabel: {
    width: '81%', // 使总金额标签与表格右对齐部分对齐，前6列的总宽度 (5%+20%+25%+10%+8%+13%=81%)
    padding: 10,
    textAlign: 'right',
    fontSize: 9,
    fontWeight: 'bold',
    color: '#000000',
    textTransform: 'capitalize',
  },
  totalValue: {
    width: '19%', // 与Amount列宽度相同
    padding: 8,
    textAlign: 'right',
    fontSize: 9,
    fontWeight: 'bold',
    color: '#000000',
    flexShrink: 0,
  },
  // Subtotal and Cost Breakdown
  
  costRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    paddingTop: 8,
    paddingRight: 8,
  },
  costLabel: {
    fontSize: 9,
    color: '#6b7280',
    textAlign: 'right',
    width: 120,
  },
  costValue: {
    fontSize: 9,
    color: '#000000',
    width: '15%',
    textAlign: 'right',
  },
  // Bank Info（独立整体）
  bankInfo: {
    marginTop: 10

  },
  bankTitle: {
    fontSize: 10,
    fontWeight: 'bold',
    color: '#1976D2',
    marginBottom: 8,
  },
  bankTable: {
    width: '100%',
  },
  bankTableRow: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  bankTableNo: {
    width: '8%',
    padding: 6,
    fontSize: 9,
    color: '#000000',
  },
  bankTableContent: {
    flex: 1,
    padding: 6,
    fontSize: 9,
    color: '#000000',
  },
  bankRow: {
    flexDirection: 'row',
    marginBottom: 4,
  },
  bankLabel: {
    width: 160,
    fontSize: 9,
    color: '#000000',
  },
  bankValue: {
    fontSize: 9,
    color: '#000000',
    lineHeight: 1.6,
  },
  bankLine: {
    fontSize: 9,
    color: '#000000',
    marginBottom: 2,
  },
  // Remarks
  remarks: {
    marginTop: 6,

  },
  remarksTitle: {
    fontSize: 10,
    fontWeight: 'bold',
    color: '#1976D2',
    marginBottom: 8,
  },
  remarksText: {
    fontSize: 9,
    color: '#000000',
    lineHeight: 1.5,
  },
  // Signature Section - 签名区域（不可分页）
  signatureSection: {
    marginTop: 10,
     
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
    fontSize: 10,
    fontWeight: 'bold',
    color: '#000000',
    marginBottom: 8,

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
    width: '50%',
    alignItems: 'flex-start',
  },
  stampLabel: {
    fontSize: 9,
    color: '#000000',
    marginTop: -20,
    textAlign: 'left',
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

export interface InvoicePDFData {
  code: string;
  issue_date: string;
  currency: string;
  total_amount: number;

  order?: {
    code: string;
    incoterm?: string;
    port_of_loading?: string;
    port_of_destination?: string;
    payment_terms?: string;
    estimated_shipping_date?: string;
    customer_po?: string;
    vendor_code?: string;
    mode_of_shipment?: string;
  };
  customer?: {
    name: string;
    address?: string;
    tax_id?: string;  // 税号 (Requirements: 2.2)
    contact_person?: string;
    phone?: string;
    email?: string;
    country?: string;  // 国家代码，用于判断是否显示 VAT Number
  };
  project?: {
    name: string;
    code?: string;
  };
  items: Array<{
    part_number?: string;
    product_name?: string;
    description?: string;
    packaging?: string;
    quantity: number;
    unit: string;
    unit_price: number;
    amount: number;
  }>;
  bank_info?: string;  // 纯文本银行信息
  terms?: {
    payment?: string;
    price_term?: string;
    country_of_origin?: string;
    country_of_destination?: string;
    port_of_discharge?: string;
    mode_of_shipment?: string;
    port_of_loading?: string;
    time_of_delivery?: string;
  };
  packing_info?: string;
  remarks?: string;  // 包装信息 (Requirements: 4.2)
  shipping_marks?: string;
  branding?: DocumentBranding;
}

const formatDate = (date: string) => {
  if (!date) return '-';
  
   return new Date(date).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
};

// 货币代码到符号的映射
const currencySymbols: Record<string, string> = {
  USD: '$',
  EUR: '€',
  GBP: '£',
  CNY: '¥',
  JPY: '¥',
  RMB: '¥',
};

// 使用货币符号格式化（用于表格单元格）
const formatCurrency = (amount: number, currency: string = 'USD') => {
  const symbol = currencySymbols[currency] || currency;
  return `${symbol}${amount.toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  })}`;
};

// 使用货币代码格式化（用于 Total 行，如 "USD 100.00"）
const formatCurrencyWithCode = (amount: number, currency: string = 'USD') => {
  return `${currency} ${amount.toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  })}`;
};

// 根据代码获取付款条款名称
const getPaymentTermName = (code: string): string => {
  const term = PAYMENT_TERMS.find(t => t.code === code);
  return term ? term.name : code;
};

// 国家代码到名称的映射
const countryCodeToName = (code: string): string => {
  const countries: Record<string, string> = {
    'CN': 'China',
    'US': 'United States',
    'GB': 'United Kingdom',
    'DE': 'Germany',
    'FR': 'France',
    'JP': 'Japan',
    'KR': 'South Korea',
    'IN': 'India',
    'CA': 'Canada',
    'AU': 'Australia',
    'IT': 'Italy',
    'ES': 'Spain',
    'BR': 'Brazil',
    'MX': 'Mexico',
    'ID': 'Indonesia',
    'NL': 'Netherlands',
    'SA': 'Saudi Arabia',
    'TR': 'Turkey',
    'CH': 'Switzerland',
    'PL': 'Poland',
    'BE': 'Belgium',
    'SE': 'Sweden',
    'IE': 'Ireland',
    'AT': 'Austria',
    'SG': 'Singapore',
    'MY': 'Malaysia',
    'TH': 'Thailand',
    'VN': 'Vietnam',
    'PH': 'Philippines',
    'PK': 'Pakistan',
    'BD': 'Bangladesh',
    'NG': 'Nigeria',
    'EG': 'Egypt',
    'ZA': 'South Africa',
    'AR': 'Argentina',
    'CO': 'Colombia',
    'CL': 'Chile',
    'PE': 'Peru',
    'NZ': 'New Zealand',
    'AE': 'United Arab Emirates',
    'RU': 'Russia',
    'UA': 'Ukraine',
    'CZ': 'Czech Republic',
    'NO': 'Norway',
    'DK': 'Denmark',
    'FI': 'Finland',
    'PT': 'Portugal',
    'GR': 'Greece',
    'RO': 'Romania',
    'HU': 'Hungary',
    'IL': 'Israel',
    'KE': 'Kenya',
    'GH': 'Ghana',
    'TZ': 'Tanzania',
    'UG': 'Uganda',
    'ZW': 'Zimbabwe',
    'ZM': 'Zambia',
    'BW': 'Botswana',
    'MU': 'Mauritius',
    'NA': 'Namibia',
    'BF': 'Burkina Faso',
    'SN': 'Senegal',
    'CI': 'Ivory Coast',
    'CM': 'Cameroon',
    'CD': 'Democratic Republic of Congo',
    'AO': 'Angola',
    'MZ': 'Mozambique',
    'MG': 'Madagascar',
    'LS': 'Lesotho',
    'SZ': 'Eswatini',
    'TD': 'Chad',
    'CF': 'Central African Republic',
    'TG': 'Togo',
    'BJ': 'Benin',
    'GW': 'Guinea-Bissau',
    'GM': 'Gambia',
    'GN': 'Guinea',
    'SL': 'Sierra Leone',
    'LR': 'Liberia',
    'SO': 'Somalia',
    'DJ': 'Djibouti',
    'ER': 'Eritrea',
    'ET': 'Ethiopia',
    'SD': 'Sudan',
    'SS': 'South Sudan',
    'RW': 'Rwanda',
    'BI': 'Burundi',
    'KM': 'Comoros',
    'SC': 'Seychelles',
    'MR': 'Mauritania',
    'NE': 'Niger',
    'TN': 'Tunisia',
    'LY': 'Libya',
    'DZ': 'Algeria',
    'CG': 'Republic of Congo',
    'GA': 'Gabon',
    'GQ': 'Equatorial Guinea',
    'ST': 'São Tomé and Príncipe',
    'CV': 'Cape Verde',
  };
  return countries[code] || code;
};

// 格式化运输方式，避免重复的 "By"
const formatShipmentMode = (mode: string): string => {
  if (!mode || mode === '-') return '-';
  
  // 处理 Express 特殊情况
  if (mode.toLowerCase() === 'express') {
    return 'By Express (FedEx/DHL/UPS)';
  }

  // 如果已经以 "By " 开头（忽略大小写），则直接返回原值
  if (mode.toLowerCase().startsWith('by ')) {
    return mode;
  }
  
  // 否则加上 "By " 前缀
  return `By ${mode}`;
};

export const InvoicePDF: React.FC<{ data: InvoicePDFData }> = ({ data }) => {
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

  // Header Component - 每页顶部固定显示
  const HeaderSection = () => (
    <View style={styles.headerSection} wrap={false}>
      <View style={styles.logoSection}>
        {logoSrc && <Image src={logoSrc} style={styles.logo} />}
        {branding?.primaryOffice?.name && (
          <Text style={styles.companyName}>{branding.primaryOffice.name}</Text>
        )}
        {branding?.vat && (
          <Text style={styles.documentCode}>Tax ID: {branding.vat}</Text>
        )}
        <Text style={styles.websiteUrl}>{branding?.websiteUrl || 'www.alustars.com'}</Text>
      </View>
      <View style={styles.titleSection}>
        <Text style={styles.title}>PROFORMA INVOICE</Text>
        {/* Vendor Code & PO Number */}
        {data.order?.vendor_code && (
          <Text style={{ ...styles.documentCode }}>
            Vendor: {data.order.vendor_code}
          </Text>
        )}
        {data.order?.customer_po && (
          <Text style={{ ...styles.documentCode }}>
            PO Number: {data.order.customer_po}
          </Text>
        )}
        <Text style={styles.documentCode}>INVOICE NO. {data.code}</Text>
        <Text style={styles.documentDate}>Date: {formatDate(data.issue_date)}</Text>
      </View>
    </View>
  );

  // Offices Component - 每页底部固定显示
  const OfficesSection = () => (
    branding && (
      <View style={styles.officesSection} wrap={false}>
        <View style={styles.officeBox}>
          <Text style={styles.officeLabelBlack}>China Office</Text>
          <Text style={styles.officeText}>{branding.primaryOffice?.address}</Text>
          {branding.primaryOffice?.phone && (
            <Text style={styles.officeContact}>Tel: {branding.primaryOffice.phone}</Text>
          )}
          {branding.primaryOffice?.email && (
            <Text style={styles.officeContact}>Email: {branding.primaryOffice.email}</Text>
          )}
        </View>
        <View style={styles.officeBoxRight}>
          <Text style={styles.officeLabel}>Spain Office</Text>
          <Text style={styles.officeText}>{branding.secondaryOffice?.address}</Text>
          {branding.secondaryOffice?.phone && (
            <Text style={styles.officeContact}>Tel: {branding.secondaryOffice.phone}</Text>
          )}
          {branding.secondaryOffice?.email && (
            <Text style={styles.officeContact}>Email: {branding.secondaryOffice.email}</Text>
          )}
        </View>
      </View>
    )
  );

  // Content Component - 可跨页显示的内容
  const ContentSection = () => (
    <View style={styles.contentSection}>
      {/* TO: Customer Info */}
      <View style={styles.toSection}>
        <View style={styles.toRow}>
          <Text style={styles.toLabel}>TO:</Text>
          <Text style={styles.toText}>{data.customer?.name || '-'}</Text>
        </View>
        {data.customer?.address && (
          <Text style={styles.toText}>Address: {data.customer.address}</Text>
        )}
        {data.customer?.tax_id && (
          <Text style={styles.toText}>{taxLabel}: {data.customer.tax_id}</Text>
        )}
        {data.customer?.contact_person && (
          <Text style={styles.toText}>Attn: {data.customer.contact_person}</Text>
        )}
        {data.customer?.email && (
          <Text style={styles.toText}>Email: {data.customer.email}</Text>
        )}
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
              <Text style={styles.cell}>{formatUnitPrice(item.unit_price || 0, data.currency)}</Text>
            </View>
            <View style={styles.colAmount}>
              <Text style={styles.cell}>{formatAmount(item.amount || 0, data.currency)}</Text>
            </View>
          </View>
        ))}

        <View style={styles.totalRow}>
          <Text style={styles.totalLabel}>Total:</Text>
          <Text style={styles.totalValue}>{formatAmountWithCode(data.total_amount || 0, data.currency)}</Text>
        </View>
      </View>

      {/* Remarks */}
      {data.remarks && data.remarks.trim() && (
        <View style={styles.remarks}>
          <Text style={styles.remarksTitle}>Remarks</Text>
          <Text style={styles.remarksText}>{data.remarks}</Text>
        </View>
      )}

      {/* Terms & Conditions */}
      <View style={styles.termsSection}>
        <Text style={styles.termsTitle}>Terms & Conditions</Text>
        <View style={styles.termsRow}>
          <Text style={styles.termsLabel}>Payment Term:</Text>
          <Text style={styles.termsValue}>
            {data.terms?.payment ? getPaymentTermName(data.terms.payment) : '-'}
          </Text>
        </View>
        <View style={styles.termsRow}>
          <Text style={styles.termsLabel}>Price Term:</Text>
          <Text style={styles.termsValue}>{data.terms?.price_term || data.order?.incoterm || '-'}</Text>
        </View>
        <View style={styles.termsRow}>
          <Text style={styles.termsLabel}>Country of Origin:</Text>
          <Text style={styles.termsValue}>{data.terms?.country_of_origin ? countryCodeToName(data.terms.country_of_origin) : '-'}</Text>
        </View>
        <View style={styles.termsRow}>
          <Text style={styles.termsLabel}>Country of Destination:</Text>
          <Text style={styles.termsValue}>{data.terms?.country_of_destination ? countryCodeToName(data.terms.country_of_destination) : '-'}</Text>
        </View>
        <View style={styles.termsRow}>
          <Text style={styles.termsLabel}>Port of Loading:</Text>
          <Text style={styles.termsValue}>{data.terms?.port_of_loading || data.order?.port_of_loading || '-'}</Text>
        </View>
        <View style={styles.termsRow}>
          <Text style={styles.termsLabel}>Port of Discharge:</Text>
          <Text style={styles.termsValue}>{data.terms?.port_of_discharge || data.order?.port_of_destination || '-'}</Text>
        </View>
        <View style={styles.termsRow}>
          <Text style={styles.termsLabel}>Mode of Shipment:</Text>
          <Text style={styles.termsValue}>
            {formatShipmentMode(data.terms?.mode_of_shipment || data.order?.mode_of_shipment || '')}
          </Text>
        </View>
        <View style={styles.termsRow}>
          <Text style={styles.termsLabel}>Time of Delivery:</Text>
          <Text style={styles.termsValue}>{data.terms?.time_of_delivery ? formatDate(data.terms.time_of_delivery) : '-'}</Text>
        </View>
      </View>

      {/* Bank Information */}
      {data.bank_info && (
        <View style={styles.bankInfo}>
          <Text style={styles.bankTitle}>Remittance Instructions</Text>
          {data.bank_info.split('\n').map((line, index) => (
            <Text key={index} style={styles.bankLine}>{line}</Text>
          ))}
        </View>
      )}

      {/* Signature Section */}
      <View style={styles.signatureSection} wrap={false}>
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
    </View>
  );

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <HeaderSection />
        <ContentSection />
        <OfficesSection />
      </Page>
    </Document>
  );
};

export default InvoicePDF;
