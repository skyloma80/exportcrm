"use client"

/**
 * Dashboard Tabs Component
 * 
 * Tabbed interface for displaying different data lists
 */

import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table"
import { useRouter } from "next/navigation"
import { useI18n } from "@/lib/i18n/use-i18n"
import { 
  TabType, 
  OrderSummary, 
  PaymentSummary, 
  ShipmentSummary 
} from "@/lib/dashboard/types"
import { getTabItemUrl } from "@/lib/dashboard/utils"
import { 
  CheckCircle2, 
  Clock, 
  AlertTriangle,
  Truck,
  DollarSign,
  ShoppingCart,
  ListTodo
} from "lucide-react"

export interface DashboardTabsProps {
  activeTab: TabType;
  onTabChange: (tab: TabType) => void;
  orders: OrderSummary[];
  payments: PaymentSummary[];
  shipments: ShipmentSummary[];
  loading?: boolean;
}

const MAX_ITEMS = 10;

export function DashboardTabs({
  activeTab,
  onTabChange,
  orders,
  payments,
  shipments,
  loading = false,
}: DashboardTabsProps) {
  const router = useRouter();
  const { locale } = useI18n();
  const isZh = locale === 'zh';

  const handleRowClick = (tabType: TabType, itemId: string) => {
    const url = getTabItemUrl(tabType, itemId);
    router.push(url);
  };

  const getPriorityBadge = (priority: string) => {
    const variants: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
      urgent: "destructive",
      high: "destructive",
      medium: "default",
      low: "secondary",
    };
    return (
      <Badge variant={variants[priority] || "outline"}>
        {isZh ? { urgent: '紧急', high: '高', medium: '中', low: '低' }[priority] : priority}
      </Badge>
    );
  };

  const getStatusBadge = (status: string) => {
    const statusMap: Record<string, { variant: "default" | "secondary" | "destructive" | "outline"; labelZh: string }> = {
      pending: { variant: "outline", labelZh: "待处理" },
      in_progress: { variant: "default", labelZh: "进行中" },
      draft: { variant: "outline", labelZh: "草稿" },
      confirmed: { variant: "default", labelZh: "已确认" },
      shipped: { variant: "secondary", labelZh: "已发货" },
      preparing: { variant: "outline", labelZh: "准备中" },
      in_transit: { variant: "default", labelZh: "运输中" },
    };
    const config = statusMap[status] || { variant: "outline" as const, labelZh: status };
    return (
      <Badge variant={config.variant}>
        {isZh ? config.labelZh : status}
      </Badge>
    );
  };

  const formatDate = (dateStr?: string) => {
    if (!dateStr) return '-';
    return new Date(dateStr).toLocaleDateString(isZh ? 'zh-CN' : 'en-US');
  };

  const formatCurrency = (amount: number, currency: string = 'USD') => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      currencyDisplay: 'narrowSymbol',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  if (loading) {
    return (
      <Card>
        <CardHeader className="pb-2">
          <Skeleton className="h-10 w-full" />
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {[...Array(5)].map((_, i) => (
              <Skeleton key={i} className="h-12 w-full" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <Tabs value={activeTab} onValueChange={(v) => onTabChange(v as TabType)}>
        <CardHeader className="pb-2">
          <TabsList className="grid w-full grid-cols-4">

            <TabsTrigger value="orders" className="flex items-center gap-1">
              <ShoppingCart className="h-4 w-4" />
              <span className="hidden sm:inline">{isZh ? '近期订单' : 'Orders'}</span>
            </TabsTrigger>
            <TabsTrigger value="payments" className="flex items-center gap-1">
              <DollarSign className="h-4 w-4" />
              <span className="hidden sm:inline">{isZh ? '待收款' : 'Payments'}</span>
              {payments.length > 0 && (
                <Badge variant="secondary" className="ml-1 h-5 px-1.5">
                  {payments.length}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="shipments" className="flex items-center gap-1">
              <Truck className="h-4 w-4" />
              <span className="hidden sm:inline">{isZh ? '发货' : 'Shipments'}</span>
            </TabsTrigger>
          </TabsList>
        </CardHeader>
        <CardContent>

          <TabsContent value="orders" className="mt-0">
            <OrdersTable 
              orders={orders.slice(0, MAX_ITEMS)} 
              onRowClick={(id) => handleRowClick('orders', id)}
              isZh={isZh}
              getStatusBadge={getStatusBadge}
              formatCurrency={formatCurrency}
              formatDate={formatDate}
            />
          </TabsContent>
          <TabsContent value="payments" className="mt-0">
            <PaymentsTable 
              payments={payments.slice(0, MAX_ITEMS)} 
              onRowClick={(id) => handleRowClick('payments', id)}
              isZh={isZh}
              formatCurrency={formatCurrency}
              formatDate={formatDate}
            />
          </TabsContent>
          <TabsContent value="shipments" className="mt-0">
            <ShipmentsTable 
              shipments={shipments.slice(0, MAX_ITEMS)} 
              onRowClick={(id) => handleRowClick('shipments', id)}
              isZh={isZh}
              getStatusBadge={getStatusBadge}
              formatDate={formatDate}
            />
          </TabsContent>
        </CardContent>
      </Tabs>
    </Card>
  );
}


// ============================================================================
// Sub-components for each tab
// ============================================================================

interface OrdersTableProps {
  orders: OrderSummary[];
  onRowClick: (id: string) => void;
  isZh: boolean;
  getStatusBadge: (status: string) => React.ReactNode;
  formatCurrency: (amount: number, currency: string) => string;
  formatDate: (date?: string) => string;
}

function OrdersTable({ orders, onRowClick, isZh, getStatusBadge, formatCurrency, formatDate }: OrdersTableProps) {
  if (orders.length === 0) {
    return (
      <div className="py-8 text-center text-muted-foreground">
        {isZh ? '暂无订单' : 'No orders'}
      </div>
    );
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>{isZh ? '订单号' : 'Order #'}</TableHead>
          <TableHead>{isZh ? '客户' : 'Customer'}</TableHead>
          <TableHead>{isZh ? '金额' : 'Amount'}</TableHead>
          <TableHead>{isZh ? '状态' : 'Status'}</TableHead>
          <TableHead>{isZh ? '日期' : 'Date'}</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {orders.map((order) => (
          <TableRow 
            key={order.id} 
            className="cursor-pointer hover:bg-muted/50"
            onClick={() => onRowClick(order.id)}
          >
            <TableCell className="font-medium">{order.code}</TableCell>
            <TableCell>{order.customerName || '-'}</TableCell>
            <TableCell>{formatCurrency(order.total_amount, order.currency)}</TableCell>
            <TableCell>{getStatusBadge(order.status)}</TableCell>
            <TableCell>{formatDate(order.created)}</TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}

interface PaymentsTableProps {
  payments: PaymentSummary[];
  onRowClick: (id: string) => void;
  isZh: boolean;
  formatCurrency: (amount: number, currency: string) => string;
  formatDate: (date?: string) => string;
}

function PaymentsTable({ payments, onRowClick, isZh, formatCurrency, formatDate }: PaymentsTableProps) {
  if (payments.length === 0) {
    return (
      <div className="py-8 text-center text-muted-foreground">
        {isZh ? '暂无待收款项' : 'No pending payments'}
      </div>
    );
  }

  const typeLabels: Record<string, string> = {
    deposit: isZh ? '预付款' : 'Deposit',
    progress: isZh ? '进度款' : 'Progress',
    final: isZh ? '尾款' : 'Final',
  };

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>{isZh ? '订单' : 'Order'}</TableHead>
          <TableHead>{isZh ? '客户' : 'Customer'}</TableHead>
          <TableHead>{isZh ? '类型' : 'Type'}</TableHead>
          <TableHead>{isZh ? '金额' : 'Amount'}</TableHead>
          <TableHead>{isZh ? '日期' : 'Date'}</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {payments.map((payment) => (
          <TableRow 
            key={payment.id} 
            className="cursor-pointer hover:bg-muted/50"
            onClick={() => onRowClick(payment.id)}
          >
            <TableCell className="font-medium">{payment.orderCode || '-'}</TableCell>
            <TableCell>{payment.customerName || '-'}</TableCell>
            <TableCell>{typeLabels[payment.type] || payment.type}</TableCell>
            <TableCell>{formatCurrency(payment.amount, payment.currency)}</TableCell>
            <TableCell>{formatDate(payment.payment_date)}</TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}

interface ShipmentsTableProps {
  shipments: ShipmentSummary[];
  onRowClick: (id: string) => void;
  isZh: boolean;
  getStatusBadge: (status: string) => React.ReactNode;
  formatDate: (date?: string) => string;
}

function ShipmentsTable({ shipments, onRowClick, isZh, getStatusBadge, formatDate }: ShipmentsTableProps) {
  if (shipments.length === 0) {
    return (
      <div className="py-8 text-center text-muted-foreground">
        {isZh ? '暂无发货记录' : 'No shipments'}
      </div>
    );
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>{isZh ? '发货单号' : 'Shipment #'}</TableHead>
          <TableHead>{isZh ? '订单' : 'Order'}</TableHead>
          <TableHead>{isZh ? '客户' : 'Customer'}</TableHead>
          <TableHead>{isZh ? '状态' : 'Status'}</TableHead>
          <TableHead>{isZh ? '预计发货' : 'ETD'}</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {shipments.map((shipment) => (
          <TableRow 
            key={shipment.id} 
            className="cursor-pointer hover:bg-muted/50"
            onClick={() => onRowClick(shipment.id)}
          >
            <TableCell className="font-medium">{shipment.code}</TableCell>
            <TableCell>{shipment.orderCode || '-'}</TableCell>
            <TableCell>{shipment.customerName || '-'}</TableCell>
            <TableCell>{getStatusBadge(shipment.status)}</TableCell>
            <TableCell>{formatDate(shipment.etd)}</TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}

export default DashboardTabs;
