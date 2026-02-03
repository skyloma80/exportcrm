/**
 * PDF 生成 Hook
 * 支持下载到本地或上传到网盘
 */

'use client';

import { useState, useCallback, useEffect } from 'react';
import { pdf } from '@react-pdf/renderer';
import { registerFonts } from '@/lib/pdf/fonts';

// 注册字体（只执行一次）
let fontsRegistered = false;

export function usePdfGenerator() {
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // 确保字体已注册
  useEffect(() => {
    if (!fontsRegistered) {
      try {
        registerFonts();
        fontsRegistered = true;
        console.log('[PDF Generator] Fonts registered successfully');
      } catch (err) {
        console.error('[PDF Generator] Font registration failed:', err);
      }
    }
  }, []);

  /**
   * 生成 PDF Blob
   */
  const generatePdfBlob = useCallback(async (document: any): Promise<Blob> => {
    setIsGenerating(true);
    setError(null);
    
    try {
      const blob = await pdf(document).toBlob();
      return blob;
    } catch (err: any) {
      setError(err.message || 'PDF 生成失败');
      throw err;
    } finally {
      setIsGenerating(false);
    }
  }, []);

  /**
   * 下载 PDF 到本地
   */
  const downloadPdf = useCallback(async (document: any, filename: string) => {
    try {
      console.log('[PDF Generator] Starting PDF generation for download:', filename);
      const blob = await generatePdfBlob(document);
      console.log('[PDF Generator] PDF blob generated, size:', blob.size);
      
      // 创建下载链接
      const url = URL.createObjectURL(blob);
      const link = window.document.createElement('a');
      link.href = url;
      link.download = filename.endsWith('.pdf') ? filename : `${filename}.pdf`;
      window.document.body.appendChild(link);
      link.click();
      window.document.body.removeChild(link);
      URL.revokeObjectURL(url);
      
      console.log('[PDF Generator] PDF download triggered successfully');
      return true;
    } catch (err: any) {
      console.error('[PDF Generator] Download failed:', err);
      console.error('[PDF Generator] Error stack:', err.stack);
      return false;
    }
  }, [generatePdfBlob]);

  /**
   * 上传 PDF 到网盘
   */
  const uploadPdfToDisk = useCallback(async (
    document: any, 
    filename: string,
    folder?: string
  ): Promise<{ success: boolean; fileId?: string; error?: string }> => {
    try {
      const blob = await generatePdfBlob(document);
      
      // 创建 FormData
      const formData = new FormData();
      const pdfFilename = filename.endsWith('.pdf') ? filename : `${filename}.pdf`;
      const file = new File([blob], pdfFilename, {
        type: 'application/pdf',
      });
      formData.append('file', file);
      
      // 使用 customPath 来避免添加时间戳前缀
      if (folder) {
        const fullPath = `${folder.replace(/^\/|\/$/g, '')}/${pdfFilename}`;
        formData.append('path', fullPath);
      }

      // 上传到 disk API
      const response = await fetch('/api/disk/upload', {
        method: 'POST',
        body: formData,
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || '上传失败');
      }

      return { success: true, fileId: result.id };
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  }, [generatePdfBlob]);

  return {
    isGenerating,
    error,
    generatePdfBlob,
    downloadPdf,
    uploadPdfToDisk,
  };
}

export default usePdfGenerator;
