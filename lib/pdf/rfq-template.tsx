/**
 * RFQ PDF Template (Chinese)
 * 询价单 PDF 模板（中文）
 * 
 * Modern clean design matching purchase-order template.
 * For supplier-facing documents (domestic suppliers).
 */

import React from 'react';
import { Document, Page, Text, View, Image, StyleSheet } from '@react-pdf/renderer';
import { registerFonts, chineseFontFamily } from './fonts';
import { DocumentBranding } from '@/lib/branding/types';
import { HeaderFooter } from './header-footer';

// Register Chinese fonts
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
    textAlign: 'right',
  },
  title: {
    fontSize: 28,
    fontWeight: 'normal',
    color: '#000000',
    letterSpacing: 4,
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
    gap: 30,
    marginBottom: 25,
  },
  officeBox: {
    flex: 1,
  },
  officeLabel: {
    fontSize: 10,
    color: '#f97316',
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
    color: '#6b7280',
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
    marginBottom: 30,
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
  colNo: { width: '6%', padding: 10 },
  colPartNo: { width: '18%', padding: 10 },
  colProduct: { width: '40%', padding: 10 },
  colQty: { width: '12%', padding: 10, textAlign: 'center' },
  colUnit: { width: '10%', padding: 10, textAlign: 'center' },
  colRemarks: { width: '14%', padding: 10 },
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
  // Special Requirements
  specialRequirements: {
    marginTop: 20,
    marginBottom: 20,
    padding: 15,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 4,
  },
  specialTitle: {
    fontSize: 10,
    fontWeight: 'bold',
    color: '#000000',
    marginBottom: 8,
  },
  specialText: {
    fontSize: 9,
    color: '#000000',
    lineHeight: 1.5,
  },
  // Footer Section
  footerSection: {
    marginTop: 50,
    paddingTop: 20,
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
    width: '40%',
    alignItems: 'flex-end',
  },
  stampLabel: {
    fontSize: 9,
    color: '#000000',
    marginBottom: 10,
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
});

export interface RFQPDFData {
  code: string;
  issue_date: string;
  deadline: string;
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
    remarks?: string;
  }>;
  branding?: DocumentBranding;
}

const formatDateCN = (date: string) => {
  if (!date) return '-';
  const d = new Date(date);
  return `${d.getFullYear()}年${d.getMonth() + 1}月${d.getDate()}日`;
};


export const RFQPDF: React.FC<{ data: RFQPDFData }> = ({ data }) => {
  const branding = data.branding;
  const logoSrc = branding?.logoBase64 || branding?.logoPath;
  const stampSrc = branding?.stampBase64 || branding?.stampPath;
  const signatureSrc = branding?.signatureBase64;

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        
        {/* Original Header: Logo + Title */}
        <View style={styles.headerSection}>
          <View style={styles.logoSection}>
            {logoSrc && <Image src={logoSrc} style={styles.logo} />}
            {branding?.primaryOffice?.name && (
              <Text style={styles.companyName}>{branding.primaryOffice.name}</Text>
            )}
            <Text style={styles.websiteUrl}>{branding?.websiteUrl || 'www.example.com'}</Text>
          </View>
          <View style={styles.titleSection}>
            <Text style={styles.title}>询 价 单</Text>
            <Text style={styles.documentCode}>{data.code}</Text>
            <Text style={styles.documentDate}>日期: {formatDateCN(data.issue_date)}</Text>
            <Text style={styles.documentDate}>截止日期: {formatDateCN(data.deadline)}</Text>
          </View>
        </View>

        {/* Offices Section */}
        {branding && (
          <View style={styles.officesSection}>
            <View style={styles.officeBox}>
              <Text style={styles.officeLabel}>中国办公室</Text>
              <Text style={styles.officeText}>{branding.primaryOffice.address}</Text>
              {branding.primaryOffice.phone && (
                <Text style={styles.officeContact}>电话: {branding.primaryOffice.phone}</Text>
              )}
              {branding.primaryOffice.email && (
                <Text style={styles.officeContact}>邮箱: {branding.primaryOffice.email}</Text>
              )}
            </View>
            <View style={styles.officeBox}>
              <Text style={styles.officeLabel}>西班牙办公室</Text>
              <Text style={styles.officeText}>{branding.secondaryOffice.address}</Text>
              {branding.secondaryOffice.phone && (
                <Text style={styles.officeContact}>电话: {branding.secondaryOffice.phone}</Text>
              )}
              {branding.secondaryOffice.email && (
                <Text style={styles.officeContact}>邮箱: {branding.secondaryOffice.email}</Text>
              )}
            </View>
          </View>
        )}

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
            <View style={styles.colRemarks}>
              <Text style={styles.headerCell}>备注</Text>
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
              <View style={styles.colRemarks}>
                <Text style={styles.cell}>{item.remarks || '-'}</Text>
              </View>
            </View>
          ))}
        </View>

        {/* Special Requirements */}
        {data.remarks && (
          <View style={styles.specialRequirements}>
            <Text style={styles.specialTitle}>特殊要求</Text>
            <Text style={styles.specialText}>{data.remarks}</Text>
          </View>
        )}

        {/* Footer: Signature + Stamp */}
        <View style={styles.footerSection}>
          <View style={styles.signatureRow}>
            <View style={styles.signatureLeft}>
              <Text style={styles.signatureLabel}>签名:</Text>
              {signatureSrc ? (
                <Image src={signatureSrc} style={styles.signatureImage} />
              ) : (
                <View style={styles.signatureLine} />
              )}
              <View style={styles.signerInfoBox}>
                <Text style={styles.signerName}>
                  姓名: {branding?.signer?.name || '-'}
                </Text>
                <Text style={styles.signerTitle}>
                  职位: {branding?.signer?.title || '-'}
                </Text>
              </View>
            </View>
            <View style={styles.stampSection}>
              <Text style={styles.stampLabel}>（公司印章）</Text>
              {stampSrc ? (
                <Image src={stampSrc} style={styles.stamp} />
              ) : (
                <View style={styles.stampPlaceholder} />
              )}
            </View>
          </View>
        </View>
      </Page>
    </Document>
  );
};

export default RFQPDF;
