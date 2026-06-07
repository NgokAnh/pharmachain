import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { Header } from '../components/layout/Header';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';
import { toast } from 'sonner';
import { apiUrl } from '../config/api';
import {
  TrendingUp,
  Package,
  AlertTriangle,
  ShoppingCart,
  DollarSign,
} from 'lucide-react';
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';

export function Dashboard() {
  const { user, hasPermission } = useAuth();
  const isChainLevel = hasPermission('report.view_chain');

  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<any>(null);

  useEffect(() => {
    const loadStats = async () => {
      try {
        const token = localStorage.getItem('pharmacy_token');
        const response = await fetch(apiUrl('/dashboard/stats'), {
          headers: { Authorization: `Bearer ${token}` }
        });
        if (!response.ok) throw new Error('Không thể tải dữ liệu thống kê');
        const data = await response.json();
        setStats(data);
      } catch (err) {
        console.error(err);
        toast.error('Lỗi khi tải dữ liệu báo cáo thống kê.');
      } finally {
        setLoading(false);
      }
    };
    loadStats();
  }, []);

  if (loading) {
    return (
      <div>
        <Header
          title={isChainLevel ? 'Tổng quan toàn chuỗi' : 'Tổng quan chi nhánh'}
          subtitle="Đang tải dữ liệu..."
        />
        <div className="p-6 flex items-center justify-center">
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
            <p className="text-muted-foreground animate-pulse">Đang tổng hợp số liệu báo cáo thời gian thực...</p>
          </div>
        </div>
      </div>
    );
  }

  if (!stats) {
    return (
      <div>
        <Header
          title={isChainLevel ? 'Tổng quan toàn chuỗi' : 'Tổng quan chi nhánh'}
          subtitle="Lỗi dữ liệu"
        />
        <div className="p-6 text-center text-destructive">
          Không thể kết nối và tải thông tin báo cáo từ máy chủ API.
        </div>
      </div>
    );
  }

  const formatVND = (value: number) => {
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(value);
  };

  return (
    <div>
      <Header
        title={isChainLevel ? 'Tổng quan toàn chuỗi' : 'Tổng quan chi nhánh'}
        subtitle={
          isChainLevel
            ? 'Tổng hợp dữ liệu tất cả các chi nhánh'
            : `${user?.branchName} - Báo cáo hôm nay`
        }
      />

      <div className="p-6 space-y-6">
        {/* Key Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Doanh thu hôm nay</p>
                  <h3 className="text-2xl font-semibold mt-1">{formatVND(stats.metrics.revenueToday)}</h3>
                  <p className={`text-xs mt-1 flex items-center gap-1 ${stats.metrics.revenueGrowth >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                    <TrendingUp className={`h-3 w-3 ${stats.metrics.revenueGrowth < 0 ? 'rotate-180' : ''}`} />
                    {stats.metrics.revenueGrowth >= 0 ? '+' : ''}{stats.metrics.revenueGrowth.toFixed(1)}% so với hôm qua
                  </p>
                </div>
                <div className="h-12 w-12 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
                  <DollarSign className="h-6 w-6 text-blue-600 dark:text-blue-400" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Đơn hàng hôm nay</p>
                  <h3 className="text-2xl font-semibold mt-1">{stats.metrics.ordersToday}</h3>
                  <p className={`text-xs mt-1 flex items-center gap-1 ${stats.metrics.ordersGrowth >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                    <TrendingUp className={`h-3 w-3 ${stats.metrics.ordersGrowth < 0 ? 'rotate-180' : ''}`} />
                    {stats.metrics.ordersGrowth >= 0 ? '+' : ''}{stats.metrics.ordersGrowth.toFixed(1)}% so với hôm qua
                  </p>
                </div>
                <div className="h-12 w-12 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
                  <ShoppingCart className="h-6 w-6 text-green-600 dark:text-green-400" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Thuốc sắp hết</p>
                  <h3 className="text-2xl font-semibold mt-1">{stats.metrics.lowStockCount}</h3>
                  <p className="text-xs text-muted-foreground mt-1">Cần chú ý nhập thêm</p>
                </div>
                <div className="h-12 w-12 rounded-full bg-yellow-100 dark:bg-yellow-900/30 flex items-center justify-center">
                  <Package className="h-6 w-6 text-yellow-600 dark:text-yellow-400" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Sắp hết hạn</p>
                  <h3 className="text-2xl font-semibold mt-1">{stats.metrics.expiringCount}</h3>
                  <p className="text-xs text-orange-600 mt-1">Trong vòng 90 ngày</p>
                </div>
                <div className="h-12 w-12 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center">
                  <AlertTriangle className="h-6 w-6 text-red-600 dark:text-red-400" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Charts */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle>Xu hướng bán lẻ (7 ngày qua - VND)</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={stats.salesTrend}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" />
                  <YAxis />
                  <Tooltip formatter={(value: any) => formatVND(Number(value))} />
                  <Legend />
                  <Line
                    key="sales-line"
                    type="monotone"
                    name="Doanh số"
                    dataKey="sales"
                    stroke="hsl(var(--chart-1))"
                    strokeWidth={2}
                  />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Đơn hàng hàng ngày</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={stats.salesTrend}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Bar key="orders-bar" name="Số đơn" dataKey="orders" fill="hsl(var(--chart-2))" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </div>

        {/* Tables */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle>Sản phẩm bán chạy nhất (30 ngày qua)</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {stats.topProducts.length === 0 ? (
                  <div className="py-12 text-center text-muted-foreground">
                    Chưa phát sinh giao dịch bán lẻ nào trong 30 ngày qua.
                  </div>
                ) : (
                  stats.topProducts.map((product: any, index: number) => (
                    <div
                      key={index}
                      className="flex items-center justify-between p-3 bg-muted/30 rounded-lg"
                    >
                      <div className="flex-1">
                        <p className="font-medium">{product.name}</p>
                        <p className="text-sm text-muted-foreground">
                          Đã bán: {product.sold} đơn vị cơ sở
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="font-semibold text-primary">{formatVND(product.revenue)}</p>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Cảnh báo vận hành</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div>
                  <h4 className="text-sm font-semibold mb-2">Tồn kho thấp (Dưới 100 đơn vị cơ sở)</h4>
                  <div className="space-y-2">
                    {stats.lowStockItems.length === 0 ? (
                      <div className="text-sm text-muted-foreground p-2 bg-muted/10 rounded">
                        Tồn kho tất cả mặt hàng đang ở mức an toàn.
                      </div>
                    ) : (
                      stats.lowStockItems.map((item: any, index: number) => (
                        <div
                          key={index}
                          className="flex items-center justify-between p-2 bg-muted/30 rounded"
                        >
                          <span className="text-sm font-medium">{item.name}</span>
                          <Badge variant={item.status === 'danger' ? 'danger' : 'warning'}>
                            {item.stock} / {item.minStock}
                          </Badge>
                        </div>
                      ))
                    )}
                  </div>
                </div>

                <div>
                  <h4 className="text-sm font-semibold mb-2">Hàng hóa sắp hết hạn (Trong 90 ngày tới)</h4>
                  <div className="space-y-2">
                    {stats.expiringItems.length === 0 ? (
                      <div className="text-sm text-muted-foreground p-2 bg-muted/10 rounded">
                        Không có lô hàng nào sắp hết hạn.
                      </div>
                    ) : (
                      stats.expiringItems.map((item: any, index: number) => (
                        <div
                          key={index}
                          className="flex items-center justify-between p-2 bg-muted/30 rounded"
                        >
                          <div>
                            <p className="text-sm font-medium">{item.name}</p>
                            <p className="text-xs text-muted-foreground">Số lô: <span className="font-mono">{item.lot}</span> • HSD: {item.expiryDate}</p>
                          </div>
                          <Badge variant="warning">{item.daysLeft} ngày</Badge>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
