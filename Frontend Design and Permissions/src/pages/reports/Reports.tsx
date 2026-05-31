import { useState, useEffect } from 'react';
import { Header } from '../../components/layout/Header';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import {
  BarChart, Bar, LineChart, Line, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
} from 'recharts';
import {
  DollarSign, ShoppingBag, Users, Package, AlertTriangle,
  TrendingUp, RefreshCw, Clock,
} from 'lucide-react';
import { Button } from '../../components/ui/Button';

interface SummaryData {
  totalRevenue: number;
  totalOrders: number;
  totalDiscount: number;
  profitMargin: number;
  totalCustomers: number;
  totalInventoryItems: number;
  lowStockCount: number;
  expiringSoonCount: number;
}

interface SalesTrendItem {
  id: string;
  month: string;
  revenue: number;
  orders: number;
  profit: number;
}

interface TopMedicine {
  name: string;
  quantity: number;
  revenue: number;
}

interface CustomerStats {
  tierDistribution: { tier: string; label: string; count: number }[];
  topCustomers: {
    id: string;
    code: string;
    name: string;
    membershipTier: string;
    points: number;
    totalOrders: number;
  }[];
}

const TIER_COLORS: Record<string, string> = {
  bronze: '#CD7F32',
  silver: '#A8A9AD',
  gold: '#FFD700',
  platinum: '#00CED1',
};

const CHART_COLORS = ['#6366f1', '#8b5cf6', '#a855f7', '#c084fc', '#d8b4fe', '#e9d5ff', '#f3e8ff', '#818cf8', '#7c3aed', '#6d28d9'];

export function Reports() {
  const [summary, setSummary] = useState<SummaryData | null>(null);
  const [salesTrend, setSalesTrend] = useState<SalesTrendItem[]>([]);
  const [topMedicines, setTopMedicines] = useState<TopMedicine[]>([]);
  const [customerStats, setCustomerStats] = useState<CustomerStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchReports = async () => {
    setIsLoading(true);
    setError(null);

    try {
      const token = localStorage.getItem('pharmacy_token');
      if (!token) throw new Error('Phiên đăng nhập đã hết.');

      const headers = { Authorization: `Bearer ${token}` };

      const [summaryRes, trendRes, medsRes, custRes] = await Promise.all([
        fetch('http://localhost:3000/api/reports/summary', { headers }),
        fetch('http://localhost:3000/api/reports/sales-trend', { headers }),
        fetch('http://localhost:3000/api/reports/top-medicines', { headers }),
        fetch('http://localhost:3000/api/reports/customer-stats', { headers }),
      ]);

      if (!summaryRes.ok || !trendRes.ok || !medsRes.ok || !custRes.ok) {
        throw new Error('Không thể tải dữ liệu báo cáo.');
      }

      const [summaryData, trendData, medsData, custData] = await Promise.all([
        summaryRes.json(),
        trendRes.json(),
        medsRes.json(),
        custRes.json(),
      ]);

      setSummary(summaryData);
      setSalesTrend(trendData);
      setTopMedicines(medsData);
      setCustomerStats(custData);
    } catch (err: any) {
      const msg =
        err instanceof TypeError
          ? 'Không thể kết nối máy chủ.'
          : err.message || 'Lỗi tải báo cáo.';
      setError(msg);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchReports();
  }, []);

  const formatCurrency = (amount: number) => {
    return amount.toLocaleString('vi-VN') + 'đ';
  };

  if (isLoading) {
    return (
      <div>
        <Header title="Báo cáo" subtitle="Phân tích và thống kê kinh doanh" />
        <div className="flex items-center justify-center py-20">
          <RefreshCw className="h-6 w-6 animate-spin text-primary mr-3" />
          <span className="text-muted-foreground">Đang tải dữ liệu báo cáo...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div>
        <Header title="Báo cáo" subtitle="Phân tích và thống kê kinh doanh" />
        <div className="p-6 text-center">
          <p className="text-destructive font-medium mb-4">{error}</p>
          <Button onClick={fetchReports}>
            <RefreshCw className="h-4 w-4 mr-2" /> Thử lại
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div>
      <Header
        title="Báo cáo"
        subtitle="Phân tích và thống kê kinh doanh"
        actions={
          <Button variant="outline" onClick={fetchReports}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Tải lại
          </Button>
        }
      />

      <div className="p-6 space-y-6">
        {/* KPI Summary Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card className="p-5">
            <div className="flex items-center gap-3">
              <div className="h-12 w-12 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
                <DollarSign className="h-6 w-6 text-green-600 dark:text-green-400" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Tổng doanh thu</p>
                <h3 className="text-2xl font-bold">{formatCurrency(summary?.totalRevenue || 0)}</h3>
              </div>
            </div>
          </Card>

          <Card className="p-5">
            <div className="flex items-center gap-3">
              <div className="h-12 w-12 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
                <ShoppingBag className="h-6 w-6 text-blue-600 dark:text-blue-400" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Tổng đơn hàng</p>
                <h3 className="text-2xl font-bold">{(summary?.totalOrders || 0).toLocaleString()}</h3>
              </div>
            </div>
          </Card>

          <Card className="p-5">
            <div className="flex items-center gap-3">
              <div className="h-12 w-12 rounded-full bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center">
                <TrendingUp className="h-6 w-6 text-purple-600 dark:text-purple-400" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Tỷ suất lợi nhuận</p>
                <h3 className="text-2xl font-bold">{summary?.profitMargin || 0}%</h3>
              </div>
            </div>
          </Card>

          <Card className="p-5">
            <div className="flex items-center gap-3">
              <div className="h-12 w-12 rounded-full bg-yellow-100 dark:bg-yellow-900/30 flex items-center justify-center">
                <Users className="h-6 w-6 text-yellow-600 dark:text-yellow-400" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Tổng khách hàng</p>
                <h3 className="text-2xl font-bold">{(summary?.totalCustomers || 0).toLocaleString()}</h3>
              </div>
            </div>
          </Card>
        </div>

        {/* Inventory Alerts */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Card className="p-4">
            <div className="flex items-center gap-3">
              <Package className="h-5 w-5 text-muted-foreground" />
              <div>
                <p className="text-xs text-muted-foreground">Tổng tồn kho</p>
                <p className="text-lg font-semibold">{(summary?.totalInventoryItems || 0).toLocaleString()} đơn vị</p>
              </div>
            </div>
          </Card>
          <Card className="p-4 border-amber-200 dark:border-amber-800/40">
            <div className="flex items-center gap-3">
              <AlertTriangle className="h-5 w-5 text-amber-500" />
              <div>
                <p className="text-xs text-muted-foreground">Sắp hết hàng</p>
                <p className="text-lg font-semibold text-amber-600 dark:text-amber-400">{summary?.lowStockCount || 0} lô</p>
              </div>
            </div>
          </Card>
          <Card className="p-4 border-red-200 dark:border-red-800/40">
            <div className="flex items-center gap-3">
              <Clock className="h-5 w-5 text-red-500" />
              <div>
                <p className="text-xs text-muted-foreground">Sắp hết hạn (90 ngày)</p>
                <p className="text-lg font-semibold text-red-600 dark:text-red-400">{summary?.expiringSoonCount || 0} lô</p>
              </div>
            </div>
          </Card>
        </div>

        {/* Charts Row 1 */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle>Xu hướng doanh thu</CardTitle>
            </CardHeader>
            <CardContent>
              {salesTrend.length === 0 ? (
                <div className="h-[300px] flex items-center justify-center text-muted-foreground">
                  Chưa có dữ liệu bán hàng.
                </div>
              ) : (
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={salesTrend}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="month" />
                    <YAxis tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} />
                    <Tooltip formatter={(value: number) => formatCurrency(value)} />
                    <Legend />
                    <Line key="revenue-line" type="monotone" dataKey="revenue" name="Doanh thu" stroke="hsl(var(--chart-1))" strokeWidth={2} />
                    <Line key="profit-line" type="monotone" dataKey="profit" name="Lợi nhuận" stroke="hsl(var(--chart-2))" strokeWidth={2} />
                  </LineChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Đơn hàng theo tháng</CardTitle>
            </CardHeader>
            <CardContent>
              {salesTrend.length === 0 ? (
                <div className="h-[300px] flex items-center justify-center text-muted-foreground">
                  Chưa có dữ liệu bán hàng.
                </div>
              ) : (
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={salesTrend}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="month" />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Bar key="orders-bar" dataKey="orders" name="Đơn hàng" fill="hsl(var(--chart-3))" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Charts Row 2 */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Top Medicines */}
          <Card>
            <CardHeader>
              <CardTitle>Top thuốc bán chạy</CardTitle>
            </CardHeader>
            <CardContent>
              {topMedicines.length === 0 ? (
                <div className="h-[300px] flex items-center justify-center text-muted-foreground">
                  Chưa có dữ liệu.
                </div>
              ) : (
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={topMedicines} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis type="number" tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} />
                    <YAxis type="category" dataKey="name" width={140} tick={{ fontSize: 11 }} />
                    <Tooltip formatter={(value: number) => formatCurrency(value)} />
                    <Bar dataKey="revenue" name="Doanh thu" fill="hsl(var(--chart-1))" radius={[0, 4, 4, 0]}>
                      {topMedicines.map((_, index) => (
                        <Cell key={`cell-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>

          {/* Customer Tier Distribution */}
          <Card>
            <CardHeader>
              <CardTitle>Phân bố hạng khách hàng</CardTitle>
            </CardHeader>
            <CardContent>
              {!customerStats || customerStats.tierDistribution.length === 0 ? (
                <div className="h-[300px] flex items-center justify-center text-muted-foreground">
                  Chưa có dữ liệu khách hàng.
                </div>
              ) : (
                <div className="flex items-center gap-6">
                  <ResponsiveContainer width="50%" height={250}>
                    <PieChart>
                      <Pie
                        data={customerStats.tierDistribution}
                        dataKey="count"
                        nameKey="label"
                        cx="50%"
                        cy="50%"
                        outerRadius={90}
                        label={({ label, count }) => `${label}: ${count}`}
                      >
                        {customerStats.tierDistribution.map((entry) => (
                          <Cell key={entry.tier} fill={TIER_COLORS[entry.tier] || '#888'} />
                        ))}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="flex-1 space-y-3">
                    <h4 className="text-sm font-semibold text-muted-foreground">Top khách hàng</h4>
                    {customerStats.topCustomers.map((c) => (
                      <div key={c.id} className="flex items-center justify-between text-sm">
                        <div className="flex items-center gap-2 min-w-0">
                          <span className="font-medium truncate">{c.name}</span>
                          <Badge
                            variant={
                              c.membershipTier === 'platinum' ? 'success' :
                              c.membershipTier === 'gold' ? 'warning' :
                              c.membershipTier === 'silver' ? 'info' : 'default'
                            }
                            className="text-[9px] shrink-0"
                          >
                            {c.membershipTier.toUpperCase()}
                          </Badge>
                        </div>
                        <span className="text-muted-foreground shrink-0 ml-2">
                          {c.points.toLocaleString()} đ | {c.totalOrders} đơn
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
