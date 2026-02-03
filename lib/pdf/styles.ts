/**
 * PDF 通用样式
 */

import { StyleSheet } from '@react-pdf/renderer';
import { defaultFontFamily } from './fonts';

export const commonStyles = StyleSheet.create({
  page: {
    fontFamily: defaultFontFamily,
    fontSize: 10,
    padding: 40,
    backgroundColor: '#ffffff',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 30,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1f2937',
  },
  subtitle: {
    fontSize: 12,
    color: '#6b7280',
    marginTop: 4,
  },
  infoGrid: {
    flexDirection: 'row',
    gap: 20,
    marginBottom: 20,
  },
  infoBox: {
    flex: 1,
    backgroundColor: '#f9fafb',
    padding: 12,
    borderRadius: 4,
  },
  infoLabel: {
    fontSize: 8,
    color: '#6b7280',
    textTransform: 'uppercase',
    marginBottom: 4,
  },
  infoValue: {
    fontSize: 11,
    fontWeight: 'bold',
  },
  infoSubtext: {
    fontSize: 9,
    color: '#6b7280',
    marginTop: 2,
  },
  table: {
    marginTop: 20,
    marginBottom: 20,
  },
  tableHeader: {
    flexDirection: 'row',
    backgroundColor: '#f3f4f6',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  tableRow: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  tableCell: {
    padding: 8,
    fontSize: 9,
  },
  tableCellHeader: {
    padding: 10,
    fontSize: 9,
    fontWeight: 'bold',
  },
  totalRow: {
    flexDirection: 'row',
    backgroundColor: '#f9fafb',
    borderTopWidth: 2,
    borderTopColor: '#e5e7eb',
  },
  footer: {
    marginTop: 30,
    paddingTop: 20,
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
  },
  footerText: {
    fontSize: 8,
    color: '#6b7280',
  },
  remarks: {
    marginTop: 20,
  },
  remarksTitle: {
    fontSize: 11,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  remarksText: {
    fontSize: 9,
    color: '#4b5563',
    lineHeight: 1.5,
  },
});
