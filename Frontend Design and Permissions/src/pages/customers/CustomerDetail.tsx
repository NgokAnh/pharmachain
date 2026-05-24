import { useState } from 'react';
import { useNavigate, useParams } from 'react-router';
import { Header } from '../../components/layout/Header';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/Card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TablePagination,
  TableRow,
} from '../../components/ui/Table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../components/ui/Tabs';
import { ArrowLeft, Edit, Phone, Mail, MapPin, Calendar, Award, ShoppingBag, DollarSign, TrendingUp } from 'lucide-react';

// Mock data
const mockCustomer = {
  id: 'cust-1',
  code: 'CUS0001',
  name: 'Nguyễn Văn A',
  phone: '+1-555-1001',
  email: 'customer1@email.com',
  dateOfBirth: '1985-05-15',
  address: 'Số 123 Đường ABC, Quận 1, TP.HCM',
  membershipTier: 'gold' as const,
  points: 850,
  joinDate: '2024-01-15',
  status: 'active',
};

const mockPurchaseHistory = Array.from({ length: 30 }, (_, i) => ({
  id: `sale-${i + 1}`,
  invoiceNumber: `INV${new Date().getFullYear()}${String(i + 1).padStart(5, '0')}`,
  saleDate: new Date(2024, (11 - i) % 12, (i % 28) + 1).toISOString().split('T')[0],
  itemCount: 2 + (i % 5),
  total: 50 + i * 15,
  paymentMethod: ['cash', 'card', 'transfer'][i % 3] as 'cash' | 'card' | 'transfer',
  pointsEarned: Math.floor((50 + i * 15) / 10),
}));

const mockPointsHistory = Array.from({ length: 15 }, (_, i) => ({
  id: `point-${i + 1}`,
  date: new Date(2024, (11 - i) % 12, (i % 28) + 1).toISOString().split('T')[0],
  type: i % 3 === 0 ? 'redeem' : 'earn',
  points: i % 3 === 0 ? -(50 + i * 5) : 50 + i * 10,
  description: i % 3 === 0 ? 'Đổi điểm lấy voucher' : `Mua hàng - ${`INV${new Date().getFullYear()}${String(i + 1).padStart(5, '0')}`}`,
  balance: 850 + (15 - i) * 20,
}));

export function CustomerDetail() {
  const navigate = useNavigate();
  const { id } = useParams();
  const [purchasePage, setPurchasePage] = useState(1);
  const [purchaseSize, setPurchaseSize] = useState(10);
  const [pointsPage, setPointsPage] = useState(1);
  const [pointsSize, setPointsSize] = useState(10);

  const purchaseTotalItems = mockPurchaseHistory.length;
  const purchaseTotalPages = Math.ceil(purchaseTotalItems / purchaseSize);
  const paginatedPurchases = mockPurchaseHistory.slice(
    (purchasePage - 1) * purchaseSize,
    purchasePage * purchaseSize
  );

  const pointsTotalItems = mockPointsHistory.length;
  const pointsTotalPages = Math.ceil(pointsTotalItems / pointsSize);
  const paginatedPoints = mockPointsHistory.slice(
    (pointsPage - 1) * pointsSize,
    pointsPage * pointsSize
  );

  const stats = {
    totalOrders: mockPurchaseHistory.length,
    totalSpent: mockPurchaseHistory.reduce((sum, order) => sum + order.total, 0),
    totalPoints: mockCustomer.points,
    avgOrderValue: Math.round(
      mockPurchaseHistory.reduce((sum, order) => sum + order.total, 0) / mockPurchaseHistory.length
    ),
  };

  const getTierColor = (tier: string) => {
    const colors = {
      bronze: 'default',
      silver: 'info',
      gold: 'warning',
      platinum: 'success',
    };
    return colors[tier as keyof typeof colors] || 'default';
  };

  const getTierLabel = (tier: string) => {
    const labels = {
      bronze: 'Đồng',
      silver: 'Bạc',
      gold: 'Vàng',
      platinum: 'Bạch kim',
    };
    return labels[tier as keyof typeof labels] || tier;
  };

  const getPaymentMethodLabel = (method: string) => {
    const labels = {
      cash: 'Tiền mặt',
      card: 'Thẻ',
      transfer: 'Chuyển khoản',
    };
    return labels[method as keyof typeof labels] || method;
  };

  return (
    <div>
      <Header
        title={mockCustomer.name}
        subtitle={`Mã khách hàng: ${mockCustomer.code}`}
        actions={
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => navigate('/customers')}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              Quay lại
            </Button>
            <Button onClick={() => navigate(`/customers/${id}/edit`)}>
              <Edit className="h-4 w-4 mr-2" />
              Chỉnh sửa
            </Button>
          </div>
        }
      />

      <div className="p-6 space-y-6">
        {/* Statistics */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card className="p-4">
            <div className="flex items-center gap-3">
              <div className="h-12 w-12 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
                <ShoppingBag className="h-6 w-6 text-blue-600 dark:text-blue-400" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Tổng đơn hàng</p>
                <h3 className="text-2xl font-semibold">{stats.totalOrders}</h3>
              </div>
            </div>
          </Card>

          <Card className="p-4">
            <div className="flex items-center gap-3">
              <div className="h-12 w-12 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
                <DollarSign className="h-6 w-6 text-green-600 dark:text-green-400" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Tổng chi tiêu</p>
                <h3 className="text-2xl font-semibold">${stats.totalSpent}</h3>
              </div>
            </div>
          </Card>

          <Card className="p-4">
            <div className="flex items-center gap-3">
              <div className="h-12 w-12 rounded-full bg-yellow-100 dark:bg-yellow-900/30 flex items-center justify-center">
                <Award className="h-6 w-6 text-yellow-600 dark:text-yellow-400" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Điểm tích lũy</p>
                <h3 className="text-2xl font-semibold">{stats.totalPoints}</h3>
              </div>
            </div>
          </Card>

          <Card className="p-4">
            <div className="flex items-center gap-3">
              <div className="h-12 w-12 rounded-full bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center">
                <TrendingUp className="h-6 w-6 text-purple-600 dark:text-purple-400" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Giá trị TB/đơn</p>
                <h3 className="text-2xl font-semibold">${stats.avgOrderValue}</h3>
              </div>
            </div>
          </Card>
        </div>

        <Tabs defaultValue="info">
          <TabsList>
            <TabsTrigger value="info">Thông tin chi tiết</TabsTrigger>
            <TabsTrigger value="purchases">Lịch sử mua hàng</TabsTrigger>
            <TabsTrigger value="points">Lịch sử điểm</TabsTrigger>
          </TabsList>

          <TabsContent value="info" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle>Thông tin cơ bản</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm text-muted-foreground">Mã khách hàng</p>
                      <p className="font-mono font-medium">{mockCustomer.code}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Trạng thái</p>
                      <Badge variant="success">Hoạt động</Badge>
                    </div>
                  </div>

                  <div>
                    <p className="text-sm text-muted-foreground">Họ và tên</p>
                    <p className="font-medium text-lg">{mockCustomer.name}</p>
                  </div>

                  <div className="flex items-center gap-2">
                    <Phone className="h-4 w-4 text-muted-foreground" />
                    <div className="flex-1">
                      <p className="text-sm text-muted-foreground">Số điện thoại</p>
                      <p className="font-medium">{mockCustomer.phone}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <Mail className="h-4 w-4 text-muted-foreground" />
                    <div className="flex-1">
                      <p className="text-sm text-muted-foreground">Email</p>
                      <p className="font-medium">{mockCustomer.email}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <Calendar className="h-4 w-4 text-muted-foreground" />
                    <div className="flex-1">
                      <p className="text-sm text-muted-foreground">Ngày sinh</p>
                      <p className="font-medium">{mockCustomer.dateOfBirth}</p>
                    </div>
                  </div>

                  <div className="flex items-start gap-2">
                    <MapPin className="h-4 w-4 text-muted-foreground mt-1" />
                    <div className="flex-1">
                      <p className="text-sm text-muted-foreground">Địa chỉ</p>
                      <p className="font-medium">{mockCustomer.address}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <Calendar className="h-4 w-4 text-muted-foreground" />
                    <div className="flex-1">
                      <p className="text-sm text-muted-foreground">Ngày tham gia</p>
                      <p className="font-medium">{mockCustomer.joinDate}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Thông tin thành viên</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <p className="text-sm text-muted-foreground mb-2">Hạng thành viên</p>
                    <Badge variant={getTierColor(mockCustomer.membershipTier) as any} className="text-lg px-4 py-2">
                      <Award className="h-5 w-5 mr-2" />
                      {getTierLabel(mockCustomer.membershipTier).toUpperCase()}
                    </Badge>
                  </div>

                  <div className="p-4 bg-gradient-to-r from-yellow-50 to-orange-50 dark:from-yellow-900/20 dark:to-orange-900/20 rounded-lg border border-yellow-200 dark:border-yellow-800">
                    <div className="flex items-center justify-between mb-2">
                      <p className="text-sm font-medium">Điểm tích lũy hiện tại</p>
                      <p className="text-3xl font-bold text-yellow-600 dark:text-yellow-400">
                        {mockCustomer.points}
                      </p>
                    </div>
                    <div className="h-2 bg-yellow-200 dark:bg-yellow-800 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-yellow-500 dark:bg-yellow-400"
                        style={{ width: `${(mockCustomer.points % 1000) / 10}%` }}
                      />
                    </div>
                    <p className="text-xs text-muted-foreground mt-2">
                      Còn {1000 - (mockCustomer.points % 1000)} điểm để lên hạng tiếp theo
                    </p>
                  </div>

                  <div className="space-y-3 pt-4 border-t">
                    <h4 className="font-semibold">Ưu đãi của hạng {getTierLabel(mockCustomer.membershipTier)}</h4>
                    <ul className="space-y-2">
                      <li className="flex items-start gap-2 text-sm">
                        <span className="text-green-600 dark:text-green-400 mt-0.5">✓</span>
                        <span>Giảm giá {mockCustomer.membershipTier === 'platinum' ? '15%' : mockCustomer.membershipTier === 'gold' ? '10%' : mockCustomer.membershipTier === 'silver' ? '5%' : '2%'} cho mọi đơn hàng</span>
                      </li>
                      <li className="flex items-start gap-2 text-sm">
                        <span className="text-green-600 dark:text-green-400 mt-0.5">✓</span>
                        <span>Tích điểm gấp {mockCustomer.membershipTier === 'platinum' ? '3' : mockCustomer.membershipTier === 'gold' ? '2' : '1'} lần</span>
                      </li>
                      {(mockCustomer.membershipTier === 'gold' || mockCustomer.membershipTier === 'platinum') && (
                        <li className="flex items-start gap-2 text-sm">
                          <span className="text-green-600 dark:text-green-400 mt-0.5">✓</span>
                          <span>Miễn phí giao hàng</span>
                        </li>
                      )}
                      {mockCustomer.membershipTier === 'platinum' && (
                        <li className="flex items-start gap-2 text-sm">
                          <span className="text-green-600 dark:text-green-400 mt-0.5">✓</span>
                          <span>Tư vấn dược sĩ miễn phí 24/7</span>
                        </li>
                      )}
                    </ul>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="purchases">
            <Card>
              <CardHeader>
                <CardTitle>Lịch sử mua hàng</CardTitle>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Mã hóa đơn</TableHead>
                      <TableHead>Ngày mua</TableHead>
                      <TableHead>Số sản phẩm</TableHead>
                      <TableHead>Tổng tiền</TableHead>
                      <TableHead>Thanh toán</TableHead>
                      <TableHead>Điểm nhận</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {paginatedPurchases.map((order) => (
                      <TableRow key={order.id}>
                        <TableCell className="font-mono text-sm font-medium">
                          {order.invoiceNumber}
                        </TableCell>
                        <TableCell>{order.saleDate}</TableCell>
                        <TableCell>{order.itemCount} sản phẩm</TableCell>
                        <TableCell className="font-semibold">${order.total}</TableCell>
                        <TableCell>
                          <Badge variant="info">{getPaymentMethodLabel(order.paymentMethod)}</Badge>
                        </TableCell>
                        <TableCell>
                          <span className="text-yellow-600 dark:text-yellow-400 font-medium">
                            +{order.pointsEarned} điểm
                          </span>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>

                <TablePagination
                  page={purchasePage}
                  size={purchaseSize}
                  totalItems={purchaseTotalItems}
                  totalPages={purchaseTotalPages}
                  onPageChange={setPurchasePage}
                  onSizeChange={(s) => {
                    setPurchaseSize(s);
                    setPurchasePage(1);
                  }}
                />
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="points">
            <Card>
              <CardHeader>
                <CardTitle>Lịch sử điểm tích lũy</CardTitle>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Ngày</TableHead>
                      <TableHead>Loại giao dịch</TableHead>
                      <TableHead>Mô tả</TableHead>
                      <TableHead>Điểm thay đổi</TableHead>
                      <TableHead>Số dư</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {paginatedPoints.map((point) => (
                      <TableRow key={point.id}>
                        <TableCell>{point.date}</TableCell>
                        <TableCell>
                          <Badge variant={point.type === 'earn' ? 'success' : 'warning'}>
                            {point.type === 'earn' ? 'Tích điểm' : 'Đổi điểm'}
                          </Badge>
                        </TableCell>
                        <TableCell>{point.description}</TableCell>
                        <TableCell>
                          <span className={point.points > 0 ? 'text-green-600 dark:text-green-400 font-semibold' : 'text-red-600 dark:text-red-400 font-semibold'}>
                            {point.points > 0 ? '+' : ''}{point.points}
                          </span>
                        </TableCell>
                        <TableCell className="font-medium">{point.balance}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>

                <TablePagination
                  page={pointsPage}
                  size={pointsSize}
                  totalItems={pointsTotalItems}
                  totalPages={pointsTotalPages}
                  onPageChange={setPointsPage}
                  onSizeChange={(s) => {
                    setPointsSize(s);
                    setPointsPage(1);
                  }}
                />
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
