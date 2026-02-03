/**
 * PDF 字体配置
 * 使用思源黑体支持中文
 */

import { Font } from '@react-pdf/renderer';

// 标记是否已注册
let fontsRegistered = false;

// 注册字体
export function registerFonts() {
  if (fontsRegistered) return;
  
  try {
    // 注册思源黑体（中文字体）
    Font.register({
      family: 'SourceHanSans',
      fonts: [
        {
          src: '/fonts/SourceHanSansCN-Regular.otf',
          fontWeight: 'normal',
        },
        {
          src: '/fonts/SourceHanSansCN-Bold.otf',
          fontWeight: 'bold',
        },
      ],
    });

    // 注册阿里巴巴普惠体（备用）
    Font.register({
      family: 'AlibabaPuHuiTi',
      src: '/fonts/AlibabaPuHuiTi-3-55-Regular.ttf',
    });

    fontsRegistered = true;
  } catch (error) {
    console.error('Failed to register fonts:', error);
  }
}

// 默认字体族 - 使用内置 Helvetica
export const defaultFontFamily = 'Helvetica';

// 中文字体族 - 使用思源黑体
export const chineseFontFamily = 'SourceHanSans';
