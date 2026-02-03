import { NextRequest, NextResponse } from 'next/server';
import { exchangeRateService } from '@/lib/services/exchange-rate';

/**
 * POST /api/exchange-rates/refresh
 * 手动刷新汇率数据（从外部 API 获取最新汇率）
 */
export async function POST(request: NextRequest) {
  try {
    const result = await exchangeRateService.refreshRates();
    
    if (!result.success) {
      return NextResponse.json({
        success: false,
        error: result.error || '更新汇率失败',
      }, { status: 500 });
    }
    
    return NextResponse.json({
      success: true,
      message: '汇率已更新',
      source: result.source,
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    console.error('Failed to refresh exchange rates:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: error.message || '更新汇率失败' 
      },
      { status: 500 }
    );
  }
}

/**
 * GET /api/exchange-rates/refresh
 * 获取 Dashboard 汇率数据（USD, EUR, GBP 基于 CNY）
 */
export async function GET() {
  try {
    const { rates, needsUpdate } = await exchangeRateService.getDashboardRates();
    
    return NextResponse.json({
      success: true,
      base: 'CNY',
      rates,
      needsUpdate,
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    console.error('Failed to get exchange rates:', error);
    
    // 返回默认汇率作为回退
    return NextResponse.json({
      success: false,
      base: 'CNY',
      rates: [
        { currency: 'USD', rate: 0.137, change1d: null, updatedAt: null },
        { currency: 'EUR', rate: 0.126, change1d: null, updatedAt: null },
        { currency: 'GBP', rate: 0.108, change1d: null, updatedAt: null },
      ],
      needsUpdate: true,
      error: error.message || '获取汇率失败',
    });
  }
}
