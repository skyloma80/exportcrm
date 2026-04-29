# 订单系统重构设计 - 移除项目依赖

## 背景
当前系统将采购订单(PO)、销售订单(SO)、报价单(RFQ/Quotation)与项目(Project)强制关联，导致：
1. 页面加载失败（404错误）
2. 用户无法独立编辑订单
3. 发邮件时自动生成PDF，用户无法自定义

## 目标
1. 移除销售订单与项目的强制关联
2. 移除采购订单与项目的强制关联  
3. 移除报价单转订单功能
4. PO/SO/PI发送邮件改为手动上传PDF附件，不再自动生成

---

## 修改范围

### 1. 数据模型修改

#### 1.1 销售订单 (orders)
- **移除字段**: `project`（可选，但当前强制关联）
- **API修改**: 查询时不再expand项目信息
- **页面修改**: 移除项目相关显示和操作

#### 1.2 采购订单 (purchase_orders)  
- **移除字段**: `project`（如存在）
- **API修改**: 查询时不再expand项目信息
- **页面修改**: 移除项目相关显示和操作

#### 1.3 报价单转订单功能
- **移除功能**: 从报价单创建销售订单的入口和逻辑
- **移除菜单**: 项目详情页的"从报价单创建订单"按钮

### 2. 前端页面修改

#### 2.1 销售订单页面
- `app/(authenticated)/orders/page.tsx`: 移除项目筛选列
- `app/(authenticated)/orders/[id]/page.tsx`: 移除项目相关信息
- `app/(authenticated)/orders/[id]/edit/page.tsx`: 移除项目强制要求

#### 2.2 采购订单页面
- `app/(authenticated)/purchase-orders/page.tsx`: 移除项目筛选列
- `app/(authenticated)/purchase-orders/[id]/page.tsx`: 移除项目相关信息
- `app/(authenticated)/purchase-orders/[id]/edit/page.tsx`: 移除项目强制要求

#### 2.3 项目详情页
- `app/(authenticated)/projects/[id]/page.tsx`:
  - 移除订单Tab中的销售订单和采购订单
  - 移除"从报价单创建订单"功能

### 3. 邮件发送修改

#### 3.1 发送PO邮件
- `components/purchase-orders/send-po-email-dialog.tsx`:
  - 移除PDF自动生成逻辑
  - 改为文件上传组件，让用户手动选择PDF文件

#### 3.2 发送SO邮件  
- `app/(authenticated)/orders/[id]/send-email/page.tsx`:
  - 如有PDF生成逻辑，改为文件上传

#### 3.3 发送PI邮件
- `app/(authenticated)/orders/[id]/send-email/page.tsx` 或相关组件:
  - 移除PDF自动生成
  - 改为手动上传

### 4. Excel导出（保持不变）
- PI导出已改为使用 `PO-template.xlsx`（通过excelPoService）
- PO导出使用 `PO-template.xlsx`
- 保持现有逻辑，用户可手动上传Excel到网盘

---

## 实现步骤

### Phase 1: 销售订单移除项目依赖
1. 修改订单详情页，移除项目相关信息显示
2. 修改订单列表，移除项目筛选列
3. 修改订单编辑页，移除项目参数强制要求
4. 修改订单API，移除project expand

### Phase 2: 采购订单移除项目依赖
1. 修改采购订单详情页，移除项目相关信息
2. 修改采购订单列表，移除项目筛选列  
3. 修改采购订单编辑页，移除项目参数强制要求
4. 修改采购订单API，移除project expand

### Phase 3: 移除报价单转订单功能
1. 移除项目详情页的"从报价单创建订单"按钮
2. 移除相关API和hook

### Phase 4: 邮件发送改为手动上传
1. 修改PO发送邮件对话框，改为文件上传
2. 修改SO发送邮件逻辑
3. 修改PI发送邮件逻辑

---

## 待确认问题

1. **数据库字段是否删除？** 
   - 当前 PocketBase 中 orders.project 和 purchase_orders.project 字段是否保留（设为可选）？
   - 还是直接删除字段？

2. **历史数据如何处理？**
   - 现有的订单数据是否需要清除项目关联？

3. **邮件附件格式确认：**
   - 是否只支持PDF？还是也支持Excel？