import { useState } from 'react';
import { Header } from '../../components/layout/Header';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/Card';
import { Select } from '../../components/ui/Select';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { Download, Calendar } from 'lucide-react';

const salesData = [
  { id: 'jan', month: 'Jan', revenue: 125000, orders: 450, profit: 35000 },
  { id: 'feb', month: 'Feb', revenue: 142000, orders: 520, profit: 42000 },
  { id: 'mar', month: 'Mar', revenue: 158000, orders: 580, profit: 48000 },
  { id: 'apr', month: 'Apr', revenue: 168000, orders: 610, profit: 52000 },
  { id: 'may', month: 'May', revenue: 175000, orders: 640, profit: 55000 },
];

export function Reports() {
  const [reportType, setReportType] = useState('sales');
  const [dateRange, setDateRange] = useState('month');

  return (
    <div>
      <Header
        title="Báo cáo"
        subtitle="Phân tích và thống kê kinh doanh"
        actions={
          <Button variant="outline">
            <Download className="h-4 w-4 mr-2" />
            Xuất file
          </Button>
        }
      />

      <div className="p-6 space-y-6">
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Bộ lọc báo cáo</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <Select
                label="Loại báo cáo"
                value={reportType}
                onChange={(e) => setReportType(e.target.value)}
                options={[
                  { value: 'sales', label: 'Báo cáo bán hàng' },
                  { value: 'inventory', label: 'Báo cáo tồn kho' },
                  { value: 'customer', label: 'Báo cáo khách hàng' },
                  { value: 'profit', label: 'Lãi lỗ' },
                ]}
              />
              <Select
                label="Khoảng thời gian"
                value={dateRange}
                onChange={(e) => setDateRange(e.target.value)}
                options={[
                  { value: 'day', label: 'Theo ngày' },
                  { value: 'week', label: 'Theo tuần' },
                  { value: 'month', label: 'Theo tháng' },
                  { value: 'year', label: 'Theo năm' },
                ]}
              />
              <Input label="Từ ngày" type="date" />
              <Input label="Đến ngày" type="date" />
            </div>
          </CardContent>
        </Card>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card>
            <CardContent className="pt-6">
              <div>
                <p className="text-sm text-muted-foreground">Tổng doanh thu</p>
                <h3 className="text-3xl font-semibold mt-1">$768,000</h3>
                <p className="text-xs text-green-600 mt-1">+18.5% so với kỳ trước</p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div>
                <p className="text-sm text-muted-foreground">Tổng đơn hàng</p>
                <h3 className="text-3xl font-semibold mt-1">2,800</h3>
                <p className="text-xs text-green-600 mt-1">+12.3% so với kỳ trước</p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div>
                <p className="text-sm text-muted-foreground">Tỷ suất lợi nhuận</p>
                <h3 className="text-3xl font-semibold mt-1">30.2%</h3>
                <p className="text-xs text-green-600 mt-1">+2.1% so với kỳ trước</p>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle>Xu hướng doanh thu</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={salesData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="month" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Line key="revenue-line" type="monotone" dataKey="revenue" stroke="hsl(var(--chart-1))" strokeWidth={2} />
                  <Line key="profit-line" type="monotone" dataKey="profit" stroke="hsl(var(--chart-2))" strokeWidth={2} />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Đơn hàng theo tháng</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={salesData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="month" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Bar key="orders-bar" dataKey="orders" fill="hsl(var(--chart-3))" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
