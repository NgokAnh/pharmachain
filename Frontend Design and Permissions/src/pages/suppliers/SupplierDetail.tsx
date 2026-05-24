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
import { ArrowLeft, Edit, Phone, Mail, MapPin, CreditCard, Building, Package, DollarSign } from 'lucide-react';
import { toast } from 'sonner';

const mockPurchaseHistory = Array.from({ length: 15 }, (_, i) => ({
  id: `po-${i + 1}`,
  orderNumber: `PO${new Date().getFullYear()}${String(i + 1).padStart(5, '0')}`,
  orderDate: new Date(2024, i % 12, (i % 28) + 1).toISOString().split('T')[0],
  totalAmount: 50000 + i * 5000,
  itemCount: 5 + (i % 10),
  status: ['received', 'pending', 'cancelled'][i % 3] as 'received' | 'pending' | 'cancelled',
  receivedDate: i % 3 === 0 ? new Date(2024, i % 12, ((i % 28) + 3)).toISOString().split('T')[0] : undefined,
}));

export function SupplierDetail() {
  const navigate = useNavigate();
  const { id } = useParams();
  const [supplier, setSupplier] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [size, setSize] = useState(10);

  useEffect(() => {
    const loadSupplier = async () => {
      try {
        const token = localStorage.getItem('pharmacy_token');
        const response = await fetch(`http://localhost:3000/api/suppliers/${id}`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        if (!response.ok) throw new Error('Không thể tải chi tiết nhà cung cấp');
        const data = await response.json();
        setSupplier(data);
      } catch (err) {
        console.error(err);
        toast.error('Lỗi khi tải chi tiết nhà cung cấp.');
      } finally {
        setLoading(false);
      }
    };
    loadSupplier();
  }, [id]);

  if (loading) {
    return (
      <div>
        <Header title="Chi tiết nhà cung cấp" subtitle="Đang tải thông tin..." />
        <div className="p-6 flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
            <p className="text-muted-foreground">Đang tải dữ liệu...</p>
          </div>
        </div>
      </div>
    );
  }

  if (!supplier) {
    return (
      <div>
        <Header title="Nhà cung cấp" subtitle="Không tìm thấy nhà cung cấp" />
        <div className="p-6 text-center text-destructive">
          Không tìm thấy thông tin nhà cung cấp này trong hệ thống.
        </div>
      </div>
    );
  }

  const products = supplier.medicines || [];

  const totalItems = mockPurchaseHistory.length;
  const totalPages = Math.ceil(totalItems / size);
  const paginatedHistory = mockPurchaseHistory.slice((page - 1) * size, page * size);

  const stats = {
    totalOrders: mockPurchaseHistory.length,
    totalValue: mockPurchaseHistory.reduce((sum, po) => sum + po.totalAmount, 0),
    receivedOrders: mockPurchaseHistory.filter((po) => po.status === 'received').length,
    productCount: products.length,
  };

  const getStatusBadge = (status: string) => {
    const variants = {
      received: { variant: 'success' as const, label: 'Đã nhận hàng' },
      pending: { variant: 'warning' as const, label: 'Chờ nhận hàng' },
      cancelled: { variant: 'default' as const, label: 'Đã hủy' },
    };
    return variants[status as keyof typeof variants] || { variant: 'default' as const, label: status };
  };

  const getPaymentTermLabel = (days: string) => {
    if (days === '0') return 'Thanh toán ngay';
    return `Thanh toán sau ${days} ngày`;
  };

  return (
    <div>
      <Header
        title={supplier.name}
        subtitle={`Mã nhà cung cấp: ${supplier.code}`}
        actions={
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => navigate('/suppliers')}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              Quay lại
            </Button>
            <Button onClick={() => navigate(`/suppliers/${id}/edit`)}>
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
                <Package className="h-6 w-6 text-blue-600 dark:text-blue-400" />
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
                <p className="text-sm text-muted-foreground">Tổng giá trị</p>
                <h3 className="text-2xl font-semibold">${stats.totalValue.toLocaleString()}</h3>
              </div>
            </div>
          </Card>

          <Card className="p-4">
            <div className="flex items-center gap-3">
              <div className="h-12 w-12 rounded-full bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center">
                <Package className="h-6 w-6 text-purple-600 dark:text-purple-400" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Đơn đã nhận</p>
                <h3 className="text-2xl font-semibold">{stats.receivedOrders}</h3>
              </div>
            </div>
          </Card>

          <Card className="p-4">
            <div className="flex items-center gap-3">
              <div className="h-12 w-12 rounded-full bg-orange-100 dark:bg-orange-900/30 flex items-center justify-center">
                <Package className="h-6 w-6 text-orange-600 dark:text-orange-400" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Sản phẩm cung cấp</p>
                <h3 className="text-2xl font-semibold">{stats.productCount}</h3>
              </div>
            </div>
          </Card>
        </div>

        <Tabs defaultValue="info">
          <TabsList>
            <TabsTrigger value="info">Thông tin chi tiết</TabsTrigger>
            <TabsTrigger value="history">Lịch sử nhập hàng</TabsTrigger>
            <TabsTrigger value="products">Sản phẩm</TabsTrigger>
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
                      <p className="text-sm text-muted-foreground">Mã nhà cung cấp</p>
                      <p className="font-mono font-medium">{supplier.code}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Trạng thái</p>
                      <Badge variant={supplier.status === 'active' ? 'success' : 'default'}>
                        {supplier.status === 'active' ? 'Hoạt động' : 'Ngừng hợp tác'}
                      </Badge>
                    </div>
                  </div>

                  <div>
                    <p className="text-sm text-muted-foreground">Tên nhà cung cấp</p>
                    <p className="font-medium">{supplier.name}</p>
                  </div>

                  <div>
                    <p className="text-sm text-muted-foreground">Người liên hệ</p>
                    <p className="font-medium">{supplier.contactPerson}</p>
                  </div>

                  <div className="flex items-center gap-2">
                    <Phone className="h-4 w-4 text-muted-foreground" />
                    <div className="flex-1">
                      <p className="text-sm text-muted-foreground">Số điện thoại</p>
                      <p className="font-medium">{supplier.phone}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <Mail className="h-4 w-4 text-muted-foreground" />
                    <div className="flex-1">
                      <p className="text-sm text-muted-foreground">Email</p>
                      <p className="font-medium">{supplier.email || '-'}</p>
                    </div>
                  </div>

                  <div className="flex items-start gap-2">
                    <MapPin className="h-4 w-4 text-muted-foreground mt-1" />
                    <div className="flex-1">
                      <p className="text-sm text-muted-foreground">Địa chỉ</p>
                      <p className="font-medium">{supplier.address}</p>
                    </div>
                  </div>

                  <div>
                    <p className="text-sm text-muted-foreground">Ngày tạo</p>
                    <p className="font-medium">{new Date(supplier.createdAt).toLocaleDateString('vi-VN')}</p>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Thông tin thanh toán</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <p className="text-sm text-muted-foreground">Mã số thuế</p>
                    <p className="font-mono font-medium">{supplier.taxCode || '-'}</p>
                  </div>

                  <div className="flex items-center gap-2">
                    <CreditCard className="h-4 w-4 text-muted-foreground" />
                    <div className="flex-1">
                      <p className="text-sm text-muted-foreground">Số tài khoản</p>
                      <p className="font-mono font-medium">{supplier.bankAccount || '-'}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <Building className="h-4 w-4 text-muted-foreground" />
                    <div className="flex-1">
                      <p className="text-sm text-muted-foreground">Ngân hàng</p>
                      <p className="font-medium">{supplier.bankName || '-'}</p>
                    </div>
                  </div>

                  <div>
                    <p className="text-sm text-muted-foreground">Điều khoản thanh toán</p>
                    <p className="font-medium">{getPaymentTermLabel(supplier.paymentTerms || '30')}</p>
                  </div>

                  {supplier.notes && (
                    <div className="pt-4 border-t">
                      <p className="text-sm text-muted-foreground">Ghi chú</p>
                      <p className="font-medium">{supplier.notes}</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="history">
            <Card>
              <CardHeader>
                <CardTitle>Lịch sử nhập hàng</CardTitle>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Mã đơn hàng</TableHead>
                      <TableHead>Ngày đặt</TableHead>
                      <TableHead>Số sản phẩm</TableHead>
                      <TableHead>Tổng giá trị</TableHead>
                      <TableHead>Ngày nhận</TableHead>
                      <TableHead>Trạng thái</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {paginatedHistory.map((order) => {
                      const statusInfo = getStatusBadge(order.status);
                      return (
                        <TableRow key={order.id}>
                          <TableCell className="font-mono text-sm font-medium">
                            {order.orderNumber}
                          </TableCell>
                          <TableCell>{order.orderDate}</TableCell>
                          <TableCell>{order.itemCount} sản phẩm</TableCell>
                          <TableCell className="font-semibold">
                            ${order.totalAmount.toLocaleString()}
                          </TableCell>
                          <TableCell>{order.receivedDate || '-'}</TableCell>
                          <TableCell>
                            <Badge variant={statusInfo.variant}>{statusInfo.label}</Badge>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>

                <TablePagination
                  page={page}
                  size={size}
                  totalItems={totalItems}
                  totalPages={totalPages}
                  onPageChange={setPage}
                  onSizeChange={(s) => {
                    setSize(s);
                    setPage(1);
                  }}
                />
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="products">
            <Card>
              <CardHeader>
                <CardTitle>Sản phẩm đã cung cấp</CardTitle>
              </CardHeader>
              <CardContent>
                {products.length === 0 ? (
                  <div className="py-8 text-center text-muted-foreground">
                    Chưa liên kết mặt hàng thuốc nào với nhà cung cấp này.
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Mã SKU</TableHead>
                        <TableHead>Tên thuốc</TableHead>
                        <TableHead>Hoạt chất</TableHead>
                        <TableHead>Đơn vị</TableHead>
                        <TableHead>Giá bán</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {products.map((product: any) => (
                        <TableRow key={product.id}>
                          <TableCell className="font-mono text-sm">{product.code}</TableCell>
                          <TableCell className="font-medium">{product.name}</TableCell>
                          <TableCell>{product.activeIngredient} {product.strength}</TableCell>
                          <TableCell>{product.unit}</TableCell>
                          <TableCell className="font-semibold">
                            {new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(product.sellPrice)}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
