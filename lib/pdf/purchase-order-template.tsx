/**
 * Purchase Order PDF Template (Chinese)
 * 采购订单 PDF 模板（中文）
 * 
 * 布局与报价单模板一致
 */

import React from 'react';
import { Document, Page, Text, View, Image, StyleSheet } from '@react-pdf/renderer';
import { chineseFontFamily, registerFonts } from './fonts';
import { DocumentBranding } from '@/lib/branding/types';
import { formatUnitPrice, formatAmount, formatAmountWithCode } from '@/lib/utils/currency-formatting';
 
// 注册中文字体
registerFonts();

const styles = StyleSheet.create({
  page: {
    fontFamily: chineseFontFamily,
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
    marginTop: 8,
  },
  companyName: {
    fontSize: 9,
    color: '#000000',
    marginTop: 10,
  },
  websiteUrl: {
    fontSize: 10,
    color: '#f97316',
    marginTop: 10,
  },
  titleSection: {
    textAlign: 'left',
    width: '50%',
    paddingLeft: 30,
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
  // Content Section - 中间可跨页内容区
  contentSection: {
    flex: 1,
    flexDirection: 'column',
    flexGrow: 1,
    flexShrink: 1,
    marginBottom: 10, // 为offices section预留空间
  },
  // Signature Section - 签名区域（不可分页）
  signatureSection: {
    marginTop: 10,
    
  },
  // Info Grid
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
    marginBottom: 30,
  },
  totalLabel: {
    flex: 1,
    padding: 10,
    textAlign: 'right',
    fontSize: 10,
    fontWeight: 'bold',
    color: '#000000',
  },
  totalValue: {
    padding: 10,
    textAlign: 'right',
    fontSize: 12,
    fontWeight: 'bold',
    color: '#000000',
    flexShrink: 0,
  },
  // Mold Section
  moldSection: {
    marginTop: 10,
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 10,
    fontWeight: 'bold',
    color: '#000000',
    marginBottom: 10,
  },
  moldColType: { width: '50%', padding: 8 },
  moldColCost: { width: '25%', padding: 8, textAlign: 'right' },
  moldColLeadTime: { width: '25%', padding: 8, textAlign: 'right' },
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
  // Footer Section
  footerSection: {
    marginTop: 50,
    paddingTop: 20,
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
    width: '40%',
    alignItems: 'center',
  },
  stampLabel: {
    fontSize: 9,
    color: '#000000',
    marginTop: -15,
    marginRight:5,
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

// Types
export interface PurchaseOrderPDFData {
  code: string;
  created: string;
  expected_delivery_date?: string;
  currency: string;
  total_amount: number;
  remarks?: string;
  supplier?: {
    name: string;
    name_cn?: string;
    address?: string;
  };
  project?: {
    name: string;
    name_cn?: string;
    code?: string;
  };
  items: Array<{
    part_number?: string;
    product_name?: string;
    product_name_cn?: string;
    quantity: number;
    unit: string;
    unit_price: number;
    amount: number;
  }>;
  
  branding?: DocumentBranding;
}

// Helpers
const formatDateCN = (date: string) => {
  if (!date) return '-';
  const d = new Date(date);
  return `${d.getFullYear()}年${d.getMonth() + 1}月${d.getDate()}日`;
};

const formatCurrency = (amount: number, currency: string) => {
  return formatAmount(amount, currency);
};

const getMoldTypeLabel = (type: string) => {
  const labels: Record<string, string> = {
    die_casting: '压铸模',
    stamping: '冲压模',
    injection: '注塑模',
    cnc_fixture: 'CNC夹具',
    forging: '锻造模',
    extrusion: '挤压模',
  };
  return labels[type] || type;
};

// Component
export const PurchaseOrderPDF: React.FC<{ data: PurchaseOrderPDFData }> = ({ data }) => {
  const branding = data.branding;
  const logoSrc = branding?.logoBase64 || branding?.logoPath;
  const stampSrc = branding?.stampBase64 || branding?.stampPath;
  const signatureSrc = branding?.signatureBase64;

  // Calculate totals
  const itemsSubtotal = data.items.reduce((sum, item) => sum + item.amount, 0);

  const grandTotal = itemsSubtotal;

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
        <Text style={styles.title}>采购订单</Text>
        <Text style={styles.documentCode}>{data.code}</Text>
        <Text style={styles.documentDate}>日期: {formatDateCN(data.created)}</Text>
        {data.expected_delivery_date && (
          <Text style={styles.documentDate}>交货日期: {formatDateCN(data.expected_delivery_date)}</Text>
        )}
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
      {/* Info Grid: Supplier, Project */}
      <View style={styles.infoGrid}>
        <View style={styles.infoBox}>
          <Text style={styles.infoLabel}>供应商</Text>
          <Text style={styles.infoValue}>{data.supplier?.name_cn || data.supplier?.name || '-'}</Text>
          {data.supplier?.address && (
            <Text style={styles.infoSubtext}>{data.supplier.address}</Text>
          )}
        </View>
        <View style={styles.infoBoxLast}>
          <Text style={styles.infoLabel}>项目</Text>
          <Text style={styles.infoValue}>{data.project?.name_cn || data.project?.name || '-'}</Text>
          {data.project?.code && (
            <Text style={styles.infoSubtext}>{data.project.code}</Text>
          )}
        </View>
      </View>

      {/* Items Table */}
      <View style={styles.table}>
        <View style={styles.tableHeader}>
          <View style={styles.colNo}>
            <Text style={styles.headerCell}>#</Text>
          </View>
          <View style={styles.colPartNo}>
            <Text style={styles.headerCell}>零件号</Text>
          </View>
          <View style={styles.colProduct}>
            <Text style={styles.headerCell}>产品描述</Text>
          </View>
          <View style={styles.colQty}>
            <Text style={styles.headerCell}>数量</Text>
          </View>
          <View style={styles.colUnit}>
            <Text style={styles.headerCell}>单位</Text>
          </View>
          <View style={styles.colPrice}>
            <Text style={styles.headerCell}>单价</Text>
          </View>
          <View style={styles.colAmount}>
            <Text style={styles.headerCell}>金额</Text>
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
              <Text style={styles.cell}>{item.product_name_cn || item.product_name || '-'}</Text>
            </View>
            <View style={styles.colQty}>
              <Text style={styles.cell}>{item.quantity?.toLocaleString() || 0}</Text>
            </View>
            <View style={styles.colUnit}>
              <Text style={styles.cell}>{item.unit || '件'}</Text>
            </View>
            <View style={styles.colPrice}>
              <Text style={styles.cell}>{formatCurrency(item.unit_price, data.currency)}</Text>
            </View>
            <View style={styles.colAmount}>
              <Text style={styles.cell}>{formatCurrency(item.amount, data.currency)}</Text>
            </View>
          </View>
        ))}

        {/* Subtotal if has mold items */}
        {(
          <View style={styles.totalRow}>
            <Text style={styles.totalLabel}>产品小计:</Text>
            <Text style={styles.totalValue}>{formatCurrency(itemsSubtotal, data.currency)}</Text>
          </View>
        )}
      </View>

      {/* Grand Total */}
      <View style={styles.totalRow}>
        <Text style={styles.totalLabel}>合计:</Text>
        <Text style={styles.totalValue}>{formatCurrency(grandTotal, data.currency)}</Text>
      </View>

      {/* Remarks */}
      {data.remarks && (
        <View style={styles.remarks}>
          <Text style={styles.remarksTitle}>备注</Text>
          <Text style={styles.remarksText}>{data.remarks}</Text>
        </View>
      )}

      {/* Signature Section */}
      <View style={styles.signatureSection} wrap={false}>
        <View style={styles.signatureRow}>
          <View style={styles.signatureLeft}>
            <Text style={styles.signatureLabel}>签名:</Text>
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
            <Text style={styles.stampLabel}>（公司印章）</Text>
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

export default PurchaseOrderPDF;
