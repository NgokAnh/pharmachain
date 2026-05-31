import { useState, useEffect } from 'react';
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
import { ArrowLeft, Edit, Phone, Mail, MapPin, Calendar, Award, ShoppingBag, DollarSign, TrendingUp, RefreshCw } from 'lucide-react';

interface SalesOrder {
  id: string;
  invoiceNumber: string;
  saleDate: string;
  totalAmount: number;
  paymentMethod: string;
  pointsEarned: number;
  items?: any[];
}

interface PointsHistoryEntry {
  id: string;
  date: string;
  type: 'earn' | 'redeem';
  points: number;
  description: string;
  balance: number;
}

interface CustomerDetail {
  id: string;
  code: string;
  name: string;
  phone: string;
  email?: string;
  dateOfBirth?: string;
  address?: string;
  membershipTier: 'bronze' | 'silver' | 'gold' | 'platinum';
  points: number;
  joinDate: string;
  status: string;
  salesOrders: SalesOrder[];
  pointsHistory: PointsHistoryEntry[];
}

export function CustomerDetail() {
  const navigate = useNavigate();
  const { id } = useParams();
  const [customer, setCustomer] = useState<CustomerDetail | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [purchasePage, setPurchasePage] = useState(1);
  const [purchaseSize, setPurchaseSize] = useState(10);
  const [pointsPage, setPointsPage] = useState(1);
  const [pointsSize, setPointsSize] = useState(10);

  const fetchCustomer = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const token = localStorage.getItem('pharmacy_token');
      if (!token) throw new Error('Phiên đăng nhập đã hết.');

      const response = await fetch(`http://localhost:3000/api/customers/${id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        throw new Error(errData.error || `Lỗi ${response.status}`);
      }

      const data = await response.json();
      setCustomer(data);
    } catch (err: any) {
      const msg =
        err instanceof TypeError
          ? 'Không thể kết nối máy chủ.'
          : err.message || 'Không thể tải thông tin khách hàng.';
      setError(msg);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (id) fetchCustomer();
  }, [id]);

  if (isLoading) {
    return (
      <div>
        <Header title="Đang tải..." subtitle="Vui lòng chờ" />
        <div className="flex items-center justify-center py-20">
          <RefreshCw className="h-6 w-6 animate-spin text-primary mr-3" />
          <span className="text-muted-foreground">Đang tải thông tin khách hàng...</span>
        </div>
      </div>
    );
  }

  if (error || !customer) {
    return (
      <div>
        <Header title="Lỗi" subtitle="Không thể tải dữ liệu" />
        <div className="p-6 text-center">
          <p className="text-destructive font-medium mb-4">{error || 'Không tìm thấy khách hàng.'}</p>
          <div className="flex items-center justify-center gap-3">
            <Button variant="outline" onClick={() => navigate('/customers')}>
              <ArrowLeft className="h-4 w-4 mr-2" /> Quay lại
            </Button>
            <Button onClick={() => fetchCustomer()}>
              <RefreshCw className="h-4 w-4 mr-2" /> Thử lại
            </Button>
          </div>
        </div>
      </div>
    );
  }

  const purchaseHistory = customer.salesOrders || [];
  const pointsHistory = customer.pointsHistory || [];

  const purchaseTotalItems = purchaseHistory.length;
  const purchaseTotalPages = Math.ceil(purchaseTotalItems / purchaseSize);
  const paginatedPurchases = purchaseHistory.slice(
    (purchasePage - 1) * purchaseSize,
    purchasePage * purchaseSize
  );

  const pointsTotalItems = pointsHistory.length;
  const pointsTotalPages = Math.ceil(pointsTotalItems / pointsSize);
  const paginatedPoints = pointsHistory.slice(
    (pointsPage - 1) * pointsSize,
    pointsPage * pointsSize
  );

  const stats = {
    totalOrders: purchaseHistory.length,
    totalSpent: purchaseHistory.reduce((sum, order) => sum + Number(order.totalAmount || 0), 0),
    totalPoints: customer.points,
    avgOrderValue: purchaseHistory.length > 0
      ? Math.round(purchaseHistory.reduce((sum, order) => sum + Number(order.totalAmount || 0), 0) / purchaseHistory.length)
      : 0,
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

  const formatCurrency = (amount: number) => {
    return amount.toLocaleString('vi-VN') + 'đ';
  };

  // Calculate next tier threshold
  const tierThresholds = { bronze: 500, silver: 1000, gold: 2000, platinum: Infinity };
  const nextTierThreshold = tierThresholds[customer.membershipTier as keyof typeof tierThresholds] || 1000;
  const pointsToNextTier = Math.max(0, nextTierThreshold - customer.points);
  const progressPercent = customer.membershipTier === 'platinum'
    ? 100
    : Math.min(100, (customer.points / nextTierThreshold) * 100);

  return (
    <div>
      <Header
        title={customer.name}
        subtitle={`Mã khách hàng: ${customer.code}`}
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
                <h3 className="text-2xl font-semibold">{formatCurrency(stats.totalSpent)}</h3>
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
                <h3 className="text-2xl font-semibold">{stats.totalPoints.toLocaleString()}</h3>
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
                <h3 className="text-2xl font-semibold">{formatCurrency(stats.avgOrderValue)}</h3>
              </div>
            </div>
          </Card>
        </div>

        <Tabs defaultValue="info">
          <TabsList>
            <TabsTrigger value="info">Thông tin chi tiết</TabsTrigger>
            <TabsTrigger value="purchases">Lịch sử mua hàng ({purchaseHistory.length})</TabsTrigger>
            <TabsTrigger value="points">Lịch sử điểm ({pointsHistory.length})</TabsTrigger>
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
                      <p className="font-mono font-medium">{customer.code}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Trạng thái</p>
                      <Badge variant={customer.status === 'active' ? 'success' : 'default'}>
                        {customer.status === 'active' ? 'Hoạt động' : 'Ngưng hoạt động'}
                      </Badge>
                    </div>
                  </div>

                  <div>
                    <p className="text-sm text-muted-foreground">Họ và tên</p>
                    <p className="font-medium text-lg">{customer.name}</p>
                  </div>

                  <div className="flex items-center gap-2">
                    <Phone className="h-4 w-4 text-muted-foreground" />
                    <div className="flex-1">
                      <p className="text-sm text-muted-foreground">Số điện thoại</p>
                      <p className="font-medium">{customer.phone}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <Mail className="h-4 w-4 text-muted-foreground" />
                    <div className="flex-1">
                      <p className="text-sm text-muted-foreground">Email</p>
                      <p className="font-medium">{customer.email || '—'}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <Calendar className="h-4 w-4 text-muted-foreground" />
                    <div className="flex-1">
                      <p className="text-sm text-muted-foreground">Ngày sinh</p>
                      <p className="font-medium">{customer.dateOfBirth || '—'}</p>
                    </div>
                  </div>

                  <div className="flex items-start gap-2">
                    <MapPin className="h-4 w-4 text-muted-foreground mt-1" />
                    <div className="flex-1">
                      <p className="text-sm text-muted-foreground">Địa chỉ</p>
                      <p className="font-medium">{customer.address || '—'}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <Calendar className="h-4 w-4 text-muted-foreground" />
                    <div className="flex-1">
                      <p className="text-sm text-muted-foreground">Ngày tham gia</p>
                      <p className="font-medium">{customer.joinDate}</p>
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
                    <Badge variant={getTierColor(customer.membershipTier) as any} className="text-lg px-4 py-2">
                      <Award className="h-5 w-5 mr-2" />
                      {getTierLabel(customer.membershipTier).toUpperCase()}
                    </Badge>
                  </div>

                  <div className="p-4 bg-gradient-to-r from-yellow-50 to-orange-50 dark:from-yellow-900/20 dark:to-orange-900/20 rounded-lg border border-yellow-200 dark:border-yellow-800">
                    <div className="flex items-center justify-between mb-2">
                      <p className="text-sm font-medium">Điểm tích lũy hiện tại</p>
                      <p className="text-3xl font-bold text-yellow-600 dark:text-yellow-400">
                        {customer.points.toLocaleString()}
                      </p>
                    </div>
                    <div className="h-2 bg-yellow-200 dark:bg-yellow-800 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-yellow-500 dark:bg-yellow-400 transition-all duration-500"
                        style={{ width: `${progressPercent}%` }}
                      />
                    </div>
                    <p className="text-xs text-muted-foreground mt-2">
                      {customer.membershipTier === 'platinum'
                        ? 'Bạn đang ở hạng cao nhất! 🎉'
                        : `Còn ${pointsToNextTier.toLocaleString()} điểm để lên hạng tiếp theo`}
                    </p>
                  </div>

                  <div className="space-y-3 pt-4 border-t">
                    <h4 className="font-semibold">Ưu đãi của hạng {getTierLabel(customer.membershipTier)}</h4>
                    <ul className="space-y-2">
                      <li className="flex items-start gap-2 text-sm">
                        <span className="text-green-600 dark:text-green-400 mt-0.5">✓</span>
                        <span>Giảm giá {customer.membershipTier === 'platinum' ? '15%' : customer.membershipTier === 'gold' ? '10%' : customer.membershipTier === 'silver' ? '5%' : '2%'} cho mọi đơn hàng</span>
                      </li>
                      <li className="flex items-start gap-2 text-sm">
                        <span className="text-green-600 dark:text-green-400 mt-0.5">✓</span>
                        <span>Tích điểm gấp {customer.membershipTier === 'platinum' ? '3' : customer.membershipTier === 'gold' ? '2' : '1'} lần</span>
                      </li>
                      {(customer.membershipTier === 'gold' || customer.membershipTier === 'platinum') && (
                        <li className="flex items-start gap-2 text-sm">
                          <span className="text-green-600 dark:text-green-400 mt-0.5">✓</span>
                          <span>Miễn phí giao hàng</span>
                        </li>
                      )}
                      {customer.membershipTier === 'platinum' && (
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
                {purchaseHistory.length === 0 ? (
                  <div className="text-center text-muted-foreground py-8">
                    Khách hàng chưa có lịch sử mua hàng.
                  </div>
                ) : (
                  <>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Mã hóa đơn</TableHead>
                          <TableHead>Ngày mua</TableHead>
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
                            <TableCell>
                              {new Date(order.saleDate).toLocaleDateString('vi-VN')}
                            </TableCell>
                            <TableCell className="font-semibold">
                              {formatCurrency(Number(order.totalAmount || 0))}
                            </TableCell>
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
                  </>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="points">
            <Card>
              <CardHeader>
                <CardTitle>Lịch sử điểm tích lũy</CardTitle>
              </CardHeader>
              <CardContent>
                {pointsHistory.length === 0 ? (
                  <div className="text-center text-muted-foreground py-8">
                    Chưa có lịch sử tích điểm.
                  </div>
                ) : (
                  <>
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
                  </>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
