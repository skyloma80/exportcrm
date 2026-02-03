import { defineConfig, devices } from '@playwright/test';

/**
 * Playwright 配置文件
 * 用于 ExportCRM 系统的 UI 页面可访问性测试
 * 
 * Requirements: 4.1, 4.2, 4.3
 */
export default defineConfig({
  // 测试目录
  testDir: './e2e/tests',

  // 全局超时设置
  timeout: 30000,

  // 期望超时
  expect: {
    timeout: 5000,
  },

  // 完全并行运行测试
  fullyParallel: true,

  // 禁止在 CI 上使用 test.only
  forbidOnly: !!process.env.CI,

  // 失败重试次数
  retries: process.env.CI ? 2 : 0,

  // 并行工作进程数
  workers: process.env.CI ? 1 : undefined,

  // 报告配置
  reporter: [
    ['list'],
    ['html', { outputFolder: 'playwright-report', open: 'never' }],
    ['json', { outputFile: 'playwright-report/results.json' }],
  ],

  // 全局设置
  use: {
    // 基础 URL
    baseURL: process.env.BASE_URL || 'http://localhost:3000',

    // 收集失败测试的跟踪信息
    trace: 'on-first-retry',

    // 失败时截图
    screenshot: 'only-on-failure',

    // 视频录制（仅在失败时保留）
    video: 'retain-on-failure',

    // 忽略 HTTPS 错误
    ignoreHTTPSErrors: true,

    // 视口大小
    viewport: { width: 1280, height: 720 },
  },

  // 项目配置 - 仅使用 Chromium
  projects: [
    // 认证设置项目
    {
      name: 'setup',
      testMatch: /.*\.setup\.ts/,
    },
    // 公开页面测试 - 无需认证
    {
      name: 'public-pages',
      testMatch: /public-pages\.spec\.ts/,
      use: {
        ...devices['Desktop Chrome'],
        channel: 'chrome',
      },
      // 公开页面不需要认证设置
    },
    // Chromium 测试 - 需要认证的页面
    {
      name: 'chromium',
      testIgnore: /public-pages\.spec\.ts/,
      use: {
        ...devices['Desktop Chrome'],
        channel: 'chrome',  // 使用系统安装的 Chrome，无需下载
      },
      dependencies: ['setup'],
    },
  ],

  // 输出目录
  outputDir: 'test-results/',

  // 开发服务器配置（可选）
  // webServer: {
  //   command: 'npm run dev',
  //   url: 'http://localhost:3000',
  //   reuseExistingServer: !process.env.CI,
  //   timeout: 120000,
  // },
});
