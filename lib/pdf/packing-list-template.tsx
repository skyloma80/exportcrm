/**
 * Packing List PDF Template (English)
 * 装箱单 PDF 模板（英文）
 * 
 * Requirements: 4.2, 4.3, 4.4, 4.5
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
    marginBottom: 25,
    paddingBottom: 15,
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
    fontSize: 18,
    fontWeight: 'normal',
    color: '#000000',
    letterSpacing: 2,
    marginBottom: 5,
  },
  titleCn: {
    fontSize: 12,
    color: '#6b7280',
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
  partiesSection: {
    flexDirection: 'row',
    marginBottom: 20,
  },
  partyBox: {
    width: '50%',
  },
  partyBoxRight: {
    width: '50%',
    paddingLeft: 30,
  },
  partyLabel: {
    fontSize: 10,
    color: '#f97316',
    textTransform: 'capitalize',
    letterSpacing: 1,
    marginBottom: 6,
  },
  partyText: {
    fontSize: 9,
    color: '#000000',
    lineHeight: 1.5,
  },
  infoGrid: {
    flexDirection: 'row',
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: '#e5e7eb',
    paddingVertical: 10,
    marginBottom: 20,
  },
  infoBox: {
    flex: 1,
    paddingHorizontal: 8,
    borderRightWidth: 1,
    borderRightColor: '#e5e7eb',
  },
  infoBoxLast: {
    flex: 1,
    paddingHorizontal: 8,
  },
  infoLabel: {
    fontSize: 7,
    color: '#6b7280',
    textTransform: 'capitalize',
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  infoValue: {
    fontSize: 9,
    color: '#000000',
  },
  table: {
    marginBottom: 20,
  },
  tableHeader: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
    backgroundColor: '#f9fafb',
  },
  tableRow: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  colNo: { width: '5%', padding: 8 },
  colPartNo: { width: '12%', padding: 8 },
  colProduct: { width: '25%', padding: 8 },
  colQty: { width: '10%', padding: 8, textAlign: 'center' },
  colPkgs: { width: '10%', padding: 8, textAlign: 'center' },
  colGW: { width: '12%', padding: 8, textAlign: 'right' },
  colNW: { width: '12%', padding: 8, textAlign: 'right' },
  colDimensions: { width: '14%', padding: 8, textAlign: 'center' },
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
  summarySection: {
    flexDirection: 'row',
    borderTopWidth: 2,
    borderTopColor: '#e5e7eb',
    paddingTop: 15,
    marginBottom: 20,
  },
  summaryBox: {
    flex: 1,
    paddingHorizontal: 10,
    borderRightWidth: 1,
    borderRightColor: '#e5e7eb',
  },
  summaryBoxLast: {
    flex: 1,
    paddingHorizontal: 10,
  },
  summaryLabel: {
    fontSize: 8,
    color: '#6b7280',
    textTransform: 'capitalize',
    marginBottom: 4,
  },
  summaryValue: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#000000',
  },
  remarks: {
    marginTop: 15,
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
  footerSection: {
    marginTop: 40,
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
});

// Data structure based on design.md
export interface PackingListPDFData {
  code: string;                    // 装箱单号
  shipment_date: string;           // 发货日期
  shipment: {
    code: string;                  // 发货单号
    vessel_name?: string;          // 船名
    voyage_number?: string;        // 航次
    container_number?: string;     // 集装箱号
    container_type?: string;       // 集装箱类型
    bl_number?: string;            // 提单号
  };
  order: {
    code: string;                  // 订单号
  };
  shipper: {                       // 发货方（公司信息）
    name: string;
    address?: string;
  };
  consignee: {                     // 收货方（客户信息）
    name: string;
    address?: string;
  };
  items: Array<{                   // 产品明细 - Requirements: 4.2, 4.3
    product_code: string;          // 产品编码
    product_name: string;          // 产品名称
    part_number?: string;          // 零件号
    quantity: number;              // 数量
    unit: string;                  // 单位
    packages: number;              // 件数
    gross_weight: number;          // 毛重 (kg)
    net_weight: number;            // 净重 (kg)
    dimensions?: {                 // 尺寸 (cm)
      length: number;
      width: number;
      height: number;
    };
    volume?: number;               // 体积 (m³)
  }>;
  totals: {                        // 汇总 - Requirements: 4.4
    total_packages: number;        // 总件数
    total_gross_weight: number;    // 总毛重
    total_net_weight: number;      // 总净重
    total_volume?: number;         // 总体积
  };
  remarks?: string;                // 备注
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

const formatNumber = (num: number | undefined, decimals: number = 2) => {
  if (num === undefined || num === null) return '-';
  return num.toLocaleString('en-US', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
};

const formatDimensions = (dimensions?: { length: number; width: number; height: number }) => {
  if (!dimensions) return '-';
  return `${dimensions.length}×${dimensions.width}×${dimensions.height}`;
};

export const PackingListPDF: React.FC<{ data: PackingListPDFData }> = ({ data }) => {
  const branding = data.branding;
  const logoSrc = branding?.logoBase64 || branding?.logoPath;
  const stampSrc = branding?.stampBase64 || branding?.stampPath;
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
            <Text style={styles.title}>PACKING LIST</Text>
            <Text style={styles.titleCn}>装箱单</Text>
            <Text style={styles.documentCode}>{data.code}</Text>
            <Text style={styles.documentDate}>Date: {formatDate(data.shipment_date)}</Text>
          </View>
        </View>

        {/* Shipper / Consignee Section - Requirements: 4.2 */}
        <View style={styles.partiesSection}>
          <View style={styles.partyBox}>
            <Text style={styles.partyLabel}>Shipper / 发货方</Text>
            <Text style={styles.partyText}>{data.shipper.name}</Text>
            {data.shipper.address && (
              <Text style={styles.partyText}>{data.shipper.address}</Text>
            )}
          </View>
          <View style={styles.partyBoxRight}>
            <Text style={styles.partyLabel}>Consignee / 收货方</Text>
            <Text style={styles.partyText}>{data.consignee.name}</Text>
            {data.consignee.address && (
              <Text style={styles.partyText}>{data.consignee.address}</Text>
            )}
          </View>
        </View>

        {/* Shipping Details Grid - Requirements: 4.2 */}
        <View style={styles.infoGrid}>
          <View style={styles.infoBox}>
            <Text style={styles.infoLabel}>Packing List No.</Text>
            <Text style={styles.infoValue}>{data.code}</Text>
          </View>
          <View style={styles.infoBox}>
            <Text style={styles.infoLabel}>Order No.</Text>
            <Text style={styles.infoValue}>{data.order.code}</Text>
          </View>
          <View style={styles.infoBox}>
            <Text style={styles.infoLabel}>Vessel / Voyage</Text>
            <Text style={styles.infoValue}>
              {data.shipment.vessel_name || '-'} {data.shipment.voyage_number ? `V.${data.shipment.voyage_number}` : ''}
            </Text>
          </View>
          <View style={styles.infoBoxLast}>
            <Text style={styles.infoLabel}>B/L No.</Text>
            <Text style={styles.infoValue}>{data.shipment.bl_number || '-'}</Text>
          </View>
        </View>

        <View style={styles.infoGrid}>
          <View style={styles.infoBox}>
            <Text style={styles.infoLabel}>Shipment No.</Text>
            <Text style={styles.infoValue}>{data.shipment.code}</Text>
          </View>
          <View style={styles.infoBox}>
            <Text style={styles.infoLabel}>Container No.</Text>
            <Text style={styles.infoValue}>{data.shipment.container_number || '-'}</Text>
          </View>
          <View style={styles.infoBox}>
            <Text style={styles.infoLabel}>Container Type</Text>
            <Text style={styles.infoValue}>{data.shipment.container_type || '-'}</Text>
          </View>
          <View style={styles.infoBoxLast}>
            <Text style={styles.infoLabel}>Date</Text>
            <Text style={styles.infoValue}>{formatDate(data.shipment_date)}</Text>
          </View>
        </View>

        {/* Items Table - Requirements: 4.2, 4.3 */}
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
            <View style={styles.colPkgs}>
              <Text style={styles.headerCell}>Pkgs</Text>
            </View>
            <View style={styles.colGW}>
              <Text style={styles.headerCell}>G.W (kg)</Text>
            </View>
            <View style={styles.colNW}>
              <Text style={styles.headerCell}>N.W (kg)</Text>
            </View>
            <View style={styles.colDimensions}>
              <Text style={styles.headerCell}>L×W×H (cm)</Text>
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
              <View style={styles.colPkgs}>
                <Text style={styles.cell}>{item.packages || 0}</Text>
              </View>
              <View style={styles.colGW}>
                <Text style={styles.cell}>{formatNumber(item.gross_weight)}</Text>
              </View>
              <View style={styles.colNW}>
                <Text style={styles.cell}>{formatNumber(item.net_weight)}</Text>
              </View>
              <View style={styles.colDimensions}>
                <Text style={styles.cell}>{formatDimensions(item.dimensions)}</Text>
              </View>
            </View>
          ))}
        </View>

        {/* Summary Section - Requirements: 4.4 */}
        <View style={styles.summarySection}>
          <View style={styles.summaryBox}>
            <Text style={styles.summaryLabel}>Total Packages / 总件数</Text>
            <Text style={styles.summaryValue}>{data.totals.total_packages} PKGS</Text>
          </View>
          <View style={styles.summaryBox}>
            <Text style={styles.summaryLabel}>Total Gross Weight / 总毛重</Text>
            <Text style={styles.summaryValue}>{formatNumber(data.totals.total_gross_weight)} KGS</Text>
          </View>
          <View style={styles.summaryBox}>
            <Text style={styles.summaryLabel}>Total Net Weight / 总净重</Text>
            <Text style={styles.summaryValue}>{formatNumber(data.totals.total_net_weight)} KGS</Text>
          </View>
          <View style={styles.summaryBoxLast}>
            <Text style={styles.summaryLabel}>Total Volume / 总体积</Text>
            <Text style={styles.summaryValue}>
              {data.totals.total_volume ? `${formatNumber(data.totals.total_volume, 3)} CBM` : '-'}
            </Text>
          </View>
        </View>

        {/* Remarks */}
        {data.remarks && (
          <View style={styles.remarks}>
            <Text style={styles.remarksTitle}>Remarks / 备注</Text>
            <Text style={styles.remarksText}>{data.remarks}</Text>
          </View>
        )}

        {/* Footer: Signature + Stamp */}
        <View style={styles.footerSection} wrap={false}>
          <View style={styles.signatureRow}>
            <View style={styles.signatureLeft}>
              <Text style={styles.signatureLabel}>Prepared by:</Text>
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
      </Page>
    </Document>
  );
};

export default PackingListPDF;
