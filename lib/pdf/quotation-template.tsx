/**
 * Quotation PDF Template (English)
 * 报价单 PDF 模板（英文）
 * 
 * Modern clean design with black border lines, matching the HTML template.
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
  // Header Section
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
    marginTop: 8, // 与 QUOTATION 文字顶部对齐
  },
  companyName: {
    fontSize: 9,
    color: '#000000',
    marginTop: 10, // 紧贴 logo
  },
  websiteUrl: {
    fontSize: 10,
    color: '#f97316',
    marginTop: 10, // 紧贴 logo
  },
  titleSection: {
    textAlign: 'left',
    width: '50%',
    paddingLeft: 30, // 与 Spain Office 对齐
  },
  title: {
    fontSize: 28,
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
  // Offices Section
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
    color: '#f97316', // 橙色
    textTransform: 'capitalize',
    letterSpacing: 1,
    marginBottom: 6,
  },
  officeLabelBlack: {
    fontSize: 10,
    color: '#f97316', // 橙色
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
  // Info Grid (4 columns)
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
    
    color: '#6b7280', // 浅灰色标签
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
  // Table
  table: {
    marginBottom: 0, // 移除底部边距，由 totalRow 控制
  },
  tableHeader: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  tableRow: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  colNo: { width: '4%', padding: 8 },
  colPartNo: { width: '16%', padding: 8 },
  colProduct: { width: '18%', padding: 8 },
  colPackaging: { width: '16%', padding: 8 },
  colQty: { width: '8%', padding: 8, textAlign: 'center' },
  colUnit: { width: '8%', padding: 8, textAlign: 'center' },
  colPrice: { width: '15%', padding: 8, textAlign: 'right' },
  colAmount: { width: '15%', padding: 8, textAlign: 'right' },
  headerCell: {
    fontSize: 8,
    fontWeight: 'bold',
    color: '#6b7280', // 浅灰色表头
    textTransform: 'capitalize',
    letterSpacing: 0.5,
  },
  cell: {
    fontSize: 9,
     
    color: '#000000', // 纯黑色
  },
  cellSecondary: {
    fontSize: 9,
    fontWeight: 'bold',
    color: '#000000', // 纯黑色序号
  },
  cellBold: {
    fontSize: 9,
    
    color: '#000000', // 纯黑色
  },
  totalRow: {
    flexDirection: 'row',
    borderTopWidth: 0, // 移除顶部横线，使用产品行的底部横线
    borderBottomWidth: 0,
    justifyContent: 'flex-end',
    marginTop: 8,
    marginBottom: 30,
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
  // Subtotal and Cost Breakdown
  subtotalRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    paddingTop: 12,
    paddingRight: 8,
  },
  subtotalLabel: {
    fontSize: 9,
    color: '#6b7280',
    textAlign: 'right',
    width: 120,
  },
  subtotalValue: {
    fontSize: 9,
    color: '#000000',
    width: '15%',
    textAlign: 'right',
  },
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
    width: '15%', // 与 colAmount 宽度一致
    textAlign: 'right',
  },
  // Footer Section
  footerSection: {
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
  signerNameValue: {
    fontSize: 9,
     
    color: '#000000',
  },
  signerTitle: {
    fontSize: 9,
    
    color: '#000000',
    marginTop: 2,
  },
  signerTitleValue: {
    fontSize: 9,
   
    color: '#000000',
  },
  stampSection: {
    width: '40%',
    alignItems: 'flex-end',
  },
  stampLabel: {
    fontSize: 9,
    color: '#000000',
    marginTop: -15,
    textAlign: 'right',
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
  // Website Footer
  websiteFooter: {
    marginTop: 40,
    textAlign: 'center',
  },
  websiteLink: {
    fontSize: 10,
    color: '#f97316',
    fontWeight: 'bold',
  },
  // Remarks
  remarks: {
    marginTop: 20,
    marginBottom: 20,
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
});

export interface QuotationPDFData {
  code: string;
  created: string;
  valid_until: string;
  currency: string;
  incoterm: string;
  delivery_port: string;
  payment_terms: string;
  total_amount: number;
  remarks?: string;
 
  delivery_time?: string;      // 交付时间 (Requirements: 1.4)
  cost_breakdown?: Record<string, number>;  // 费用分解
  customer?: {
    name: string;
    address?: string;
  };
  project?: {
    name: string;
    code?: string;
  };
  items: Array<{
    part_number?: string;
    product_name?: string;
    packaging?: string;
    quantity: number;
    unit: string;
    unit_price: number;
    amount: number;
  }>;
  branding?: DocumentBranding;
}

const formatDate = (date: string) => {
  if (!date) return '-';
  return new Date(date).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
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

export const QuotationPDF: React.FC<{ data: QuotationPDFData }> = ({ data }) => {
 
  const branding = data.branding;
  // Only use image sources if they are non-empty strings
  const logoSrc = (branding?.logoBase64 || branding?.logoPath) || undefined;
  const stampSrc = (branding?.stampBase64 || branding?.stampPath) || undefined;
  const signatureSrc = branding?.signatureBase64 || undefined;
  
  // Validate image sources - empty strings and SVG files should be treated as undefined
  // React-pdf doesn't support SVG files in Image component
  const isSvg = (src: string | undefined) => src?.toLowerCase().endsWith('.svg');
  const validLogoSrc = logoSrc && logoSrc.length > 0 && !isSvg(logoSrc) ? logoSrc : undefined;
  const validStampSrc = stampSrc && stampSrc.length > 0 && !isSvg(stampSrc) ? stampSrc : undefined;
  const validSignatureSrc = signatureSrc && signatureSrc.length > 0 && !isSvg(signatureSrc) ? signatureSrc : undefined;

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        {/* Header: Logo + Title */}
        <View style={styles.headerSection}>
          <View style={styles.logoSection}>
            {validLogoSrc && <Image src={validLogoSrc} style={styles.logo} />}
            {branding?.primaryOffice?.name && (
              <Text style={styles.companyName}>{branding.primaryOffice.name}</Text>
            )}
           
            <Text style={styles.websiteUrl}>{branding?.websiteUrl || 'www.example.com'}</Text>
          </View>
          <View style={styles.titleSection}>
            <Text style={styles.title}>QUOTATION</Text>
            <Text style={styles.documentCode}>{data.code}</Text>
            <Text style={styles.documentDate}>Date: {formatDate(data.created)}</Text>
            <Text style={styles.documentDate}>Valid Until: {data.valid_until ? formatDate(data.valid_until) : '-'}</Text>
          </View>
        </View>

        {/* Offices Section */}
        {branding && (
          <View style={styles.officesSection}>
            <View style={styles.officeBox}>
              <Text style={styles.officeLabelBlack}>China Office</Text>
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

        {/* Info Grid: Customer, Project, Trade Terms, Payment Terms */}
        <View style={styles.infoGrid}>
          <View style={styles.infoBox}>
            <Text style={styles.infoLabel}>Customer</Text>
            <Text style={styles.infoValue}>{data.customer?.name || '-'}</Text>
          </View>
          <View style={styles.infoBox}>
            <Text style={styles.infoLabel}>Project</Text>
            <Text style={styles.infoValue}>{data.project?.name || '-'}</Text>
          </View>
          <View style={styles.infoBox}>
            <Text style={styles.infoLabel}>Incoterms</Text>
            <Text style={styles.infoValue}>{data.incoterm || '-'}</Text>
          </View>
          <View style={styles.infoBoxLast}>
            <Text style={styles.infoLabel}>Payment Terms</Text>
            <Text style={styles.infoValue}>{data.payment_terms || '-'}</Text>
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
            <View style={styles.colPackaging}>
              <Text style={styles.headerCell}>Packaging</Text>
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
              <View style={styles.colPackaging}>
                {item.packaging ? (
                  item.packaging.split('\n').map((line, i) => (
                    <Text key={i} style={styles.cell}>{line}</Text>
                  ))
                ) : (
                  <Text style={styles.cell}>-</Text>
                )}
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

         
 

          {/* Total Row - 移除底部横线，只保留顶部横线 */}
          <View style={styles.totalRow}>
            <Text style={styles.totalLabel}>Total:</Text>
            <Text style={styles.totalValue}>{formatCurrencyWithCode(data.total_amount || 0, data.currency)}</Text>
          </View>
        </View>

        {/* Delivery Time & Remarks - 交货期和备注合并显示 */}
        {(data.delivery_time || data.remarks) && (
          <View style={styles.remarks}>
            {data.delivery_time && (
              <>
                <Text style={styles.remarksText}>
                  <Text style={{ fontWeight: 'bold' }}>Delivery Time: </Text>
                  {data.delivery_time}
                </Text>
              </>
            )}
            {data.remarks && (
              <Text style={[styles.remarksText, data.delivery_time ? { marginTop: 6 } : {}]}>
                <Text style={{ fontWeight: 'bold' }}>Remarks: </Text>
                {data.remarks}
              </Text>
            )}
          </View>
        )}

    

        {/* Footer: Signature + Stamp */}
        <View style={styles.footerSection} wrap={false}>
          <View style={styles.signatureRow}>
            <View style={styles.signatureLeft}>
              <Text style={styles.signatureLabel}>Signed by:</Text>
              {validSignatureSrc ? (
                <Image src={validSignatureSrc} style={styles.signatureImage} />
              ) : (
                <View style={styles.signatureLine} />
              )}
              <View style={styles.signerInfoBox}>
                <Text style={styles.signerName}>
                   <Text style={styles.signerNameValue}>{branding?.signer?.name || '-'}</Text>
                </Text>
                <Text style={styles.signerTitle}>
                   <Text style={styles.signerTitleValue}>{branding?.signer?.title || '-'}</Text>
                </Text>
              </View>
            </View>
            <View style={styles.stampSection}>
              
              {validStampSrc ? (
                <Image src={validStampSrc} style={styles.stamp} />
              ) : (
                <View style={styles.stampPlaceholder} />
              )}
              <Text style={styles.stampLabel}>(Company Seal)</Text>
            </View>
          </View>
        </View>

        {/* Website Footer removed - already shown in header */}
      </Page>
    </Document>
  );
};

export default QuotationPDF;
